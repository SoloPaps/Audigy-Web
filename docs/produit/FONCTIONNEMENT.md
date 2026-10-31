# Fonctionnement d’Audixio

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Connexion = **e-mail + mot de passe**, ou **Google / GitHub**. Plus de magic link.
> - Vérification de propriété = **5 méthodes** : Google Search Console (recommandée, OAuth lecture seule « siteOwner »), DNS TXT, balise meta, fichier HTML à la racine, fichier `.well-known`. Remplace les « vagues » de preuves du 28/10 et « GSC ≠ vérification » du 27/10.
> - Stripe / Pro **gelés** : liste d'attente seulement. Popup Pro uniquement quand la limite est atteinte (gratuit : 2 sites, 1 lien actif).
> - Un seul jeu de rapport **adaptatif** (hub, domaine, détail) avec **un** bandeau de statut discret ; verrous côté serveur. Les pages de domaine restreint **gardent** les pastilles HTTPS / HSTS / X-Frame.
> - Notes **A à F** (E et F ajoutées). Pas de /100.

Document produit du **26 octobre 2026**, **aligné soft-gate PARTIEL + lock-components + décisions owner 28 octobre 2026 (soir post-Claude)**. Source de vérité pour ce que le site fait, pour qui, et sous quelles limites.
Décisions owner : `docs/00-DECISIONS.md` ; récap : `docs/etapes/00-LISEZ-MOI.md`.

Soft-gate partiel (canon) : `docs/produit/SOFT-GATE-PARTIEL-CANON.md`  
**Matrice statut → droits (SSOT)** : `docs/produit/MATRICE-STATUT-DROITS-CANON.md`  
Spec officielle : `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/Audixio-spec-officielle-soft-gate.md`  
Rapport détaillé : `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/Audixio-rapport-soft-gate-partiel-COMPLET-2026-10-28.md`

Les phrases ci-dessous décrivent le **produit décidé**. Certaines parties sont **déjà dans le code** ; d’autres sont **à construire**. C’est indiqué clairement.

**Invalidé (ne plus écrire ni coder) :** « pas de détail exploitable avant vérif » ; « soft-gate = note + scores + priorités config seulement » ; « sans compte / non vérifié = pas de brief » ; « hub Stitch PARTIEL séparé requis » ; « 3 priorités détaillées sur le hub ». Remplacé par soft-gate **partiel** + **matrice statut→droits** + **un design COMPLET + composants Verrouillé**. ; « option C vie privée bientôt / 7 domaines au lancement » (remplacé par tests partiels HTTP/HTML + domaine Verrouillé).

---

## 1. Qu’est-ce qu’Audixio ?

Audixio audite un site web et explique le résultat **en français clair**.

Deux publics, une même méthode :

1. **Particuliers** — note(s), priorités, langage simple.
2. **Développeurs, freelances, entreprises** — détail par domaine, « Comment corriger », et un **brief IA** (Rien / Vérif / Fix) selon droits (matrice §5).

L’accueil parle d’abord au particulier. Une ligne pointe vers le détail et le brief. Sur le rapport : le **verdict en haut**, la technique **repliée** en dessous.

Audixio ne « pirate » pas. Les tests sont **passifs par défaut**. Les tests actifs n’existent que si la propriété du site est vérifiée (et revérifiée juste avant).

---

## 2. Les huit domaines (méthode)

Une seule liste de **huit domaines** forme la note globale (page Méthode) :

1. Performance  
2. SEO  
3. Sécurité  
4. Écologie  
5. Accessibilité  
6. Qualité technique  
7. Vie privée  
8. DNS / e-mail  

À part (hors note globale) : **Disponibilité** et **Réputation**.  
**Search Console** : facultatif, plus tard, pas un neuvième domaine de la méthode.

### Soft-gate partiel — ouvert / verrouillé / B1

| Domaine | Soft-gate | Sans vérif |
|---|---|---|
| Performance, SEO, Écologie, Qualité technique | **Ouvert** | Lettre A–F + détail + priorités + guides génériques |
| Accessibilité | **Option B1** | Lettre A–F **gardée** + indicateurs bruts ; mention obligatoire **« mesure automatique / partielle »** ; **zéro** claim RGAA/EAA |
| Sécurité, Vie privée, DNS / e-mail | **Verrouillé** | **Pas** de lettre A–F → badge **Verrouillé** + micro-texte général ; données **absentes** payload |

> **Déjà dans le code :** moteur et rapport multi-domaines, page méthode, scores.  
> **À aligner en code :** soft-gate partiel (filtre serveur), double note, badges Verrouillé, matrice brief ; une seule liste 8 partout ; libellés « passif par défaut », « horodaté », jargon hors couche 1, « votre assistant IA ».

---

## 3. Parcours utilisateur (vue d’ensemble)

