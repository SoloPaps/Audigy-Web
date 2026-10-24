-- Dernier défi d'un site : created_at, pas l'uuid (non ordonné).

alter table public.site_verifications
  add column created_at timestamptz not null default now();

create index site_verifications_created_idx
  on public.site_verifications (site_id, created_at desc);
