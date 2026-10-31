# Couleurs + phrases Cursor (gelé 2026-10-28, enrichi review)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :

Complète `workflow-Cursor-shell-pages-motion.md`, `05-LOGO.md`, `06-BACKLOG.md`.
Owner : palette calée sur le logo ; Stitch = structure ; nits copy dans l'agent page.

## A. Couleurs — qui fait quoi

### 1. Agent shell (une fois) — pose les tokens

| Source | Fichier | Rôle |
|--------|---------|------|
| Logo Audixio | `05-LOGO.md` + PNG `logos/audixio-logos/out/` | Logo officiel ; couleurs d’interface = **palette v2** (l’ancien accent pétrole/pêche du logo n’est plus une référence UI) |
| Clair | `03-THEME-LIGHT-ARC-SOFT.md` + `docs/design/DESIGN.md` §2.1 | Fonds ivory→ice-blue, glass, blobs, primary |
| Sombre | `04-THEME-DARK.md` + `assets/dark-ref-*.png` | Fond `#0B1021`→`#1E2A55`, CTA `#7091E6`, etc. |

Fichier cible typique : `apps/web/src/styles/tokens.css`. **Aucun hex inventé dans les pages.**

Repères (ne pas recopier Stitch à la place) :

| Rôle | Clair (ordre de grandeur) | Sombre |
|------|---------------------------|--------|
| Primary / CTA | `#3D52A0` (DESIGN) | `#7091E6` (hover `#ADBBDA`) |
| Focus | `#C2410C` | `#7091E6` |
| Blob / bordure douce (ex-pêche) | `#ADBBDA` (décor seulement) | — |
| Trait accent logo | ~`#7091E6` | même famille, jamais pour score |
| Fond page | `#EDE8F5` → `#ADBBDA` | `#0B1021` → `#1E2A55` |
| Surface / glass | blanc / `rgba(255,255,255,0.64)` | `#161E2C` / glass sombre |

### 2. Agents page — structure Stitch, couleurs tokens

- Body = **pixel-perfect** sur structure, spacing, cartes, CTA (`code.html` + `screen.png`).
- HTML Stitch = **emplacements**, **pas** source absolue des couleurs (owner 2026-10-28).
- Remap obligatoire si Stitch diverge. Exemples vus dans les maquettes :
  - `#032320` / `#07332f` / emerald `#10b981` / `#34d399` → tokens palette v2 (`#3D52A0` clair ou `#7091E6` sombre)
  - Violets / indigo AI-slop → **interdit**
  - Fonds inventés → paper / surface tokens

### 3. Interdits couleurs

