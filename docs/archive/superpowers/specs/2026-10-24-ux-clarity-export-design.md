# Audigy — spécification clarté, export et parcours

> **Archive (26 octobre 2026).** Décisions déjà appliquées sur `main`. Ce fichier n’est plus la source de vérité. Produit : [`docs/FONCTIONNEMENT.md`](../../../produit/FONCTIONNEMENT.md). UI : [`docs/DESIGN.md`](../../../design/DESIGN.md) et le pack design. Ancien chemin : `docs/superpowers/`.

Date : 24 octobre 2026. Statut : décisions verrouillées par le propriétaire. Ce document ne modifie pas l’application. Il décrit trois vagues d’interface, à réaliser **après** sa relecture, chacune dans sa PR, avec une revue visuelle entre deux fusions.

Décisions verrouillées :

| Sujet | Décision |
|---|---|
| Forme | Spec courte, puis trois PR d’interface. Pas de plan d’implémentation dans ce document. |
| Approche | A, retenue par le propriétaire. |
| Base visuelle | Arc Soft A/B/C est déjà sur `main`. On ne redessine pas la coquille. |
| Périmètre | Site, interface, copie, parcours. |
| Langue | Français, vouvoiement, phrases de 20 mots au plus, copy-lint. |
| Revue | Le propriétaire relit l’écran entre la Vague 1, la Vague 2 et la Vague 3. |

Le produit reste gratuit, pour des particuliers non techniciens. On observe, on n’exploite pas. Le ton de `docs/DESIGN.md` §7 reste la règle de copie. Les tokens, le verre et le mouvement restent ceux de la spec Arc Soft.

## 1. Contexte et objectifs

Arc Soft a posé le fond, les panneaux et la barre. La lecture du rapport reste difficile : les liens n’ont pas une seule règle, les mentions de preuve occupent l’écran, un domaine « Non testé » ne dit pas pourquoi, et le rapport ne s’emporte pas.

Le propriétaire le voit en local : beaucoup de domaines restent sans note parce que le navigateur d’audit, PageSpeed ou Search Console ne sont pas là. L’écran dit « Nous n’avons pas pu mesurer… » et s’arrête. La personne ne distingue pas une limite d’Audigy d’un défaut du site.

Objectifs, dans l’ordre des vagues :

1. Rendre l’écran scannable : liens stables, blocs longs repliés, dates à l’heure de Paris, raison visible quand il n’y a pas de note.
2. Rendre le rapport emportable : impression ou PDF par le navigateur, Markdown téléchargé sur la machine, prompt de correction copiable.
3. Alléger l’historique, la liste des sites et les écrans encore hors verre (lancement, progression, score public).

Chaque vague laisse le site cohérent. Aucune vague ne change une note, un seuil, ni une couverture.

## 2. Hors scope

- Moteur, checks, seuils 50 et 80, règle de couverture sous 50 %, formules de score, catalogues de correctifs côté moteur.
- `packages/engine`, y compris ses données (trackers, signatures, listes de domaines).
- Migrations de base, schéma, politiques de ligne.
- Déploiement Netlify, liaison Git, aperçu de branche, build hook. `netlify dev` reste autorisé hors de ces PR.
- Secrets, clés d’API, quotas : l’interface ne les nomme pas et n’en affiche pas la valeur.
- Tests actifs, soumission de formulaire sur un site audité, appel à un site réel en CI.
- Les restes manuels de `docs/RECETTE.md` (section « Reste au propriétaire ») : on ne les relance pas ici.
- PART-27, achat de domaine, HSTS de production, `security.txt` à échéance.

Montrer une raison déjà calculée est de la copie. Recalculer la raison, le score ou la couverture est hors scope.

## 3. Principes

**Scannabilité.** Une ligne visible porte un constat. La limite, la preuve juridique, la comparaison et les actions secondaires vivent dans un `<details>` fermé. Le résumé du `<details>` est une phrase courte, pas un titre en capitales.

