---
title: Alléger la page mesurée
why: Une page complexe demande plus d’énergie à l’appareil qui l’affiche.
effortMinutes: 45
sources:
  - EcoIndex | https://www.ecoindex.fr/comment-ca-marche/
  - Mozilla | https://developer.mozilla.org/fr/docs/Web/Performance
---
## netlify
1. Retirez les blocs et les scripts qui ne servent pas la page.
2. Compressez les images au-dessus de 200 kilo-octets.
3. Publiez, puis relancez l’audit pour revoir l’estimation.

## github_pages
1. Retirez les sections inutiles dans le dépôt.
2. Limite : l’hébergeur ne réduit pas le nombre d’éléments à votre place.
3. Alternative : découpez la page en plusieurs pages plus courtes.

## generic
1. Visez moins d’éléments, moins de requêtes et moins de données.
2. Mesurez à nouveau après chaque allègement.
3. Relancez l’audit.
