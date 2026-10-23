---
title: Annoncer où arrive le courrier
why: Sans serveur annoncé, un message peut viser l’adresse du site.
effortMinutes: 15
sources:
  - RFC 5321 | https://www.rfc-editor.org/rfc/rfc5321
  - RFC 7505 | https://www.rfc-editor.org/rfc/rfc7505
---
## netlify
1. Ouvrez le menu DNS, puis le domaine.
2. Ajoutez un enregistrement MX vers le serveur de votre messagerie.
3. Si ce nom ne reçoit pas de courrier, mettez la priorité 0 et un point.

```
0 .
```

4. Enregistrez, puis relancez l’audit.

## github_pages
Limite : le dépôt ne contient pas le DNS du nom.
Alternative : ajoutez le MX chez le bureau d’enregistrement.
Sur un nom github.io, ce réglage est impossible.
Utilisez un nom qui vous appartient.

## generic
1. Ouvrez la zone DNS du nom.
2. Ajoutez un MX vers le serveur de courrier.

```
10 mail.exemple.fr.
```

3. Sans courrier, un MX nul de priorité 0 suffit.

```
0 .
```

4. Relancez l’audit.
