---
title: Alléger les images trop lourdes
why: Une image de plus de 200 Ko ralentit l’affichage de la page.
effortMinutes: 30
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/img
  - web.dev | https://web.dev/articles/compress-images
---
## netlify
1. Compressez l’image, ou réduisez ses dimensions.
2. Visez moins de 200 Ko pour chaque image.
3. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Remplacez le fichier par une version plus légère.
2. Limite : GitHub Pages ne compresse pas les images à votre place.
3. Alternative : préparez le fichier léger avant de le publier.

## generic
1. Exportez l’image en plus petit, sous 200 Ko.
2. Remplacez l’ancien fichier sur le site.
3. Relancez l’audit après la mise en ligne.
