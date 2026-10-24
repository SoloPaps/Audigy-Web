---
title: Mettre à jour les bibliothèques de vos pages
why: Une bibliothèque ancienne peut porter une faille déjà publiée, et parfois déjà exploitée.
effortMinutes: 30
sources:
  - OSV | https://osv.dev/
  - CISA KEV | https://www.cisa.gov/known-exploited-vulnerabilities-catalog
  - retire.js | https://github.com/RetireJS/retire.js
  - ANSSI | https://cyber.gouv.fr/publications/recommandations-relatives-a-la-securisation-des-sites-web
---
## netlify
1. Repérez dans vos pages le fichier de la bibliothèque citée.
2. Remplacez-le par sa dernière version publiée.
3. S'il vient d'un autre site, changez le numéro dans l'adresse du script.
4. Si le site est construit, mettez à jour le paquet, puis reconstruisez.

```
npm install <nom>@latest
```

5. Publiez à nouveau le site, puis relancez l'audit.
6. Testez vos pages : une nouvelle version change parfois un comportement.

## github_pages
Limite : GitHub Pages ne met pas à jour vos fichiers à votre place.
Alternative : remplacez le fichier dans le dépôt, puis envoyez la modification.
Le site est republié tout seul en quelques minutes. Relancez ensuite l'audit.

## generic
1. Remplacez le fichier par la dernière version publiée de la bibliothèque.
2. S'il vient d'un autre site, changez le numéro dans l'adresse du script.
3. Testez vos pages, puis relancez l'audit.
4. Notre outil compare un numéro de version. Il ne teste pas la faille sur votre site.
