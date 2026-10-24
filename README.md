# Audigy

Audit gratuit de sites web pour les particuliers, en français clair : performance, SEO, sécurité, écologie, accessibilité, qualité technique, vie privée, DNS/e-mail. Un score /100 par domaine, des corrections priorisées, un historique et des rapports horodatés vérifiables.

## Statut

Développement local. Aucun site de production : le déploiement Netlify n’a pas été fait.

Sur `main` au 24 octobre 2026 :

- PART-00 à PART-26 sont dans le dépôt. PART-26 (durcissement et recette, #36) mesure un build servi en local : [`docs/RECETTE.md`](docs/RECETTE.md).
- L’interface d’audit est en place (accueil, rapport, sites, historique). L’habillage Arc Soft est sur `main` (#38, #39, #40).
- Clarté de l’interface : Vague 1 fusionnée (#45). Vague 2 ouverte (#46, rapport emportable). Vague 3 est décrite dans la spec, sans PR.
- La spec du brief agent est fusionnée (#47). Elle ne change pas encore l’interface.

Le déploiement Netlify de production est une action manuelle, une seule fois, réservée au propriétaire, après PART-26. La checklist est dans [`docs/PLAN.md`](docs/PLAN.md) (section « PART-27 — Déploiement unique final » et §14). En développement, seul `netlify dev` est autorisé : pas de `netlify deploy`, pas de liaison Git, pas de deploy preview, pas de branch deploy.

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
| [`docs/DESIGN.md`](docs/DESIGN.md) | Charte obligatoire (tokens, typo, ton, accessibilité) |
| [`docs/METHODE.md`](docs/METHODE.md) | Notation, version 2026.1 |
| [`docs/PLAN.md`](docs/PLAN.md) | Architecture, PART-00 à PART-26, garde-fous, checklist de déploiement |
| [`docs/DEV-LOCAL.md`](docs/DEV-LOCAL.md) | Lancer l’audit en local |
| [`AGENTS.md`](AGENTS.md) | Règles pour les agents, avec `.cursor/rules/` |
