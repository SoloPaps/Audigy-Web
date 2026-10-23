---
title: Limiter l'origine des scripts
why: Sans limite, une page modifiée peut charger du code qui n'est pas le vôtre.
effortMinutes: 30
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Content-Security-Policy
  - Observatory | https://developer.mozilla.org/en-US/observatory/docs/tests_and_scoring
---
## netlify
1. Ouvrez ou créez le fichier `_headers` à la racine du site publié.
2. Ajoutez ces lignes.

```
/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

3. Si un script vient d'un autre site à vous, ajoutez son adresse chiffrée dans `script-src`.
4. Évitez `unsafe-inline` et `unsafe-eval` pour les scripts.
5. Publiez à nouveau le site, puis relancez l'audit.

## github_pages
Limite : GitHub Pages ne permet pas d'ajouter le fichier `_headers`.
Alternative : posez cette balise dans chaque page, dans l'en-tête.

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; object-src 'none'; base-uri 'self'">
```

Cette balise ne peut pas interdire les cadres. Pour cela, il faut un autre hébergeur.

## generic
1. Ajoutez l'en-tête suivant sur chaque page.

```
Content-Security-Policy: default-src 'none'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

2. N'autorisez un script externe que par son adresse chiffrée exacte.
3. Relancez l'audit.
