# Audixio — Règles strictes (gelées 2026-10-28)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Palette **v2** = référence couleurs (`design/design-elements/palette-foundations-v2.*` : boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`). Les couleurs pétrole / pêche (teal) de ce fichier sont **remplacées**.
> - Thème **clair par défaut**, suit `prefers-color-scheme`, le choix manuel gagne. Thème sombre complet = **plus tard**.
> - Vérification de propriété = **5 méthodes** : Google Search Console (recommandée, OAuth lecture seule « siteOwner »), DNS TXT, balise meta, fichier HTML à la racine, fichier `.well-known`. Remplace les « vagues » de preuves du 28/10 et « GSC ≠ vérification » du 27/10.

Toute implémentation Cursor **doit** respecter ce fichier. En cas de conflit avec une maquette Stitch **sur le chrome** (nav, logo, footer, thème), **ce fichier gagne**. Sur le **body**, coller au HTML+PNG Stitch (pixel-perfect).

Voir aussi : [`workflow-Cursor-shell-pages-motion.md`](workflow-Cursor-shell-pages-motion.md) (agents, anims) · [`couleurs-palette-et-phrases-Cursor.md`](couleurs-palette-et-phrases-Cursor.md) (couleurs + phrases) · [`06-BACKLOG.md`](06-BACKLOG.md).

> **Soft-gate PARTIEL + lock (28 oct 2026 soir)** : `SOFT-GATE-PARTIEL-CANON.md` + **`MATRICE-STATUT-DROITS-CANON.md`** + `docs/produit/FONCTIONNEMENT.md`. Invalide soft-gate total / « pas de détail avant vérif » / « non vérifié = pas de brief » / « hub PARTIEL Stitch séparé ».

## 1. Stitch gelé

- **INTERDIT** : relancer Stitch pour nav, logo, dark, chrome global.
- Maquettes : `maquettes/<dossier>/code.html` + `screen.png` = référence **body**.
- Dark validé owner = PNG `assets/dark-ref-*.png` + `../archive/audigy-titled-2026-10-28/dark-theme-tokens.md` (archive).

## 2. Navigation CANON (desktop + mobile sticky)


## 2bis. Référence visuelle header (owner 2026-10-28)

## 2ter. Mobile (owner 2026-10-28)

## 2quater. Footer

Compact uniquement — [`FOOTER-CANON-compact.md`](maquettes/chrome/FOOTER-CANON-compact.md) + PNG `chrome-footer-canon-light.png`. Interdit : mega footer 5 colonnes, Audixio, V2.6, carbone inventé.


- **Haut :** logo + FR|EN · thème · Connexion — [`assets/chrome-mobile-top-bar.png`](maquettes/chrome/chrome-mobile-top-bar.png).
- **Bas sticky :** Accueil · Méthode · Sites suivis · Tarifs (icônes) — [`assets/chrome-mobile-bottom-nav.png`](maquettes/chrome/chrome-mobile-bottom-nav.png).
- **Flèche remonter** sticky : [`assets/chrome-mobile-back-to-top.png`](maquettes/chrome/chrome-mobile-back-to-top.png) (squircle blanc, flèche haut), au-dessus de la bottom nav.
- Détail : [`NAV-CANON-desktop-et-mobile.md`](maquettes/chrome/NAV-CANON-desktop-et-mobile.md).
- La bottom sticky **canon** n’est **pas** l’interdite `Diagnostic · Méthode · Sites · Compte`.

- Layout : [`assets/chrome-header-canon-light.png`](maquettes/chrome/chrome-header-canon-light.png) + [`NAV-CANON-desktop-et-mobile.md`](maquettes/chrome/NAV-CANON-desktop-et-mobile.md).
- Ordre : lockup gauche · Accueil · Méthode · Sites suivis · Tarifs · FR|EN · thème · Connexion (ou Compte si session).
- Item page active = pilule accent (palette v2) (ex. Accueil sur `/`).
- **Logo fichiers** = `logos/audixio-logos/out/` (`Audixio_PC_clair_h*.png` / `Audixio_PC_sombre_h*.png`) — ne pas reproduire un wordmark contour blanc du PNG s’il diverge du pack.

Libellés exacts, dans cet ordre :

> **Accueil · Méthode · Sites suivis · Tarifs** | **FR/EN** · thème · **Connexion** (ou **Compte** si session)

