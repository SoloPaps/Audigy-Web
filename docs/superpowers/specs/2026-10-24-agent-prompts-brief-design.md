# Audigy — spécification brief agent (approche B)

Date : 24 octobre 2026. Statut : décisions verrouillées par le propriétaire. Ce document ne modifie pas l’application. Il remplace le prompt simple d’UX-18. L’interface vient **après** relecture et fusion, dans une seule PR, sans plan de fichiers ici.

Décisions verrouillées :

| Sujet | Décision |
|---|---|
| Forme | Spec courte. Pas de plan d’implémentation dans ce document. |
| Approche | B, retenue par le propriétaire. |
| Base | `main`. Cette PR ne contient que ce fichier. |
| Langue de l’interface | Français, `t()`, copy-lint, phrases de 20 mots au plus. |
| Corps du brief | Français, vouvoiement, comme le rapport. Un seul texte. |
| Cible | Un seul texte, collable dans Cursor ou dans un chat. |
| Exécution | Jamais dans le navigateur. Jamais d’envoi automatique vers une IA. |
| Rapport | Rapport du propriétaire seulement. Le score public n’a pas de brief. |

Le produit reste gratuit, pour des particuliers non techniciens. On observe, on n’exploite pas. Le ton de `docs/DESIGN.md` §7 s’applique aux libellés. Le brief, lui, s’adresse à un agent de développement : il reste en français, en vouvoiement, et il peut citer l’identifiant du test. Les tokens, le verre et le mouvement restent ceux d’Arc Soft.

## 1. Contexte et objectifs

La spec clarté et export (Vague 2, UX-18) prévoit un prompt court, par constat, dans le bloc de correction. Le propriétaire a rejeté cette profondeur. Il a validé l’approche B : choisir plusieurs constats, produire un brief riche, et ajouter une voie terminal seulement là où il l’a demandé.

Objectifs :

1. Laisser cocher les constats à corriger, puis générer un seul brief.
2. Ancrer ce brief sur le test Audigy déjà catalogué : identifiant, critère, sens concret de « Réussi ». Citer une référence publique seulement si le catalogue du test la porte déjà.
3. Offrir, par constat, une voie terminal optionnelle : vérifier, proposer une correction, ou se taire.
4. Copier ou télécharger le texte sur la machine. Ne rien envoyer, ne rien exécuter.

Aucune note, aucun seuil, aucune couverture ne change.

## 2. Hors scope

- Moteur, checks, seuils 50 et 80, règle de couverture, formules de score, catalogues de correctifs côté moteur.
- `packages/engine`, y compris ses données (trackers, signatures, listes de domaines).
- Inventer un contrôle, un identifiant NIST, ou une définition de « Réussi » absente du catalogue déjà servi avec le rapport.
- Migrations de base, schéma, politiques de ligne.
- Déploiement Netlify, liaison Git, aperçu de branche, build hook. `netlify dev` reste autorisé hors de ces PR.
- Secrets, clés d’API, quotas, valeurs de cookies. Le brief ne les nomme pas et n’en recopie pas la valeur.
- Exécution d’une commande dans le navigateur, sur un serveur Audigy, ou par un envoi vers Cursor, Claude, ou un autre outil.
- Brief de plusieurs sites, envoi du brief par e-mail, assistant à l’écran.
- Tests actifs, soumission de formulaire sur un site audité, appel à un site réel en CI.
- UX-16, UX-17, UX-19, Vague 1 et Vague 3 : elles restent décrites par la spec clarté. Cette spec ne les recommence pas.
- PART-27, achat de domaine, HSTS de production, `security.txt` à échéance.

Montrer un critère déjà catalogué est de la copie. Écrire un nouveau critère est hors scope.

## 3. Lien avec la spec clarté et export

`docs/superpowers/specs/2026-10-24-ux-clarity-export-design.md` reste la référence d’UX-16 (impression), d’UX-17 (Markdown du rapport) et d’UX-19 (constat en ligne). Leurs critères d’acceptation ne bougent pas.

UX-18 est redéfini par le présent document. Le prompt d’une constatation, limité au correctif déjà montré, ne s’implémente plus. S’il est déjà sur une branche de Vague 2, la PR d’interface le retire et le remplace par ce brief. Elle ne rouvre pas l’impression, le Markdown du rapport, ni la ligne de constat.

