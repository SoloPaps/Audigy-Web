# Agent 02 — Sécurité & droits (capabilities, auth, preuves)

- **Modèle Cursor** : **Opus 5.5** planifie (plan écrit) → **Grok 4.7** exécute · secours **Composer 2.5** (jamais pour décider une règle de sécurité).
- **Phase** : 2 (et revue finale phase 5 via Agent 08).

## Docs à lire en premier
1. `AGENTS.md` §Sécurité
2. `.cursor/rules/security.mdc`
3. `docs/produit/MATRICE-STATUT-DROITS-CANON.md` (SSOT)
4. `docs/produit/SOFT-GATE-PARTIEL-CANON.md` §Anti-fuite
5. `docs/00-DECISIONS.md` (preuves, vie privée)
6. `docs/etapes/06-compte-et-plafonds.md`, `07-partage-soft-gate.md`

## Ce qu'il doit faire
- Auth **e-mail + mot de passe + OAuth Google et GitHub** via Supabase Auth (décision owner 2026-10-29, remplace le magic link des docs). Confirmation d'e-mail, réinitialisation du mot de passe, OAuth avec PKCE + `state`, redirections en liste blanche. À distinguer de l'OAuth Search Console, qui sert à la vérification de propriété (une des 5 méthodes (décision 29/10, `00-DECISIONS.md`) : **Google Search Console** (recommandée ; OAuth lecture seule, rôle `siteOwner`), DNS TXT, balise meta, fichier HTML à la racine, fichier `.well-known`).
- Endpoint serveur qui renvoie **capabilities** + payload **filtré** par statut (Netlify Functions minces, logique dans `packages/*`).
- Preuves de propriété : 5 méthodes (décision 29/10, `00-DECISIONS.md`) : **Google Search Console** (recommandée ; OAuth lecture seule, rôle `siteOwner`), DNS TXT, balise meta, fichier HTML à la racine, fichier `.well-known`. Revérif < 10 min avant tout test actif, trace `audit_log` ; preuve expirée → `unverified` + purge cache.
- Liens public (30 j, `noindex,nofollow`, bandeau) et équipe (lecture seule).
- Anti-abus basique (limites audits / liens, `rate_limits`).

## Interdits stricts
- Envoyer au client une donnée sensible non autorisée (même cachée en CSS).
- Décider les droits côté front.
- `fetch` direct vers un site audité (seulement `safeFetch`).
- `service_role` côté client ; secrets dans logs.
- Stocker/logguer un mot de passe ou un jeton OAuth ; secrets OAuth (client secret) dans le code — config Supabase/Netlify seulement.
- Créer un auth maison (utiliser Supabase Auth).

## Livrables
- Module capabilities (`packages/*`) + handler `netlify/functions/*`
- Parcours inscription/connexion e-mail + mot de passe, Google, GitHub + page/endpoint Vérifier propriété
- Tests : chaque cellule de la matrice (statut × capacité) couverte

## Checklist de fin
- [ ] Payload anonyme : zéro lettre/finding Sécurité/VP/DNS (test qui inspecte le JSON)
- [ ] Brief : anon=aucun / non vérif=PARTIEL / vérifié=COMPLET
- [ ] Test actif refusé si `ctx.verified !== true` ou vérif > 10 min
- [ ] Zod sur toutes les entrées
- [ ] Tests : connexion mdp, OAuth Google/GitHub (mockés), reset mdp, compte non confirmé refusé
- [ ] Plan Opus coché point par point

## Handoff
→ **Agent 03 Moteur d'audit** : contrat capabilities + format payload filtré.
