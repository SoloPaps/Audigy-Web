# Audit profond docs Cursor — 2026-10-28 (repass 2)

Tu avais raison : le premier audit chrome était trop optimiste.

## Vrais problèmes trouvés (et corrigés)
1. `AGENTS.md` — encore « Drawer mobile = ces 5 items » alors que le mobile = bottom sticky.
2. `01-REGLES-STRICTES.md` — titre « desktop + drawer mobile » + ligne Drawer = mêmes items.
3. `.cursor/rules/00-core.mdc` — nav sans thème / Compte / sticky mobile.
4. `.cursor/rules/design.mdc` — encore formulation drawer pour nav principale.
5. `restes-a-faire-par-page-Cursor.md` + `logos-Audixio-mode-emploi-Cursor.md` — caractère BEL (`\x07`) devant `assets/` (lien cassé).
6. `00-LISEZ-MOI.md` — cellule tableau NAV-CANON markdown cassée.
7. `02-PAGES.md` — checklists « drawer = nav canon ».
8. `etapes-refonte/02-chrome-ui.md` — top mobile Connexion sans Compte si session.
9. `etapes-refonte/00-LISEZ-MOI.md` + `07-PLUS-TARD.md` + `08-MANIFEST.md` — titres encore Audigy.

## Restes volontairement non bloquants
- `design.mdc` : `alwaysApply: false` (globs `apps/web/**` seulement) — voulu si le shell n’est pas encore sous ces paths ; à repasser à true quand l’UI vit là.
- Mentions « drawer » dans listes d’INTERDITS (header/drawer/bottom-bar) = OK, ce sont des zones d’interdiction.
- JPG `assets/logo-*.jpg` encore listés dans MANIFEST avec bannière historique/checksum = OK.

## Vérifs OK
- 5 PNG chrome présents (header, mobile top/bottom, back-to-top, footer).
- `NAV-CANON-desktop-et-mobile.md` + `FOOTER-CANON-compact.md` cités et alignés sticky.
- Doctrine body pixel-perfect / couleurs tokens : OK sur LISEZ / design.mdc / 02-PAGES.
- 8 domaines CANON + pas « 100 % passif » prescrit : OK.

## Faux positifs du 1er script d’audit
Beaucoup de FAIL venaient de CHANGELOG / AUDIT-CHROME qui citent d’anciennes interdictions — filtrés.
