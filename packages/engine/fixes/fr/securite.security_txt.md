---
title: Publier un contact en cas de faille
why: Sans ce fichier, une personne qui trouve une faille ne sait pas à qui l'écrire.
effortMinutes: 15
sources:
  - RFC 9116 | https://www.rfc-editor.org/rfc/rfc9116
  - MDN | https://developer.mozilla.org/fr/docs/Web/Security/Practical_implementation_guides/Security_txt
---
## netlify
1. Créez le fichier `/.well-known/security.txt` avec au moins ces lignes.

```
Contact: mailto:contact@exemple.fr
Expires: 2027-12-31T23:00:00.000Z
Canonical: https://exemple.fr/.well-known/security.txt
```

2. Mettez une date encore loin, au format indiqué.
3. Dans `_headers`, servez ce fichier comme du texte.

```
/.well-known/security.txt
  Content-Type: text/plain; charset=utf-8
```

4. Publiez à nouveau le site, puis relancez l'audit.

## github_pages
Limite : avec Jekyll, GitHub Pages ignore les dossiers qui commencent par un point.
Le fichier `/.well-known/security.txt` n'est alors pas publié.
Alternative : ajoutez un fichier vide nommé `.nojekyll` à la racine du dépôt.
Publiez ensuite `.well-known/security.txt` comme ci-dessus, en texte brut.
Renouvelez la date avant qu'elle ne soit dépassée.

## generic
1. Publiez `https://votre-site/.well-known/security.txt` en `text/plain`.
2. Indiquez un `Contact` en `mailto:`, `https://` ou `tel:`.
3. Indiquez `Expires` dans le futur, et renouvelez le fichier avant cette date.
4. L'adresse `/security.txt` seule reste un pis-aller.
