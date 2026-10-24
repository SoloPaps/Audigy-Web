import postgres, { type Sql, type TransactionSql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  claimNextAudit,
  createServiceClient,
  createUserClient,
  readPublicScore,
  readReportByShareToken,
  readSharedScore,
  requestMagicLink,
} from '../src/index.js';
import {
  ensureLocalSupabase,
  type LocalSupabase,
  localSupabaseStatus,
  lockLocalDatabase,
  resetLocalDatabase,
} from './local.js';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const A_SITE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';
const B_SITE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01';
const B_PUBLIC = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';
const B_DELETED = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03';
const A_AUDIT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10';
const B_AUDIT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10';
const SHA = 'ab'.repeat(32);

let admin: Sql;
let local: LocalSupabase;
let linkToken = '';
let unlock: (() => Promise<void>) | undefined;

async function insertUser(id: string, email: string): Promise<void> {
  await admin`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      ${id}::uuid,
      'authenticated',
      'authenticated',
      ${email},
      extensions.crypt(extensions.gen_random_uuid()::text, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(),
      '', '', '', '', '', ''
    )
  `;
  await admin`
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      ${id},
      ${id}::uuid,
      jsonb_build_object('sub', ${id}::text, 'email', ${email}::text),
      'email',
      now(), now(), now()
    )
  `;
}

async function asUser<T>(
  userId: string | null,
  run: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify(
    userId ? { sub: userId, role: 'authenticated' } : { role: 'anon' },
  );
  const rows = await admin.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx`select set_config('request.jwt.claim.sub', ${userId ?? ''}, true)`;
    await tx.unsafe(`set local role ${userId ? 'authenticated' : 'anon'}`);
    return run(tx);
  });
  return rows as T;
}

async function expectDenied(
  userId: string | null,
  run: (tx: TransactionSql) => Promise<unknown>,
): Promise<void> {
  await expect(asUser(userId, run)).rejects.toMatchObject({ code: '42501' });
}

