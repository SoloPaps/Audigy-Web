-- PART-22 : désabonnement, incidents ouverts uniques, lectures du planificateur.
-- L'agrégation `uptime_daily` et la purge des 30 jours sont faites par le tick
-- (lots), pas par un trigger : le brut reste interrogeable trente jours.

alter table public.profiles
  add column email_opt_out boolean not null default false;

comment on column public.profiles.email_opt_out is
  'Désabonnement en un clic : plus d’alerte ni de résumé.';

grant select (email_opt_out) on public.profiles to authenticated;
grant update (email_opt_out) on public.profiles to authenticated;

-- Un seul incident ouvert par site (deux ticks concurrents).
create unique index incidents_one_open_idx
  on public.incidents (site_id)
  where resolved_at is null;

-- Sites à sonder, audits dus, deux derniers audits terminés.
create or replace function public.schedule_roster(p_now timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'sites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'ownerId', s.owner_id,
        'url', s.url,
        'label', s.label,
        'host', s.host,
        'emailOptOut', p.email_opt_out,
        'lastOk', lc.ok,
        'lastCheckedAt', lc.checked_at,
        'incidentId', i.id,
        'audits', coalesce((
          select jsonb_agg(q.item order by q.finished_at desc nulls last)
          from (
            select
              a.finished_at,
              jsonb_build_object(
                'id', a.id,
                'score', a.global_score,
                'finishedAt', a.finished_at,
                'graves', coalesce((
                  select jsonb_agg(f.check_id)
                  from public.findings as f
                  where f.audit_id = a.id
                    and f.status = 'fail'
                    and f.severity = 4
                ), '[]'::jsonb),
                'certDays', (
                  select case
                    when coalesce(f.measured ->> 'daysRemaining', '')
                      ~ '^-?[0-9]+([.][0-9]+)?$'
                    then round((f.measured ->> 'daysRemaining')::numeric)::int
                    else null
                  end
                  from public.findings as f
                  where f.audit_id = a.id
                    and f.check_id = 'securite.certificate'
                  limit 1
                ),
                'certUntil', (
                  select left(f.measured ->> 'validTo', 80)
                  from public.findings as f
                  where f.audit_id = a.id
                    and f.check_id = 'securite.certificate'
                  limit 1
                )
              ) as item
            from public.audits as a
            where a.site_id = s.id
              and a.status = 'done'
            order by a.finished_at desc nulls last
            limit 2
          ) as q
        ), '[]'::jsonb)
      ))
      from public.sites as s
      join public.profiles as p on p.id = s.owner_id
      left join lateral (
        select c.ok, c.checked_at
        from public.uptime_checks as c
        where c.site_id = s.id
        order by c.checked_at desc
        limit 1
      ) as lc on true
      left join lateral (
        select inc.id
        from public.incidents as inc
        where inc.site_id = s.id
          and inc.resolved_at is null
        order by inc.started_at desc
        limit 1
      ) as i on true
      where s.deleted_at is null
    ), '[]'::jsonb),
    'due', coalesce((
      select jsonb_agg(jsonb_build_object(
        'siteId', sch.site_id,
        'ownerId', s.owner_id,
        'cadence', sch.cadence,
        'mode', sch.mode,
        'nextRunAt', sch.next_run_at
      ))
      from public.schedules as sch
      join public.sites as s on s.id = sch.site_id
      where sch.enabled
        and sch.next_run_at <= p_now
        and s.deleted_at is null
    ), '[]'::jsonb)
  );
$$;

-- Résumé : abonnés au digest, note, disponibilité 30 j, incident ouvert.
create or replace function public.digest_roster(p_now timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
      'userId', p.id,
      'sites', coalesce((
        select jsonb_agg(jsonb_build_object(
          'label', s.label,
          'host', s.host,
          'score', (
            select a.global_score
            from public.audits as a
            where a.site_id = s.id
              and a.status = 'done'
            order by a.finished_at desc nulls last
            limit 1
          ),
          'checks', coalesce(up.checks, 0),
          'failures', coalesce(up.failures, 0),
          'openIncident', exists (
            select 1
            from public.incidents as i
            where i.site_id = s.id
              and i.resolved_at is null
          )
        ) order by s.host)
        from public.sites as s
        left join lateral (
          select
            count(*)::int as checks,
            count(*) filter (where not c.ok)::int as failures
          from public.uptime_checks as c
          where c.site_id = s.id
            and c.checked_at >= p_now - interval '30 days'
        ) as up on true
        where s.owner_id = p.id
          and s.deleted_at is null
      ), '[]'::jsonb)
    ))
    from public.profiles as p
    where p.weekly_digest
      and not p.email_opt_out
  ), '[]'::jsonb);
$$;

revoke all on function public.schedule_roster(timestamptz)
  from public, anon, authenticated;
revoke all on function public.digest_roster(timestamptz)
  from public, anon, authenticated;
grant execute on function public.schedule_roster(timestamptz) to service_role;
grant execute on function public.digest_roster(timestamptz) to service_role;
