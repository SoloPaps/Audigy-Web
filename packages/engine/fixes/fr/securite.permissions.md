---
title: Refuser caméra, micro et position
why: Sans refus explicite, un site intégré peut encore demander la caméra, le micro ou la position.
effortMinutes: 10
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Permissions-Policy
---
## netlify
1. Ouvrez ou créez le fichier `_headers` à la racine du site publié.
2. Ajoutez ces lignes.

```
/*
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

3. Publiez à nouveau le site, puis relancez l'audit.
4. N'ouvrez une de ces fonctions que si votre page en a vraiment besoin.

## github_pages
Limite : GitHub Pages ne permet pas d'ajouter le fichier `_headers`.
Aucune balise de page ne refuse la caméra, le micro ou la position.
Alternative : n'intégrez pas de cadre qui demande ces accès.
Pour un refus réel, hébergez le site ailleurs.

## generic
1. Ajoutez l'en-tête suivant.

```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

2. Relancez l'audit.