**Liens unifiés.** Quatre rôles, quatre classes. Un lien dans une phrase ne ressemble pas à un lien de barre, ni à un bouton. Un seul bouton principal par écran.

**Honnêteté « Non testé ».** Pas de chiffre à la place d’une mesure absente. La forme pointillée et le libellé « Non testé » restent. À côté, une cause déjà connue, en français, sans code (`reason.runner_absent`, `psi`). La cause dit ce qui n’a pas eu lieu. Elle ne dit pas qu’une clé manque. Phrase de clôture, sur le rapport du propriétaire : « Ce n’est pas une note du site. »

**Accessibilité.** `docs/DESIGN.md` §8. Le `<details>` s’ouvre au clavier, le focus reste visible, le résumé a un nom clair. L’impression montre les mentions même si le bloc est fermé à l’écran. `prefers-reduced-motion` ne change pas. Contraste mesuré sur la plaque, clair et sombre.

**Copie.** Toute chaîne visible passe par `t()`. Vouvoiement. Pas d’emoji, pas de superlatif, pas de mot marketing. Une phrase nouvelle tient en 20 mots au plus. Le prompt assemblé est fait de fragments qui respectent la même limite.

## 4. Inventaire

| Id | Vague | Sujet |
|---|---|---|
| UX-01 | 1 | Lien de prose, classe `.link-inline` |
| UX-02 | 1 | Lien de barre, classe `.link-nav` |
| UX-03 | 1 | Lien de pied, classe `.link-footer` |
| UX-04 | 1 | Lien d’action secondaire, classe `.link-action` |
| UX-05 | 1 | `PreuveMentions` dans un `<details>` |
| UX-06 | 1 | Intro de vérification du rapport dans un `<details>` |
| UX-07 | 1 | Accroches Compte et Connexion (`account.lead`, `login.lead`) |
| UX-08 | 1 | Un seul H1 sur Compte et sur Connexion |
| UX-09 | 1 | `formatDateTime`, fuseau Europe/Paris |
| UX-10 | 1 | Aide quand la courbe est plate ou seule |
| UX-11 | 1 | Mentions de preuve visibles en pied à l’impression |
| UX-12 | 1 | Appel « Imprimer » sur le rapport |
| UX-13 | 1 | Copie du domaine DNS et courrier, sujets séparés |
| UX-14 | 1 | Clés i18n déjà rédigées et jamais affichées |
| UX-15 | 1 | Cause visible d’un domaine « Non testé » |
| UX-16 | 2 | Impression et PDF via la boîte du navigateur |
| UX-17 | 2 | Markdown téléchargé dans le navigateur |
| UX-18 | 2 | Prompt de correction copiable, par constat |
| UX-19 | 2 | Constat en ligne, limite dans un `<details>` |
| UX-20 | 2 | Méthode et pages légales scannables (optionnel) |
| UX-21 | 3 | Historique découpé |
| UX-22 | 3 | Liste des sites allégée |
| UX-23 | 3 | État vide commun |
| UX-24 | 3 | Lancement dans le verre |
| UX-25 | 3 | Progression dans le verre |
| UX-26 | 3 | Score public dans le verre |
| UX-27 | 3 | Note de pied `footer.note` |
| UX-28 | 3 | Barre, filtres actifs, liens hors Audigy |

## 5. Vague 1 — Clarté et liens

### Liens (UX-01 à UX-04)

Aujourd’hui, `a` prend seulement la couleur d’accent. Le soulignement dépend de la classe (`.button-link` en a un, le pied et la barre n’en ont pas de règle commune). Quatre classes, rien d’autre pour un ancrage :

