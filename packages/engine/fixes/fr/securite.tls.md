---
title: N’accepter que les chiffrements récents
why: Un vieux chiffrement peut être lu par quelqu’un qui intercepte la visite.
effortMinutes: 30
sources:
  - ANSSI | https://cyber.gouv.fr/publications/recommandations-relatives-a-la-securisation-des-sites-web
  - MDN | https://developer.mozilla.org/fr/docs/Glossary/TLS
---
## netlify
Limite : Netlify choisit les versions de chiffrement du bord.
1. Ouvrez le domaine, puis le certificat.
2. Gardez le certificat géré par Netlify.
3. Relancez l’audit. TLS 1.0 et TLS 1.1 doivent être absents.

## github_pages
Limite : GitHub Pages fixe le chiffrement. Vous ne le réglez pas.
Alternative : un domaine à vous, placé derrière un service que vous réglez.
1. Sur github.io, le bord est déjà récent.
2. Sur un domaine à vous, coupez TLS 1.0 et TLS 1.1 chez le service devant le site.

## generic
1. Dans le serveur, n’acceptez que TLS 1.2 et TLS 1.3.
2. Coupez TLS 1.0 et TLS 1.1.
3. Relancez l’audit.
