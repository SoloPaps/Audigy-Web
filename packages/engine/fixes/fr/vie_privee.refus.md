---
title: Proposer « Tout refuser » au premier niveau
why: Refuser doit être aussi simple qu’accepter, dès le premier écran.
effortMinutes: 30
sources:
  - CNIL | https://www.cnil.fr/fr/questions-reponses-lignes-directrices-modificatives-et-recommandation-cookies-traceurs
  - CNIL | https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/lignes-directrices-modificatives-et-recommandation
---
## netlify
1. Ouvrez le bandeau de choix.
2. Placez « Tout refuser » à côté de « Tout accepter ».
3. Ne cachez pas le refus dans un second écran.

```html
<button type="button">Tout refuser</button>
```

4. Publiez, puis relancez l’audit.

## github_pages
1. Modifiez le bandeau dans les fichiers du dépôt.
2. Limite : GitHub Pages ne peut pas ajouter ce bouton.
3. Alternative : écrivez le bouton dans la page, au premier niveau.
4. Publiez le dépôt, puis relancez l’audit.

## generic
1. Montrez « Tout refuser » sur le premier écran du bandeau.
2. Un refus doit fermer le bandeau sans dépôt supplémentaire.
3. Relancez l’audit.
