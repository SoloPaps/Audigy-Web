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
| `maquettes/` | Modèles visuels Stitch extraits (`screen.png` + `code.html`). À lire avec le code. |
| `refs/` | DESIGN Stitch Arc Pure, tokens dark, audit, bugs nov, ref MonScore |

## Usage Cursor

1. Lire **d’abord** `01-REGLES-STRICTES.md` (non négociable). En conflit avec une maquette, **ce fichier gagne**.
2. Pour chaque page : `02-PAGES.md` + le `screen.png` de `maquettes/` (modèle visuel **lisible**, à ouvrir avec le code) — **proche**, pas calque 1:1. Ignorer les PNG invalides ou ≤ 100 octets (`maquettes/README.md`).
3. Les fonctionnalités nouvelles viennent de `docs/FONCTIONNEMENT.md` et `docs/etapes-refonte/` (2 sites / 1 lien, soft-gate, brief IA gratuit avec compte, Pro plus tard, vie privée option C), pas des pixels.
4. Appliquer light (`03`) partout ; dark (`04` + PNG) sur toutes les pages via tokens CSS + toggle.
5. Remplacer tout logo Material / SVG inventé par `assets/logo-icon.jpg` + `logo-lockup.jpg` (`05`).
6. Suivre `06-BACKLOG-CURSOR.md` dans l’ordre P0→P2. **Pas d’on-demand Cursor** sans OK owner.

## Stitch = gelé

- Owner : Stitch ne peut pas mieux / plus de designs nav / logo / dark. Ne pas le relancer.
- Modèles visuels **dans le dépôt** : `maquettes/` (31 `screen.png` valides + `code.html`). Les agents les lisent comme référence d’écran, à côté du code. Pas un clone pixel-perfect.
- Deux écrans sans PNG valide (exports de 28 octets omis, signalés par `SCREEN-INVALID.txt`). Les ignorer.
- Audit lot4 (preuves) : résumé dans `refs/audit-stitch-cursor-2026-10-26.md`.

## Forfait Pro Cursor

**Épuisé le 26 octobre 2026 (Europe/Paris).**  
Ne pas lancer d’agent / CloudAgent / on-demand **sans OK explicite** de l’owner. Documenter et attendre.

## Hors scope de ce pack

- Compte multi-sites + Google Search Console (voir `07-PLUS-TARD.md`).
- Calque pixel-perfect des maquettes. Les règles produit sont dans `docs/FONCTIONNEMENT.md`.
