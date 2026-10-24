-- Orchestration des audits (PART-15).
-- request_audit : création atomique. Double clic = le même audit. Limites :
--   10 audits par jour (Europe/Paris) et par utilisateur ; 1 audit par hôte et 15 min.
--   Clés de rate_limits = SHA-256 ; ni hôte ni identifiant en clair.
-- write_audit_results : remplace constats et scores d'un audit en une transaction.
-- fail_stale_audits : un audit resté en cours au-delà du délai devient « failed ».
-- Toutes ces fonctions : service_role seulement.

alter table public.findings add column reason text;

alter table public.findings
  add constraint findings_reason check (
    reason is null or reason ~ '^[a-z0-9_.]{1,120}$'
  );

alter table public.audits
  add constraint audits_error_form check (
    error is null or error ~ '^[a-z0-9_]{1,64}$'
  );

create or replace function private.rate_key(p_scope text, p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest('audigy:' || p_scope || ':' || p_value, 'sha256'), 'hex');
$$;

create or replace function public.request_audit(
  p_user_id uuid,
  p_site_id uuid,
  p_mode text,
  p_trigger text,
  p_method_version text,
  p_engine_version text,
  p_user_daily_limit integer default 10,
  p_host_interval interval default interval '15 minutes'
)
returns table (audit_id uuid, outcome text, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_host text;
  v_user_key text;
  v_host_key text;
  v_day timestamptz;
  v_existing uuid;
  v_last timestamptz;
  v_count integer;
  v_id uuid;
begin
  if p_mode not in ('passive', 'active') or p_trigger not in ('manual', 'schedule') then
    raise exception 'invalid_request' using errcode = '22023';
  end if;

  select s.host into v_host
  from public.sites as s
  where s.id = p_site_id
    and s.owner_id = p_user_id
    and s.deleted_at is null;
  if v_host is null then
    return query select null::uuid, 'site_not_found'::text, null::integer;
    return;
  end if;

  v_user_key := private.rate_key('audits-user', p_user_id::text);
  v_host_key := private.rate_key('audits-host', v_host);

  -- Toujours utilisateur puis hôte : pas d'interblocage entre deux demandes.
  perform pg_advisory_xact_lock(hashtextextended(v_user_key, 0));
  perform pg_advisory_xact_lock(hashtextextended(v_host_key, 0));

  select a.id into v_existing
  from public.audits as a
  where a.site_id = p_site_id
    and a.mode = p_mode
    and a.created_at > now() - p_host_interval
  order by a.created_at desc, a.id desc
  limit 1;
  if v_existing is not null then
    return query select v_existing, 'existing'::text, null::integer;
    return;
  end if;

  select max(r.window_start) into v_last
  from public.rate_limits as r
  where r.key = v_host_key
    and r.window_start > now() - p_host_interval;
  if v_last is not null then
    return query select
      null::uuid,
      'host_limit'::text,
      greatest(1, ceil(extract(epoch from (v_last + p_host_interval - now()))))::integer;
    return;
  end if;

  v_day := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  select coalesce(sum(r.count), 0) into v_count
  from public.rate_limits as r
  where r.key = v_user_key
    and r.window_start = v_day;
  if v_count >= p_user_daily_limit then
    return query select
      null::uuid,
      'user_limit'::text,
      greatest(1, ceil(extract(epoch from (v_day + interval '1 day' - now()))))::integer;
    return;
  end if;

  if p_mode = 'active' and not exists (
    select 1
    from public.site_verifications as v
    where v.site_id = p_site_id
      and v.status = 'verified'
      and v.last_checked_at > now() - interval '10 minutes'
  ) then
    return query select null::uuid, 'unverified'::text, null::integer;
    return;
  end if;

  insert into public.audits (site_id, trigger, mode, status, method_version, engine_version)
  values (p_site_id, p_trigger, p_mode, 'queued', p_method_version, p_engine_version)
  returning id into v_id;

  insert into public.rate_limits (key, window_start, count)
  values (v_host_key, now(), 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1;

  insert into public.rate_limits (key, window_start, count)
  values (v_user_key, v_day, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1;

  delete from public.rate_limits as r
  where r.window_start < now() - interval '2 days';

  return query select v_id, 'created'::text, null::integer;
end;
$$;

create or replace function public.write_audit_results(
  p_audit_id uuid,
  p_status text,
  p_global_score integer,
  p_coverage double precision,
  p_domain_scores jsonb,
  p_findings jsonb,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_status not in ('partial', 'done', 'failed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  select a.status into v_status
  from public.audits as a
  where a.id = p_audit_id
  for update;
  if v_status is null then
    raise exception 'audit_not_found' using errcode = 'P0002';
  end if;
  if v_status not in ('running', 'partial') then
    raise exception 'audit_not_running' using errcode = '55000';
  end if;

  delete from public.findings as f where f.audit_id = p_audit_id;
  delete from public.domain_scores as d where d.audit_id = p_audit_id;

  insert into public.domain_scores (audit_id, domain, score, coverage, level)
  select p_audit_id, d.domain, d.score, d.coverage, d.level
  from jsonb_to_recordset(coalesce(p_domain_scores, '[]'::jsonb)) as d (
    domain text,
    score integer,
    coverage double precision,
    level text
  );

  insert into public.findings (
    audit_id, domain, check_id, status, severity, impact, score,
    measured, message_key, params, fix_key, effort_minutes, reason
  )
  select
    p_audit_id, f.domain, f.check_id, f.status, f.severity, f.impact, f.score,
    coalesce(f.measured, '{}'::jsonb), f.message_key, coalesce(f.params, '{}'::jsonb),
    f.fix_key, f.effort_minutes, f.reason
  from jsonb_to_recordset(coalesce(p_findings, '[]'::jsonb)) as f (
    domain text,
    check_id text,
    status text,
    severity smallint,
    impact smallint,
    score double precision,
    measured jsonb,
    message_key text,
    params jsonb,
    fix_key text,
    effort_minutes integer,
    reason text
  );

  update public.audits as a
  set
    status = p_status,
    global_score = p_global_score,
    coverage = p_coverage,
    error = p_error,
    finished_at = case when p_status = 'partial' then null else now() end
  where a.id = p_audit_id;
end;
$$;

create or replace function public.fail_stale_audits(p_older_than interval)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.audits as a
  set status = 'failed', error = 'stale', finished_at = now()
  where a.status in ('running', 'partial')
    and a.started_at < now() - p_older_than;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.rate_key(text, text) from public, anon, authenticated;
revoke all on function public.request_audit(uuid, uuid, text, text, text, text, integer, interval)
  from public, anon, authenticated;
revoke all on function public.write_audit_results(uuid, text, integer, double precision, jsonb, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.fail_stale_audits(interval) from public, anon, authenticated;

grant execute on function private.rate_key(text, text) to service_role;
grant execute on function public.request_audit(uuid, uuid, text, text, text, text, integer, interval)
  to service_role;
grant execute on function public.write_audit_results(uuid, text, integer, double precision, jsonb, jsonb, text)
  to service_role;
grant execute on function public.fail_stale_audits(interval) to service_role;