1. Arriver sur l’accueil → comprendre en une phrase → coller une URL → lancer un audit.  
2. Voir la progression (file, DNS, pages, vie privée selon le cas).  
3. Lire le rapport (**un design hub COMPLET** ; si pas les droits → composants **Verrouillé** d’après `MATRICE-STATUT-DROITS-CANON.md`) : note **partielle** libellé `partielle · N domaines · site non vérifié` + note globale cadenas si non vérifié ; hub = TOP 10 priorités (**titre seul**) + 8 cartes domaines + CTA Brief hors page ; détail ouvert Perf/SEO/Éco/Qualité ; sensibles = Verrouillé (teaser sans nommer HSTS/X-Frame). « Comment corriger » **branché site** seulement si **compte + site vérifié**. Brief / sélection : selon matrice (anonyme = aucun ; compte non vérifié = PARTIEL ; vérifié = COMPLET). Sélection Rien/Vérif/Fix sync **domaine ↔ brief**.  
4. Avec un compte : suivre des sites (plafond), créer un lien de partage, exporter un rapport de base ; brief PARTIEL sans vérif.  
5. Plus tard (Pro) : historique long, graphiques, alertes, exports soignés.

Réglages **langue** (FR/EN) et **thème** (clair/sombre) : OK **sans compte**.

Navigation unique (`AppHeader`) :

**Accueil · Méthode · Sites suivis · Tarifs** | **FR/EN** · **thème** · **Connexion** (ou **Compte** si session)

---

## 4. Gratuit sans compte

| Capacité | Décision |
|---|---|
| Lancer un audit | Oui |
| Aperçu du résultat | **Soft-gate partiel** : note partielle + domaines ouverts en détail ; Sécurité / Vie privée / DNS = badge Verrouillé (pas de lettre A–F) ; priorités mixtes ; note globale non calculée / non envoyée |
| Domaines sensibles | Données **absentes** HTML/JS/API — pas de blur CSS sur donnée existante |
| Brief IA | **Aucun** — CTA créer un compte (e-mail + mot de passe, Google ou GitHub) |
| Créer un lien de partage | Non (compte obligatoire) |

> **Partager (UX)** : sur mobile, si `navigator.share` existe, le bouton Partager ouvre la feuille de partage native avec l'URL publique ; sinon (et sur desktop) la modale `interface_partager` (copie, nouveau lien, révocation).

| Historique | **Un seul dernier audit** (1 site), dans le navigateur — pas durable multi-appareils |
| Export PDF/MD | Non (réservé au compte, export de base) |
| Langue / thème | Oui |
| Guides Comment corriger génériques | Oui (publics) ; pas de guide branché à un audit nommé |

Côté moteur : filtre **serveur** + RLS (et table public/masqué pour le détail fin). Anti-fuite : voir canon soft-gate.

> **Déjà dans le code (partiel) :** audit sans compte, rapport avec score et priorités, détail replié, soft-gate conçu (souvent encore « total »).  
> **À construire / figer :** soft-gate **partiel**, double note, badges Verrouillé, absence claire de brief anonyme et de création de lien, persistance « 1 dernier audit navigateur ».

---

## 5. Gratuit avec compte

Connexion par **e-mail + mot de passe**, ou **Google / GitHub** (décision owner du 29/10/2026 ; plus de magic link).


### Compte vs site vérifié (obligatoire)

Le **compte seul** ne débloque **pas** les domaines sensibles ni le brief COMPLET ni le Comment corriger branché site. Il débloque le **brief PARTIEL** et les plafonds.

| État | Ce que voit / peut faire la personne |
|---|---|
| Compte, **site non vérifié** | Même **soft-gate partiel** : détail ouvert Perf/SEO/Éco/Qualité (+ A11y B1) ; Sécurité / Vie privée / DNS = Verrouillé (données absentes) ; note partielle visible ; note globale non envoyée. **Brief PARTIEL** (préfixe `Audixio Brief — PARTIEL (Site non vérifié)`). Pas de Comment corriger branché site. Peut suivre des sites (plafond), créer un lien dans le plafond, export de base. CTA : **Vérifier ce site**. |
| Compte + **site vérifié** | Vue complète 8 domaines + Comment corriger branché + **brief COMPLET** (préfixe `Audixio Brief — COMPLET (Site vérifié)`). Partage public / équipe selon plafonds. Tests **actifs** possibles (propriété **revérifiée juste avant** chaque run actif). |

Preuve de propriété (page Vérifier) — **ordre figé 28 oct soir** :
- **Immédiat (MVP)** : (1) fichier TXT ; (2) balise meta ; (3) lien HTML dans la page.
- **Vague 2** : (4) DNS TXT / CNAME.
- **Plus tard** : (5) OAuth hébergeur / Search Console-like si utile.
Trio marché cible = fichier + balise/lien + DNS (DNS **décalé**, pas bloquant le cœur).
Succès UI = « détail sensible, Comment corriger, brief COMPLET, partage débloqués » — pas « tous droits gestion ».

Parcours freelance (site d’un tiers) : soft-gate partiel → modale **Demander l’accès** → le propriétaire (compte + site vérifié) **Accepte** sur la page Acceptation → lien équipe / lecture seule (détail + brief selon vérif proprio, **même sans compte** destinataire).


| Capacité | Plafond / règle |
|---|---|
| Sites suivis | **2 sites** maximum |
| Liens de partage actifs | **1** (public **ou** équipe) |
| Historique | **Dernier rapport par site** (profondeur 1 — pas de longue liste d’anciens audits) |
| Détail domaines ouverts | Oui dès soft-gate partiel (sans vérif) |
| Détail domaines sensibles + Comment corriger branché | **Oui seulement si le site est vérifié** |
| Brief IA | Anonyme = aucun ; compte non vérifié = **PARTIEL** ; compte + vérifié = **COMPLET** (gratuit, **pas** réservé au Pro) |
| Création de liens | Oui (dans le plafond) |
| Export rapport de base (PDF / MD) | Oui, gratuit |

