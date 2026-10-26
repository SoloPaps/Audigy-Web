# Audigy

Audit de sites web en **français clair** : performance, SEO, sécurité, écologie, accessibilité, qualité technique, vie privée, DNS/e-mail.

- **Particuliers** : une note, trois priorités, langage simple.
- **Dévs / freelances / entreprises** : détail par domaine, Comment corriger, brief IA (Rien / Vérif / Fix).

Le fonctionnement complet (gratuit sans/avec compte, Pro futur, partage, plafonds, stockage) est dans [`docs/FONCTIONNEMENT.md`](docs/FONCTIONNEMENT.md).

## Statut

Développement local. Aucun site de production : le déploiement Netlify n’a pas été fait.

Au **26 octobre 2026** :

- PART-00 à PART-26 sont dans le dépôt. PART-26 (durcissement et recette, #36) mesure un build servi en local : [`docs/RECETTE.md`](docs/RECETTE.md).
- L’interface d’audit est en place (accueil, rapport, sites, historique). L’habillage Arc Soft est sur `main` (#38, #39, #40).
- Clarté de l’interface : Vagues 1, 2 et 3 sur `main` (#45, #46, #53). La suite (axe partiel, disponibilité, questionnaire, anglais) est sur `main` (#59).
- Le brief agent est dans l’interface : cases cochées, choix Rien / Vérif / Fix, pile reconnue.
- Pack design gelé : [`docs/design-pack-2026-10-26/`](docs/design-pack-2026-10-26/00-LISEZ-MOI.md) (PR #67).
- Refonte produit / UI ordonnée : [`docs/etapes-refonte/`](docs/etapes-refonte/00-LISEZ-MOI.md).

Le déploiement Netlify de production est une action manuelle, **une seule fois**, réservée au propriétaire, après PART-26 (**PART-27**). Checklist : [`docs/PLAN.md`](docs/PLAN.md). En développement, seul `netlify dev` est autorisé : pas de `netlify deploy`, pas de liaison Git, pas de deploy preview, pas de branch deploy.

## Design gelé (2026-10-26)

Stitch est gelé. On ne le relance pas pour la navigation, le logo ou le thème sombre. Cursor reste proche des maquettes (hiérarchie, sections, checklists), pas un calque pixel-perfect.

Les PNG [`docs/design-pack-2026-10-26/maquettes/`](docs/design-pack-2026-10-26/maquettes/README.md) sont des modèles visuels à lire avec le code (`screen.png` par écran). Les règles produit nouvelles — 2 sites / 1 lien, soft-gate, brief IA gratuit avec compte, Pro plus tard, vie privée option C — viennent de [`docs/FONCTIONNEMENT.md`](docs/FONCTIONNEMENT.md), pas des pixels.

Pack : [`docs/design-pack-2026-10-26/00-LISEZ-MOI.md`](docs/design-pack-2026-10-26/00-LISEZ-MOI.md). Règles non négociables : [`01-REGLES-STRICTES.md`](docs/design-pack-2026-10-26/01-REGLES-STRICTES.md). En conflit avec une maquette Stitch, ce fichier gagne.

- **Navigation.** Un seul `AppHeader`. Libellés, dans cet ordre : **Accueil · Méthode · Sites suivis · Documentation** | **FR/EN** · **Connexion**. Le drawer mobile reprend ces cinq items, plus FR/EN.
- **Interdit en navigation.** Famille B (Audit actif, Historique, Générateur Brief), item Progression, Blog / Actu, bottom-bar « Diagnostic · Méthode · Sites · Compte ».
- **Logo unique.** [`assets/logo-icon.jpg`](docs/design-pack-2026-10-26/assets/logo-icon.jpg) et [`assets/logo-lockup.jpg`](docs/design-pack-2026-10-26/assets/logo-lockup.jpg). Interdit : Material Symbols `vital_signs`, etc. Détail : [`05-LOGO.md`](docs/design-pack-2026-10-26/05-LOGO.md).
- **Clair.** Arc Soft (PR #66). Tokens : [`docs/DESIGN.md`](docs/DESIGN.md) et [`03-THEME-LIGHT-ARC-SOFT.md`](docs/design-pack-2026-10-26/03-THEME-LIGHT-ARC-SOFT.md).
- **Sombre figé.** [`04-THEME-DARK.md`](docs/design-pack-2026-10-26/04-THEME-DARK.md), refs PNG dans `assets/`.
- **Maquettes Stitch.** Fichiers extraits dans [`docs/design-pack-2026-10-26/maquettes/`](docs/design-pack-2026-10-26/maquettes/README.md) (`screen.png` + `code.html`). Pas de ZIP dans le dépôt. Deux écrans sans PNG valide : voir `SCREEN-INVALID.txt`.
- **Pages et backlog.** [`02-PAGES.md`](docs/design-pack-2026-10-26/02-PAGES.md), [`06-BACKLOG-CURSOR.md`](docs/design-pack-2026-10-26/06-BACKLOG-CURSOR.md). Hors lot : [`07-PLUS-TARD.md`](docs/design-pack-2026-10-26/07-PLUS-TARD.md).

## Démarrage local

Prérequis : **Node 22** (`nvm use`), **pnpm 10** (`corepack enable` ; le dépôt pin `pnpm@10.18.2`), **Docker** (Supabase local).

```bash
pnpm i
supabase start
pnpm check
```

Supabase reste **local** en développement. Les clés viennent de `supabase status` et ne vont pas dans git.

`pnpm check` enchaîne le garde-fou anti-déploiement, Biome, le copy-lint, le typecheck, Vitest, le build (`apps/web/dist`, `netlify/dist/functions`), l’auto-audit local, puis les tests d’interface et d’accessibilité.

Pour l’application et un audit de bout en bout (labo `*.audigy.test`, `netlify dev --offline --filter @audigy/web`, CLI), suivre [`docs/DEV-LOCAL.md`](docs/DEV-LOCAL.md). N’auditer que le labo, ou un site dont vous êtes propriétaire.

Chromium du runner, une fois : `pnpm --filter @audigy/browser-runner exec playwright install chromium`.

### Interdits en développement

- `netlify deploy`
- Liaison Git ↔ Netlify
- Deploy previews / branch deploys
- Auditer un site tiers sans propriété

Seul le propriétaire exécute **PART-27** (déploiement prod).

## Où sont stockées les données ?

| Contexte | Stockage |
|---|---|
| **Sans compte** | Au mieux le dernier audit en **mémoire navigateur** (1 site). Pas durable multi-appareils. |
| **Avec compte** | **Serveur** : comptes, sites suivis, rapports, historique, liens, alertes. |
| **Dev** | Supabase en **Docker local** (`supabase start`). |
| **Prod (prévu)** | Supabase **distant** + fonctions Netlify. |
| **PC utilisateur** | Affichage et **exports ponctuels** seulement (PDF/MD ; Excel/CSV en Pro plus tard). La source de vérité reste le serveur. |
| **Graphiques (Pro)** | Calculés depuis l’historique **serveur**. |

Détail produit : [`docs/FONCTIONNEMENT.md`](docs/FONCTIONNEMENT.md) §9.

## Stack (indicatif)

- Monorepo **pnpm**, **Node 22**, TypeScript strict
- **Astro** (`apps/web`), fonctions **Netlify**
- **Supabase** (auth magic link, données)
- `packages/net` anti-SSRF ; runner navigateur Playwright
- Qualité : Biome, Vitest, Playwright, axe

## Où lire

Carte complète : [`docs/README.md`](docs/README.md). Règles agents : [`AGENTS.md`](AGENTS.md) + `.cursor/rules/`.

| Document | Rôle |
|---|---|
| [`docs/FONCTIONNEMENT.md`](docs/FONCTIONNEMENT.md) | Produit : parcours, gratuit/Pro, partage, plafonds, stockage |
| [`docs/etapes-refonte/00-LISEZ-MOI.md`](docs/etapes-refonte/00-LISEZ-MOI.md) | Étapes ordonnées pour la modification complète du site |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Charte obligatoire (clair + sombre §2.4) |
| [`docs/design-pack-2026-10-26/00-LISEZ-MOI.md`](docs/design-pack-2026-10-26/00-LISEZ-MOI.md) | Pack design gelé |
| [`docs/METHODE.md`](docs/METHODE.md) | Notation, version 2026.1 |
| [`docs/PLAN.md`](docs/PLAN.md) | Architecture, PART-00…26, PART-27 owner |
| [`docs/DEV-LOCAL.md`](docs/DEV-LOCAL.md) | Audit local bout-en-bout |
| [`docs/RECETTE.md`](docs/RECETTE.md) | Recette PART-26 (build local) |
| [`AGENTS.md`](AGENTS.md) | Règles agents (mode caveman, sécurité, outils) |
