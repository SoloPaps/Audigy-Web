# AGENTS.md — Audigy

Lire ce fichier, puis seulement la PART demandée dans `docs/PLAN.md`. Ne pas lire tout le repo.

## Style de réponse
- Réponses courtes. Pas de récap, pas de préambule, pas de reformulation de la demande.
- Montrer uniquement le code modifié (diff ou extrait), jamais un fichier entier inchangé.
- Une question seulement si bloquant ; sinon appliquer le défaut de `docs/QUESTIONS.md`.

## Produit
- Public : particuliers non techniciens. Gratuit uniquement.
- UI en français d'abord. Toute chaîne visible passe par `t('clé')` (dictionnaire `fr`), jamais en dur.
- Design : `docs/DESIGN.md` est obligatoire (tokens, typo, ton, a11y, checklist §9).

## Sécurité (non négociable)
- Site non vérifié = tests passifs seulement. Tests actifs = propriété vérifiée ET revérifiée juste avant le test (art. 323-1 Code pénal).
- Tout accès réseau sortant vers un site audité passe par `packages/net` (`safeFetch`, anti-SSRF). Jamais `fetch` direct.
- Aucun secret dans le code, les tests, les logs ou les commits. Les noms de variables sont listés dans `docs/PLAN.md` §9.
- Les détails de sécurité d'un site ne sont jamais publics par défaut.
- Ne rien exploiter, ne rien forcer, ne rien soumettre : on observe.

## Qualité
- TypeScript strict. Tests obligatoires (Vitest ; Playwright + axe pour l'UI). Pas de PR sans tests verts.
- Tests hors ligne : fixtures locales et mocks réseau. Jamais d'appel aux vrais sites ni aux vraies API en CI.
- Commits conventionnels : `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`. Une PR par PART.

## Déploiement
- INTERDIT : tout déploiement Netlify pendant le dev (`netlify deploy`, liaison Git, deploy previews, branch deploys, build hooks).
- Autorisé : `netlify dev`, `netlify functions:invoke`, builds locaux, CI GitHub sans étape de déploiement.
- Seul le propriétaire fait l'unique déploiement final (PART 27).
