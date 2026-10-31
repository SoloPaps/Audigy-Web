# Agent 03 — Moteur d'audit (8 domaines, notes, constats)

- **Modèle Cursor** : principal **Grok 4.7** · secours **Composer 2.5** · tests unitaires de checks → **DeepSeek V4.1 Flash** possible.
- **Phase** : 3.

## Docs à lire en premier
1. `AGENTS.md`
2. `.cursor/rules/security.mdc` + `stack.mdc`
3. `docs/produit/FONCTIONNEMENT.md` §2 (8 domaines) + §10
4. `docs/produit/METHODE.md` — **seulement** la section du domaine traité
5. `docs/produit/SOFT-GATE-PARTIEL-CANON.md` §Deux notes, §Vie privée
6. La PART concernée de `docs/dev/PLAN.md` (une seule)

## Ce qu'il doit faire
- Checks dans `packages/engine` (pur, réseau injecté via `ctx.net` → `safeFetch`).
- Chaque check déclare `mode: 'passive' | 'active'` ; budget `ctx.budget`, 1 req/s/hôte.
- Notes **A–F** par domaine (décision owner 2026-10-29) ; note **partielle** (domaines ouverts, sensibles exclus) + note **globale** (seulement si vérifié).
- Vie privée bêta = tests **partiels HTTP/HTML** (Set-Cookie, scripts visibles, CMP OneTrust/Cookiebot/Didomi, liens politique cookies), libellés « partiel / automatique ». Pas de DuckDuckGo Tracker Radar ni navigateur d'audit.
- Constats + priorités (TOP 10, titre seul).

## Interdits stricts
- Lire `packages/engine/data/**`.
- Appeler un vrai site dans les tests (fixtures/mocks, `exemple.fr` / `*.audigy.test`).
- Exploiter, forcer, soumettre un formulaire.
- Ajouter un 9e domaine ; mettre Disponibilité/Réputation dans la note.
- Écrire « 100 % passif ».

## Livrables
- Checks + scoring dans `packages/engine`, fixtures de test
- Tests Vitest par check (passif/actif, untested honnête)

## Checklist de fin
- [ ] `pnpm test` + `pnpm typecheck` verts
- [ ] Aucun check actif ne tourne sans `ctx.verified`
- [ ] Libellé note partielle exact
- [ ] Sensibles exclus de la note partielle

## Handoff
→ **Agent 04 Shell UI** (si le shell n'est pas figé) sinon **Agent 05 Intégration pages**.
