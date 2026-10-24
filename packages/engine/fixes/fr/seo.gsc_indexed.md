---
title: Faire indexer les pages annoncées
why: Un plan ignoré laisse des pages hors des résultats.
effortMinutes: 40
sources:
  - Google | https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
---
## netlify
1. Ouvrez les plans envoyés dans Search Console.
2. Corrigez les pages annoncées qui ne sont pas indexées.
3. Relancez l’audit après le prochain passage.

## github_pages
1. Vérifiez que les adresses du plan sont dans le chemin publié.
2. Limite : les pages hors du chemin ne sont pas celles de ce site.
3. Alternative : réduisez le plan aux adresses du chemin, puis renvoyez-le.

## generic
1. Comparez les pages annoncées et celles que Google a indexées.
2. Corrigez les pages absentes des résultats.
3. Relancez l’audit ensuite.
