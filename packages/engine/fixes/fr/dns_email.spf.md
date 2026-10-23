---
title: Dire qui peut écrire avec votre nom
why: Sans cette limite, n’importe qui peut envoyer du courrier à votre place.
effortMinutes: 20
sources:
  - RFC 7208 | https://www.rfc-editor.org/rfc/rfc7208
---
## netlify
1. Ouvrez le menu DNS, puis le domaine.
2. Ajoutez un seul TXT sur le nom nu.
3. Restez sous dix renvois. Le mot -all refuse le reste.

```
v=spf1 include:_spf.exemple.fr -all
```

4. Si le nom n’envoie aucun courrier, utilisez la ligne suivante.

```
v=spf1 -all
```

5. Enregistrez, puis relancez l’audit.
6. Un TXT Netlify tient en 255 caractères.

## github_pages
Limite : le dépôt ne contient pas le DNS du nom.
Alternative : ajoutez le TXT chez le bureau d’enregistrement.
Sur un nom github.io, ce réglage est impossible.
Utilisez un nom qui vous appartient.

## generic
1. Publiez un seul TXT sur le nom nu.
2. Terminez par -all, avec au plus dix renvois.

```
v=spf1 ip4:192.0.2.10 -all
```

3. Sans envoi de courrier, interdisez tout.

```
v=spf1 -all
```

4. Relancez l’audit.
