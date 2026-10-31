# Agents Audixio — index

Pack de règles par agent, construit à partir des docs de `C:\Projets\Audigy-Web` (lecture seule, 29 oct. 2026).
À placer par exemple dans `docs/agents/` du dépôt.

## Comment l'utiliser dans Cursor
Dans **chaque** conversation, joindre **2 fichiers** : `@00-REGLES-COMMUNES.md` + le fichier de l'agent. Puis indiquer l'étape (une seule).

| Tâche | Fichier à joindre | Modèle | Phase |
|---|---|---|---|
| Schéma Supabase, migrations, RLS | `01-architecte-bdd.md` | Grok 4.7 → revue Opus 5.5 | 1 |
| Capabilities, auth e-mail+mdp+Google/GitHub, preuves, liens | `02-securite-droits.md` | Opus 5.5 plan → Grok 4.7 | 2 |
| Checks, notes A–F, vie privée partielle | `03-moteur-audit.md` | Grok 4.7 | 3 |
| Header, footer, tokens, thèmes (une fois) | `04-shell-ui.md` | Grok 4.7 | 4 (début) |
| Une page (accueil → rapport → compte → sites suivis) | `05-integration-pages.md` | Grok 4.7 + DeepSeek | 4 |
| Tests, fixtures, scripts | `06-tests-scripts.md` | DeepSeek V4.1 Flash | 5 |
| Stripe / Pro (**gelé**) | `07-paiements.md` | Opus 5.5 → Grok 4.7 | 5, après feu vert owner |
| Relecture / sécurité finale | `08-relecteur.md` | Opus 5.5 | fin de phase + 5 |

Secours général : Composer 2.5 (jamais pour une décision sécurité).

## Ordre des agents
`01 → (revue Opus) → 02 → 03 → 04 → 05 (une page par conversation) → motion → 06 → 08 → owner`. `07` seulement après le go-live / feu vert owner.
Phase 0 (design figé, maquettes) = owner, déjà faite : `docs/design/maquettes/`.

## Résolues — décision owner 2026-10-29
- ✅ **Stack** : on garde Astro + Svelte + Netlify Functions + Supabase, pas Next.js ; extension du projet et des 7 migrations (ex-point 1).
- ✅ **Auth** : e-mail + mot de passe + OAuth Google/GitHub ; remplace le magic link des docs (ex-point 2). Les docs ont été corrigées lors de la réorganisation du 29/10/2026 (l'écran `page_lien_email_envoye/` est archivé ; les maquettes de connexion restent à créer). Reste hors docs : `supabase/templates/magic_link.html`.
- ✅ **Notes A–F** (ex-point 4).
- ✅ **Thème** : clair par défaut, adapté dès l'entrée à `prefers-color-scheme` ; sombre existe ; le choix manuel mémorisé prime sur le navigateur (ex-point 6).
- ⏸ **Stripe / Pro** : reste gelé jusqu'au feu vert owner (ex-point 3, inchangé).

## Contradictions encore ouvertes

### A. Brief owner (phases) ↔ docs du dépôt
5. **Statuts** : brief à 4 niveaux vs 6 statuts canon de la matrice (anon, non vérifié, vérifié, Pro, lien public, lien équipe).
7. **« Mise en ligne »** vs interdiction de déployer (owner seul, PART-27 ; `AGENTS.md`, `00-core.mdc`).
8. **Ordre pages « dashboard »** : le terme est interdit en UI → « Sites suivis » (`couleurs…` §B.3).
9. **Changelog / journal** : aucun CHANGELOG canon dans le dépôt ; `docs/archive/journal/` = « pas pour coder ». À décider où l'agent note ses étapes.

### B. Contradictions internes aux docs
10. `etapes/00-LISEZ-MOI.md` étape 02 mentionne un **« drawer »** ; `NAV-CANON…` interdit le drawer hamburger pour la nav principale.
11. `01-REGLES-STRICTES.md` §1 pointe le dark vers `docs/archive/…/dark-theme-tokens.md`, alors que l'archive est interdite pour Cursor (`docs/LISEZ-MOI.md`). Utiliser `04-THEME-DARK.md`.
12. Police : `DESIGN.md` / `03-THEME` = Atkinson/Outfit ; shell = **Inter** (résolu par `design.mdc` : Inter gagne sauf OK owner).
13. `MATRICE`/`SOFT-GATE` citent des specs dans `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/` comme sources, malgré l'interdiction de l'archive.
14. `etapes/00-LISEZ-MOI.md` : note quota Cursor « ~1 %, privilégier Gemini » — obsolète vs le routage de modèles actuel.
15. Export lien équipe : « NON (masqué) sauf règle owner contraire » — non tranché (`MATRICE`).
16. `User-Agent: AudixioBot` (`security.mdc`) — renommé le 29/10 ; le code doit suivre.
17. « Audit rapide » pastille dans la nav : optionnelle, pas canon (`00-core.mdc`, `maquettes/INDEX.md`).

## Ce qui manque
- Pas de fichier d'étapes **par phase 0–5** dans le dépôt (seulement `etapes/01–10` et les PART de `PLAN.md`) : à créer si l'owner garde le découpage en phases.
- Pas de règle écrite pour le changelog (voir 9).
- Spec Stripe / Pro inexistante.
- Non lus en entier (taille / pas nécessaires) : `docs/design/DESIGN.md`, `METHODE.md`, `PLAN.md` complet, `etapes/01–10` (sauf 00), `06-BACKLOG.md`, `03-THEME…`, `04-THEME-DARK.md`, `05-LOGO.md`. `.env` volontairement non lu.
