# Étape 06 — Compte et plafonds

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Connexion = **e-mail + mot de passe**, ou **Google / GitHub**. Plus de magic link.
> - Stripe / Pro **gelés** : liste d'attente seulement. Popup Pro uniquement quand la limite est atteinte (gratuit : 2 sites, 1 lien actif).
> - Révocation des accès : section « Accès partagés » du Compte + raccourci dans Sites.

## Objectif

Connexion e-mail + mot de passe, Google ou GitHub ; plafonds gratuit avec compte : **2 sites**, **1 lien** actif ; historique **profondeur 1** (dernier rapport par site).

## Fichiers à lire

- `docs/produit/FONCTIONNEMENT.md` §5 et §9
- `docs/dev/PLAN.md` (auth / Supabase — sections utiles seulement)
- `docs/dev/DEV-LOCAL.md` (auth locale)
- Schéma / policies Supabase existants (chemins exacts à lister)

## À faire

1. Connexion e-mail + mot de passe, Google et GitHub (inscription, confirmation d'e-mail, mot de passe oublié) — remplace le magic link.
2. Enforce plafond **2 sites suivis**.
3. Enforce **1 lien de partage actif** (public ou équipe).
4. Stockage serveur : dernier rapport **par site** ; pas d’historique long en gratuit.
5. Sans compte : 1 dernier audit navigateur ; **brief = aucun** (CTA compte) ; pas de création de lien.
6. Brief IA : compte + non vérifié = **PARTIEL** ; compte + site vérifié = **COMPLET** (aligner droits ; soft-gate PARTIEL pour la vue).

## Critères de done

- [ ] Soft-gate PARTIEL : ouverts détaillés ; sensibles absents ; Comment corriger branché seulement si **site vérifié**
- [ ] Impossible de dépasser 2 sites / 1 lien en gratuit (UI + API)
- [ ] Messages d’erreur clairs en français
- [ ] Brief : aucun si anonyme ; **PARTIEL** si compte + non vérifié ; **COMPLET** si compte + site vérifié
- [ ] Données compte en Supabase (local en dev), pas sur le PC

## Interdits

- Implémenter l’historique ≥10 (Pro) maintenant
- Sièges / espace équipe
- Stocker les rapports « pour toujours » en localStorage comme source de vérité


Plafonds et capacités : `MATRICE-STATUT-DROITS-CANON.md` (2 sites / 1 lien ; Pro 10 sites).
