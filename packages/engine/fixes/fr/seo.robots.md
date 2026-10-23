---
title: Laisser les moteurs lire le site
why: Un fichier robots trop strict empêche les moteurs de lire le site.
effortMinutes: 20
sources:
  - Google | https://developers.google.com/search/docs/crawling-indexing/robots/intro
  - MDN | https://developer.mozilla.org/fr/docs/Glossary/Robots.txt
---
## netlify
1. Créez `robots.txt` à la racine du site publié.
2. N’interdisez pas tout le site si vous voulez être trouvé.
3. Ajoutez l’adresse du plan du site.

```
User-agent: *
Allow: /

Sitemap: https://exemple.fr/sitemap.xml
```

4. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Placez `robots.txt` à la racine du domaine, pas dans un sous-dossier.
2. Limite : un site en sous-chemin ne publie pas le fichier de la racine.
3. Alternative : hébergez le site à la racine, ou retirez l’interdiction.

## generic
1. Publiez `robots.txt` à la racine du domaine.
2. Autorisez la lecture des pages que vous voulez montrer.
3. Relancez l’audit après la mise en ligne.
