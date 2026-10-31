# Agent 04 — Shell UI (une seule fois, avant toute page)

- **Modèle Cursor** : principal **Grok 4.7** · secours **Composer 2.5**.
- **Phase** : 4 (début, avant les pages). Exigé par `workflow-Cursor-shell-pages-motion.md` §1 (« un agent shell, une fois »).

## Docs à lire en premier
1. `docs/design/01-REGLES-STRICTES.md`
2. `docs/design/workflow-Cursor-shell-pages-motion.md` §1–3
3. `docs/design/maquettes/chrome/NAV-CANON-desktop-et-mobile.md` + `FOOTER-CANON-compact.md`
4. `docs/design/05-LOGO.md` + `05-LOGO.md`
5. `docs/design/couleurs-palette-et-phrases-Cursor.md` §A
6. `docs/design/DESIGN.md` §2.1 / §2.4 (seulement) + `04-THEME-DARK.md`

## Ce qu'il doit faire
- `AppHeader` (barre flottante encadrée), `MobileTopBar`, `MobileBottomNav` (4 icônes), `BackToTop`, footer compact (V3.4).
- Tokens **palette v2 (boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`)** dans `apps/web/src/styles/tokens.css` ; thème **clair par défaut**, adapté **dès l'entrée** à `prefers-color-scheme` (script inline dans `<head>`, avant le rendu, anti-FOUC) ; sombre = tokens `04-THEME-DARK.md` ; toggle manuel conservé : choix mémorisé prioritaire sur le navigateur (décidé owner 2026-10-29).
- Police Inter auto-hébergée ; logo depuis `logos/audixio-logos/out/` uniquement.
- Défaut non connecté → **Connexion**.
- **Figer** le shell avant toute page.

## Interdits stricts
- Drawer hamburger pour la nav principale ; items Audit actif / Historique / Générateur Brief / Progression / Blog ; bottom-bar `Diagnostic · Méthode · Sites · Compte`.
- Material `vital_signs`/`ecg_heart`/`shield`…, JPG `assets/logo-*.jpg`, régénérer les PNG logo.
- Hex hors charte, violet, texte dégradé, emoji, Google Fonts.
- Relancer Stitch.

## Livrables
- Composants shell Astro/Svelte + tokens + i18n `t()`
- Tests Playwright + axe (0 violation) sur une page vide avec shell

## Checklist de fin
- [ ] Ordre nav exact, pilule teal sur item actif
- [ ] Clair par défaut sans préférence ; sombre auto si `prefers-color-scheme: dark` ; aucun flash au chargement
- [ ] Clair/sombre conformes, pas de `#000`
- [ ] `prefers-reduced-motion` respecté
- [ ] Checklist `docs/design/DESIGN.md` §9

## Handoff
→ **Agent 05 Intégration pages** (shell figé, ne plus y toucher).
