---
title: Renouveler le certificat du site
why: Un certificat périmé ou au mauvais nom affiche une alerte et bloque une partie des visiteurs.
effortMinutes: 20
sources:
  - MDN | https://developer.mozilla.org/fr/docs/Web/Security/Transport_Layer_Security
---
## netlify
1. Le fichier `_headers` ne renouvelle pas le certificat.
2. Ouvrez le tableau de bord, partie domaine et certificat.
3. Vérifiez que le renouvellement automatique est actif, et que le nom du site est couvert.
4. S'il reste moins de 30 jours, relancez le renouvellement, puis relancez l'audit.

## github_pages
Limite : GitHub Pages ne vous laisse pas déposer votre propre certificat.
Alternative : dans les réglages Pages, vérifiez le domaine et le forçage de l'adresse chiffrée.
Le certificat est alors fourni et renouvelé pour vous.
S'il ne se renouvelle pas, retirez puis remettez le domaine, ou changez d'hébergeur.

## generic
1. Demandez un certificat qui couvre exactement le nom du site, et le nom avec www si vous l'utilisez.
2. Faites-le renouveler avant les 30 derniers jours.
3. La chaîne complète doit mener à une autorité reconnue par les navigateurs.
4. Relancez l'audit.
