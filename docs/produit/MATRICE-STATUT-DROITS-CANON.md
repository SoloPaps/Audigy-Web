# Matrice statut → droits (CANON) — Audixio

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Un seul jeu de rapport **adaptatif** (hub, domaine, détail) avec **un** bandeau de statut discret ; verrous côté serveur. Les pages de domaine restreint **gardent** les pastilles HTTPS / HSTS / X-Frame.
> - Stripe / Pro **gelés** : liste d'attente seulement. Popup Pro uniquement quand la limite est atteinte (gratuit : 2 sites, 1 lien actif).

**Statut :** figé owner **28 octobre 2026 (soir)**.  
**Rôle :** **source de vérité unique (SSOT)** pour ce que chaque statut peut voir / faire.  
Tout doc ou code qui parle d’accès, soft-gate, brief, export ou Verrouillé **doit** pointer ici.

SSOT décisions soir : ``docs/00-DECISIONS.md``. Aussi : `SOFT-GATE-PARTIEL-CANON.md`, `docs/produit/FONCTIONNEMENT.md`, `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/`.

---

## Architecture (obligatoire)

1. **Le serveur est source de vérité.** L’API (Edge / Functions / RLS) renvoie un objet **capabilities** (et payloads filtrés) selon le statut réel.
2. Le front **ne décide pas** des droits en dur : il rend **ouvert** vs composant **Verrouillé** / CTA d’après les capabilities serveur.
3. **Aucune donnée sensible** (findings Sécurité / Vie privée / DNS, lettres A–F de ces domaines, titres exacts révélateurs, brief COMPLET, Comment corriger branché) **n’est embarquée** dans le HTML/JS/bundle client pour un utilisateur qui n’a pas le droit. Pas de blur CSS / `display:none` sur une vraie donnée déjà présente.
4. **Un seul design** des écrans hub / domaine / brief = maquette **COMPLET** (compte + site vérifié). Si le statut n’a pas le droit → **composants UI Verrouillé** réutilisables, **pas** une seconde maquette Stitch « hub PARTIEL ».
5. Les mocks Stitch **mélangent** vérifié / non vérifié : **mock = démo**. Le produit suit la matrice. Cursor **doit designer** les états Verrouillé là où Stitch a montré ouvert à tort (ex. aperçu Sécurité nommant HSTS / X-Frame).

---

## Statuts (colonnes)

| Code | Libellé | Définition courte |
|------|---------|-------------------|
| `anon` | Anonyme | Pas de compte (session navigateur au mieux) |
| `acct_unverified` | Compte non vérifié | Compte (e-mail + mot de passe, ou Google / GitHub) ; **ce site** non vérifié |
| `acct_verified` | Compte vérifié | Compte + propriété de **ce site** prouvée |
| `pro` | Pro | Même droits rapport que `acct_verified` **+** extras Pro (après go-live) |
| `link_public` | Lien public 30 j | Lecteur d’un lien public ; bandeau limité |
| `link_team` | Lien équipe | Lecteur lecture seule ; droits selon **vérif du proprio** |

> **Pro** n’ajoute **pas** un « meilleur brief » : brief = même règle que vérifié. Pro = historique, surveillance, alertes, exports soignés, 10 sites ; prix cible **~9 €/mois** (après le cœur).

---

## Légende des cellules

- **OUI** — accessible / visible / actionnable  
- **NON** — absent ; UI = CTA ou rien (selon ligne)  
- **PARTIEL** — sous-ensemble documenté  
- **UI** : `ouvert` | `Verrouillé` (composant) | `CTA` (compte / Vérifier / Pro)

---

## Matrice capacités × statuts

