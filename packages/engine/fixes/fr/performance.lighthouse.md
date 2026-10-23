---
title: Accélérer l’affichage de la page
why: Une page lente fait partir le visiteur avant la lecture.
effortMinutes: 60
sources:
  - Google | https://developer.chrome.com/docs/lighthouse/performance/performance-scoring
  - MDN | https://developer.mozilla.org/fr/docs/Web/Performance
---
## netlify
1. Compressez les images avant de les envoyer.
2. Retirez les scripts qui ne servent pas la page.
3. Dans `_headers`, gardez longtemps les fichiers qui ne changent pas.

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

4. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Compressez les images dans le dépôt.
2. Retirez les scripts qui ne servent pas la page.
3. Limite : la durée de cache ne se règle pas dans le dépôt.
4. Alternative : un fichier plus léger se recharge plus vite.

## generic
1. Compressez les images et retirez les scripts inutiles.
2. Mettez en cache les fichiers qui ne changent pas.
3. Relancez l’audit après la mise en ligne.
