# Audigy

Audit gratuit de sites web pour les particuliers, en français clair : performance, SEO, sécurité, écologie, accessibilité, qualité technique, vie privée, DNS/e-mail. Un score /100 par domaine, des corrections priorisées, un historique et des rapports horodatés vérifiables.

Statut : développement local. Moteur d'audit, API d'audit et CLI en place (PART-15). Pas encore d'interface d'audit.

## Démarrage local

Prérequis : Node 22 (`nvm use`), pnpm 10 (`corepack enable`).

```bash
pnpm i
supabase start
pnpm check
```

Supabase reste local (Docker). Aucun projet distant. Les clés viennent de `supabase status` et ne vont pas dans git.

`pnpm check` lance le garde-fou anti-déploiement, Biome, le typecheck, Vitest et le build statique (`apps/web/dist`, `netlify/dist/functions`).

Runner navigateur en local (Chromium, profil vierge, aucune interaction, mode passif) :

```bash
pnpm --filter @audigy/browser-runner exec playwright install chromium
pnpm --filter @audigy/browser-runner run audit https://exemple.fr/
```

Résultat dans `.audigy-browser/<hôte>/` : `browser.json` et deux captures WebP. Le workflow `browser-audit.yml` (déclenché à la main, entrée `auditId`) fait la même chose et range les artefacts dans Supabase.

Ensuite, avec le CLI Netlify installé chez vous : `netlify dev --offline --filter @audigy/web` (port 8888). Aucune liaison Git, aucun déploiement.

- API d'audit, labo local et CLI : [`docs/DEV-LOCAL.md`](docs/DEV-LOCAL.md)
- Plan et découpage en PARTS : [`docs/PLAN.md`](docs/PLAN.md)
- Questions ouvertes : [`docs/QUESTIONS.md`](docs/QUESTIONS.md)
- Charte de design (obligatoire) : [`docs/DESIGN.md`](docs/DESIGN.md)
- Règles pour les agents : [`AGENTS.md`](AGENTS.md), `.cursor/rules/`

Développement local uniquement (`netlify dev`). Aucun déploiement Netlify avant la version finale validée (voir PLAN §14 et PART-27).
