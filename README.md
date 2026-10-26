# Audigy

Audit gratuit de sites web pour les particuliers, en français clair : performance, SEO, sécurité, écologie, accessibilité, qualité technique, vie privée, DNS/e-mail. Un score /100 par domaine, des corrections priorisées, un historique et des rapports horodatés vérifiables.

## Statut

Développement local. Aucun site de production : le déploiement Netlify n’a pas été fait.

Au 26 octobre 2026 :

- PART-00 à PART-26 sont dans le dépôt. PART-26 (durcissement et recette, #36) mesure un build servi en local : [`docs/RECETTE.md`](docs/RECETTE.md).
- L’interface d’audit est en place (accueil, rapport, sites, historique). L’habillage Arc Soft est sur `main` (#38, #39, #40).
- Clarté de l’interface : Vagues 1, 2 et 3 sur `main` (#45, #46, #53). La suite (axe partiel, disponibilité, questionnaire, anglais) est sur `main` (#59).
- Le brief agent est dans l’interface : cases cochées, choix Rien / Vérif / Fix, pile reconnue.
- Un audit terminé ne rejoue pas l’ancien rapport. Un audit encore en cours reprend la même page.
- Sans navigateur d’audit, chaque test de vie privée a sa phrase et la note reste absente.
- Le rapport montre le score et les priorités, le détail est replié, et chaque constat catalogué lie `/methode`.
- L’avancement donne une fourchette de minutes et une phase : file, DNS, pages, vie privée.
- L’accès automatique (axe) entre dans le score d’accessibilité quand le navigateur d’audit a tourné. Sans lui : Non testé. Ce n’est pas un audit RGAA complet.
- La disponibilité affiche un pourcentage de sondes, hors score global, ou Non testé.
- Le questionnaire d’écoconception est sur `/ecoconception`. Une question vide n’est pas un échec.
- L’anglais se charge à la demande. Le français reste la langue des pages statiques. Pas de troisième langue.
- La barre de brief n’est pas collée à l’écran : elle cacherait les constats.

Le déploiement Netlify de production est une action manuelle, une seule fois, réservée au propriétaire, après PART-26. La checklist est dans [`docs/PLAN.md`](docs/PLAN.md) (section « PART-27 — Déploiement unique final » et §14). En développement, seul `netlify dev` est autorisé : pas de `netlify deploy`, pas de liaison Git, pas de deploy preview, pas de branch deploy.

## Design gelé (2026-10-26)

Stitch est gelé. On ne le relance pas pour la navigation, le logo ou le thème sombre. Cursor reste proche des maquettes (hiérarchie, sections, checklists), pas un calque pixel-perfect.

Pack : [`docs/design-pack-2026-10-26/00-LISEZ-MOI.md`](docs/design-pack-2026-10-26/00-LISEZ-MOI.md). Règles non négociables : [`01-REGLES-STRICTES.md`](docs/design-pack-2026-10-26/01-REGLES-STRICTES.md). En conflit avec une maquette Stitch, ce fichier gagne.

- **Navigation.** Un seul `AppHeader`. Libellés, dans cet ordre : **Accueil · Méthode · Sites suivis · Documentation** | **FR/EN** · **Connexion**. Le drawer mobile reprend ces cinq items, plus FR/EN.
- **Interdit en navigation.** Famille B (Audit actif, Historique, Générateur Brief), item Progression, Blog / Actu, bottom-bar « Diagnostic · Méthode · Sites · Compte ».
- **Logo unique.** [`assets/logo-icon.jpg`](docs/design-pack-2026-10-26/assets/logo-icon.jpg) (carré) et [`assets/logo-lockup.jpg`](docs/design-pack-2026-10-26/assets/logo-lockup.jpg) (horizontal). Interdit : Material Symbols `vital_signs`, `ecg_heart`, `graphic_eq`, `shield`, `verified`, lettre A isolée, SVG « ECG » inventé. Détail : [`05-LOGO.md`](docs/design-pack-2026-10-26/05-LOGO.md). Pas de copie dans `apps/` : le dépôt n’a pas de dossier marque sous `public/`.
- **Clair.** Arc Soft de la fusion MonScore × Arc Soft, déjà sur `main` (PR #66, `ef52ddbf`). Tokens : [`docs/DESIGN.md`](docs/DESIGN.md) et [`03-THEME-LIGHT-ARC-SOFT.md`](docs/design-pack-2026-10-26/03-THEME-LIGHT-ARC-SOFT.md).
- **Sombre figé.** [`04-THEME-DARK.md`](docs/design-pack-2026-10-26/04-THEME-DARK.md), [`refs/dark-theme-tokens.md`](docs/design-pack-2026-10-26/refs/dark-theme-tokens.md), [`assets/dark-ref-accueil.png`](docs/design-pack-2026-10-26/assets/dark-ref-accueil.png), [`assets/dark-ref-progression.png`](docs/design-pack-2026-10-26/assets/dark-ref-progression.png). Section dans la charte : [`docs/DESIGN.md`](docs/DESIGN.md) §2.4.
- **Pages et backlog.** Inventaire : [`02-PAGES.md`](docs/design-pack-2026-10-26/02-PAGES.md). Ordre de travail : [`06-BACKLOG-CURSOR.md`](docs/design-pack-2026-10-26/06-BACKLOG-CURSOR.md) (P0 → P2). Hors lot : [`07-PLUS-TARD.md`](docs/design-pack-2026-10-26/07-PLUS-TARD.md).

## Démarrage local

Prérequis : Node 22 (`nvm use`), pnpm 10 (`corepack enable`), Docker (Supabase local).

```bash
pnpm i
supabase start
pnpm check
```

Supabase reste local. Aucun projet distant. Les clés viennent de `supabase status` et ne vont pas dans git.

`pnpm check` enchaîne le garde-fou anti-déploiement, Biome, le copy-lint, le typecheck, Vitest, le build statique (`apps/web/dist`, `netlify/dist/functions`), l’auto-audit local, puis les tests d’interface et d’accessibilité.

Pour l’application et un audit de bout en bout (labo `*.audigy.test`, `netlify dev --offline --filter @audigy/web`, CLI), suivre [`docs/DEV-LOCAL.md`](docs/DEV-LOCAL.md). N’auditer que le labo, ou un site dont vous êtes propriétaire.

Chromium du runner, une fois : `pnpm --filter @audigy/browser-runner exec playwright install chromium`. Le parcours avec navigateur est dans `docs/DEV-LOCAL.md` (labo, pas un site extérieur).

## Où lire

Carte complète : [`docs/README.md`](docs/README.md).

| Document | Rôle |
|---|---|
| [`docs/DESIGN.md`](docs/DESIGN.md) | Charte obligatoire (tokens clair, typo, ton, accessibilité). Sombre gelé : §2.4 |
| [`docs/design-pack-2026-10-26/00-LISEZ-MOI.md`](docs/design-pack-2026-10-26/00-LISEZ-MOI.md) | Pack design gelé du 26 oct. 2026 : règles, pages, logos, refs sombres, backlog |
| [`docs/METHODE.md`](docs/METHODE.md) | Notation, version 2026.1 |
| [`docs/PLAN.md`](docs/PLAN.md) | Architecture, PART-00 à PART-26, garde-fous, checklist de déploiement |
| [`docs/DEV-LOCAL.md`](docs/DEV-LOCAL.md) | Lancer l’audit en local |
| [`AGENTS.md`](AGENTS.md) | Règles pour les agents, avec `.cursor/rules/` |
