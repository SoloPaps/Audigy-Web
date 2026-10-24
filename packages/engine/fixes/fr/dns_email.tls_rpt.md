---
title: Courrier : recevoir les échecs de chiffrement
why: Sans rapport, vous ne voyez pas les échecs de chiffrement du courrier.
effortMinutes: 15
sources:
  - RFC 8460 | https://www.rfc-editor.org/rfc/rfc8460
---
## netlify
1. Ouvrez le menu DNS, puis le domaine.
2. Ajoutez un TXT sur `_smtp._tls`.

```
v=TLSRPTv1; rua=mailto:rapports@exemple.fr
```

3. Lisez les rapports reçus à cette adresse.
4. Enregistrez, puis relancez l’audit.

## github_pages
Limite : le dépôt ne contient pas le DNS du nom.
Alternative : ajoutez le TXT chez le bureau d’enregistrement.
Sur un nom github.io, ce réglage est impossible.
Utilisez un nom qui vous appartient.

## generic
1. Ajoutez un TXT sur `_smtp._tls`.

```
v=TLSRPTv1; rua=mailto:rapports@exemple.fr
```

2. Vous pouvez aussi donner une adresse HTTPS à la place du courrier.
3. Relancez l’audit.