| Classe | Où | Traitement |
|---|---|---|
| `.link-inline` | Lien dans une phrase, un constat, une page légale | Accent, souligné, décalage 2 px. Visité : même couleur. Pas de bouton. |
| `.link-nav` | Marque, Méthode, Sites, Compte, Connexion, Menu | Pas de soulignement au repos. Page active : trait 2 px pétrole et `aria-current="page"`. |
| `.link-footer` | Méthode, conditions, confidentialité, mentions, accessibilité | Encre secondaire, corps petit. Soulignement au survol et au focus. |
| `.link-action` | Retour au rapport, lancer un audit, imprimer, relier Search Console | Accent, souligné, cible 44 px. Ce n’est pas un second bouton principal. |

Le sélecteur global `a` ne force plus la couleur d’accent : chaque ancrage porte sa classe. Les boutons restent `.button`, `.button-primary`, `.button-secondary`, `.button-bordered`. Focus inchangé : anneau 2 px.

### Preuve et vérification (UX-05, UX-06)

`PreuveMentions` affiche six paragraphes ouverts (valeur, observation, eIDAS). Les replier. Résumé : « Ce que cette preuve vaut, et ses limites. » Le texte des clés actuelles ne change pas. Fermé par défaut. Même bloc sur le rapport, la page Vérifier, le score public et la page d’impression.

Sous le titre « Vérification », `verify.lead`, `verify.pending` et `verify.id` entrent dans un second `<details>`. Résumé : « Comment vérifier ce rapport ». Le pied de rapport (`ReportFooter` : URL, date, méthode, identifiant, lien « Vérifier ce rapport ») reste ouvert, hors de ce bloc.

### Compte et connexion (UX-07, UX-08)

`/connexion` : un seul H1, « Recevoir un lien de connexion » (`login.card.title`). Dessous, l’accroche déjà rédigée et aujourd’hui invisible : « Indiquez votre e-mail. Nous vous envoyons un lien, sans mot de passe. » (`login.lead`). `login.title` (« Connexion ») reste le titre du retour de session, pas un second H1 ici.

`/compte` : le H1 reste « Votre compte ». Dessous, une accroche. La chaîne actuelle (« Exportez vos données, ou supprimez le compte. ») devient : « Gérez l’export de vos données et la suppression du compte. » Les quatre modules Arc Soft ne bougent pas. Pas de second bouton principal : l’export reste le bouton principal tant que la suppression est le bouton bordé.

### Heure de Paris (UX-09)

`formatDate` reste le jour civil (« 23 oct. 2026 ») pour une tuile de site, une acceptation de conditions, un axe d’historique en dates.

`formatDateTime` s’ajoute à côté, fuseau `Europe/Paris`, forme figée : « 23 oct. 2026, 14 h 30 ». Heure sur 24 h, minutes toujours présentes, espace avant « h ». Pas d’heure UTC brute, pas de « 14:30 ». Le pied de rapport, la page d’impression et le score public utilisent cette fonction. L’horodatage déjà calculé pour le pied s’aligne sur elle, une seule mise en forme.

L’axe horaire du même jour (« 9 h », « 14 h ») reste celui de la spec Arc Soft. Il ne passe pas par `formatDateTime`.

### Courbe plate (UX-10)

Le résumé (« Même score depuis le {date} », « Première mesure le {date} ») reste. On ajoute une aide visible, sous ce résumé, dans deux cas seulement :

- Tous les points visibles de la série ont le même score : « La courbe est plate : le score n’a pas changé. »
- Un seul point : « Une seule mesure. La courbe viendra au prochain audit. »

La courbe et le tableau restent. On n’explique pas le tracé par une autre phrase si le score varie.

### Impression, premier pas (UX-11, UX-12)

Le rapport affiche un lien `.link-action` « Imprimer ». Il mène à la page d’impression déjà en place (`/rapport/:id/imprimer`). Pas un second bouton principal. Le libellé « Version à imprimer » disparaît de l’écran.

À l’impression, les paragraphes de `PreuveMentions` sont sous le pied vérifiable, lisibles, même si le `<details>` est fermé à l’écran. Le fond imprimé est la plaque opaque, sans blob, sans barre. Le pied du site (liens légaux) peut rester masqué : ce ne sont pas les mentions de preuve.

