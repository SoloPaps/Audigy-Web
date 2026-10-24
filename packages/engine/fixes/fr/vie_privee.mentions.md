---
title: Publier des mentions légales lisibles
why: Le visiteur doit pouvoir savoir qui propose le site.
effortMinutes: 25
sources:
  - CNIL | https://www.cnil.fr/fr/passer-laction/rgpd-exemples-de-mentions-dinformation
  - CNIL | https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence
---
## netlify
1. Créez une page, par exemple `/mentions-legales`.
2. Écrivez l’éditeur, l’hébergeur et un moyen de contact.
3. Ajoutez un lien « Mentions légales » dans le pied de l’accueil.

```html
<a href="/mentions-legales">Mentions légales</a>
```

4. Publiez, puis relancez l’audit.

## github_pages
1. Ajoutez la page et le lien dans le dépôt.
2. Limite : GitHub Pages ne rédige pas les mentions à votre place.
3. Alternative : une page HTML du dépôt, liée depuis l’accueil.
4. Publiez le dépôt, puis relancez l’audit.

## generic
1. Publiez une page des mentions, avec du texte réel.
2. Liez-la depuis l’accueil avec les mots « Mentions légales ».
3. Relancez l’audit.
