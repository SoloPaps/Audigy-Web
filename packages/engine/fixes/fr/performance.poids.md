---
title: Alléger le poids de la page
why: Une page lourde met plus de temps à s’afficher sur un téléphone.
effortMinutes: 30
sources:
  - Google | https://developer.chrome.com/docs/lighthouse/performance/total-byte-weight
  - MDN | https://developer.mozilla.org/fr/docs/Web/Performance
---
## netlify
1. Compressez les images au-dessus de 200 kilo-octets.
2. Retirez les fichiers qui ne sont plus liés.
3. Publiez, puis relancez l’audit.

## github_pages
1. Compressez les images dans le dépôt.
2. Retirez les scripts et les polices inutiles.
3. Limite : le dépôt ne compresse pas une vidéo à votre place.
4. Alternative : hébergez la vidéo ailleurs, ou raccourcissez-la.

## generic
1. Réduisez les images, les scripts et les polices.
2. N’envoyez pas un fichier que la page n’utilise pas.
3. Relancez l’audit.