La PR d’interface est unique. Elle part de `main` après fusion de cette spec et relecture du propriétaire. Ce peut être la suite de la Vague 2 ou une PR dédiée : le propriétaire le tranche à la relecture. Ce document ne décrit ni les fichiers, ni l’ordre des commits, ni une branche empilée.

Le fichier Markdown du rapport (UX-17) et le fichier du brief sont deux téléchargements. Le second ne remplace pas le premier.

## 4. Parcours

Un seul écran, le rapport du propriétaire. Pas d’assistant, pas de seconde page, pas de modale pleine page.

Constats cochables : Problème (`fail`) et À améliorer (`warn`). Une case par constat, libellé accessible reprenant le titre.

Non cochables :

| Statut | Case | Complément |
|---|---|---|
| Réussi (`pass`) | Absente | Rien à corriger. |
| Non testé (`untested`) | Absente | Hint « Non testé — pas de brief ». |
| Non applicable (`na`) | Absente | Même hint. |

La barre reste visible tant qu’il existe au moins un constat Problème ou À améliorer. Elle porte :

- le compteur « 1 sélectionné » ou « {n} sélectionnés » ;
- l’action secondaire « Tous les échecs » ;
- le bouton principal « Générer le brief ».

« Tous les échecs » est la voie rapide. Elle génère tout de suite un brief de chaque constat Problème, sans cocher les cases, sans lire les sélecteurs. Chaque constat de cette voie est traité comme « Rien » pour le terminal. Les constats À améliorer n’y entrent pas. S’il n’y a aucun Problème, l’action est inactive.

« Générer le brief » lit les cases cochées et les sélecteurs courants. Zéro case cochée : bouton inactif, hint « Cochez un constat, ou prenez tous les échecs. » La voie rapide, lorsqu’elle est active, ne dépend pas de ce hint.

Le sélecteur terminal est décrit au §6. Il ne constitue pas une étape séparée. Le choix est mémorisé pour Générer et pour Régénérer. Ces actions ne le remettent pas à Rien.

## 5. Schéma du brief

Le brief est assemblé dans le navigateur, à partir du rapport déjà chargé. Pas de nouvel appel réseau, pas de nouvelle fonction. L’ordre des constats est celui du rapport. Une phrase déjà affichée n’est pas recopiée deux fois : si la preuve courte et l’impact sont la même phrase, elle n’apparaît qu’une fois.

Sept parties, titres fixes, dans cet ordre. La septième n’est présente que si au moins un constat choisi est en Vérif ou en Fix. Titres courts, puces, pas de pavé.

1. **Rôle.** Développeur web qui corrige le site, d’après un audit Audigy.
2. **Contexte du site.** Adresse. Ligne de technique seulement si l’audit l’a déjà reconnue. Date d’audit via `formatDateTime`, fuseau Europe/Paris (« 23 oct. 2026, 14 h 30 »).
3. **Constats.** Pour chacun : titre, libellé de statut, preuve courte déjà affichée, impact en une ligne s’il est déjà écrit à part.
4. **Référentiel.** Pour chacun : identifiant du test, critère déjà catalogué, ce que « Réussi » veut dire déjà catalogué. Si le catalogue porte déjà une référence publique (NIST, Observatory, ou une autre), une puce la cite. Sinon, la puce est absente. Aucune référence n’est rédigée dans l’interface.
5. **Attendu.** Un diff, un fichier ou une configuration. Pas une technique inventée. Pas une note inventée.
6. **Garde-fous.** Secrets, production, périmètre, information manquante, interdiction d’attaque.
7. **Terminal.** Voir §6. Placée en bas, groupée par constat.

Le texte est une suite de fragments `t()`. Chaque fragment tient en 20 mots au plus. Le dictionnaire complet n’est pas écrit ici. Exemples de forme :

