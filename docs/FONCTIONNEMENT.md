# Fonctionnement d’Audigy

Document produit du **26 octobre 2026**. Source de vérité pour ce que le site fait, pour qui, et sous quelles limites.

Les phrases ci-dessous décrivent le **produit décidé**. Certaines parties sont **déjà dans le code** ; d’autres sont **à construire**. C’est indiqué clairement.

---

## 1. Qu’est-ce qu’Audigy ?

Audigy audite un site web et explique le résultat **en français clair**.

Deux publics, une même note :

1. **Particuliers** — une note, trois priorités, un langage simple.
2. **Développeurs, freelances, entreprises** — le détail par domaine, « Comment corriger », et un **brief IA** (Rien / Vérif / Fix).

L’accueil parle d’abord au particulier. Une ligne pointe vers le détail et le brief. Sur le rapport : le **verdict en haut**, la technique **repliée** en dessous.

Audigy ne « pirate » pas. Les tests sont **passifs par défaut**. Les tests actifs n’existent que si la propriété du site est vérifiée (et revérifiée juste avant).

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

> **Déjà dans le code :** moteur et rapport multi-domaines, page méthode, scores.  
> **À aligner en code :** une seule liste unifiée à 8 partout (maquettes / textes qui disent encore autre chose), libellés « passif par défaut », « horodaté », jargon hors couche 1, « votre assistant IA ».

---

## 3. Parcours utilisateur (vue d’ensemble)

1. Arriver sur l’accueil → comprendre en une phrase → coller une URL → lancer un audit.  
2. Voir la progression (file, DNS, pages, vie privée selon le cas).  
3. Lire le rapport : note + 3 priorités (couche 1). Ouvrir le détail et « Comment corriger » (couche 2) si le compte le permet.  
4. Avec un compte : suivre des sites (plafond), créer un lien de partage, exporter un rapport de base.  
5. Plus tard (Pro) : historique long, graphiques, alertes, exports soignés.

Réglages **langue** (FR/EN) et **thème** (clair/sombre) : OK **sans compte**.

Navigation unique (`AppHeader`) :

**Accueil · Méthode · Sites suivis · Documentation** | **FR/EN** · **Connexion**

---

## 4. Gratuit sans compte

| Capacité | Décision |
|---|---|
| Lancer un audit | Oui |
| Aperçu du résultat | Même vue que le **soft-gate public** : note, scores par domaine, priorités de configuration |
| Constats graves (ex. faille) | Afficher « problème grave, détail masqué » — pas le détail exploitable |
| Brief IA | Non |
| Créer un lien de partage | Non (compte obligatoire) |
| Historique | **Un seul dernier audit** (1 site), dans le navigateur — pas durable multi-appareils |
| Export PDF/MD | Non (réservé au compte, export de base) |
| Langue / thème | Oui |

Côté moteur : une **table public / masqué** décide ce qui apparaît en aperçu sans compte et sur un lien public.

> **Déjà dans le code (partiel) :** audit sans compte, rapport avec score et priorités, détail replié, soft-gate conçu.  
> **À construire / figer :** table public/masqué complète, message « problème grave », persistance « 1 dernier audit navigateur » alignée produit, absence claire de brief et de création de lien.

---

## 5. Gratuit avec compte

Connexion par **magic link e-mail** (pas de mot de passe).

| Capacité | Plafond / règle |
|---|---|
| Sites suivis | **2 sites** maximum |
| Liens de partage actifs | **1** (public **ou** équipe) |
| Historique | **Dernier rapport par site** (profondeur 1 — pas de longue liste d’anciens audits) |
| Détail complet + Comment corriger | Oui |
| Brief IA complet (Rien / Vérif / Fix) | Oui — **gratuit avec compte**, pas réservé au Pro |
| Création de liens | Oui (dans le plafond) |
| Export rapport de base (PDF / MD) | Oui, gratuit |

### Lien public

- Durée : **30 jours**  
- Soft-gate : config corrigible visible (HSTS, images lourdes, etc.) ; **chemins, versions, IP masqués**  
- `noindex`  
- Retrait en **1 clic**  
- Date d’audit visible  

### Lien équipe

- Détail + brief  
- Destinataire **sans compte**  
- Révocable  

Le compte = propriétaire seulement (historique, brief, réglages). Pas d’espace équipe / sièges pour l’instant.

> **Déjà dans le code (partiel) :** comptes / magic link / sites / rapports côté Supabase (architecture), brief dans l’interface, exports vagues UX.  
> **À construire / figer :** plafonds 2 sites / 1 lien, profondeur historique 1, liens public 30 j + équipe, retrait 1 clic, soft-gate exact, export gratuit basique clairement séparé du futur Pro.