La Vague 1 ne construit pas de fichier PDF ni de Markdown. Elle garantit que « Imprimer » et les mentions imprimées existent.

### DNS et courrier (UX-13)

Le domaine noté reste un seul domaine. On ne le scinde pas. La copie cesse de tout appeler « courrier » alors que des tests portent sur le nom.

| Clé | Texte |
|---|---|
| `domain.dns_email.plain` | Nom et courrier |
| `domain.dns_email.tech` | DNS et e-mail |
| `domain.dns_email.good` | Le nom et le courrier sont bien protégés. |
| `domain.dns_email.improve` | La protection du nom ou du courrier peut être renforcée. |
| `domain.dns_email.problem` | Le nom ou le courrier est mal protégé. |
| `domain.dns_email.untested` | Nous n’avons pas pu vérifier le nom ni le courrier. |
| `domain.dns_email.detail` | Nous n’avons pas pu vérifier le nom ni le courrier. |

Chaque titre de constat commence par « Nom de domaine » ou par « Courrier », selon le sujet du test, jamais les deux dans la même phrase. Un titre DNSSEC ne parle pas de courrier. Un titre MX, SPF, DKIM, DMARC ou MTA-STS ne parle pas du site web. Les identifiants de tests ne changent pas.

### Clés orphelines (UX-14)

La Vague 1 affiche `login.lead` et `account.lead`. Elle ne supprime pas `footer.note` : la Vague 3 l’affiche.

Elle ne fait pas le ménage du dictionnaire entier. Une clé absente de cette spec et absente de l’écran reste en place, sauf si un test montre qu’elle n’est référencée nulle part hors du dictionnaire et hors des tests : alors la PR la retire, sans réécrire les pages légales.

### Pourquoi « Non testé » (UX-15)

Les clés `reason.*` existent déjà. Le rapport du propriétaire ne s’en sert pas sur la ligne de domaine : la phrase `domain.*.untested` suffit aujourd’hui, et la raison n’apparaît dans un constat que s’il n’y a pas d’autre texte.

Règle d’affichage, rapport du propriétaire seulement, quand le domaine n’a pas de note :

1. Forme pointillée, libellé « Non testé », phrase de domaine inchangée (sauf DNS, UX-13).
2. Si la couverture déjà fournie est inférieure à 50 % : « Moins de la moitié des tests ont abouti. Ce domaine n’a pas de note. » On affiche le seuil. On ne le recalcule pas autrement.
3. Une cause, la plus fréquente parmi les constats sans note de ce domaine. Puis : « Ce n’est pas une note du site. »
4. S’il y a d’autres causes : `<details>` « Autres raisons », une phrase par cause, sans doublon.
5. Search Console : la cause s’accompagne du lien déjà prévu « Relier Search Console » (`.link-action`).

Causes, à partir des clés existantes. `{source}` n’est jamais un code :

| Donnée déjà présente | Phrase |
|---|---|
| `reason.runner_absent`, `reason.browser_skipped`, source `browser` | Le navigateur d’audit n’a pas tourné. |
| `reason.runner_pending` | Le navigateur d’audit n’a pas encore fini. |
| `reason.missing_source`, source `psi` | PageSpeed n’a pas renvoyé de mesure. |
| `reason.missing_source`, source `crux` | Il n’y a pas de mesure de visite réelle. |
| `reason.missing_source`, source `gsc` | Search Console n’est pas reliée. |
| `reason.missing_source`, source `dns` | Le DNS public n’a pas répondu. |
| `reason.missing_source`, source inconnue | Une source extérieure n’a pas répondu. |
| `reason.timeout`, `reason.error`, `reason.invalid_result`, `reason.active_unverified` | La phrase déjà dans `fr.ts`. |
| Raison absente | Aucune cause inventée. On garde la phrase de domaine et « Ce n’est pas une note du site. » |

