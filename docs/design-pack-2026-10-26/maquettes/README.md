# Maquettes Stitch (référence visuelle)

Stitch est **gelé** depuis le 26 octobre 2026. Ne pas le régénérer. Ces fichiers sont des **modèles visuels lisibles** : ouvrir `screen.png` en même temps que le code (hiérarchie, sections), puis implémenter les fonctionnalités de [`docs/FONCTIONNEMENT.md`](../../FONCTIONNEMENT.md) et [`docs/etapes-refonte/`](../../etapes-refonte/00-LISEZ-MOI.md) sur le code existant. Ce n’est **pas** un calque pixel-perfect.

Index des écrans : [`INDEX.md`](INDEX.md).

## Contenu

Chaque sous-dossier retenu = un écran (`screen.png` + `code.html`), déposé **extrait** (pas de ZIP dans le dépôt). 31 PNG valides.

`audigy_arc_pure/` est une note de direction (pas d’écran). Le clair vivant reste [`docs/DESIGN.md`](../../DESIGN.md) et [`03-THEME-LIGHT-ARC-SOFT.md`](../03-THEME-LIGHT-ARC-SOFT.md).

## PNG invalides — les ignorer

Deux exports de 28 octets ont été **omis** (aucun PNG ≤ 100 octets dans ce dossier). Un `SCREEN-INVALID.txt` le signale :

- `audigy_progression_de_l_audit_desktop_chec_partiel/` — se fier à `…_desktop_harmonis` et au mobile
- `audigy_rapport_d_audit_complet_mobile_conforme/` — se fier au desktop + `code.html`

Tout PNG minuscule ou corrompu qui réapparaîtrait est à ignorer.

## Règles (le pack gagne)

1. En conflit avec [`01-REGLES-STRICTES.md`](../01-REGLES-STRICTES.md) ou [`docs/DESIGN.md`](../../DESIGN.md), **les règles du pack et de la charte gagnent** (nav, logo, sombre, interdits Material).
2. Logo officiel uniquement : [`../assets/logo-icon.jpg`](../assets/logo-icon.jpg), [`../assets/logo-lockup.jpg`](../assets/logo-lockup.jpg).
3. Un seul `AppHeader` : Accueil · Méthode · Sites suivis · Documentation | FR/EN · Connexion.
4. Les **règles produit** ne se lisent pas dans les pixels. Source : [`docs/FONCTIONNEMENT.md`](../../FONCTIONNEMENT.md) — **2 sites / 1 lien**, **soft-gate**, **brief IA gratuit avec compte**, **Pro plus tard**, vie privée **option C**.

## Hors de ce dossier

- Logos officiels et refs sombres : `../assets/`
- Tokens dark : [`../04-THEME-DARK.md`](../04-THEME-DARK.md)
- Backlog code : [`../06-BACKLOG-CURSOR.md`](../06-BACKLOG-CURSOR.md)

Source : export owner, fichiers extraits dans le dépôt (pack maquettes, 26–27 octobre 2026).