| Rôle | Fragment |
|---|---|
| Rôle | Vous corrigez le site {url} d’après un audit Audigy. |
| Rôle | Vous êtes le développeur web de ce site. |
| Contexte | Adresse : {url}. |
| Contexte | Technique reconnue : {stack}. |
| Contexte | Audit du {date}. |
| Constat | Statut : {libellé}. |
| Constat | Preuve : {preuve courte}. |
| Constat | Pour la personne : {impact}. |
| Référentiel | Test : {id}. |
| Référentiel | Critère : {critère catalogué}. |
| Référentiel | Réussi veut dire : {définition cataloguée}. |
| Référentiel | Référence déjà notée : {citation}. |
| Attendu | Proposez un diff, un fichier ou une configuration. |
| Attendu | N’inventez pas la technique du site. |
| Attendu | N’inventez pas de note. |
| Garde-fou | Ne recopiez aucun secret. |
| Garde-fou | Ne changez pas la production sans demander. |
| Garde-fou | Restez dans les constats de ce brief. |
| Garde-fou | Si une information manque, demandez avant d’agir. |
| Garde-fou | Pas de procédure d’attaque, de charge utile, ni de contournement. |
| Terminal | Si vous avez {outil}, vous pouvez l’utiliser. Sinon, passez. |

Squelette, pour fixer l’ordre. Les accolades sont des données du rapport, pas du texte en dur.

```text
Rôle
- Vous corrigez le site {url} d’après un audit Audigy.
- Vous êtes le développeur web de ce site.

Contexte du site
- Adresse : {url}.
- Technique reconnue : {stack}.
- Audit du {date}.

Constats
- {titre} — {statut}
  - Preuve : {preuve courte}.
  - Pour la personne : {impact}.

Référentiel
- {titre}
  - Test : {id}.
  - Critère : {critère}.
  - Réussi veut dire : {définition}.
  - Référence déjà notée : {citation}.

Attendu
- Proposez un diff, un fichier ou une configuration.
- N’inventez pas la technique du site.
- N’inventez pas de note.

Garde-fous
- Ne recopiez aucun secret.
- Ne changez pas la production sans demander.
- Restez dans les constats de ce brief.
- Si une information manque, demandez avant d’agir.
- Pas de procédure d’attaque, de charge utile, ni de contournement.

Terminal
- {titre} — Vérif ou Fix
  - …
```

La ligne « Technique reconnue » et la puce « Référence déjà notée » disparaissent quand la donnée n’existe pas. La voie rapide omet la partie Terminal.

## 6. Voie terminal

À côté de chaque constat cochable, un sélecteur. Défaut : Rien. Le choix reste sur la ligne jusqu’au départ du rapport. Générer, Régénérer et Réduire ne le remettent pas à Rien. Il n’est pas enregistré en base.

| Valeur | Libellé visible | Ce que le brief demande |
|---|---|---|
| Rien | Rien | Aucun bloc pour ce constat. |
| Vérif | Vérif | Commandes de contrôle seulement. Aucune écriture. |
| Fix | Fix | Une correction : fichier, configuration, ou commande qui ne détruit rien. |

Noms accessibles, plus longs que le libellé : « Pas de commande », « Vérifier, sans écrire », « Proposer une correction ». Le libellé « Fix » est le mot verrouillé du sélecteur. copy-lint ne le reformule pas.

Plusieurs constats en Vérif ou en Fix produisent une seule partie Terminal, en bas du brief, avec un sous-bloc par constat concerné. Un constat laissé à Rien n’y figure pas. La voie rapide ne produit pas cette partie.

Outil peut-être absent chez la personne qui collera le brief : la puce dit de l’utiliser s’il est là, et de passer sinon. Le brief vouvoie, comme le rapport. La formule orale « si tu as X, sinon saute » est ce fragment, pas un tutoiement. Audigy ne détecte pas les outils de cette personne.

Exemples de contrôle permis dans un bloc Vérif, seulement s’ils illustrent le test déjà catalogué : lecture d’en-têtes, lecture d’un certificat, lecture DNS publique, Lighthouse en ligne de commande. Ce sont des suggestions de texte. Audigy ne les lance pas.

Règles de commande, écrites dans le brief et tenues par l’assemblage :

- Vérif ne propose pas d’écriture : pas de fichier modifié, pas de configuration appliquée, pas de déploiement.
- Fix peut nommer un fichier, un extrait de configuration, ou une commande non destructrice. S’il faut deviner la technique, le brief dit de demander, pas d’inventer.
- Interdit dans les deux valeurs : `rm`, suppression ou vidage de base, `push` forcé, réécriture d’historique, lecture ou écriture d’un secret.
- Interdit aussi : test actif, envoi de formulaire, recherche de chemins non liés, énumération, procédure d’attaque, charge utile, contournement d’un contrôle.
- Une commande ne contient pas une valeur de cookie, un jeton, ni une clé. La preuve du rapport reste celle déjà affichée, déjà retenue.
- Le brief rappelle que ces commandes ne partent pas d’Audigy.

