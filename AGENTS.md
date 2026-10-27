# AGENTS.md — Audigy

Lire ce fichier. Ensuite seulement la PART demandée dans `docs/PLAN.md`, ou l’étape demandée dans `docs/etapes-refonte/`. Ne pas lire tout le dépôt.

Produit décidé : `docs/FONCTIONNEMENT.md` (26 octobre 2026).

---

## Mode caveman

- Réponses **ultra-courtes**. Pas de récap. Pas de préambule. Pas de reformulation de la demande.
- Montrer **seulement** le diff ou l’extrait utile. Jamais un fichier entier inchangé.
- **Une** question seulement si bloquant. Sinon appliquer le défaut de `docs/QUESTIONS.md`.
- Avant les outils : une ligne listant les fichiers à ouvrir.
- Une PART / une étape = ce fichier + la section ciblée + les fichiers listés seulement. Max 8 fichiers. Pas d’exploration large du dépôt.
- Ne jamais lire `packages/engine/data/**`, `pnpm-lock.yaml`, `node_modules`, builds, sauf chemin exact donné par l’utilisateur.

---

## Produit

- **Double couche** : (1) particuliers — note, 3 priorités, français simple ; (2) dévs / freelances / entreprises — détail domaines, Comment corriger, brief IA.
- Accueil → particulier d’abord + une ligne vers détail/brief. Rapport → verdict en haut, technique repliée.
- **Gratuit sans compte** : audit + aperçu soft-gate (note, scores domaines, priorités config) ; 1 dernier audit navigateur ; pas de brief ; pas de création de lien.
- **Gratuit avec compte** (magic link) : détail + Comment corriger + **brief IA complet** (Rien/Vérif/Fix) ; plafonds **2 sites**, **1 lien** actif ; dernier rapport **par site** (profondeur 1) ; export PDF/MD de base.
- **Pro (futur, après go-live)** : historique long, multi-sites + graphes, Excel/CSV, export client soigné, alertes, rapports signés, plafonds plus hauts. Détail dans `docs/FONCTIONNEMENT.md`. Le brief IA n’est **pas** réservé au Pro.
- UI en français d’abord. Toute chaîne visible passe par `t('clé')` (dictionnaire `fr`), jamais en dur. Pas d’emoji dans l’UI.

---

## Design (obligatoire)

