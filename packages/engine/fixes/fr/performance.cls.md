---
title: Empêcher la page de bouger au chargement
why: Un décalage pendant le chargement fait manquer le lien visé.
effortMinutes: 20
sources:
  - Google | https://web.dev/articles/cls
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTML/Element/img
---
## netlify
1. Écrivez la largeur et la hauteur de chaque image.

```
<img src="/photo.jpg" width="800" height="600" alt="Atelier">
```

2. Réservez la place d’un bandeau qui arrive ensuite.
3. Publiez, puis relancez l’audit.

## github_pages
1. Ajoutez la largeur et la hauteur dans le dépôt.
2. Ne poussez pas le texte avec une police ou un bandeau tardif.
3. Limite : un bandeau tiers peut encore bouger la page.
4. Alternative : réservez sa hauteur dans la page.

## generic
1. Donnez la taille de chaque image.
2. Réservez la place des éléments qui arrivent plus tard.
3. Relancez l’audit.
