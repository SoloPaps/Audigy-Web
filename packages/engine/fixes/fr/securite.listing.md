---
title: Masquer la liste des dossiers
why: La liste montre des fichiers que vous ne vouliez pas publier.
effortMinutes: 15
sources:
  - ANSSI | https://cyber.gouv.fr/publications/recommandations-relatives-a-la-securisation-des-sites-web
---
## netlify
1. Ajoutez un fichier `index.html` dans le dossier listé.
2. Netlify n’affiche plus la liste quand une page d’index existe.
3. Publiez à nouveau, puis relancez l’audit.

```
uploads/index.html
```

## github_pages
Limite : un dossier sans page d’index peut être listé selon l’outil.
Alternative : ajoutez un `index.html` vide dans ce dossier.
1. Créez `index.html` dans chaque dossier signalé.
2. Publiez, puis relancez l’audit.

## generic
1. Désactivez la liste automatique des dossiers.
2. Ou placez une page `index.html` dans le dossier.
3. Relancez l’audit.
