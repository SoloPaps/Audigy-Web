-- Page /score/<slug> et lien /partage/<jeton> (PART-23).
-- Scores, date, méthode. Jamais measured. Le détail sécurité
-- n'est renvoyé que si le propriétaire a coché expose_security.

alter table public.sites
  add column expose_security boolean not null default false;

create or replace function public.read_public_score(p_slug text)
returns table (
  site_label text,
  site_url text,
  audit_id uuid,
  finished_at timestamptz,
  method_version text,
  global_score integer,
  coverage double precision,
  report_id uuid,
  expose_security boolean,
  domains jsonb,
  security_details jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.label,
    s.url,
    a.id,
    a.finished_at,
    a.method_version,
    a.global_score,
    a.coverage,
    r.id,
    s.expose_security,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'domain', d.domain,
          'score', d.score,
          'level', d.level
        )
        order by d.domain
      )
      from public.domain_scores as d
      where d.audit_id = a.id
    ), '[]'::jsonb),
    case
      when s.expose_security and a.id is not null then coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'check_id', f.check_id,
            'status', f.status,
            'message_key', f.message_key
          )
          order by f.check_id
        )
        from public.findings as f
        where f.audit_id = a.id
          and f.domain = 'securite'
      ), '[]'::jsonb)
      else '[]'::jsonb
    end
  from public.sites as s
  left join lateral (
    select
      au.id,
      au.finished_at,
      au.method_version,
      au.global_score,
      au.coverage
    from public.audits as au
    where au.site_id = s.id
      and au.status in ('done', 'partial')
      and au.finished_at is not null
    order by au.finished_at desc, au.id desc
    limit 1
  ) as a on true
  left join lateral (
    select rep.id
    from public.reports as rep
    where rep.audit_id = a.id
      and rep.revoked_at is null
      and rep.visibility in ('public', 'link')
    order by rep.visibility desc, rep.id
    limit 1
  ) as r on true
  where s.is_public
    and s.deleted_at is null
    and p_slug ~ '^[a-z0-9-]{8,64}$'
    and s.public_slug = p_slug;
$$;

create or replace function public.read_shared_score(p_token text)
returns table (
  site_label text,
  site_url text,
  audit_id uuid,
  finished_at timestamptz,
  method_version text,
  global_score integer,
  coverage double precision,
  report_id uuid,
  expose_security boolean,
  domains jsonb,
  security_details jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.label,
    s.url,
    a.id,
    a.finished_at,
    a.method_version,
    a.global_score,
    a.coverage,
    r.id,
    s.expose_security,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'domain', d.domain,
          'score', d.score,
          'level', d.level
        )
        order by d.domain
      )
      from public.domain_scores as d
      where d.audit_id = a.id
    ), '[]'::jsonb),
    case
      when s.expose_security then coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'check_id', f.check_id,
            'status', f.status,
            'message_key', f.message_key
          )
          order by f.check_id
        )
        from public.findings as f
        where f.audit_id = a.id
          and f.domain = 'securite'
      ), '[]'::jsonb)
      else '[]'::jsonb
    end
  from public.reports as r
  join public.audits as a on a.id = r.audit_id
  join public.sites as s on s.id = a.site_id
  where r.visibility = 'link'
    and r.revoked_at is null
    and s.deleted_at is null
    and p_token ~ '^[0-9a-f]{32}$'
    and r.share_token = p_token;
$$;

revoke all on function public.read_public_score(text) from public;
revoke all on function public.read_shared_score(text) from public;
grant execute on function public.read_public_score(text) to anon, authenticated, service_role;
grant execute on function public.read_shared_score(text) to anon, authenticated, service_role;
