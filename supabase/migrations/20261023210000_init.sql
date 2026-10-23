-- Schéma Audigy (PLAN §8). RLS sur chaque table.
-- anon : rapports public non révoqués, et sites is_public non supprimés.
-- Un rapport link n'est lisible qu'avec son jeton (128 bits), via read_report_by_share_token.
-- Les findings, artefacts et jetons OAuth ne sont jamais lisibles par anon.
-- claim_next_audit : file FOR UPDATE SKIP LOCKED, exécutable par service_role seulement.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  locale text not null default 'fr' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  weekly_digest boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Sites
-- ---------------------------------------------------------------------------

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  url text not null,
  scope text not null,
  host text not null,
  path_prefix text,
  label text not null default '',
  hosting text not null,
  public_slug text,
  is_public boolean not null default false,
  deleted_at timestamptz,
  constraint sites_url_https check (url ~ '^https://[^[:space:]]+$'),
  constraint sites_host_in_url check (position(host in url) > 0),
  constraint sites_host_form check (host = lower(host) and host !~ '[:/[:space:]]'),
  constraint sites_scope check (scope in ('origin', 'path')),
  constraint sites_path check (
    (scope = 'origin' and path_prefix is null)
    or (scope = 'path' and path_prefix ~ '^/[^[:space:]]+/$')
  ),
  constraint sites_hosting check (hosting in ('netlify', 'github_pages', 'other')),
  constraint sites_slug_form check (
    public_slug is null or public_slug ~ '^[a-z0-9-]{8,64}$'
  ),
  constraint sites_public_has_slug check (not is_public or public_slug is not null)
);

create unique index sites_owner_url_active_idx
  on public.sites (owner_id, url)
  where deleted_at is null;

create unique index sites_public_slug_idx
  on public.sites (public_slug)
  where public_slug is not null;

create index sites_owner_idx on public.sites (owner_id);

-- ---------------------------------------------------------------------------
-- Vérification de propriété
-- ---------------------------------------------------------------------------

create table public.site_verifications (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  method text not null,
  token text not null,
  status text not null,
  verified_at timestamptz,
  last_checked_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  constraint site_verifications_method check (method in ('dns_txt', 'file', 'meta')),
  constraint site_verifications_status check (
    status in ('pending', 'verified', 'failed', 'expired')
  ),
  constraint site_verifications_token check (token ~ '^[A-Za-z0-9_-]{32,128}$')
);

create index site_verifications_site_idx
  on public.site_verifications (site_id, status);

-- ---------------------------------------------------------------------------
-- Audits et file d'attente
-- ---------------------------------------------------------------------------

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  trigger text not null,
  mode text not null,
  status text not null,
  method_version text not null,
  engine_version text not null,
  global_score integer,
  coverage double precision,
  -- Ordre de la file. Absent du tableau §8, requis par SKIP LOCKED.
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  constraint audits_trigger check (trigger in ('manual', 'schedule')),
  constraint audits_mode check (mode in ('passive', 'active')),
  constraint audits_status check (
    status in ('queued', 'running', 'partial', 'done', 'failed')
  ),
  constraint audits_global_score check (
    global_score is null or global_score between 0 and 100
  ),
  constraint audits_coverage check (
    coverage is null or (coverage >= 0 and coverage <= 1)
  ),
  constraint audits_queued_clean check (
    status <> 'queued'
    or (
      started_at is null
      and finished_at is null
      and global_score is null
      and error is null
    )
  )
);

create index audits_site_idx on public.audits (site_id);
create index audits_queue_idx
  on public.audits (created_at, id)
  where status = 'queued';

-- ---------------------------------------------------------------------------
-- Scores, constats, artefacts, rapports
-- ---------------------------------------------------------------------------