---

## 6. Pro (futur)

**Après** go-live, LICENSE, et remplacement de Tracker Radar (contrainte NC). Pas au lancement gratuit.

Fonctions retenues :

- Historique long (**≥ 10 audits**)  
- Tableau multi-sites + tendances  
- Comparaison dans le temps + **graphiques** + export Excel / CSV  
- PDF / export client soigné (logo, comparaison, signature mise en avant) — vs export basique gratuit  
- Limites plus hautes (sites, liens, file prioritaire)  
- Alertes e-mail (sites à **propriété prouvée** seulement) + petite UI de réglages (seuils, hebdo, on/off)  
- Rapports signés (SHA-256, horodatage)  
- **Pas** d’espace équipe / sièges pour l’instant  

Le **brief IA** reste le même qu’avec le compte gratuit : Pro n’ajoute pas un « meilleur brief », il ajoute historique, surveillance, exports et alertes.

> **Statut :** documenté ici, **à construire après** le go-live. Ne pas implémenter en passant pendant la refonte UI du gratuit.

---

## 7. Soft-gate (rappel)

Deux situations partagent la même logique d’aperçu « public » :

1. Visiteur **sans compte** qui vient de lancer un audit.  
2. Lecteur d’un **lien public**.

Visible : note, scores domaines, priorités de **configuration** corrigibles.  
Masqué : détails de faille exploitables, chemins, versions logicielles, IP, et tout ce que la table public/masqué classe « masqué ».  
Message type : « problème grave, détail masqué ».

Le **lien équipe** n’est pas soft-gate : détail + brief pour le destinataire.

---

## 8. Navigateur d’audit

Le moteur a besoin, pour certains tests (vie privée, axe partiel, etc.), d’un navigateur qui charge les pages.

Décision de lancement :

- **Option C** : « vie privée : bientôt » — note sur **7 domaines** ; vie privée = **Non testé** sous le seuil 50 %.  
- **Plus tard, option A** : petite machine / VPS en Union européenne, payante.  
- **Pas B** (CLI) comme voie principale publique.  
- **GitHub Actions interdit** comme navigateur de service public.

> **Déjà dans le code :** runner Playwright / Chromium en local et labo ; sans navigateur, phrases « Non testé » et note absente pour vie privée.  
> **À figer au lancement :** option C côté produit public ; pas de dépendance à GitHub Actions pour le service.

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

- Pack gelé : `docs/design-pack-2026-10-26/` (règles, pages, light/dark, logos, backlog).  
- **Stitch est gelé** — ne pas le relancer.  
- Dossier `maquettes/` : le ZIP Stitch sera fourni par l’owner (référence visuelle seulement).  
- Corrections texte / promesse (8 domaines, passif par défaut, horodaté, jargon, assistant IA) = **dans le code**, pas dans Stitch.

### Cinq corrections maquettes validées (code)

1. Une seule liste **8 domaines** = Méthode ; Disponibilité / Réputation à part ; Search Console facultatif.  
2. « **Passif par défaut…** » — pas « 100 % passif ».  
3. « **horodaté** » — pas « Certifié RFC 3161 ».  
4. Jargon hors couche 1 ; retirer « Pro » de Soft-Gating.  
5. « **votre assistant IA** » — pas GPT-4o / Claude datés.

---

## 11. Avantages (formulation produit, sans chiffres inventés)

- Une note claire et **trois priorités** pour agir sans être expert.  
- Le détail technique et le brief IA pour qui développe ou fait corriger.  
- Partage contrôlé : lien public soft-gate ou lien équipe révocable.  
- Données chez le serveur Audigy, pas éparpillées sur le PC.  
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

- Plafonds gratuit (2 sites, 1 lien), historique profondeur 1, soft-gate + table public/masqué.  
- Liens public 30 j / équipe, retrait 1 clic.  
- Chrome UI unique (AppHeader, logos officiels, drawer = desktop, dark tokens).  
- Cinq corrections de copie / promesse.  
- Rapport deux couches strict (verdict haut / technique repliée).  
- Export gratuit basique vs Pro soigné (Pro plus tard).  
- Pro : historique long, graphes, Excel, alertes UI, rapports signés — après go-live.  
- Lancement public en option C ; LICENSE ; marque ; PART-27 owner only.

---

## 13. Ce que ce document n’est pas

- Pas une étude de marché chiffrée.  
- Pas une licence ni des CGU (voir `docs/legal/` pour le registre ; relecture owner).  
- Pas le plan d’étapes techniques (voir `docs/etapes-refonte/` une fois ce pack fusionné).

Date : **26 octobre 2026**.
