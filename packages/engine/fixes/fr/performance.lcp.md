---
title: Afficher le contenu principal plus tôt
why: Le visiteur attend le plus grand élément avant de commencer à lire.
effortMinutes: 45
sources:
  - Google | https://web.dev/articles/lcp
  - MDN | https://developer.mozilla.org/fr/docs/Web/Performance
---
## netlify
1. Allégez l’image la plus grande de la page.
2. Évitez un script qui bloque cette image.
3. Dans `_headers`, gardez cette image longtemps si elle ne change pas.

```
/images/*
  Cache-Control: public, max-age=31536000, immutable
```

4. Publiez, puis relancez l’audit.

## github_pages
1. Allégez l’image la plus grande dans le dépôt.
2. Placez-la tôt dans la page, sans script devant.
3. Limite : vous ne choisissez pas la durée de cache.
4. Alternative : une image plus légère s’affiche plus tôt.

## generic
1. Compressez l’image principale et indiquez sa taille.
2. Ne la chargez pas après un long script.
3. Relancez l’audit.
