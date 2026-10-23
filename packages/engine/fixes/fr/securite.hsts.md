---
title: Garder le navigateur en adresse chiffrée
why: Sans cette consigne, le navigateur peut retenter une adresse lisible à la visite suivante.
effortMinutes: 10
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Strict-Transport-Security
  - RFC 6797 | https://www.rfc-editor.org/rfc/rfc6797
---
## netlify
1. Ouvrez ou créez le fichier `_headers` à la racine du site publié.
2. Ajoutez ces lignes.

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains
```

3. Publiez à nouveau le site, puis relancez l'audit.
4. La durée indiquée couvre deux ans. Ne descendez pas sous six mois.

## github_pages
Limite : GitHub Pages ne permet pas d'ajouter le fichier `_headers`, ni cet en-tête.
Alternative : un domaine github.io est déjà protégé par la liste publique des navigateurs.
Sur un domaine à vous, cette protection ne s'écrit pas depuis le dépôt.
Placez alors un service devant le site, ou hébergez-le ailleurs.

## generic
1. Sur la réponse chiffrée, ajoutez l'en-tête suivant.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

2. Visez au moins six mois, soit 15768000 secondes.
3. Relancez l'audit.
