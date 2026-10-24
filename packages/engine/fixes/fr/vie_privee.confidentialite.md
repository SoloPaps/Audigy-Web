---
title: Publier une page de confidentialité
why: Le visiteur doit pouvoir lire ce que le site fait de ses données.
effortMinutes: 35
sources:
  - CNIL | https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence
  - CNIL | https://www.cnil.fr/fr/passer-laction/rgpd-exemples-de-mentions-dinformation
---
## netlify
1. Créez une page, par exemple `/confidentialite`.
2. Décrivez les données lues, leur but et leur durée.
3. Ajoutez un lien « Confidentialité » dans le pied de l’accueil.

```html
<a href="/confidentialite">Confidentialité</a>
```

4. Publiez, puis relancez l’audit.

## github_pages
1. Ajoutez la page et le lien dans le dépôt.
2. Limite : GitHub Pages ne rédige pas cette page à votre place.
3. Alternative : une page HTML du dépôt, liée depuis l’accueil.
4. Publiez le dépôt, puis relancez l’audit.

## generic
1. Publiez une page qui explique les données utilisées.
2. Liez-la depuis l’accueil avec le mot « Confidentialité ».
3. Relancez l’audit.
