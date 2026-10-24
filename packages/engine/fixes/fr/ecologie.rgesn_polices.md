---
title: Limiter les polices téléchargées
why: Chaque police téléchargée ajoute du poids à la page.
effortMinutes: 20
sources:
  - Numérique écoresponsable | https://ecoresponsable.numerique.gouv.fr/publications/referentiel-general-ecoconception/critere/4.8/
  - Mozilla | https://developer.mozilla.org/fr/docs/Web/CSS/CSS_fonts
---
## netlify
1. Gardez au plus deux polices, ou quatre fichiers au total.
2. Sinon, restez sous 400 Ko de polices sur la page.
3. Publiez, puis relancez l’audit.

## github_pages
1. Retirez les fichiers de police en trop dans le dépôt.
2. Limite : l’hébergeur ne choisit pas les polices à votre place.
3. Alternative : utilisez une police déjà présente sur l’appareil.

## generic
1. Préférez une police déjà installée sur l’appareil.
2. Si vous en téléchargez, limitez le nombre et le poids.
3. Relancez l’audit.
