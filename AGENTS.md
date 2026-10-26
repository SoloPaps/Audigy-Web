# AGENTS.md — Audigy

Lire ce fichier, puis seulement la PART demandée dans `docs/PLAN.md`. Ne pas lire tout le repo.

## Style de réponse
- Réponses courtes. Pas de récap, pas de préambule, pas de reformulation de la demande.
- Montrer uniquement le code modifié (diff ou extrait), jamais un fichier entier inchangé.
- Une question seulement si bloquant ; sinon appliquer le défaut de `docs/QUESTIONS.md`.

## Produit
- Public : particuliers non techniciens. Gratuit uniquement.
- UI en français d'abord. Toute chaîne visible passe par `t('clé')` (dictionnaire `fr`), jamais en dur.
- Design : `docs/DESIGN.md` est obligatoire (tokens clair, typo, ton, a11y, checklist §9). Le sombre gelé est le §2.4.
- Avant toute UI (chrome, nav, logo, thème) : `docs/design-pack-2026-10-26/01-REGLES-STRICTES.md`. En conflit avec une maquette Stitch, ce fichier gagne. Index : `docs/design-pack-2026-10-26/00-LISEZ-MOI.md`.

## Design gelé (2026-10-26)

Stitch est gelé. Ne pas le relancer pour la nav, le logo ou le sombre. Cursor reste proche des checklists de `02-PAGES.md`, pas un calque 1:1. Le clair Arc Soft (PR #66, `ef52ddbf`) ne se réécrit pas. Pas d'agent on-demand sans OK owner (Pro épuisé le 26 oct. 2026).

- Un seul `AppHeader`. Libellés : Accueil · Méthode · Sites suivis · Documentation | FR/EN · Connexion. Drawer mobile = ces 5 items + FR/EN.
- INTERDIT en nav (header, drawer, bottom-bar) : Audit actif, Historique, Générateur Brief (famille B), item Progression, Blog / Actu, bottom-bar Diagnostic · Méthode · Sites · Compte.
- Logo uniquement : `docs/design-pack-2026-10-26/assets/logo-icon.jpg` et `logo-lockup.jpg`. INTERDIT : Material `vital_signs`, `ecg_heart`, `graphic_eq`, `shield`, `verified` ; lettre A isolée ; SVG « ECG » inventés.
- Sombre : tokens de `04-THEME-DARK.md` + PNG `assets/dark-ref-accueil.png` et `assets/dark-ref-progression.png`. Fond `#0F1620` → `#1A2332`, surface `#161E2C`, encre `#F0F2F5` / `#9AA3B2`, CTA `#2A9B96`. Pas de violet AI-slop, pas de `#000` plein écran.
- Backlog chrome : `06-BACKLOG-CURSOR.md` (P0 → P2). Ne pas implémenter `07-PLUS-TARD.md` en passant (multi-sites + GSC, bugs de novembre, go-live).

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
