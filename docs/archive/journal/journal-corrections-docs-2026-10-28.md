# CHANGELOG — corrections audit Audixio (B1–B5)

Date : 2026-10-28 (Europe/Paris). Zone : BOX `/workspace/audixio-doc-fixes/` uniquement. **Pas de commit. Pas de GitHub.**

Sources : `/workspace/audixio-audit-report.md` + snapshot `/workspace/audixio-audit-pack/`.

---

## Fichiers écrits

| Fichier | Blockers / H | Changements |
|---------|--------------|-------------|
| `docs/design-pack-2026-10-26/00-LISEZ-MOI.md` | **B1**, M7 | Usage §2 + Stitch : doctrine unique pixel-perfect body / tokens couleurs / chrome REGLES. Retiré « proche, pas calque 1:1 », « Pas un clone pixel-perfect », hors-scope « Calque pixel-perfect ». Table 02-PAGES : plus « chemin stitch5 ». |
| `.cursor/rules/design.mdc` | **B1**, H3, H6 | Aligné l.7 avec doctrine body pixel-perfect. Nav + thème + Connexion\|Compte si session. Hex autorisés = DESIGN §2.1/§2.4 + 03 + 04 + table COULEURS logo ; pages = tokens CSS seulement. Body § implémentation reformulé. |
| `docs/design-pack-2026-10-26/02-PAGES.md` | **B2**, **B5**, H5, M4 | Réécrit Audixio. Canon = `maquettes/page_*` + `interface_*` (INDEX). Plus d’`audigy_*` ni `/tmp/audigy-stitch5` comme sources. Note conflit 01+FONCTIONNEMENT+COULEURS. Accueil : 8 domaines CANON. CTA `AUDIXIO-FIXES.md` / Copier le prompt. Sites suivis + quotas 2/1. Soft-gate ≠ équipe. Logos out/. |
| `docs/DESIGN.md` | **B3**, **B5**, H1, H2, H5, L1, L5, L6 | Titre Audixio ; bandeau « corps historique — pack+FONCTIONNEMENT gagnent ». Logos → `audixio-logos/out/` (JPG obsolètes). Typo Inter shell. Nav complète. Copy : Passif par défaut ; Copier le prompt / votre assistant IA ; soft-gate gratuit ; 8 domaines CANON ; localStorage `audixio-theme` (+ rétrocompat). Quotas / pas de courbe gratuit. |
| `AGENTS.md` | **B4**, H3, M8 | Titre Audixio. Nav + thème + Connexion\|Compte. Note `@audigy/*` / `*.audigy.test` = historique ; UI = Audixio. |
| `docs/FONCTIONNEMENT.md` | **B4**, H3, H4 | Titre + « Qu’est-ce qu’Audixio ? » + anciennement Audigy. Serveur Audixio. Nav complète. §7 soft-gate UI (pas brief, masquer Export…) vs lien équipe. §2 domaines CANON inchangé (déjà correct). |
| `docs/design-pack-2026-10-26/03-THEME-LIGHT-ARC-SOFT.md` | **B4**, H2, M1 | Titre Audixio. Note Inter shell ; Outfit/Atkinson = historique. |
| `docs/design-pack-2026-10-26/04-THEME-DARK.md` | **B4**, M1 | Titre Audixio. Inter shell. localStorage `audixio-theme` (+ rétrocompat). |
| `docs/design-pack-2026-10-26/maquettes/INDEX.md` | **B4**, H7 | « Audixio Pro waitlist ». Soft-gate ≈ exemple structure + écarts RESTES/COULEURS (≠ exemple produit). |
| `docs/etapes-refonte/02-chrome-ui.md` | **B4**, H3 | Nav + thème + Connexion\|Compte si session. |

**Non touchés** (déjà OK / hors liste) : `01-REGLES`, `COULEURS`, `CURSOR-IMPL`, `LOGOS`, `05-LOGO`, `RESTES` (skip — nits Compte Sites formulables via 02-PAGES checklist).

