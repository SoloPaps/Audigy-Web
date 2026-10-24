---
title: Nom de domaine : signer les réponses DNS
why: Sans signature, un faux serveur DNS peut répondre à la place du vôtre.
effortMinutes: 40
sources:
  - RFC 4033 | https://www.rfc-editor.org/rfc/rfc4033
---
## netlify
Limite : le DNS Netlify ne signe pas la zone.
Alternative : gardez la signature chez votre DNS, et pointez le site vers Netlify.
Ne retirez pas une signature déjà active.

## github_pages
Limite : un nom github.io est signé par GitHub, pas par vous.
Alternative : pour un domaine à vous, activez la signature chez le bureau d’enregistrement.
Le dépôt ne contient pas cet interrupteur.

## generic
1. Activez la signature du nom (DNSSEC) chez le bureau d’enregistrement.
2. Copiez l’enregistrement DS fourni par le serveur DNS.

```
exemple.fr. DS 12345 13 2 abcd
```

3. Attendez la propagation, puis relancez l’audit.