create table public.domain_scores (
  audit_id uuid not null references public.audits (id) on delete cascade,
  domain text not null,
  score integer,
  coverage double precision not null,
  level text not null,
  primary key (audit_id, domain),
  constraint domain_scores_domain check (
    domain in (
      'performance', 'seo', 'securite', 'ecologie', 'accessibilite',
      'qualite', 'vie_privee', 'dns_email', 'reputation', 'disponibilite'
    )
  ),
  constraint domain_scores_score check (score is null or score between 0 and 100),
  constraint domain_scores_coverage check (coverage >= 0 and coverage <= 1),
  -- Niveaux de packages/engine (Level). Couverture < 50 % : pas de chiffre.
  constraint domain_scores_level check (
    (coverage < 0.5 and score is null and level = 'untested')
    or (
      coverage >= 0.5
      and (
        (score is null and level = 'untested')
        or (score >= 80 and level = 'good')
        or (score >= 50 and score < 80 and level = 'improve')
        or (score < 50 and level = 'problem')
      )
    )
  )
);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  domain text not null,
  check_id text not null,
  status text not null,
  severity smallint not null,
  impact smallint not null,
  score double precision,
  measured jsonb not null default '{}'::jsonb,
  message_key text not null,
  params jsonb not null default '{}'::jsonb,
  fix_key text,
  effort_minutes integer,
  constraint findings_domain check (
    domain in (
      'performance', 'seo', 'securite', 'ecologie', 'accessibilite',
      'qualite', 'vie_privee', 'dns_email', 'reputation', 'disponibilite'
    )
  ),
  constraint findings_status check (
    status in ('pass', 'warn', 'fail', 'untested', 'na')
  ),
  constraint findings_severity check (severity between 1 and 4),
  constraint findings_impact check (impact between 1 and 3),
  constraint findings_score check (score is null or (score >= 0 and score <= 1)),
  constraint findings_effort check (effort_minutes is null or effort_minutes >= 0)
);

create index findings_audit_idx on public.findings (audit_id);

create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  kind text not null,
  storage_path text not null,
  sha256 text not null,
  bytes integer not null,
  constraint artifacts_kind check (
    kind in ('json', 'pdf', 'screenshot', 'warc', 'tsr', 'sig')
  ),
  constraint artifacts_sha256 check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint artifacts_bytes check (bytes >= 0)
);

create index artifacts_audit_idx on public.artifacts (audit_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  share_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  visibility text not null default 'private',
  manifest_sha256 text,
  tsa text,
  tsa_gen_time timestamptz,
  signature text,
  revoked_at timestamptz,
  constraint reports_visibility check (visibility in ('private', 'link', 'public')),
  constraint reports_share_token check (share_token ~ '^[0-9a-f]{32}$'),
  constraint reports_manifest check (
    manifest_sha256 is null or manifest_sha256 ~ '^[0-9a-f]{64}$'
  )
);

create index reports_audit_idx on public.reports (audit_id);

-- Un passage en link régénère le jeton (un ancien jeton public ne reste pas valable).
create or replace function private.rotate_link_token()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility = 'link'
     and (tg_op = 'INSERT' or old.visibility is distinct from 'link') then
    new.share_token := encode(extensions.gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

create trigger reports_rotate_link_token
  before insert or update on public.reports
  for each row
  execute function private.rotate_link_token();

-- ---------------------------------------------------------------------------
-- Suivi
-- ---------------------------------------------------------------------------

create table public.schedules (
  site_id uuid primary key references public.sites (id) on delete cascade,
  cadence text not null,
  next_run_at timestamptz not null,
  enabled boolean not null default true,
  mode text not null default 'passive',
  constraint schedules_cadence check (cadence in ('weekly', 'monthly')),
  constraint schedules_mode check (mode in ('passive', 'active'))
);

create table public.uptime_checks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  checked_at timestamptz not null default now(),
  ok boolean not null,
  status_code integer,
  ms integer,
  constraint uptime_checks_ms check (ms is null or ms >= 0)
);

create index uptime_checks_site_idx
  on public.uptime_checks (site_id, checked_at desc);

create table public.uptime_daily (
  site_id uuid not null references public.sites (id) on delete cascade,
  day date not null,
  checks integer not null,
  failures integer not null,
  p50_ms integer,
  primary key (site_id, day),
  constraint uptime_daily_counts check (
    checks >= 0 and failures >= 0 and failures <= checks
  ),
  constraint uptime_daily_p50 check (p50_ms is null or p50_ms >= 0)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  started_at timestamptz not null,
  resolved_at timestamptz,
  cause text,
  constraint incidents_resolved check (
    resolved_at is null or resolved_at >= started_at
  )
);

