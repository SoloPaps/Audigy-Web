import {
  createServiceClient,
  createUserClient,
  type Database,
  dbEnvFrom,
  type Json,
} from '@audigy/db';
import {
  type OwnershipSite,
  type ProofRecord,
  probeOwnership,
  scopesMatch,
  VERIFICATION_METHODS,
  type VerificationMethod,
} from '@audigy/engine';
import {
  createDohResolver,
  createRequestBudget,
  createSafeFetch,
  type DohResolver,
  type SafeFetch,
} from '@audigy/net';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuditContext } from './context.js';
import {
  type AuditEvent,
  applyProbe,
  checkEvent,
  decideRecheck,
} from './decide.js';
import { labFromEnv } from './lab.js';
import type { Logger } from './log.js';
import type { ClaimedAudit } from './process.js';
import { targetOf } from './target.js';
import type {
  RecheckDeps,
  VerificationDeps,
  VerificationPatch,
} from './verify-http.js';

type Client = SupabaseClient<Database>;
type Net = { fetch: SafeFetch; dns: DohResolver };

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_LIMIT = 20;

export interface VerifyEnvOptions {
  env: NodeJS.ProcessEnv;
  logger: Logger;
}

function isMethod(value: string): value is VerificationMethod {
  return (VERIFICATION_METHODS as readonly string[]).includes(value);
}

function isStatus(
  value: string,
): value is 'pending' | 'verified' | 'failed' | 'expired' {
  return (
    value === 'pending' ||
    value === 'verified' ||
    value === 'failed' ||
    value === 'expired'
  );
}

function evidenceOf(value: Json): {
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { host: '', scope: 'origin', pathPrefix: null };
  }
  const row = value as Record<string, Json | undefined>;
  return {
    host: typeof row.host === 'string' ? row.host : '',
    scope: row.scope === 'path' ? 'path' : 'origin',
    pathPrefix: typeof row.pathPrefix === 'string' ? row.pathPrefix : null,
  };
}

export function claimedOwnership(site: ClaimedAudit['site']): OwnershipSite {
  const href = site.url.endsWith('/') ? site.url : `${site.url}/`;
  const url = new URL(href);
  const scope = site.scope === 'path' ? 'path' : 'origin';
  return {
    host: url.hostname,
    scope,
    pathPrefix: scope === 'path' ? url.pathname : null,
  };
}

async function appendAudit(service: Client, entry: AuditEvent): Promise<void> {
  const { error } = await service.from('audit_log').insert({
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    details: entry.details as NonNullable<Json>,
  });
  if (error) throw new Error('audit_log_failed');
}

async function notifyExpired(
  service: Client,
  input: { userId: string; siteId: string; method: string },
): Promise<void> {
  const { data, error } = await service
    .from('alerts')
    .select('id')
    .eq('user_id', input.userId)
    .eq('site_id', input.siteId)
    .eq('kind', 'verification_expired')
    .is('sent_at', null)
    .limit(1);
  if (error) throw new Error('alert_lookup_failed');
  if ((data ?? []).length > 0) return;
  const inserted = await service.from('alerts').insert({
    user_id: input.userId,
    site_id: input.siteId,
    kind: 'verification_expired',
    payload: { method: input.method },
  });
  if (inserted.error) throw new Error('alert_insert_failed');
}

async function savePatch(
  service: Client,
  patch: VerificationPatch,
): Promise<void> {
  const { error } = await service
    .from('site_verifications')
    .update({
      status: patch.status,
      verified_at: patch.verifiedAt,
      last_checked_at: patch.lastCheckedAt,
      evidence: patch.evidence,
    })
    .eq('id', patch.id);
  if (error) throw new Error('verification_update_failed');
}

