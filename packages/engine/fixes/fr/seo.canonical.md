---
title: Indiquer l’adresse de référence
why: Sans adresse de référence, un doublon peut remplacer la page voulue.
effortMinutes: 15
sources:
  - Google | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/link
---
## netlify
1. Ouvrez le fichier HTML de la page.
2. Ajoutez une seule adresse de référence, absolue, identique à la page.

```
<link rel="canonical" href="https://exemple.fr/">
```

3. Ne pointez pas vers un autre site.
4. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Ajoutez l’adresse de référence dans le fichier HTML du dépôt.
2. Limite : GitHub Pages ne permet pas de régler les en-têtes HTTP.
3. Alternative : la balise dans la page suffit, sans en-tête.

## generic
1. Ajoutez une seule adresse de référence, identique à la page.
2. Utilisez une adresse complète, sur le même site.
3. Relancez l’audit après la mise en ligne.
