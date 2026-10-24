---
title: Courrier : signer les messages qui partent
why: Sans signature, un serveur peut douter que le message vient de vous.
effortMinutes: 30
sources:
  - RFC 6376 | https://www.rfc-editor.org/rfc/rfc6376
---
## netlify
1. Demandez le sélecteur et la clé à votre messagerie.
2. Ouvrez le menu DNS, puis le domaine.
3. Ajoutez un TXT sur `selecteur._domainkey`.

```
v=DKIM1; k=rsa; p=colle-ici-la-cle
```

4. Ne laissez pas la clé vide : cela révoque la signature.
5. Enregistrez, puis relancez l’audit.

## github_pages
Limite : le dépôt ne contient pas le DNS du nom.
Alternative : ajoutez le TXT chez le bureau d’enregistrement.
Sur un nom github.io, ce réglage est impossible.
La signature se pose sur le nom qui envoie le courrier.

## generic
1. Copiez la clé fournie par la messagerie.
2. Publiez-la en TXT sur `selecteur._domainkey`.

```
v=DKIM1; k=rsa; p=colle-ici-la-cle
```

3. Relancez l’audit.
4. Un autre sélecteur que les noms courants reste valable.
