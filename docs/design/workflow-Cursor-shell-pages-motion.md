# Cursor — mode d’implémentation (gelé 2026-10-28)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Palette **v2** = référence couleurs (`design/design-elements/palette-foundations-v2.*` : boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`). Les couleurs pétrole / pêche (teal) de ce fichier sont **remplacées**.
> - Thème **clair par défaut**, suit `prefers-color-scheme`, le choix manuel gagne. Thème sombre complet = **plus tard**.

Décisions owner + Jojo. À appliquer avant toute PR UI.

Marque **Audixio**. Logos : `05-LOGO.md` (logos + mode d'emploi). Couleurs + phrases : `couleurs-palette-et-phrases-Cursor.md`.

## 1. Ordre des agents

1. **Un agent shell** (une fois) : `AppHeader`, footer, **logo officiel Audixio** (`logos/audixio-logos/out/`), police **Inter**, thème light/dark + **tokens palette v2** (`#3D52A0` / `#1E2A55` / `#7091E6` / `#8697C4` / `#ADBBDA` / `#EDE8F5` / `#4A5585`), toggle. Voir `05-LOGO.md` + `couleurs-palette-et-phrases-Cursor.md`.
2. **Un agent par page** : body Stitch + branche moteur/API + **nits copy** de cette page (remap couleurs → tokens).
3. **Un agent motion** (après les pages) : anims **légères** ciblées seulement.

**Interdit** : un agent « textes seuls » en parallèle des pages ; un agent « toutes les pages » ; un agent anim par page.

## 2. Ce qu’on donne à chaque agent page

- `docs/design/maquettes/<dossier>/code.html`
- le `screen.png` du même dossier
- Lien vers `01-REGLES-STRICTES.md` + `FONCTIONNEMENT.md` (produit)
- `couleurs-palette-et-phrases-Cursor.md` + `06-BACKLOG.md` (nits de la page)

Pas de brief texte pour réinventer le layout.

## 3. Shell figé

| Élément | Valeur |
|---------|--------|
| Logo | Pack `logos/audixio-logos/out/` uniquement (PC clair/sombre + mark) — pas Material / JPG legacy |
| Header layout | [`assets/chrome-header-canon-light.png`](maquettes/chrome/chrome-header-canon-light.png) + [`NAV-CANON-desktop-et-mobile.md`](maquettes/chrome/NAV-CANON-desktop-et-mobile.md) — structure gelée owner |
| Forme | Barre **flottante encadrée** ; liens au **milieu** (pas bandeau full-bleed) |
| Mobile | Top = logo+utils ([`chrome-mobile-top-bar.png`](maquettes/chrome/chrome-mobile-top-bar.png)) ; bottom sticky 4 icônes ([`chrome-mobile-bottom-nav.png`](maquettes/chrome/chrome-mobile-bottom-nav.png)) ; flèche remonter |
| Back-to-top | Mobile : [`chrome-mobile-back-to-top.png`](maquettes/chrome/chrome-mobile-back-to-top.png) — sticky bas-droit au-dessus bottom nav |
| Logo fichiers | Lockup `Audixio_PC_clair_h*.png` (clair) / `Audixio_PC_sombre_h*.png` (sombre) — pas wordmark inventé |
| Police | Inter |
| Titre header | « Audixio » seul (pas de tagline sous le nom) |
| Couleurs | Tokens palette v2 ; clair `03` / `DESIGN.md` ; sombre `04` |
| Nav | Accueil · Méthode · Sites suivis · Tarifs | FR/EN · thème · Connexion **ou** Compte si connecté |
| Footer | Compact [`FOOTER-CANON-compact.md`](maquettes/chrome/FOOTER-CANON-compact.md) + [`assets/chrome-footer-canon-light.png`](maquettes/chrome/chrome-footer-canon-light.png) — Mentions · Confidentialité · Accessibilité · CGU · Audixio Pro · ©2026 · V3.4 ; **pas** mega footer |

Sur chaque page : **retirer** le header/footer Stitch et brancher les composants partagés. Ne pas réinventer le body.

## 4. Fidélité visuelle (structure ≠ couleurs)

- Body = **pixel-perfect** vs HTML + PNG Stitch pour **structure, spacing, cartes, CTA**.
- **Couleurs** : tokens shell. Stitch = emplacements, **pas** source absolue des hex (remap si divergence).
- CSS/classes Stitch (Tailwind) : **garder** ce qui sert le layout ; substituer les couleurs hors charte.
- Responsive ≥ 1000 px cible ; Stitch étroit → adapter sans casser hiérarchie.

## 5. Copy / phrases (dans le même agent page)

Détail : [`couleurs-palette-et-phrases-Cursor.md`](couleurs-palette-et-phrases-Cursor.md). Soft-gate : [`SOFT-GATE-PARTIEL-CANON.md`](../produit/SOFT-GATE-PARTIEL-CANON.md). **Droits SSOT :** [`MATRICE-STATUT-DROITS-CANON.md`](../produit/MATRICE-STATUT-DROITS-CANON.md).

Résumé : adoucir ou retirer claims inventés (« 48 sondes », « scellement » → **horodaté**, jargon excessif, RFC/certificats non produits, slogans). Remplacer « tableau de bord » → **Sites suivis**. CTA brief = **Copier le prompt…** + *Colle-le…*. Marque **Audixio**. Ton vouvoiement ≤ 20 mots, constat → conséquence → action.

## 6. Animations

- **Phase pages** : garder hover/transitions déjà dans le HTML Stitch. Pas d’anims lourdes.
- **Phase motion** (après) : wow **ciblé** (Accueil/hero, jauge) — type scroll Attio/Lenis, lumières discrètes Raycast/Vercel.
- Toujours `prefers-reduced-motion`.
- Interdit : animations décoratives partout.

## 7. Accès tiers (rappel produit)

- Demande d’accès = **modale** (fond = soft-gate **partiel**, pas flou sur données sensibles existantes) après soft-gate partiel.
- Acceptation propriétaire = **page** (e-mail magique).
- Accès accordé = micro-état / bandeau (pas page pleine).
- Vérifier propriété = **page** dédiée.

## États maquette (démo) ≠ défaut produit

Les maquettes Stitch montrent souvent **compte / Pro / données déjà là**.
**Par défaut : rien n'est connecté** (anonyme → Connexion, pas Compte/avatar ; pas de features Pro actives).
Coller la structure **COMPLET** ; brancher anonyme / non vérif / vérifié / Pro / liens via **matrice** + composants Verrouillé (pas page PARTIEL séparée). Rapport : `page_rapport_hub` + domaines + `page_brief_ia`. Détail : matrice + soft-gate + couleurs + restes.

## Logos / couleurs / phrases

- Logos : [`05-LOGO.md`](05-LOGO.md), [`05-LOGO.md`](05-LOGO.md)
- Couleurs + phrases : [`couleurs-palette-et-phrases-Cursor.md`](couleurs-palette-et-phrases-Cursor.md)

## Restes page par page

[`06-BACKLOG.md`](06-BACKLOG.md).
