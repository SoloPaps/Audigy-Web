---
title: Tenir un budget de poids et de requêtes
why: Une page lourde ou bavarde transfère plus de données que nécessaire.
effortMinutes: 30
sources:
  - Numérique écoresponsable | https://ecoresponsable.numerique.gouv.fr/publications/referentiel-general-ecoconception/critere/6.1/
  - Mozilla | https://developer.mozilla.org/fr/docs/Web/Performance
---
## netlify
1. Fixez un plafond, par exemple 1 Mo et 30 requêtes.
2. Retirez les fichiers qui font dépasser ce plafond.
3. Notez le plafond dans votre déclaration, puis relancez l’audit.

## github_pages
1. Allégez la page dans le dépôt jusqu’au plafond choisi.
2. Limite : l’hébergeur ne compte pas les requêtes à votre place.
3. Alternative : coupez les polices et les scripts venus d’ailleurs.

## generic
1. Écrivez le poids maximum et le nombre maximum de requêtes.
2. Mesurez la page et restez sous ces deux plafonds.
3. Relancez l’audit.
