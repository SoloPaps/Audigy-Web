---
title: Nom de domaine : choisir qui crée un certificat
why: Sans liste, n’importe quel organisme peut créer un certificat pour ce nom.
effortMinutes: 10
sources:
  - RFC 8659 | https://www.rfc-editor.org/rfc/rfc8659
---
## netlify
1. Ouvrez le menu DNS, puis le domaine.
2. Ajoutez un enregistrement CAA.
3. Autorisez Let’s Encrypt, sinon le certificat du site ne se renouvelle pas.

```
0 issue "letsencrypt.org"
```

4. Enregistrez, puis relancez l’audit.

## github_pages
Limite : le dépôt ne contient pas le DNS du nom.
Alternative : ajoutez le CAA chez le bureau d’enregistrement.
Sur un nom github.io, le certificat est celui de GitHub.
Vous ne choisissez pas l’organisme.

## generic
1. Ajoutez un CAA `issue` pour chaque organisme autorisé.

```
0 issue "letsencrypt.org"
```

2. Pour n’en autoriser aucun, publiez un point-virgule.

```
0 issue ";"
```

3. Relancez l’audit.
