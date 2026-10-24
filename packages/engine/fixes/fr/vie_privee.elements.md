---
title: Indiquer l’éditeur, l’hébergeur et un contact
why: Sans ces trois informations, le visiteur ne sait pas qui écrire.
effortMinutes: 20
sources:
  - CNIL | https://www.cnil.fr/fr/passer-laction/rgpd-exemples-de-mentions-dinformation
  - CNIL | https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence
---
## netlify
1. Ouvrez la page des mentions légales.
2. Ajoutez l’éditeur, l’hébergeur et une adresse de contact.

```html
<p>Éditeur : Cabinet Martin.</p>
<p>Hébergeur : Netlify.</p>
<p>Contact : <a href="mailto:contact@exemple.fr">contact@exemple.fr</a></p>
```

3. Publiez, puis relancez l’audit.

## github_pages
1. Complétez la page des mentions dans le dépôt.
2. Limite : GitHub Pages ne connaît pas votre éditeur.
3. Alternative : écrivez ces trois éléments dans la page du dépôt.
4. Publiez le dépôt, puis relancez l’audit.

## generic
1. Nommez l’éditeur du site.
2. Nommez l’hébergeur et donnez un courriel ou un téléphone.
3. Relancez l’audit.
