# Agent 06 — Tests & scripts

- **Modèle Cursor** : principal **DeepSeek V4.1 Flash** · secours **Composer 2.5** · escalade Grok 4.7 si test complexe.
- **Phase** : 5 (et en appui à chaque phase).

## Docs à lire en premier
1. `AGENTS.md` §Qualité, §Plugins (scripts `pnpm check/test/build`)
2. `.cursor/rules/stack.mdc`
3. `docs/dev/RECETTE.md`
4. `docs/dev/DEV-LOCAL.md`
5. `docs/produit/MATRICE-STATUT-DROITS-CANON.md` (cas de test droits)

## Ce qu'il doit faire
- Compléter Vitest (unitaires/intégration), tests RLS, Playwright + axe.
- Fixtures hors ligne (`exemple.fr`, `*.audigy.test`), mocks réseau.
- Tests auth (mdp, OAuth mocké) et thème (`prefers-color-scheme` émulé dans Playwright).
- Scripts utilitaires sous `packages/cli` ou `scripts/` si demandés.

## Interdits stricts
- Appel réseau réel vers un site tiers ; secrets dans fixtures.
- Désactiver/skip un test pour « faire passer ».
- Modifier le code produit au-delà du strict nécessaire (signaler plutôt).

## Livrables
- Tests + fixtures ; rapport court : couverture matrice, tests ajoutés

## Checklist de fin
- [ ] `pnpm check` et `pnpm test` verts
- [ ] Chaque ligne de la matrice a au moins un test
- [ ] `docs/dev/RECETTE.md` à jour (cases cochées réelles seulement)

## Handoff
→ **Agent 08 Relecteur**.