---

## Checklist blockers

| ID | Statut | Notes |
|----|--------|-------|
| B1 Doctrine pixel-perfect | **DONE** | Une règle dans LISEZ-MOI + design.mdc ; contradictions « proche / pas calque » purgées. |
| B2 02-PAGES | **DONE** | Réécriture complète INDEX `page_*`. |
| B3 DESIGN.md | **DONE** | Marque, logos, typo, copy, domaines, nav, localStorage. |
| B4 Marque Audixio | **DONE** | AGENTS, FONCTIONNEMENT, 03, 04, INDEX, etapes 02. |
| B5 Une liste 8 domaines | **DONE** | CANON partout dans fichiers modifiés + renvois FONCTIONNEMENT §2. |

---

## Risques restants

- RESTES / COULEURS / 01-REGLES / CURSOR-IMPL non re-copiés : OK s’ils sont déjà gelés 2026-10-28 dans le dépôt cible ; à vérifier au collage OrdiBibi.
- DESIGN.md reste long (historique Arc Soft) : bandeau + overrides ; un agent qui lit seulement le milieu sans bandeau peut encore croiser formulation « fusion » — mitigé par renvois pack.
- `design.mdc` `alwaysApply: false` (M6) non changé.
- Mentions `audigy_*` / `/tmp/audigy-stitch5` / « Soft-gating Pro » restantes = **interdits explicites** (« ne plus citer » / « pas … »), pas des prescriptions.
- Coller vers OrdiBibi : écraser les chemins listés ; UTF-8 ; pas de commit tant que review owner.

## 2026-10-28 — Vérif propriété = débloque détail/brief

- `FONCTIONNEMENT.md` §5 + soft-gate : compte seul ≠ données complètes ; soft-gate si non vérifié.
- `AGENTS.md` aligné.
- LISEZ / restes / couleurs : rappel Cursor.

## Entrée — soft-gate PARTIEL (28 octobre 2026, session doc Cursor-ready)

**Décision owner :** soft-gate **partiel** (plus soft-gate total). Specs dans `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/`.

**Canon ajouté :** `docs/design-pack-2026-10-26/SOFT-GATE-PARTIEL-CANON.md`

**Alignés :** `docs/FONCTIONNEMENT.md`, `AGENTS.md`, `.cursor/rules/00-core.mdc`, `.cursor/rules/design.mdc`, design-pack `00-LISEZ-MOI`, `01-REGLES-STRICTES`, `02-PAGES`, `couleurs-…`, `workflow-…`, `restes-a-faire-…`, etapes `00`/`05`/`06`/`07`/`09`, `README.md`, `docs/README.md`.

**Règles injectées :** ouverts Perf/SEO/Éco/Qualité détaillés ; Sécurité/Vie privée/DNS → badge Verrouillé (pas A–F), données absentes ; A11y Option B1 ; double note (partielle N domaines réel / globale non calculée si non vérifié) ; priorités mixtes ; matrice brief (anonyme=aucun, compte non vérifié=PARTIEL, vérifié=COMPLET, lien public=aucun, équipe=lecture seule) ; Comment corriger branché site seulement après vérif ; anti-fuite filtre serveur+RLS (pas blur CSS) ; plafonds 2+1 ; Pro 10 sites ; brief pas réservé Pro ; Vie privée partielle HTTP/HTML (bêta ; sans DDG ni navigateur ; domaine Verrouillé) — supersède Option C.

**Phrases invalidées :** « pas de détail exploitable avant vérif », soft-gate = note+scores+priorités config seulement, « sans compte/non vérifié = pas de brief ».

**Pages design à redesigner :** voir fin de `restes-a-faire-par-page-Cursor.md` (tableau Stitch vs Cursor).


---

## Session soir 28 oct 2026 — docs finales Cursor (lock + matrice)

