---
title: Compresser les textes envoyés
why: Un texte compressé arrive plus vite, surtout sur un réseau lent.
effortMinutes: 15
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Content-Encoding
  - Google | https://developer.chrome.com/docs/lighthouse/performance/uses-text-compression
---
## netlify
1. Netlify compresse déjà les pages et les scripts.
2. Dans `_headers`, n’ajoutez pas de consigne qui retire cette compression.
3. Minifiez les fichiers longs dans le dépôt.
4. Publiez, puis relancez l’audit.

## github_pages
Limite : vous ne choisissez pas la compression. GitHub Pages l’applique déjà.
Alternative : minifiez les textes dans le dépôt. Le fichier envoyé est plus court.

## generic
1. Activez la compression des pages, des scripts et des feuilles de style.
2. Ne compressez pas les images déjà réduites : le gain est nul.
3. Relancez l’audit.
