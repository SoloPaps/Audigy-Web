# Audigy

Audit gratuit de sites web pour les particuliers, en français clair : performance, SEO, sécurité, écologie, accessibilité, qualité technique, vie privée, DNS/e-mail. Un score /100 par domaine, des corrections priorisées, un historique et des rapports horodatés vérifiables.

Statut : socle local (PART-00). Pas encore d'interface ni de moteur d'audit.

## Démarrage local

Prérequis : Node 22 (`nvm use`), pnpm 10 (`corepack enable`).

```bash
pnpm i
supabase start
pnpm check
```

Supabase reste local (Docker). Aucun projet distant. Les clés viennent de `supabase status` et ne vont pas dans git.

`pnpm check` lance le garde-fou anti-déploiement, Biome, le typecheck, Vitest et le build statique (`apps/web/dist`). Ensuite, avec le CLI Netlify installé chez vous : `netlify dev` (port 8888). Aucune liaison Git, aucun déploiement.

- Plan et découpage en PARTS : [`docs/PLAN.md`](docs/PLAN.md)
- Questions ouvertes : [`docs/QUESTIONS.md`](docs/QUESTIONS.md)
- Charte de design (obligatoire) : [`docs/DESIGN.md`](docs/DESIGN.md)
- Règles pour les agents : [`AGENTS.md`](AGENTS.md), `.cursor/rules/`

Développement local uniquement (`netlify dev`). Aucun déploiement Netlify avant la version finale validée (voir PLAN §14 et PART-27).
