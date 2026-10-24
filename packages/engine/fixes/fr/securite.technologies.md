---
title: Ne plus annoncer les versions du serveur
why: Un numéro de version indique quelle faille connue essayer contre votre site.
effortMinutes: 15
sources:
  - ANSSI | https://cyber.gouv.fr/publications/recommandations-relatives-a-la-securisation-des-sites-web
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Server
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/X-Powered-By
---
## netlify
1. Netlify n'annonce pas de version dans l'en-tête `Server`.
2. Si une de vos fonctions ajoute `X-Powered-By`, retirez-le de sa réponse.
3. Le fichier `_headers` ajoute des en-têtes, il ne peut pas en retirer.
4. Publiez à nouveau le site, puis relancez l'audit.

## github_pages
Limite : GitHub Pages fixe lui-même les en-têtes de ses serveurs.
Alternative : GitHub n'y annonce pas de version, rien n'est à faire de ce côté.
Si une version apparaît quand même, elle vient d'un autre service devant le site.

## generic
1. Apache : ajoutez ces deux lignes à la configuration.

```
ServerTokens Prod
ServerSignature Off
```

2. nginx : ajoutez `server_tokens off;` dans le bloc `http`.
3. PHP : passez `expose_php = Off` dans le fichier `php.ini`.
4. Redémarrez le service, puis relancez l'audit.
