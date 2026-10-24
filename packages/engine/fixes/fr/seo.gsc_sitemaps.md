---
title: Envoyer un plan de site sans erreur
why: Google découvre mal les pages si le plan contient des erreurs.
effortMinutes: 30
sources:
  - Google | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
---
## netlify
1. Ouvrez Search Console, propriété du site.
2. Envoyez l’adresse du plan publié à la racine.
3. Corrigez les adresses signalées en erreur.
4. Relancez l’audit après le prochain passage de Google.

## github_pages
1. Publiez le plan à la racine du domaine, pas seulement dans le sous-chemin.
2. Limite : un site en sous-chemin ne dépose pas le plan de tout le domaine.
3. Alternative : reliez la propriété au préfixe exact du chemin, puis envoyez le plan.

## generic
1. Envoyez un plan dans Search Console, pour la propriété du site.
2. Chaque adresse doit répondre sans changer de page.
3. Relancez l’audit une fois les erreurs corrigées.
