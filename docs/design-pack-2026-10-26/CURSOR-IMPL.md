# Cursor — mode d'implémentation (gelé 2026-10-27)

Décisions owner + Jojo. À appliquer avant toute PR UI.

## 1. Ordre des agents

1. **Un agent shell** (une fois) : `AppHeader`, footer, logo officiel, police **Inter**, thème light/dark, toggle.
2. **Un agent par page** : body Stitch + branche moteur/API + nits copy de cette page.
3. **Un agent motion** (après les pages) : anims **légères** ciblées seulement.

**Interdit** : un agent « textes seuls » en parallèle des pages ; un agent « toutes les pages » ; un agent anim par page.

## 2. Ce qu'on donne à chaque agent page

- `docs/design-pack-2026-10-26/maquettes/<dossier>/code.html`
- le `screen.png` du même dossier
- Lien vers `01-REGLES-STRICTES.md` + `FONCTIONNEMENT.md` (produit)
- Checklist nits copy de la page (claims à adoucir)

Pas de brief texte pour réinventer le layout.

## 3. Shell figé

| Élément | Valeur |
|---------|--------|
| Logo | Assets officiels uniquement (`assets/logo-*.jpg`) — pas Material ECG / A inventé |
| Police | Inter |
| Titre header | « Audigy » seul (pas de tagline sous le nom) |
| Nav | Accueil · Méthode · Sites suivis · Documentation \| FR/EN · thème · Connexion **ou** Compte si connecté |
| Footer | Mentions · Confidentialité · Accessibilité · CGU · Audigy Pro · ©2026 · V3.4 · souverain *(preview owner avant merge)* |

Sur chaque page : **retirer** le header/footer Stitch et brancher les composants partagés. Ne pas réinventer le body.

## 4. Fidélité visuelle

- Body = **pixel-perfect** vs HTML + PNG Stitch (structure, spacing, cartes, CTA).
- CSS/classes Stitch (Tailwind) : **garder** ce qui sert le layout.
- Responsive ≥1000 px cible ; Stitch étroit → adapter sans casser hiérarchie.

## 5. Copy / claims (dans le même agent page)

Adoucir ou retirer : « 48 sondes », « scellement » → horodaté, « cryptographique » excessif, « protocole officiel », « tous droits gestion », carbone/WCAG inventés dans le footer hors shell, slogans non produits.

Remplacer « tableau de bord » → **Sites suivis**. CTA brief = **Copier le prompt…** + ligne Colle-le… (pas « Générer » / marques dans le bouton).

## 6. Animations

- **Phase pages** : garder hover/transitions déjà dans le HTML Stitch. Pas d'anims lourdes.
- **Phase motion** (après) : wow **ciblé** (Accueil/hero, jauge) — type scroll Attio/Lenis, lumières discrètes Raycast/Vercel.
- Toujours `prefers-reduced-motion`.
- Interdit : animations décoratives partout.

## 7. Accès tiers (rappel produit)

- Demande d'accès = **modale** (fond flouté) après soft-gate.
- Acceptation propriétaire = **page** (e-mail magique).
- Accès accordé = micro-état / bandeau (pas page pleine).
- Vérifier propriété = **page** dédiée.
