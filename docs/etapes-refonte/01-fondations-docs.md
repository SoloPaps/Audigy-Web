# Étape 01 — Fondations documentation

## Objectif

Fusionner le pack reorg dans le dépôt local : produit, agents, README, index docs, dossier étapes, placeholder maquettes.

## Fichiers à lire

- Pack : `FONCTIONNEMENT.md`, `AGENTS.md`, `README.md`, `docs-CLEANUP.md`, `design-pack-MAQUETTES.md`
- Existant : `docs/README.md`, `AGENTS.md`, `README.md`

## À faire

1. Copier `FONCTIONNEMENT.md` → `docs/FONCTIONNEMENT.md`.
2. Remplacer `AGENTS.md` et `README.md` racine.
3. Copier `etapes-refonte/` → `docs/etapes-refonte/`.
4. Créer `docs/design-pack-2026-10-26/maquettes/README.md` (contenu de `design-pack-MAQUETTES.md`).
5. Mettre à jour `docs/README.md` (index) : liens FONCTIONNEMENT + etapes-refonte.
6. Optionnel : appliquer drafts `.cursor/rules/00-core.mdc` et `design.mdc`.
7. **Ne pas** supprimer METHODE, PLAN, legal. Suivre `docs-CLEANUP.md` pour archives (OK owner séparé).

## Critères de done

- [ ] `docs/FONCTIONNEMENT.md` présent et cohérent
- [ ] AGENTS / README racine à jour (plus « gratuit uniquement » sans Pro documenté)
- [ ] `docs/etapes-refonte/00-LISEZ-MOI.md` accessible
- [ ] `maquettes/README.md` en place (ZIP owner peut arriver plus tard)
- [ ] `docs/README.md` indexe les nouveaux docs
- [ ] Aucun déploiement, aucun push non demandé

## Interdits

- Réécrire METHODE ou legal « en passant »
- Déplacer vers `docs/archive/` sans OK owner
