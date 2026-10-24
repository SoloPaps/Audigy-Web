import {
  createServiceClient,
  type Database,
  dbEnvFrom,
  requestAudit,
} from '@audigy/db';
import { ENGINE_VERSION, METHOD_VERSION } from '@audigy/engine';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Logger } from './log.js';
import {
  ALERT_KINDS,
  createBrevoMailer,
  type Mailer,
  parseAlertPayload,
  senderEmail,
  type UnsubscribeDeps,
} from './mail.js';
import {
  checksToPurge,
  createUptimeProbe,
  type DailyFold,
  type DigestDeps,
  type DigestRecipient,
  type DigestStore,
  digestRateKey,
  foldUptime,
  mergeDaily,
  type PendingAlert,
  type RawCheck,
  type Roster,
  type ScheduleDeps,
  type ScheduleStore,
  UPTIME_KEEP_MS,
} from './schedule.js';
import { selfOrigin } from './supabase.js';
import { createTrigger } from './trigger.js';

type Client = SupabaseClient<Database>;

const auditSchema = z.strictObject({
  id: z.uuid(),
  score: z.number().int().nullable(),
  finishedAt: z.string().nullable(),
  graves: z.array(z.string().max(120)),
  certDays: z.number().int().nullable(),
  certUntil: z.string().max(80).nullable(),
});

const siteSchema = z.strictObject({
  id: z.uuid(),
  ownerId: z.uuid(),
  url: z.string().min(1).max(2048),
  label: z.string().max(200),
  host: z.string().min(1).max(253),
  emailOptOut: z.boolean(),
  lastOk: z.boolean().nullable(),
  lastCheckedAt: z.string().nullable(),
  incidentId: z.uuid().nullable(),
  audits: z.array(auditSchema),
});

const dueSchema = z.strictObject({
  siteId: z.uuid(),
  ownerId: z.uuid(),
  cadence: z.enum(['weekly', 'monthly']),
  mode: z.enum(['passive', 'active']),
  nextRunAt: z.string(),
});

const rosterSchema = z.strictObject({
  sites: z.array(siteSchema),
  due: z.array(dueSchema),
});

const digestSiteSchema = z.strictObject({
  label: z.string(),
  host: z.string(),
  score: z.number().int().nullable(),
  checks: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  openIncident: z.boolean(),
});

const digestSchema = z.array(
  z.strictObject({
    userId: z.uuid(),
    sites: z.array(digestSiteSchema),
  }),
);

export function parseRoster(input: unknown): Roster {
  const parsed = rosterSchema.safeParse(input);
  if (!parsed.success) throw new Error('schedule_roster_invalid');
  return parsed.data;
}

export function parseDigest(input: unknown): DigestRecipient[] {
  const parsed = digestSchema.safeParse(input);
  if (!parsed.success) throw new Error('digest_roster_invalid');
  return parsed.data;
}

