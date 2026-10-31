# Logos + workflow Cursor (gelé 2026-10-28)

Complète `workflow-Cursor-shell-pages-motion.md`. Owner validé.
Couleurs + phrases : [`couleurs-palette-et-phrases-Cursor.md`](../../design/couleurs-palette-et-phrases-Cursor.md). Nits page : [`restes-a-faire-par-page-Cursor.md`](../../design/06-BACKLOG.md).

## Ordre obligatoire

1. **Agent shell (une fois)**
   - `AppHeader` + footer partagés, Inter, thème light/dark + toggle.
   - Logo = fichiers officiels `logos/audixio-logos/out/` (PC clair/sombre selon thème ; mark pour compact/favicon).
   - Tokens couleur = pétrole + pêche du logo (`05-LOGO.md`, `DESIGN.md`) — **poser ici**, pas page par page.
   - Titre marque UI : **Audixio**.
   - **Figer** le shell avant toute page.

2. **Un agent par page**
   - Body = `maquettes/<dossier>/code.html` + `screen.png` pixel-perfect (**structure**).
   - Couleurs = tokens shell (Stitch ≠ source absolue des hex).
   - Remplacer header/footer Stitch par le shell partagé — **ne pas redessiner ni retoucher le logo**.
   - Nits **copy** de la page uniquement (même agent).

3. **Agent motion (après les pages)**
   - Anims légères ciblées (Accueil/hero, jauge).
   - **Ne pas toucher** aux PNG logo ni aux tokens couleur.

## Ne jamais

- Régénérer / « améliorer » les PNG logo
- Remplacer le lockup PNG par du texte « Audixio » stylé
- Copier les hex Stitch hors charte sans remap
- Un agent « toutes les pages » ou un agent « textes seuls » en parallèle du shell

## États

Maquette Stitch = souvent démo connectée/Pro. **Défaut produit : non connecté.** Voir `couleurs-palette-et-phrases-Cursor.md`.

## Header layout (owner)

Référence structure : [ssets/chrome-header-canon-light.png](../../design/maquettes/chrome/chrome-header-canon-light.png) + [NAV-CANON-desktop-et-mobile.md](../../design/maquettes/chrome/NAV-CANON-desktop-et-mobile.md).
Brancher le **lockup** Audixio_PC_clair_h*.png / Audixio_PC_sombre_h*.png (pas un wordmark re-dessiné d’après le PNG).
