---
title: Publier un plan du site lisible
why: Un plan du site aide les moteurs à découvrir toutes les pages.
effortMinutes: 30
sources:
  - Google | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
  - Google | https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
---
## netlify
1. Créez `sitemap.xml` à la racine du site publié.
2. Citez l’adresse finale de chaque page, celle qui répond.
3. Annoncez ce fichier dans `robots.txt`.

```
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://exemple.fr/</loc></url>
</urlset>
```

4. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Déposez le plan à la racine du domaine, avec les adresses finales.
2. Limite : un site en sous-chemin ne publie pas le plan de la racine.
3. Alternative : hébergez le site à la racine, ou citez le plan dans le robots de la racine.

## generic
1. Publiez un plan à la racine, avec les adresses finales.
2. Chaque adresse doit répondre sans changer de page.
3. Relancez l’audit après la mise en ligne.
