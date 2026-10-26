import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  BrowserAuditResultSchema,
  browserResultsPath,
} from '@audigy/browser-runner/schema';
import {
  claimNextAudit,
  createServiceClient,
  createUserClient,
  type Database,
  dbEnvFrom,
  failStaleAudits,
  requestAudit,
  writeAuditResults,
} from '@audigy/db';
import { type FixSheet, loadFixes, placesApiKey } from '@audigy/engine';
import { fileFixStore } from '@audigy/engine/fixes-fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuditContext, defaultChecks } from './context.js';
import type { CreateDeps } from './create.js';
import {
  createGithubDispatcher,
  createLocalDispatcher,
  type Dispatcher,
  LOCAL_RUNNER_ENV_NAME,
} from './dispatch.js';
import { gscForAudit } from './gsc-port.js';
import type { ApiDeps, AuditView, FindingView, RunDeps } from './http.js';
import { labFromEnv } from './lab.js';
import { errorCode, type Logger } from './log.js';
import { readConfirmedPlaceId, supabasePlacesCache } from './places.js';
import {
  type AuditStore,
  type ProcessDeps,
  processNextAudit,
} from './process.js';
import { type SiteInput, targetOf } from './target.js';
import { createTrigger } from './trigger.js';
import { appendAuditLog, confirmClaimedAudit } from './verify-db.js';

type Client = SupabaseClient<Database>;

const ARTIFACTS_BUCKET = 'artifacts';

/** Rapport du runner (`results.json`), largement sous cette taille. */
export const MAX_RUNNER_OUTPUT_BYTES = 5 * 1024 * 1024;

export function supabaseAuditStore(
  service: Client,
  logger: Logger,
  now: () => number = Date.now,
): AuditStore {
  return {
    failStale: (minutes) => failStaleAudits(service, minutes),

    async claimNext() {
      const row = await claimNextAudit(service);
      if (!row) return null;
      const { data: site, error } = await service
        .from('sites')
        .select('url, scope, hosting')
        .eq('id', row.site_id)
        .single();
      if (error || !site) throw new Error('site_lookup_failed');
      return {
        id: row.id,
        siteId: row.site_id,
        mode: row.mode === 'active' ? 'active' : 'passive',
        site,
      };
    },

    async isVerifiedFresh(siteId) {
      const since = new Date(now() - 10 * 60_000).toISOString();
      const { data, error } = await service
        .from('site_verifications')
        .select('id')
        .eq('site_id', siteId)
        .eq('status', 'verified')
        .gt('last_checked_at', since)
        .limit(1);
      if (error) throw new Error('verification_lookup_failed');
      return (data ?? []).length > 0;
    },

    appendAudit: (entry) => appendAuditLog(service, entry),

    writeResults: (input) => writeAuditResults(service, input),

    async readUptime(siteId) {
      const { data, error } = await service
        .from('uptime_daily')
        .select('checks, failures')
        .eq('site_id', siteId);
      if (error) throw new Error('uptime_read_failed');
      let checks = 0;
      let failures = 0;
      for (const row of data ?? []) {
        checks += row.checks;
        failures += row.failures;
      }
      if (checks <= 0) return null;
      return { checks, failures };
    },

    async readRunnerOutput(auditId) {
      const storagePath = browserResultsPath(auditId);
      const { data: rows, error } = await service
        .from('artifacts')
        .select('sha256, bytes')
        .eq('audit_id', auditId)
        .eq('kind', 'json')
        .eq('storage_path', storagePath)
        .limit(1);
      if (error) throw new Error('artifact_lookup_failed');
      const row = rows?.[0];
      if (!row) return null;
      try {
        if (row.bytes > MAX_RUNNER_OUTPUT_BYTES)
          throw new Error('runner_output_too_large');
        const { data: blob, error: dlError } = await service.storage
          .from(ARTIFACTS_BUCKET)
          .download(storagePath);
        if (dlError || !blob) throw new Error('runner_output_download');
        const bytes = Buffer.from(await blob.arrayBuffer());
        if (bytes.length > MAX_RUNNER_OUTPUT_BYTES)
          throw new Error('runner_output_too_large');
        const sha = createHash('sha256').update(bytes).digest('hex');
        if (sha !== row.sha256) throw new Error('runner_output_hash');
        const parsed = BrowserAuditResultSchema.safeParse(
          JSON.parse(bytes.toString('utf8')),
        );
        if (!parsed.success) throw new Error('runner_output_schema');
        return parsed.data;
      } catch (err) {
        logger.warn('runner_output_invalid', { auditId, code: errorCode(err) });
        return null;
      }
    },
  };
}

