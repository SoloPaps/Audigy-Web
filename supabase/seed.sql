-- Données locales du propriétaire. Aucun mot de passe réutilisable :
-- l'empreinte est tirée au chargement. Connexion : lien magique.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'proprietaire@localhost',
  extensions.crypt(extensions.gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Propriétaire"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  ''
);

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000001',
    'email', 'proprietaire@localhost'
  ),
  'email',
  now(),
  now(),
  now()
);

insert into public.sites (
  id,
  owner_id,
  url,
  scope,
  host,
  path_prefix,
  label,
  hosting,
  is_public
) values
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    'https://angelique-osteo.fr',
    'origin',
    'angelique-osteo.fr',
    null,
    'Angélique Ostéo',
    'netlify',
    false
  ),
  (
    '00000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000001',
    'https://solopaps.github.io/Projet-Site-Artiste/',
    'path',
    'solopaps.github.io',
    '/Projet-Site-Artiste/',
    'Projet Site Artiste',
    'github_pages',
    false
  );
