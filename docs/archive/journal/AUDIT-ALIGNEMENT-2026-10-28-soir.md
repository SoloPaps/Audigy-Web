# AUDIT alignement docs — 28 octobre 2026 soir

> SSOT : `DECISIONS-OWNER-2026-10-28-soir.md` > `RECAP-ETAPES` > MATRICE > SOFT-GATE-PARTIEL > FONCTIONNEMENT > AGENTS  
> Machine : OrdiBibi — `C:\Projets\Audigy-Web`  
> **STATUT : APPLIQUÉ** (2026-10-28 22:50 Europe/Paris) — plus « bloqué ».

## Compteurs réels

| Action | Nb |
|--------|----|
| Patchés (fichiers uniques) | **11** |
| Archivés | **2** |
| Supprimés | **0** |
| Git commit/push | **aucun** |

## Contradictions trouvées → corrigées

1. **Vie privée / Option C** — AGENTS, FONCTIONNEMENT §8, SOFT-GATE, rules et design-pack disaient encore Option C / Non testé. → **partiel HTTP/HTML** sans DDG ni navigateur ; VPS location plus tard ; domaine Verrouillé.
2. **Preuves** — ordre clarifié dans FONCTIONNEMENT : immédiat fichier+meta+lien HTML ; DNS vague 2 ; OAuth plus tard.
3. **Pro ~9 €/mois** — ajouté où manquant (AGENTS, MATRICE, design.mdc).
4. **A11y** — mention « mesure automatique / partielle » ajoutée.
5. **_spec-soft-gate** — archivé ; refs retargetées vers `docs/archive/2026-10-28-prune/`.
6. **superpowers/README** — archivé.
7. **Post-script** — remplacements trop larges avaient mangé `security.mdc` et `design.mdc` ; **corrigés**. Table etapes `00-LISEZ-MOI` restaurée (LICENSE, PART-27).

## Déjà aligné (SSOT)

- Soft-gate PARTIEL ; sensibles = Sécurité + Vie privée + DNS/mail
- Hub = note + TOP10 + 8 cartes ; Brief hors hub ; COMPLET + Verrouillé (pas hub PARTIEL Stitch séparé)
- Comment réparer générique ouvert / perso après vérif
- UI Audixio ; max local ; go bêta = owner
- Cœur Cursor d’abord

## Pass finale grep — contradictions majeures actives

| Thème | Résultat |
|-------|----------|
| Option C comme règle active | **Aucune** (reste seulement listes Invalidé / journal historique) |
| DDG obligatoire au lancement | **Aucune** |
| Hub PARTIEL séparé requis | **Aucune** (seulement « pas de hub PARTIEL » / Invalidé) |
| Comment corriger entièrement fermé | **Aucune** |
| DNS comme preuve immédiate seule | **Aucune** |
| Soft-gate COMPLET-only | **Aucune** (seulement phrases Invalidé) |

## Restantes (hors scope ou volontaires)

1. Copy UI code (Astro/i18n) — hors scope docs.
2. `PLAN.md` / `METHODE.md` longs : relecture humaine utile (DDG cité comme licence données historique OK).
3. `docs/archive/**` et `_archive` : formulations anciennes volontaires.
4. `QUESTIONS.md` conservé (lié AGENTS).
5. Mentions « Option C » dans Invalidé / journal / cet AUDIT = documentation du changement, pas règle active.

## Inventaire classes

| Classe | Exemples |
|--------|----------|
| CANON | DECISIONS, RECAP, MATRICE, SOFT-GATE-PARTIEL, FONCTIONNEMENT, AGENTS |
| Actif Cursor | .cursor/rules/*, design-pack, etapes-refonte, DESIGN, PLAN, DEV-LOCAL, RECETTE |
| Historique utile | journal-corrections, audits chrome, legal/registre |
| Archive déjà | docs/archive/** |
| Archivé ce soir | `_spec-soft-gate` + `superpowers/README` → `docs/archive/2026-10-28-prune/` |


## Passe UTF-8 (soir, post-patches)

Vérification Python UTF-8 sur OrdiBibi (AGENTS.md, FONCTIONNEMENT.md, MATRICE, SOFT-GATE, .cursor/rules/*.mdc) :

- Aucune occurrence ~9 ?/mois / ~9 ? — déjà ~9 €/mois (U+20AC) là où le prix Pro est cité.
- Aucun cour cassé à la place de cœur ; cœur présent et correct dans AGENTS / FONCTIONNEMENT / MATRICE / DECISIONS / RECAP.
- Pas de mojibake guillemets (Ã, â€™, etc.) détecté sur ces canons.
- Soft-gate / 00-core / security : pas de prix Pro littéral (renvoient DECISIONS/MATRICE) — OK.

Aucune réécriture UTF-8 nécessaire sur cette passe.

## Confirmation

- Aucun git commit / push.
- Hors `C:\Projets\Audigy-Web` : non touché (sauf copies Downloads des livrables + script tmp).
- Code / tests / logos PNG / maquettes HTML : non supprimés.