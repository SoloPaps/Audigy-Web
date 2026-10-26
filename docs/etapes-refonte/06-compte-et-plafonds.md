# Étape 06 — Compte et plafonds

## Objectif

Magic link e-mail ; plafonds gratuit avec compte : **2 sites**, **1 lien** actif ; historique **profondeur 1** (dernier rapport par site).

## Fichiers à lire

- `docs/FONCTIONNEMENT.md` §5 et §9
- `docs/PLAN.md` (auth / Supabase — sections utiles seulement)
- `docs/DEV-LOCAL.md` (auth locale)
- Schéma / policies Supabase existants (chemins exacts à lister)

## À faire

1. Connexion magic link (pas de mot de passe) — fiabiliser le parcours.
2. Enforce plafond **2 sites suivis**.
3. Enforce **1 lien de partage actif** (public ou équipe).
4. Stockage serveur : dernier rapport **par site** ; pas d’historique long en gratuit.
5. Sans compte : 1 dernier audit navigateur ; pas de brief ; pas de création de lien.
6. Brief IA complet **avec compte** (déjà partiellement là — aligner droits).

## Critères de done

- [ ] Impossible de dépasser 2 sites / 1 lien en gratuit (UI + API)
- [ ] Messages d’erreur clairs en français
- [ ] Brief accessible avec compte, absent sans compte
- [ ] Données compte en Supabase (local en dev), pas sur le PC

## Interdits

- Implémenter l’historique ≥10 (Pro) maintenant
- Sièges / espace équipe
- Stocker les rapports « pour toujours » en localStorage comme source de vérité
