import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runJob, supabaseJobStore } from '@audigy/browser-runner';
import { createServiceClient, createUserClient } from '@audigy/db';
import { SECURITE_CHECKS, VIE_PRIVEE_CHECKS } from '@audigy/engine';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Lab, startLab } from '../../../fixtures/lab.js';
import {
  ensureLocalSupabase,
  type LocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
} from '../../db/test/local.js';
import {
  type AuditView,
  apiDepsFromEnv,
  createLogger,
  type Dispatcher,
  handleCreate,
  handleGet,
  handleRun,
  runDepsFromEnv,
  secretsFromEnv,
  signTrigger,
  TRIGGER_HEADER,
} from '../src/index.js';

const ORIGIN = 'http://localhost:8888';

let local: LocalSupabase;
let admin: Sql;
let lab: Lab;
let dir: string;
let env: NodeJS.ProcessEnv;
let unlock: (() => Promise<void>) | undefined;
const lines: string[] = [];
const triggers: string[] = [];
const tokens: Record<'a' | 'b', string> = { a: '', b: '' };
const users: Record<'a' | 'b', string> = { a: '', b: '' };

const logger = () =>
  createLogger({
    secrets: [...secretsFromEnv(env), tokens.a, tokens.b],
    sink: (line) => lines.push(line),
  });

async function signUp(who: 'a' | 'b'): Promise<void> {
  const service = createServiceClient({
    url: local.apiUrl,
    serviceRoleKey: local.serviceRoleKey,
  });
  const email = `e2e-${who}-${randomUUID()}@example.com`;
  const password = randomUUID();
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw new Error('create_user');
  users[who] = created.data.user.id;
  const anon = createUserClient({ url: local.apiUrl, anonKey: local.anonKey });
  const session = await anon.auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session) throw new Error('sign_in');
  tokens[who] = session.data.session.access_token;
}

function api() {
  return apiDepsFromEnv({
    env,
    requestUrl: `${ORIGIN}/api/audits`,
    logger: logger(),
    fetch: async (input) => {
      triggers.push(String(input));
      return new Response(null, { status: 202 });
    },
  });
}

function create(who: 'a' | 'b', body: unknown): Promise<Response> {
  return handleCreate(
    new Request(`${ORIGIN}/api/audits`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokens[who]}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
    api(),
  );
}

async function view(who: 'a' | 'b', id: string): Promise<Response> {
  return handleGet(
    new Request(`${ORIGIN}/api/audits/${id}`, {
      headers: { authorization: `Bearer ${tokens[who]}` },
    }),
    api(),
    id,
  );
}

async function run(dispatcher: Dispatcher): Promise<unknown> {
  const deps = runDepsFromEnv({
    env,
    requestUrl: `${ORIGIN}/.netlify/functions/audit-run-background`,
    logger: logger(),
    dispatcher,
    fetch: async () => new Response(null, { status: 202 }),
    overrides: {
      checks: [...SECURITE_CHECKS, ...VIE_PRIVEE_CHECKS],
      runnerWaitMs: 5000,
      pollMs: 250,
    },
  });
  const res = await handleRun(
    new Request(`${ORIGIN}/.netlify/functions/audit-run-background`, {
      method: 'POST',
      headers: { [TRIGGER_HEADER]: signTrigger(local.serviceRoleKey) },
    }),
    deps,
  );
  expect(res.status).toBe(200);
  return res.json();
}

const BROWSER_CHECK = 'vie_privee.traceurs';

function browserFinding(audit: AuditView) {
  return audit.findings.find((f) => f.checkId === BROWSER_CHECK);
}

/** Rapport réel du runner (fixture PART-13), recalé sur l'hôte audité. */
async function runnerReport(host: string): Promise<unknown> {
  const raw = await readFile(
    new URL('../../browser-runner/fixtures/clean.json', import.meta.url),
    'utf8',
  );
  return JSON.parse(raw.replaceAll('exemple.test', host));
}

