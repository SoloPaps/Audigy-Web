# Audixio — Logo officiel (validé owner 2026-10-28)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Palette **v2** = référence couleurs (`design/design-elements/palette-foundations-v2.*` : boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`). Les couleurs pétrole / pêche (teal) de ce fichier sont **remplacées**.

Marque produit : **Audixio**. Assets = détourages owner (alpha propre).
**Ne pas régénérer, recolorer, recadrer serré, ni remplacer par du texte / Material / SVG inventé.**

## Emplacement

```
docs/design/logos/audixio-logos/
  src/   # masters détourés owner
  out/   # exports prêts (transparent PNG + tailles)
```

ZIP miroir : `docs/design/logos/Audixio-logos-pack.zip`.

## Fichiers à utiliser (`out/`)

| Fichier | Rôle |
|---------|------|
| `Audixio_PC_clair_transparent.png` | Lockup complet clair (icône A + wordmark navy) — header / splash **thème light** |
| `Audixio_PC_sombre_transparent.png` | Lockup complet sombre (icône A + wordmark blanc) — header **thème dark** |
| `Audixio_PC_clair_h{32,40,48,64,80,96,128}.png` | Hauteurs prêtes light |
| `Audixio_PC_sombre_h{32,40,48,64,80,96,128}.png` | Hauteurs prêtes dark |
| `Audixio_mark_transparent.png` + `Audixio_mark_{16…512}.png` | Icône A seule (clair), centrée carré |
| `Audixio_mark_sombre_transparent.png` + `Audixio_mark_sombre_{16…512}.png` | Icône A seule (sombre) |
| `Audixio_mobile_clair_*.png` / `Audixio_mobile_sombre_*.png` | Idem mark, tailles mobile |
| `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Favicon / PWA (dérivés mark clair) |

Anciens JPG `assets/logo-icon.jpg` / `logo-lockup.jpg` : **obsolètes** — ne plus les brancher sur le shell.

## Usages Cursor

| Contexte | Asset | Notes |
|----------|-------|-------|
| `AppHeader` desktop light | `Audixio_PC_clair_h40.png` (ou h32–h48) | Lien Accueil ; hauteur ~32–40 px |
| `AppHeader` desktop dark | `Audixio_PC_sombre_h40.png` | Même hauteur |
| Header / drawer mobile | `Audixio_mark_40.png` (ou mobile_clair) | Carré net |
| Favicon / apple-touch / PWA | fichiers `favicon*` / `icon-*` / `apple-touch-icon` | Déjà exportés — ne pas reinventer |
| Empty / loading | mark clair ou sombre selon thème | Opacité douce OK |

Alt : **« Audixio »** (pas « logo » seul).

## Charte couleurs (liée au logo)

- Accent pétrole / teal-cyan du ruban A + accent **pêche** du trait.
- Le site **calibre sa palette sur le logo** (tokens palette v2 depuis le 29/10).
- HTML Stitch = **emplacements / structure** des blocs — **pas** la source absolue des couleurs.
- Étapes agents (couleurs + phrases) : [`couleurs-palette-et-phrases-Cursor.md`](couleurs-palette-et-phrases-Cursor.md).

## INTERDIT

- Material Symbols type ECG / shield / verified comme marque
- Lettre « A » générique ou wordmark redessiné en CSS à la place du PNG
- Recadrer jusqu’à couper le ruban ou la barre pêche
- Remplir les trous des lettres / triangle du mark
- Utiliser les JPG `assets/logo-*.jpg` pour le chrome


---

## Mode d'emploi logos pour Cursor (gelé 2026-10-28)

*(Fusionné depuis `logos-Audixio-mode-emploi-Cursor.md` le 29/10/2026.)*

Complète `workflow-Cursor-shell-pages-motion.md`. Owner validé.
Couleurs + phrases : [`couleurs-palette-et-phrases-Cursor.md`](couleurs-palette-et-phrases-Cursor.md). Nits page : [`06-BACKLOG.md`](06-BACKLOG.md).

### Ordre obligatoire

1. **Agent shell (une fois)**
   - `AppHeader` + footer partagés, Inter, thème light/dark + toggle.
   - Logo = fichiers officiels `logos/audixio-logos/out/` (PC clair/sombre selon thème ; mark pour compact/favicon).
   - Tokens couleur = **palette v2** (29/10 ; avant : pétrole + pêche du logo) (`05-LOGO.md`, `DESIGN.md`) — **poser ici**, pas page par page.
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

### Ne jamais

- Régénérer / « améliorer » les PNG logo
- Remplacer le lockup PNG par du texte « Audixio » stylé
- Copier les hex Stitch hors charte sans remap
- Un agent « toutes les pages » ou un agent « textes seuls » en parallèle du shell

### États

Maquette Stitch = souvent démo connectée/Pro. **Défaut produit : non connecté.** Voir `couleurs-palette-et-phrases-Cursor.md`.

### Header layout (owner)

Référence structure : [chrome-header-canon-light.png](maquettes/chrome/chrome-header-canon-light.png) + [NAV-CANON-desktop-et-mobile.md](maquettes/chrome/NAV-CANON-desktop-et-mobile.md).
Brancher le **lockup** Audixio_PC_clair_h*.png / Audixio_PC_sombre_h*.png (pas un wordmark re-dessiné d’après le PNG).
