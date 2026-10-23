---
title: Déclarer les langues de la page
why: Une langue mal déclarée envoie le visiteur vers la mauvaise page.
effortMinutes: 30
sources:
  - Google | https://developers.google.com/search/docs/specialty/international/localized-versions
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/link
---
## netlify
1. Pour chaque langue, ajoutez un lien avec une adresse complète.
2. Citez aussi la page actuelle.

```
<link rel="alternate" hreflang="fr" href="https://exemple.fr/">
<link rel="alternate" hreflang="en" href="https://exemple.fr/en">
```

3. Un code de langue ne doit viser qu’une adresse.
4. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Ajoutez les liens de langue dans le fichier HTML du dépôt.
2. Limite : GitHub Pages ne permet pas de régler les en-têtes HTTP.
3. Alternative : les liens dans la page suffisent, avec une adresse complète.

## generic
1. Déclarez chaque langue avec une adresse complète.
2. Citez la page actuelle parmi ces langues.
3. Relancez l’audit après la mise en ligne.
