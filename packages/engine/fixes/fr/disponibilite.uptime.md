---
title: Rendre le site plus souvent joignable
why: Une partie des sondes planifiées n’a pas obtenu de réponse.
effortMinutes: 30
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/HTTP/Status
---
## netlify
1. Vérifiez que le site répond sans erreur sur son adresse publique.
2. Attendez plusieurs sondes. Le pourcentage se met à jour seul.
3. Relancez l’audit quand les sondes sont revenues.

## github_pages
1. Vérifiez que l’adresse publiée répond.
2. Limite : GitHub Pages ne montre pas ces sondes.
3. Alternative : suivez le pourcentage après plusieurs contrôles.

## generic
1. Vérifiez que l’adresse publique répond.
2. Laissez les sondes planifiées s’accumuler.
