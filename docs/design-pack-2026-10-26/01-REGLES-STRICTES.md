# Audigy - Règles strictes (gelées 2026-10-27)

Toute implémentation Cursor **doit** respecter ce fichier. En cas de conflit avec une maquette Stitch **sur le chrome** (nav, logo, footer, thème), **ce fichier gagne**. Sur le **body**, coller au HTML+PNG Stitch (pixel-perfect).

Voir aussi : [`CURSOR-IMPL.md`](CURSOR-IMPL.md) (agents, anims, copy).

## 1. Stitch gelé

- **INTERDIT** : relancer Stitch pour nav, logo, dark, chrome global.
- Maquettes : `maquettes/<dossier>/code.html` + `screen.png` = référence **body**.
- Dark validé owner = PNG `assets/dark-ref-*.png` + `refs/dark-theme-tokens.md`.

## 2. Navigation CANON (desktop + drawer mobile)

Libellés exacts, dans cet ordre :

> **Accueil · Méthode · Sites suivis · Documentation** | **FR/EN** · thème · **Connexion** (ou **Compte** si session)

- **1 seul** `AppHeader` partagé partout.
- Header : logo officiel + mot **Audigy** seul (pas de tagline sous le nom).
- Police UI : **Inter**.
- Drawer mobile = les mêmes items + FR/EN.
- Documentation = hub (méthode + guides + légales) — pas un 6ᵉ item inventé.

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

- **UNIQUEMENT** : `assets/logo-icon.jpg` (carré) + `assets/logo-lockup.jpg` (horizontal).
- **INTERDIT** : Material Symbols `vital_signs`, `ecg_heart`, `graphic_eq`, `shield`, `verified` ; lettre **A** générique isolée ; SVG « ECG » inventés.
- Détail : `05-LOGO.md`.

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
- Détail : `CURSOR-IMPL.md` §6.

## 8. Hors scope (ne pas implémenter « en passant »)

- Compte multi-sites + liaison GSC données (GSC comme preuve de propriété = autre chantier).
- Polish non demandé (`07-PLUS-TARD.md`).
- Anims lourdes décoratives globales.