- Charte clair : `docs/DESIGN.md` (fusion MonScore × Arc Soft, PR #66). Sombre gelé : §2.4.
- Avant toute UI (chrome, nav, logo, thème) : `docs/design-pack-2026-10-26/01-REGLES-STRICTES.md`. En conflit avec une maquette Stitch, ce fichier **gagne**.
- Index pack : `docs/design-pack-2026-10-26/00-LISEZ-MOI.md`.
- Mode implémentation Cursor (agents, pixel-perfect body, anims) : `docs/design-pack-2026-10-26/CURSOR-IMPL.md`.
- **Stitch est gelé.** Ne pas le relancer. Body = pixel-perfect HTML+PNG maquette ; chrome = `01-REGLES-STRICTES.md` + `CURSOR-IMPL.md`.
- **Maquettes (images lisibles).** Les PNG `docs/design-pack-2026-10-26/maquettes/**/screen.png` et les `code.html` sont la référence **body pixel-perfect** (ouvrir PNG + HTML ensemble). On implémente les fonctionnalités de `docs/FONCTIONNEMENT.md` et `docs/etapes-refonte/` sur le code existant. En conflit, `01-REGLES-STRICTES.md` gagne. Ignorer les PNG invalides ou ≤ 100 octets (`maquettes/README.md`, `SCREEN-INVALID.txt`).
- **Règles produit nouvelles** (pas déduites des pixels) : 2 sites / 1 lien, soft-gate, brief IA gratuit avec compte, Pro plus tard, vie privée option C. Source : `docs/FONCTIONNEMENT.md`.
- Un seul `AppHeader`. Libellés : **Accueil · Méthode · Sites suivis · Documentation** | **FR/EN** · **Connexion**. Drawer mobile = ces 5 items + FR/EN.
- INTERDIT en nav : Audit actif, Historique, Générateur Brief (famille B), item Progression, Blog/Actu, bottom-bar Diagnostic · Méthode · Sites · Compte.
- Logo uniquement : `docs/design-pack-2026-10-26/assets/logo-icon.jpg` et `logo-lockup.jpg`. INTERDIT : Material `vital_signs`, `ecg_heart`, `graphic_eq`, `shield`, `verified` ; lettre A isolée ; SVG « ECG » inventés.
- Sombre : `04-THEME-DARK.md` + PNG `assets/dark-ref-*.png`. Fond `#0F1620`→`#1A2332`, surface `#161E2C`, encre `#F0F2F5`/`#9AA3B2`, CTA `#2A9B96`. Pas de violet AI-slop, pas de `#000` plein écran.
- Backlog chrome : `06-BACKLOG-CURSOR.md` (P0→P2). Ne pas implémenter `07-PLUS-TARD.md` en passant.
- Corrections promesse (8 domaines, passif par défaut, horodaté, jargon, assistant IA) = **dans le code**, pas Stitch. Voir `docs/FONCTIONNEMENT.md` §10 et `docs/etapes-refonte/04-promesse-et-copie.md`.
- Refonte UI ordonnée : `docs/etapes-refonte/`.

---

## Sécurité (non négociable)

- Site non vérifié = tests **passifs** seulement. Tests actifs = propriété vérifiée **et** revérifiée juste avant (art. 323-1 Code pénal).
- Formulation produit : « **passif par défaut** », jamais « 100 % passif ».
- Tout accès réseau sortant vers un site audité passe par `packages/net` (`safeFetch`, anti-SSRF). Jamais `fetch` direct.
- Aucun secret dans le code, les tests, les logs ou les commits. Noms de variables : `docs/PLAN.md` §9.
- Détails de sécurité d’un site : jamais publics par défaut (table public/masqué + soft-gate).
- Ne rien exploiter, ne rien forcer, ne rien soumettre : on observe.
- GitHub Actions **interdit** comme navigateur de service public.

---

## Qualité

- TypeScript strict. Tests obligatoires (Vitest ; Playwright + axe pour l’UI). Pas de PR sans tests verts.
- Tests hors ligne : fixtures locales et mocks réseau. Jamais d’appel aux vrais sites ni aux vraies API en CI.
- Commits conventionnels : `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`. Une PR par PART ou par étape de refonte.

---

## Déploiement Netlify

- **INTERDIT** en dev : `netlify deploy`, liaison Git Netlify, deploy previews, branch deploys, build hooks.
- **Autorisé** : `netlify dev`, `netlify functions:invoke`, builds locaux, CI GitHub **sans** étape de déploiement.
- Seul le propriétaire fait l’unique déploiement final (**PART-27**). Checklist dans `docs/PLAN.md`.

---

## Plugins / outils (réels du dépôt)

Ne pas inventer de plugins Cursor inexistants. Ce qui est en place :

| Outil | Rôle |
|---|---|
| **pnpm** 10 (`packageManager` racine) | Monorepo, filtres `@audigy/*` |
| **Node** 22 (`engines`: `>=22 <23`) | Runtime |
| **Vitest** | Tests unitaires / intégration |
| **Playwright** | UI + runner navigateur (`@audigy/browser-runner`) |
| **Biome** | Lint / format (`pnpm lint`, `pnpm format`) |
| **Supabase CLI** | `supabase start` en local (Docker) |
| **Netlify CLI** | **dev only** (`netlify dev --offline`) — jamais deploy |
| **TypeScript** | `pnpm typecheck` |
| **Cursor rules** | `.cursor/rules/` : `00-core`, `design`, `security`, `stack` |

Scripts utiles : `pnpm i`, `pnpm check`, `pnpm test`, `pnpm build`. Audit bout-en-bout : `docs/DEV-LOCAL.md` (lab `*.audigy.test`).

---

## Stockage (rappel agents)

- Données compte / sites / rapports / liens / alertes → **serveur Supabase** (local Docker en dev ; distant en prod).
- Pas sur le PC utilisateur sauf affichage et export ponctuel.
- Sans compte → au mieux dernier audit en mémoire navigateur.

---

## Navigateur d’audit (rappel)

- Lancement public = option **C** (« vie privée : bientôt », 7 domaines notés, vie privée Non testé sous seuil 50 %).
- Plus tard option **A** (VPS UE). Pas B (CLI) en voie principale publique.
