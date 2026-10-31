# Audixio — Rapport complet Soft-Gate Partiel

> **MAJ owner 28 oct 2026 soir (post-Claude)** : voir `docs/DECISIONS-OWNER-2026-10-28-soir.md`. Vie privée bêta/local = tests **partiels HTTP/HTML** (pas DDG Tracker Radar, pas navigateur d'audit requis) ; VPS navigateur = location mensuelle plus tard (owner). Pro cible **~9 €/mois**. Preuves immédiat = fichier + meta + lien HTML ; DNS = vague suivante. A11y = lettre A–F gardée + « mesure automatique / partielle ». Bêta publique = go **owner seul**. Soft-gate domaines sensibles inchangé.


**Date :** 28 octobre 2026  
**Projet :** Audixio (ex-Audigy)  
**Périmètre :** décisions produit actées ce jour + écarts vs avant + règles strictes + chantier docs/code  
**Statut :** aligné sur la spec officielle owner (matrice brief + B1) ; docs OrdiBibi encore à patcher

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Ce qu’est Audixio (rappel)](#2-ce-quest-audixio-rappel)
3. [Avant → Après (ce qui change)](#3-avant--après-ce-qui-change)
4. [Décisions actées (soft-gate partiel)](#4-décisions-actées-soft-gate-partiel)
5. [Deux notes : partielle + globale floutée](#5-deux-notes--partielle--globale-floutée)
6. [Cartographie domaines : ouvert / verrouillé / zone grise](#6-cartographie-domaines--ouvert--verrouillé--zone-grise)
7. [Priorités, brief, lien public, équipe](#7-priorités-brief-lien-public-équipe)
8. [Règles strictes anti-fuite (code, API, cache)](#8-règles-strictes-anti-fuite-code-api-cache)
9. [Ce qu’il faut cacher — inventaire](#9-ce-quil-faut-cacher--inventaire)
10. [Ce qu’il faut modifier (docs, UI, backend)](#10-ce-quil-faut-modifier-docs-ui-backend)
11. [Points de vigilance A–D + note partielle gonflée](#11-points-de-vigilance-ad--note-partielle-gonflée)
12. [Autres décisions 28 oct (hors soft-gate UI)](#12-autres-décisions-28-oct-hors-soft-gate-ui)
13. [Coûts et différenciation](#13-coûts-et-différenciation)
14. [Checklist avant bêta](#14-checklist-avant-bêta)
15. [Ordre de travail recommandé](#15-ordre-de-travail-recommandé)
16. [Relecture profondeur — trous, ambiguïtés, clarifications](#16-relecture-profondeur--trous-ambiguïtés-clarifications)

---

## 1. Résumé exécutif

Audixio reste un **audit 8 domaines**, français clair, passif par défaut, avec preuve de propriété pour les tests actifs et le détail sensible.

Le **soft-gate total** (presque tout derrière compte + vérif) est abandonné au profit d’un **soft-gate partiel** :

- **Ouvert sans vérif** : Performance, SEO, Écologie, Qualité — détail + corrections non secrètes.
- **Verrouillé jusqu’à preuve de propriété** : Sécurité, Vie privée, DNS / e-mail — **pas de lettre A–F**, badge « Verrouillé », **aucune donnée dans le HTML/JS/API**.
- **Accessibilité = Option B1** : lettre A–F + indicateurs ouverts ; claims conformité RGAA/EAA verrouillés.
- **Deux notes** : note **partielle** (4 domaines ouverts) visible + note **globale** floutée / non envoyée tant que non vérifié.
- **Priorités mixtes** : 1–2 ouvertes + encart sensible flou + CTA vérif.
- **Brief IA** : anonyme = aucun ; compte non vérifié = PARTIEL ; vérifié = COMPLET ; lien public = aucun ; lien équipe = lecture seule (même sans compte).
- **Lien public 30 j** : miroir de la vue user + **bandeau permanent** ; `noindex`.

Objectif : valeur immédiate sans dénigrement ni fuite douce.

---

## 2. Ce qu’est Audixio (rappel)

### Proposition de valeur

| Public | Ce qu’ils voient (cible) |
| --- | --- |
| Particuliers | Note(s), priorités en langage simple, vision synthétique |
| Pros (freelance, agence, dév) | Détail domaine, Comment corriger, brief IA (Rien / Vérif / Fix) |

### 8 domaines (note) + hors note

| Domaine | Rôle |
| --- | --- |
| Performance | Vitesse / chargement |
| SEO | Référencement |
| Sécurité | Configs / vulnérabilités exposées |
| Écologie | Empreinte / écoconception |
| Accessibilité | Freins a11y (EAA) — indicateurs, pas certificat |
| Qualité technique | Robustesse / bonnes pratiques |
| Vie privée | Traceurs, cookies, angle CNIL |
| DNS / e-mail | SPF/DKIM/DMARC, usurpation |
| Disponibilité / Réputation | Hors note (rappels existants produit) |

### Cadre éthique inchangé

- Passif par défaut.
- Tests actifs = preuve de propriété (balise / fichier / DNS), **revérifiée** avant exécution.
- Marque Audixio + domaine `.fr` : owner confirme déjà OK (INPI / dispo).

---

## 3. Avant → Après (ce qui change)

| Sujet | Avant (soft-gate « total » / docs récents) | Après (28 oct — partiel) |
| --- | --- | --- |
| Accès détail | Souvent : note + scores domaines + priorités config seulement tant que non vérifié ; pas de détail exploitable / Comment corriger / brief | Détail **ouvert** sur Perf, SEO, Éco, Qualité **sans** vérif |
| Sécurité / Vie privée / DNS | Verrouillés avec le reste (ou flou) | **Toujours** verrouillés ; **plus de lettre A–F** → badge Verrouillé |
| Note globale | Une note (risque de fuite ou de confusion) | **Deux notes** : partielle visible + globale floutée (non calculée côté client / non envoyée) |
| Priorités | Flou générique ou tout derrière vérif | **Mixte** : 1–2 non sensibles + 1 slot sensible CTA |
| Accessibilité | Non tranché / souvent traité comme les autres | **Option B1** : indicateurs OK ; claims conformité verrouillés |
| Brief | Compte + site vérifié = brief ; sinon pas de brief (docs) | **Anonyme = aucun** ; compte non vérifié = **PARTIEL** ; vérifié = **COMPLET** ; lien public = aucun ; équipe = lecture seule |
| Lien public | Miroir vue user | Idem + **bandeau obligatoire** + `noindex` |
| Compte sans vérif | Soft-gate seulement, plafond 2 sites + 1 lien + export base | **Même filtre partiel** s’applique (ouverts détaillés ; sensibles absents) |
| Docs OrdiBibi | Alignés soft-gate total / « pas de détail avant vérif » | **À réécrire** (FONCTIONNEMENT, AGENTS, Stitch, design rules…) |

### Ce qui ne change pas

- 8 domaines + méthode publique versionnée.
- Passif par défaut ; actifs après vérif (+ revérif).
- Lien équipe lecture seule après acceptation (détail + brief selon droits).
- Vie privée bêta/local : tests **partiels HTTP/HTML** (Set-Cookie, scripts évidents, CMP connus, liens cookies), libellés partiel/automatique ; **pas** DDG ; VPS navigateur = location mensuelle plus tard (owner).
- Pro = 10 sites (historique long, surveillance, etc.) ; brief n’est **pas** réservé au Pro.
- Guides Comment corriger **génériques** publics ; constat site nommé après vérif (guides sans lier un audit nommé).
- Com : agences / freelances PME e-com ; accueil ouvert particuliers.
- **Maximum en local** ; juriste + testeurs = owner ; bêta publique **quand owner décide** (esprit mini-bêta 5–10 possible mais pas de go Jojo).
- Chrome nav/footer gelés (V3.4, etc.).

---

## 4. Décisions actées (soft-gate partiel)

### 4.1 Principe

> Avant vérif propriété : domaines non sensibles **ouverts** (détail). Domaines sensibles **verrouillés**. Copy type : certaines infos sont masquées pour la sécurité du site → vérifier la propriété.

### 4.2 Tableau de vérité (vue)

| État | Partielle | Globale | Détail ouvert | Détail sensible | Brief | Comment corriger (site) |
| --- | --- | --- | --- | --- | --- | --- |
| **Anonyme** | Oui (ouverts) | Flou / absente serveur | Oui | Non (absent payload) | ❌ Aucun brief (CTA compte) | Guides génériques OK ; constat nommé non |
| **Compte + non vérifié** | Oui (ouverts) | Flou / absente serveur | Oui | Non | ⚠️ PARTIEL + préfixe | Guides génériques ; pas Comment corriger branché |
| **Compte + vérifié** | Secondaire ou fusionnée UI | Oui (8 domaines) | Oui | Oui | ✅ COMPLET | Constat + guide |
| Lien public non vérifié | Oui | Flou | Oui | Non | ❌ Aucun brief ; HTML + bandeau | Guides génériques seulement |
| Lien équipe accepté | Selon vérif proprio | Selon vérif proprio | Lecture seule selon vérif proprio | Selon vérif proprio | ✅ Brief lecture seule (même sans compte destinataire) | Selon droits |

*Lien équipe : inchangé dans l’esprit — détail + brief lecture seule après acceptation ; si le site n’est plus vérifié, appliquer § révocation.*

### 4.3 Copy CTA (intention)

- Blocs verrouillés : « Verrouillé — vérifiez la propriété pour afficher Sécurité / Vie privée / DNS ».
- Priorité sensible : « Une priorité critique est masquée — Vérifiez la propriété de ce site pour l’afficher ».
- Note globale floue : « La note complète inclut Sécurité, Vie privée et DNS ».
- Bandeau lien public : le propriétaire n’a pas vérifié le site ; analyses sensibles masquées.

*(Formulations exactes FR/EN à figer en COULEURS-PHRASES / copy pack.)*

---

## 5. Deux notes : partielle + globale floutée

### Décision

Afficher **deux notes** côte à côte (ou empilées mobile) :

1. **Note partielle** — calculée sur les domaines ouverts : Performance, SEO, Écologie, Qualité (+ **Accessibilité en B1** selon spec). Libellé obligatoire du type « Note partielle (N domaines · Site non vérifié) » avec **N = nombre réel** inclus dans le calcul.
2. **Note globale** — floutée / cadenas tant que non vérifié. **Le serveur ne calcule pas et n’envoie pas** la lettre globale dans ce cas (pas de CSS blur sur une vraie lettre cachée).

Après vérif : note globale réelle (règle de calcul CANON inchangée une fois figée) ; la partielle peut rester en secondaire ou disparaître selon UI.

### Pourquoi

Évite le mensonge d’un « A » sur 4 domaines alors que Sécurité serait F. L’utilisateur voit qu’il manque la moitié du verdict.

### Interdits

- Pas d’ombre de chiffre derrière le flou.
- Pas de couleur sémantique A–F sur le bloc global verrouillé (neutre uniquement).
- Pas de `data-*` / JSON avec la vraie globale.

---

## 6. Cartographie domaines : ouvert / verrouillé / zone grise

| Domaine | Soft-gate | Visible sans vérif | Caché sans vérif |
| --- | --- | --- | --- |
| Performance | Ouvert | Note A–F, détail, priorités issues, guides non secrets | — |
| SEO | Ouvert | Idem | — |
| Écologie | Ouvert | Idem | — |
| Qualité technique | Ouvert | Idem | — |
| Sécurité | Verrouillé | Badge Verrouillé + micro-texte **général** du type de contrôle | Lettre A–F, findings, preuves, Comment corriger site, brief Fix sécu |
| Vie privée | Verrouillé | Idem (tests moteur partiels HTTP/HTML possibles ; pas de faux détail public soft-gate) | Idem |
| DNS / e-mail | Verrouillé | Idem | Idem |
| Accessibilité | **Option B1** (figé) | **Lettre A–F** + indicateurs techniques (contraste, structure, alt…) | Labels / certificats / claims « conforme / non conforme » RGAA–EAA |

### Accessibilité (Option B1 — figé spec owner)

- **Lettre A–F + indicateurs** visibles sans vérif.
- **Zéro claim** RGAA / EAA / « conforme / non conforme » tant que non vérifié.
- La note **partielle** reste libellée sur les domaines ouverts non sensibles de base (Perf, SEO, Éco, Qualité). Si la formule CANON inclut aussi A11y (B1) dans le calcul partiel, le libellé UI doit dire le **nombre réel** de domaines (ex. « 5 domaines ») — **ne pas afficher « 4 » si A11y compte**. Spec owner actuelle : calcul sur ouverts *et* A11y en B1 ; aligner le libellé sur le décompte exact.

### Micro-texte pédagogique (blocs verrouillés)

Sous chaque bloc verrouillé : une phrase **générale** sur la nature du contrôle (ex. « Ce bloc couvre les en-têtes et configs de sécurité exposées publiquement ») — **sans** indiquer s’il y a un finding, ni sa gravité.

---

## 7. Priorités, brief, lien public, équipe

### 7.0 Constat vs Comment corriger (ne pas confondre)

Décision Claude/owner toujours valable **en parallèle** du soft-gate partiel :

| Élément | Sans vérif | Après vérif |
| --- | --- | --- |
| **Constat / détail** domaines ouverts | Oui | Oui |
| **Guides génériques** (Méthode / doc) | Oui (publics, sans lien audit nommé) | Oui |
| **Comment corriger branché au site** (constat nommé + guide) | **Non** — même sur Perf/SEO/Éco/Qualité | Oui |
| Constat + guide domaines sensibles | Non | Oui |

Donc « ouvert » ≠ « guide de correction personnalisé ». Ouvert = comprendre le constat non sensible ; le parcours Comment corriger *lié à ce site* reste un bénéfice de la vérif (et limite le risque « montrer la correction = montrer ce qui manque » sur un audit partageable).

### 7.1 Priorités (mixte)

- Afficher **1 à 2** priorités issues des domaines **ouverts**.
- Un **slot** pour le sensible : encart flouté / cadenas + CTA vérif (pas le titre exact du finding s’il révèle le trou).
- Si aucune priorité ouverte : ne pas inventer ; message + CTA uniquement.

### 7.2 Brief IA (matrice figée — spec owner 28 oct)

| Contexte | Brief |
| --- | --- |
| **Anonyme (sans compte)** | ❌ **Aucun** — CTA créer un compte (magic link) |
| **Compte + site non vérifié** | ⚠️ **PARTIEL** — préfixe `Audixio Brief — PARTIEL (Site non vérifié)` ; domaines ouverts seulement |
| **Compte + site vérifié** | ✅ **COMPLET** — préfixe `Audixio Brief — COMPLET (Site vérifié)` ; Pro = même brief + histo long / alertes / rapports signés |
| **Lien public 30 j** | ❌ **Aucun** (anti-scraping) ; rapport HTML partiel + bandeau seulement |
| **Lien équipe** | ✅ Brief **lecture seule** pour le destinataire (**même sans compte**) selon statut de vérif du proprio |

- Filtre **uniquement serveur** (Netlify functions / API + RLS).
- Même fonction de vue que le rapport : `view = unverified | verified`.
- Le brief est le levier de conversion compte + protection anti-scrape : **jamais** servi aux anonymes ni sur lien public.

### 7.3 Lien public 30 jours

- Miroir de la vue user (partielle).
- **Bandeau permanent** en tête.
- Meta **`noindex, nofollow`** (au minimum sur non vérifiés ; recommandé aussi sur partages vérifiés sauf page marketing volontairement indexable).
- Ne pas promettre « rapport complet » dans l’UI de partage.

### 7.4 Accès équipe / freelance

- Demande d’accès → acceptation owner → lecture seule.
- **Révocation** = coupure immédiate + vue ré-anonymisée (soft-gate partiel).
- Permissions owner / collaborator / freelance : **RLS Supabase** obligatoires.

---

## 8. Règles strictes anti-fuite (code, API, cache)

### Règle d’or

> **Zéro donnée sensible dans le client** si le site n’est pas dans un état de propriété valide pour cette session / ce token.

Le soft-gate n’est **pas** :

- `display: none` / blur CSS sur du contenu déjà dans le DOM ;
- un store Svelte/React qui contient le JSON complet ;
- un export PDF généré côté client à partir du payload complet.

Le soft-gate **est** :

- filtre à la **source** (API / Edge / Netlify function) ;
- **RLS** Postgres (pas de SELECT des colonnes/lignes sensibles sans droit) ;
- payloads **minimaux** selon `view` ;
- caches / CDN / historiques invalidés quand le statut de vérif change.

### Surfaces à auditer (checklist sécu)

| Surface | Exigence |
| --- | --- |
| HTML SSR / Astro | Aucun finding sensible, aucune lettre globale/sensible |
| JS bundle / hydration | Idem |
| Réponses `fetch` / tRPC / REST | Schéma différent verified vs unverified |
| Webhooks / logs | Pas de dump de findings sensibles dans logs publics |
| localStorage / sessionStorage / IndexedDB | Interdit pour sensibles |
| Export PDF/CSV/JSON | Même filtre que l’API |
| Brief endpoint | Préfixe + filtre ; jamais complet si non vérifié |
| Pages de lien public | `noindex` + même payload |
| Service worker / cache HTTP | Pas de cache d’anciennes réponses « verified » après révocation |
| Screenshots / OG images | Ne pas générer d’OG avec lettres sensibles |
| Erreurs API | Messages génériques (pas de leak dans `message`) |

### Révocation / expiration de vérif (point A)

- À **chaque** accès à une ressource sensible (ou à chaque chargement de rapport / brief / partage) : **revérifier** l’intégrité de la preuve (ou un TTL court + recheck).
- Si invalide : basculer immédiatement en vue partielle ; invalider caches ; ne plus servir l’ancien brief complet.
- Historique gratuit profondeur 1 : ne pas resservir un snapshot « complet » si le statut actuel est non vérifié (ou marquer le snapshot comme sensible et le refuser).

### Tests anti-fuite (à automatiser avant bêta)

1. Compte non vérifié → DevTools Network : aucune clé `security.findings`, `privacy.*`, lettres sensibles, globale.
2. View-source HTML : idem.
3. Après révocation : recharger lien public → payload partiel.
4. Tentative d’IDOR : autre `site_id` / token → 401/403, body vide de sensibles.
5. Export + brief : grep CI sur artefacts de build de démo.

---

## 9. Ce qu’il faut cacher — inventaire

### Toujours absents du client si non vérifié

- Lettres A–F des domaines Sécurité, Vie privée, DNS / e-mail.
- Note globale (lettre et score numérique s’il existe).
- Findings, preuves, extraits de headers « incriminants », listes de CVE / misconfigs détaillées.
- Comment corriger **lié au site** pour domaines sensibles.
- Brief sections Fix/Vérif portant sur le sensible.
- **Tout brief** pour session anonyme ou lien public (endpoint doit refuser).
- Claims « conforme / non conforme » RGAA / EAA / certificat a11y.
- Toute priorité dont le **libellé** révèle le trou sensible (ex. « HSTS absent »).

### Peuvent être visibles si non vérifié

- Note partielle (4 domaines) + libellé.
- Détail Perf / SEO / Éco / Qualité.
- Lettre A–F a11y + indicateurs techniques (Option B1) ; zéro claim.
- Badge Verrouillé + micro-texte général.
- Priorités non sensibles + encart CTA.
- Guides Comment corriger **génériques** (doc Méthode), sans lien « audit de exemple.com ».
- Scores / notes des 4 domaines ouverts.

### Cas vie privée (MAJ 28 oct soir : partiel HTTP/HTML)

> **Supersede :** plus Option C « Non testé » comme règle de lancement. Bêta/local = tout ce qu'on peut sans DDG et sans navigateur d'audit (HTTP/HTML partiel). Soft-gate domaine Vie privée Verrouillé pour non-éligibles = inchangé. VPS navigateur = location mensuelle plus tard (owner).

Tant que « Non testé » : ne pas inventer un détail ; le bloc peut indiquer Non testé **et** rester dans la logique verrouillée pour tout futur résultat sensible. Pas de faux findings.

---

## 10. Ce qu’il faut modifier (docs, UI, backend)

### 10.1 Documentation OrdiBibi (prioritaire)

Fichiers / thèmes typiquement à aligner (liste indicative selon pack local) :

| Zone | Modification |
| --- | --- |
| `FONCTIONNEMENT` | Soft-gate partiel + tableau ouvert/verrouillé + deux notes + brief partiel |
| `AGENTS` / règles Cursor | Ne plus dire « détail seulement après compte/vérif » pour les 4 ouverts |
| `00-core` / `design.mdc` / `02-PAGES` | États rapport : partielle, badges Verrouillé, bandeau public |
| Pack copy / COULEURS-PHRASES | CTA, bandeaux, libellés note partielle / globale |
| RESTES / Stitch prompts | Maquettes soft-gate total → partiel ; deux notes ; priorités mixtes |
| Méthode / guides | Guides génériques OK ; pas de claim conformité a11y public |
| Journal corrections | Entrée 28 oct soft-gate partiel |

### 10.2 UI / maquettes

- Hero note : **deux blocs** (partielle + globale verrouillée).
- Grille 8 domaines : 4 avec lettres ; 3 avec Verrouillé ; a11y selon B.
- Priorités mixtes.
- Bandeau lien public.
- Brief : badge PARTIEL / COMPLET.
- Micro-texte sous verrouillés.
- Export : même rendu filtré.

### 10.3 Backend / Supabase / Netlify

- Vue `unverified | verified` unique pour rapport, brief, export, lien public.
- RLS sur findings sensibles / briefs complets.
- Revérif propriété (TTL + check) avant lecture sensible et avant actifs.
- Révocation collab / freelance.
- `Cache-Control` / invalidation.
- `noindex` sur routes rapport public.
- Tests automatisés anti-fuite (§8).

### 10.4 Ce qu’on ne modifie pas tout de suite

- Location VPS navigateur mensuelle (~5–12 €/mois) — plus tard, owner seulement.
- Implémentation test Vie privée « partiel » — en réserve, pas à coder maintenant.
- Prix Pro cible **~9 €/mois** (figé owner 28 oct soir ; après le cœur).
- Rename GitHub / logos GH — chantier séparé (OrdiBibi only jusqu’à produit final).

---

## 11. Points de vigilance A–D + note partielle gonflée

| ID | Problème | Solution actée / recommandée |
| --- | --- | --- |
| A | Révocation / expiration vérif → anciens liens/cache servent encore le complet | Recheck propriété à chaque lecture sensible ; invalider cache/historique complet |
| B | Faux positif passif → user vérifie « pour voir si c’est faux » | Micro-texte pédagogique **général** sous Verrouillé |
| C | Freelance / équipe après mission | Révocation instantanée + RLS |
| D | SEO des rapports publics | `noindex, nofollow` forcé |
| E | Note partielle gonflée | **Deux notes** (partielle visible + globale absente serveur) |

---

## 12. Autres décisions 28 oct (hors soft-gate UI)

| Sujet | Décision |
| --- | --- |
| Guides Comment corriger | Génériques publics OK ; risque « montrer correction = montrer manque » → pas de lien audit nommé ; constat site après vérif |
| Com | Agences / freelances PME e-com ; accueil ouvert particuliers |
| Bêta | Max local puis bêta publique sur **go owner** (juriste/testeurs = owner) |
| Vie privée | Bêta = partiel HTTP/HTML (pas DDG) ; VPS navigateur location mensuelle plus tard ; pas GitHub Actions |
| Historique gratuit | Profondeur 1 = 1 audit / site |
| Pro | 10 sites + histo courbe + extras ; brief aussi hors Pro si vérifié |
| Marque / .fr | Déjà OK |
| Étude Claude | Niche OK, pas prêt coûts/lancement ; reco guides, soft-gate serveur, anti-abus, bêta, Pro ~9 € |

---

## 13. Coûts et différenciation

### Coûts ordre de grandeur (prod sérieuse)

| Poste | ~ |
| --- | ---: |
| Supabase Pro | 25 $/mois |
| Resend Pro | 20 $/mois |
| Netlify | 0–20 $/mois |
| Domaine .fr | ~0,65 €/mois |
| VPS navigateur (plus tard) | ~5 € HT/mois |
| **Total sans navigateur** | **~45–55 $/mois** |

Seuil : ~5–6 Pro à ~9 €/mois (hors TVA / frais paiement).

### Différenciation (rappel)

Français clair + 8 domaines FR (CNIL, EAA, éco) + passif + preuve + brief humain ; vs MonScore (plus étroit sécu) et vs outils 1-angle (PSI, Observatory, WAVE). Soft-gate partiel **améliore** la conversion sans abandonner l’éthique.

---

## 14. Checklist avant bêta

- [ ] Docs FONCTIONNEMENT / AGENTS / copy alignés soft-gate partiel + deux notes
- [ ] API + RLS : payload unverified sans aucune clé sensible
- [ ] UI : deux notes, badges, priorités mixtes, bandeau, brief PARTIEL
- [ ] Tests anti-fuite DevTools + IDOR + révocation
- [ ] `noindex` liens publics
- [ ] Révocation collab + recheck propriété
- [ ] Export filtré
- [ ] Anti-abus magic link / demandes d’accès
- [ ] Revue failles code + vérif légale (parcours)
- [ ] (Owner) tests locaux puis go bêta publique quand prêt ; recrutement testeurs = owner

---

## 15. Ordre de travail recommandé

1. **Figer ce document** comme référence owner (éventuellement patcher FONCTIONNEMENT ensuite).
2. **Backend vue + RLS + tests anti-fuite** (avant de peaufiner le blur UI).
3. **UI deux notes + domaines + priorités + bandeau**.
4. **Brief partiel** + préfixe.
5. **Révocation / recheck / noindex / export**.
6. **Aligner Stitch / prompts / RESTES**.
7. Ensuite seulement : navigateur Vie privée / prix Pro / commit GitHub.

---

## Annexes — formules figées (à coller docs)

### Préfixe brief

```text
Audixio Brief — PARTIEL (Site non vérifié)
```

```text
Audixio Brief — COMPLET (Site vérifié)
```

### Domaines ouverts (calcul note partielle)

`Performance`, `SEO`, `Écologie`, `Qualité technique` (+ `Accessibilité` lettre B1 — aligner libellé N domaines)

### Domaines verrouillés (pas de lettre, pas de payload)

`Sécurité`, `Vie privée`, `DNS / e-mail`

### Accessibilité (B1)

Lettre A–F + indicateurs : ouverts. Claims conformité RGAA/EAA : verrouillés.

---



---

## 16. Relecture profondeur — trous, ambiguïtés, clarifications

*Relecture Jojo du 28 oct 2026 (après-midi) : croisement rapport ↔ mémoire décisions ↔ synthèse owner.*

### 16.1 Ce qui est clair et cohérent

- Soft-gate **partiel** remplace soft-gate **total** pour l’UI/API.
- 3 domaines **verrouillés** sans lettre : Sécurité, Vie privée, DNS/mail.
- 4 domaines **ouverts** pour la note partielle + détail.
- Deux notes (partielle visible / globale absente serveur).
- Priorités mixtes, bandeau public, `noindex`, brief PARTIEL préfixé, filtre serveur + RLS, zéro fuite client.
- Vie privée partiel HTTP/HTML (pas DDG), Pro ~9 € / 10 sites, histo gratuit 1, guides génériques, max local puis bêta sur go owner.
- Vigilance A–E (révocation, micro-texte, collab RLS, noindex, double note).

### 16.2 Ambiguïtés restantes (à trancher — sinon mal compris / mal codé)

| # | Sujet | Pourquoi ça bloque | Proposition Jojo |
| --- | --- | --- | --- |
| 1 | **Lettre A–F Accessibilité** | ~~ouvert~~ | **FIGÉ B1** : lettre + indicateurs ; zéro claim |
| 2 | **Comment corriger branché** sur domaines ouverts | Tension « détail ouvert » vs « guide seulement si vérifié » | **Tranché dans §7.0** : constat oui, guide branché non |
| 3 | **Brief anonyme** | ~~ouvert~~ | **FIGÉ** : anonyme = aucun brief ; compte non vérifié = PARTIEL |
| 4 | **Brief lien public** | ~~ouvert~~ | **FIGÉ** : aucun brief sur lien public |
| 5 | **Export de base** contenu exact | Plafond export OK mais payload ? | Même filtre que vue unverified ; pas de sensibles ; mention note partielle |
| 6 | **Formule note partielle** | Moyenne simple ? pondérée CANON ? | Réutiliser la **même formule CANON** restreinte aux 4 domaines |
| 7 | **Après vérif** : garder la partielle ? | « peut rester » = flou UI | Garder en secondaire 1 version, puis une seule note globale |
| 8 | **Qui crée le lien 30 j** | Anonyme vs compte | Compte (plafond 1 lien) comme avant ; anonyme = partage désactivé ou lien très court rate-limité |
| 9 | **Plafonds** 2 sites / 1 lien | Toujours valides avec soft-gate partiel ? | **Oui** tant que non Pro |
| 10 | **DNS « public »** | SPF/DMARC sont queryables ailleurs | Verrouiller quand même le *pack Audixio* (finding + brief) ; OK éthique |

### 16.3 Trous absents du rapport v1 (ajoutés ou listés ici)

| Trou | Statut dans ce doc |
| --- | --- |
| Constat vs Comment corriger branché | Clarifié §7.0 |
| Lettre a11y | §6 clarification + ligne §16.2 #1 |
| Brief lien public | Défaut proposé : aucun |
| Export filtré | §16.2 #5 + checklist |
| Formule note partielle | §16.2 #6 |
| Anti-abus (détail) | Toujours ouvert : rate-limit magic link, captcha demandes d’accès, quota audits/IP — **à spécifier avant bêta** |
| États maquette ≠ défaut produit | Rappel : Stitch souvent « connecté/Pro » ; défaut = non connecté (Connexion, pas faux Compte) |
| Sovereign footer | Preview owner seulement — hors soft-gate |
| Langue FR/EN copy soft-gate | Formulations exactes encore à figer (pack copy) |
| Calcul globale après vérif si a11y « Non testé » éventuel | Hors scope immédiat ; Vie privée Non testé : globale sur domaines **testés** ou lettre avec trou — **règle CANON existante à respecter** |

### 16.4 Contradictions mémoire / docs à invalider explicitement

Ces formulations **ne sont plus valides** pour le soft-gate (garder le reste du doc) :

- « Compte sans site vérifié → pas de détail exploitable » → **faux** pour Perf/SEO/Éco/Qualité (+ indicateurs a11y).
- « Sans compte ou site non vérifié = pas de brief » → **remplacé** par : sans compte = toujours pas de brief ; compte non vérifié = PARTIEL ; vérifié = COMPLET.
- « Soft-gate = note + scores domaines + priorités config seulement » → **remplacé** par détail ouvert non sensible + badges verrouillés + deux notes.

### 16.5 Test de compréhension (si on répond oui à tout, on a compris)

1. Un anonyme voit-il le détail Performance ? → **Oui.**  
2. Voit-il la lettre Sécurité ? → **Non** (absent serveur).  
3. Voit-il la note globale réelle ? → **Non.**  
4. Voit-il une note partielle ? → **Oui**, labellisée.  
5. Peut-il ouvrir Comment corriger *pour ce site* sur du SEO ? → **Non** (générique Méthode oui).  
6. Après vérif, le brief change-t-il ? → **Oui**, PARTIEL → COMPLET.  
7. S’il retire la balise DNS, le lien public garde-t-il le complet ? → **Non** (recheck + invalidation).  
8. Le blur CSS suffit-il ? → **Non.**  
9. Accessibilité « non conforme EAA » sans vérif ? → **Non** (claim verrouillé).  
10. Vie privée en bêta/local ? → **Oui partiel** HTTP/HTML (libellés partiel/automatique), **sans** DDG ni navigateur d'audit ; domaine soft-gate Verrouillé si non éligible.

### 16.6 Verdict relecture

| Critère | Verdict |
| --- | --- |
| Couverture décisions soft-gate actées | **OK** |
| Anti-fuite / inventaire à cacher | **OK** |
| Avant → après | **OK** |
| Compréhension bout-en-bout | **OK** si on applique §7.0 + §16.5 |
| Trous bloquants restants | **Surtout** : libellé N domaines si A11y entre dans la partielle ; formule CANON exacte ; anti-abus magic link détaillé |
| Docs OrdiBibi | **Encore faux** tant que non patchés — le présent fichier est la référence |

---

*Fin du rapport — 28 octobre 2026 (rev. relecture profondeur). Référence soft-gate tant que FONCTIONNEMENT/AGENTS non patchés.*


---

## Addendum owner 28 oct 2026 (soir) — lock-components

Ce rapport décrivait le soft-gate PARTIEL. Décisions **complémentaires** figées le soir :

1. **SSOT droits** = `docs/design-pack-2026-10-26/MATRICE-STATUT-DROITS-CANON.md`.
2. **Un design** hub/domaine/brief = COMPLET ; gated → composants **Verrouillé** (pas Stitch hub PARTIEL séparé).
3. Hub produit = note + **TOP 10** titres + 8 cartes + Brief CTA hors page (pas 3 priorités détaillées hub).
4. Sélection Rien/Vérif/Fix sur **domaine et Brief**, source sync.
5. Serveur capabilities ; jamais findings sensibles dans HTML/JS locked.
6. Libellé partielle : `partielle · N domaines · site non vérifié`.
7. Soften aperçu locked (interdire HSTS/X-Frame naming).
8. Maquettes : `page_rapport_hub`, `page_domaine_ouvert`, `page_domaine_verrouille`, `page_brief_ia`, `page_detail_constat`.

En cas de tension avec une phrase antérieure de ce fichier (ex. « docs à réécrire soft-gate total », « 3 priorités », attente redesign Stitch PARTIEL), **l’addendum + matrice + SOFT-GATE-PARTIEL-CANON.md gagnent**.