Le score public et le lien de partage ne listent pas ces causes. Ils gardent « Non testé », la phrase de domaine et, si la couverture est sous 50 %, la phrase sur la moitié des tests. Ils ne nomment pas le navigateur d’audit, PageSpeed, ni une installation. Le détail de sécurité d’un site tiers reste masqué, comme aujourd’hui.

Aucun texte ne dit qu’une clé, un secret ou un quota manque.

## 6. Vague 2 — Rapport utile

### Imprimer et PDF (UX-16)

« Imprimer » ouvre la page d’impression, puis la boîte du navigateur. Enregistrer en PDF est l’action de cette boîte, pas un fichier produit par le serveur, pas une bibliothèque PDF, pas une fonction Netlify.

La page imprimée contient, dans cet ordre : verdict, domaines (note ou « Non testé » et, sur le rapport du propriétaire, la cause de la Vague 1), constats (titre, constat, limite), pied vérifiable, mentions de preuve. Fond plaque, texte encre, pas de blob, pas de verre translucide. Lien d’appel sur cette page : « Imprimer ». Aide d’une phrase : « Le navigateur peut l’enregistrer en PDF. »

### Markdown (UX-17)

Sur le rapport à l’écran, lien `.link-action` « Télécharger en Markdown ». Le fichier est construit dans le navigateur, depuis le rapport déjà chargé. Pas de nouvel appel réseau, pas de nouvelle fonction.

Nom : `audigy-` + hôte + jour civil de Paris, extension `.md`. Pas d’identifiant secret dans le nom. Contenu : adresse, `formatDateTime`, version de méthode, score global ou « Non testé », domaines, constats (titre, libellé de statut, constat, limite). Dernière ligne : « Ce fichier n’est pas une preuve. » La preuve reste la page Vérifier. Le Markdown du score public reprend la même retenue que l’écran public (UX-15).

### Prompt copiable (UX-18)

Dans le `<details>` de correction, après les étapes : un texte en lecture seule et un bouton secondaire « Copier le prompt ». Retour : « Prompt copié. » Copie dans le presse-papiers du navigateur. Aucun envoi vers un service d’IA.

Le prompt est assemblé avec des fragments i18n. Il contient l’adresse, le titre, le constat, la limite (ou « Aucune limite signalée. »), puis : « Proposez des étapes que le propriétaire peut faire. » « N’inventez pas de note. » « Ne proposez pas de test sur le site. » Il ne répète que le correctif déjà montré. Il n’ajoute pas de procédure d’attaque, de charge utile, ni de contournement. Si la copie échoue : « La copie a échoué. Sélectionnez le texte. »

### Constats scannables (UX-19)

Ligne visible : forme, libellé, titre, une phrase de constat, durée à part. La limite (raison traduite, ou ce que le test ne couvre pas déjà écrit dans la copie) va dans un `<details>` « Limite de ce constat », fermé. « Voir comment corriger » reste un second `<details>`. Si le constat et la limite sont la même phrase, on ne la répète pas : elle reste le constat, et le bloc limite est absent.

### Méthode et légal (UX-20, optionnel)

Pages Méthode, conditions, confidentialité, mentions, accessibilité : un sommaire d’ancres vers les `h2`, en tête, liens `.link-inline`. Le texte d’engagement reste ouvert. On ne replie pas une obligation. Seule une annexe clairement secondaire peut être un `<details>`. Blobs figés, pas de hero, comme Arc Soft.

Si cette entrée glisse, la Vague 2 peut fusionner sans elle. Elle devient alors obligatoire en Vague 3, et la PR le dit.

## 7. Vague 3 — Historique et finition

### Historique découpé (UX-21)

Un seul module « Historique », trois étages :

1. Ouvert : résumé, aide de courbe plate (UX-10), courbe. Série globale seule au départ.
2. `<details>` « Autres mesures » : les autres séries, trois au plus, règle actuelle inchangée.
3. Le tableau reste derrière « Voir en tableau ». La comparaison (« Comparer deux audits ») passe dans un `<details>` fermé.

