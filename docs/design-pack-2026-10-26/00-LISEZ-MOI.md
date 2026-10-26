# Audigy — Pack design (2026-10-26, Europe/Paris)

Pack **autonome** pour implémenter shell UI + thème sombre + logo dans Cursor **sans relancer Stitch**.

## Contenu

| Fichier | Rôle |
|---------|------|
| `01-REGLES-STRICTES.md` | Interdits / obligatoires (nav, logo, dark, contraste) |
| `02-PAGES.md` | Chaque écran : objectif, checklist, D/M canon, chemin stitch5 |
| `03-THEME-LIGHT-ARC-SOFT.md` | Tokens light Arc Soft (ivory→ice-blue, glass, blobs) |
| `04-THEME-DARK.md` | Tokens dark figés owner + refs PNG + toggle anti-FOUC |
| `05-LOGO.md` | Assets officiels + usages + interdits Material |
| `06-BACKLOG-CURSOR.md` | P0 / P1 / P2 + DoD (Pro épuisé) |
| `07-PLUS-TARD.md` | Multi-sites+GSC, bugs nov, go-live |
| `08-MANIFEST.md` | Inventaire fichiers + tailles + sha256 assets |
| `assets/` | `logo-icon.jpg`, `logo-lockup.jpg`, `dark-ref-accueil.png`, `dark-ref-progression.png` |
| `refs/` | DESIGN Stitch Arc Pure, tokens dark, audit, bugs nov, ref MonScore |

## Usage Cursor

1. Lire **d’abord** `01-REGLES-STRICTES.md` (non négociable).
2. Pour chaque page : `02-PAGES.md` + maquette HTML sous `/tmp/audigy-stitch5/` (si dispo) — **proche**, pas calque 1:1.
3. Appliquer light (`03`) partout ; dark (`04` + PNG) sur toutes les pages via tokens CSS + toggle.
4. Remplacer tout logo Material / SVG inventé par `assets/logo-icon.jpg` + `logo-lockup.jpg` (`05`).
5. Suivre `06-BACKLOG-CURSOR.md` dans l’ordre P0→P2. **Pas d’on-demand Cursor** sans OK owner.

## Stitch = gelé

- Owner : Stitch ne peut pas mieux / plus de designs nav / logo / dark.
- Lot final HTML : `/tmp/audigy-stitch5/stitch_audigy_web_audit_platform/` (33 `code.html` — **non inclus** dans ce ZIP).
- Audit lot4 (preuves) : `/tmp/audigy-stitch4/AUDIT.md` (score 6,5/10) — résumé dans `refs/audit-stitch-cursor-2026-10-26.md`.

## Forfait Pro Cursor

**Épuisé le 26 octobre 2026 (Europe/Paris).**  
Ne pas lancer d’agent / CloudAgent / on-demand **sans OK explicite** de l’owner. Documenter et attendre.

## Hors scope de ce pack

- ZIP des 33 HTML Stitch (trop lourds ; chemins listés dans `02-PAGES.md`).
- Compte multi-sites + Google Search Console (voir `07-PLUS-TARD.md`).
- Calque pixel-perfect Stitch.
