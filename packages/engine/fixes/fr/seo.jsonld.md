---
title: Décrire le contenu aux moteurs
why: Une donnée structurée aide les moteurs à comprendre le contenu.
effortMinutes: 30
sources:
  - Google | https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
  - Schema.org | https://schema.org/docs/gs.html
---
## netlify
1. Ajoutez un bloc JSON dans l’en-tête de la page.
2. Choisissez un type connu, par exemple LocalBusiness ou Article.

```
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"LocalBusiness","name":"Cabinet"}
</script>
```

3. Le bloc doit être un JSON valide, avec un type.
4. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Ajoutez le bloc JSON dans le fichier HTML du dépôt.
2. Limite : GitHub Pages ne permet pas de régler les en-têtes HTTP.
3. Alternative : le bloc dans la page suffit, sans en-tête.

## generic
1. Ajoutez un bloc JSON valide, avec un type connu.
2. Décrivez le lieu, la personne ou l’article réellement publié.
3. Relancez l’audit après la mise en ligne.