- Hex hors `DESIGN.md` / `03` / `04` / charte logo
- Violet AI-slop, texte en dégradé, noir plat `#000` plein écran
- Statut = **forme + libellé + couleur** (jamais couleur seule)
- Aucune teinte décorative (accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`) ne code un score / sévérité
- Ne pas « améliorer » les PNG logo (recolor, recadrage)

### 4. Police (évite la contradiction DESIGN vs shell)

- **Shell / UI chrome Cursor (gelé owner)** : **Inter** (`01-REGLES`, `CURSOR-IMPL`).
- Atkinson / Outfit dans `DESIGN.md` / `03-THEME` = spec Arc Soft historique : **ne pas** remplacer Inter du shell par Atkinson sans OK owner.
- Mono technique : JetBrains Mono OK. Polices **auto-hébergées**, zéro Google Fonts en prod.

## B. Phrases / copy — qui fait quoi

### 1. Même agent page (pas d'agent « textes seuls »)

- Nits copy **de cette page** + body + branche moteur.
- Marque UI partout : **Audixio** (plus « Santé… » / slogans sous le logo).
- Ton : vouvoiement, ≤ 20 mots / phrase, **constat → conséquence → action**.
- Header : **Connexion** si déconnecté ; **Compte** si session (jamais faux avatar connecté).

### 2. Cinq corrections produit (obligatoires — `FONCTIONNEMENT.md` §10 + `etapes-refonte/04-promesse-et-copie.md`)

1. Une seule liste **8 domaines** = Méthode ; Disponibilité / Réputation **hors** note ; Search Console facultatif (pas 9e domaine).
2. « **Passif par défaut…** » — pas « 100 % passif ».
3. « **horodaté** » — pas « Certifié RFC 3161 » / scellement / certificats immuables.
4. Jargon hors **couche 1** ; retirer « Pro » de Soft-Gating.
5. « **votre assistant IA** » — pas GPT-4o / Claude datés dans le bouton.

### 3. Tableau adoucir / retirer (vu en reviews)

| À retirer / adoucir | Remplacer par |
|---------------------|---------------|
| « 48 sondes », « sondes France » | Retrait ou formulation sobre |
| « scellement », RFC 3161, SHA « immuable », certificats immuables | **horodaté** |
| « cryptographique », « protocole officiel », « tous droits gestion » | Formulations grand public / succès réel (« détail sensible, Comment corriger, brief COMPLET, partage débloqués ») |
| Claims inventés cartes (instantané, alerte SSL, audits opposables) | Texte factuel (plafonds, horodatage, lien Méthode) |
| « tableau de bord », Dashboard, Ressources, Offre santé | **Sites suivis** / nav canon |
| CTA « Générer le prompt IA » + marques dans le bouton | **Copier le prompt…** + ligne *Colle-le dans votre assistant IA…* |
| 8 piliers inventés ≠ Méthode | **8 domaines** Méthode exacts |
| « historique complet » en gratuit | Dernier rapport / profondeur 1 |
| Jargon OAuth §9, carbone/WCAG inventés footer hors shell | Grand public / retrait |
| « 24/7 », « conforme » accessibilité si audit non finalisé | Formulations honnêtes |
| Tagline « Santé… » / « Observatoire… » sous logo header | Mot **Audixio** seul (footer shell partagé) |

### 4. Soft-gate PARTIEL vs lien équipe (ne pas confondre)

> **Invalidé :** « pas de détail exploitable avant vérif » ; « soft-gate = note+scores+priorités config seulement » ; « sans compte/non vérifié = pas de brief » ; « hub PARTIEL Stitch requis » ; « 3 priorités détaillées hub » ; « /100 comme système score UI ».

Canon : `SOFT-GATE-PARTIEL-CANON.md` + **`MATRICE-STATUT-DROITS-CANON.md`** + `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/`.

**Aussi soft-gate partiel :** compte connecté **sans** site vérifié (domaines sensibles Verrouillé ; brief = **PARTIEL** jusqu'à Vérifier propriété). Anonyme = soft-gate partiel + **aucun brief**.

| | Soft-gate PARTIEL (anonyme / compte non vérif / lien public) | Lien équipe |
|---|---|---|
| Qui | Lecteur anonyme, owner non vérifié, ou lien public | Destinataire (même sans compte) |
| Contenu | Note **partielle** + détail Perf/SEO/Éco/Qualité (+ A11y B1) ; Sécurité/Vie privée/DNS = badge **Verrouillé** (pas A–F) ; priorités mixtes ; note globale absente serveur | Lecture seule selon vérif proprio |
| Brief IA | Anonyme / lien public = **Aucun** ; compte non vérif = **PARTIEL** | **Oui** lecture seule (Copier le prompt…) |
| Comment corriger branché | **Non** (guides génériques OK) | Selon droits / vérif |
| Lien public | + **bandeau** permanent + `noindex` | — |
| CTA | Compte / Vérifier propriété | Pas CTAs propriétaire |

### 5. Sources obligatoires pour l'agent page

1. `maquettes/<dossier>/code.html` + `screen.png`
2. `01-REGLES-STRICTES.md` + `couleurs-palette-et-phrases-Cursor.md` (ce fichier)
3. `06-BACKLOG.md` (nits page)
4. `docs/produit/FONCTIONNEMENT.md` (+ §10) et `docs/etapes/04-promesse-et-copie.md`

## États maquette ≠ état réel (attention Cursor)

Les HTML/PNG Stitch montrent **souvent des exemples** : compte connecté, avatar, badge Pro, Sites avec données, Historique Pro, soft-gate déjà ouvert, etc.

**Par défaut produit : rien n'est connecté.**

| Vu dans la maquette (démo) | Comportement à coder |
|----------------------------|----------------------|
| Header « Compte » / avatar | Seulement **si session** ; sinon **Connexion**, pas de faux connecté |
| Badge Pro / courbes / Historique long | Seulement **si plan Pro** ; gratuit = pas de courbe Sites, profondeur 1 |
| Liste de sites / scores / liens actifs | Empty state si 0 site ; plafonds 2 sites / 1 lien en gratuit |
| Soft-gate, lien équipe, rapport rempli | États d'écran à brancher ; l'utilisateur anonyme arrive **sans** ça |
| « Me prévenir », waitlist | UI Pro hors nav — pas un compte déjà Pro |

Règles :
1. Coller la **structure** Stitch, mais brancher les **vrais états** (anonyme / compte / Pro).
2. Ne pas figer la démo Stitch comme seul écran.
3. Pas d'avatar ou libellé Compte si déconnecté.
4. Pas de features Pro visibles comme actives en gratuit (badge PRO sur une action = bientôt / waitlist, pas « déjà Pro »).

### 6. Interdits copy

- Agent **textes seuls** en parallèle
- Inventer claims marketing (« boostez », « révolutionnaire », « en un clic magique »)
- Cacher une limite : « Nous n'avons pas pu tester… »
- Relancer Stitch pour corriger une phrase


## B.5 Lock UI (28 oct soir)

- Un design COMPLET ; gated → composant **Verrouillé**.
- Teaser locked : micro-texte **général** seulement — **interdit** de nommer HSTS, X-Frame-Options, CSP dans l’aperçu verrouillé.
- Hub : TOP 10 titres + 8 cartes ; pas 3 priorités MonScore détaillées sur le hub.
- Scores UI : lettres **A–F** (remap si Stitch montre /100).
- Sélection Rien/Vérif/Fix sync domaine ↔ brief.