function duplicate(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

function fail(error: { message: string } | null, code: string): void {
  if (error) throw new Error(code);
}

const ROLLUP_BATCH = 500;

async function writeDaily(service: Client, batch: DailyFold): Promise<void> {
  const { data, error } = await service
    .from('uptime_daily')
    .select('checks, failures, p50_ms')
    .eq('site_id', batch.siteId)
    .eq('day', batch.day)
    .maybeSingle();
  fail(error, 'uptime_daily_failed');
  const merged = mergeDaily(
    data
      ? {
          checks: data.checks,
          failures: data.failures,
          p50Ms: data.p50_ms,
        }
      : null,
    batch,
  );
  const saved = await service.from('uptime_daily').upsert({
    site_id: merged.siteId,
    day: merged.day,
    checks: merged.checks,
    failures: merged.failures,
    p50_ms: merged.p50Ms,
  });
  fail(saved.error, 'uptime_daily_failed');
}

export function supabaseScheduleStore(service: Client): ScheduleStore {
  return {
    async roster(now) {
      const { data, error } = await service.rpc('schedule_roster', {
        p_now: now.toISOString(),
      });
      fail(error, 'schedule_roster_failed');
      return parseRoster(data);
    },

    async insertCheck(input) {
      const { error } = await service.from('uptime_checks').insert({
        site_id: input.siteId,
        checked_at: input.checkedAt,
        ok: input.ok,
        status_code: input.statusCode,
        ms: input.ms,
      });
      fail(error, 'uptime_insert_failed');
    },

    async openIncident(siteId, at) {
      const { data, error } = await service
        .from('incidents')
        .insert({ site_id: siteId, started_at: at, cause: 'unreachable' })
        .select('id')
        .single();
      if (duplicate(error)) return null;
      fail(error, 'incident_insert_failed');
      if (!data) throw new Error('incident_insert_failed');
      return data.id;
    },

    async resolveIncident(id, at) {
      const { error } = await service
        .from('incidents')
        .update({ resolved_at: at })
        .eq('id', id);
      fail(error, 'incident_resolve_failed');
    },

    async findAlert(userId, siteId, kind, dedup) {
      const { data, error } = await service
        .from('alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('site_id', siteId)
        .eq('kind', kind)
        .contains('payload', { dedup })
        .limit(1);
      fail(error, 'alert_lookup_failed');
      return (data ?? []).length > 0;
    },

    async insertAlert(input) {
      const { data, error } = await service
        .from('alerts')
        .insert({
          user_id: input.userId,
          site_id: input.siteId,
          kind: input.kind,
          payload: JSON.parse(JSON.stringify(input.payload)) as NonNullable<
            Database['public']['Tables']['alerts']['Insert']['payload']
          >,
        })
        .select('id')
        .single();
      if (duplicate(error)) return { status: 'duplicate' };
      fail(error, 'alert_insert_failed');
      if (!data) throw new Error('alert_insert_failed');
      return { status: 'created', id: data.id };
    },

    async markAlertSent(id, at) {
      const { error } = await service
        .from('alerts')
        .update({ sent_at: at })
        .eq('id', id);
      fail(error, 'alert_update_failed');
    },

    async pendingAlerts() {
      const { data, error } = await service
        .from('alerts')
        .select('id, user_id, site_id, kind, payload')
        .is('sent_at', null)
        .in('kind', [...ALERT_KINDS]);
      fail(error, 'alert_lookup_failed');
      const rows = data ?? [];
      const userIds = [...new Set(rows.map((row) => row.user_id))];
      const opted = new Map<string, boolean>();
      if (userIds.length > 0) {
        const profiles = await service
          .from('profiles')
          .select('id, email_opt_out')
          .in('id', userIds);
        fail(profiles.error, 'profile_lookup_failed');
        for (const profile of profiles.data ?? []) {
          opted.set(profile.id, profile.email_opt_out);
        }
      }
      const pending: PendingAlert[] = [];
      for (const row of rows) {
        const kind = ALERT_KINDS.find((item) => item === row.kind);
        const payload = parseAlertPayload(row.payload);
        if (!kind || !payload) continue;
        pending.push({
          id: row.id,
          userId: row.user_id,
          siteId: row.site_id,
          kind,
          payload,
          emailOptOut: opted.get(row.user_id) ?? false,
        });
      }
      return pending;
    },

    async advanceSchedule(siteId, now, next) {
      const { data, error } = await service
        .from('schedules')
        .update({ next_run_at: next })
        .eq('site_id', siteId)
        .lte('next_run_at', now.toISOString())
        .select('site_id');
      fail(error, 'schedule_update_failed');
      return (data ?? []).length > 0;
    },

    async enqueue(input) {
      const res = await requestAudit(service, {
        userId: input.userId,
        siteId: input.siteId,
        mode: input.mode,
        trigger: 'schedule',
        methodVersion: METHOD_VERSION,
        engineVersion: ENGINE_VERSION,
      });
      if (res.outcome === 'created' || res.outcome === 'existing') {
        return res.outcome;
      }
      return 'skip';
    },

    async rollup(now) {
      let purged = 0;
      const seen = new Set<string>();
      for (let batch = 0; batch < 10; batch += 1) {
        const { data, error } = await service
          .from('uptime_checks')
          .select('id, site_id, checked_at, ok, ms')
          .lt(
            'checked_at',
            new Date(now.getTime() - UPTIME_KEEP_MS).toISOString(),
          )
          .order('checked_at', { ascending: true })
          .limit(ROLLUP_BATCH);
        fail(error, 'uptime_rollup_failed');
        const rows: RawCheck[] = (data ?? []).map((row) => ({
          id: row.id,
          siteId: row.site_id,
          checkedAt: row.checked_at,
          ok: row.ok,
          ms: row.ms,
        }));
        const old = checksToPurge(rows, now);
        if (old.length === 0) break;
        for (const folded of foldUptime(old)) {
          await writeDaily(service, folded);
          seen.add(`${folded.siteId}:${folded.day}`);
        }
        const removed = await service
          .from('uptime_checks')
          .delete()
          .in(
            'id',
            old.map((row) => row.id),
          );
        fail(removed.error, 'uptime_purge_failed');
        purged += old.length;
        if (rows.length < ROLLUP_BATCH) break;
      }
      return { days: seen.size, purged };
    },

    userEmail: (userId) => readEmail(service, userId),
  };
}

export function supabaseDigestStore(service: Client): DigestStore {
  return {
    async recipients(now) {
      const { data, error } = await service.rpc('digest_roster', {
        p_now: now.toISOString(),
      });
      fail(error, 'digest_roster_failed');
      return parseDigest(data);
    },
    async claim(userId, week, windowStart) {
      const { error } = await service.from('rate_limits').insert({
        key: digestRateKey(userId, week),
        window_start: windowStart,
        count: 1,
      });
      if (!error) return true;
      if (duplicate(error)) return false;
      throw new Error('digest_claim_failed');
    },
    async release(userId, week, windowStart) {
      const { error } = await service
        .from('rate_limits')
        .delete()
        .eq('key', digestRateKey(userId, week))
        .eq('window_start', windowStart);
      fail(error, 'digest_release_failed');
    },
    userEmail: (userId) => readEmail(service, userId),
  };
}

async function readEmail(
  service: Client,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await service.auth.admin.getUserById(userId);
    const email = data.user?.email?.trim();
    if (error || !email) return null;
    return email;
  } catch {
    return null;
  }
}

export async function supabaseUnsubscribe(
  service: Client,
  userId: string,
): Promise<void> {
  const { error } = await service
    .from('profiles')
    .update({ email_opt_out: true, weekly_digest: false })
    .eq('id', userId);
  fail(error, 'unsubscribe_failed');
}

export function publicOrigin(env: NodeJS.ProcessEnv): string | null {
  const raw = env.APP_BASE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function mailerFromEnv(
  env: NodeJS.ProcessEnv,
  origin: string | null,
  fetch: typeof globalThis.fetch | undefined,
): Mailer | null {
  const apiKey = env.BREVO_API_KEY?.trim() ?? '';
  if (!origin || apiKey.length < 8) return null;
  return createBrevoMailer({
    apiKey,
    senderEmail: senderEmail(origin),
    ...(fetch ? { fetch } : {}),
  });
}

export interface FromEnv {
  env: NodeJS.ProcessEnv;
  requestUrl: string;
  logger: Logger;
  fetch?: typeof globalThis.fetch;
}

export function scheduleDepsFromEnv(options: FromEnv): ScheduleDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  const origin = publicOrigin(options.env);
  const wake = selfOrigin(options.env, options.requestUrl);
  const uptime = createUptimeProbe(origin ?? undefined);
  return {
    now: () => new Date(),
    store: supabaseScheduleStore(service),
    probe: (url) => uptime.check(url),
    mailer: mailerFromEnv(options.env, origin, options.fetch),
    appBaseUrl: origin,
    signingKey: db.serviceRoleKey,
    logger: options.logger,
    trigger: wake
      ? createTrigger({
          origin: wake,
          key: db.serviceRoleKey,
          ...(options.fetch ? { fetch: options.fetch } : {}),
        })
      : async () => {},
  };
}

export function digestDepsFromEnv(options: FromEnv): DigestDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  const origin = publicOrigin(options.env);
  return {
    now: () => new Date(),
    store: supabaseDigestStore(service),
    mailer: mailerFromEnv(options.env, origin, options.fetch),
    appBaseUrl: origin,
    signingKey: db.serviceRoleKey,
    logger: options.logger,
  };
}

export function unsubscribeDepsFromEnv(
  options: Pick<FromEnv, 'env' | 'logger'>,
): UnsubscribeDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  return {
    key: db.serviceRoleKey,
    logger: options.logger,
    apply: (userId) => supabaseUnsubscribe(service, userId),
  };
}
