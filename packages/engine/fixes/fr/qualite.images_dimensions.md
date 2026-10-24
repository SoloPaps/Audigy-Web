---
title: Indiquer la taille des images
why: Sans largeur ni hauteur, la page bouge quand l’image arrive.
effortMinutes: 20
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/img
  - web.dev | https://web.dev/articles/optimize-cls
---
## netlify
1. Ajoutez `width` et `height` sur chaque image.
2. Utilisez les dimensions réelles du fichier.
3. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Écrivez la largeur et la hauteur dans le HTML.
2. Limite : un thème peut retirer ces attributs à l’affichage.
3. Alternative : réglez la taille dans le modèle du thème.

## generic
1. Mesurez la largeur et la hauteur de l’image.
2. Ajoutez ces deux attributs sur la balise.
3. Relancez l’audit après la mise en ligne.