describe('orchestration de bout en bout (Supabase local + labo)', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    local = localSupabaseStatus();
    admin = postgres(local.dbUrl, { max: 2, prepare: false });
    await admin`
      update public.audits set status = 'failed', error = 'stale', finished_at = now()
      where status in ('queued', 'running', 'partial')
    `;
    await admin`delete from public.rate_limits`;
    lab = await startLab();
    dir = await mkdtemp(path.join(tmpdir(), 'audigy-e2e-'));
    const labFile = path.join(dir, 'lab.json');
    await writeFile(labFile, JSON.stringify(lab.config));
    env = {
      SUPABASE_URL: local.apiUrl,
      SUPABASE_ANON_KEY: local.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: local.serviceRoleKey,
      AUDIGY_LAB: labFile,
      NETLIFY_DEV: 'true',
    };
    await signUp('a');
    await signUp('b');
  });

  afterAll(async () => {
    await admin?.end();
    await lab?.close();
    if (dir) await rm(dir, { recursive: true, force: true });
    await unlock?.();
  });

  let first = '';

  it('double clic : un seul audit, un seul réveil', async () => {
    const [one, two] = await Promise.all([
      create('a', { url: 'bon.audigy.test' }),
      create('a', { url: 'https://bon.audigy.test/' }),
    ]);
    type Body = { auditId: string };
    const a = (await one.json()) as Body;
    const b = (await two.json()) as Body;
    expect([one.status, two.status].sort()).toEqual([200, 202]);
    expect(a.auditId).toBe(b.auditId);
    first = a.auditId;
    expect(triggers).toEqual([
      `${ORIGIN}/.netlify/functions/audit-run-background`,
    ]);
    const rows = await admin<{ n: number }[]>`
      select count(*)::int as n from public.audits a
      join public.sites s on s.id = a.site_id
      where s.owner_id = ${users.a}::uuid
    `;
    expect(rows[0]?.n).toBe(1);
  });

  it('runner absent : partial puis done, navigateur non testé explicite', async () => {
    const seen: { status: string; reason: string | null }[] = [];
    const absent: Dispatcher = {
      async dispatch(auditId) {
        const res = await view('a', auditId);
        const body = (await res.json()) as AuditView;
        seen.push({
          status: body.audit.status,
          reason: browserFinding(body)?.reason ?? null,
        });
        return { ok: false, reason: 'not_configured' };
      },
    };
    expect(await run(absent)).toEqual({ processed: first });
    expect(seen).toEqual([
      { status: 'partial', reason: 'reason.runner_pending' },
    ]);

    const res = await view('a', first);
    expect(res.status).toBe(200);
    const body = (await res.json()) as AuditView;
    expect(body.audit).toMatchObject({
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      error: null,
      site: { url: 'https://bon.audigy.test', scope: 'origin' },
    });
    expect(body.audit.finishedAt).not.toBeNull();
    expect(body.audit.globalScore).toBeTypeOf('number');
    expect(browserFinding(body)).toMatchObject({
      status: 'untested',
      reason: 'reason.runner_absent',
    });
    expect(body.domains.find((d) => d.domain === 'securite')?.score).toBeTypeOf(
      'number',
    );
    expect(
      body.domains.find((d) => d.domain === 'vie_privee')?.score,
    ).toBeNull();
    const browserIds = VIE_PRIVEE_CHECKS.filter((check) =>
      check.needs.includes('browser'),
    ).map((check) => check.id);
    expect(
      body.findings
        .filter((finding) => browserIds.includes(finding.checkId))
        .map((finding) => finding.messageKey)
        .sort(),
    ).toEqual(browserIds.map((id) => `${id}.untested`).sort());
    expect(body.findings.some((f) => f.checkId.startsWith('securite.'))).toBe(
      true,
    );
  });

  it('audit terminé : limite, pas l’ancien id', async () => {
    const res = await create('a', { url: 'https://bon.audigy.test/' });
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error?: string; auditId?: string };
    expect(body.error).toBe('host_limit');
    expect(body.auditId).toBeUndefined();
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('audit en cours : le même id de progression', async () => {
    const created = await create('a', { url: 'encours.audigy.test' });
    expect(created.status).toBe(202);
    const { auditId } = (await created.json()) as { auditId: string };
    await admin`
      update public.audits set status = 'running' where id = ${auditId}::uuid
    `;
    const again = await create('a', { url: 'https://encours.audigy.test/' });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ auditId, existing: true });
  });

  it('audit failed récent : limite, pas une reprise', async () => {
    const created = await create('a', { url: 'rate.audigy.test' });
    expect(created.status).toBe(202);
    const { auditId } = (await created.json()) as { auditId: string };
    await admin`
      update public.audits
      set status = 'failed', error = 'stale', finished_at = now()
      where id = ${auditId}::uuid
    `;
    const res = await create('a', { url: 'https://rate.audigy.test/' });
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error?: string; auditId?: string };
    expect(body.error).toBe('host_limit');
    expect(body.auditId).toBeUndefined();
  });

  it('file vide : rien à traiter', async () => {
    const never: Dispatcher = {
      dispatch: async () => ({ ok: false, reason: 'not_configured' }),
    };
    expect(await run(never)).toEqual({ processed: null });
  });

  it('runner présent : sa sortie est fusionnée', async () => {
    const created = await create('a', { url: 'mauvais.audigy.test' });
    expect(created.status).toBe(202);
    const { auditId } = (await created.json()) as { auditId: string };
    const service = createServiceClient({
      url: local.apiUrl,
      serviceRoleKey: local.serviceRoleKey,
    });
    const report = await runnerReport('mauvais.audigy.test');
    const jobs: string[] = [];
    const runner: Dispatcher = {
      async dispatch(id) {
        const summary = await runJob(id, {
          store: supabaseJobStore(service),
          run: async ({ url }) => {
            jobs.push(String(url));
            return {
              result: report as never,
              screenshots: [
                { file: 'capture-desktop.webp', data: Buffer.from('RIFF') },
              ],
            };
          },
        });
        expect(summary.artifacts).toContain(`${id}/browser/results.json`);
        return { ok: true };
      },
    };
    expect(await run(runner)).toEqual({ processed: auditId });
    const body = (await (await view('a', auditId)).json()) as AuditView;
    expect(body.audit.status).toBe('done');
    expect(jobs).toEqual(['https://mauvais.audigy.test']);
    const browserIds = VIE_PRIVEE_CHECKS.filter((c) =>
      c.needs.includes('browser'),
    ).map((c) => c.id);
    const merged = body.findings.filter((f) => browserIds.includes(f.checkId));
    expect(merged).toHaveLength(browserIds.length);
    for (const finding of merged) {
      expect(finding.status).not.toBe('untested');
      expect(finding.reason ?? '').not.toMatch(/^reason\.runner_/);
    }
    expect(browserFinding(body)).toMatchObject({ status: 'pass' });
    expect(
      body.domains.find((d) => d.domain === 'vie_privee')?.score,
    ).toBeTypeOf('number');
  });

  it('un autre utilisateur ne lit pas l’audit', async () => {
    const res = await view('b', first);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: 'audit_not_found',
      messageKey: 'api.error.audit_not_found',
    });
  });

  it('limite par hôte : 1 audit / 15 min, tous comptes confondus', async () => {
    const res = await create('b', { url: 'https://bon.audigy.test/blog/' });
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'host_limit' });
    const retry = Number(res.headers.get('retry-after'));
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(900);
  });

  it('limite par utilisateur : 10 audits par jour', async () => {
    await admin`
      insert into public.rate_limits (key, window_start, count)
      values (
        private.rate_key('audits-user', ${users.b}),
        date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris',
        10
      )
    `;
    const res = await create('b', { url: 'autre.audigy.test' });
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'user_limit' });
    const keys = await admin<
      { key: string }[]
    >`select key from public.rate_limits`;
    for (const { key } of keys) expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('actif sans vérification : refusé', async () => {
    const res = await create('a', {
      url: 'autre.audigy.test',
      mode: 'active',
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'unverified' });
  });

  it('aucun secret dans les journaux', () => {
    expect(lines.length).toBeGreaterThan(0);
    const all = lines.join('\n');
    for (const secret of [
      local.serviceRoleKey,
      local.anonKey,
      tokens.a,
      tokens.b,
    ]) {
      expect(all).not.toContain(secret);
    }
    expect(all).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow();
  });
});