/** Revérifie la preuve juste avant un audit actif. Hors portée : aucune sonde. */
export async function confirmClaimedAudit(
  service: Client,
  net: Net,
  audit: ClaimedAudit,
  now: Date,
): Promise<{ allowed: boolean; actor: string | null }> {
  const { data: site, error: siteError } = await service
    .from('sites')
    .select('owner_id')
    .eq('id', audit.siteId)
    .maybeSingle();
  if (siteError) throw new Error('site_lookup_failed');
  const actor = site?.owner_id ?? null;
  const { data: rows, error } = await service
    .from('site_verifications')
    .select('id, method, token, status, verified_at, last_checked_at, evidence')
    .eq('site_id', audit.siteId)
    .eq('status', 'verified')
    .order('last_checked_at', { ascending: false })
    .limit(1);
  if (error) throw new Error('verification_lookup_failed');
  const row = rows?.[0];
  const ownership = claimedOwnership(audit.site);
  const evidence = evidenceOf(row?.evidence ?? {});
  const method = row && isMethod(row.method) ? row.method : null;
  const proof: ProofRecord | null =
    row && method
      ? {
          status: row.status,
          method,
          lastCheckedAt: row.last_checked_at
            ? new Date(row.last_checked_at)
            : null,
          host: evidence.host,
          scope: evidence.scope,
          pathPrefix: evidence.pathPrefix,
        }
      : null;
  let probe: 'present' | 'absent' | 'error' | 'skipped' = 'skipped';
  let location = '';
  if (proof && method && row && scopesMatch(proof, ownership)) {
    const read = await probeOwnership(method, row.token, ownership, net);
    probe = read.outcome;
    location = read.location;
  }
  const decision = decideRecheck({
    actor,
    siteId: audit.siteId,
    proof,
    site: ownership,
    now,
    probe,
  });
  if (row && decision.touchCheckedAt && decision.nextStatus) {
    await savePatch(service, {
      id: row.id,
      status: decision.nextStatus,
      verifiedAt:
        decision.nextStatus === 'verified'
          ? (row.verified_at ?? now.toISOString())
          : row.verified_at,
      lastCheckedAt: now.toISOString(),
      evidence: {
        host: evidence.host || ownership.host,
        scope: evidence.scope,
        pathPrefix: evidence.pathPrefix,
        location,
      },
    });
  }
  if (decision.alert && actor) {
    await notifyExpired(service, {
      userId: actor,
      siteId: audit.siteId,
      method: method ?? 'file',
    });
  }
  if (decision.event) await appendAudit(service, decision.event);
  return { allowed: decision.allowed, actor };
}

/** Relit les preuves vérifiées depuis plus d’un jour. */
export async function recheckDueVerifications(
  service: Client,
  net: Net,
  now: Date,
): Promise<{ checked: number; expired: number }> {
  const before = new Date(now.getTime() - DAY_MS).toISOString();
  const { data, error } = await service
    .from('site_verifications')
    .select('id, site_id, method, token, status, verified_at')
    .eq('status', 'verified')
    .lt('last_checked_at', before)
    .limit(DUE_LIMIT);
  if (error) throw new Error('verification_lookup_failed');
  let checked = 0;
  let expired = 0;
  for (const row of data ?? []) {
    if (!isMethod(row.method) || !isStatus(row.status)) continue;
    const { data: site, error: siteError } = await service
      .from('sites')
      .select('owner_id, host, scope, path_prefix')
      .eq('id', row.site_id)
      .maybeSingle();
    if (siteError) throw new Error('site_lookup_failed');
    if (!site) continue;
    const ownership: OwnershipSite = {
      host: site.host,
      scope: site.scope === 'path' ? 'path' : 'origin',
      pathPrefix: site.scope === 'path' ? site.path_prefix : null,
    };
    const read = await probeOwnership(row.method, row.token, ownership, net);
    checked += 1;
    if (read.outcome === 'error') {
      await appendAudit(
        service,
        checkEvent({
          actor: site.owner_id,
          siteId: row.site_id,
          verificationId: row.id,
          method: row.method,
          status: row.status,
          found: false,
          inconclusive: true,
          action: 'verification.recheck',
        }),
      );
      continue;
    }
    const applied = applyProbe({ previous: row.status, outcome: read.outcome });
    if (applied.status === 'expired') expired += 1;
    await savePatch(service, {
      id: row.id,
      status: applied.status,
      verifiedAt:
        applied.status === 'verified'
          ? (row.verified_at ?? now.toISOString())
          : row.verified_at,
      lastCheckedAt: now.toISOString(),
      evidence: {
        host: ownership.host,
        scope: ownership.scope,
        pathPrefix: ownership.pathPrefix,
        location: read.location,
      },
    });
    if (applied.alert) {
      await notifyExpired(service, {
        userId: site.owner_id,
        siteId: row.site_id,
        method: row.method,
      });
    }
    await appendAudit(
      service,
      checkEvent({
        actor: site.owner_id,
        siteId: row.site_id,
        verificationId: row.id,
        method: row.method,
        status: applied.status,
        found: applied.found,
        inconclusive: false,
        action: applied.action,
      }),
    );
  }
  return { checked, expired };
}

