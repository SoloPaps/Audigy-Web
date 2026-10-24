---
title: Proposer un format d’image moderne
why: Une image ancienne pèse plus lourd qu’une image WebP ou AVIF.
effortMinutes: 30
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/picture
  - web.dev | https://web.dev/articles/serve-images-webp
---
## netlify
1. Exportez l’image en WebP ou en AVIF.
2. Proposez ce fichier, avec l’ancien en secours si besoin.
3. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Ajoutez une version WebP ou AVIF à côté de l’image.
2. Limite : GitHub Pages ne convertit pas les images tout seul.
3. Alternative : déposez le fichier converti et pointez-le dans la page.

## generic
1. Convertissez l’image en WebP ou en AVIF.
2. Utilisez une balise picture si vous gardez l’ancien fichier.
3. Relancez l’audit après la mise en ligne.
