---
title: Afficher une bannière de choix
why: Sans bannière, le visiteur ne peut pas choisir ce qui est déposé.
effortMinutes: 40
sources:
  - CNIL | https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies
  - CNIL | https://www.cnil.fr/fr/questions-reponses-lignes-directrices-modificatives-et-recommandation-cookies-traceurs
---
## netlify
1. Ajoutez un bandeau avant le chargement des traceurs.
2. Le bandeau doit laisser accepter et refuser au même endroit.
3. Netlify n’ajoute pas ce bandeau tout seul.

```html
<div id="choix">
  <button type="button">Tout accepter</button>
  <button type="button">Tout refuser</button>
</div>
```

4. Publiez, puis relancez l’audit.

## github_pages
1. Ajoutez le bandeau dans le modèle du dépôt.
2. Limite : GitHub Pages ne fournit pas de bandeau de choix.
3. Alternative : un script du dépôt peut afficher accepter et refuser.
4. Publiez le dépôt, puis relancez l’audit.

## generic
1. Affichez un bandeau dès la première page.
2. Le visiteur doit pouvoir accepter ou refuser sans chercher.
3. Relancez l’audit.
