---
title: Courrier : exiger le chiffrement
why: Sans cette règle, le chiffrement du courrier peut être retiré en route.
effortMinutes: 30
sources:
  - RFC 8461 | https://www.rfc-editor.org/rfc/rfc8461
---
## netlify
1. Ajoutez un TXT sur `_mta-sts`.

```
v=STSv1; id=2026102301
```

2. Publiez le fichier de règle en HTTPS, sur le sous-domaine `mta-sts`.
3. Le chemin est `.well-known/mta-sts.txt`.

```
version: STSv1
mode: enforce
mx: mail.exemple.fr
max_age: 86400
```

4. Le mode enforce impose le chiffrement.
5. Changez l’identifiant quand le fichier change.

## github_pages
Limite : GitHub Pages ne publie pas le sous-domaine mta-sts.
Alternative : hébergez le fichier chez un service qui le permet.
Sur un nom github.io, cette règle ne se pose pas.

## generic
1. Annoncez la règle en TXT sur `_mta-sts`.

```
v=STSv1; id=2026102301
```

2. Servez le fichier au chemin prévu, en HTTPS.

```
version: STSv1
mode: enforce
mx: mail.exemple.fr
max_age: 86400
```

3. Passez en enforce quand l’essai est concluant.