### Lien public

- Durée : **30 jours**  
- Miroir soft-gate **partiel** + **bandeau permanent** (« Rapport public (vue limitée)… »)  
- `noindex, nofollow`  
- **Aucun brief**  
- Retrait en **1 clic**  
- Date d’audit visible  

### Lien équipe

- Lecture seule selon statut de vérif du proprio  
- Brief lecture seule pour le destinataire (**même sans compte**)  
- Révocable (coupure immédiate → re-soft-gate partiel)  

Le compte = propriétaire seulement (historique, brief, réglages). Pas d’espace équipe / sièges pour l’instant.

> **Déjà dans le code (partiel) :** comptes / auth magic link (à remplacer par e-mail + mot de passe / Google / GitHub) / sites / rapports côté Supabase (architecture), brief dans l’interface, exports vagues UX.  
> **À construire / figer :** plafonds 2 sites / 1 lien, profondeur historique 1, **matrice brief** (PARTIEL/COMPLET), soft-gate partiel + anti-fuite serveur, liens public 30 j + bandeau + équipe, export gratuit basique clairement séparé du futur Pro.

---

## 6. Pro (futur)

**Après** go-live et LICENSE. Prix cible **~9 €/mois**. Tracker Radar DuckDuckGo **pas** au lancement (licence CC BY-NC / commerciale à trancher par owner) — liste alternative ou licence OK avant usage. Pas au lancement gratuit.

Fonctions retenues :

- Historique long (**≥ 10 audits**) + **historique courbe** (tendances dans le temps)  
- Tableau multi-sites + tendances  
- Comparaison dans le temps + **graphiques** + export Excel / CSV  
- PDF / export client soigné (logo, comparaison, signature mise en avant) — vs export basique gratuit  
- Prix cible : **~9 €/mois** (après le cœur, pas bloquant)
- Limites plus hautes : **Pro = 10 sites** (+ liens, file prioritaire) ; gratuit = **2 sites**  
- Alertes e-mail (sites à **propriété prouvée** seulement) + petite UI de réglages (seuils, hebdo, on/off)  
- Rapports signés (SHA-256, horodatage)  
- **Pas** d’espace équipe / sièges pour l’instant  

Le **brief IA** reste le même qu'avec le gratuit **compte + site vérifié** (COMPLET) : Pro n'ajoute pas un « meilleur brief », il ajoute historique, surveillance, exports et alertes. Le brief n’est **pas** réservé au Pro.

> **Statut :** documenté ici, **à construire après** le go-live. Ne pas implémenter en passant pendant la refonte UI du gratuit.

---

## 7. Soft-gate PARTIEL (rappel)

Trois situations partagent la même logique soft-gate **partiel** :

1. Visiteur **sans compte** qui vient de lancer un audit.
2. Lecteur d’un **lien public**.
3. Compte connecté **sans** site vérifié pour ce site / ce rapport.

### Visible sans vérif

- **Note partielle** (ouverts + A11y B1 ; libellé exact `partielle · N domaines · site non vérifié`, N réel ; sensibles exclus).  
- Détail Performance, SEO, Écologie, Qualité.  
- Accessibilité B1 : lettre A-F + indicateurs + mention « mesure automatique / partielle » ; pas de claim RGAA/EAA.  
- Hub : TOP 10 titres ; si non vérifié : 1–2 priorités ouvertes + teaser sensible + CTA Vérifier.  
- Guides Comment corriger **génériques** (pas branchés audit nommé).

### Verrouillé / absent sans vérif

- Sécurité, Vie privée, DNS / e-mail : badge **Verrouillé**, **pas** de lettre A–F ; **aucune** donnée dans HTML/JS/API.  
- **Note globale** : non calculée, non envoyée (cadenas neutre UI).  
- Comment corriger **branché site**.  
- Brief : selon matrice (anonyme / lien public = aucun ; compte non vérifié = PARTIEL).

### Anti-fuite

Filtre **serveur** + RLS. Interdit : blur CSS / hide sur donnée déjà présente. Contrat `unverified | verified` : voir spec officielle §6 et `SOFT-GATE-PARTIEL-CANON.md`.

CTA owner si compte non vérifié : **Vérifier ce site** pour débloquer sensibles / Comment corriger / brief COMPLET / partage complet.

UI lien public : bandeau permanent ; masquer Exporter / Partager / Relancer côté lecteur ; durée **30 j** ; soft-gate = gratuit (pas « Soft-gating Pro »).

Le **lien équipe** n’est **pas** soft-gate : lecture seule (détail + brief selon vérif proprio) pour le destinataire ; pas les CTAs owner.

---

## 7bis. Hub, sélection, serveur (28 oct soir)

