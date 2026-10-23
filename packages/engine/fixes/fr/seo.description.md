---
title: Écrire une description utile
why: La description résume la page sous le titre dans le résultat.
effortMinutes: 20
sources:
  - Google | https://developers.google.com/search/docs/appearance/snippet
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/meta/name
---
## netlify
1. Ouvrez le fichier HTML de la page.
2. Ajoutez une description différente du titre, d’environ 50 à 160 caractères.

```
<meta name="description" content="Le cabinet reçoit sur rendez-vous et explique la première séance.">
```

3. Ne répétez pas le titre mot pour mot.
4. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Ajoutez la description dans le fichier HTML du dépôt.
2. Limite : aucune sur ce texte, le fichier HTML se modifie dans le dépôt.
3. Alternative : gardez la description dans la page, pas dans un en-tête.

## generic
1. Ajoutez une description qui résume la page.
2. Visez 50 à 160 caractères, différents du titre.
3. Relancez l’audit après la mise en ligne.
