# Étape 02 — Chrome UI (AppHeader)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Palette **v2** = référence couleurs (`design/design-elements/palette-foundations-v2.*` : boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`). Les couleurs pétrole / pêche (teal) de ce fichier sont **remplacées**.
> - Thème **clair par défaut**, suit `prefers-color-scheme`, le choix manuel gagne. Thème sombre complet = **plus tard**.

## Objectif

Un seul chrome (desktop encadré + mobile sticky — `NAV-CANON-desktop-et-mobile.md`) : navigation, logos officiels Audixio (`docs/design/logos/audixio-logos/out/`), tokens pétrole/pêche, i18n des libellés, drawer mobile = desktop. Backlog P0 du design pack.

## Fichiers à lire

- `docs/design/01-REGLES-STRICTES.md`
- `docs/design/05-LOGO.md`
- `docs/design/05-LOGO.md`
- `docs/design/couleurs-palette-et-phrases-Cursor.md`
- `docs/design/workflow-Cursor-shell-pages-motion.md`
- `docs/design/06-BACKLOG.md` (P0)
- `docs/design/DESIGN.md` (sections chrome / header / couleurs)
- Composants header existants sous `apps/web/` (chemins exacts à lister en une ligne avant ouverture)

## Référence visuelle

- [docs/design/maquettes/chrome/chrome-header-canon-light.png](../design/maquettes/chrome/chrome-header-canon-light.png)
- [docs/design/maquettes/chrome/NAV-CANON-desktop-et-mobile.md](../design/maquettes/chrome/NAV-CANON-desktop-et-mobile.md)
- Logo = logos/audixio-logos/out/Audixio_PC_clair_h*.png (clair) — structure = PNG ; fichiers logo = pack.

## À faire

1. Un `AppHeader` partagé sur toutes les pages concernées.
1bis. Forme = barre flottante **encadrée** ; liens Accueil…Tarifs au **milieu** (PNG canon + `NAV-CANON-desktop-et-mobile.md`).
2bis. **Mobile :** top = logo + FR|EN · thème · Connexion ou Compte si session (`chrome-mobile-top-bar.png`) ; **bottom sticky** Accueil·Méthode·Sites suivis·Tarifs icônes (`chrome-mobile-bottom-nav.png`) ; **flèche remonter** sticky.
2ter. Flèche remonter mobile = `assets/chrome-mobile-back-to-top.png` (squircle blanc, flèche haut).
3bis. Drawer hamburger **pas** requis pour la nav principale (bottom sticky = les 4 destinations).
2. Libellés exacts : **Accueil · Méthode · Sites suivis · Tarifs** | **FR/EN** · **thème** · **Connexion** (ou **Compte** si session). Défaut non connecté = Connexion.
3. Mobile : bottom sticky 4 destinations + top utils (voir NAV-CANON) ; pas de famille B, pas Progression en nav. Drawer optionnel seulement si besoin hors nav principale.
4. Logos = pack `logos/audixio-logos/out/` uniquement (PC clair/sombre + mark) — **pas** les JPG `assets/logo-*.jpg`.
5. Tokens couleur palette v2 posés au shell (`couleurs-palette-et-phrases-Cursor.md`).
6. i18n : libellés via `t()`.

## Critères de done

- [ ] Footer compact = FOOTER-CANON (Audixio, V3.4, liens légaux ; pas mega / pas carbone inventé)

- [ ] Une seule source de nav (pas de headers divergents Rapport vs Accueil)
- [ ] Aucun item interdit en header / drawer / bottom-bar
- [ ] Header ≈ PNG canon (ordre, pilule active, FR|EN, thème, Connexion)
- [ ] Logos officiels Audixio visibles lockup out/ (pas JPG legacy / Material / wordmark inventé)
- [ ] Tokens palette v2 branchés (pas hex Stitch hors charte)
- [ ] Tests UI / a11y verts sur le chrome
- [ ] Checklist design pack P0 chrome cochée

## Interdits

- Relancer Stitch pour « aligner » la nav
- Ajouter Blog, Progression (item), Générateur Brief en nav
- Implémenter `07-PLUS-TARD.md` (multi-sites GSC, etc.)