async function ensureSite(
  user: Client,
  userId: string,
  site: SiteInput,
): Promise<string> {
  const find = async () => {
    const { data, error } = await user
      .from('sites')
      .select('id')
      .eq('owner_id', userId)
      .eq('url', site.url)
      .is('deleted_at', null)
      .limit(1);
    if (error) throw new Error('site_lookup_failed');
    return data?.[0]?.id ?? null;
  };
  const existing = await find();
  if (existing) return existing;
  const { data, error } = await user
    .from('sites')
    .insert({
      owner_id: userId,
      url: site.url,
      scope: site.scope,
      host: site.host,
      path_prefix: site.pathPrefix,
      label: site.label,
      hosting: site.hosting,
    })
    .select('id')
    .single();
  if (data) return data.id;
  // Double clic : l'autre requête vient de créer le site.
  if (error?.code === '23505') {
    const again = await find();
    if (again) return again;
  }
  throw new Error('site_insert_failed');
}

const ACTIONABLE: Record<string, number> = { fail: 0, warn: 0 };

function byPriority(a: FindingView, b: FindingView): number {
  const ra = ACTIONABLE[a.status] ?? 1;
  const rb = ACTIONABLE[b.status] ?? 1;
  if (ra !== rb) return ra - rb;
  if (ra === 0) {
    const effort = (f: FindingView) =>
      f.effortMinutes ?? Number.POSITIVE_INFINITY;
    const diff =
      b.severity - a.severity || b.impact - a.impact || effort(a) - effort(b);
    if (diff !== 0) return diff;
  }
  return a.checkId < b.checkId ? -1 : a.checkId > b.checkId ? 1 : 0;
}

export async function readAuditView(
  user: Client,
  auditId: string,
): Promise<AuditView | null> {
  const { data: audit, error } = await user
    .from('audits')
    .select(
      'id, status, mode, trigger, method_version, engine_version, global_score, coverage, created_at, started_at, finished_at, error, site:sites(id, url, label, scope, hosting)',
    )
    .eq('id', auditId)
    .maybeSingle();
  if (error) throw new Error('audit_lookup_failed');
  if (!audit?.site) return null;
  const [domains, findings] = await Promise.all([
    user
      .from('domain_scores')
      .select('domain, score, coverage, level')
      .eq('audit_id', auditId)
      .order('domain'),
    user
      .from('findings')
      .select(
        'domain, check_id, status, severity, impact, score, measured, message_key, params, fix_key, effort_minutes, reason',
      )
      .eq('audit_id', auditId),
  ]);
  if (domains.error || findings.error) throw new Error('audit_lookup_failed');
  return {
    audit: {
      id: audit.id,
      status: audit.status,
      mode: audit.mode,
      trigger: audit.trigger,
      methodVersion: audit.method_version,
      engineVersion: audit.engine_version,
      globalScore: audit.global_score,
      coverage: audit.coverage,
      createdAt: audit.created_at,
      startedAt: audit.started_at,
      finishedAt: audit.finished_at,
      error: audit.error,
      site: audit.site,
    },
    domains: domains.data ?? [],
    findings: (findings.data ?? [])
      .map((f) => ({
        domain: f.domain,
        checkId: f.check_id,
        status: f.status,
        severity: f.severity,
        impact: f.impact,
        score: f.score,
        measured: f.measured,
        messageKey: f.message_key,
        params: f.params,
        fixKey: f.fix_key,
        effortMinutes: f.effort_minutes,
        reason: f.reason,
      }))
      .sort(byPriority),
  };
}

/**
 * Origine pour réveiller le background. Sous `netlify dev` : celle de la requête.
 * Sinon `URL` (fournie par Netlify) puis `APP_BASE_URL`, jamais l'en-tête Host.
 */
export function selfOrigin(
  env: NodeJS.ProcessEnv,
  requestUrl: string,
): string | null {
  if (env.NETLIFY_DEV === 'true') return new URL(requestUrl).origin;
  const base = env.URL?.trim() || env.APP_BASE_URL?.trim();
  return base ? new URL(base).origin : null;
}

let fixesCache: Promise<ReadonlyMap<string, FixSheet>> | null = null;

