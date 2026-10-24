---
title: Réduire les données envoyées à chaque visite
why: Plus la page transfère de données, plus l’estimation de CO2 monte.
effortMinutes: 30
sources:
  - Green Web Foundation | https://developers.thegreenwebfoundation.org/co2js/models/overview/
  - Mozilla | https://developer.mozilla.org/fr/docs/Web/Performance
---
## netlify
1. Compressez les images et retirez les fichiers non utilisés.
2. Gardez en cache les fichiers qui changent rarement.
3. Relancez l’audit. Le nouveau chiffre reste une estimation.

## github_pages
1. Allégez les images et les scripts dans le dépôt.
2. Limite : l’hébergeur ne compresse pas une vidéo à votre place.
3. Alternative : hébergez la vidéo ailleurs, ou raccourcissez-la.

## generic
1. Envoyez moins de données à la première visite.
2. Évitez de recharger les fichiers déjà reçus.
3. Relancez l’audit.