On ne change pas le calcul des points, l’axe 0–100, ni les bandes 50 et 80.

### Sites allégés (UX-22)

La tuile reste le lien vers le dernier rapport (nom, URL en mono, date avec `formatDate`, mini-score ou « Non testé »). Vérifier le site, la réputation et le partage passent dans un `<details>` « Actions du site », fermé, sous la tuile. Le lien Search Console reste une fois au-dessus de la liste, en `.link-action`, pas répété sur chaque tuile. Un seul bouton principal : « Ajouter un site ». Rien de ces actions n’est retiré.

### État vide (UX-23)

Un seul présentation pour une liste vide : plaque de verre, une phrase, une seule action s’il y en a une. Cas : aucun site (« Aucun site pour le moment. » et le bouton ajouter), historique sans mesure (« Pas encore de mesure. »), filtre de constats sans ligne, score public absent. L’erreur réseau reste un `role="status"`, pas cet état vide. Pas de deuxième style, pas d’illustration.

### Verre manquant (UX-24, UX-25, UX-26)

Même verre, même plaque, même barre que le rapport. Pas de nouveau token.

- Lancement (`/lancer`) : le titre et le message d’état entrent dans la plaque. Pas de H1 nu au-dessus du fond.
- Progression (`/progression`) : idem. L’overlay et le squelette Arc Soft restent. Le lien « Revenir à l’accueil » reste dans l’ordre du clavier.
- Score public et partage : verdict, domaines, mention de sécurité masquée, badge, pied. `PreuveMentions` suit UX-05. Pas de détail de sécurité. Pas des causes internes de UX-15.

### Note de pied (UX-27)

Sous les liens de pied, la clé déjà rédigée : « Outil gratuit. Aucun traceur. Polices hébergées ici. » Une ligne, encre secondaire, corps petit. Pas un encart. Absente à l’impression du rapport.

### Barre, filtres, liens externes (UX-28)

- Barre : on ne refait pas le menu. On corrige seulement un écart restant avec UX-02 (classe, page active, Échap, focus non couvert par la barre).
- Filtres de constats : seule la valeur active est une pilule. Les autres sont des boutons texte. Le groupe a son nom accessible. La couleur n’est pas le seul signe de l’état actif.
- Lien vers un autre site (source officielle d’un constat) : même onglet, classe `.link-inline`, mention accessible « hors d’Audigy ». Pas de `target="_blank"` sans cette mention. On n’ouvre pas ces liens pendant la revue.

## 8. Critères d’acceptation

Cette PR n’a aucun de ces critères à implémenter. Ils valent pour la PR de la vague nommée. Revue visuelle du propriétaire avant la vague suivante.

### Vague 1

- [ ] UX-01 à UX-04 : les quatre classes existent. Un lien de phrase est souligné. La barre et le pied ne le sont pas au repos. Un seul bouton principal par écran concerné.
- [ ] UX-05 et UX-06 : preuve et intro de vérification fermées. Le pied vérifiable reste visible. Clavier : Entrée ou Espace ouvre le résumé.
- [ ] UX-07 et UX-08 : accroches visibles. Un seul H1 sur `/connexion` et sur `/compte`.
- [ ] UX-09 : un instant d’audit s’affiche « 23 oct. 2026, 14 h 30 » en Europe/Paris, y compris autour de minuit UTC. `formatDate` ne gagne pas d’heure.
- [ ] UX-10 : courbe plate et mesure unique ont leur phrase. Une courbe qui varie ne l’a pas.
- [ ] UX-11 et UX-12 : « Imprimer » mène à la page d’impression. Les mentions de preuve y sont lisibles en bas.
- [ ] UX-13 : le domaine s’appelle « Nom et courrier ». Les titres de constats séparent nom et courrier. Le score reste un seul domaine.
- [ ] UX-14 : `login.lead` et `account.lead` sont affichés. `footer.note` existe encore.
- [ ] UX-15 : un domaine sans note montre une cause du tableau, ou aucune cause si la donnée manque. Jamais un code. Jamais le mot « clé ». Le score public ne reprend pas les causes internes.
- [ ] copy-lint vert. Tests hors ligne sur `formatDateTime`, le choix de la cause, et l’ouverture des `<details>`. Pas de déploiement Netlify.