export function verificationDepsFromEnv(
  options: VerifyEnvOptions,
): VerificationDeps {
  const { env, logger } = options;
  const db = dbEnvFrom(env);
  const service = createServiceClient(db);
  const anon = createUserClient(db);
  const lab = labFromEnv(env, { requireNetlifyDev: true });
  return {
    logger,
    async userFromToken(token) {
      const { data, error } = await anon.auth.getUser(token);
      if (error || !data.user) return null;
      return data.user.id;
    },
    async loadSite(userId, siteId) {
      const { data, error } = await service
        .from('sites')
        .select('id, owner_id, host, scope, path_prefix')
        .eq('id', siteId)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw new Error('site_lookup_failed');
      if (!data) return null;
      return {
        id: data.id,
        ownerId: data.owner_id,
        host: data.host,
        scope: data.scope === 'path' ? 'path' : 'origin',
        pathPrefix: data.scope === 'path' ? data.path_prefix : null,
      };
    },
    async loadVerification(userId, verificationId) {
      const { data, error } = await service
        .from('site_verifications')
        .select('id, site_id, method, token, status, verified_at, evidence')
        .eq('id', verificationId)
        .maybeSingle();
      if (error) throw new Error('verification_lookup_failed');
      if (!data || !isMethod(data.method) || !isStatus(data.status))
        return null;
      const { data: site, error: siteError } = await service
        .from('sites')
        .select('owner_id')
        .eq('id', data.site_id)
        .maybeSingle();
      if (siteError) throw new Error('site_lookup_failed');
      if (!site || site.owner_id !== userId) return null;
      const evidence = evidenceOf(data.evidence);
      return {
        id: data.id,
        siteId: data.site_id,
        ownerId: site.owner_id,
        method: data.method,
        token: data.token,
        status: data.status,
        verifiedAt: data.verified_at,
        host: evidence.host,
        scope: evidence.scope,
        pathPrefix: evidence.pathPrefix,
      };
    },
    async insertPending(input) {
      const { data, error } = await service
        .from('site_verifications')
        .insert({
          site_id: input.siteId,
          method: input.method,
          token: input.token,
          status: 'pending',
          evidence: input.evidence,
        })
        .select('id')
        .single();
      if (error || !data) throw new Error('verification_insert_failed');
      return data.id;
    },
    save: (patch) => savePatch(service, patch),
    appendAudit: (entry) => appendAudit(service, entry),
    notifyExpired: (input) => notifyExpired(service, input),
    async probe(method, token, site) {
      const { ctx } = createAuditContext({
        target: targetOf({
          url:
            site.scope === 'path' && site.pathPrefix
              ? `https://${site.host}${site.pathPrefix}`
              : `https://${site.host}`,
          scope: site.scope,
          hosting: 'other',
        }),
        verified: false,
        env,
        lab,
        budget: { maxRequests: 4 },
      });
      return probeOwnership(method, token, site, ctx.net);
    },
    now: () => new Date(),
  };
}

export function recheckNet(env: NodeJS.ProcessEnv): Net {
  const lab = labFromEnv(env, { requireNetlifyDev: true });
  if (lab) {
    const { ctx } = createAuditContext({
      target: {
        url: new URL('https://exemple.fr/'),
        scope: 'origin',
        hosting: 'other',
      },
      verified: false,
      env,
      lab,
      budget: { maxRequests: 40 },
    });
    return ctx.net;
  }
  const budget = createRequestBudget({ maxRequests: 40 });
  return { fetch: createSafeFetch({ budget }), dns: createDohResolver() };
}

export function recheckDepsFromEnv(options: VerifyEnvOptions): RecheckDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  return {
    key: db.serviceRoleKey,
    logger: options.logger,
    recheck: () =>
      recheckDueVerifications(service, recheckNet(options.env), new Date()),
  };
}

export async function appendAuditLog(
  service: Client,
  entry: AuditEvent,
): Promise<void> {
  await appendAudit(service, entry);
}
