# Décisions owner — Audixio

Fichier unique des décisions de l'owner. **La décision la plus récente gagne.**
Fusion de : `DECISIONS-OWNER-2026-10-28-soir.md` (28/10 soir), des décisions du 29/10/2026 et des questions déjà tranchées de `QUESTIONS.md`.
Originaux conservés tels quels dans [`archive/fusionnes-2026-10-29/`](archive/fusionnes-2026-10-29/). Questions encore ouvertes : [`produit/QUESTIONS.md`](produit/QUESTIONS.md).

---

## Décisions du 30 octobre 2026

- **Tarifs → page Pro** : l'item nav « Tarifs » (33 pages, desktop + menu mobile) et tous les CTA Pro / Passer Pro / Découvrir Pro mènent à `finales/page_pro/` (comparatif Gratuit vs Pro + CTA liste d'attente). La popup `interface_passer_pro` est réservée au moment où une limite est atteinte.
- **Partager** : sur mobile (pointeur tactile) avec `navigator.share` disponible, le bouton Partager du hub ouvre la feuille de partage native du téléphone ; sinon et sur desktop, la modale `interface_partager`. Dans la modale, un bouton « Partager via… » apparaît sur mobile si l'API existe.
- **Hero doux** : plus de gros halo bleu saturé derrière les heros ; dégradé quasi blanc teinté palette v2 (opacité ≤ 0,25) + deux petites lueurs d'angle (bleu-lavande en haut à gauche, pêche léger en bas à droite). Grille de points et panneau arrondi conservés. Voir DESIGN.md « Hero doux ».
- **Connexion** : la vue « mot de passe oublié » interne est supprimée (le lien mène à `page_reinitialisation_mot_de_passe`).

- **Connexion** : maquette `finales/interface_connexion/` (e-mail + mot de passe, Google, GitHub ; mot de passe oublié ; confirmation d’e-mail). Tous les boutons « Connexion » des maquettes y mènent.
- **Palette v2 partout** : les mentions « pétrole / pêche » restantes des docs actifs sont corrigées.
- **Paiement / Stripe, facturation, CGV de vente : reportés** (les CGU existent). → `produit/FONCTIONNEMENT.md` §17.
- **Brief IA (données envoyées, fournisseur IA)** : point ouvert pour Cursor. → §17.
- **Cookies / RGPD** : bandeau CNIL (Accepter / Refuser / Personnaliser au même niveau), liste des cookies dans la politique de confidentialité, durées. → §16.
- **Robot Audixio / opt-out** : page publique, User-Agent `AudixioBot/1.0`, robots.txt respecté, budget passif 50 requêtes / 1 req/s par hôte, formulaire d’exclusion, abus `Audixio@outlook.fr`. → §15.
- **Ré-audit auto, alertes, plan d'action** (détail : `produit/FONCTIONNEMENT.md` §14) : ré-audit mensuel en gratuit, hebdomadaire en Pro (Pro peut choisir quotidien / hebdo / mensuel) ; alertes site injoignable et certificat ouvertes à tous (gratuit : défauts fixes, certificat 14 j ; Pro : seuil de baisse de note et délai certificat réglables) ; résumé du lundi toujours envoyé (« rien n'a changé » + rappel des résultats) ; statuts du plan d'action enregistrés côté serveur par compte/site, conservés entre ré-audits, tâche fermée automatiquement si le problème est corrigé.
- **Nav : « Tarifs » remplace « Documentation »** : nav = **Accueil · Méthode · Sites suivis · Tarifs** | FR/EN · thème · Connexion/Compte (desktop + menu mobile, toutes les maquettes finales). « Tarifs » mène à la page Pro `finales/page_pro/` (mis à jour : voir ci-dessus). Méthode, guides et légales restent joignables via Méthode et le footer. → `design/maquettes/chrome/NAV-CANON-desktop-et-mobile.md`.
- **Langues = Cursor** : l'i18n FR/EN est faite par Cursor, étape dédiée `etapes/11-i18n-langues.md` (spec : `produit/FONCTIONNEMENT.md` §12bis). Maquettes FR uniquement.

---

## Décisions du 29 octobre 2026

