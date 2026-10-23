---
title: Verrouiller les traces déposées
why: Une trace mal réglée peut être copiée sur le réseau ou lue par un script de la page.
effortMinutes: 20
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Set-Cookie
  - ANSSI | https://cyber.gouv.fr/publications/recommandations-relatives-a-la-securisation-des-sites-web
---
## netlify
1. N'ajoutez pas de trace dans le fichier `_headers` : elle serait envoyée à chaque page.
2. Si une fonction en dépose une, renvoyez une ligne de ce genre.

```
Set-Cookie: session=…; Secure; HttpOnly; SameSite=Lax; Path=/
```

3. `Secure` impose l'adresse chiffrée. `HttpOnly` cache la trace au code de la page.
4. Publiez à nouveau le site, puis relancez l'audit.

## github_pages
Limite : GitHub Pages ne peut pas poser une trace cachée au code de la page.
Le code de la page ne peut pas ajouter `HttpOnly`.
Alternative : ne déposez pas de trace de session sur ce site.
Si vous en avez besoin, déplacez cette partie chez un hébergeur qui écrit l'en-tête.

## generic
1. Chaque trace doit porter `Secure` et `SameSite=Lax`, ou `SameSite=Strict`.
2. Une trace de session doit aussi porter `HttpOnly`.
3. Un nom qui commence par `__Host-` exige `Secure`, `Path=/`, et aucun `Domain`.
4. Relancez l'audit.
