---
title: Corriger le HTML invalide
why: Un HTML invalide peut s’afficher de travers selon le navigateur.
effortMinutes: 40
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Glossary/HTML
  - html-validate | https://html-validate.org/rules/close-order.html
---
## netlify
1. Ouvrez le modèle de la page signalée.
2. Fermez les balises dans l’ordre, et ajoutez le type de document.
3. Publiez à nouveau, puis relancez l’audit.

## github_pages
1. Corrigez le HTML dans le fichier publié.
2. Limite : un thème imposé peut réécrire une partie du HTML.
3. Alternative : corrigez le modèle du thème, ou changez de thème.

## generic
1. Ajoutez `<!doctype html>` en tête de page.
2. Fermez chaque balise ouverte, sans en chevaucher deux.
3. Relancez l’audit après la mise en ligne.
