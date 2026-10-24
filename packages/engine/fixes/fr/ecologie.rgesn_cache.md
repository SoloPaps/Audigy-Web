---
title: Laisser le navigateur garder les fichiers stables
why: Un fichier déjà reçu n’a pas à retraverser le réseau à chaque visite.
effortMinutes: 20
sources:
  - Numérique écoresponsable | https://ecoresponsable.numerique.gouv.fr/publications/referentiel-general-ecoconception/critere/6.2/
  - Mozilla | https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Cache-Control
---
## netlify
1. Donnez une longue durée de cache aux images, scripts et feuilles.
2. Gardez une durée courte pour la page HTML.
3. Publiez, puis relancez l’audit.

## github_pages
1. Versionnez les fichiers pour pouvoir les garder longtemps.
2. Limite : vous ne réglez pas l’en-tête de cache de cet hébergeur.
3. Alternative : placez les gros fichiers chez un hébergeur que vous réglez.

## generic
1. Envoyez Cache-Control sur les fichiers qui changent peu.
2. Changez le nom du fichier quand son contenu change.
3. Relancez l’audit.
