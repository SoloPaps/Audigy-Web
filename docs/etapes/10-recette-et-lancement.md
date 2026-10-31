# Étape 10 — Recette et lancement

## Objectif

Préparer le go-live : **maximum en local**, puis **bêta publique seulement quand l'owner décide** (pas de go Jojo/Cursor). Juriste + recrutement testeurs = **owner**.

## Fichiers à lire

- `docs/produit/FONCTIONNEMENT.md` §6, §8, §12
- `docs/dev/RECETTE.md`
- `docs/dev/PLAN.md` (PART-27, §14 garde-fous)
- `docs/legal/` (relecture owner)
- `docs/00-DECISIONS.md`
- `docs/etapes/00-LISEZ-MOI.md`

## À faire

1. **Vie privée (bêta / local)** : afficher **tout** ce qu'on peut trouver **sans** Tracker Radar DuckDuckGo et **sans** navigateur d'audit = tests partiels HTTP/HTML (Set-Cookie 1er load, scripts évidents, CMP connus, liens politique cookies), libellés **« partiel / automatique »**. Soft-gate : domaine Vie privée entier **Verrouillé** pour non-éligibles (inchangé).
2. Confirmer : pas GitHub Actions comme navigateur public ; pas option B en voie principale.
3. **Ensuite seulement** (owner) : si le produit est peaufiné → **location VPS mensuelle** (~5–12 €/mois) pour serveur navigateur d'audit — pas un achat one-shot.
4. LICENSE + questions marque Audixio (owner). Tracker Radar DDG : **pas** au lancement tant que licence / liste alternative OK (owner).
5. Recette sur build **local** (étendre RECETTE si besoin) — **pas** deploy agent.
6. PART-27 : checklist owner uniquement (Netlify Personal + Supabase Pro au lancement public — pas forcément maintenant).
7. Go **bêta publique** = décision **owner seule**.

## Critères de done

- [ ] Tests vie privée partiels HTTP/HTML visibles et honnêtement libellés
- [ ] Recette locale à jour et rejouée
- [ ] Legal / LICENSE : statut owner documenté
- [ ] PART-27 non exécuté par un agent ; prêt pour l'owner
- [ ] Aucun `netlify deploy` depuis le poste de dev agent
- [ ] Pas de go bêta sans OK owner explicite

## Interdits

- Déployer « pour tester en prod »
- Louer / activer VPS navigateur sans OK budget / owner
- Ouvrir Pro au lancement sans décision séparée
- Décider la bêta publique à la place de l'owner
- Intégrer Tracker Radar DDG sans go licence owner
