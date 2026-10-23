---
title: Rendre les actions plus fluides
why: Un délai après le clic donne l’impression que la page est bloquée.
effortMinutes: 60
sources:
  - Google | https://web.dev/articles/inp
  - MDN | https://developer.mozilla.org/fr/docs/Web/Performance
---
## netlify
1. Retirez les scripts qui ne servent pas un geste du visiteur.
2. Découpez le travail long en plus petites étapes.
3. Publiez, puis relancez l’audit.

## github_pages
1. Retirez les scripts inutiles du dépôt.
2. Évitez un calcul long au moment du clic.
3. Limite : un script tiers ne se corrige pas dans le dépôt.
4. Alternative : retirez-le, ou chargez-le après l’action.

## generic
1. Réduisez le code lancé à chaque clic.
2. Retirez les scripts qui ne servent pas la page.
3. Relancez l’audit.