create index incidents_site_idx on public.incidents (site_id, started_at desc);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz
);

-- Une seule alerte non envoyée par utilisateur, site et type.
create unique index alerts_unsent_dedup
  on public.alerts (user_id, site_id, kind)
  where sent_at is null;

create index alerts_user_idx on public.alerts (user_id, sent_at);

-- Chiffre AES-256-GCM. La clé reste hors de la base (TOKEN_ENC_KEY, §9).
create table public.oauth_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  scope text not null default '',
  refresh_token_enc bytea not null,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);

-- key = empreinte (IP + sel du jour). Jamais l'adresse en clair.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null,
  primary key (key, window_start),
  constraint rate_limits_count check (count >= 0),
  constraint rate_limits_key check (key ~ '^[0-9a-f]{64}$')
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid references public.profiles (id) on delete set null,
  action text not null,
  target text,
  at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index audit_log_actor_idx on public.audit_log (actor, at desc);

create table public.terms_acceptances (
  user_id uuid not null references public.profiles (id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);

-- ---------------------------------------------------------------------------
-- Aides d'appartenance (hors API : schéma private)
-- ---------------------------------------------------------------------------

create or replace function private.owns_site(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sites as s
    where s.id = p_site_id
      and s.owner_id = (select auth.uid())
  );
$$;

create or replace function private.owns_audit(p_audit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audits as a
    join public.sites as s on s.id = a.site_id
    where a.id = p_audit_id
      and s.owner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- File d'attente et lectures publiques ciblées
-- ---------------------------------------------------------------------------

create or replace function public.claim_next_audit()
returns setof public.audits
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with next_job as (
    select a.id
    from public.audits as a
    where a.status = 'queued'
    order by a.created_at, a.id
    for update skip locked
    limit 1
  )
  update public.audits as a
  set
    status = 'running',
    started_at = now()
  where a.id = (select next_job.id from next_job)
  returning a.*;
end;
$$;

create or replace function public.read_report_by_share_token(p_token text)
returns table (
  id uuid,
  audit_id uuid,
  visibility text,
  manifest_sha256 text,
  tsa text,
  tsa_gen_time timestamptz,
  signature text,
  revoked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.audit_id,
    r.visibility,
    r.manifest_sha256,
    r.tsa,
    r.tsa_gen_time,
    r.signature,
    r.revoked_at
  from public.reports as r
  where r.visibility = 'link'
    and r.revoked_at is null
    and p_token ~ '^[0-9a-f]{32}$'
    and r.share_token = p_token;
$$;

create or replace function public.list_my_oauth_connections()
returns table (
  provider text,
  scope text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.provider, t.scope, t.created_at
  from public.oauth_tokens as t
  where t.user_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Droits. RLS ensuite. anon ne reçoit que sites et reports.
-- oauth_tokens et rate_limits : aucun droit pour anon ni authenticated.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant all on all tables in schema public to service_role;
grant execute on function public.claim_next_audit() to service_role;
grant execute on function public.read_report_by_share_token(text) to anon, authenticated, service_role;
grant execute on function public.list_my_oauth_connections() to authenticated, service_role;

grant execute on function private.owns_site(uuid) to authenticated, service_role;
grant execute on function private.owns_audit(uuid) to authenticated, service_role;

grant select (
  id, display_name, locale, weekly_digest, created_at
) on public.profiles to authenticated;
grant update (
  display_name, locale, weekly_digest
) on public.profiles to authenticated;

grant select, insert, update on public.sites to authenticated;
grant select on public.sites to anon;

grant select, insert on public.site_verifications to authenticated;

grant select, insert on public.audits to authenticated;

grant select on public.domain_scores to authenticated;
grant select on public.findings to authenticated;
grant select on public.artifacts to authenticated;

grant select, insert, update on public.reports to authenticated;
grant select on public.reports to anon;

grant select, insert, update, delete on public.schedules to authenticated;

grant select on public.uptime_checks to authenticated;
grant select on public.uptime_daily to authenticated;
grant select on public.incidents to authenticated;
grant select on public.alerts to authenticated;
grant select on public.audit_log to authenticated;
grant select, insert on public.terms_acceptances to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.site_verifications enable row level security;
alter table public.audits enable row level security;
alter table public.domain_scores enable row level security;
alter table public.findings enable row level security;
alter table public.artifacts enable row level security;
alter table public.reports enable row level security;
alter table public.schedules enable row level security;
alter table public.uptime_checks enable row level security;
alter table public.uptime_daily enable row level security;
alter table public.incidents enable row level security;
alter table public.alerts enable row level security;
alter table public.oauth_tokens enable row level security;
alter table public.rate_limits enable row level security;
alter table public.audit_log enable row level security;
alter table public.terms_acceptances enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy profiles_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy sites_select on public.sites
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (is_public and deleted_at is null)
);

create policy sites_select_anon on public.sites
for select to anon
using (is_public and deleted_at is null);

create policy sites_insert on public.sites
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and deleted_at is null
);

create policy sites_update on public.sites
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy site_verifications_select on public.site_verifications
for select to authenticated
using (private.owns_site(site_id));

-- Le propriétaire prépare un défi. Il ne peut pas se déclarer vérifié.
create policy site_verifications_insert on public.site_verifications
for insert to authenticated
with check (
  private.owns_site(site_id)
  and status = 'pending'
  and verified_at is null
);

create policy audits_select on public.audits
for select to authenticated
using (private.owns_site(site_id));

-- Actif seulement si une vérification est encore fraîche (< 10 min).
create policy audits_insert on public.audits
for insert to authenticated
with check (
  private.owns_site(site_id)
  and status = 'queued'
  and trigger = 'manual'
  and mode in ('passive', 'active')
  and global_score is null
  and coverage is null
  and started_at is null
  and finished_at is null
  and error is null
  and exists (
    select 1
    from public.sites as s
    where s.id = site_id
      and s.deleted_at is null
      and s.owner_id = (select auth.uid())
  )
  and (
    mode = 'passive'
    or exists (
      select 1
      from public.site_verifications as v
      where v.site_id = site_id
        and v.status = 'verified'
        and v.last_checked_at > now() - interval '10 minutes'
    )
  )
);

create policy domain_scores_select on public.domain_scores
for select to authenticated
using (private.owns_audit(audit_id));

create policy findings_select on public.findings
for select to authenticated
using (private.owns_audit(audit_id));

create policy artifacts_select on public.artifacts
for select to authenticated
using (private.owns_audit(audit_id));

create policy reports_select on public.reports
for select to authenticated
using (
  private.owns_audit(audit_id)
  or (visibility = 'public' and revoked_at is null)
);

create policy reports_select_anon on public.reports
for select to anon
using (visibility = 'public' and revoked_at is null);

create policy reports_insert on public.reports
for insert to authenticated
with check (
  private.owns_audit(audit_id)
  and revoked_at is null
);

create policy reports_update on public.reports
for update to authenticated
using (private.owns_audit(audit_id))
with check (
  private.owns_audit(audit_id)
);

create policy schedules_all on public.schedules
for all to authenticated
using (private.owns_site(site_id))
with check (private.owns_site(site_id));

create policy uptime_checks_select on public.uptime_checks
for select to authenticated
using (private.owns_site(site_id));

create policy uptime_daily_select on public.uptime_daily
for select to authenticated
using (private.owns_site(site_id));

create policy incidents_select on public.incidents
for select to authenticated
using (private.owns_site(site_id));

create policy alerts_select on public.alerts
for select to authenticated
using (user_id = (select auth.uid()));

create policy audit_log_select on public.audit_log
for select to authenticated
using (actor = (select auth.uid()));

create policy terms_select on public.terms_acceptances
for select to authenticated
using (user_id = (select auth.uid()));

create policy terms_insert on public.terms_acceptances
for insert to authenticated
with check (user_id = (select auth.uid()));

-- oauth_tokens et rate_limits : RLS sans policy → refus total hors service_role.

-- ---------------------------------------------------------------------------
-- Stockage privé des artefacts.
-- storage.objects appartient au rôle storage : RLS déjà actif, aucune policy
-- publique. Le seau `artifacts` n'est pas public. Les octets passent par
-- service_role. La table public.artifacts porte les métadonnées (RLS propriétaire).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do update set public = false;
