# Étape 09 — Pro (plus tard)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Stripe / Pro **gelés** : liste d'attente seulement. Popup Pro uniquement quand la limite est atteinte (gratuit : 2 sites, 1 lien actif).

## Objectif

**Documenter et borner** le travail Pro (prix cible **~9 €/mois**, 10 sites). **Ne pas l’implémenter** avant go-live + LICENSE. Tracker Radar DDG **pas** au lancement (owner tranche licence / liste alternative).

## Fichiers à lire

- `docs/produit/FONCTIONNEMENT.md` §6
- `docs/archive/audigy-titled-2026-10-28/07-PLUS-TARD.md`

## Périmètre Pro (rappel)

- Historique long (≥10 audits) + **historique courbe** (tendances dans le temps)
- Tableau multi-sites + tendances
- Comparaison dans le temps + **graphiques** + Excel/CSV
- PDF/export client soigné vs basique gratuit
- Prix cible **~9 €/mois** (après le cœur, pas bloquant)
- Limites plus hautes : **Pro = 10 sites** (+ liens, file prioritaire) ; gratuit = 2 sites
- Alertes e-mail (propriété prouvée) + petite UI réglages
- Rapports signés (SHA-256, horodatage)
- Pas d’espace équipe / sièges pour l’instant
- Brief IA = **identique** au gratuit **compte + site vérifié** = COMPLET (pas réservé au Pro) ; soft-gate PARTIEL + lock-components inchangés ; voir matrice colonne Pro

## Critères de done (cette étape docs-only)

- [ ] Aucune PR « Pro » mergée avant go-live sauf OK owner explicite
- [ ] Backlog Pro listé (issues ou section PLAN) sans code spéculatif dans le chemin critique gratuit
- [ ] Graphiques prévus depuis historique **serveur**

## Interdits

- Coder Pro « en passant » pendant les étapes 02–08
- Réserver le brief IA au Pro
