---
title: Garder les fichiers déjà téléchargés
why: Sans mise en cache, le navigateur recharge les mêmes fichiers à chaque visite.
effortMinutes: 15
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Cache-Control
  - Google | https://developer.chrome.com/docs/lighthouse/performance/uses-long-cache-ttl
---
## netlify
1. Ouvrez ou créez le fichier `_headers` à la racine du site publié.
2. Ajoutez une durée longue pour les fichiers qui ne changent pas.

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

3. Changez le nom du fichier quand son contenu change.
4. Publiez à nouveau, puis relancez l’audit.

## github_pages
Limite : GitHub Pages choisit lui-même la durée de cache. Vous ne pouvez pas l’écrire dans le dépôt.
Alternative : allégez les images et les scripts. Le rechargement coûte alors moins.

## generic
1. Ajoutez un en-tête de cache sur les fichiers stables.

```
Cache-Control: public, max-age=31536000, immutable
```

2. Changez le nom du fichier quand son contenu change.
3. Relancez l’audit.
