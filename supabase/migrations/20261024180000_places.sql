-- PART-24. Lieu confirmé et cache 7 jours des avis.
-- Note et nombre seulement : pas le texte des avis.
-- anon et authenticated n'ont aucun droit. service_role contourne le RLS.

create table public.site_places (
  site_id uuid primary key references public.sites (id) on delete cascade,
  place_id text not null,
  place_name text not null,
  place_address text not null default '',
  confirmed_at timestamptz not null default now(),
  constraint site_places_id_form check (place_id ~ '^[A-Za-z0-9_-]{8,255}$'),
  constraint site_places_name_len check (char_length(place_name) between 1 and 200),
  constraint site_places_address_len check (char_length(place_address) <= 300)
);

create table public.places_cache (
  place_id text primary key,
  place_name text not null,
  place_address text not null default '',
  rating_tenths integer,
  review_count integer,
  fetched_at timestamptz not null,
  constraint places_cache_id_form check (place_id ~ '^[A-Za-z0-9_-]{8,255}$'),
  constraint places_cache_name_len check (char_length(place_name) between 1 and 200),
  constraint places_cache_address_len check (char_length(place_address) <= 300),
  constraint places_cache_rating check (
    rating_tenths is null or rating_tenths between 10 and 50
  ),
  constraint places_cache_count check (
    review_count is null or review_count >= 0
  )
);

alter table public.site_places enable row level security;
alter table public.places_cache enable row level security;

revoke all on public.site_places from public, anon, authenticated;
revoke all on public.places_cache from public, anon, authenticated;
grant select, insert, update, delete on public.site_places to service_role;
grant select, insert, update, delete on public.places_cache to service_role;
