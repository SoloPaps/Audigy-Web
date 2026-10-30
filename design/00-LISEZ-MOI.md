# Audixio — Pack design (2026-10-26, maj logos + soft-gate/lock 2026-10-28 soir, Europe/Paris)

Pack **autonome** pour implémenter shell UI + thème sombre + logo dans Cursor **sans relancer Stitch**.

## Contenu

| Fichier | Rôle |
|---------|------|
| `01-REGLES-STRICTES.md` | Interdits / obligatoires (nav, logo, dark, contraste) |
| `02-PAGES.md` | Chaque écran : objectif, checklist, dossiers `maquettes/page_*` (INDEX) |
| `03-THEME-LIGHT-ARC-SOFT.md` | Tokens light Arc Soft (ivory→ice-blue, glass, blobs) |
| `04-THEME-DARK.md` | Tokens dark figés owner + refs PNG + toggle anti-FOUC |
| [`NAV-CANON-desktop-et-mobile.md`](maquettes/chrome/NAV-CANON-desktop-et-mobile.md) | Header desktop + mobile sticky + flèche ; PNG `assets/chrome-*.png` |
| `05-LOGO.md` | Pack logos Audixio (`logos/`) + usages + interdits |
| `05-LOGO.md` | Étapes shell → pages → motion (logo figé) |
| `couleurs-palette-et-phrases-Cursor.md` | Couleurs (tokens / remap Stitch) + phrases / copy |
| `SOFT-GATE-PARTIEL-CANON.md` | **Canon soft-gate PARTIEL** + lock-components (28 oct 2026 soir) |
| `MATRICE-STATUT-DROITS-CANON.md` | **SSOT** statut → droits / capabilities / UI Verrouillé |
| `06-BACKLOG.md` | Nits Cursor page par page (reviews Stitch) |
| `logos/` | ZIP + `audixio-logos/src` + `out` (détourages owner) |
| `06-BACKLOG.md` | P0 / P1 / P2 + DoD (Pro épuisé) |
| 07-PLUS-TARD.md | **Archivé** → [../archive/audigy-titled-2026-10-28/07-PLUS-TARD.md](../archive/audigy-titled-2026-10-28/07-PLUS-TARD.md) |
| 08-MANIFEST.md | **Archivé** → [../archive/audigy-titled-2026-10-28/08-MANIFEST.md](../archive/audigy-titled-2026-10-28/08-MANIFEST.md) |
| `assets/` | Refs dark PNG ; **logos officiels = `logos/`** (JPG legacy plus pour le chrome) |
| `maquettes/` | Modèles visuels Stitch extraits (`screen.png` + `code.html`). À lire avec le code. |
| 
efs/ | **Archivé** → [../archive/audigy-titled-2026-10-28/](../archive/audigy-titled-2026-10-28/) (tokens dark, MonScore, bugs nov, audit Stitch) |

## Usage Cursor

1. Lire **d’abord** `01-REGLES-STRICTES.md` (non négociable). En conflit avec une maquette, **ce fichier gagne**.
2. Pour chaque page : `02-PAGES.md` + le `screen.png` + `code.html` de `maquettes/` (ouverts ensemble). **Body = pixel-perfect** sur structure, spacing, cartes, CTA (`code.html` + `screen.png`). **Couleurs = tokens** (COULEURS-PHRASES / palette v2), pas couleurs Stitch absolues. **Chrome** (header/footer/logo/nav) = `01-REGLES-STRICTES.md`. Ignorer les PNG invalides ou ≤ 100 octets (`maquettes/README.md`).
3. Les fonctionnalités viennent de `docs/produit/FONCTIONNEMENT.md` + **`MATRICE-STATUT-DROITS-CANON.md`** + `etapes-refonte/` (2 sites / 1 lien, soft-gate PARTIEL, **un design COMPLET + Verrouillé**, hub TOP 10, sélection sync, brief matrice, Pro plus tard, vie privée partielle HTTP/HTML (bêta ; sans DDG ni navigateur)), pas des pixels. Canon : `SOFT-GATE-PARTIEL-CANON.md` + matrice + `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/ (historique ; **canon** = `SOFT-GATE-PARTIEL-CANON.md` + `MATRICE-…`)`.
4. Appliquer light (`03`) partout ; dark (`04` + PNG) sur toutes les pages via tokens CSS + toggle.
5. Remplacer tout logo Material / SVG / JPG legacy par le pack `logos/audixio-logos/out/` (`05`, `05-LOGO.md`). Marque UI : **Audixio**.
5bis. Couleurs = tokens palette v2 (remap Stitch) ; phrases = nits dans l’agent page — `couleurs-palette-et-phrases-Cursor.md`.
6. Suivre `06-BACKLOG.md` dans l’ordre P0→P2. **Pas d’on-demand Cursor** sans OK owner.

## Stitch = gelé

- Owner : Stitch ne peut pas mieux / plus de designs nav / logo / dark. Ne pas le relancer.
- Modèles visuels : `maquettes/` (+ rapport 5 écrans 28 oct). Body = structure Stitch ; couleurs = tokens ; chrome = `01-REGLES-STRICTES.md`. Droits = matrice + lock components.
- Deux écrans sans PNG valide (exports de 28 octets omis, signalés par `SCREEN-INVALID.txt`). Les ignorer.
- Audit lot4 (preuves) : résumé dans `../archive/audigy-titled-2026-10-28/audit-stitch-cursor-2026-10-26.md`.

## Forfait Pro Cursor

**Épuisé le 26 octobre 2026 (Europe/Paris).**  
Ne pas lancer d’agent / CloudAgent / on-demand **sans OK explicite** de l’owner. Documenter et attendre.

## Hors scope de ce pack

- Compte multi-sites + Google Search Console (voir archive `../archive/audigy-titled-2026-10-28/07-PLUS-TARD.md`).
- Les règles produit (domaines, quotas, copy) sont dans `docs/produit/FONCTIONNEMENT.md`.

## Fidélité visuelle (doctrine unique)

> **Body = pixel-perfect** sur structure, spacing, cartes, CTA (`code.html` + `screen.png`). **Couleurs = tokens** (COULEURS-PHRASES / palette v2), pas couleurs Stitch absolues. **Chrome** (header/footer/logo/nav) = `01-REGLES-STRICTES.md`.

- **Cursor (agents / pixel-perfect / anims)** : [`workflow-Cursor-shell-pages-motion.md`](workflow-Cursor-shell-pages-motion.md)

- Mobile chrome : [`NAV-CANON-desktop-et-mobile.md`](maquettes/chrome/NAV-CANON-desktop-et-mobile.md) § Mobile + `assets/chrome-mobile-top-bar.png` + `assets/chrome-mobile-bottom-nav.png`.

- Footer compact : [`FOOTER-CANON-compact.md`](maquettes/chrome/FOOTER-CANON-compact.md) + `assets/chrome-footer-canon-light.png`.