- **1 seul** `AppHeader` partagé partout.
- Header : logo officiel + mot **Audixio** seul (pas de tagline sous le nom).
- **Forme :** barre **flottante encadrée** (coins arrondis, bordure) ; liens nav au **milieu** de l’encadré — voir [`NAV-CANON-desktop-et-mobile.md`](maquettes/chrome/NAV-CANON-desktop-et-mobile.md) + PNG canon.
- Police UI : **Inter**.
- **Mobile :** bottom sticky = les 4 destinations (icônes) ; top = logo + FR/EN · thème · Connexion/Compte — voir `NAV-CANON-desktop-et-mobile.md` (pas drawer hamburger pour la nav principale).
- **Tarifs** (30/10/2026) remplace « Documentation » : mène à la page Pro (`maquettes/finales/page_pro/`) ; la popup `interface_passer_pro` = limite atteinte seulement. Méthode, guides et pages légales restent joignables via Méthode et le footer. Pas de 5ᵉ item.

### INTERDIT en nav (header, drawer, bottom-bar)

| Interdit | Pourquoi |
|----------|----------|
| Audit actif | Famille B Stitch |
| Historique | Famille B |
| Générateur Brief | Famille B |
| Item **Progression** | Progression = flux, pas entrée nav |
| Blog / Actu | Hors produit |
| Bottom-bar `Diagnostic · Méthode · Sites · Compte` | Alternative mobile non canon |

## 3. Logo

- **UNIQUEMENT** : pack `logos/audixio-logos/out/` (détourages owner 2026-10-28).
  - Header light : `Audixio_PC_clair_h*.png`
  - Header dark : `Audixio_PC_sombre_h*.png`
  - Compact / mobile / favicon : `Audixio_mark_*.png` + fichiers `favicon*` / `icon-*`
- **INTERDIT** : Material Symbols `vital_signs`, `ecg_heart`, `graphic_eq`, `shield`, `verified` ; lettre **A** générique ; SVG « ECG » ; JPG legacy `assets/logo-*.jpg` ; régénérer les PNG.
- Palette UI : palette v2 (`design-elements/palette-foundations-v2.*`) (Stitch = **structure**, pas source absolue des couleurs — remap hex Stitch → tokens).
- Phrases / copy : même agent page ; nits + ton produit — `couleurs-palette-et-phrases-Cursor.md` (pas d'agent textes seuls).
- Détail : `05-LOGO.md` + `05-LOGO.md` + `couleurs-palette-et-phrases-Cursor.md`.


## 4. Fidélité Stitch (body)

- Cursor = **pixel-perfect** sur le body : `code.html` + `screen.png` ouverts ensemble.
- Remplacer seulement le shell Stitch par les composants partagés.
- Brancher moteur / API / i18n `t('…')` sans réinventer la mise en page.
- Ignorer `screen.png` cassés (≤100 o) — se fier au HTML + checklist.

## 5. Thèmes

- Light = Arc Soft figé (`03-THEME-LIGHT-ARC-SOFT.md`, PR #66).
- Dark = tokens owner (`04-THEME-DARK.md`).
- Toggle : anti-FOUC.
- **INTERDIT** : violet AI-slop ; emoji décoratifs ; noir plat `#000` plein écran.

## 6. Accessibilité & contraste

- Texte primaire ≥ **4,5:1** (AA) ; UI significative ≥ 3:1.
- Statut **jamais couleur seule**.
- Skip links (Accueil, Rapport, Progression) — étendre progressivement.
- `prefers-reduced-motion` obligatoire dès qu'il y a du mouvement.

## 7. Animations

- Avec la page : uniquement transitions déjà présentes dans le HTML Stitch.
- Wow ciblé (hero, jauge) = agent **motion** après les pages — pas partout.
- Détail : `workflow-Cursor-shell-pages-motion.md` §6.

## 8. Hors scope (ne pas implémenter « en passant »)

- Compte multi-sites + liaison GSC données (GSC / OAuth hébergeur comme preuve = **plus tard** ; immédiat = fichier + meta + lien HTML ; DNS = vague suivante).
- Polish non demandé (`07-PLUS-TARD.md`).
- Anims lourdes décoratives globales.

## 9. États maquette vs produit

- Stitch = souvent **exemple** (connecté, Pro, sites remplis, parfois domaines sensibles ouverts à tort).
- **Défaut** : non connecté → header **Connexion**, pas Compte/avatar fictif.
- Droits : brancher **capabilities serveur** vs `MATRICE-STATUT-DROITS-CANON.md` ; UI **Verrouillé** si gated.
- Pro / courbes / historique long : seulement si Pro.
- Rapport : maquettes `page_rapport_hub` etc. = design COMPLET ; Cursor design les variants locked.
- Détail : `couleurs-palette-et-phrases-Cursor.md` + soft-gate canon.

## 10. Instruction Cursor (droits)

- Implémenter status checks contre la **matrice**.
- Designer variants **Verrouillé** pour chaque capacité gated.
- Ne **pas** shipper le texte des findings sensibles dans les vues locked.
- Soften teasers locked (pas HSTS/X-Frame) ; lettres A–F ; hub TOP 10 titres.