describe('RLS Supabase local', () => {
  beforeAll(async () => {
    await ensureLocalSupabase();
    unlock = await lockLocalDatabase();
    resetLocalDatabase();
    resetLocalDatabase();
    local = localSupabaseStatus();
    admin = postgres(local.dbUrl, { max: 4, prepare: false });

    const sites = await admin<{ url: string }[]>`
      select url from public.sites order by url
    `;
    expect(sites.map((row) => row.url)).toEqual([
      'https://angelique-osteo.fr',
      'https://solopaps.github.io/Projet-Site-Artiste/',
    ]);

    await insertUser(A, 'a@example.com');
    await insertUser(B, 'b@example.com');

    await admin`
      insert into public.sites (
        id, owner_id, url, scope, host, label, hosting, is_public, public_slug, deleted_at
      ) values
        (${A_SITE}::uuid, ${A}::uuid, 'https://a.example.com', 'origin', 'a.example.com', 'A', 'other', false, null, null),
        (${B_SITE}::uuid, ${B}::uuid, 'https://b.example.com', 'origin', 'b.example.com', 'B', 'other', false, null, null),
        (${B_PUBLIC}::uuid, ${B}::uuid, 'https://public-b.example.com', 'origin', 'public-b.example.com', 'Public B', 'other', true, 'public-b1', null),
        (${B_DELETED}::uuid, ${B}::uuid, 'https://gone-b.example.com', 'origin', 'gone-b.example.com', 'Gone', 'other', true, 'public-b2', now())
    `;

    await admin`
      insert into public.audits (
        id, site_id, trigger, mode, status, method_version, engine_version,
        global_score, coverage, started_at, finished_at
      ) values
        (${A_AUDIT}::uuid, ${A_SITE}::uuid, 'manual', 'passive', 'done', '2026.1', 'test', 80, 1, now(), now()),
        (${B_AUDIT}::uuid, ${B_SITE}::uuid, 'manual', 'passive', 'done', '2026.1', 'test', 40, 1, now(), now())
    `;

    await admin`
      insert into public.domain_scores (audit_id, domain, score, coverage, level)
      values (${B_AUDIT}::uuid, 'securite', 40, 1, 'problem')
    `;
    await admin`
      insert into public.findings (
        audit_id, domain, check_id, status, severity, impact, score, message_key
      ) values (
        ${B_AUDIT}::uuid, 'securite', 'securite.hsts', 'fail', 4, 3, 0, 'finding.securite.hsts'
      )
    `;
    await admin`
      insert into public.artifacts (audit_id, kind, storage_path, sha256, bytes)
      values (
        ${B_AUDIT}::uuid, 'json', ${`${B}/audit/results.json`}, ${SHA}, 12
      )
    `;
    await admin`
      insert into public.reports (audit_id, visibility, manifest_sha256) values
        (${B_AUDIT}::uuid, 'private', ${SHA}),
        (${B_AUDIT}::uuid, 'public', ${SHA}),
        (${B_AUDIT}::uuid, 'link', ${SHA})
    `;
    await admin`
      insert into public.reports (audit_id, visibility, manifest_sha256, revoked_at)
      values (${B_AUDIT}::uuid, 'public', ${SHA}, now())
    `;
    const [link] = await admin<{ share_token: string }[]>`
      select share_token from public.reports
      where audit_id = ${B_AUDIT}::uuid and visibility = 'link' and revoked_at is null
    `;
    linkToken = link?.share_token ?? '';

    await admin`
      insert into public.site_verifications (site_id, method, token, status)
      values (${B_SITE}::uuid, 'dns_txt', ${'b'.repeat(32)}, 'pending')
    `;
    await admin`
      insert into public.schedules (site_id, cadence, next_run_at)
      values (${B_SITE}::uuid, 'weekly', now())
    `;
    await admin`
      insert into public.uptime_checks (site_id, ok, status_code, ms)
      values (${B_SITE}::uuid, true, 200, 40)
    `;
    await admin`
      insert into public.uptime_daily (site_id, day, checks, failures, p50_ms)
      values (${B_SITE}::uuid, '2026-10-23', 10, 1, 40)
    `;
    await admin`
      insert into public.incidents (site_id, started_at, cause)
      values (${B_SITE}::uuid, now(), 'timeout')
    `;
    await admin`
      insert into public.alerts (user_id, site_id, kind)
      values (${B}::uuid, ${B_SITE}::uuid, 'score_drop')
    `;
    await admin`
      insert into public.oauth_tokens (user_id, provider, scope, refresh_token_enc)
      values (${B}::uuid, 'google', 'webmasters.readonly', ${Buffer.from('ciphertext-b')})
    `;
    await admin`
      insert into public.rate_limits (key, window_start, count)
      values (${'cd'.repeat(32)}, now(), 1)
    `;
    await admin`
      insert into public.audit_log (actor, action, target)
      values (${B}::uuid, 'verification', ${B_SITE})
    `;
    await admin`
      insert into public.terms_acceptances (user_id, version)
      values (${B}::uuid, '2026-10')
    `;
    await admin`
      insert into storage.objects (bucket_id, name)
      values ('artifacts', ${`${B}/secret.webp`})
    `;
  }, 300_000);

  afterAll(async () => {
    await admin?.end();
    await unlock?.();
  });

  it('isole toutes les tables publiques par RLS', async () => {
    const open = await admin<{ relname: string }[]>`
      select c.relname
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and not c.relrowsecurity
    `;
    expect(open).toEqual([]);
  });

  it('anon ne reçoit que sites et reports', async () => {
    const grants = await admin<
      { table_name: string; privilege_type: string }[]
    >`
      select table_name, privilege_type
      from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public'
      order by table_name, privilege_type
    `;
    expect(grants).toEqual([
      { table_name: 'reports', privilege_type: 'SELECT' },
      { table_name: 'sites', privilege_type: 'SELECT' },
    ]);
  });

  it('A ne lit rien de B, et lit son propre site', async () => {
    const hidden = await asUser(
      A,
      (tx) => tx`
      select
        (select count(*) from public.profiles where id = ${B}::uuid) as profiles,
        (select count(*) from public.sites where id = ${B_SITE}::uuid) as sites,
        (select count(*) from public.site_verifications where site_id = ${B_SITE}::uuid) as verifications,
        (select count(*) from public.audits where id = ${B_AUDIT}::uuid) as audits,
        (select count(*) from public.domain_scores where audit_id = ${B_AUDIT}::uuid) as scores,
        (select count(*) from public.findings where audit_id = ${B_AUDIT}::uuid) as findings,
        (select count(*) from public.artifacts where audit_id = ${B_AUDIT}::uuid) as artifacts,
        (select count(*) from public.reports where audit_id = ${B_AUDIT}::uuid and visibility = 'private') as reports,
        (select count(*) from public.schedules where site_id = ${B_SITE}::uuid) as schedules,
        (select count(*) from public.uptime_checks where site_id = ${B_SITE}::uuid) as uptime,
        (select count(*) from public.uptime_daily where site_id = ${B_SITE}::uuid) as daily,
        (select count(*) from public.incidents where site_id = ${B_SITE}::uuid) as incidents,
        (select count(*) from public.alerts where user_id = ${B}::uuid) as alerts,
        (select count(*) from public.audit_log where actor = ${B}::uuid) as logs,
        (select count(*) from public.terms_acceptances where user_id = ${B}::uuid) as terms
    `,
    );
    expect(hidden[0]).toEqual({
      profiles: '0',
      sites: '0',
      verifications: '0',
      audits: '0',
      scores: '0',
      findings: '0',
      artifacts: '0',
      reports: '0',
      schedules: '0',
      uptime: '0',
      daily: '0',
      incidents: '0',
      alerts: '0',
      logs: '0',
      terms: '0',
    });

    const own = await asUser(
      A,
      (tx) => tx`
      select id from public.sites where id = ${A_SITE}::uuid
    `,
    );
    expect(own).toHaveLength(1);

    const pub = await asUser(
      A,
      (tx) => tx`
      select id from public.sites where id = ${B_PUBLIC}::uuid
    `,
    );
    expect(pub).toHaveLength(1);
  });

  it("A n'écrit rien chez B", async () => {
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.sites (owner_id, url, scope, host, hosting)
      values (${B}::uuid, 'https://vole.example.com', 'origin', 'vole.example.com', 'other')
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.site_verifications (site_id, method, token, status)
      values (${B_SITE}::uuid, 'file', ${'c'.repeat(32)}, 'pending')
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.audits (site_id, trigger, mode, status, method_version, engine_version)
      values (${B_SITE}::uuid, 'manual', 'passive', 'queued', '2026.1', 'test')
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.findings (
        audit_id, domain, check_id, status, severity, impact, message_key
      ) values (
        ${B_AUDIT}::uuid, 'seo', 'seo.title', 'fail', 1, 1, 'finding.seo.title'
      )
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.schedules (site_id, cadence, next_run_at)
      values (${B_SITE}::uuid, 'monthly', now())
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.alerts (user_id, site_id, kind)
      values (${B}::uuid, ${B_SITE}::uuid, 'other')
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.terms_acceptances (user_id, version)
      values (${B}::uuid, '2026-11')
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.oauth_tokens (user_id, provider, refresh_token_enc)
      values (${A}::uuid, 'google', '\\x00'::bytea)
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.rate_limits (key, window_start, count)
      values (${'ab'.repeat(32)}, now(), 1)
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.audit_log (actor, action) values (${A}::uuid, 'forge')
    `,
    );

    const updated = await asUser(
      A,
      (tx) => tx`
      update public.sites set label = 'piraté' where id = ${B_PUBLIC}::uuid returning id
    `,
    );
    expect(updated).toHaveLength(0);
    const [label] = await admin<{ label: string }[]>`
      select label from public.sites where id = ${B_PUBLIC}::uuid
    `;
    expect(label?.label).toBe('Public B');

    await expectDenied(
      A,
      (tx) => tx`
      update public.sites set owner_id = ${B}::uuid where id = ${A_SITE}::uuid
    `,
    );

    await expectDenied(
      A,
      (tx) => tx`
      update public.audits set status = 'done' where id = ${A_AUDIT}::uuid
    `,
    );
    await expectDenied(
      A,
      (tx) => tx`
      delete from public.sites where id = ${A_SITE}::uuid
    `,
    );
  });

  it('refuse un audit actif sans vérification fraîche', async () => {
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.audits (site_id, trigger, mode, status, method_version, engine_version)
      values (${A_SITE}::uuid, 'manual', 'active', 'queued', '2026.1', 'test')
    `,
    );

    const passive = await asUser(
      A,
      (tx) => tx`
      insert into public.audits (site_id, trigger, mode, status, method_version, engine_version)
      values (${A_SITE}::uuid, 'manual', 'passive', 'queued', '2026.1', 'test')
      returning id
    `,
    );
    expect(passive).toHaveLength(1);

    await expectDenied(
      A,
      (tx) => tx`
      insert into public.audits (
        site_id, trigger, mode, status, method_version, engine_version, global_score
      ) values (
        ${A_SITE}::uuid, 'manual', 'passive', 'queued', '2026.1', 'test', 100
      )
    `,
    );

    await admin`
      insert into public.site_verifications (
        site_id, method, token, status, verified_at, last_checked_at
      ) values (
        ${A_SITE}::uuid, 'meta', ${'d'.repeat(32)}, 'verified', now(), now()
      )
    `;
    const active = await asUser(
      A,
      (tx) => tx`
      insert into public.audits (site_id, trigger, mode, status, method_version, engine_version)
      values (${A_SITE}::uuid, 'manual', 'active', 'queued', '2026.1', 'test')
      returning id
    `,
    );
    expect(active).toHaveLength(1);

    await admin`
      update public.site_verifications
      set last_checked_at = now() - interval '11 minutes'
      where site_id = ${A_SITE}::uuid and status = 'verified'
    `;
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.audits (site_id, trigger, mode, status, method_version, engine_version)
      values (${A_SITE}::uuid, 'manual', 'active', 'queued', '2026.1', 'test')
    `,
    );

    const pending = await asUser(
      A,
      (tx) => tx`
      insert into public.site_verifications (site_id, method, token, status)
      values (${A_SITE}::uuid, 'file', ${'e'.repeat(32)}, 'pending')
      returning id
    `,
    );
    expect(pending).toHaveLength(1);
    await expectDenied(
      A,
      (tx) => tx`
      insert into public.site_verifications (site_id, method, token, status, verified_at)
      values (${A_SITE}::uuid, 'dns_txt', ${'f'.repeat(32)}, 'verified', now())
    `,
    );
  });

  it('anon ne lit que les sites publics et les rapports public valides', async () => {
    const sites = await asUser(
      null,
      (tx) => tx<{ id: string }[]>`
      select id::text as id from public.sites order by id
    `,
    );
    expect(sites.map((row) => row.id)).toEqual([B_PUBLIC]);

    const reports = await asUser(
      null,
      (tx) => tx<{ visibility: string }[]>`
      select visibility from public.reports order by visibility
    `,
    );
    expect(reports.map((row) => row.visibility)).toEqual(['public']);

    const linkRows = await asUser(
      null,
      (tx) => tx`
      select id from public.reports where visibility = 'link'
    `,
    );
    expect(linkRows).toHaveLength(0);

    const viaToken = await asUser(
      null,
      (tx) => tx<{ id: string }[]>`
      select id::text as id from public.read_report_by_share_token(${linkToken})
    `,
    );
    expect(viaToken).toHaveLength(1);

    const wrong = await asUser(
      null,
      (tx) => tx`
      select id from public.read_report_by_share_token(${'0'.repeat(32)})
    `,
    );
    expect(wrong).toHaveLength(0);

    await expectDenied(null, (tx) => tx`select id from public.findings`);

    const objects = await asUser(
      null,
      (tx) => tx`
      select id from storage.objects where bucket_id = 'artifacts'
    `,
    );
    expect(objects).toHaveLength(0);
  });

  it('masque le détail sécurité et révoque le lien tout de suite', async () => {
    const auditId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb20';
    const secret = 'secret-header-value';
    await admin`
      insert into public.audits (
        id, site_id, trigger, mode, status, method_version, engine_version,
        global_score, coverage, started_at, finished_at
      ) values (
        ${auditId}::uuid, ${B_PUBLIC}::uuid, 'manual', 'passive', 'done',
        '2026.1', 'test', 72, 1, now(), now()
      )
    `;
    await admin`
      insert into public.domain_scores (audit_id, domain, score, coverage, level)
      values
        (${auditId}::uuid, 'securite', 40, 1, 'problem'),
        (${auditId}::uuid, 'performance', 80, 1, 'good')
    `;
    await admin`
      insert into public.findings (
        audit_id, domain, check_id, status, severity, impact, score,
        measured, message_key
      ) values (
        ${auditId}::uuid, 'securite', 'securite.hsts', 'fail', 4, 3, 0,
        ${JSON.stringify({ header: secret })}::jsonb, 'finding.securite.hsts'
      )
    `;

    const hidden = await asUser(
      null,
      (tx) => tx<{ body: string; details: string }[]>`
        select
          row_to_json(x)::text as body,
          x.security_details::text as details
        from public.read_public_score('public-b1') as x
      `,
    );
    expect(hidden).toHaveLength(1);
    expect(hidden[0]?.details).toBe('[]');
    expect(hidden[0]?.body).not.toContain(secret);
    expect(hidden[0]?.body).not.toContain('securite.hsts');
    expect(hidden[0]?.body).toContain('72');

    const anon = createUserClient({
      url: local.apiUrl,
      anonKey: local.anonKey,
    });
    const viaClient = await readPublicScore(anon, 'public-b1');
    expect(viaClient?.global_score).toBe(72);
    expect(JSON.stringify(viaClient)).not.toContain(secret);
    expect(JSON.stringify(viaClient?.security_details)).toBe('[]');

    await asUser(
      B,
      (tx) => tx`
        update public.sites
        set expose_security = true
        where id = ${B_PUBLIC}::uuid
      `,
    );
    const shown = await asUser(
      null,
      (tx) => tx<{ body: string; details: string }[]>`
        select
          row_to_json(x)::text as body,
          x.security_details::text as details
        from public.read_public_score('public-b1') as x
      `,
    );
    expect(shown[0]?.details).toContain('securite.hsts');
    expect(shown[0]?.body).not.toContain(secret);
    expect(shown[0]?.body).not.toContain('measured');

    await admin`
      update public.sites
      set expose_security = false
      where id = ${B_PUBLIC}::uuid
    `;

    await admin`
      insert into public.reports (audit_id, visibility, manifest_sha256)
      values (${auditId}::uuid, 'link', ${SHA})
    `;
    const [created] = await admin<{ share_token: string; id: string }[]>`
      select id::text as id, share_token
      from public.reports
      where audit_id = ${auditId}::uuid and visibility = 'link' and revoked_at is null
    `;
    if (!created) throw new Error('lien absent');
    const token = created.share_token;
    expect(token).toMatch(/^[0-9a-f]{32}$/);

    const open = await readSharedScore(anon, token);
    expect(open?.audit_id).toBe(auditId);
    expect(JSON.stringify(open)).not.toContain(secret);

    await asUser(
      B,
      (tx) => tx`
        update public.reports
        set revoked_at = now()
        where id = ${created.id}::uuid
      `,
    );
    const closed = await asUser(
      null,
      (tx) => tx`
        select audit_id from public.read_shared_score(${token})
      `,
    );
    expect(closed).toHaveLength(0);
    expect(await readSharedScore(anon, token)).toBeNull();

    const gone = await asUser(
      null,
      (tx) => tx`select site_label from public.read_public_score('public-b2')`,
    );
    expect(gone).toHaveLength(0);
  });

  it("le jeton OAuth n'est pas lisible", async () => {
    await expectDenied(
      B,
      (tx) => tx`
      select refresh_token_enc from public.oauth_tokens where user_id = ${B}::uuid
    `,
    );
    await admin`
      insert into public.oauth_tokens (user_id, provider, scope, refresh_token_enc)
      values (${A}::uuid, 'google', 'webmasters.readonly', ${Buffer.from('ciphertext-a')})
    `;
    const listed = await asUser(
      A,
      (tx) => tx<{ provider: string; scope: string }[]>`
      select provider, scope from public.list_my_oauth_connections()
    `,
    );
    expect(listed).toEqual([
      { provider: 'google', scope: 'webmasters.readonly' },
    ]);
    const columns = Object.keys(listed[0] ?? {});
    expect(columns).not.toContain('refresh_token_enc');
  });

  it('dédoublonne les alertes non envoyées', async () => {
    await expect(
      admin`
        insert into public.alerts (user_id, site_id, kind)
        values (${B}::uuid, ${B_SITE}::uuid, 'score_drop')
      `,
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('claim_next_audit est concurrente et réservée au service_role', async () => {
    await expectDenied(
      null,
      (tx) => tx`select id from public.claim_next_audit()`,
    );
    await expectDenied(A, (tx) => tx`select id from public.claim_next_audit()`);

    await admin`delete from public.audits where status = 'queued'`;
    await admin`
      insert into public.audits (
        site_id, trigger, mode, status, method_version, engine_version
      )
      select ${A_SITE}::uuid, 'manual', 'passive', 'queued', '2026.1', 'test'
      from generate_series(1, 2)
    `;

    const left = postgres(local.dbUrl, { max: 1, prepare: false });
    const right = postgres(local.dbUrl, { max: 1, prepare: false });
    try {
      await right`set statement_timeout = '3s'`;
      const held = await left.begin(async (tx) => {
        const first = await tx<{ id: string }[]>`
          select id::text as id from public.claim_next_audit()
        `;
        const second = await right<{ id: string }[]>`
          select id::text as id from public.claim_next_audit()
        `;
        return { first: first[0]?.id, second: second[0]?.id };
      });
      expect(held.first).toBeTruthy();
      expect(held.second).toBeTruthy();
      expect(held.first).not.toBe(held.second);
    } finally {
      await left.end();
      await right.end();
    }

    await admin`delete from public.audits where status in ('queued', 'running')`;
    await admin`
      insert into public.audits (
        site_id, trigger, mode, status, method_version, engine_version
      )
      select ${A_SITE}::uuid, 'schedule', 'passive', 'queued', '2026.1', 'test'
      from generate_series(1, 8)
    `;
    const claimed = await Promise.all(
      Array.from({ length: 8 }, async () => {
        const client = postgres(local.dbUrl, { max: 1, prepare: false });
        try {
          const rows = await client<{ id: string }[]>`
            select id::text as id from public.claim_next_audit()
          `;
          return rows[0]?.id;
        } finally {
          await client.end();
        }
      }),
    );
    const ids = claimed.filter((id): id is string => Boolean(id));
    expect(new Set(ids).size).toBe(8);

    const empty = await admin`select id from public.claim_next_audit()`;
    expect(empty).toHaveLength(0);

    await admin`
      insert into public.audits (
        site_id, trigger, mode, status, method_version, engine_version
      ) values (
        ${A_SITE}::uuid, 'manual', 'passive', 'queued', '2026.1', 'test'
      )
    `;
    const service = await admin.begin(async (tx) => {
      await tx.unsafe('set local role service_role');
      return tx<{ status: string }[]>`
        select status from public.claim_next_audit()
      `;
    });
    expect(service.map((row) => row.status)).toEqual(['running']);
  });

  it('le client typé respecte anon, le jeton et la file', async () => {
    const anon = createUserClient({
      url: local.apiUrl,
      anonKey: local.anonKey,
    });
    const { data: publicSites } = await anon
      .from('sites')
      .select('id')
      .eq('is_public', true);
    expect(publicSites?.map((row) => row.id).sort()).toEqual([B_PUBLIC]);

    const shared = await readReportByShareToken(anon, linkToken);
    expect(shared?.visibility).toBe('link');
    expect(shared).not.toHaveProperty('share_token');

    await expect(claimNextAudit(anon)).rejects.toThrow('claim_failed');

    const service = createServiceClient({
      url: local.apiUrl,
      serviceRoleKey: local.serviceRoleKey,
    });
    await admin`
      insert into public.audits (
        site_id, trigger, mode, status, method_version, engine_version
      ) values (
        ${A_SITE}::uuid, 'manual', 'passive', 'queued', '2026.1', 'api'
      )
    `;
    const claimed = await claimNextAudit(service);
    expect(claimed?.status).toBe('running');
    expect(claimed?.engine_version).toBe('api');
  });

  it('connecte par lien magique et crée le profil', async () => {
    const email = `lien-${Date.now()}@example.com`;
    const client = createUserClient({
      url: local.apiUrl,
      anonKey: local.anonKey,
    });
    const sent = await requestMagicLink(client, {
      email,
      redirectTo: 'http://127.0.0.1:8888',
    });
    expect(sent).toEqual({ ok: true });

    let snippet = '';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const res = await fetch(`${local.mailpitUrl}/api/v1/messages`);
      const body = (await res.json()) as {
        messages: {
          To: { Address: string }[];
          Snippet: string;
          Subject: string;
        }[];
      };
      const hit = body.messages.find((message) =>
        message.To.some((to) => to.Address === email),
      );
      if (hit) {
        expect(hit.Subject).toBe('Votre lien de connexion Audigy');
        snippet = hit.Snippet;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const token = /Code : (\d{8})/.exec(snippet)?.[1];
    expect(token).toMatch(/^\d{8}$/);

    const { data, error } = await client.auth.verifyOtp({
      email,
      token: token ?? '',
      type: 'email',
    });
    expect(error).toBeNull();
    expect(data.user?.email).toBe(email);

    const userId = data.user?.id;
    if (!userId) throw new Error('session absente');
    const [profile] = await admin<{ locale: string; weekly_digest: boolean }[]>`
      select locale, weekly_digest from public.profiles where id = ${userId}::uuid
    `;
    expect(profile).toEqual({ locale: 'fr', weekly_digest: false });

    const { data: foreign } = await client
      .from('sites')
      .select('id')
      .eq('id', B_SITE);
    expect(foreign).toEqual([]);

    const { data: visible } = await client
      .from('sites')
      .select('id')
      .eq('id', B_PUBLIC);
    expect(visible).toEqual([{ id: B_PUBLIC }]);
  });
});