## 7. Après la génération

Le résultat s’ouvre sous la liste des constats, dans le même rapport. Ce n’est pas une modale pleine page.

Le panneau contient :

- une zone en lecture seule, police mono légère, environ 12 à 16 lignes visibles, défilement pour la suite ;
- le bouton principal « Copier » ;
- le bouton secondaire « Régénérer » ;
- le lien d’action « Télécharger en Markdown » ;
- le bouton « Réduire ».

« Copier » place tout le brief dans le presse-papiers, partie Terminal comprise. Toast : « Brief copié ». Si la copie échoue : « La copie a échoué. Sélectionnez le texte. » Aucune requête vers un outil d’IA.

« Régénérer » reconstruit le texte avec les cases et les sélecteurs du moment. Il ne les efface pas.

« Télécharger en Markdown » construit le fichier dans le navigateur. Nom : `audigy-brief-`, puis l’hôte sans schéma ni chemin, puis le même segment de jour civil de Paris que le Markdown d’UX-17, puis `.md`. Pas d’identifiant de rapport, pas de secret. Le contenu est le brief entier, pas le rapport d’UX-17. Dernière ligne, en plus du brief : « Ce fichier n’est pas une preuve. »

La zone visible est courte. Copier et le fichier emportent le texte complet, y compris ce qui est sous le pli.

« Réduire » replie le panneau. Les cases, les sélecteurs et le dernier texte restent. Rouvrir montre le même texte. Changer une case après coup ne réécrit pas le texte tout seul : Copier renvoie le dernier brief généré, jusqu’à Générer ou Régénérer.

Avant génération, « Générer le brief » est le bouton principal de la barre. Une fois le panneau ouvert, « Copier » devient le seul bouton principal : « Générer le brief » passe en secondaire. « Tous les échecs », « Régénérer » et « Télécharger en Markdown » ne prennent pas ce rôle. Pas d’envoi par e-mail.

## 8. Cas limites

**Tous réussis.** Aucun Problème, aucun À améliorer, au moins un Réussi. Message « Aucun constat à corriger ». Voie rapide et Générer inactifs. Pas de panneau.

**Non testé et non applicable.** Case absente. Hint « Non testé — pas de brief ». Ce hint ne dit pas que le site est sain. S’il n’y a ni Problème ni À améliorer, Générer et la voie rapide restent inactifs. Le message « Aucun constat à corriger » est réservé au cas tous réussis.

**Zéro case, des constats corrigeables.** Générer inactif. Hint « Cochez un constat, ou prenez tous les échecs. » La voie rapide reste active s’il existe un Problème.

**Voie rapide alors que des cases sont cochées.** Le brief ignore les cases et les sélecteurs. Il prend chaque Problème, sans terminal. Les cases ne changent pas.

**Beaucoup de constats.** La barre et le compteur restent visibles. Le panneau montre un extrait. Copier et le fichier ont le texte entier.

**Sélection modifiée après coup.** Le panneau ne se met pas à jour seul.

**Mobile.** Case et sélecteur empilés. Panneau en pleine largeur. « Copier » reste le bouton principal du panneau. Pas de scroll horizontal à 320 px.

**Accessibilité.** Parcours clavier complet sur les cases, les sélecteurs, la barre et le panneau. Focus visible, anneau 2 px. Après génération, région live polie : « Brief généré, {n} constats ». Le compteur ne repose pas sur la couleur. Contraste des tokens Arc Soft, clair et sombre. `prefers-reduced-motion` ne change pas. Zoom 200 % utilisable.

**Honnêteté.** Pas de pile inventée, pas de référence inventée, pas de cause inventée, pas de secret, pas de mot « clé ». Le score public et le partage ne montrent ni brief, ni terminal, ni détail réservé au propriétaire.

## 9. Critères d’acceptation

Cette PR n’a aucun de ces critères à implémenter. Ils valent pour la PR d’interface, après relecture.

