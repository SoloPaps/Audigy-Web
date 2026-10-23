---
title: Empêcher le navigateur de deviner le type
why: S'il devine mal, un fichier prévu pour être téléchargé peut s'exécuter comme du code.
effortMinutes: 5
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/X-Content-Type-Options
---
## netlify
1. Ouvrez ou créez le fichier `_headers` à la racine du site publié.
2. Ajoutez ces lignes.

```
/*
  X-Content-Type-Options: nosniff
```

3. Publiez à nouveau le site, puis relancez l'audit.

## github_pages
Limite : GitHub Pages ne permet pas d'ajouter le fichier `_headers`, ni cet en-tête.
Aucune balise de page ne le remplace.
Alternative : placez un service devant le site, ou hébergez les fichiers ailleurs.

## generic
1. Ajoutez l'en-tête suivant sur chaque réponse.

```
X-Content-Type-Options: nosniff
```

2. Relancez l'audit.
