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
