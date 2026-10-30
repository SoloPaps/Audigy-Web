# Audigy — System & UI Design Specification (fusion MonScoreSécurité × Arc Soft)

Fusion complète MonScoreSécurité × esthétique Arc Soft. Ce document est la source de vérité UI pour le clair (PR #66, `ef52ddbf`) et pour la lecture du rapport.

En cas de tension avec une formulation plus ancienne, cette spec prime : coquille Arc Soft, lecture du rapport façon MonScore, liseré de sévérité seulement sur les cartes priorité. Exception : le thème sombre gelé owner (2026-10-26) est le §2.4 et le [pack design](design-pack-2026-10-26/00-LISEZ-MOI.md). Il prime sur toute colonne ou phrase sombre plus ancienne de ce document. Le clair ne change pas.

Repères pour les documents qui citent l’ancienne numérotation : couleurs et scores = §2 (ex-§4) ; ton = §7 ; accessibilité = §6 et §8 ; checklist PR = §9.

## 1. Principes et direction artistique

### 1.1 Philosophie générale

L’interface d’Audigy associe le spectaculaire et la modernité de l’effet Arc Soft sur la coquille / le marketing (glassmorphism avec flou, fond vivant et fluide, typographie soignée) avec l’extrême clarté pédagogique de MonScoreSécurité sur le rapport d’audit (note synthétique A–F /100, 3 priorités claires, accompagnement pas-à-pas et génération de prompts IA).

**Effet wow à l’entrée (hero et marketing) :**

- Fond dégradé fluide Arc Soft, clair (PR #66) : `#FAF8F4` vers `#D7E7F2`, fixe. Le sombre n’utilise pas `#15181C` / `#1A2830` : il est gelé au §2.4.
- Blobs pastel animés en douceur (32 s) : pétrole `#9FCFCB`, pêche `#F3C7B4`, lilas `#E3D4F0`.
- Cartes en verre dépoli clair : `rgba(255, 255, 255, 0.64)`, flou de 20px, bordure fine à 30 %. Le verre sombre est au §2.4.

**Rapport ultra-lisible et structuré :**

- Hiérarchie stricte en 1 colonne scannable (largeur ~450–720px). Le wow ne brouille jamais la lecture.
- Règle d’or : 1re lecture = note globale → 3 priorités → guide « Comment corriger » → brief IA optionnel → détail multi-domaines.
- Le brief IA est le turbo pour power-user / prestataire, pas le seul chemin.

### 1.2 Interdictions strictes (anti-AI slop)

- Pas de violet AI-slop : aucun dégradé violet/indigo/rose générique (`#6366F1`, `#8B5CF6`).
- Pas d’emojis décoratifs : utiliser des icônes Lucide de 1,5px dans des carrés arrondis.
- Interdiction du DSFR / Marianne : pour éviter toute confusion avec un service public.
- Jamais de rouge/vert seuls : doubler chaque statut par une forme géométrique et un libellé textuel.
- Pas de gating forcé : audit gratuit sans inscription obligatoire jusqu’au premier rapport.

## 2. Design system et design tokens

### 2.1 Couleurs et thématiques

| Token | Mode clair | Mode sombre | Usage et contraste |
|---|---|---|---|
| `--paper` | `#FAF8F4` | `#15181C` | Fond de page principal (papier chaud / encre nuit) |
| `--surface` | `#FFFFFF` | `#1D2126` | Cartes, conteneurs et fenêtres modales |
| `--ink` | `#1B1F24` | `#ECE9E3` | Texte principal (contraste ≥ 16:1) |
| `--ink-2` | `#4A5260` | `#A9B0BA` | Textes secondaires et labels d’interface (≥ 7:1) |
| `--line` | `#E3DED5` | `#2E343B` | Bordures de séparation (1px) |
| `--accent` | `#0F5C5A` | `#5FC1BC` | Couleur de marque (vert pétrole profond) |
| `--focus` | `#C2410C` | `#C2410C` | Anneau d’accessibilité clavier (2px, offset 2px) |

La colonne **Mode sombre** est l’ancienne fusion. Elle ne s’applique plus. Le thème sombre gelé est le §2.4. La colonne **Mode clair** reste celle de la PR #66.

### 2.2 Niveaux de score et formes distinctives

| Niveau | Plage | Texte | Fond | Forme |
|---|---|---|---|---|
| Bon | 80–100 / note A–B | `#1F5FAD` | `#E6EEF8` | Cercle avec coche |
| À améliorer | 50–79 / note C–D | `#9A5800` | `#FBF0DE` | Triangle d’avertissement |
| Problème | 0–49 / note E–F | `#B3261E` | `#FBE7E5` | Carré d’alerte |
| Non testé | — | `#5F6672` | `#F1F1EF` | Cercle en pointillés |

### 2.3 Typographie (auto-hébergée woff2)

- Titres display / hero (H1) : Outfit (SIL OFL, 600/700).
- Interface et titres H2–H4 : Atkinson Hyperlegible Next (SIL OFL, Braille Institute).
- Données techniques, URL et code : JetBrains Mono (SIL OFL).

### 2.4 Thème sombre gelé (2026-10-26)

Le clair de cette spec (colonne « Mode clair » du §2.1, blobs, typo, hiérarchie du rapport) reste celui de la fusion mergée en PR #66 (`ef52ddbf`). On ne le réécrit pas.

Le sombre validé par le propriétaire le 26 octobre 2026 remplace la colonne « Mode sombre » du §2.1, le dégradé `#15181C` → `#1A2830`, le verre `rgba(29, 33, 38, 0.72)` et les scores sombres `#7FB0EE` / `#E8A64A` / `#F08A80`. On n’invente pas une autre palette. Stitch ne fournit pas ce sombre.

`apps/web/src/styles/tokens.css` porte encore ce sombre d’avant gel (`--paper: #15181c`, `--accent: #5fc1bc`). Le §2.4 prime. Aligner le CSS est le backlog P0.4 du pack, pas une retouche du clair.

| Rôle | Valeur |
|---|---|
| Fond page | `#0F1620` → `#1A2332` (dégradé nuit, glow radial pétrole léger au centre) |
| Surface / verre | `#161E2C` / `rgba(22,30,44,0.78)` ; bord `rgba(255,255,255,0.10)` ; flou 16–24px |
| Encre primaire | `#F0F2F5` |
| Encre secondaire | `#9AA3B2` |
| Primary / CTA | `#2A9B96` ; texte sur CTA `#062220` ; survol `#33B0AA` |
| Succès (badge) | `#3DA165` |
| Focus / glow | `#28908E` (le clair reste `#C2410C`) |
| Warn | texte `#E6B84D`, fond `#3A2F14` |
| Problème | texte `#F0A0A0`, fond `#3A1A1A` |
| Outline | `rgba(255,255,255,0.12)` |
| Header | verre sticky = surface |

Assets du pack :

- [`design-pack-2026-10-26/04-THEME-DARK.md`](design-pack-2026-10-26/04-THEME-DARK.md)
- [`design-pack-2026-10-26/refs/dark-theme-tokens.md`](design-pack-2026-10-26/refs/dark-theme-tokens.md)
- [`design-pack-2026-10-26/assets/dark-ref-accueil.png`](design-pack-2026-10-26/assets/dark-ref-accueil.png)
- [`design-pack-2026-10-26/assets/dark-ref-progression.png`](design-pack-2026-10-26/assets/dark-ref-progression.png)
- Logos : [`logo-icon.jpg`](design-pack-2026-10-26/assets/logo-icon.jpg), [`logo-lockup.jpg`](design-pack-2026-10-26/assets/logo-lockup.jpg) ([`05-LOGO.md`](design-pack-2026-10-26/05-LOGO.md))

Toggle anti-FOUC : script inline avant le premier paint, `localStorage` (ex. `audigy-theme`) et `prefers-color-scheme`, classe sur `<html>`. Le bouton de thème est dans `AppHeader`, pas un item de navigation.

Interdits : violet AI-slop, noir plat `#000` plein écran, emoji décoratifs. Texte primaire ≥ 4,5:1. Le statut n’est jamais porté par la couleur seule.

Navigation et logo : [`01-REGLES-STRICTES.md`](design-pack-2026-10-26/01-REGLES-STRICTES.md). Un seul `AppHeader`. Libellés : Accueil · Méthode · Sites suivis · Documentation | FR/EN · Connexion. Famille B, item Progression, Blog / Actu et Material `vital_signs` sont interdits.

## 3. Architecture des écrans et parcours

### 3.1 Écran 1 : Accueil (`/`) — l’entrée « wow et confiance »

- **Hero et titre.** Question engageante style MonScore (« Votre site web est-il réellement performant, sécurisé et éco-conçu ? ») posée sur le fond dégradé Arc Soft avec blobs pastel.
- **Formulaire URL.** Champ d’entrée avec bouton pétrole (`--accent`) « Lancer l’audit gratuit » (sans inscription).
- **Délai clair.** Mention « Réponse en ~1–2 min ».
- **3 micro-garanties.**
  - ⚡ Gratuit et sans compte au départ
  - 🔒 Audit 100 % passif (aucun risque pour votre serveur)
  - 📖 Basé sur la méthode publique et transparente
- **Ligne multi-domaines.** Aperçu des piliers (Sécurité, Vitesse, Accessibilité, Éco-conception, Vie privée, SEO).
- **Mockup rapport.** Aperçu réaliste du rapport (self-score Audigy).
- **Sélecteur de langue.** FR (défaut) / EN discret.

L’interface rend ces trois garanties par des icônes Lucide (§1.2), pas par des emoji.

### 3.2 Écran 2 : Progression (`/progression` ou overlay)

- Étapes humaines et rassurantes (« Vérification des en-têtes HTTP », « Analyse des métriques de vitesse mobile », « Vérification du respect de la vie privée »), pas de logs bruts.
- Temps estimé : fourchette en minutes + barre de progression fluide Arc Soft.

### 3.3 Écran 3 : Rapport d’audit (`/rapport`) — l’écran central

Hiérarchie stricte MonScore, de haut en bas.

**En-tête verdict**

- Note lettre globale (A–F) + label (« BON », « À AMÉLIORER », « CRITIQUE ») + score /100 + phrase explicative humaine.
- Boutons d’action : Relancer, PDF résumé, (Pro) PDF complet.
- Disclaimer honnête : « Audit passif basé sur des référentiels ouverts (MDN Observatory, Lighthouse, EcoIndex) — Ne remplace pas un audit d’intrusion PASSI. »

**Exactement 3 priorités (cartes MonScore)**

- Titre impératif (« Activer l’en-tête HSTS sur votre serveur »).
- Pourquoi (1 phrase métier accessible).
- Métadonnées : durée estimée (ex. 10 min) · difficulté (Facile) · intervenant (Hébergeur / Dev).
- Boutons : [Comment corriger] (ouvre la modale) | [Ajouter au brief] (pré-coche le constat).

**Bandeau discret « Corriger avec un assistant ».** Déplie la zone du brief IA.

**Zone brief IA (Audigy)**

- Coches interactives multi-constats.
- Sélecteur par ligne à 3 états : Rien | Vérif | Fix.
- Compteur en temps réel : « 4 constats · 2 Fix · 2 Vérif ».
- Barre / sticky non intrusive : [Générer le brief IA] → copier le prompt structuré ou l’ouvrir dans Cursor / ChatGPT / Claude (incluant les recommandations NIST / MDN / OSV).

**Détail multi-domaines (accordéons Audigy)**

- Score /100 + phrase par domaine.
- Domaines : Sécurité & Headers, Performance & Core Web Vitals, Éco-conception (EcoIndex/RGESN), Accessibilité (axe/RGAA), Vie privée & Trackers, Disponibilité (hors score global), Stack & Vulnérabilités (OSV/NVD), SEO & Google Search Console.
- Soft-gating Pro pour masquer les chemins de fichiers sensibles en mode partage public.

**Pied du rapport.** E-mail optionnel pour alertes, bouton Partager, Surveillance, Historique des évolutions.

### 3.4 Écran 4 : Modale « Comment corriger »

**Constats de configuration / DNS (DMARC, SPF, headers, HTTPS)**

- Étapes numérotées simples.
- Sélecteur d’hébergeur : Netlify | OVH | Cloudflare | Autre.
- Snippet de code / entrée DNS prête à copier-coller.
- Avertissement et bouton [Vérifier après modification] (relance l’analyse du test).

**Constats de code / stack**

- Explication synthétique + bouton d’action principal redirigeant vers [Générer le brief IA (Fix)].

### 3.5 Autres pages spécifiées

- `/methode` : barème public, « Ce que nous ne faisons jamais », grille d’auto-audit.
- `/sites` + historique : suivi multi-sites et courbes de progression 0–100 avec alternative tableau.
- `/score` (public) + `/partage` : score partagé avec bouton d’opt-out propriétaire (Gérer / Masquer / Retirer).
- `/verifier` : preuve et validation de propriété (balise méta ou fichier TXT pour tests actifs).
- `/ecoconception` : questionnaire complémentaire RGESN (les questions non renseignées n’impactent pas négativement le score).
- `/compte`, `/connexion` : espace compte optionnel (proposé après le premier rapport).

## 4. Composants et hiérarchie visuelle

- **Note lettre.** Badge 64×64px avec bordure fine, lettre A–F en graisse 700 Outfit, accompagné de la jauge 270° et du score /100.
- **Carte priorité (MonScore).** Fond `--surface`, rayon 12px, liseré supérieur discret selon la sévérité, tag de rôle (Hébergeur/Dev), boutons secondaires alignés.
- **Ligne de constat (Audigy).** Ligne compacte avec icône de statut (forme + couleur), titre du test, sélecteur radio à 3 boutons (Rien, Vérif, Fix).
- **Barre sticky du brief IA.** Bandeau flottant en bas de page (hauteur 56px, `--surface` avec flou 20px, ombre douce), sans masquer la liste des constats.

## 5. Matrice d’annotation : MonScore (clarté) vs Audigy (puissance)

| Élément d’interface | Origine et rôle | Justification UX |
|---|---|---|
| Coquille / fond / blobs / verre | Arc Soft (Audigy) | Apporte l’effet « wow », la modernité et une identité de marque haut de gamme. |
| Hero accueil (question + micro-garanties) | MonScoreSécurité | Répare l’engagement utilisateur, rassure immédiatement les non-techniciens. |
| Note lettre (A–F) + 3 priorités d’action | MonScoreSécurité | Garantit la scannabilité en 3 secondes sans noyer l’utilisateur sous 40 alertes. |
| Guides « Comment corriger » par hébergeur | MonScoreSécurité | Offre une voie de résolution manuelle sans nécessiter d’outils d’IA. |
| Sélecteur Rien / Vérif / Fix et brief IA | Audigy | Le cœur différenciant : permet aux prestataires et power-users d’obtenir un prompt de correction précis. |
| Largeur multi-domaines (éco, a11y, vie privée, stack) | Audigy | Assure un audit complet du site web au-delà de la seule cybersécurité. |

## 6. Conformité technique et rendu

- **Langue des maquettes.** Français, vouvoiement neutre (« vous »).
- **Accessibilité.** Contrastes conformes WCAG 2.2 AA (≥ 4,5:1), navigation 100 % au clavier avec anneau `--focus` (orange `#C2410C` en clair, glow `#28908E` en sombre, §2.4), support de `prefers-reduced-motion`.
- **Poids maximal.** HTML + CSS + JS initial < 700 Ko gzippés sur Astro + Svelte.

## 7. Ton et précisions conservées

La spec fusion ne redit pas ces points. Ils restent en vigueur tant qu’ils ne contredisent pas les §1 à §6.

**Ton (particuliers)**

- Vouvoiement, phrases courtes (≤ 20 mots), voix active. Le mot technique vient après l’explication : « Votre site met 6 s à s’afficher (LCP) ».
- Dire le constat, la conséquence, puis l’action. Pas de jargon seul, pas de culpabilisation. Les labels de verdict sont ceux du §3.3 (« BON », « À AMÉLIORER », « CRITIQUE »), sans points d’exclamation.
- Honnêteté : écrire « Nous n’avons pas pu tester… » plutôt que de cacher la limite. Pas de superlatifs ni de mots marketing (« boostez », « révolutionnaire », « en un clic magique »).
- Pas d’emoji dans l’interface. Nombres au format français (« 1 234 », « 3,5 s »), dates « 23 oct. 2026 ».

**Typographie, chargement**

- Auto-hébergées (woff2, `font-display: swap`), sous-ensemble latin. Aucun appel à Google Fonts.
- Échelle en rem (base 16px) : 12 · 14 · **16 (corps)** · 18 · 22 · 28. Interligne 1,5 pour le corps, 1,2 pour les titres. Longueur de ligne ≤ 70ch.
- Casse de phrase. Graisses autorisées : 400 / 600 / 700. Les scores chiffrés utilisent `font-variant-numeric: tabular-nums`.
- Le chiffre de la jauge n’est pas un palier de cette échelle : il vaut 20 % de la largeur de la jauge. « /100 » reste au moins à 12px. L’ensemble du chiffre tient dans le disque intérieur, y compris pour 0, 100 et « — ».

**Espacement, formes, verre**

- Échelle de 4px : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.
- Contenu max 1120px. Le rapport tient dans une colonne (~450–720px, §1.1). Une seule colonne sous 768px.
- Rayons : 4px (champs, badges), 8px (boutons), 12px (cartes priorité et modules), 16px (enveloppes flottantes : barre, hero, modales).
- Une seule ombre claire : `0 18px 48px rgb(27 31 36 / 0.10)`. Elle sert aussi d’ombre douce de la barre sticky. Le fond et les surfaces sombres suivent le §2.4.
- Verre clair : enveloppes du §1.1, bordure à 30 %, plaque opaque derrière le texte. Verre sombre : §2.4. Pas de shimmer.
- Le lilas `#E3D4F0` n’existe que comme blob. Pas de halo hors des trois blobs du §1.1.
- Icônes : Lucide auto-hébergées, trait 1,5px, `currentColor`, dans un carré arrondi, avec le libellé. Pas de requête tierce.
- Liseré supérieur : seulement sur les cartes priorité, selon la sévérité (§4).
- Mouvement : survol 200 ms, entrée 280 ms, jauge ≤ 400 ms, page ≤ 450 ms, blobs 32 s. Toujours coupé par `prefers-reduced-motion`.
- Thème : `prefers-color-scheme`, avec bascule manuelle mémorisée en localStorage et script anti-FOUC avant le premier paint. Clair : tokens de cette spec (PR #66). Sombre : §2.4 seulement (succès `#3DA165`, warn `#E6B84D`, problème `#F0A0A0`). Les anciennes valeurs `#7FB0EE` / `#E8A64A` / `#F08A80` ne sont plus la référence sombre.

**Jauge**

- Arc de 270°, trait 8px, piste `--line`, remplissage à la couleur du niveau. Libellé sous l’arc.
- `role="img"` et un nom du type « Performance : 72 sur 100, à améliorer ». Animation de 0 au score en ≤ 400 ms, absente si reduced-motion.

**Historique (`/sites`)**

- Courbes 0–100 (axe non tronqué), au plus 3 séries (plein, tirets, pointillés), alternative tableau et résumé texte. Pas de dégradé sous la courbe, pas de 3D, pas de camembert.

**Pied vérifiable**

- En plus des actions du §3.3 : URL, date et heure (Europe/Paris), version de la méthode, identifiant ou empreinte.

## 8. Accessibilité (complète le §6)

- RGAA 4.1 / WCAG 2.2 AA minimum. Contraste du texte ≥ 4,5:1 (≥ 3:1 pour les gros textes et les éléments graphiques), clair et sombre.
- Navigation complète au clavier, focus visible (2px `--focus` + offset 2px), lien d’évitement « Aller au contenu ».
- HTML sémantique d’abord (`<main>`, `<nav>`, titres hiérarchiques, `<table>` pour les données). ARIA seulement en complément.
- Formulaires : `<label>` visible, erreurs reliées par `aria-describedby`, pas de placeholder utilisé comme label.
- Résultat d’audit annoncé via `aria-live="polite"`. Zoom à 200 % et reflow à 320px sans scroll horizontal.
- `prefers-reduced-motion` partout. `lang="fr"`. Page de déclaration d’accessibilité.
- Pas de tracker tiers, pas de police distante. Accueil < 700 Ko gzippés (document, CSS, JS et polices du premier écran), conformément au §6.

## 9. Checklist avant de merger une UI

- [ ] Lecture du rapport : note globale, puis 3 priorités, puis « Comment corriger », puis brief IA optionnel, puis détail multi-domaines. Pas d’inscription obligatoire avant le premier rapport.
- [ ] Aucun violet de marque, aucun texte en dégradé, aucun emoji, aucune grille de 3 cartes identiques, aucun hero centré générique, aucun shimmer, ni DSFR ni Marianne. Verre, trois blobs pastel, ombre flottante et mouvement court : bornes des §1 et §7, coupés par `prefers-reduced-motion`.
- [ ] Liseré supérieur seulement sur les cartes priorité, selon la sévérité.
- [ ] Uniquement des tokens de ce document. Clair : colonne du §2.1. Sombre : §2.4 et PNG du pack, pas la colonne sombre historique. Question d’accueil, micro-garanties (icônes Lucide), note A–F et libellés du §3.3.
- [ ] Chrome : un seul `AppHeader`, nav canon et logos de `docs/design-pack-2026-10-26/` (`01-REGLES-STRICTES.md`). Pas de famille B, pas d’item Progression, pas de Blog / Actu, pas de Material `vital_signs`.
- [ ] Chaque statut a une forme et un libellé en plus de la couleur.
- [ ] Contrastes AA en clair et en sombre.
- [ ] Parcours clavier, focus visible, lecteur d’écran sur la jauge et la liste.
- [ ] Français simple, sans lorem, sans superlatif. Labels « BON » / « À AMÉLIORER » / « CRITIQUE » sans alarmisme ajouté.
- [ ] Graphiques : axe 0–100, alternative en tableau, résumé texte.
- [ ] Rendu à 320px, 768px, 1280px et zoom 200 %.
- [ ] Reduced-motion testé.
- [ ] Poids de la page et zéro requête tierce.
