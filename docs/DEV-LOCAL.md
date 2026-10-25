# Développement local : API d'audit et CLI

Tout tourne sur la machine : Supabase local (Docker), `netlify dev`, et des sites de test servis sur 127.0.0.1. Aucun déploiement, aucune liaison Netlify, aucun appel à un vrai site.

## Prérequis

- Node 22, pnpm 10, Docker, le CLI Supabase.
- Le CLI Netlify installé chez vous (`npm i -g netlify-cli`). Il sert seulement à `netlify dev`.

## Lancer un audit de bout en bout

Trois terminaux.

```bash
# 1. Base locale
supabase start

# 2. Labo : sites de test sous https://bon.audigy.test/ et https://mauvais.audigy.test/
pnpm lab
```

`pnpm lab` écrit `.netlify/audigy-lab.json` (AC de test et ports). Si `.env` manque, il le crée avec les clés du Supabase local et `AUDIGY_LAB`. Il écrit aussi `apps/web/.env` avec seulement `SUPABASE_URL` et `SUPABASE_ANON_KEY` (publiques). La clé service n'y est pas. Les valeurs ne sont jamais affichées.

`.env`, `apps/web/.env` et `.netlify/` sont ignorés par Git. Les secrets restent sur votre machine : ne commitez jamais ces fichiers, ni une copie remplie. `.env.example` ne contient que les noms. Si `.env` existait déjà, relancez `pnpm lab` : il met à jour `apps/web/.env` sans afficher les clés.

```bash
# 3. Fonctions + site statique sur http://localhost:8888
pnpm build
netlify dev --offline --filter @audigy/web
```

`--filter @audigy/web` évite la question du monorepo. `pnpm build` produit le site et le bundle des fonctions (`netlify/dist/functions`). Il charge d'abord le `.env` de la racine (sans afficher les valeurs) et le transmet à Astro, qui fige `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans le site statique. Le lien magique a alors de quoi joindre le Supabase local. Relancez `pnpm build` si ces clés changent. Sous Windows, le même script lance `pnpm` via le shell du système, sans modifier le PATH. Après une modification d'une fonction ou d'un paquet : `pnpm build:functions`, puis relancer `netlify dev`.

Puis, dans un quatrième terminal :

```bash
pnpm lab:audit
```

Le script ouvre une session locale (`proprietaire@localhost`, Supabase local seulement), envoie deux `POST /api/audits` simultanés (double clic), vérifie qu'un seul audit existe, puis suit `GET /api/audits/:id` jusqu'à `done`. Il affiche les statuts, les scores par domaine et chaque test « Non testé » avec sa raison.

### Avec le runner navigateur

Chromium installé une fois : `pnpm --filter @audigy/browser-runner exec playwright install chromium`.

```bash
AUDIGY_LOCAL_RUNNER=true netlify dev --offline --filter @audigy/web
pnpm lab:audit https://navigateur.audigy.test/ --browser
```

Avec `AUDIGY_LOCAL_RUNNER=true`, la fonction n'appelle pas GitHub : elle attend le runner. Dès que l'audit est `partial`, le script lance le vrai runner (`runJob`, Chromium) sur le labo, comme `browser-audit.yml`. Le rapport est déposé dans le seau `artifacts`, puis fusionné : l'audit finit en `done` avec la vie privée notée.

## API

| Route | Rôle |
|---|---|
| `POST /api/audits` | `{ "url": "exemple.fr" }` ou `{ "siteId": "<uuid>" }`, `mode` facultatif (`passive` par défaut). Jeton Supabase en `Authorization: Bearer`. |
| `GET /api/audits/:id` | Audit, scores par domaine et constats, sous RLS (propriétaire seulement). |
| `audit-run-background` | Fonction background, appelée par `api-audits-create` avec un en-tête signé. Pas de route publique. |

Réponses de `POST` : `202` audit créé, `200` si un audit du même site est encore en cours (`queued`, `running`, `partial`). Un `done` ou `failed` dans les 15 minutes répond `429` (`host_limit`, `Retry-After`), pas l’ancien id. Aussi `400`, `401`, `403` (actif sans vérification), `404`. Les erreurs renvoient un code et une clé `api.error.*`, jamais un message technique.

Limites : 10 audits par jour et par compte (jour de Paris), 1 audit par hôte toutes les 15 minutes. Les clés de `rate_limits` sont des empreintes SHA-256.

## Déroulé d'un audit

1. `queued` : créé par `api-audits-create`, qui réveille `audit-run-background`.
2. `running` : la fonction réserve l'audit (`FOR UPDATE SKIP LOCKED`) et lance les tests côté serveur.
3. `partial` : résultats serveur écrits. Les tests navigateur sont « Non testé » (`reason.runner_pending`).
4. Déclenchement du navigateur d'audit (`workflow_dispatch` de `browser-audit.yml`), attente de 10 minutes au plus. Le runner accepte un audit `queued`, `running` ou `partial`.
5. `done` : le rapport `<id>/browser/results.json` (seau `artifacts`) est relu, vérifié (empreinte, taille, schéma), puis fusionné et noté. Sans navigateur (jeton absent, refus, délai), les tests navigateur restent « Non testé » avec `reason.runner_absent`.

Un test actif ne tourne que si la propriété est vérifiée et revérifiée depuis moins de 10 minutes. Un audit bloqué en `running` ou `partial` plus de 20 minutes passe en `failed`.

`GH_DISPATCH_TOKEN` est facultatif en local. Sans lui, aucun appel à GitHub.

## CLI

```bash
pnpm audigy audit https://exemple.fr
pnpm audigy audit exemple.fr --json
pnpm audigy audit exemple.fr --browser
```

Audit passif uniquement, mêmes tests que la fonction, réseau via `@audigy/net`. `--browser` lance Chromium via `@audigy/browser-runner` (passif, aucune interaction). Sans Chromium installé, les tests concernés sont « Non testé ». Codes de sortie : `0` fini, `1` échec, `2` usage.

Sur le labo, sans aucun accès extérieur :

```bash
AUDIGY_LAB=.netlify/audigy-lab.json pnpm audigy audit https://bon.audigy.test/
```

N'auditez avec la CLI que des sites dont vous êtes propriétaire ou que vous êtes autorisé à observer.

## `AUDIGY_LAB` et `AUDIGY_LOCAL_RUNNER`

Variables de développement, hors liste §9. `AUDIGY_LAB` redirige les noms `*.audigy.test` vers les serveurs du labo et coupe le DNS public et les API tierces. `AUDIGY_LOCAL_RUNNER=true` remplace l'appel à GitHub par l'attente d'un runner local. Les fonctions ne les lisent que sous `netlify dev` (`NETLIFY_DEV=true`), labo actif.

## Tests

`pnpm test` couvre l'orchestration de bout en bout sans `netlify dev` : Supabase local, labo, handlers réels, `runJob` du runner avec un rapport de référence. La CLI est aussi testée avec le vrai Chromium sur le labo. Aucun appel réseau sortant.