**Décisions owner :** soft-gate PARTIEL inchangé + **stratégie lock-components** ; SSOT `MATRICE-STATUT-DROITS-CANON.md` ; hub TOP 10 ; sélection dual sync ; serveur capabilities ; maquettes rapport 5 écrans installées ; pas de hub Stitch PARTIEL séparé.

**Fichiers touchés (non exhaustif) :** MATRICE (nouveau), SOFT-GATE, FONCTIONNEMENT, AGENTS, 00-core/design.mdc, 00/01/02 pack, restes, couleurs, workflow, INDEX maquettes, DESIGN, etapes 05–09, specs soft-gate, journal.

**Supprimé / archivé :** `FONCTIONNEMENT.md.bak-softgate-2026-10-28` ; refs Audigy actives dangereuses → `docs/archive/` si déplacées.

**Phrases invalidées ajout :** hub PARTIEL Stitch requis ; 3 priorités détaillées hub ; /100 comme système UI ; HSTS dans aperçu Verrouillé OK.

---

## Déploiement OrdiBibi soir 28 oct 2026 (pack final)

- Pack box `/workspace/audixio-docs-final.tar.gz` → `C:\Users\trehi\.cursor\` → extrait → copie force vers chemins projet.
- `FONCTIONNEMENT.md.bak-softgate-2026-10-28` **supprimé**.
- Archive `docs/archive/audigy-titled-2026-10-28/` : REFERENCE-AUDIGY-MONSCORE-FUSION, refs audit/bugs/dark/monscore, DESIGN-STITCH-ARC-PURE (×2), bugs-a-reprendre-2026-11, 07-PLUS-TARD, 08-MANIFEST.
- Bannières héritage : `PLAN.md`, note snapshot `audit-chrome-nav-footer-png-2026-10-28.md`.
- Spec officielle : particulers = TOP 10 (plus « 3 priorités »).
- Maquettes rapport 5 écrans : déjà présentes (html+png).
- UA technique `AudigyBot` / packages `@audigy/*` / lab `*.audigy.test` / dossier repo `Audigy-Web` = **historique technique**, UI marque = **Audixio**.

---

## Décisions owner 28 oct soir (post-Claude) — alignement docs

**Source :** échanges owner + Claude + Jojo ; figé dans `docs/DECISIONS-OWNER-2026-10-28-soir.md` + `docs/RECAP-ETAPES-PROJET-AUDIXIO.md`.

**Décisions injectées :**
- Marque **Audixio** ; cœur Cursor d'abord (capabilities serveur, hub, soft-gate Verrouillé, magic link) ; Pro / chrome fancy / EN / VPS navigateur = après.
- Soft-gate PARTIEL inchangé (5 ouverts + A11y B1 ; Sécu / Vie privée / DNS = domaines entiers Verrouillés).
- Comment réparer : générique ouvert ; personnalisé site après preuve.
- A11y : lettre A–F **gardée** + mention obligatoire « mesure automatique / partielle ».
- Vie privée bêta/local : **tout** ce qu'on peut sans DDG Tracker Radar et **sans** navigateur d'audit = HTTP/HTML partiel ; puis VPS navigateur en **location mensuelle** (~5–12 €) si owner OK.
- Preuves : immédiat fichier + meta + lien HTML ; DNS vague suivante ; OAuth/GSC plus tard.
- Pro cible **~9 €/mois**.
- Ops : **max local** ; juriste / testeurs / go bêta = **owner** ; Netlify Personal + Supabase Pro au lancement public (pas forcément maintenant).

**Pas de commit GitHub.**

## Soir tard - audit alignement + prune (executor)

- Re-vérif SSOT : DECISIONS + RECAP + MATRICE + SOFT-GATE-PARTIEL + FONCTIONNEMENT + AGENTS.
- Alignement : Option C → vie privée partielle HTTP/HTML ; preuves immédiates trio ; Pro ~9 € ; A11y mention auto/partiel.
- Voir `docs/AUDIT-ALIGNEMENT-2026-10-28-soir.md` et `docs/PRUNE-DOCS-2026-10-28.md`.
