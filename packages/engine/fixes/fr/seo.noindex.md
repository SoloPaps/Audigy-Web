---
title: Laisser la page dans les résultats
why: Une consigne noindex retire la page des résultats de recherche.
effortMinutes: 10
sources:
  - Google | https://developers.google.com/search/docs/crawling-indexing/block-indexing
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/meta/name
---
## netlify
1. Ouvrez le fichier HTML de la page.
2. Retirez la balise qui contient noindex.
3. Dans `_headers`, n’ajoutez pas la ligne qui cache la page.

```
/*
  X-Robots-Tag: noindex
```

4. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Retirez la balise noindex du fichier HTML du dépôt.
2. Limite : GitHub Pages ne permet pas de retirer un en-tête HTTP.
3. Alternative : si l’en-tête vient d’ailleurs, placez un service devant le site.

## generic
1. Retirez la balise noindex de la page.
2. Retirez l’en-tête qui contient noindex.
3. Relancez l’audit après la mise en ligne.
