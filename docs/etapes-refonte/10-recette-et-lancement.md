# Étape 10 — Recette et lancement

## Objectif

Préparer le go-live public : navigateur option **C**, LICENSE, marque, recette, **PART-27** owner only.

## Fichiers à lire

- `docs/FONCTIONNEMENT.md` §8
- `docs/RECETTE.md`
- `docs/PLAN.md` (PART-27, §14 garde-fous)
- `docs/legal/` (relecture owner)
- `docs/bugs-a-reprendre-2026-11.md`

## À faire

1. **Option C** : vie privée « bientôt » ; note sur 7 domaines ; vie privée Non testé sous seuil 50 %.
2. Confirmer : pas GitHub Actions comme navigateur public ; pas option B en voie principale.
3. LICENSE + questions marque (owner).
4. Remplacement Tracker Radar NC : planifié / fait avant features qui en dépendent en prod.
5. Recette sur build local (étendre RECETTE si besoin) — **pas** deploy.
6. PART-27 : checklist owner uniquement (Netlify prod, Supabase distant, secrets).

## Critères de done

- [ ] Option C visible et honnête dans l’UI
- [ ] Recette locale à jour et rejouée
- [ ] Legal / LICENSE : statut owner documenté
- [ ] PART-27 non exécuté par un agent ; prêt pour l’owner
- [ ] Aucun `netlify deploy` depuis le poste de dev agent

## Interdits

- Déployer « pour tester en prod »
- Activer option A (VPS) sans OK budget / owner
- Ouvrir Pro au lancement sans décision séparée