- **Hub** : note + TOP 10 priorités (titre seul → domaine#ancre) + 8 cartes + Brief CTA hors page. Pas 3 cartes priorités détaillées sur le hub.
- **Sélection** Rien / Vérif / Fix : éditable sur pages **domaine** et page **Brief** ; source unique sync. Brief = aussi réglages prompt (ton, stack…) + aperçu / générer / copier.
- **Serveur source de vérité** : capabilities API ; front rend ouvert vs Verrouillé ; sensibles absents du bundle si locked. Voir `MATRICE-STATUT-DROITS-CANON.md`.

---

## 8. Vie privée au lancement + navigateur

### Tests vie privée (lancement — figé 28 oct soir)

- Tests **partiels gratuits** côté HTTP/HTML, clairement marqués **« partiel »** :
  - `Set-Cookie` au 1er chargement ;
  - scripts tiers **évidents** ;
  - CMP connus (OneTrust, Cookiebot, Didomi) ;
  - liens vers politique cookies / confidentialité.
- **Pas** de DuckDuckGo Tracker Radar tant que licence commerciale / liste alternative OK (owner).
- Domaine Vie privée reste **Verrouillé** en soft-gate (anon / non vérifié) : détail complet seulement après preuve de propriété.

### Navigateur d'audit (plus tard — location VPS)

- **Bêta / local** : on affiche **tout** ce qu'on peut trouver **sans** Tracker Radar DuckDuckGo et **sans** navigateur d'audit = tests partiels HTTP/HTML ci-dessus (libellés « partiel / automatique »).
- **Ensuite seulement** : si l'owner juge que ça marche et que le site est peaufiné, mise en place d'un **serveur navigateur** d'audit en **location mensuelle** (VPS UE typiquement ~5–12 €/mois) — **pas** un achat one-shot de navigateur.
- Runner Playwright / Chromium en **labo local** OK pour le développement.
- **Pas B** (CLI) comme voie principale publique.
- **GitHub Actions interdit** comme navigateur de service public.

Guides « Comment corriger » **génériques** ouverts sur constats des domaines non sensibles : OK. Conseils **personnalisés au site** (« Comment corriger » branché) : seulement après preuve de propriété.

> **Déjà dans le code :** runner Playwright / Chromium en local et labo.  
> **Bêta / local :** tests vie privée **partiels** HTTP/HTML (pas DDG, pas navigateur d'audit requis).  
> **Plus tard (owner) :** VPS navigateur en location mensuelle si le produit est peaufiné. Pas de dépendance à GitHub Actions pour le service.

---

## 9. Où sont stockées les données ?

| Sans compte | Avec compte / Pro |
|---|---|
| Au mieux le **dernier audit en mémoire navigateur** | Comptes, sites, rapports, historique, alertes, liens sur le **serveur** |

- **Serveur** = Supabase (**Docker local** en dev ; instance **distante** prévue pour la prod) + fonctions Netlify en prod.  
- **Pas** sur le PC de l’utilisateur, sauf affichage à l’écran et **export ponctuel** (PDF, MD, plus tard Excel/CSV).  
- Les **graphiques** (Pro) se calculent depuis l’**historique serveur**, pas depuis un fichier local.

Les clés Supabase locales viennent de `supabase status` et **ne vont pas** dans git.

---

## 10. Design et maquettes

- Pack gelé : `docs/design/` (règles, pages, light/dark, logos, backlog).  
- Canon soft-gate : `SOFT-GATE-PARTIEL-CANON.md` + **SSOT** `MATRICE-STATUT-DROITS-CANON.md`.  
- **Stitch = structure** (rapport 5 écrans 28 oct sous `maquettes/page_rapport_hub` etc.). **Un design COMPLET** ; pas de hub PARTIEL Stitch séparé — Cursor code les états **Verrouillé**.  
- Serveur = capabilities ; jamais de findings sensibles dans le client locked.  
- Corrections texte / promesse (8 domaines, passif par défaut, horodaté, jargon, assistant IA, lettres A–F) = **dans le code**.

### Cinq corrections maquettes validées (code)

1. Une seule liste **8 domaines** = Méthode ; Disponibilité / Réputation à part ; Search Console facultatif.  
2. « **Passif par défaut…** » — pas « 100 % passif ».  
3. « **horodaté** » — pas « Certifié RFC 3161 ».  
4. Jargon hors couche 1 ; retirer « Pro » de Soft-Gating.  
5. « **votre assistant IA** » — pas GPT-4o / Claude datés.

---

## 11. Avantages (formulation produit, sans chiffres inventés)

- Une note claire et des **priorités** pour agir sans être expert (partielle visible sans vérif).  
- Le détail des domaines **ouverts** tout de suite ; le détail **sensible** et le Comment corriger branché **après vérification de propriété**.  
- Brief IA : PARTIEL avec compte, COMPLET après vérif (pas réservé Pro).  
- Partage contrôlé : lien public soft-gate partiel (bandeau + noindex) ou lien équipe révocable.  
- Données chez le serveur Audixio, pas éparpillées sur le PC.  
- Tests passifs par défaut ; actifs seulement si propriété prouvée.  
- Design soigné (Arc Soft), thème clair/sombre, français d’abord.

---

## 12. Déjà dans le code vs à construire (synthèse)

### Déjà sur `main` (indicatif)

- Monorepo pnpm, Astro web, Netlify functions, Supabase, `packages/net` anti-SSRF.  
- Interface d’audit (accueil, rapport, sites, historique), habillage Arc Soft, clarté UI, brief agent.  
- Pack design gelé, DESIGN.md, méthode, plan PART-00…26, recette locale.  
- Garde-fou anti-déploiement Netlify en dev.

### À construire / aligner (refonte documentée)

- Soft-gate **partiel** + **matrice statut→droits** + composants Verrouillé + double note + hub TOP 10 + badges Verrouillé.  
- Matrice brief (aucun / PARTIEL / COMPLET / lien public aucun / équipe lecture seule) ; sélection sync domaine↔brief.  
- Plafonds gratuit (2 sites, 1 lien), historique profondeur 1.  
- Liens public 30 j / bandeau / noindex / équipe, retrait 1 clic.  
- Chrome UI unique (AppHeader, logos officiels, drawer = desktop, dark tokens).  
- Cinq corrections de copie / promesse.  
- Rapport deux couches strict (verdict haut / technique repliée).  
- Export gratuit basique vs Pro soigné (Pro plus tard).  
- Pro : historique long, graphes, Excel, alertes UI, rapports signés — après go-live.  
- **Maximum en local** ; bêta publique **seulement quand owner décide** (pas de go Jojo/Cursor). LICENSE ; marque Audixio (owner) ; Netlify Personal + Supabase Pro au lancement public (pas forcément maintenant) ; PART-27 owner only.
- Cœur Cursor d'abord : capabilities serveur + filtrage, hub rapport, soft-gate Verrouillé, connexion e-mail + mot de passe / Google / GitHub. Pro / chrome fancy / EN / Option A = après.

---

## 12bis. Langues (FR/EN) — i18n

> Décidé owner 30/10/2026. **Calendrier inchangé** : l'anglais vient **après le cœur** (§12, `00-DECISIONS.md` « Après »). Mais tout code écrit **dès maintenant** doit respecter les règles ci-dessous (aucun texte en dur), pour que l'ajout de l'anglais ne demande que des traductions.

### En clair (ce que voit l'utilisateur)

- Le site existe en **français (langue de référence)** et en **anglais**.
- Un bouton **FR / EN** dans la nav fait passer **la même page** dans l'autre langue (ex. `/methode` ↔ `/en/methode`), sans revenir à l'accueil.
- Le choix est **mémorisé** : dans le navigateur (cookie `audixio_lang` + `localStorage`) et, si l'utilisateur est connecté, dans son **compte** (préférence de langue). Le choix manuel prime toujours.
- **Première visite** : si le navigateur est en anglais, on **propose** l'anglais (petit bandeau « View this page in English? »). **Jamais de redirection forcée** (ni pour les visiteurs, ni pour Google).
- Les rapports d'audit s'affichent dans la langue choisie ; les e-mails (Brevo) partent dans la langue du compte.

### Comment faire (instructions Cursor)

> Étape d'exécution pas à pas + modèle Cursor conseillé : [`etapes/11-i18n-langues.md`](../etapes/11-i18n-langues.md).

Stack conservée : **Astro statique + îlots Svelte** (pas Next.js, donc **pas** `next-intl`). On utilise le **routage i18n natif d'Astro** et le module existant `apps/web/src/i18n/` (déjà exporté en `./i18n`).

1. **Config** — `apps/web/astro.config.mjs` :
   ```js
   i18n: { locales: ['fr', 'en'], defaultLocale: 'fr', routing: { prefixDefaultLocale: false } }
   ```
   FR à la racine **sans préfixe** (`/`, `/methode`…), EN sous **`/en/...`**. Liens internes via `getRelativeLocaleUrl(lang, path)` (`astro:i18n`), jamais de chemin écrit à la main.
2. **Une seule page par écran** — le contenu d'un écran vit dans **un seul composant** (ex. `src/screens/Methode.astro`) qui reçoit `lang`. Les routes FR et EN ne font que l'appeler (route dynamique `[...lang]` avec `getStaticPaths` → `lang = undefined | 'en'`, ou deux fichiers d'une ligne). **Interdit** : dupliquer une page en `methode-en.astro`.
3. **Textes** — tous les textes dans `apps/web/src/i18n/messages/fr.json` et `messages/en.json` (mêmes clés). Migrer le contenu de `fr.ts` / `report-fr.ts` / `brief-fr.ts` vers ces fichiers ; `index.ts` expose `t(lang, 'cle')`. **Aucune chaîne en dur** dans `.astro`, `.svelte` ou les fonctions (y compris `aria-label`, `alt`, `title`, messages d'erreur, toasts). Une clé manquante en EN retombe sur le FR **et** fait échouer un test.
4. **Formats** — nombres, dates, durées via `format.ts` avec `Intl` et la locale (`fr-FR` / `en-GB`) : « 1 234 » / « 1,234 », « 3,5 s » / « 3.5 s ».
5. **Bouton FR/EN** — dans la nav partagée (AppHeader) : lien vers la **même page** dans l'autre langue (`getRelativeLocaleUrl`), avec `hreflang` et `lang` sur le lien. Au clic : écrire le cookie `audixio_lang` (1 an, `SameSite=Lax`) + `localStorage`, et si connecté mettre à jour la préférence du compte.
6. **Préférence compte** — nouvelle migration Supabase (on ne réécrit pas les 7 existantes) : colonne `locale text not null default 'fr' check (locale in ('fr','en'))` sur le profil, RLS : l'utilisateur ne modifie que la sienne. À la connexion, la langue du compte s'applique si l'utilisateur n'a pas choisi autre chose sur cet appareil.
7. **Suggestion navigateur** — petit script côté client : si aucun cookie/localStorage, page FR et `navigator.languages` commence par `en` → bandeau discret proposant l'anglais (bouton « English » / « Rester en français », mémorise le choix). Pas de redirection serveur, pas de redirection JS automatique.

### SEO (obligatoire sur chaque page)

- `<html lang="fr">` ou `<html lang="en">` selon la page.
- Dans `<head>` : `<link rel="alternate" hreflang="fr" href="https://…/page">`, `hreflang="en"` → `/en/page`, `hreflang="x-default"` → version FR. URLs **absolues**, chaque page se cite elle-même (Audixio note `seo.hreflang` : on doit être exemplaire).
- `<link rel="canonical">` **par langue** (la page EN pointe vers elle-même, pas vers le FR).
- `<title>`, `meta description`, `og:title`, `og:description`, `og:locale` (`fr_FR` / `en_GB`) + `og:locale:alternate` **traduits** (clés dans les JSON).
- `sitemap.xml` avec **les deux langues** (`@astrojs/sitemap` option `i18n`, ou générateur maison) et les `xhtml:link` alternates.
- Pages privées / liens de partage : `noindex` conservé dans les deux langues.

### Rapports d'audit et e-mails

- **Interface du rapport** traduite (hub, cartes, Verrouillé, brief, export) via les mêmes JSON.
- **Constats** : le moteur ne stocke **que des clés** (`messageKey`, déjà prévu en PART-05) + paramètres ; le texte est résolu à l'affichage selon la langue (`findings.<check>.<etat>` dans `fr.json` / `en.json`). Jamais de phrase française stockée en base.
- **Brief IA / export MD** : générés dans la langue de la page (option de forcer l'autre langue plus tard, pas maintenant).
- **E-mails Brevo** (confirmation, mot de passe oublié, alertes, résumé) : un modèle **par langue**, envoyé selon `locale` du compte (défaut `fr`). Sujet + corps + liens vers la bonne version (`/en/...`).

### Maquettes

- Les maquettes (`docs/design/maquettes/finales/`) restent **en français uniquement**. Le lien **EN** de leur nav = la **même page sous `/en/`** dans le vrai site ; on ne crée pas de maquette anglaise.

### Checklist Cursor (critères de fin)

- [ ] `astro.config.mjs` : i18n `fr` (défaut, sans préfixe) + `en` (`/en/`).
- [ ] Chaque écran = **un** composant ; routes FR et EN le réutilisent ; aucune page dupliquée.
- [ ] `messages/fr.json` et `messages/en.json` ont **exactement les mêmes clés** (test vitest qui échoue sinon) ; `copy-lint` / test signale toute chaîne en dur dans `.astro` / `.svelte`.
- [ ] Bouton FR/EN : même page, choix mémorisé (cookie + localStorage + compte), testé connecté et déconnecté.
- [ ] Première visite navigateur EN : bandeau proposé, **aucune redirection**.
- [ ] Chaque page : `html lang`, canonical par langue, hreflang `fr` / `en` / `x-default` absolus et réciproques, title/description/OG traduits.
- [ ] `sitemap.xml` contient les URLs FR et EN avec alternates.
- [ ] Rapport : UI traduite, constats résolus par clé selon la langue, aucun texte FR stocké en base.
- [ ] E-mails Brevo envoyés dans la langue du compte (test des deux).
- [ ] Migration `locale` + RLS ajoutée (nouvelle migration, tests RLS verts).
- [ ] `pnpm check` vert ; auto-audit Audixio du site : `seo.hreflang` et `seo.canonical` **réussis** en FR et en EN.

---

## 13. Ce que ce document n’est pas

- Pas une étude de marché chiffrée.  
- Pas une licence ni des CGU (voir `docs/legal/` pour le registre ; relecture owner).  
- Pas le plan d’étapes techniques (voir `docs/etapes/` une fois ce pack fusionné).

Date produit initiale : **26 octobre 2026**. Alignement soft-gate partiel : **28 octobre 2026**. Lock-components + matrice + hub TOP 10 : **28 octobre 2026 (soir)**.

---

## 14. Ré-audit automatique et alertes (ajout 30 oct 2026)

> Section ajoutée en fin de document. Décrit le comportement visé ; les points marqués **Question ouverte** ne sont pas tranchés (voir `00-DECISIONS.md` avant d'implémenter).

### En clair (ce que voit l'utilisateur)

- Un **site suivi** (compte + propriété vérifiée) est **ré-audité automatiquement**, sans action de l'utilisateur. Le résultat alimente l'historique et la page de progression.
- Si quelque chose se dégrade, l'utilisateur reçoit **un e-mail d'alerte** court, avec un lien vers le rapport concerné.
- Chaque **lundi à 8 h (heure de Paris)**, un **résumé hebdomadaire** récapitule tous ses sites suivis (note, évolution, problèmes ouverts).
- Tout se règle depuis une petite UI de réglages par site : on/off, résumé hebdo on/off ; en **Pro**, seuil de baisse et délai certificat réglables (gratuit : valeurs par défaut fixes). Désinscription en un clic dans chaque e-mail.

### Fréquence des ré-audits

| Offre | Fréquence proposée | Statut |
| --- | --- | --- |
| Gratuit avec compte + site vérifié | **mensuelle** (fixe) | *(Décidé 30 oct 2026.)* |
| Pro | **hebdomadaire** par défaut, au choix **quotidienne / hebdomadaire / mensuelle** | *(Décidé 30 oct 2026.)* |

- Le code connaît déjà deux cadences : `cadence: 'weekly' | 'monthly'` (`packages/orchestrator/src/schedule.ts`, `nextRunAt`). Aucune cadence quotidienne n'existe aujourd'hui.
- Cadence : imposée (mensuelle) en gratuit ; choisie par l'utilisateur en Pro. *(Décidé 30 oct 2026.)* **À implémenter** : ajouter `'daily'` à `cadence` (aujourd'hui seulement `'weekly' | 'monthly'`).
- Les ré-audits restent **passifs** (même périmètre que l'audit manuel, voir §8) ; aucun ré-audit sur un site dont la propriété n'est plus prouvée (re-vérification échouée = suivi suspendu + e-mail d'information).

### Déclencheurs d'alerte e-mail

Alertes **uniquement** pour les sites à **propriété prouvée** (cf. §6).

| Déclencheur | Clé dans le code (`ALERT_KINDS`, `orchestrator/src/mail.ts`) | Règle visée |
| --- | --- | --- |
| La **note baisse** | `score_drop` | **Gratuit** : seuil fixe par défaut (envoi si la note globale **change de lettre vers le bas**, ex. B → C). **Pro** : seuil **réglable par l'utilisateur** (ex. dès −5 pts, même sans changement de lettre). *(Décidé 30 oct 2026.)* |
| **Nouveau problème critique** | `grave_problem` | Envoi si un constat de sévérité *critique* apparaît alors qu'il n'était pas présent au rapport précédent. Un critique déjà connu ne ré-alerte pas. |
| Site **injoignable** / **revenu** | `site_down` / `site_recovered` | Basé sur les sondes de disponibilité du tick (toutes les 15 min). |
| **Certificat** bientôt expiré | `cert_expiring` | Certificat **HTTPS (TLS)** du site. **Gratuit** : délai d'avertissement fixe par défaut (**14 j** avant expiration). **Pro** : délai **réglable par l'utilisateur**. *(Décidé 30 oct 2026.)* |

- **Anti-spam** : une alerte d'un même type et d'un même site n'est envoyée qu'une fois tant que la situation ne change pas (le code cherche une alerte existante via `findAlert` avant `insertAlert`, puis `markAlertSent`).
- Les alertes `site_down` / `site_recovered` / `cert_expiring` sont **ouvertes à tous** les sites vérifiés (gratuit : valeurs par défaut fixes, certificat 14 j ; Pro : réglables). *(Décidé 30 oct 2026.)*

### Résumé hebdomadaire (digest)

- Envoyé **tous les lundis à 8 h heure de Paris, même sans changement**, à chaque utilisateur ayant au moins un site suivi et le résumé activé.
- Contenu : par site, note actuelle + évolution sur 7 jours, nombre de problèmes critiques ouverts, disponibilité de la semaine, lien vers le rapport et vers le plan d'action.
- Un seul envoi par utilisateur et par semaine (clé d'idempotence `digestRateKey(userId, week)`).
- **Semaine calme** *(décidé 30 oct 2026)* : le résumé est **toujours envoyé**. S'il n'y a aucun changement, c'est un e-mail court « Rien n'a changé cette semaine » avec un rappel simple des résultats (note actuelle de chaque site, nombre de problèmes ouverts, lien vers le rapport).

### Ce qui existe déjà dans le code (lecture seule, 30 oct 2026)

- `netlify/functions/schedule-tick.ts` : fonction planifiée **toutes les 15 min** (`*/15 * * * *`), budget ~25 s (`TICK_BUDGET_MS`, limite 30 s des fonctions planifiées). Appelle `handleSchedule` (`@audigy/orchestrator`) : audits arrivés à échéance, sondes de disponibilité, création et envoi des alertes en attente, repli des sondes brutes en `uptime_daily` après 30 jours.
- `netlify/functions/digest-weekly.ts` : planifiée `0 6,7 * * 1` (6 h et 7 h UTC le lundi pour couvrir heure d'été / d'hiver) ; `handleDigest` n'agit que si c'est bien **lundi 8 h à Paris** (`isMondayEightParis`) et ignore l'autre déclenchement.
- Rendu des e-mails : `renderAlert` / `renderDigest` (`orchestrator/src/mail.ts`). Envoi via Brevo, un modèle par langue (§12bis).

### À construire / aligner

- UI de réglages par site (on/off alertes ; en Pro : seuil de baisse de note et délai d'avertissement du certificat ; résumé hebdo) — maquette à prévoir.
- Lien de désinscription signé dans chaque e-mail (alertes et résumé), sans connexion requise.
- Cadence quotidienne (`'daily'`) et choix de cadence en Pro (décidé 30 oct 2026, cf. `00-DECISIONS.md`).
- **Plan d'action** *(Décidé 30 oct 2026.)* : statuts des tâches (à faire / en cours / fait) **enregistrés côté serveur** par compte et par site, **conservés d'un ré-audit à l'autre** ; une tâche est **fermée automatiquement** si le problème n'est plus détecté au ré-audit suivant.
- Maquettes liées : `page_site_suivi` (suivi), `page_progression` (évolution), `page_plan_action` (tâches issues du brief).

## 15. Robot Audixio et opt-out (ajout 30 oct 2026)

> Maquette : `design/maquettes/finales/page_robot_audixio/page_robot_audixio.html` (liée depuis le pied de page, les pages légales et les mentions légales).

### En clair
- Page publique **`/robot`** qui explique ce que fait le robot, comment le reconnaître et comment l’exclure.
- **User-Agent** déclaré, stable : `Mozilla/5.0 (compatible; AudixioBot/1.0; +https://audixio.fr/robot)` ; jeton robots.txt : `AudixioBot`.
- **robots.txt respecté** : lu avant toute visite (cache 24 h max) ; `Disallow` et `Crawl-delay` visant `AudixioBot` ou `*` appliqués ; un `Disallow: /` = aucune analyse.
- **Budget passif** (`dev/PLAN.md` l. 174 / 278) : **50 requêtes max** par analyse et par site, **1 requête/s par hôte**, jamais en parallèle sur un même hôte ; arrêt sur 429/503 (Retry-After respecté). Lecture seule : aucun formulaire, aucune connexion, aucun test d’intrusion.
- **Formulaire d’opt-out** : domaine + e-mail (+ motif facultatif). Exclusion effective après preuve de propriété (lien e-mail sur une adresse du domaine, ou fichier/DNS comme `page_verifier_propriete`). S’applique à toutes les analyses futures, y compris par des tiers ; l’analyse affiche alors « Site exclu à la demande du propriétaire ».
- **Abus** : `Audixio@outlook.fr` (heure, IP, URL) ; réponse indicative 48 h.

### Instructions Cursor
- Table `bot_optout(domain, email, verified_at, reason, created_at)` + vérification avant chaque fetch (moteur).
- Rate-limit du formulaire (par IP et par domaine) ; pas de stockage du motif au-delà de 12 mois.
- Critères de fin : UA présent sur 100 % des requêtes ; test unitaire robots.txt (Disallow, Crawl-delay, `*` vs `AudixioBot`) ; test budget (51e requête refusée, 1 req/s) ; domaine exclu → aucune requête sortante.

## 16. Cookies, stockage local et durées de conservation (ajout 30 oct 2026)

> Maquettes : bandeau `design/maquettes/finales/interface_bandeau_cookies/interface_bandeau_cookies.html` ; liste dans `page_politique_confidentialite` (chapitre 6 « Cookies & stockage »).

| Élément | Type | Finalité | Consentement | Durée |
|---|---|---|---|---|
| Cookie de session Supabase | cookie HttpOnly, Secure, SameSite=Lax | authentification | exempté (strictement nécessaire) | 7 jours max (refresh) |
| Thème (`audixio_theme`) | localStorage | préférence clair/sombre | confort (refusable) | 13 mois max |
| Langue `audixio_lang` | cookie 1st-party | langue d’interface (§12bis) | confort (refusable) | 13 mois max |
| Choix du bandeau (`audixio_consent`) | localStorage | mémoriser le choix | exempté | **6 mois**, puis re-demande |
| Brouillons du brief IA | localStorage | confort | local seulement, jamais transmis | jusqu’à effacement |

- **CNIL** : « Tout accepter » et « Tout refuser » au **même niveau**, même style, même taille, au premier niveau ; « Personnaliser » ouvre le détail ; aucun cookie de confort avant le choix ; lien « Cookies » dans le pied de page pour revenir sur le choix à tout moment. Aucun traceur tiers ni mesure d’audience.
- Si l’utilisateur refuse : thème = `prefers-color-scheme`, langue = `Accept-Language` / URL, rien n’est mémorisé.
- **Rétention données** (rappel, cf. politique ch. 5) : résultats d’audit = durée du compte ; preuves/archives = 12 mois max ; journaux techniques (IP tronquées) = 12 mois max ; demandes d’opt-out = durée de l’exclusion ; suppression de compte = immédiate.

## 16 bis. Écran de bienvenue (ajout 30 oct 2026)

page_bienvenue (`/bienvenue`) s'affiche **une seule fois**, à la première connexion d'un compte créé via **OAuth (Google / GitHub)**. Une inscription **par e-mail** arrive à la place sur `page_email_confirme` (après clic sur le lien de confirmation), pas sur la page Bienvenue. Le bouton « Plus tard » mène à `page_sites_suivis_vide` et l'accueil ne s'affiche **plus jamais** (drapeau `onboarding_vu` posé au premier affichage) ; la checklist reste accessible depuis le compte. CTA principal « Lancer mon premier audit » → formulaire d'audit de l'accueil (`page_accueil#audit-form`).

## 17. Points ouverts pour Cursor (30 oct 2026)

- **Paiement / Stripe, facturation et CGV de vente : reportés.** Les CGU existent (`page_conditions_utilisation`) ; aucune CGV ni intégration Stripe avant décision owner (voir `agents/07-paiements.md`). L’offre Pro reste en « Me prévenir ».
- **Brief IA — données envoyées et fournisseur IA : à trancher.** Quelles données du rapport partent dans le prompt (constats seulement ? URL ? contenu de pages ?), quel fournisseur/modèle, où il est hébergé (UE ?), durée de conservation chez lui, mention dans la politique de confidentialité (sous-traitant). Tant que non tranché : le brief est construit **dans le navigateur** et copié par l’utilisateur, aucun appel serveur à un modèle.
