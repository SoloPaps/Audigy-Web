---
title: Faire indexer la page d’accueil
why: Une page d’accueil absente de Google limite la visibilité du site.
effortMinutes: 20
sources:
  - Google | https://developers.google.com/search/docs/crawling-indexing/indexable
---
## netlify
1. Vérifiez que la page d’accueil n’interdit pas l’indexation.
2. Demandez l’indexation depuis Search Console.
3. Relancez l’audit après le passage de Google.

## github_pages
1. Vérifiez que la page du chemin n’interdit pas l’indexation.
2. Limite : Google n’indexe pas une page bloquée par le robots de la racine.
3. Alternative : retirez le blocage à la racine, ou publiez le site à la racine.

## generic
1. Autorisez l’indexation de la page d’accueil.
2. Demandez l’indexation dans Search Console.
3. Relancez l’audit ensuite.
