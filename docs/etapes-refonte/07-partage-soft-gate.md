# Étape 07 — Partage et soft-gate

## Objectif

Liens public (30 j, soft-gate, noindex, retrait 1 clic) et liens équipe (détail + brief, révocable). Table **public / masqué** côté moteur.

## Fichiers à lire

- `docs/FONCTIONNEMENT.md` §4, §5, §7
- Pages Soft-gate / Partage (design pack `02-PAGES.md`)
- Code partage / tokens de lien existants

## À faire

1. Création de lien = **compte obligatoire**.
2. Lien public : 30 jours ; soft-gate (config corrigible visible ; chemins/versions/IP masqués) ; noindex ; date audit visible ; retrait 1 clic.
3. Lien équipe : détail + brief ; destinataire sans compte ; révocable.
4. Sans compte après audit : **même vue** soft-gate (note, scores domaines, priorités config).
5. Constats graves → « problème grave, détail masqué ».
6. Table public/masqué documentée et appliquée.

## Critères de done

- [ ] Soft-gate identique (aperçu sans compte = lien public)
- [ ] Aucun détail exploitable en public
- [ ] Retrait / révocation fonctionnels
- [ ] Plafond 1 lien actif respecté (étape 06)

## Interdits

- Indexer les liens publics (SEO)
- Afficher versions / IP / chemins en public
