---
title: Héberger les scripts et les polices chez vous
why: Un fichier chargé ailleurs envoie l’adresse du visiteur à ce site.
effortMinutes: 30
sources:
  - CNIL | https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi
  - CNIL | https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/lignes-directrices-modificatives-et-recommandation
---
## netlify
1. Téléchargez les polices et les scripts que vous utilisez.
2. Placez-les dans le dépôt, par exemple sous `/fonts` et `/js`.
3. Remplacez les adresses d’un autre site par ces chemins.

```html
<link rel="stylesheet" href="/fonts/texte.css" />
```

4. Publiez, puis relancez l’audit.

## github_pages
1. Copiez les polices et les scripts dans le dépôt.
2. Limite : GitHub Pages ne ramène pas ces fichiers chez vous.
3. Alternative : servez-les depuis le même dépôt que les pages.
4. Publiez le dépôt, puis relancez l’audit.

## generic
1. Remplacez chaque police ou script d’un autre site par une copie locale.
2. Vérifiez qu’aucune adresse extérieure ne reste dans la page.
3. Relancez l’audit.
