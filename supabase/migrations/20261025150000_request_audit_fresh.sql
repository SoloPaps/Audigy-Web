-- Relancer un audit : seul un audit en cours (queued, running, partial) est
-- réutilisé (double clic). Un audit terminé depuis moins de 15 min ne doit plus
-- être rendu comme « existant » : le parcours ouvrait l'ancien rapport.
-- Il tombe dans la limite par hôte (host_limit), avec un message clair.
-- Même signature, mêmes droits : create or replace conserve les grants.

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
    and a.status in ('queued', 'running', 'partial')
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