- [ ] Le rapport du propriétaire affiche une case sur chaque Problème et chaque À améliorer. Réussi, Non testé et Non applicable n’ont pas de case.
- [ ] Non testé et Non applicable affichent « Non testé — pas de brief ».
- [ ] La barre indique le nombre sélectionné. « Générer le brief » est inactif à zéro case, avec le hint du §4.
- [ ] « Tous les échecs » produit un brief de tous les Problèmes, sans terminal, sans modifier les cases. L’action est inactive sans Problème.
- [ ] Un rapport sans Problème ni À améliorer, avec au moins un Réussi, affiche « Aucun constat à corriger » et désactive les deux actions.
- [ ] Le sélecteur vaut Rien par défaut. Vérif, Fix et Rien se distinguent sans la seule couleur. Le choix survit à Générer, Régénérer et Réduire.
- [ ] Le brief suit l’ordre du §5. La partie Terminal n’apparaît que pour les constats en Vérif ou en Fix, groupés dans un seul bloc.
- [ ] Le référentiel reprend l’identifiant, le critère et la définition de Réussi déjà catalogués. Une citation n’est ajoutée que si elle est déjà portée. Aucun contrôle n’est inventé.
- [ ] La pile n’est écrite que si l’audit la connaît déjà. La date passe par `formatDateTime`, Europe/Paris.
- [ ] Le brief ne contient pas de procédure d’attaque, de charge utile, de contournement, de secret, ni de commande destructrice (`rm`, vidage de base, `push` forcé).
- [ ] Vérif ne propose pas d’écriture. Fix ne propose pas de commande destructrice. L’outil absent est une passe, pas une erreur.
- [ ] Le panneau s’ouvre sous les constats. La zone montre environ 12 à 16 lignes. Copier et le fichier contiennent tout le texte, Terminal compris.
- [ ] Toast « Brief copié ». Échec de copie : « La copie a échoué. Sélectionnez le texte. » Aucune requête vers une IA, aucun e-mail, aucune commande lancée.
- [ ] Le fichier s’appelle `audigy-brief-` + hôte + jour civil d’UX-17 + `.md`. Dernière ligne : « Ce fichier n’est pas une preuve. »
- [ ] Réduire conserve cases, sélecteurs et dernier texte. Un changement de case ne régénère pas seul.
- [ ] Le score public n’a pas ce parcours.
- [ ] Clavier complet. Région live « Brief généré, {n} constats ». Contraste Arc Soft. Reflow à 320 px.
- [ ] Chaînes visibles via `t()`. Fragments de 20 mots au plus. copy-lint vert.
- [ ] Tests hors ligne : assemblage du brief, voie rapide, exclusion des statuts, absence de terminal par défaut, nom de fichier. Pas d’appel à un site réel. Pas de déploiement Netlify.
- [ ] UX-16, UX-17 et UX-19 restent conformes à la spec clarté. Le prompt simple d’UX-18 n’est plus le comportement livré.

## 10. Découpage des PR

| Ordre | PR | Contenu | Suite |
|---|---|---|---|
| 1 | Spec (ce document) | Markdown seul. Aucune UI. | Relecture propriétaire, puis fusion sur `main`. |
| 2 | Interface | Le brief de cette spec, à la place d’UX-18. | Une seule PR, après la fusion. Revue visuelle. |

La PR d’interface ne part pas avant cette relecture. Elle ne s’empile pas sur la PR de spec. Elle ne contient pas de correctif moteur. Le choix entre une retouche de la Vague 2 et une PR dédiée se fait à la relecture, pas dans un plan à part.

## 11. Références

- Spec clarté, export et parcours : `docs/superpowers/specs/2026-10-24-ux-clarity-export-design.md`. UX-16, UX-17, UX-19 restent. UX-18 est remplacé ici. UX-09 (`formatDateTime`) et le ton des fragments restent applicables.
- Spec Arc Soft : `docs/superpowers/specs/2026-10-24-arc-soft-design.md`, pour le verre, la barre et le rapport. Le plan d’implémentation Arc Soft n’est pas une référence de cette spec.
- `docs/DESIGN.md` §7 (ton), §8 (accessibilité), §9 (checklist de la future PR d’interface).
- `docs/METHODE.md` §1 (statuts), §6 (ordre des constats), §8 et sections de tests suivantes (ce qu’un « Réussi » veut déjà dire). On cite le catalogue. On ne le réécrit pas.
