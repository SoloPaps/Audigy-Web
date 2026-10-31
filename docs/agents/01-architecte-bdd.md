# Agent 01 — Architecte BDD (schéma Supabase + RLS)

- **Modèle Cursor** : principal **Grok 4.7** (exécution) · validation obligatoire du schéma par **Opus 5.5** avant de continuer · secours **Composer 2.5**.
- **Phase** : 1 (fondations).

## Docs à lire en premier (exacts)
1. `AGENTS.md`
2. `.cursor/rules/stack.mdc` + `.cursor/rules/security.mdc`
3. `docs/produit/MATRICE-STATUT-DROITS-CANON.md` (statuts, plafonds)
4. `docs/produit/FONCTIONNEMENT.md` §4–6 (gratuit sans compte / compte / liens)
5. `docs/dev/PLAN.md` — **seulement** la section schéma (§8 tables) et §9 (noms de variables, jamais les valeurs)
6. Migrations existantes : `supabase/migrations/*.sql` (7 fichiers du 23 au 25 oct.)

## Ce qu'il doit faire
- Stack conservée (Astro + Svelte + Netlify Functions + Supabase, pas Next.js — décision owner 2026-10-29).
- **Étendre** le schéma existant (ne pas repartir de zéro) : comptes, sites (plafond 2 / Pro 10), preuves de propriété (fichier, meta, lien HTML), audits, constats, rapports, liens (public 30 j / équipe, plafond 1), sélection Rien/Vérif/Fix, `audit_log`. Comptes = Supabase Auth (e-mail + mot de passe + OAuth Google/GitHub) : tables profil liées à `auth.users`, aucun mot de passe stocké soi-même.
- Nouvelle migration horodatée dans `supabase/migrations/` ; RLS activée sur **chaque** table.
- Décrire les statuts `anon / acct_unverified / acct_verified / pro / link_public / link_team` côté données.
- Données sensibles (Sécurité / Vie privée / DNS) stockées de façon filtrable serveur.

## Interdits stricts
- Modifier/supprimer une migration déjà existante.
- Table sans RLS ; politique `using (true)` sur données utilisateur.
- Mettre une clé/secret dans SQL, seed ou tests ; lire `.env`.
- Ajouter tables Stripe/paiement maintenant (Pro = après go-live).
- Plus de 8 fichiers par étape.

## Livrables
- `supabase/migrations/<timestamp>_<nom>.sql`
- Tests RLS (Vitest) par table : propriétaire OK, autre utilisateur refusé, anonyme refusé.
- Note courte du schéma (tables + colonnes + qui lit/écrit) pour la revue Opus.

## Checklist de fin
- [ ] `supabase start` + migration appliquée sans erreur
- [ ] RLS sur 100 % des tables, tests RLS verts
- [ ] Plafonds 2 sites / 1 lien appliqués côté serveur
- [ ] Revue **Opus 5.5** du schéma : OK écrit
- [ ] Commit `feat(db): …`

## Handoff
→ **Agent 02 Sécurité & droits** : lui transmettre la note schéma validée + liste des tables sensibles.
