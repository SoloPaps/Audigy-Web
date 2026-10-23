---
title: Charger tous les éléments en adresse chiffrée
why: Un élément chargé sans chiffrement peut être modifié avant d'arriver dans la page.
effortMinutes: 20
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/Security/Mixed_content
---
## netlify
1. Le fichier `_headers` ne réécrit pas les adresses déjà présentes dans la page.
2. Cherchez `http://` dans vos pages, scripts et feuilles de style.
3. Remplacez chaque adresse par sa version chiffrée, ou par un chemin du site.

```html
<script src="https://exemple.fr/app.js"></script>
```

4. Publiez à nouveau le site, puis relancez l'audit.

## github_pages
Limite : GitHub Pages ne réécrit pas les adresses `http://` à votre place, et le fichier `_headers` n'existe pas.
Alternative : modifiez les fichiers du dépôt.
Remplacez chaque `http://` d'un script, d'une image ou d'une feuille de style par `https://`.
Publiez le dépôt, puis relancez l'audit.

## generic
1. Dans le HTML et les feuilles de style, remplacez `http://` par `https://` pour les éléments chargés.
2. Un script, une feuille de style, un cadre ou une police compte plus qu'une image.
3. Relancez l'audit.
