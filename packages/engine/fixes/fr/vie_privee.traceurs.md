---
title: Attendre un choix avant les traceurs
why: Un traceur contacté trop tôt part sans décision du visiteur.
effortMinutes: 45
sources:
  - CNIL | https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/lignes-directrices-modificatives-et-recommandation
  - CNIL | https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi
---
## netlify
1. Ouvrez le code de la page d’accueil.
2. Retirez les scripts de mesure et de publicité du chargement initial.
3. Ne les ajoutez qu’après un accord clair du visiteur.

```html
<script src="/js/mesure.js"></script>
```

4. Une mesure d’audience peut rester sans accord si elle reste strictement limitée.
5. Publiez le site, puis relancez l’audit.

## github_pages
1. Retirez les scripts tiers du modèle HTML du dépôt.
2. Limite : GitHub Pages ne bloque pas ces scripts à votre place.
3. Alternative : chargez-les seulement après un accord, dans votre code.
4. Publiez le dépôt, puis relancez l’audit.

## generic
1. Repérez les scripts qui contactent un autre site dès l’ouverture.
2. Déplacez-les après le bouton d’accord.
3. Relancez l’audit.
