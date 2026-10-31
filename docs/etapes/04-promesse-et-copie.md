# Étape 04 — Promesse et copie (5 corrections)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Notes **A à F** (E et F ajoutées). Pas de /100.

## Objectif

Aligner tous les textes visibles sur les décisions maquettes validées. **Dans le code / i18n**, pas Stitch.

## Fichiers à lire

- `docs/produit/FONCTIONNEMENT.md` §2 et §10
- `docs/produit/METHODE.md` (pour cohérence 8 domaines — ne pas réécrire la méthode sans besoin)
- Dictionnaires i18n `apps/web` (`fr`, `en`)
- Pages Accueil, Méthode, Soft-gate, Rapport (chaînes)

## Les 5 corrections

1. Une seule liste **8 domaines** = Méthode ; Disponibilité / Réputation à part ; Search Console facultatif (pas un 9e domaine).
2. « **Passif par défaut…** » — supprimer « 100 % passif ».
3. « **horodaté** » — supprimer « Certifié RFC 3161 ».
4. Jargon hors **couche 1** ; retirer « Pro » de Soft-Gating.
5. « **votre assistant IA** » — pas GPT-4o / Claude datés.

## Critères de done

- [ ] Aucune occurrence produit des formulations interdites ci-dessus dans l’UI FR (et EN aligné)
- [ ] Accueil et Méthode montrent la même liste de 8
- [ ] Couche 1 sans jargon technique inutile
- [ ] `pnpm copy-lint` / tests concernés verts

## Interdits

- Modifier Stitch / PNG maquettes pour « corriger » le texte
- Ajouter des promesses Pro dans l’UI gratuit (sauf mention discrète « bientôt » si déjà prévue)
