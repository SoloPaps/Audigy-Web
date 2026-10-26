# Étape 02 — Chrome UI (AppHeader)

## Objectif

Un seul chrome : navigation, logos officiels, i18n des libellés, drawer mobile = desktop. Backlog P0 du design pack.

## Fichiers à lire

- `docs/design-pack-2026-10-26/01-REGLES-STRICTES.md`
- `docs/design-pack-2026-10-26/05-LOGO.md`
- `docs/design-pack-2026-10-26/06-BACKLOG-CURSOR.md` (P0)
- `docs/DESIGN.md` (sections chrome / header)
- Composants header existants sous `apps/web/` (chemins exacts à lister en une ligne avant ouverture)

## À faire

1. Un `AppHeader` partagé sur toutes les pages concernées.
2. Libellés exacts : **Accueil · Méthode · Sites suivis · Documentation** | **FR/EN** · **Connexion**.
3. Drawer mobile = les 5 items + FR/EN (pas de famille B, pas Progression en nav).
4. Remplacer icônes Material / SVG inventés par `logo-icon.jpg` / `logo-lockup.jpg` (assets pack ; pas de dossier marque sous `public/` inventé hors décision).
5. i18n : libellés via `t()`.

## Critères de done

- [ ] Une seule source de nav (pas de headers divergents Rapport vs Accueil)
- [ ] Aucun item interdit en header / drawer / bottom-bar
- [ ] Logos officiels visibles
- [ ] Tests UI / a11y verts sur le chrome
- [ ] Checklist design pack P0 chrome cochée

## Interdits

- Relancer Stitch pour « aligner » la nav
- Ajouter Blog, Progression (item), Générateur Brief en nav
- Implémenter `07-PLUS-TARD.md` (multi-sites GSC, etc.)
