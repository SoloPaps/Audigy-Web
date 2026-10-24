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

`pnpm lab` écrit `.netlify/audigy-lab.json` (AC de test et ports). Si `.env` manque, il le crée avec les clés du Supabase local et `AUDIGY_LAB`. Les valeurs ne sont jamais affichées. `.env` et `.netlify/` sont ignorés par Git.

```bash
# 3. Fonctions + site statique sur http://localhost:8888
pnpm build
netlify dev --offline --filter @audigy/web
```

`--filter @audigy/web` évite la question du monorepo. `pnpm build` produit le site et le bundle des fonctions (`netlify/dist/functions`). Après une modification d'une fonction ou d'un paquet : `pnpm build:functions`, puis relancer `netlify dev`.

Puis, dans un quatrième terminal :

```bash
pnpm lab:audit
```

Le script ouvre une session locale (`proprietaire@localhost`, Supabase local seulement), envoie deux `POST /api/audits` simultanés (double clic), vérifie qu'un seul audit existe, puis suit `GET /api/audits/:id` jusqu'à `done`. Il affiche les statuts, les scores par domaine et chaque test « Non testé » avec sa raison.

## API

| Route | Rôle |
|---|---|
| `POST /api/audits` | `{ "url": "exemple.fr" }` ou `{ "siteId": "<uuid>" }`, `mode` facultatif (`passive` par défaut). Jeton Supabase en `Authorization: Bearer`. |
| `GET /api/audits/:id` | Audit, scores par domaine et constats, sous RLS (propriétaire seulement). |
| `audit-run-background` | Fonction background, appelée par `api-audits-create` avec un en-tête signé. Pas de route publique. |

Réponses de `POST` : `202` audit créé, `200` audit déjà en cours (double clic), `429` limite atteinte (`Retry-After`), `400`, `401`, `403` (actif sans vérification), `404`. Les erreurs renvoient un code et une clé `api.error.*`, jamais un message technique.

Limites : 10 audits par jour et par compte (jour de Paris), 1 audit par hôte toutes les 15 minutes. Les clés de `rate_limits` sont des empreintes SHA-256.

## Déroulé d'un audit

1. `queued` : créé par `api-audits-create`, qui réveille `audit-run-background`.
2. `running` : la fonction réserve l'audit (`FOR UPDATE SKIP LOCKED`) et lance les tests côté serveur.
3. `partial` : résultats serveur écrits. Les tests navigateur sont « Non testé » (`reason.runner_pending`).
4. Déclenchement du navigateur d'audit (`workflow_dispatch` de `browser-audit.yml`), attente de 10 minutes au plus.
5. `done` : sortie du navigateur fusionnée et notée. Sans navigateur (jeton absent, refus, délai), les tests navigateur restent « Non testé » avec `reason.runner_absent`.

Un test actif ne tourne que si la propriété est vérifiée et revérifiée depuis moins de 10 minutes. Un audit bloqué en `running` ou `partial` plus de 20 minutes passe en `failed`.

`GH_DISPATCH_TOKEN` est facultatif en local. Sans lui, aucun appel à GitHub.

## CLI

```bash
pnpm audigy audit https://exemple.fr
pnpm audigy audit exemple.fr --json
pnpm audigy audit exemple.fr --browser
```

Audit passif uniquement, mêmes tests que la fonction, réseau via `@audigy/net`. `--browser` utilise le navigateur d'audit local s'il est installé, sinon les tests concernés sont « Non testé ». Codes de sortie : `0` fini, `1` échec, `2` usage.

Sur le labo, sans aucun accès extérieur :

```bash
AUDIGY_LAB=.netlify/audigy-lab.json pnpm audigy audit https://bon.audigy.test/
```

N'auditez avec la CLI que des sites dont vous êtes propriétaire ou que vous êtes autorisé à observer.

## `AUDIGY_LAB`

Variable de développement, hors liste §9. Elle redirige les noms `*.audigy.test` vers les serveurs du labo et coupe le DNS public et les API tierces. Les fonctions ne la lisent que sous `netlify dev` (`NETLIFY_DEV=true`).

## Tests

`pnpm test` couvre l'orchestration de bout en bout sans `netlify dev` : Supabase local, labo, handlers réels, runner simulé. Aucun appel réseau sortant.