/** Fiches lues depuis `packages/engine/fixes/fr` (fichiers inclus dans la fonction). */
export function fixesFromDisk(
  logger: Logger,
  dir: string = path.resolve(process.cwd(), 'packages/engine/fixes/fr'),
): Promise<ReadonlyMap<string, FixSheet>> {
  fixesCache ??= loadFixes(fileFixStore(dir)).catch((error: unknown) => {
    logger.warn('fixes_unavailable', { code: errorCode(error) });
    fixesCache = null;
    return new Map<string, FixSheet>();
  });
  return fixesCache;
}

export interface FromEnvOptions {
  env: NodeJS.ProcessEnv;
  requestUrl: string;
  logger: Logger;
  fetch?: typeof globalThis.fetch;
}

export function apiDepsFromEnv(options: FromEnvOptions): ApiDeps {
  const { env, logger } = options;
  const db = dbEnvFrom(env);
  const service = createServiceClient(db);
  const anon = createUserClient(db);
  const lab = labFromEnv(env, { requireNetlifyDev: true });
  const origin = selfOrigin(env, options.requestUrl);
  const trigger = origin
    ? createTrigger({
        origin,
        key: db.serviceRoleKey,
        ...(options.fetch ? { fetch: options.fetch } : {}),
      })
    : async () => {
        throw new Error('trigger_unconfigured');
      };
  const userClient = (token: string) =>
    createUserClient({ ...db, accessToken: token });
  return {
    logger,
    async userFromToken(token) {
      const { data, error } = await anon.auth.getUser(token);
      if (error || !data.user) return null;
      return data.user.id;
    },
    createDeps(token, userId): CreateDeps {
      const user = userClient(token);
      return {
        ensureSite: (site) => ensureSite(user, userId, site),
        requestAudit: (input) => requestAudit(service, input),
        trigger,
        allowLab: lab !== null,
        logger,
      };
    },
    readAudit: (token, auditId) => readAuditView(userClient(token), auditId),
  };
}

export interface RunFromEnvOptions extends FromEnvOptions {
  dispatcher?: Dispatcher;
  /** Tests : checks et attente du runner remplacés. */
  overrides?: Partial<
    Pick<ProcessDeps, 'checks' | 'runnerWaitMs' | 'pollMs' | 'sleep'>
  >;
}

export function runDepsFromEnv(options: RunFromEnvOptions): RunDeps {
  const { env, logger } = options;
  const db = dbEnvFrom(env);
  const service = createServiceClient(db);
  const lab = labFromEnv(env, { requireNetlifyDev: true });
  const origin = selfOrigin(env, options.requestUrl);
  const dispatcher =
    options.dispatcher ??
    (lab && env[LOCAL_RUNNER_ENV_NAME] === 'true'
      ? createLocalDispatcher(logger)
      : createGithubDispatcher({
          token: env.GH_DISPATCH_TOKEN,
          logger,
          ...(options.fetch ? { fetch: options.fetch } : {}),
        }));
  return {
    key: db.serviceRoleKey,
    logger,
    async process() {
      return processNextAudit({
        store: supabaseAuditStore(service, logger),
        dispatcher,
        checks: defaultChecks(env, supabasePlacesCache(service)),
        fixes: await fixesFromDisk(logger),
        context: async (target, verified, audit) => {
          const base = createAuditContext({ target, verified, env, lab });
          if (!audit) return base;
          let ctx = base.ctx;
          if (placesApiKey(env)) {
            try {
              ctx = {
                ...ctx,
                confirmedPlaceId: await readConfirmedPlaceId(
                  service,
                  audit.siteId,
                ),
              };
            } catch (error) {
              logger.warn('places_unavailable', { code: errorCode(error) });
              ctx = { ...ctx, confirmedPlaceId: null };
            }
          }
          try {
            const gsc = await gscForAudit(service, env, audit.siteId);
            if (!gsc) return { ...base, ctx };
            return {
              ...base,
              ctx: { ...ctx, net: { ...ctx.net, gsc } },
            };
          } catch (error) {
            logger.warn('gsc_unavailable', { code: errorCode(error) });
            return { ...base, ctx };
          }
        },
        confirmActive: async (audit) => {
          const { ctx } = createAuditContext({
            target: targetOf(audit.site),
            verified: false,
            env,
            lab,
            budget: { maxRequests: 4 },
          });
          return confirmClaimedAudit(service, ctx.net, audit, new Date());
        },
        logger,
        ...options.overrides,
      });
    },
    chain: origin
      ? createTrigger({
          origin,
          key: db.serviceRoleKey,
          ...(options.fetch ? { fetch: options.fetch } : {}),
        })
      : async () => {},
  };
}
