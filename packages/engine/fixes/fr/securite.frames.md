---
title: Interdire l'affichage dans un cadre
why: Un autre site peut alors présenter vos pages comme les siennes et tromper un visiteur.
effortMinutes: 10
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors
---
## netlify
1. Ouvrez ou créez le fichier `_headers` à la racine du site publié.
2. Ajoutez ces lignes.

```
/*
  Content-Security-Policy: frame-ancestors 'none'
  X-Frame-Options: DENY
```

3. Si un site à vous doit afficher cette page, remplacez `none` par ce site, en adresse chiffrée.
4. Publiez à nouveau le site, puis relancez l'audit.

## github_pages
Limite : GitHub Pages ne permet pas d'ajouter le fichier `_headers`.
La balise de page ignore `frame-ancestors`, donc elle ne protège pas du cadre.
Alternative : n'y placez pas de page où le visiteur confirme une action sensible.
Pour une interdiction réelle, hébergez le site ailleurs.

## generic
1. Ajoutez l'en-tête suivant.

```
Content-Security-Policy: frame-ancestors 'none'
```

2. Vous pouvez aussi ajouter la ligne ancienne, pour les navigateurs d'avant.

```
X-Frame-Options: DENY
```

3. N'utilisez pas l'ancienne forme allow-from : les navigateurs actuels l'ignorent.
4. Relancez l'audit.
