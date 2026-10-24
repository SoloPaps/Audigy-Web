---
title: Compresser les textes avant l’envoi
why: Un texte compressé traverse le réseau avec moins de données.
effortMinutes: 15
sources:
  - Numérique écoresponsable | https://ecoresponsable.numerique.gouv.fr/publications/referentiel-general-ecoconception/critere/6.3/
  - Mozilla | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Content-Encoding
---
## netlify
1. Activez la compression des pages, scripts et feuilles de style.
2. Préférez Brotli quand l’hébergeur le propose, sinon gzip.
3. Publiez, puis relancez l’audit.

## github_pages
1. Minifiez les scripts et les feuilles dans le dépôt.
2. Limite : vous ne choisissez pas la compression HTTP de cet hébergeur.
3. Alternative : publiez chez un hébergeur qui compresse les textes.

## generic
1. Activez gzip ou Brotli pour le HTML, le CSS et le JavaScript.
2. Ne compressez pas une deuxième fois une image déjà compressée.
3. Relancez l’audit.
