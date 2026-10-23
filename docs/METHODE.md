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

Le test suit les redirections comme un visiteur. Il ne distingue pas une redirection permanente d'une redirection temporaire. La liste de préchargement HSTS n'est pas consultée. Les versions TLS, les fichiers non liés, le contenu mixte chargé par le navigateur et les failles logicielles sont hors de ce lot.

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

Les seuils de visite réelle sont ceux des Core Web Vitals. LCP : au plus 2,5 s, puis 4 s. INP : au plus 200 ms, puis 500 ms. CLS : au plus 0,1, puis 0,25. Sans donnée, ou si une seule mesure manque, le test est Non testé. Ce n’est pas un défaut du site.

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

## 10. DNS et e-mail

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
