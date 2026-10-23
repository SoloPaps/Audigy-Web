---
title: Limiter l'adresse envoyée avec les liens
why: L'adresse complète d'une page peut révéler un contenu que le visiteur n'a pas choisi de partager.
effortMinutes: 5
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Referrer-Policy
---
## netlify
1. Ouvrez ou créez le fichier `_headers` à la racine du site publié.
2. Ajoutez ces lignes.

```
/*
  Referrer-Policy: strict-origin-when-cross-origin
```

3. Publiez à nouveau le site, puis relancez l'audit.

## github_pages
Limite : GitHub Pages ne permet pas d'ajouter le fichier `_headers`.
Alternative : posez cette balise dans chaque page, dans l'en-tête.

```html
<meta name="referrer" content="strict-origin-when-cross-origin">
```

## generic
1. Ajoutez l'en-tête suivant.

```
Referrer-Policy: strict-origin-when-cross-origin
```

2. Évitez `unsafe-url` et `no-referrer-when-downgrade`.
3. Relancez l'audit.
