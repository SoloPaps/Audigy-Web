---
title: Rendre le site plus visible dans la recherche
why: Une note faible de référencement rend le site moins visible dans la recherche.
effortMinutes: 60
sources:
  - Google | https://developers.google.com/search/docs/fundamentals/seo-starter-guide
  - MDN | https://developer.mozilla.org/fr/docs/Glossary/SEO
---
## netlify
1. Donnez un titre et une description à chaque page.
2. Laissez les moteurs lire la page, sans consigne noindex.
3. Ajoutez l’adresse de référence de la page.

```
<link rel="canonical" href="https://exemple.fr/">
```

4. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Donnez un titre et une description dans le fichier HTML.
2. Limite : GitHub Pages ne permet pas de régler les en-têtes HTTP.
3. Alternative : corrigez le texte dans le dépôt, puis relancez l’audit.

## generic
1. Donnez un titre, une description et une adresse de référence.
2. Retirez toute consigne qui cache la page aux moteurs.
3. Relancez l’audit après la mise en ligne.
