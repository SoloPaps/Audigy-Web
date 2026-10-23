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
