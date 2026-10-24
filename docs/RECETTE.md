# Recette — PART-26

Mesures du 24 oct. 2026, sur le build statique servi en local (`pnpm self-audit`). Aucun déploiement Netlify. Aucun domaine acheté. Aucun secret de production touché. Les hôtes autres que la boucle locale ne sont pas contactés.

## Auto-audit

| Domaine | Note | Couverture | Lecture |
|---|---|---|---|
| securite | 100 | 88 % | mesuré |
| seo | 100 | 62 % | mesuré |
| qualite | 100 | 100 % | mesuré |
| vie_privee | non mesuré | 33 % | checks navigateur absents hors ligne |
| performance | non mesuré | 0 % | PSI / CrUX absents |
| ecologie | non mesuré | 0 % | PSI absent ; hébergeur non testé (adresse IP) |
| accessibilite | non mesuré | 0 % | pas de check moteur ; voir Lighthouse et axe |
| dns_email | non mesuré | 0 % | DNS public absent |
| reputation | non mesuré | 0 % | hors ligne |
| disponibilite | non mesuré | 0 % | hors ligne |

Poids de l’accueil : 75 255 octets (plafond 500 000). Polices : 58 668 octets (plafond 409 600). Tiers : aucun. Hydratation Chromium sous la CSP du build : le thème sombre s’applique, sans refus de script.

Non testés, volontairement, parce que la source n’existe pas en local : certificat TLS, Search Console, Lighthouse SEO, cache et métriques de performance, DNS et courrier, CO₂ et EcoIndex, bandeau et traceurs (navigateur). Un domaine noté sous 90 ferait échouer `pnpm self-audit`. Un domaine exigé sans note aussi (`securite`, `seo`, `qualite`).

## Ce que la CI fait

- [x] Entrées : schémas zod déjà en place (audit, suppression avec la confirmation `supprimer`, version des CGU).
- [x] RLS : chaque table `public` a `enable row level security`. `rate_limits` et `oauth_tokens` n’ont pas de politique (rôle service seulement).
- [x] En-têtes communs : `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (caméra, micro, géolocalisation fermés), HSTS `max-age=63072000; includeSubDomains`.
- [x] CSP stricte par page, écrite dans `apps/web/dist/_headers` après le build : empreintes des scripts et styles en ligne, `script-src-attr 'none'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`. Pas de `unsafe-inline` sur les scripts. `netlify.toml` ne porte pas de CSP (deux politiques se cumuleraient).
- [x] Anti-abus : création d’audit, 10 par jour et par personne et 1 par hôte et par 15 min ; avis, 30 par heure ; export et acceptation des CGU, 30 par heure ; suppression de compte, 5 par jour UTC. Au-delà : 429 et `Retry-After`. Une erreur de base refuse la requête.
- [x] `security.txt` : contact identique à `legal.email`, expiration `2027-12-31T23:00:00.000Z`, pas de champ Canonical.
- [x] Poids, polices et absence de traceurs ou de polices tierces sur le build.
- [x] Notes moteur ci-dessus.
- [x] Hydratation Chromium de l’accueil avec la CSP réelle.
- [x] Noms accessibles de la jauge (`img`) et de la liste des domaines (Playwright, page `/dev/composants`).
- [x] axe : 0 violation sur les parcours Playwright existants.
- [x] Lighthouse accessibilité = 100 sur les pages de `scripts/lighthouse-a11y.mjs`, clair et sombre quand les deux thèmes y sont listés.
- [x] copy-lint : 0 erreur, 0 avertissement (emoji, capitales, formules marketing, phrases de plus de 20 mots).
- [x] Reflow 320 px (accueil, composants, vérification), largeurs 320 / 640 / 768 / 1280 sur l’accueil, mouvement réduit sur la jauge.
- [x] `pnpm guard` : pas de déploiement Netlify dans le dépôt.

## Checklist DESIGN §9

- [x] Motifs interdits : pas de nouveau décor. copy-lint bloque les formules et les emoji.
- [x] Tokens : le déplacement du style `astro-island` dans `<head>` ne change pas les couleurs.
- [x] Statut : la jauge annonce le niveau en mots (`problème`, `bon`, `non testé`), pas seulement par la couleur. Niveaux de gris et daltonisme : voir le propriétaire.
- [x] Contraste : Lighthouse accessibilité = 100 sur les pages listées, dans les thèmes listés.
- [ ] Lecteur d’écran réel (NVDA ou VoiceOver) sur la jauge et la liste. La CI ne vérifie que les noms accessibles.
- [x] Texte : français, vouvoiement, copy-lint vert. La relecture juridique des pages légales reste celle du propriétaire (déjà indiquée sur ces pages).
- [x] Graphiques : l’historique a un tableau (test Playwright existant).
- [ ] Zoom 200 % et parcours clavier complet de chaque page, à la main. Le lien d’évitement et le reflow 320 px sont automatisés.
- [x] `prefers-reduced-motion` : la jauge ne s’anime plus (test Playwright).
- [x] Poids et 0 tiers, sur le build.

Pages Lighthouse en clair seulement : confidentialité, mentions, accessibilité, méthode. Pages hors de ce script : lancement, domaine, progression, rapport écran, retour de connexion. Le propriétaire les passe au lecteur d’écran et au zoom.

## Reste au propriétaire

- [ ] NVDA ou VoiceOver : la jauge lit sa note (« 0 sur 100, problème », « 100 sur 100, bon », « non testé ») et la liste des domaines contient « sur 100 ».
- [ ] Firefox sur le build (`apps/web/dist` + `_headers`), pas seulement Chromium. Changer le thème. Aucun message « content security policy ».
- [ ] Niveaux de gris et simulateur de daltonisme sur une note bonne, moyenne et mauvaise.
- [ ] Zoom 200 % sans perte de contenu, à 320 px, 768 px et 1280 px.
- [ ] Liens externes : la recette locale répond 200 sans les ouvrir. Vérifier à la main ceux qui comptent.
- [ ] Avant le 31 déc. 2027 : mettre à jour `Expires` dans `apps/web/public/.well-known/security.txt`.
- [ ] HSTS `includeSubDomains` : le confirmer au moment du domaine. Un sous-domaine qui resterait en HTTP deviendrait injoignable.
- [ ] Quand le domaine existera (Q7, non acheté) : URLs absolues dans le plan du site. Les chemins relatifs sont voulus pour l’audit local.
- [ ] PART-27 seulement : déploiement Netlify unique, sans liaison Git. Puis auto-audit en production, note ≥ 90 sur chaque domaine applicable (HTTPS, certificat, DNS, courrier, PSI, CrUX, Green Web, vie privée navigateur). Cette PART ne le fait pas.