### Notes
- Notes **A à F** (plus de /100 dans l'interface). Couleurs des nouvelles notes :
  - **E** : `#D9573A` (fond `#F9D3C8`, texte `#8F2A12`)
  - **F** : `#C53030` (fond `#F8D0D0`, texte `#8F1D1D`)

### Thème et couleurs
- Thème **clair par défaut** ; suit `prefers-color-scheme` ; le **choix manuel** de la personne gagne.
- Thème sombre complet : **plus tard**.
- **Palette v2** = palette actuelle : `design/design-elements/palette-foundations-v2.html` / `.png`.
  Boutons `#3D52A0` (survol `#1E2A55`), accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`.
- L'ancienne palette pétrole / pêche (teal) est **remplacée** (les docs qui la citent portent un bandeau).

### Technique
- Stack **conservée** : Astro + Svelte + Netlify Functions + Supabase. **Pas de Next.js.**
- **Langues FR/EN (i18n)** : FR référence à `/`, EN sous `/en/`, une page par écran, textes dans `messages/fr.json` / `en.json`, hreflang + sitemap bilingues. Spec et checklist : `produit/FONCTIONNEMENT.md` §12bis (30/10/2026 ; EN livré après le cœur).
- Modèles côté backend : **Grok 4.7** (principal), **Opus / Sonnet** (relecture critique), **DeepSeek V4.1 Flash** (tests et scripts).

### Comptes
- Connexion = **e-mail + mot de passe**, **Google**, **GitHub**. **Plus de magic link.**
- Révocation des accès : section **« Accès partagés »** dans Compte + raccourci dans Sites.

### Pro
- **Stripe / Pro gelés** : liste d'attente seulement.
- Popup Pro **uniquement** quand une limite est atteinte (gratuit : **2 sites**, **1 lien actif**). Pas d'écrans en plus.

### Vérification de propriété — 5 méthodes
1. **Google Search Console** (recommandée ; OAuth en lecture seule, rôle `siteOwner`)
2. **DNS TXT**
3. **Balise meta**
4. **Fichier HTML à la racine**
5. **Fichier `.well-known`**

Remplace : « GSC ≠ vérification » (27/10) et les vagues de preuves du 28/10 (§7 plus bas).

### Rapport
- **Un seul jeu de pages adaptatif** (hub, domaine, détail) avec **un** bandeau de statut, discret et élégant. Verrous **côté serveur**.
- Les pages de domaine restreint **gardent** les pastilles HTTPS / HSTS / X-Frame.
- Guide de correction = section **« plan d'action »** de la page détail (onglets CMS / code), construite à partir d'**une fiche par type de constat**. Les gains ne sont affichés **que s'ils sont sourcés**.

---

## Questions tranchées (venues de `QUESTIONS.md`)

| N° | Question | Réponse | Source |
|---|---|---|---|
| Q4 | Navigateur d'audit pour le public plus tard ? | Serveur navigateur en **location mensuelle** (VPS UE ~5–12 €/mois), après OK owner | 28/10 soir §6 |
| Q12 | Relecture juridique ? | Juriste = **owner** | 28/10 soir §9 |
| Q15 | Méthode de connexion ? | E-mail + mot de passe, Google, GitHub (le défaut « lien magique » est abandonné) | 29/10 |

---

## Décisions du 28 octobre 2026 soir (post-Claude)

**Statut :** figé le 28/10 au soir ; complété et en partie remplacé par les décisions du 29/10 ci-dessus.  
**Projet :** Audixio — `C:\Projets\Audigy-Web` (OrdiBibi, local).  
**Pas de commit GitHub** pour cette session.

Voir aussi : `docs/etapes/00-LISEZ-MOI.md`, `docs/archive/journal/journal-corrections-docs-2026-10-28.md`.



### 1. Marque

- **Audixio**. Noms techniques historiques (`@audigy/*`, `*.audigy.test`, dossier repo) restent ; UI = Audixio.

### 2. Périmètre Cursor / Jojo (cœur d'abord)

**Oui, maintenant :**
- Capabilities serveur + filtrage avant client (anti-fuite)
- Soft-gate + composants **Verrouillé**
- Hub rapport (note + TOP 10 titres + 8 cartes + Brief hors hub)
- ~~Magic link e-mail~~ → **remplacé le 29/10** : e-mail + mot de passe, Google, GitHub
- Sync sélection Rien / Vérif / Fix domaines ↔ Brief
- Preuves propriété **immédiates** (fichier + meta + lien HTML)
- Brief / export MD de base
- Anti-abus basique
- Tests vie privée **partiels** HTTP/HTML

**Après (pas bloquant le cœur) :**
- Pro (~9 €/mois, 10 sites)
- Chrome fancy / polish design avancé
- EN (i18n complet)
- Serveur navigateur d'audit (location VPS mensuelle)
- DNS verify
- OAuth hébergeur / Search Console-like

### 3. Soft-gate PARTIEL (inchangé)

- Anonyme / compte non vérifié / lien public : détail **ouvert** sur Perf, SEO, Éco, Qualité + A11y B1.
- **Domaines entiers Verrouillés** : Sécurité, Vie privée, DNS/mail (pas de lettre A–F, données absentes payload).
- Un design hub **COMPLET** + Verrouillé (pas de hub PARTIEL Stitch séparé).
- Note partielle = ouverts (+ A11y) ; note globale absente serveur si non vérifié.

### 4. « Comment réparer / corriger »

- Conseils **génériques** : ouverts sur constats des domaines non sensibles.
- Conseils **personnalisés au site** (Comment corriger branché) : **seulement** après preuve de propriété.

### 5. Accessibilité (vue publique)

- Lettre **A–F gardée** (owner a écarté « indicateurs sans lettre »).
- Mention obligatoire : **« mesure automatique / partielle »**.
- Zéro claim RGAA / EAA / « conforme ».

### 6. Vie privée (MAJ soir + précision)

**Bêta / local :**
- Afficher **tout** ce qu'on peut trouver **sans** Tracker Radar DuckDuckGo et **sans** navigateur d'audit.
- = tests partiels HTTP/HTML : Set-Cookie 1er chargement, scripts tiers évidents, CMP connus (OneTrust, Cookiebot, Didomi), liens politique cookies / confidentialité.
- Toujours libellés **« partiel / automatique »**.

**Ensuite seulement (owner) :**
- Si ça marche et que le site est peaufiné → mettre en place un **serveur navigateur** d'audit en **location mensuelle** (VPS UE typiquement ~5–12 €/mois).
- **Pas** un achat one-shot de navigateur.

**Interdit au lancement :** DuckDuckGo Tracker Radar tant que licence commerciale / liste alternative OK (owner).

**Soft-gate :** domaine Vie privée entier reste **Verrouillé** pour non-éligibles (inchangé).

#### 7. Preuves de propriété

> **Remplacé le 29/10/2026** par les 5 méthodes (voir plus haut). Tableau gardé pour l'historique.

| Vague | Méthodes |
|-------|----------|
| **Immédiat (MVP)** | (1) fichier TXT · (2) balise meta · (4) lien HTML |
| **Vague suivante** | (3) DNS TXT / CNAME |
| **Plus tard** | (6) OAuth hébergeur / Search Console-like si utile |

Trio marché cible = fichier + balise/lien + DNS (DNS **décalé**).

### 8. Pro

> **Précisé le 29/10/2026** : Stripe / Pro gelés, liste d'attente seulement.

- Prix cible **~9 €/mois**.
- 10 sites ; historique, alertes, exports soignés.
- **Après** le cœur — pas bloquant.
- Brief IA **pas** réservé au Pro.

### 9. Ops / lancement

- **Maximum en local.**
- Juriste = **owner**.
- Recrutement testeurs = **owner**.
- **Bêta publique seulement quand owner décide** (pas de go Jojo/Cursor).
- Esprit mini-bêta 5–10 possible, mais le chemin figé = local max → go owner → bêta publique.
- Au lancement public : Netlify Personal + Supabase Pro (pas forcément maintenant).

### 10. Hub UX (déjà figé)

- Note + TOP 10 titres priorités + 8 cartes domaines.
- Brief hors hub.
- Sélection Rien/Vérif/Fix sync domaines + Brief.
- Un design COMPLET + Verrouillé.

### 11. Onboarding / Bienvenue (30 oct 2026)

- page_bienvenue (`/bienvenue`) s'affiche **une seule fois**, à la première connexion d'un compte créé via **OAuth (Google / GitHub)**. Une inscription **par e-mail** arrive à la place sur `page_email_confirme` (après clic sur le lien de confirmation), pas sur la page Bienvenue. Le bouton « Plus tard » mène à `page_sites_suivis_vide` et l'accueil ne s'affiche **plus jamais** (drapeau `onboarding_vu` posé au premier affichage) ; la checklist reste accessible depuis le compte. CTA principal « Lancer mon premier audit » → formulaire d'audit de l'accueil (`page_accueil#audit-form`).