| Capacité | Anonyme | Compte non vérifié | Compte vérifié | Pro | Lien public 30 j | Lien équipe |
|----------|---------|--------------------|----------------|-----|------------------|-------------|
| **Note globale** (A–F, calculée) | NON — cadenas neutre | NON — cadenas neutre | OUI — ouvert | OUI — ouvert | NON — cadenas + bandeau | Selon vérif proprio (OUI si proprio vérifié, sinon comme non vérif) |
| **Note partielle** | OUI — libellé `partielle · N domaines · site non vérifié` | OUI — même libellé | NON (remplacée par globale) | NON (globale) | OUI — partielle + bandeau | Si proprio non vérif : partielle ; si vérif : globale |
| **Détail Perf / SEO / Éco / Qualité** | OUI — ouvert | OUI — ouvert | OUI — ouvert | OUI | OUI — ouvert | OUI lecture seule |
| **A11y B1** (lettre A–F **gardée** + indicateurs ; mention « mesure automatique / partielle » ; **zéro** claim RGAA/EAA) | PARTIEL — ouvert B1 | PARTIEL — ouvert B1 | OUI — + conformité si dispo | OUI | PARTIEL — B1 | Selon vérif proprio |
| **Sécurité / Vie privée / DNS** | NON — **Verrouillé** (pas de lettre) | NON — **Verrouillé** | OUI — ouvert | OUI | NON — **Verrouillé** + bandeau | Selon vérif proprio |
| **Brief IA** | NON — CTA compte | PARTIEL — préfixe PARTIEL | COMPLET — préfixe COMPLET | COMPLET (idem vérifié) | NON — bandeau | Lecture seule (niveau = vérif proprio) |
| **Comment corriger branché site** | NON | NON | OUI | OUI | NON | Lecture seule si proprio vérifié |
| **Guides génériques** (Méthode / doc) | OUI | OUI | OUI | OUI | OUI | OUI |
| **Export base** (PDF/MD) | NON — CTA compte | OUI | OUI | OUI (+ soigné) | NON (masqué lecteur) | NON (masqué) sauf règle owner contraire |
| **Sélection Rien / Vérif / Fix** (sync domaine ↔ brief) | NON (pas de brief) | OUI — sync ; findings ouverts seulement | OUI — sync tous findings autorisés | OUI | NON | Lecture seule (pas d’édition) |
| **Tests actifs** | NON | NON | OUI si propriété **revérifiée juste avant** | OUI (idem) | NON | NON |
| **Plafond sites** | 0 suivi durable (1 dernier audit navigateur) | **2 sites** | **2 sites** | **10 sites** | n/a | n/a |
| **Plafond liens actifs** | 0 | **1** (public ou équipe) | **1** | Plus haut (Pro) | n/a | n/a |
| **Pro extras** (historique long, surveillance, alertes, rapports signés, Excel) | NON | NON | NON | OUI | NON | NON |

### Brief — détail

| Statut | Brief | UI |
|--------|-------|-----|
| Anonyme | Aucun | CTA créer un compte |
| Compte non vérifié | PARTIEL (domaines ouverts seulement) | Page brief + préfixe `Audixio Brief — PARTIEL (Site non vérifié)` |
| Compte vérifié / Pro | COMPLET | Préfixe `Audixio Brief — COMPLET (Site vérifié)` |
| Lien public | Aucun | Bandeau ; pas de générateur |
| Lien équipe | Lecture seule | Copier possible ; pas d’édition sélection |

Brief **n’est pas** réservé au Pro.

### Domaines sensibles — UI Verrouillé

Sans droit : badge **Verrouillé**, **pas** de lettre A–F, micro-texte **général** seulement.  
**Interdit** dans l’aperçu verrouillé : nommer HSTS, X-Frame-Options, CSP, cookies exacts, ou tout finding qui révèle le trou. Soften teaser.

---

## Hub rapport (structure produit)

**Un design** = hub COMPLET. Contenu :

1. Note (globale si vérifié ; sinon partielle + cadenas globale)  
2. **TOP 10 priorités** — **titre seul** ; clic → page domaine `#ancre`  
3. **8 cartes domaines** (ouvertes ou composant Verrouillé selon capabilities)  
4. CTA **Brief** hors page (navigation vers `page_brief_ia`)  

**Pas** 3 priorités détaillées (cartes MonScore longues) sur le hub.

Sans droits : mêmes emplacements ; cartes / slots sensibles = **Verrouillé** + teaser flou + CTA Vérifier (1–2 priorités ouvertes + teaser sensible).

---

## Sélection & Brief (sync)

- Sélection **Rien / Vérif / Fix** éditable sur **pages domaine** **et** sur **page Brief** ; **une seule source** synchronisée (store / API).  
- Page Brief = aussi réglages prompt (ton, stack, etc.) + assembler / aperçu / générer / copier le prompt global.  
- Domaine : « Copier le prompt » **par constat** encore OK (un fix).

---

## Instruction Cursor (explicite)

1. Implémenter les checks de statut **contre cette matrice** (capabilities serveur).  
2. Designer / coder des **variants Verrouillé** réutilisables pour chaque capacité gated.  
3. **Ne jamais** shipper le texte des findings sensibles dans les vues locked.  
4. Stitch = structure COMPLET ; remap palette / Inter / chrome ; letters A–F (pas /100 comme système UI principal) ; corriger gates faux (ex. export « besoin compte » alors que badge déjà vérifié).

---

## Fichiers liés

- Soft-gate : `SOFT-GATE-PARTIEL-CANON.md`  
- Produit : `docs/produit/FONCTIONNEMENT.md`  
- Pages : `02-PAGES.md`, `maquettes/INDEX.md`  
- Specs : `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/`
