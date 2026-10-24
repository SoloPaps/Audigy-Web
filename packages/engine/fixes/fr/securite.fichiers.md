---
title: Retirer les fichiers sensibles
why: Un visiteur peut lire un secret ou le code du site.
effortMinutes: 20
sources:
  - ANSSI | https://cyber.gouv.fr/publications/recommandations-relatives-a-la-securisation-des-sites-web
---
## netlify
1. Ouvrez le dossier publié, pas seulement le dépôt.
2. Supprimez les fichiers signalés, surtout `.env` et `.git`.
3. Vérifiez que `.env` n’est pas copié lors de la publication.
4. Publiez à nouveau, puis relancez l’audit.

```
.env
.git
```

## github_pages
Limite : le dépôt publié est le site. Un fichier publié est visible.
Alternative : retirez aussi l’ancienne version si un secret a été publié.
1. Supprimez le fichier du dépôt et de la branche publiée.
2. Ne publiez pas `.env`, `.git` ni une sauvegarde.
3. Attendez la publication, puis relancez l’audit.

## generic
1. Retirez le fichier du dossier servi au public.
2. Changez tout secret qui a pu être lu.
3. Relancez l’audit.
