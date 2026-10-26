# Audigy — spécification « Arc Soft »

> **Archive (26 octobre 2026).** Décisions déjà appliquées sur `main`. Ce fichier n’est plus la source de vérité. Produit : [`docs/FONCTIONNEMENT.md`](../../../FONCTIONNEMENT.md). UI : [`docs/DESIGN.md`](../../../DESIGN.md) et le pack design. Ancien chemin : `docs/superpowers/`.

Date : 24 octobre 2026. Statut : décisions verrouillées par le propriétaire. Ce document ne modifie pas l’application ni `docs/DESIGN.md`. Il décrit le redesign à réaliser **après** la fusion de PART-26 sur `main`.

**Sombre gelé le 2026-10-26.** Les valeurs claires ci-dessous restent l’ancre Arc Soft (PR #66). Le dégradé sombre `#15181C` / `#1A2830` est remplacé par [`docs/design-pack-2026-10-26/04-THEME-DARK.md`](../../../design-pack-2026-10-26/04-THEME-DARK.md) et [`docs/DESIGN.md`](../../../DESIGN.md) §2.4. Ne pas relancer Stitch. Nav et logo : [`01-REGLES-STRICTES.md`](../../../design-pack-2026-10-26/01-REGLES-STRICTES.md).

Décisions verrouillées :

| Sujet | Décision |
|---|---|
| Intensité | Très spectaculaire. `docs/DESIGN.md` pourra être révisé pendant l’implémentation, pas avant. |
| Famille visuelle | Verre lumineux, inspiré d’Apple et d’Arc. |
| Direction | A — Arc Soft (recommandée et retenue). |
| Périmètre | Tout le site : accueil, rapport, compte, sites, pages légales. |
| Calendrier | Après PART-26 (durcissement). Pas pendant PART-26. |

Le produit reste gratuit, en français, pour des particuliers non techniciens. On observe, on n’exploite pas. Le ton de `docs/DESIGN.md` §7 reste la règle de copie.

## 1. Objectif et non-objectifs

### Objectif

Remplacer l’habillage papier calme par une coquille unique « Arc Soft » : fond lumineux, panneaux de verre, une barre flottante, un mouvement court et lisible. Le rapport reste l’écran principal : un score, ce qu’il signifie, puis quoi faire. L’accueil présente ce rapport avant de demander une URL.

### Non-objectifs

- Ne pas changer la méthode d’audit, les scores, les seuils 50 et 80, ni les libellés « Bon », « À améliorer », « Problème », « Non testé ».
- Ne pas ajouter de compte payant, de témoignages, de logos clients, ni de statistiques inventées.
- Ne pas publier le détail de sécurité d’un site tiers.
- Ne pas introduire de thème violet, d’emoji, du DSFR ou de la police Marianne.
- Ne pas mener ce travail dans la PR de PART-26, ne pas déployer sur Netlify, ne pas acheter de domaine.

## 2. Système visuel

Une seule coquille pour toutes les pages. Les valeurs ci-dessous sont les tokens du redesign. L’implémentation les pose en variables CSS. Aucune couleur hors de cette liste, sauf les couleurs de score déjà définies dans `docs/DESIGN.md` §4, qui ne bougent pas.

### Fond

Dégradé linéaire, du haut vers le bas, fixe sur le viewport (`background-attachment: fixed`), sur toute la page :

- Clair : `#FAF8F4` (ivoire) en haut, `#D7E7F2` (bleu glace) en bas.
- Sombre : `#15181C` en haut, `#1A2830` en bas. Le thème suit `prefers-color-scheme` et le réglage manuel déjà prévu (localStorage). Pas de noir pur.

### Blobs

Deux ou trois formes elliptiques pastel, derrière le contenu, `pointer-events: none`, `z-index` sous les panneaux.

| Blob | Couleur | Taille | Position | Opacité claire |
|---|---|---|---|---|
| Pétrole | `#9FCFCB` | 42vw, plafond 640px | coin haut gauche, décalé de −10vw et −8vh | 0,55 |
| Pêche | `#F3C7B4` | 36vw, plafond 520px | droite du hero, centré verticalement dans le premier écran | 0,45 |
| Lilas | `#E3D4F0` | 28vw, plafond 420px | bas gauche du document | 0,35 |

Filtre : `blur(64px)`. En sombre, les trois opacités passent à 0,18 et les mêmes teintes sont conservées. Sous 768px, le blob lilas n’est pas peint (deux blobs). Le lilas n’est jamais une couleur de marque, de lien, de bouton ou de score. Interdit : `#6366F1`, `#8B5CF6`, `#A855F7`, tout dégradé violet, tout texte en dégradé.

### Verre

Panneau standard :

- Fond : `rgba(255, 255, 255, 0.64)` en clair. Fourchette autorisée : 0,55 à 0,72. Une seule valeur par type de panneau, pas un mélange par carte.
- Sombre : `rgba(29, 33, 38, 0.72)`, même fourchette.
- `backdrop-filter: blur(20px)`. Fourchette : 16px à 24px. Préfixe `-webkit-backdrop-filter` avec la même valeur.
- Bordure : `1px solid rgba(255, 255, 255, 0.30)` en clair ; `rgba(255, 255, 255, 0.18)` en sombre.
- Ombre unique, la même partout : `0 18px 48px rgb(27 31 36 / 0.10)` en clair, `0 18px 48px rgb(0 0 0 / 0.35)` en sombre. Pas de halo coloré, pas de seconde ombre au survol.

Le texte ne repose jamais sur le verre translucide seul quand un blob passe derrière. Chaque panneau qui contient du texte a une plaque intérieure opaque : `#FFFFFF` en clair, `#1D2126` en sombre, rayon inférieur de 4px au panneau. Le flou et la bordure claire restent sur l’enveloppe. Si `backdrop-filter` est absent, l’enveloppe prend la plaque opaque et la bordure `--line` (`#E3DED5` clair, `#2E343B` sombre).

### Accent et secondaire

- Accent pétrole : `#0F5C5A` en clair (liens, bouton principal, focus de marque hors anneau). En sombre : `#5FC1BC`.
- Secondaire pêche : remplissage `#F8E4D8`, bord `#E39A78`. Le pêche ne colore pas un petit texte. Le texte posé sur un remplissage pêche est `--ink` (`#1B1F24`). Le pêche ne code aucun statut de score.
- Encre, encre secondaire, filet, couleurs et formes de score : inchangés par rapport à `docs/DESIGN.md` §4.
- Anneau de focus : 2px `#C2410C`, décalage 2px, y compris sur le verre.

### Formes et espacement

Échelle d’espace inchangée : 4, 8, 12, 16, 24, 32, 48, 64. Largeur de contenu max : 1120px.

Rayons : 4px champs et badges, 8px boutons, 12px modules intérieurs, 16px enveloppes de verre flottantes (barre, hero, modales). Pas de pilule, sauf un filtre réellement actif. Pas de liseré coloré sur un bord de carte.

### Typographie

- Corps, interface, scores : **Atkinson Hyperlegible Next**, auto-hébergée (woff2, sous-ensemble latin, `font-display: swap`). Graisses 400, 600, 700. Échelle inchangée : 12, 14, 16, 18, 22, 28. Corps en interligne 1,5, titres 1,2, ligne ≤ 70ch.
- Scores et tout nombre de jauge : `font-variant-numeric: tabular-nums` sur Atkinson. Le chiffre de jauge reste à 20 % de la largeur de la jauge, « /100 » à part, au moins 12px. JetBrains Mono reste réservé aux URL, en-têtes HTTP et valeurs techniques.
- Affichage (H1 de page seulement) : une police géométrique moderne, auto-hébergée, SIL OFL, latin, `font-display: swap`, graisses 600 et 700. Aucun appel à Google Fonts. Le choix exact est le seul point ouvert : à l’implémentation, en retenir **une** parmi Outfit, Sora et Manrope, puis écarter les deux autres. Inter, Geist, Space Grotesk, Instrument Serif et Poppins restent interdits. Pas d’italique serif sur un mot du titre.
- Casse de phrase. Pas de titres en capitales.

## 3. Mouvement

Le mouvement montre un changement d’état. Il ne décore pas chaque bloc au scroll.

Durées perçues, ressort ou approximation CSS `cubic-bezier(0.22, 1, 0.36, 1)` :

| Geste | Durée |
|---|---|
| Survol (levée) | 200 ms |
| Entrée d’un panneau ou d’une ligne | 280 ms |
| Remplissage de jauge | ≤ 400 ms, de 0 à la valeur |
| Transition de page | ≤ 450 ms |
| Dérive d’un blob | 32 s, linéaire, alternée, boucle |

Levée au survol : `translateY(-3px)` (bornes 2px à 4px) sur les tuiles de site, les lignes de domaine et le bouton principal. L’ombre ne change pas.

Listes (domaines, corrections, tuiles) : décalage de 40 ms entre lignes, plafond 6 lignes animées, le reste apparaît avec la dernière. Total de la séquence < 450 ms.

Morph de page : View Transitions API entre l’accueil, la progression et le rapport. L’aperçu de rapport de l’accueil et la jauge du rapport partagent le même `view-transition-name` (`audigy-gauge`). Les autres pages se fondent en opacité sur 280 ms, sans translation verticale de tout le document.

Jauge : l’arc se remplit en ≤ 400 ms. Réduit à un saut de valeur finale si le mouvement est réduit.

Blobs : translation lente de 24px au plus. Aucun blob ne passe devant un panneau.

Technique : CSS pour le survol, les blobs et la jauge. View Transitions pour le changement de page. Si un ressort doit être calculé en JS, une seule couche légère : Motion One importé sur le geste concerné, ou un module maison plus petit. Pas de Lottie, ni sur l’accueil ni dans le rapport. Pas d’animation inline dans le HTML.

`prefers-reduced-motion: reduce` : durées à 0 ms, pas de dérive de blob (blobs figés à leur position de départ), pas de levée, pas de décalage de liste, jauge déjà à la valeur finale, View Transitions désactivées (`@media` qui court-circuite l’animation). Le contenu reste au même endroit.

## 4. Accueil

Barre flottante décrite en §7. Pas de second en-tête dans la page.

Hero asymétrique, grille 12 colonnes, une colonne sous 768px. Le texte occupe les colonnes 1 à 6. L’aperçu occupe les colonnes 7 à 12 et descend de 48px par rapport au titre.

- H1, police d’affichage : « Vérifiez la santé de votre site, gratuitement. »
- Phrase d’appui, Atkinson, ≤ 20 mots : « Un score, ce qu’il veut dire, et quoi corriger. Rien n’est publié sans vous. »
- Champ : `<label>` visible « Adresse du site », `type="url"`, `inputmode="url"`, autocomplete `url`. Le placeholder `https://exemple.fr` n’est pas le label. Erreur reliée par `aria-describedby` (« Indiquez une adresse complète, comme https://exemple.fr. »).
- Un seul bouton principal : « Lancer l’audit », fond pétrole, texte blanc, hauteur 40px, cible 44px.
- Lien texte secondaire vers la page Méthode : « Comment le score est calculé ». Pas de second bouton.

Aperçu animé : panneau de verre montrant un rapport d’exemple, avec la mention visible « Exemple » (badge rayon 4px). Jauge à 72, libellé « À améliorer », forme triangle, phrase « Votre site peut encore gagner en clarté. », deux lignes de domaine (« Visibilité sur Google », « Connexion chiffrée ») avec score, forme et libellé. Ce bloc ne lance pas d’audit et n’appelle aucun site. Au chargement : remplissage de jauge ≤ 400 ms, puis les deux lignes. L’aperçu est le même élément visuel que la jauge du vrai rapport (morph §3).

Sous la ligne de flottaison, trois zones inégales. Ce n’est pas une grille de trois cartes identiques.

1. Panneau large (8 colonnes) « Ce que vous obtenez ». Liste verticale des noms courants de domaines déjà utilisés dans le rapport (une ligne, un score d’exemple, une forme). Lien « Voir la méthode » en bas du panneau.
2. Panneau étroit (4 colonnes), décalé de 32px vers le bas : « Gratuit pour les particuliers ». Trois phrases : l’audit est gratuit ; un compte n’est pas obligatoire pour lancer une vérification ; le détail d’un site n’est pas public par défaut.
3. Bande pleine largeur « Comment lire le score » : quatre rangées, une par niveau (Bon 80–100, À améliorer 50–79, Problème 0–49, Non testé), chacune avec la forme, le libellé et la plage. Mêmes couleurs de score que le rapport.

Pied léger, hors verre épais : filet 1px `--line`, liens « Méthode », « Conditions d’utilisation », « Confidentialité », « Mentions légales », « Accessibilité ». Une ligne, qui passe à la ligne sous 768px. Pas de barre de logos.

## 5. Rapport

Une colonne de lecture, largeur max 720px, centrée dans les 1120px. Pas de colonne latérale. Chaque bloc ci-dessous est un module de verre, dans cet ordre, empilé avec 24px d’écart.

1. Verdict. Une jauge (arc 270°, trait 8px, piste `--line`, remplissage à la couleur du niveau). Phrase selon le score réel (« Votre site est en bonne santé. » seulement si la moyenne est ≥ 80). Décompte en français (« 4 points à corriger, dont 1 urgent. »). `role="img"` et `aria-label` du type « Performance : 72 sur 100, à améliorer ». Animation ≤ 400 ms. Sous la phrase, trois liens au plus vers les constats. Pas une rangée de boutons.
2. Domaines. Liste compacte, pas une grille de cartes, pas une barre répétée. Nom courant, terme technique, phrase de constat, score et forme à droite. Survol : levée 3px de la ligne (fond de ligne `#FFFFFF` / `#1D2126`), focus clavier visible. La ligne entière est un lien vers le détail du domaine.
3. Corrections. Trois groupes, dans cet ordre : « À corriger en priorité », « À améliorer ensuite », « Ce qui va bien ». Le troisième est un `<details>` fermé par défaut. Chaque ligne : forme, libellé, titre, phrase, durée à part. « Voir comment corriger » est un second `<details>` : étapes numérotées, bloc copiable si le constat en a un, lien vers une source officielle (CNIL, MDN, ANSSI ou RGAA).
4. Historique. Courbes simples, une catégorie à la fois ou trois traits au plus (plein, tirets, pointillés). Axe Y de 0 à 100, bandes légères aux seuils 50 et 80. Pas de dégradé sous la courbe, pas de camembert. Bouton « Voir en tableau » et résumé texte (« +12 points depuis le 3 mars »). Axe X : si tous les points visibles tombent le même jour calendaire en Europe/Paris, les graduations sont des heures (« 9 h », « 14 h », « 18 h ») ; sinon des dates courtes (« 23 oct. »). Un point isolé le même jour affiche l’heure, pas la date répétée. Points cliquables vers le rapport correspondant.
5. Pied vérifiable, en JetBrains Mono : URL auditée, date et heure Europe/Paris, version de la méthode, identifiant ou empreinte, bouton « Vérifier ce rapport ».

Progression d’audit. Tant que le rapport n’est pas prêt, un overlay couvre la colonne de lecture (verre + plaque opaque). Il contient un squelette : disque à la place de la jauge, trois barres à la place des lignes. Le squelette est statique (aplats `#E3DED5` / `#2E343B`). Interdit : balayage brillant. Si le mouvement est autorisé, l’opacité des barres pulse entre 0,45 et 1 en 1 s ; à l’arrêt si `prefers-reduced-motion`. Région `aria-live="polite"` : « Analyse en cours. », puis le nom courant du domaine terminé, puis « Rapport prêt. ». L’overlay n’est pas `aria-modal`. Le lien « Revenir à l’accueil » reste dans l’ordre de tabulation. À la fin, l’overlay disparaît et la jauge joue son remplissage (ou apparaît finale si le mouvement est réduit).

## 6. Compte, sites et pages légales

Même fond, mêmes blobs, même barre, mêmes panneaux. Pas d’autre coquille.

### Compte

Page en une colonne, 720px. Quatre modules, dans cet ordre :

1. Profil : adresse e-mail du compte, bouton secondaire « Se déconnecter ».
2. Conditions acceptées : numéro de version et date (« Acceptées le 23 oct. 2026, version 1 »), lien vers le texte.
3. Export : bouton « Télécharger mes données » (JSON). Phrase : « Le fichier contient vos sites, vos rapports et l’historique. »
4. Suppression : bouton bordé « Supprimer mon compte », puis confirmation explicite (« Cette action efface vos sites, vos rapports et vos fichiers. Elle est définitive. »). Deux actions : « Annuler » (lien) et « Supprimer définitivement » (bouton).

### Connexion

Une carte de verre, 480px, centrée dans le premier écran. Titre « Recevoir un lien de connexion ». Label « Adresse e-mail », champ e-mail, bouton « Envoyer le lien ». Après envoi, la même carte affiche « Le lien arrive dans votre boîte. Il expire tout seul. » sans quitter la page. Pas de mot de passe sur cet écran.

### Sites

Liste de tuiles empilées (une colonne), pas une grille de trois. Chaque tuile : nom du site, URL en mono, date du dernier audit (« 23 oct. 2026 »), mini-score (jauge 64px, tabular, forme + libellé). La tuile entière est un lien vers le dernier rapport. Sans audit : forme pointillée, libellé « Non testé », lien « Lancer un audit ». Bouton principal de la page, un seul : « Ajouter un site ».

### Pages légales

Méthode, CGU, confidentialité, mentions, accessibilité. Prose calme, colonne 70ch, titres Atkinson (pas la police d’affichage). Même fond et même barre, blobs figés (pas de dérive, même si le mouvement est autorisé ailleurs). Pas de hero, pas d’aperçu de rapport, pas de jauge. Les liens de pied restent ceux de l’accueil.

## 7. Navigation

Une seule barre flottante, sur toutes les pages y compris le rapport et les pages légales. Pas de barre latérale, pas d’en-tête dupliqué dans le contenu.

- Fixe, à 16px du haut, centrée, largeur max 1120px, hauteur 56px, verre (§2), rayon 16px, ombre flottante unique.
- Gauche : lien « Audigy » vers l’accueil (texte, pas un logo image).
- Droite : « Méthode », puis « Connexion » ou, en session, « Sites » et « Compte ».
- Lien d’évitement « Aller au contenu », visible au focus, avant la barre.
- Sous 768px : les liens de droite se replient dans un bouton « Menu » dans la même barre. Le panneau ouvert est un module de verre sous la barre, pas une seconde navigation. Touche Échap ferme le panneau et rend le focus au bouton.
- La page active est indiquée par un soulignement 2px pétrole et `aria-current="page"`, pas par une pilule.
- Le focus n’est jamais masqué par la barre : `scroll-padding-top: 88px` sur le document.

## 8. Accessibilité et performance

Cible : WCAG 2.2 AA et RGAA 4.1, comme `docs/DESIGN.md` §8.

- Contraste du texte ≥ 4,5:1 (≥ 3:1 pour le texte ≥ 24px ou ≥ 18,66px gras, et pour les composants graphiques). La mesure se fait sur la plaque opaque, pas sur une capture idéale sans blob. Clair et sombre.
- Si un essai montre qu’un texte hors plaque tombe sous 4,5:1, ce texte rentre dans la plaque. On n’abaisse pas le contraste pour garder le flou.
- Clavier complet, ordre visible, focus 2px `#C2410C`. Zoom 200 % et reflow 320px sans scroll horizontal. `lang="fr"`.
- `aria-live="polite"` pour la fin d’audit et pour l’erreur de formulaire. Pas d’annonce en `assertive` pour un simple changement de score.
- `prefers-reduced-motion` traité comme en §3, sur chaque page du périmètre.
- Nombres au format français (« 1 234 », « 3,5 s »), dates « 23 oct. 2026 », heures « 14 h ».

Budget accueil : **moins de 700 Ko gzippés** pour le document, le CSS, le JS et les polices du premier écran. Ce plafond remplace les 500 Ko de `docs/DESIGN.md` §8 seulement une fois que DESIGN.md est mis à jour dans la PR d’implémentation. Le rapport peut dépasser ce chiffre s’il charge un graphe, mais aucune page ne charge de ressource tierce.

Zéro tracker tiers. Zéro police distante. Zéro requête vers Google Fonts, un CDN de icônes ou un script d’analytics. Icônes Lucide auto-hébergées, 1,5px, 20px, `currentColor`, avec leur libellé.

## 9. Ce qui change plus tard dans DESIGN.md

La révision de `docs/DESIGN.md` fait partie de la première PR d’implémentation, pas de la PR qui ajoute cette spec. Tant que cette révision n’est pas mergée, le code UI continue de suivre le DESIGN.md actuel.

À autoriser alors :

- Panneaux de verre dans les bornes du §2 (opacité, flou, bordure blanche 30 %).
- L’ombre flottante unique du §2, à la place de l’unique ombre de menu `0 4px 16px rgb(0 0 0 / .08)`, qui disparaît au profit de ce token.
- Blobs pastel pétrole, pêche et lilas, aux positions et opacités du §2.
- Mouvement expressif du §3 (ressorts 200–450 ms, levée, morph, jauge, listes), toujours coupé par `prefers-reduced-motion`.
- Police d’affichage unique choisie parmi Outfit, Sora et Manrope, limitée au H1.
- Rayon 16px réservé aux enveloppes flottantes.
- Budget d’accueil porté de 500 Ko à 700 Ko gzippés.

À conserver sans assouplissement :

- Pas de violet « AI slop », pas de texte en dégradé, pas d’emoji, pas d’icône Lucide dans un carré dégradé.
- Pas de DSFR, pas de Marianne.
- Contraste AA, y compris sur le verre, avec repli opaque.
- Le statut de score est toujours une forme plus un libellé, en plus de la couleur. Palette bleu / orange / rouge inchangée. Jamais le statut par la seule couleur.
- Ton français : vouvoiement, phrases courtes, constat puis conséquence puis action, titre d’accueil factuel, pas de superlatif marketing.
- Une colonne de lecture pour le rapport. Pied vérifiable. `aria-live` sur le résultat.
- Zéro tracker, zéro police tierce.

La checklist §9 de DESIGN.md devra citer ces exceptions (verre, blobs, ombre flottante, mouvement) pour qu’un contrôle ne rejette pas Arc Soft comme un motif interdit.

## 10. Hors périmètre

- **PART-26** (durcissement et recette) : revue de sécurité, CSP, anti-abus, auto-audit, tests lecteurs d’écran de la jauge actuelle, `docs/RECETTE.md`. Ce redesign ne s’y mêle pas. Il démarre quand PART-26 est sur `main`.
- **Déploiement Netlify** : pas de `netlify deploy`, pas de liaison Git, pas de deploy preview, pas de build hook. `netlify dev` reste autorisé pour le développement local, hors de cette PR de spec.
- **Achat et branchement du domaine** : DNS, HTTPS de production, SPF, DKIM, DMARC. Cela reste dans PART-27, action du propriétaire.
- Changement de méthode de score, ajout de fournisseurs, mode application native, illustration Lottie, thème supplémentaire hors clair / sombre.

## 11. Critères d’acceptation des futures PR de redesign

Ces critères s’appliquent aux PR d’implémentation. Cette PR-ci ne les implémente pas.

Le travail peut tenir en une PR ou en trois, dans cet ordre : (1) tokens, barre, accueil ; (2) rapport et progression ; (3) compte, sites, légal. Chaque PR mergée laisse le site cohérent : pas de page Arc Soft à côté d’une page encore papier sans que la barre et le fond soient déjà ceux du §2.

- [ ] PART-26 est déjà sur `main`. La PR de redesign ne contient aucun correctif de durcissement.
- [ ] `docs/DESIGN.md` est à jour dès la première PR UI, selon le §9 de cette spec. La checklist §9 ne marque plus le verre, les blobs pastel autorisés, l’ombre flottante et le mouvement du §3 comme des motifs interdits.
- [ ] Tokens du §2 présents en CSS. Aucune couleur, aucun flou et aucun rayon hors tokens. Accent pétrole. Secondaire pêche limité au remplissage. Scores inchangés (forme + libellé + couleur).
- [ ] Plaque opaque derrière chaque texte. Contraste AA mesuré en clair et en sombre. Repli sans `backdrop-filter` vérifié.
- [ ] Police de corps : Atkinson Hyperlegible Next. Scores en tabular-nums. Une seule police d’affichage parmi Outfit, Sora et Manrope, fichiers woff2 dans le dépôt. Aucune requête Google Fonts.
- [ ] Accueil : hero asymétrique, aperçu « Exemple » animé, champ URL avec label, un seul CTA « Lancer l’audit », zones sous la ligne de flottaison conformes au §4 (pas trois cartes identiques), pied léger.
- [ ] Rapport : une colonne, modules du §5, jauge ≤ 400 ms, liste de domaines avec survol, corrections en `<details>`, historique dont l’axe X passe en heures le même jour (Europe/Paris), pied vérifiable.
- [ ] Progression : overlay, squelette sans balayage brillant, `aria-live="polite"`, lien « Revenir à l’accueil » atteignable au clavier.
- [ ] Compte : profil, version des CGU, export JSON, suppression confirmée. Sites : tuiles avec mini-score. Connexion : carte magic link. Pages légales : prose 70ch, blobs figés, pas de hero.
- [ ] Une seule barre flottante, lien d’évitement, `aria-current`, menu replié sous 768px fermable par Échap.
- [ ] `prefers-reduced-motion` : pas de dérive, pas de levée, pas de décalage, jauge instantanée, sur l’accueil, le rapport, le compte et les sites.
- [ ] Accueil < 700 Ko gzippés. Zéro requête tierce (tracker, police, icône).
- [ ] Rendu vérifié à 320px, 768px et 1280px, et au zoom 200 %. Parcours clavier. Lecteur d’écran sur la jauge, la liste de domaines et la région live.
- [ ] Copie relue : français simple, sans lorem, sans emoji, sans « boostez » ni équivalent.
- [ ] Tests ajoutés (Vitest pour les règles d’axe horaire et les tokens ; Playwright + axe sur l’accueil, le rapport et la connexion). Hors ligne, sans appel à un site réel. `pnpm check` vert.
- [ ] Aucun déploiement Netlify dans la PR.
