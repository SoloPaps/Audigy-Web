# Audigy — Règles strictes (gelées 2026-10-26)

Toute implémentation Cursor **doit** respecter ce fichier. En cas de conflit avec une maquette Stitch, **ce fichier gagne**.

## 1. Stitch gelé

- **INTERDIT** : relancer Stitch pour nav, logo, dark, chrome global.
- Les HTML sous `/tmp/audigy-stitch5/` sont des **références de contenu / layout**, pas une source de vérité chrome.
- Dark validé owner = uniquement les PNG `assets/dark-ref-*.png` + `refs/dark-theme-tokens.md`.

## 2. Navigation CANON (desktop + drawer mobile)

Libellés exacts, dans cet ordre :

> **Accueil · Méthode · Sites suivis · Documentation** | **FR/EN** · **Connexion**

- **1 seul** `AppHeader` partagé partout.
- Drawer mobile = **les mêmes 5 items** (Accueil, Méthode, Sites suivis, Documentation, Connexion) + FR/EN.
- Documentation peut pointer vers un hub (méthode + guides + légales) — pas un 6ᵉ item inventé.

### INTERDIT en nav (header, drawer, bottom-bar)

| Interdit | Pourquoi |
|----------|----------|
| Audit actif | Famille B Stitch |
| Historique | Famille B |
| Générateur Brief | Famille B |
| Item **Progression** | Progression = flux, pas entrée nav |
| Blog / Actu | Hors produit |
| Bottom-bar `Diagnostic · Méthode · Sites · Compte` | Alternative mobile non canon |

Écran archive (ne pas copier le chrome) : `audigy_rapport_desktop_avec_brief_ia_sauvegarde` (famille B).

## 3. Logo

- **UNIQUEMENT** : `assets/logo-icon.jpg` (carré) + `assets/logo-lockup.jpg` (horizontal).
- **INTERDIT** : Material Symbols `vital_signs`, `ecg_heart`, `graphic_eq`, `shield`, `verified` ; lettre **A** générique isolée comme marque ; SVG « ECG » inventés.
- Détail usages : `05-LOGO.md`.

## 4. Fidélité Stitch

- Cursor = **proche** des maquettes (hiérarchie, sections, features listées dans `02-PAGES.md`).
- **PAS** un calque 1:1 pixel-perfect.
- Ignorer `screen.png` cassés (ex. rapport mobile conforme = **28 o** FIFE) — se fier au HTML + checklist.

## 5. Thèmes

- Light = Arc Soft figé (`03-THEME-LIGHT-ARC-SOFT.md`, PR #66 `ef52ddbf` comme ancre repo si présent).
- Dark = tokens owner figés (`04-THEME-DARK.md`) — pas inventer une palette.
- Toggle thème : anti-FOUC (script inline avant paint / `class` sur `<html>`).
- **INTERDIT** : violet AI-slop (`#6366F1`, `#8B5CF6`, etc.) ; emoji décoratifs ; noir plat `#000` plein écran.

## 6. Accessibilité & contraste

- Texte primaire ≥ **4,5:1** (AA) ; UI significative ≥ 3:1.
- Statut **jamais couleur seule** (forme + libellé).
- Skip links sur pages principales (Accueil, Rapport, Progression) — étendre progressivement.
- Focus visible `#C2410C` (light) / glow pétrole dark.

## 7. Hors scope (ne pas implémenter « en passant »)

- Compte multi-sites + liaison Google Search Console.
- On-demand / CloudAgent sans OK owner (Pro épuisé 26 oct 2026).
- Polish non demandé (pause nov. — voir `07-PLUS-TARD.md`).
