---
title: Forcer l'adresse chiffrée
why: Sans chiffrement, une personne sur le même réseau peut lire ce que vos visiteurs envoient.
effortMinutes: 15
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Strict-Transport-Security
  - ANSSI | https://cyber.gouv.fr/publications/recommandations-relatives-a-la-securisation-des-sites-web
---
## netlify
1. Ouvrez ou créez le fichier `_headers` à la racine du site publié.
2. Ajoutez ces lignes.

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains
```

3. Dans les réglages du site, activez le certificat et la redirection vers l'adresse chiffrée.
4. Publiez à nouveau le site, puis relancez l'audit.

## github_pages
Limite : GitHub Pages ne permet pas d'ajouter le fichier `_headers`.
Alternative : ouvrez les réglages du dépôt, partie Pages, et activez le forçage de l'adresse chiffrée.
Pour un domaine en github.io, ce forçage est déjà en place.
Si l'audit échoue encore, placez le site chez un hébergeur qui écrit lui-même cette redirection.

## generic
1. Activez le certificat de votre hébergeur.
2. Redirigez toute adresse non chiffrée vers l'adresse chiffrée du même nom.
3. Ajoutez l'en-tête suivant.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

4. Relancez l'audit.