### Vague 2

- [ ] UX-16 : la boîte d’impression du navigateur est le seul PDF. Le document imprimé suit l’ordre du §6.
- [ ] UX-17 : le Markdown se télécharge sans requête nouvelle. La dernière ligne dit que ce n’est pas une preuve.
- [ ] UX-18 : « Copier le prompt » copie le texte affiché. Aucune requête vers un outil d’IA. Le prompt ne dépasse pas le correctif déjà montré.
- [ ] UX-19 : la ligne de constat tient sans la limite. La limite s’ouvre à part. Pas de phrase doublonnée.
- [ ] UX-20 : fait dans cette PR, ou explicitement reporté à la Vague 3.
- [ ] Tests hors ligne du contenu Markdown et du prompt. copy-lint vert. Pas de déploiement Netlify.

### Vague 3

- [ ] UX-21 : série globale visible, autres mesures et comparaison repliées, tableau derrière son bouton.
- [ ] UX-22 : la tuile ne montre plus la réputation, le partage et la vérification tant que « Actions du site » est fermé. Un seul bouton « Ajouter un site ».
- [ ] UX-23 : les quatre vides du §7 partagent la même présentation.
- [ ] UX-24 à UX-26 : lancement, progression et score public sont dans une plaque. Le score public ne montre pas de détail de sécurité ni de cause interne.
- [ ] UX-27 : `footer.note` est sous le pied, absente de l’impression du rapport.
- [ ] UX-28 : filtre actif reconnaissable sans la couleur. Lien externe annoncé « hors d’Audigy ».
- [ ] UX-20 traité si la Vague 2 l’a reporté.
- [ ] Playwright et axe sur les écrans touchés, hors ligne. Checklist `docs/DESIGN.md` §9. Pas de déploiement Netlify.

## 9. Découpage des PR

| Ordre | PR | Contenu | Suite |
|---|---|---|---|
| 1 | Spec (ce document) | Markdown seul. Aucune UI. | Relecture propriétaire, puis fusion sur `main`. |
| 2 | Vague 1 | UX-01 à UX-15. | Revue visuelle, fusion, puis seulement la Vague 2. |
| 3 | Vague 2 | UX-16 à UX-19, et UX-20 si retenu. | Revue visuelle, fusion, puis seulement la Vague 3. |
| 4 | Vague 3 | UX-21 à UX-28, plus UX-20 si reporté. | Revue visuelle, fusion. |

Chaque PR d’interface part de `main` après la fusion précédente. Pas de branche empilée dans cette spec. Une PR = une vague. Pas de correctif moteur « pendant qu’on y est ».

## 10. Références

- Spec Arc Soft : `docs/archive/superpowers/specs/2026-10-24-arc-soft-design.md` (verre, barre, rapport, compte, sites, impression des principes). Le plan d’implémentation Arc Soft n’est pas une référence de cette spec.
- `docs/DESIGN.md` §4 (statuts, dont « Non testé »), §7 (ton), §8 (accessibilité), §9 (checklist).
- `docs/METHODE.md` §2 : quand une mesure est « Non testé ». On cite la règle. On ne la réécrit pas.
- `docs/RECETTE.md`, section « Reste au propriétaire » : lecteur d’écran réel, Firefox, niveaux de gris, zoom 200 %, liens externes à la main, échéance `security.txt`, HSTS, URLs du plan du site, PART-27. Cette spec ne les relance pas et ne les coche pas.
