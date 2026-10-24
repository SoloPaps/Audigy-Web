---
title: Mettre à jour le serveur et le gestionnaire de contenu
why: Des robots cherchent sans cesse les logiciels serveur anciens qui portent une faille connue.
effortMinutes: 60
sources:
  - NVD | https://nvd.nist.gov/developers/vulnerabilities
  - CISA KEV | https://www.cisa.gov/known-exploited-vulnerabilities-catalog
  - ANSSI | https://cyber.gouv.fr/publications/recommandations-relatives-a-la-securisation-des-sites-web
---
## netlify
1. Netlify gère ses serveurs et leurs correctifs.
2. Si le constat cite un gestionnaire de contenu, mettez-le à jour là où il tourne.
3. Pour WordPress : Tableau de bord, puis Mises à jour, puis Mettre à jour.
4. Relancez l'audit.

## github_pages
Limite : GitHub gère ses serveurs, vous n'y avez pas accès.
Alternative : si le constat cite un autre service, mettez-le à jour chez lui.
Relancez ensuite l'audit.

## generic
1. Demandez à votre hébergeur la mise à jour du logiciel cité.
2. Sur un serveur à vous, appliquez les mises à jour de la distribution.

```
sudo apt update && sudo apt upgrade
```

3. Une distribution corrige parfois sans changer le numéro affiché. Lisez son bulletin de sécurité.
4. Pour WordPress : Tableau de bord, puis Mises à jour.
5. Relancez l'audit.
