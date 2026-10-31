# Documentation Audixio — carte du projet

**Marque UI :** Audixio (ex-Audigy).  
**Repo local :** `C:\Projets\Audigy-Web` (OrdiBibi).  
**Règle agents :** [AGENTS.md](../../../AGENTS.md) + `.cursor/rules/` (`00-core`, `design`, `security`, `stack`).

> **Ne pas** lire toute la doc. Lire dans l’ordre ci-dessous, puis **une** PART (`PLAN.md`) ou **une** étape (`etapes-refonte/`).

---

## 1. Ordre de lecture (Cursor / agents)

| # | Fichier | Rôle |
|---|---------|------|
| 1 | [AGENTS.md](../../../AGENTS.md) | Mode caveman, produit, design, sécurité |
| 2 | [DECISIONS-OWNER-2026-10-28-soir.md](../../00-DECISIONS.md) | **SSOT décisions soir** (qui voit quoi, preuves, VP, Pro, ops) |
| 3 | [RECAP-ETAPES-PROJET-AUDIXIO.md](../../etapes/00-LISEZ-MOI.md) | Récap simple owner : cour → beta |
| 4 | [FONCTIONNEMENT.md](../../produit/FONCTIONNEMENT.md) | **SSOT produit** (parcours, plafonds, soft-gate, Pro) |
| 5 | [design-pack-2026-10-26/MATRICE-STATUT-DROITS-CANON.md](../../produit/MATRICE-STATUT-DROITS-CANON.md) | **SSOT droits** (capabilities) |
| 6 | [design-pack-2026-10-26/SOFT-GATE-PARTIEL-CANON.md](../../produit/SOFT-GATE-PARTIEL-CANON.md) | Soft-gate PARTIEL + lock-components |
| 7 | [design-pack-2026-10-26/01-REGLES-STRICTES.md](../../design/01-REGLES-STRICTES.md) | Avant toute UI (chrome / logo / dark) |
| 8 | [etapes-refonte/00-LISEZ-MOI.md](../../etapes/00-LISEZ-MOI.md) | Refonte ordonnée 01→10 |
| — | [PLAN.md](../../dev/PLAN.md) §15 | **Une** PART seulement (architecture / checklist) — *historique, ne pas contredire DECISIONS* |

## 2. Ordre de lecture (owner / Jojo)

1. [RECAP-ETAPES-PROJET-AUDIXIO.md](../../etapes/00-LISEZ-MOI.md) — où on en est  
2. [DECISIONS-OWNER-2026-10-28-soir.md](../../00-DECISIONS.md) — règles figées  
3. [FONCTIONNEMENT.md](../../produit/FONCTIONNEMENT.md) — détail produit  
4. [journal/](../journal/) — audits / prune / corrections (pas pour coder)

---

## 3. Canons vivants (ne pas déplacer)

Ces chemins sont cités par `AGENTS.md` et `.cursor/rules/` — **rester à cet endroit**.

| Chemin | Statut |
|--------|--------|
| `FONCTIONNEMENT.md` | SSOT produit |
| `DECISIONS-OWNER-2026-10-28-soir.md` | SSOT décisions 28 oct soir |
| `RECAP-ETAPES-PROJET-AUDIXIO.md` | Récap owner |
| `DESIGN.md` | Charte clair (PR #66) ; hub/soft-gate = DECISIONS |
| `design-pack-2026-10-26/**` | Pack gelé (01-REGLES, MATRICE, SOFT-GATE, logos/out, maquettes) |
| `etapes-refonte/` | Étapes refonte |
| `PLAN.md`, `QUESTIONS.md` | Vivants mais **historiques** (bannières) |

## 4. Docs racine — bannières

| Fichier | Banner |
|---------|--------|
| [FONCTIONNEMENT.md](../../produit/FONCTIONNEMENT.md) | **SSOT produit** |
| [DECISIONS-…](../../00-DECISIONS.md) / [RECAP…](../../etapes/00-LISEZ-MOI.md) | **SSOT décisions / récap** |
| [DESIGN.md](../../design/DESIGN.md) | Charte clair ; produit soft-gate = DECISIONS |
| [PLAN.md](../../dev/PLAN.md) | **Historique** — ne pas contredire DECISIONS / FONCTIONNEMENT |
| [METHODE.md](../../produit/METHODE.md) | Notation 2026.1 — ne pas contredire DECISIONS (VP partielle, A11y B1) |
| [DEV-LOCAL.md](../../dev/DEV-LOCAL.md) | Lab local (pas de deploy) |
| [RECETTE.md](../../dev/RECETTE.md) | Recette PART-26 locale |
| [QUESTIONS.md](../../produit/QUESTIONS.md) | Défauts si owner ne répond pas |

## 5. Design pack (index)

→ [design-pack-2026-10-26/00-LISEZ-MOI.md](../../design/00-LISEZ-MOI.md)

Canons clés : `01-REGLES-STRICTES.md`, `MATRICE-…`, `SOFT-GATE-…`, `NAV-CANON-…`, `logos/audixio-logos/out/`, `maquettes/**/screen.png`.

## 6. Journal (historique de session)

| Fichier | Contenu |
|---------|---------|
| [journal/STRUCTURE-2026-10-28.md](../journal/STRUCTURE-2026-10-28.md) | Reorg structure docs (cette passe) |
| [journal/AUDIT-ALIGNEMENT-2026-10-28-soir.md](../journal/AUDIT-ALIGNEMENT-2026-10-28-soir.md) | Audit alignement soir |
| [journal/PRUNE-DOCS-2026-10-28.md](../journal/PRUNE-DOCS-2026-10-28.md) | Prune docs |
| [journal/journal-corrections-docs-2026-10-28.md](../journal/journal-corrections-docs-2026-10-28.md) | Corrections docs journée |

## 7. Archive — ne pas utiliser pour Cursor

→ [archive/README.md](../README.md)

Contient : `superpowers/` (plans déjà mergés), `audigy-titled-2026-10-28/` (anciens titres / refs), `2026-10-28-prune/_spec-soft-gate-…` (spec soft-gate détaillée, remplacée par canons).

**Chemin canon soft-gate archive :** `archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/`  
*(ancien `docs/_archive/…` et `docs/_spec-soft-gate-…` n’existent plus.)*

## 8. Legal

[legal/registre.md](../../legal/registre.md) — registre traitements (relecture humaine owner non faite).

---

## Rappels produit (anti-trou)

- Preuves MVP **immédiates** : fichier TXT + meta + lien HTML (DNS = vague suivante).
- Soft-gate **PARTIEL** ; hub = **un design COMPLET** + composants **Verrouillé** (pas hub Stitch PARTIEL).
- A11y : lettre A-F + mention « mesure automatique / partielle » ; zéro claim RGAA/EAA.
- Vie privée béta : tests **partiels HTTP/HTML** (pas DDG Tracker Radar, pas navigateur d’audit requis).
- « Comment réparer » : guides **génériques** ouverts ; **branché site** seulement après preuve.
- Pro futur : **~9 €/mois**, 10 sites — après le cour ; brief IA **pas** réservé Pro.