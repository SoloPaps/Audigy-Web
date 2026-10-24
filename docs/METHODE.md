# Méthode de notation Audigy — version 2026.1

Cette page décrit comment Audigy calcule ses notes. Toute modification de pondération ou de règle crée une nouvelle version. La version est enregistrée sur chaque audit (`method_version`).

## 1. Résultat d'un test

Chaque test (« check ») donne un statut :

| Statut | Sens | Valeur |
|---|---|---|
| Réussi (`pass`) | conforme | 1 |
| À améliorer (`warn`) | partiellement conforme | 0,5 |
| Problème (`fail`) | non conforme | 0 |
| Non testé (`untested`) | test impossible, avec la raison | exclu |
| Non applicable (`na`) | sans objet pour ce site | exclu |

Un test peut fournir une valeur entre 0 et 1 à la place de la valeur par défaut (par exemple un score Lighthouse de 0,83).

Chaque test a un poids de 1, 2 ou 3 dans son domaine. Le score Lighthouse d'un domaine compte pour un test de poids 3.

## 2. Quand un test devient « Non testé »

Le test n'est pas compté, et la raison est affichée (« Nous n'avons pas pu tester… ») dans ces cas :

- test **actif** alors que la propriété du site n'est pas vérifiée et revérifiée juste avant ; le test n'est alors jamais lancé ;
- source de données absente (clé API, quota, navigateur d'audit) ;
- délai dépassé (30 s par défaut, propre à chaque test sinon) ;
- erreur pendant le test, ou résultat inutilisable.

Les tests qui demandent un navigateur (vie privée, poids réel de la page) passent par un navigateur d'audit séparé. Pendant son travail, l'audit est « partiel ». Audigy l'attend au plus 10 minutes. S'il ne répond pas, ces tests sont « Non testé », avec la raison, et l'audit se termine.

Un test passif fait seulement ce que ferait un visiteur ou un moteur de recherche. Un test actif (chemins non liés, énumération TLS, crawl étendu) exige un site vérifié.

## 3. Score d'un domaine

Score = arrondi de 100 × Σ(poids × valeur) / Σ(poids), sur les tests Réussi, À améliorer et Problème.

Couverture = poids des tests notés / poids des tests applicables (les tests `na` sont retirés du total).

Si la couverture est **inférieure à 50 %**, le domaine est affiché « Non testé », sans chiffre. Une note bâtie sur trop peu de tests serait trompeuse.

## 4. Score global

Le score global est la moyenne, à poids égaux, des domaines notés parmi les 8 principaux : performance, SEO, sécurité, écologie, accessibilité, qualité technique, vie privée, DNS et e-mail. Il est arrondi à l'entier.

Réputation et Disponibilité sont affichées à part et ne comptent pas dans le score global.

La couverture globale affichée est le nombre de domaines principaux notés sur 8. Sans aucun domaine noté, le score global est « Non testé ».

## 5. Niveaux

| Score | Niveau |
|---|---|
| 80 à 100 | Bon |
| 50 à 79 | À améliorer |
| 0 à 49 | Problème |
| — | Non testé |

## 6. Ordre des corrections

Les points « Problème » et « À améliorer » sont classés par gravité décroissante, puis impact décroissant, puis effort croissant (indiqué par la fiche de correction). À égalité, l'ordre suit l'identifiant du test, pour un résultat toujours identique.

## 7. Reproductibilité

Pour les mêmes réponses du site et des sources, le rapport est identique, quel que soit l'ordre ou le parallélisme d'exécution des tests.

## 8. Sécurité passive

Onze tests passifs, version 2026.1. La grille s'inspire de [MDN HTTP Observatory](https://developer.mozilla.org/en-US/observatory/docs/tests_and_scoring) (méthode Mozilla du 27 février 2024, modificateurs sur une base de 100). Audigy ne soustrait pas ces points : chaque test vaut Réussi (1), À améliorer (0,5) ou Problème (0), avec le poids ci-dessous.

Correspondance utilisée, sauf mention :

| Modificateur Observatory | Statut Audigy |
|---|---|
| 0 ou positif | Réussi |
| de −5 à −10 | À améliorer |
| −20 ou moins, ou contrôle absent quand il est indispensable | Problème |

Le test suit les redirections comme un visiteur. Il ne distingue pas une redirection permanente d'une redirection temporaire. La liste de préchargement HSTS n'est pas consultée. Le contenu mixte chargé par le navigateur est hors de ce lot. Les fichiers non liés et les versions de chiffrement sont des tests actifs, au §16. Les technologies et leurs failles connues sont au §14.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| securite.https | 3 | L'adresse finale est chiffrée, et la première redirection de l'adresse non chiffrée va vers le même nom en chiffré. Ou l'adresse non chiffrée ne répond pas. | La première redirection change de nom, ou passe encore par une adresse non chiffrée. | L'adresse finale n'est pas chiffrée, ou la redirection n'aboutit pas. |
| securite.hsts | 3 | En-tête présent sur la réponse chiffrée, `max-age` d'au moins 15768000 secondes (six mois). `includeSubDomains` n'est pas exigé. | `max-age` positif mais inférieur à six mois. | En-tête absent, illisible, `max-age` à 0 (la protection est effacée), ou page finale non chiffrée. |
| securite.csp | 3 | Politique lisible. Scripts et objets limités, sans `unsafe-inline` (sauf jeton ou empreinte), sans `unsafe-eval`, sans `http:`, `https:` seul, `data:` ni `*`. `unsafe-inline` seulement pour les styles reste Réussi : Observatory le compte 0. Le constat note alors `styleLoose`. | Seulement `unsafe-eval`, ou images et médias autorisés en `http:`. | Politique absente, illisible, ou scripts ou objets trop ouverts. |
| securite.xcto | 1 | Valeur `nosniff`. | En-tête absent. | Valeur présente mais autre que `nosniff`. |
| securite.frames | 2 | `frame-ancestors` vaut `none`, `self` ou une liste d'origines explicite, ou `X-Frame-Options` vaut `DENY` ou `SAMEORIGIN`. Si les deux existent, `frame-ancestors` l'emporte. | `ALLOW-FROM` seul. Observatory met 0 ; Audigy met À améliorer, car les navigateurs actuels ignorent cette forme. | Rien, valeur inconnue, ou `frame-ancestors` trop ouvert (`*`, `http:`, `https:`). |
| securite.referrer | 1 | `no-referrer`, `same-origin`, `strict-origin` ou `strict-origin-when-cross-origin`. En-tête absent : Réussi (Observatory 0), le constat le dit. La dernière valeur reconnue l'emporte. | `no-referrer-when-downgrade`, `origin`, `origin-when-cross-origin` ou `unsafe-url`. | En-tête présent sans aucune valeur reconnue. |
| securite.permissions | 1 | `camera`, `microphone` et `geolocation` sont cités et aucun n'est ouvert à tous (`*`). | En-tête absent, ou l'une de ces trois fonctions n'est pas citée. | Syntaxe illisible, ou l'une de ces fonctions vaut `*`. |
| securite.cookies | 3 | Aucune trace, ou toutes sont `Secure`, celles de session sont `HttpOnly`, et `SameSite` vaut `Strict`, `Lax` ou `None` avec `Secure`. L'absence de `SameSite` reste Réussi (Observatory 0). | `Secure` manque, mais la réponse est chiffrée et HSTS dure au moins six mois. | Trace posée hors chiffrement, session sans `Secure` ou sans `HttpOnly`, `SameSite` invalide, jeton anti-CSRF sans `SameSite`, ou préfixe `__Host-` / `__Secure-` contredit. La valeur de la trace n'est pas conservée. |
| securite.certificate | 3 | Chaîne reconnue, nom couvert, au moins 30 jours restants. Le nom contrôlé est celui saisi, port 443. | Moins de 30 jours, y compris moins d'un jour. | Périmé, pas encore valable, mauvais nom, ou chaîne non reconnue. |
| securite.mixed | 2 | Page chiffrée en HTML, aucun élément `http:`. | Seulement des images, du son, de la vidéo ou une icône. | Script, feuille de style, cadre, objet, formulaire, `base`, police ou `@import` en `http:`. |
| securite.security_txt | 1 | `/.well-known/security.txt` en HTTPS, type `text/plain`, au moins un `Contact` (`mailto`, `https` ou `tel`), `Expires` dans plus de 14 jours. La signature n'est pas vérifiée. | Échéance sous 14 jours, fichier seulement à `/security.txt`, mauvais type, ou `Canonical` différent. | Introuvable (404 ou 410 aux deux adresses), sans contact, sans date, ou date dépassée. Une autre réponse devient Non testé. |

## 9. Performance

Sept tests passifs, version 2026.1. Le laboratoire vient de PageSpeed Insights : mobile et ordinateur, catégories performance, accessibilité, bonnes pratiques et référencement. Seule la catégorie performance est notée ici. Les trois autres sont conservées pour les domaines qui s’en servent. Le terrain (LCP, INP, CLS) vient de l’API CrUX, pas du bloc CrUX inclus dans PSI : d’abord l’adresse exacte, sinon l’origine, pour le téléphone, sur 28 jours.

Le score de laboratoire retenu est le plus faible des deux, arrondi au point le plus proche. 80 ou plus : Réussi. De 50 à 79 : À améliorer. Moins de 50 : Problème. S’il manque une des deux mesures, le constat le dit. Si le score disponible vaut au moins 80, le statut devient À améliorer. La valeur notée reste celle mesurée.

Le poids, le cache et la compression utilisent la note Lighthouse du pire des deux contextes, avec les mêmes seuils de 80 et de 50. Le poids affiché est celui de ce contexte.

Les seuils de visite réelle sont ceux des Core Web Vitals. LCP : au plus 2,5 s, puis 4 s. INP : au plus 200 ms, puis 500 ms. CLS : au plus 0,1, puis 0,25. Sans donnée de visite réelle, pour l’adresse et pour l’origine, ces trois tests sont Non applicable. Ils sortent du total de couverture. Ce n’est pas un défaut du site. Si une seule mesure manque dans un rapport reçu, ce test reste Non testé.

Une clé absente ou une réponse 429 donne Non testé, avec la raison. Une erreur réseau ou un code 5xx est réessayé une fois. L’appel de laboratoire attend au plus 120 secondes. Une réponse réussie, un quota ou une absence de terrain est réutilisée le même jour (UTC) pour la même adresse. La clé d’API n’est pas conservée.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| performance.lighthouse | 3 | Les deux scores sont là, et le plus faible vaut au moins 80. | Le plus faible est entre 50 et 79, ou une seule mesure est disponible alors que son score vaut au moins 80. | Le plus faible est sous 50. |
| performance.lcp | 2 | p75 ≤ 2,5 s | p75 ≤ 4 s | p75 > 4 s |
| performance.inp | 2 | p75 ≤ 200 ms | p75 ≤ 500 ms | p75 > 500 ms |
| performance.cls | 2 | p75 ≤ 0,1 | p75 ≤ 0,25 | p75 > 0,25 |
| performance.poids | 1 | Note Lighthouse du poids ≥ 80 | Note entre 50 et 79 | Note sous 50 |
| performance.cache | 1 | Note Lighthouse du cache ≥ 80 | Note entre 50 et 79 | Note sous 50 |
| performance.compression | 1 | Note Lighthouse de la compression ≥ 80 | Note entre 50 et 79 | Note sous 50 |

## 10. Référencement

Douze tests passifs, version 2026.1. La note Lighthouse de référencement est celle déjà demandée avec la performance (catégories mobile et ordinateur, dans `ctx.shared`). Elle n’entraîne pas un second appel. Le score retenu est le plus faible des deux, avec les mêmes seuils : 80, puis 50. S’il manque une des deux mesures et que le score disponible vaut au moins 80, le statut devient À améliorer. Sans lot, sans clé, sur un quota ou sur une erreur, le test est Non testé.

Les autres tests lisent la page demandée, puis `robots.txt` et le plan du site à la racine du domaine. Quand l’audit porte sur un chemin (un site publié dans un sous-dossier), ces deux fichiers sont à la racine, hors de la portée : ils sont Non applicable, sans requête. Un moteur ne lit le fichier robots qu’à cette racine.

Le plan annoncé dans `robots.txt` est lu en premier. Sinon, `/sitemap.xml`. Au plus cinq fichiers et vingt adresses sont demandés. Une adresse absente du plan manquant est À améliorer : un plan n’est pas obligatoire. Une adresse annoncée qui ne répond pas est un Problème. Les adresses d’un autre site ne sont pas demandées.

Le titre se compte en caractères : de 15 à 60. La description : de 50 à 160. Ce ne sont pas des largeurs d’affichage. L’absence de description est À améliorer. L’absence de titre est un Problème. Si le titre et la description répètent le même texte, c’est un doublon.

`noindex`, dans la page ou dans l’en-tête `X-Robots-Tag`, est un Problème pour Googlebot et pour la consigne sans nom. `none` compte comme `noindex`. Une autre langue absente est Non applicable : un site en une seule langue n’a rien à déclarer. Une donnée structurée absente est À améliorer. Le type doit être dans une liste de base (WebSite, LocalBusiness, Article, Product, Organization, Person, FAQPage, BreadcrumbList, Event, et les types voisins). Un type hors liste est À améliorer. Un fichier illisible est un Problème.

Search Console est facultatif, en lecture seule. Sans connexion, les trois tests d’indexation sont Non testé, avec un lien pour relier le compte. La propriété retenue est le préfixe d’adresse le plus long, sinon `sc-domain:` du domaine ou d’un parent. Un compte sans propriété correspondante laisse ces tests Non testés. Un plan sans erreur est Réussi. L’absence de plan, des avertissements ou une attente sont À améliorer. Une erreur signalée est un Problème. La page d’accueil indexée est Réussi. Une page connue mais incomplète est À améliorer. Un refus d’indexation est un Problème. Le résumé compare les pages annoncées et celles indexées. Au moins huit sur dix est Réussi. Moins, ou aucune annonce, est À améliorer. Aucune page indexée alors que le plan en annonce est un Problème.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| seo.lighthouse | 3 | Les deux scores sont là, et le plus faible vaut au moins 80. | Le plus faible est entre 50 et 79, ou une seule mesure est disponible alors que son score vaut au moins 80. | Le plus faible est sous 50. |
| seo.robots | 2 | Le fichier laisse Googlebot lire l’adresse auditée, ou il n’existe pas (404 ou 410). | — | Le fichier bloque l’adresse, ou ce n’est pas un texte de règles. Hors chemin : Non applicable. |
| seo.sitemap | 2 | Le plan est lisible et les adresses vérifiées (20 au plus) répondent 200, sans changer de page. | Aucun plan, adresses d’un autre site, ou redirection vers une autre page. | Fichier illisible, plan annoncé absent, plan vide, ou adresse qui ne répond pas 200. Hors chemin : Non applicable. |
| seo.noindex | 3 | Ni la page ni l’en-tête ne demandent `noindex`. | — | `noindex` ou `none` pour tout le monde ou pour Googlebot. |
| seo.canonical | 2 | Une seule adresse de référence, identique à la page. | Adresse absente, répétée à l’identique, ou pointant vers une autre page du même site. | Adresse illisible, contradictoire, ou vers un autre site. |
| seo.title | 2 | Un seul titre, de 15 à 60 caractères. | Titre trop court, trop long, ou répété à l’identique. | Titre absent, ou plusieurs titres différents. |
| seo.description | 1 | Une seule description, de 50 à 160 caractères, différente du titre. | Absente, trop courte, trop longue, identique au titre, ou répétée. | — |
| seo.hreflang | 1 | Chaque langue a une adresse complète, sans conflit, et la page se cite. | Adresse relative, ou la page ne se cite pas. Aucune langue : Non applicable. | Code invalide, adresse inutilisable, ou la même langue vise deux adresses. |
| seo.jsonld | 1 | Au moins un bloc lisible, et chaque type est dans la liste de base. | Bloc absent, ou type hors liste. | Bloc illisible, ou type manquant. |
| seo.gsc_indexed | 1 | Au moins huit pages annoncées sur dix sont indexées. | Moins de huit sur dix, ou aucune page annoncée. | Des pages sont annoncées et aucune n’est indexée. Sans connexion : Non testé. |
| seo.gsc_inspection | 2 | Google a indexé la page d’accueil. | La page est connue, sans indexation complète. | Google refuse d’indexer la page d’accueil. Sans connexion : Non testé. |
| seo.gsc_sitemaps | 2 | Au moins un plan est envoyé, sans erreur. | Aucun plan, des avertissements, ou des plans encore en attente. | Un plan envoyé contient des erreurs. Sans connexion : Non testé. |

## 11. DNS et e-mail

Huit tests passifs, version 2026.1. Les enregistrements sont lus par DNS sur HTTPS, sur le nom du site. Un préfixe `www` est retiré. Les autres sous-domaines ne remontent pas au domaine parent. La politique `sp` de DMARC et l’autorisation d’un rapport vers un autre nom ne sont pas notées.

Sur un nom `github.io`, ou sur une adresse IP, chaque test est **Non applicable**. Le domaine n’a pas de note : rien n’est à régler depuis ce site.

Un nom sans MX, ou avec un MX nul (RFC 7505), n’accepte pas le courrier. Il doit alors interdire l’usurpation : SPF `v=spf1 -all` et DMARC `p=reject`.

SPF compte les consultations selon le RFC 7208 : chaque terme `include`, `a`, `mx`, `ptr`, `exists` ou `redirect` vaut une consultation, et chaque serveur annoncé par `mx` en vaut une de plus. Le compte est un maximum. Au-delà de 10 consultations, ou de 2 consultations vides, le test est en problème. La première lecture du nom lui-même ne compte pas. `all` arrête le décompte.

DKIM interroge seulement les sélecteurs `default`, `google`, `selector1`, `selector2`, `k1`, `mail`, `s1`, `s2` et `dkim`. Aucun de ces noms ne prouve l’absence de signature.

DNSSEC est le drapeau AD du résolveur sur la question SOA. MTA-STS lit l’enregistrement TXT puis le fichier de règle en HTTPS. TLS-RPT lit seulement l’enregistrement TXT.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| dns_email.caa | 1 | Au moins un `issue` cite un organisme, ou `issue ";"` n’en autorise aucun. | Aucun enregistrement, ou pas de `issue` (un `issuewild` seul ne suffit pas). | Enregistrement illisible, ou étiquette inconnue avec le bit critique. |
| dns_email.dkim | 2 | Au moins un sélecteur courant publie une clé. Sans courrier : Non applicable. | Aucun sélecteur courant, ou seulement une clé vide ou illisible. | — |
| dns_email.dmarc | 3 | `p=reject`, `pct` à 100, et un `rua` si le nom reçoit du courrier. Sans courrier, `p=reject` suffit. | `p=none`, `p=quarantine`, `pct` sous 100, ou pas de rapport alors que le nom reçoit du courrier. | Absent, illisible, en double, ou sans `p=reject` alors que le nom n’envoie pas de courrier. |
| dns_email.dnssec | 2 | Le drapeau AD est vrai. | — | Le drapeau AD est faux. Une panne DNS est Non testé. |
| dns_email.mta_sts | 2 | TXT `v=STSv1` et fichier `mode: enforce`. Sans courrier : Non applicable. | TXT absent, mode `testing` ou `none`. | TXT illisible ou en double, fichier absent ou illisible. Un fichier injoignable est Non testé. |
| dns_email.mx | 2 | Au moins un serveur, ou un MX nul seul de priorité 0. | Aucun MX. | MX illisible, ou MX nul mélangé à d’autres serveurs. |
| dns_email.spf | 3 | Une seule annonce lisible, au plus 10 consultations, terminée par `-all`. | `~all`, `?all`, pas de `all`, mécanisme `ptr`, ou macro non suivie. | Absente, en double, illisible, `+all`, boucle, trop de consultations, ou pas de `-all` alors que le nom n’envoie pas de courrier. |
| dns_email.tls_rpt | 1 | TXT `v=TLSRPTv1` avec un `rua`. Sans courrier : Non applicable. | Enregistrement absent. | Enregistrement illisible ou en double. |

## 12. Écologie

Huit tests passifs, version 2026.1. L’EcoIndex et le CO2 par visite sont des estimations. Ils décrivent une page, pas une mesure physique de l’électricité consommée. Les gaz et l’eau de l’EcoIndex ne sont pas le chiffre CO2.js.

Le poids, les requêtes, les éléments, les polices, les images, le cache et la compression viennent du même rapport de laboratoire que la performance. Dans un audit, ce rapport n’est chargé qu’une fois. Le côté retenu est le plus complet (poids, requêtes et éléments), puis le plus lourd. À égalité, le téléphone. Si l’autre côté n’a pas les trois mesures, le constat le dit.

L’unité de l’EcoIndex est le kilooctet décimal : 1 Ko = 1 000 octets. L’affichage du poids, des polices et du budget utilise le kioctet binaire : 1 Kio = 1 024 octets.

### EcoIndex

Formule publique, table de quantiles `ecoindex-5.10.0`. Le score est arrondi à l’entier, moitié vers le pair, puis borné de 0 à 100. La lettre, les gaz et l’eau partent de cet entier.

Score = 100 − 5 × (3 × quantile des éléments + 2 × quantile des requêtes + quantile du poids) / 6.

Lettre : A au-dessus de 80, B au-dessus de 70, C au-dessus de 55, D au-dessus de 40, E au-dessus de 25, F au-dessus de 10, sinon G. 80 est un B.

Gaz, en grammes : 2 + 2 × (50 − score) / 100, arrondi au centième. Eau, en centilitres : 3 + 3 × (50 − score) / 100, arrondi au centième.

Statut : 80 ou plus, Réussi. De 50 à 79, À améliorer. En dessous, Problème.

Trois cas de référence, recalculés avec cette table :

| Éléments | Requêtes | Poids | Score | Lettre | Gaz | Eau |
|---|---|---|---|---|---|---|
| 100 | 100 | 100 Ko | 72 | B | 1,56 g | 2,34 cl |
| 201 | 6 | 107,178 Ko | 87 | A | 1,26 g | 1,89 cl |
| 47 | 2 | 1,37 Ko | 95 | A | 1,1 g | 1,65 cl |

Le premier est l’exemple du README EcoIndex 5.10.0. Le deuxième est l’exemple publié avec la bibliothèque de calcul. Le troisième est le premier palier positif de la table. Sources : <https://github.com/cnumr/ecoindex_python> et <https://www.ecoindex.fr/comment-ca-marche/>.

### CO2 par visite

CO2.js 0.19.0, modèle Sustainable Web Design version 4, calcul `perVisit`. C’est une visite moyenne, avec l’hypothèse de cache du modèle. Seul le poids sert. Le drapeau vert baisse l’intensité du centre de données.

Lettres du modèle, en grammes : A+ jusqu’à 0,04, A jusqu’à 0,079, B jusqu’à 0,145, C jusqu’à 0,209, D jusqu’à 0,278, E jusqu’à 0,359, sinon F.

Réussi : A+, A ou B. À améliorer : C ou D. Problème : E ou F.

Le drapeau vert n’est posé que si l’annuaire répond et liste l’hôte. Si l’annuaire échoue, le calcul garde le réseau moyen et le dit. Un hôte confirmé hors liste garde aussi le réseau moyen.

### Hébergeur

GET `https://api.thegreenwebfoundation.org/api/v3/greencheck/{nom}`. Le nom est l’hôte seul, en minuscules, sans port ni chemin. Le `www` est conservé. Une adresse IP n’est pas envoyée : le test est Non testé. Délai de 8 secondes, un seul réessai sur 408, 429 ou 5xx. Un second 429 est un quota. Toute réponse autre que 200 est Non testé, pas un problème du site. Seule une réponse réussie est réutilisée le même jour (UTC), pour le même hôte.

Ce test ne valide pas le critère 8.5. Il ne lit pas une documentation d’électricité. Le 8.5 reste une question du questionnaire.

### Référentiel, partie automatique

Le référentiel général d’écoconception (version 2024, 78 critères) n’est pas entièrement automatisable. La partie automatique observe une page. Elle ne prouve pas une déclaration écrite. Critères couverts :

| Critère | Test | Observation |
|---|---|---|
| 4.8 | ecologie.rgesn_polices | Fichiers de police et leur poids. |
| 5.1 | ecologie.rgesn_images | Part d’images matricielles en format léger. |
| 6.1 | ecologie.rgesn_budget | Poids et nombre de requêtes, plafonds absolus. |
| 6.2 | ecologie.rgesn_cache | Note Lighthouse du cache, pire des deux côtés. |
| 6.3 | ecologie.rgesn_compression | Note Lighthouse de la compression, pire des deux côtés. |

Les critères 6.2 et 6.3 relisent les mêmes notes que la performance, avec les seuils 80 et 50. Le budget 6.1 ne reprend pas la note Lighthouse du poids.

4.8 : Réussi sans fichier, ou jusqu’à 400 Kio, ou jusqu’à 2 fichiers. À améliorer jusqu’à 4 fichiers, ou si le poids manque. Problème seulement au-delà de 4 fichiers et de 400 Kio.

5.1 : le SVG ne compte pas. Un type inconnu compte comme une image non légère. Réussi à partir de 75 % en WebP, AVIF ou JPEG XL. À améliorer à partir de 50 %. Aucune image matricielle : Sans objet.

6.1 : Réussi jusqu’à 1 Mio et 30 requêtes. À améliorer jusqu’à 2 Mio et 100 requêtes. Au-dessus : Problème. Le pire des deux l’emporte. S’il en manque un, on ne peut pas réussir : un résultat correct ou moyen devient À améliorer, un dépassement reste un Problème.

### Questionnaire

Schéma seulement. Pas de note, pas d’interface. Version 2024, 78 questions. Réponses : oui, partiel, non, na. Les critères 4.8, 5.1, 6.1, 6.2 et 6.3 restent posés, parce que la mesure automatique ne couvre qu’une page.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| ecologie.co2 | 2 | Lettre A+, A ou B | Lettre C ou D | Lettre E ou F |
| ecologie.ecoindex | 3 | Score entier ≥ 80 | Score de 50 à 79 | Score sous 50 |
| ecologie.hebergeur | 2 | L’annuaire liste l’hôte | — | L’annuaire ne liste pas l’hôte |
| ecologie.rgesn_budget | 2 | ≤ 1 Mio et ≤ 30 requêtes | ≤ 2 Mio et ≤ 100, ou une mesure manque | Au-dessus de 2 Mio ou de 100 requêtes |
| ecologie.rgesn_cache | 1 | Note Lighthouse ≥ 80 | Note de 50 à 79 | Note sous 50 |
| ecologie.rgesn_compression | 1 | Note Lighthouse ≥ 80 | Note de 50 à 79 | Note sous 50 |
| ecologie.rgesn_images | 1 | Au moins 75 % de formats légers | De 50 % à 74 % | Moins de 50 % |
| ecologie.rgesn_polices | 1 | 0 fichier, ≤ 2 fichiers, ou ≤ 400 Kio | 3 ou 4 fichiers au-dessus de 400 Kio, ou poids inconnu | Plus de 4 fichiers et plus de 400 Kio |

## 13. Qualité technique

Cinq tests passifs, version 2026.1. Ils lisent les pages publiques liées, comme un visiteur. Le parcours reste dans la portée demandée. Un audit sur un chemin ne sort pas de ce chemin.

Le fichier robots est lu à la racine du domaine, y compris quand l’audit porte sur un chemin. Le robot annoncé est AudigyBot. S’il n’a pas de groupe, la règle générale s’applique. Une adresse interdite n’est pas demandée. Si ce fichier ne répond pas, les tests sont Non testé.

Au plus 50 pages sont lues. Une page est une adresse de dossier, une adresse sans extension, ou un document `.html`, `.htm` ou `.xhtml`. Les autres fichiers du même site sont ensuite vérifiés comme des liens, sans être parcourus. Les liens vers un autre site sont sondés ensuite, sans télécharger le fichier, 30 au plus. Le rythme est d’une requête par seconde et par hôte. Le budget passif de 50 requêtes n’est jamais dépassé : le parcours s’arrête, et seuls les éléments déjà lus sont notés.

Un lien interne est un problème s’il ne finit pas entre 200 et 299. Un lien externe introuvable, par exemple 404 ou 410, est un problème. Une erreur temporaire est À améliorer, et non un problème : 408, 425, 429, 500, 502, 503, 504, un délai dépassé, ou une panne réseau. Une réponse 401, 403, 405 ou 501 est aussi À améliorer : le robot n’a pas obtenu une réponse claire. S’il y a à la fois un lien mort et une erreur temporaire, le statut est Problème.

Le HTML des pages lues est jugé avec html-validate, sur les règles essentielles seulement : `close-attr`, `close-order`, `doctype-html`, `element-permitted-content`, `element-permitted-occurrences`, `element-permitted-order`, `element-permitted-parent`, `element-required-ancestor`, `element-required-content`, `missing-doctype`, `no-dup-attr`, `no-raw-characters`, `unrecognized-char-ref`, `void-content`. L’accessibilité et le style ne sont pas notés ici.

Une image au-dessus de 200 Ko est un problème. La taille vient de l’en-tête de longueur, sans télécharger le fichier. Sans taille, le test est À améliorer. Si aucune taille n’a pu être demandée parce que le budget est atteint, il est Non testé. L’absence de largeur et de hauteur sur une partie des images est À améliorer. Si aucune image n’a les deux, c’est un problème. Un format moderne est WebP ou AVIF, dans l’adresse, dans `srcset`, ou dans une source de `picture`. Un SVG ne compte pas comme un ancien format. Le type renvoyé par le serveur peut reconnaître un format moderne que l’adresse ne montrait pas.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| qualite.liens | 3 | Les liens vérifiés répondent. | Seulement des erreurs temporaires ou incertaines, sur des liens externes. | Un lien interne ne répond pas, ou un lien externe est introuvable. |
| qualite.html | 2 | Aucune page lue n’enfreint les règles essentielles. | — | Au moins une page lue a un HTML invalide. |
| qualite.images_poids | 2 | Chaque image mesurée fait au plus 200 Ko. | Une taille n’est pas indiquée. | Au moins une image dépasse 200 Ko. Aucune image : Non applicable. |
| qualite.images_dimensions | 1 | Chaque image a une largeur et une hauteur. | Une partie des images n’a pas les deux. | Aucune image n’a les deux. Aucune image : Non applicable. |
| qualite.images_format | 1 | Chaque image bitmap propose WebP ou AVIF. | Une partie seulement. | Aucune image bitmap n’est en format moderne. SVG seul : Non applicable. |

## 14. Technologies et failles connues

Trois tests passifs du domaine Sécurité, version 2026.1. Ils relisent la page demandée (la même lecture qu’au §8), puis au plus 10 scripts qu’elle charge, dans l’ordre de la page. Le rythme reste d’une requête par seconde et par hôte, dans le budget passif. Les scripts ajoutés plus tard par le navigateur ne sont pas vus.

Ce qui est lu : les en-têtes `Server`, `X-Powered-By`, `X-AspNet-Version`, `X-AspNetMvc-Version` et `X-Generator`, la balise `<meta name="generator">`, puis l’adresse, le nom et le contenu des scripts, y compris les scripts écrits dans la page. Le contenu l’emporte sur le nom, et le nom sur l’adresse. Un script qui répond hors de 200 à 299, ou qui renvoie une page HTML, n’est pas chargé : il est ignoré. Un script non lu (budget, délai, panne) est listé, mais jamais comparé.

**Signatures.** Les scripts sont reconnus avec les extracteurs de [retire.js](https://github.com/RetireJS/retire.js), fichier `repository/jsrepository-master.json`, commit `e5e228659bbcaea7ba85536a2ef8d4fb97b366e9`. Licence vérifiée le 24/10/2026 : Apache-2.0 (`LICENSE.md` du dépôt), avis « Copyright 2018 Erlend Oftedal » (`NOTICE.md`). La copie, la licence et l’avis sont dans `packages/engine/data/retire/`. Seuls les extracteurs sont gardés. Les failles listées par retire.js ne servent pas, et les extracteurs `func`, qui exécutent du code, sont retirés. Les logiciels serveur suivent une liste maison : aucune empreinte de type Wappalyzer (souvent sous GPL).

**Version.** Une version inconnue ou partielle ne donne jamais d’alerte. Une bibliothèque est comparée seulement si elle a un paquet npm connu et une version complète `x.y.z` (une préversion est permise). Un logiciel est comparé seulement avec la précision de sa règle : trois nombres pour Apache, nginx et PHP ; OpenSSL peut finir par une ou deux lettres ; WordPress accepte deux nombres. `Apache/2.4` n’est pas comparé : la base renverrait les failles de toute la branche. Les hébergeurs gérés (Netlify, GitHub Pages, Vercel, Cloudflare…) et les outils de construction (Hugo, Jekyll, Astro…) ne sont pas comparés : ils ne tournent pas sous votre responsabilité sur le site publié.

**Sources.** Bibliothèques : [OSV.dev](https://osv.dev/), `POST /v1/query`, écosystème npm. OSV applique lui-même les plages de versions. Une fiche retirée est ignorée. La gravité est l’étiquette de la fiche GitHub ; sans étiquette, elle compte comme modérée. Logiciels : [NVD API 2.0](https://nvd.nist.gov/developers/vulnerabilities), `cpeName=cpe:2.3:a:<éditeur>:<produit>:<version>`, sans les fiches rejetées. Une fiche contestée (`disputed`) est ignorée. La gravité est celle du CVSS 4.0, sinon 3.1, 3.0, puis 2, de la source principale d’abord. Noms CPE vérifiés : `apache:http_server`, `f5:nginx`, `php:php`, `openssl:openssl`, `wordpress:wordpress`. La clé `NVD_API_KEY` est facultative et voyage dans un en-tête, jamais dans l’adresse. Au plus 10 bibliothèques et 4 logiciels sont interrogés par audit (NVD sans clé : 5 requêtes par 30 secondes).

**Failles exploitées.** Le [catalogue KEV de la CISA](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) n’est lu que si une faille trouvée a un numéro CVE. Une faille de ce catalogue donne Problème, gravité 4. Si le catalogue ne répond pas, le reste du constat est gardé.

**Cache.** Une réponse réussie d’OSV, de NVD ou du catalogue est réutilisée le même jour (UTC), soit 24 heures au plus. La clé est la base, le paquet, la version et le jour. Un échec n’est pas mémorisé. Un réessai a lieu sur erreur réseau, 408, 429 ou 5xx. Un second 429, ou un 403 de NVD, est un quota : le test est Non testé.

**Prudence.** Le constat dit « version possiblement vulnérable ». Audigy compare un numéro ; il ne teste pas la faille. Une faille propre au serveur d’un cadriciel peut ne pas toucher un site statique. Un paquet de distribution (commentaire ou suffixe Ubuntu, Debian, CentOS, Red Hat, `fips`…) est au plus À améliorer : ces distributions corrigent souvent sans changer le numéro. Pour l’annonce des versions, seuls les en-têtes comptent. La balise generator est relevée sans pénalité.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| securite.technologies | 1 | Aucun en-tête n’annonce de numéro de version. | Un en-tête annonce une version. | — |
| securite.cve_scripts | 2 | Aucune faille connue dans OSV pour les versions comparées. | Failles connues, toutes modérées, faibles ou sans gravité. | Une faille grave ou critique, ou une faille du catalogue KEV. Rien à comparer : Non applicable. |
| securite.cve_logiciels | 2 | Aucune faille connue pour les versions comparées. | Failles modérées, ou paquet de distribution. | Une faille grave ou critique, ou du catalogue KEV, hors paquet de distribution. Hébergeur géré, outil ou version inconnue : Non applicable. |

## 15. Vie privée

Sept tests passifs, version 2026.1. Quatre lisent le rapport du navigateur d’audit, déposé une seule fois dans `ctx.shared` sous la clé `browser`. Le schéma est `BrowserAuditResult` (version 1, zod) : traces sans valeur, requêtes, plateformes détectées et intitulés des boutons au premier niveau. Le navigateur ne clique pas. Si le rapport indique une interaction, ou s’il manque ou est illisible, le test est Non testé. Sans navigateur, ces quatre tests ne partent pas.

Les trois autres lisent l’accueil, puis au plus deux pages liées du même périmètre. Le fichier robots est respecté pour AudigyBot. Une page hors portée n’est pas demandée.

La liste de traceurs vient de DuckDuckGo Tracker Radar, fichier `domain_summary.json`, commit `a54ee0ccc2a90192123341f4842d2884d1832dc3`. Licence vérifiée le 24 octobre 2026 : CC BY-NC-SA 4.0. Seuls les noms de domaine valides sont gardés (`packages/engine/data/trackers/`). Un hôte compte s’il est dans la liste ou si un de ses parents y est. Le bandeau reconnu (tarteaucitron, Axeptio, Didomi, Cookiebot, OneTrust) n’est pas compté comme traceur.

Un script ou une police est tiers s’il ne partage pas le site de la page. `www` est ignoré. Les suffixes de plateforme (`github.io`, `netlify.app`, et quelques autres) gardent le nom juste devant. Ce n’est pas la liste publique complète des suffixes.

Les mentions et la confidentialité se reconnaissent au texte du lien ou au chemin (`mentions-legales`, `confidentialite`, `privacy`, et les formes voisines). Une page compte si elle a au moins 40 caractères de texte. L’éditeur, l’hébergeur et le contact sont cherchés par des mots (« éditeur », « hébergeur », « hébergé ») et par une adresse, un téléphone, `mailto:` ou `tel:`.

Le constat décrit ce qui est observé. Il ne qualifie pas une infraction.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| vie_privee.traceurs | 3 | Aucun traceur de la liste avant un choix. | — | Au moins un traceur de la liste. |
| vie_privee.cmp | 2 | Une bannière est présente, ou aucun traceur de la liste. | — | Des traceurs de la liste, sans bannière. |
| vie_privee.refus | 3 | « Tout refuser » est au premier niveau. Rien à refuser : Non applicable. | — | Le refus manque, ou il n’est pas au premier niveau. |
| vie_privee.tiers | 2 | Scripts et polices du même site. | Seulement des polices d’un autre site. | Au moins un script d’un autre site. |
| vie_privee.mentions | 2 | Page liée, avec du texte. | — | Introuvable, ou sans texte. |
| vie_privee.confidentialite | 2 | Page liée, avec du texte. | — | Introuvable, ou sans texte. |
| vie_privee.elements | 1 | Éditeur, hébergeur et contact. | Une ou deux de ces informations manquent. | Aucune des trois. |

## 16. Sécurité active

Trois tests actifs, version 2026.1. Ils ne partent que si la propriété du site est vérifiée et revérifiée depuis moins de 10 minutes, et si la portée correspond. Une portée « chemin » ne sonde que ce chemin. Sinon le test n’est pas lancé.

Un code 200 ne suffit pas. Beaucoup de sites renvoient la page d’accueil pour chaque adresse inconnue. Le fichier ne compte que si son contenu a la forme attendue (dépôt git, fichier d’environnement, clé, copie de base, archive) et s’il n’est pas cette page d’accueil. La liste de dossier se reconnaît au titre « Index of ». Les versions de chiffrement sont essayées une par une, sans rien envoyer d’autre qu’une poignée de main.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| securite.fichiers | 3 | Aucun des chemins connus n’a le contenu d’un fichier sensible. | — | Au moins un chemin a ce contenu. |
| securite.listing | 2 | Aucun dossier sondé n’affiche sa liste. | — | Un dossier affiche sa liste. |
| securite.tls | 2 | TLS 1.2 ou TLS 1.3, sans TLS 1.0 ni TLS 1.1, et TLS 1.3 est proposé. | Seulement TLS 1.2. | TLS 1.0 ou TLS 1.1 est accepté. |

## 17. Réputation

Un seul test, version 2026.1. Il ne part que si une clé Places est configurée sur le serveur. Sans cette clé, le domaine n’est pas noté et la section est masquée. Le navigateur ne contacte pas Google : il passe par Audigy.

La personne cherche un lieu, puis confirme la fiche. L’audit lit ensuite la note moyenne et le nombre d’avis. Le texte des avis n’est ni demandé ni stocké. La réponse est gardée sept jours.

Le score du domaine est l’arrondi de note / 5 × 100. Une note de 4,0 donne 80. Il est affiché à part et ne compte pas dans le score global. Sans lieu confirmé, sans note, ou avec zéro avis, le domaine est Non testé.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| reputation.avis | 3 | Note d’au moins 4,0 sur 5, avec au moins un avis. | Note de 2,5 à 3,9. | Note inférieure à 2,5. |

## 18. Accès

Un test passif, version 2026.1. La note Lighthouse d’accessibilité est celle déjà demandée avec la performance (catégories mobile et ordinateur, dans `ctx.shared`). Elle n’entraîne pas un second appel. Le score retenu est le plus faible des deux, avec les mêmes seuils : 80, puis 50. S’il manque une des deux mesures et que le score disponible vaut au moins 80, le statut devient À améliorer. Sans lot, sans clé, sur un quota ou sur une erreur, le test est Non testé. Le domaine reste alors « Non testé », sans chiffre.

| Identifiant | Poids | Réussi | À améliorer | Problème |
|---|---|---|---|---|
| accessibilite.lighthouse | 3 | Les deux scores sont là, et le plus faible vaut au moins 80. | Le plus faible est entre 50 et 79, ou une seule mesure est disponible alors que son score vaut au moins 80. | Le plus faible est sous 50. |

