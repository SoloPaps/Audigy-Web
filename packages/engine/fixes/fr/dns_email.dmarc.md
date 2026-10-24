---
title: Courrier : refuser les faux messages
why: Sans règle, les faux messages peuvent arriver comme s’ils venaient de vous.
effortMinutes: 20
sources:
  - RFC 7489 | https://www.rfc-editor.org/rfc/rfc7489
---
## netlify
1. Ouvrez le menu DNS, puis le domaine.
2. Ajoutez un TXT sur le nom `_dmarc`.
3. Refusez les faux messages et demandez un rapport.

```
v=DMARC1; p=reject; pct=100; rua=mailto:rapports@exemple.fr
```

4. Si le nom n’envoie pas de courrier, gardez `p=reject`.
5. Enregistrez, puis relancez l’audit.

## github_pages
Limite : le dépôt ne contient pas le DNS du nom.
Alternative : ajoutez le TXT chez le bureau d’enregistrement.
Sur un nom github.io, ce réglage est impossible.
Utilisez un nom qui vous appartient.

## generic
1. Ajoutez un TXT sur `_dmarc`.
2. Choisissez le refus, pour cent pour cent des messages.

```
v=DMARC1; p=reject; pct=100; rua=mailto:rapports@exemple.fr
```

3. L’adresse `rua` reçoit les rapports.
4. Relancez l’audit.
