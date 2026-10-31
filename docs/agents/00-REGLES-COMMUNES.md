# 00 — Règles communes à TOUS les agents Audixio

> À joindre (`@00-REGLES-COMMUNES.md`) dans **chaque** conversation Cursor, avec le fichier de l'agent concerné.
> Chaque règle cite sa source dans le dépôt `C:\Projets\Audigy-Web`. En cas de doute : la source citée fait foi, pas ce résumé.

## 0. Décisions owner 2026-10-29 (canon, priment sur TOUS les docs du dépôt)

- **Notes = lettres A à F.**
- **Thème** : clair par défaut ; dès l'entrée sur une page, adapté automatiquement à la préférence navigateur (`prefers-color-scheme`) → le thème sombre existe (tokens `04-THEME-DARK.md`), sans flash (anti-FOUC). Toggle manuel conservé : **le choix manuel mémorisé prime sur la préférence navigateur** (décidé owner 2026-10-29).
- **Stack conservée** : Astro statique + îlots Svelte + Netlify Functions + Supabase. **Pas Next.js.** On étend le projet existant et ses 7 migrations (`supabase/migrations/`), jamais de réécriture.
- **Auth** = e-mail + mot de passe + OAuth Google et GitHub (Supabase Auth). **Remplace le magic link** (ancienne décision, corrigée dans les docs le 29/10/2026).
- **Langues FR/EN** : aucun texte en dur ; tout passe par `messages/fr.json` / `en.json` ; routage Astro FR `/` + EN `/en/`. Détail et checklist : `docs/produit/FONCTIONNEMENT.md` §12bis (30/10/2026).
- **Stripe / Pro** : gelé jusqu'au feu vert owner (inchangé).

## 1. Ordre de priorité des docs (SSOT)

0. §0 ci-dessus (décisions owner 2026-10-29).
1. `docs/00-DECISIONS.md` — SSOT décisions (gagne en cas de conflit produit). *Source : `.cursor/rules/00-core.mdc`, `docs/LISEZ-MOI.md` §1.*
2. `docs/produit/FONCTIONNEMENT.md` — SSOT produit.
3. `docs/produit/MATRICE-STATUT-DROITS-CANON.md` — SSOT droits (« qui voit quoi »).
4. `docs/produit/SOFT-GATE-PARTIEL-CANON.md` — soft-gate PARTIEL + lock-components.
5. `docs/design/01-REGLES-STRICTES.md` — avant toute UI ; gagne sur Stitch pour le chrome. *Source : `AGENTS.md` §Design.*
6. `docs/etapes/` (une étape) ou `docs/dev/PLAN.md` (une PART) — `PLAN.md` et `QUESTIONS.md` sont **historiques** : ne pas contredire DECISIONS / FONCTIONNEMENT. *Source : `docs/LISEZ-MOI.md` §3–4.*
- **Jamais** utiliser `docs/archive/**` ni `docs/archive/journal/**` comme source pour coder. *Source : `docs/LISEZ-MOI.md` §6–7, `docs/archive/journal/README.md`.*

## 2. Méthode de travail (mode caveman)

- Lire `AGENTS.md`, puis **seulement** l'étape / PART demandée. Max **8 fichiers**. Pas d'exploration large du dépôt. *Source : `AGENTS.md` §Mode caveman, `00-core.mdc`.*
- Avant les outils : **une ligne** listant les fichiers à ouvrir. *Source : idem.*
- Réponses ultra-courtes, seulement le diff utile, **une** question seulement si bloquant (sinon défaut de `docs/produit/QUESTIONS.md`). *Source : `AGENTS.md`.*
- Ne jamais lire `packages/engine/data/**`, `pnpm-lock.yaml`, `node_modules`, builds (sauf chemin exact donné). *Source : `AGENTS.md`, `00-core.mdc`.*
- **Une étape = une conversation Cursor courte** qui pointe vers les docs canon. *Source : routage `audixio-backend-modeles-structure.md` (Méthode) + `AGENTS.md` (« Une PART / une étape »).*
- Une PR par PART ou par étape ; commits conventionnels `feat:` `fix:` `docs:` `test:` `chore:` `refactor:`. *Source : `AGENTS.md` §Qualité.*
- **Pas de `git push`** sans demande explicite de l'owner. *Source : `docs/etapes/00-LISEZ-MOI.md`, `etapes/00-LISEZ-MOI.md` §5.*
- **Ne rien inventer** : pas de feature hors `FONCTIONNEMENT.md`, pas de plugin Cursor inexistant, pas de claim marketing. *Source : `etapes/00-LISEZ-MOI.md`, `AGENTS.md` §Plugins, `couleurs-palette-et-phrases-Cursor.md` §B.6.*

## 3. Marque, langue, copie

- Marque UI = **Audixio**. Les noms techniques `@audigy/*`, `*.audigy.test`, dossier repo restent. *Source : `DECISIONS-OWNER…` §1, `FOOTER-CANON-compact.md`.*
- UI en français d'abord ; toute chaîne visible via `t('clé')`, jamais en dur ; **pas d'emoji**. *Source : `AGENTS.md` §Produit, `00-core.mdc`.*
- Ton : vouvoiement, ≤ 20 mots/phrase, constat → conséquence → action. *Source : `design.mdc`.*
- 5 corrections obligatoires : 8 domaines ; « **passif par défaut** » (jamais « 100 % passif ») ; « **horodaté** » (pas RFC 3161 / scellement) ; jargon hors couche 1 ; « **votre assistant IA** ». *Source : `couleurs-palette-et-phrases-Cursor.md` §B.2, `FONCTIONNEMENT.md` §10.*
- Domaines fictifs d'exemple : `exemple.fr` (convention vue dans `docs/dev/DEV-LOCAL.md` ; lab technique `*.audigy.test`). Jamais un vrai site tiers dans tests/fixtures. *Source : `DEV-LOCAL.md`, `AGENTS.md` §Qualité (« jamais d'appel aux vrais sites »).*

## 4. Les 8 domaines (canon)

Performance · SEO · Sécurité · Écologie · Accessibilité · Qualité technique · Vie privée · DNS / e-mail.
Disponibilité et Réputation **hors** note ; Search Console = une des 5 méthodes (décision 29/10, `00-DECISIONS.md`) : **Google Search Console** (recommandée ; OAuth lecture seule, rôle `siteOwner`), DNS TXT, balise meta, fichier HTML à la racine, fichier `.well-known` ; pas un 9e domaine. *Source : `FONCTIONNEMENT.md` §2, `02-PAGES.md`.*
- Notes UI = **lettres A–F** (pas /100 comme système). *Source : `MATRICE…` §Instruction, `design.mdc`.*

## 5. Soft-gate PARTIEL + droits (non négociable)

- Le **serveur** renvoie un objet **capabilities** ; le front ne décide pas des droits en dur. *Source : `MATRICE…` §Architecture.*
- Ouverts sans vérif : Perf, SEO, Écologie, Qualité ; A11y = option **B1** (lettre A–F + « mesure automatique / partielle », zéro claim RGAA/EAA). Verrouillés : **Sécurité, Vie privée, DNS** (badge Verrouillé, pas de lettre, données **absentes** du payload). *Source : `SOFT-GATE-PARTIEL-CANON.md`.*
- **Interdit** : blur CSS / `display:none` sur une vraie donnée ; nommer HSTS / X-Frame / CSP dans un aperçu verrouillé. *Source : idem §Interdit.*
- Note partielle libellé exact `partielle · N domaines · site non vérifié` ; note globale non calculée/non envoyée tant que non vérifié. *Source : idem §Deux notes.*
- Brief : anonyme = aucun ; compte non vérifié = PARTIEL ; vérifié/Pro = COMPLET ; lien public = aucun ; lien équipe = lecture seule. Brief **pas** réservé au Pro. *Source : `MATRICE…` §Brief.*
- Plafonds gratuits : **2 sites, 1 lien** ; Pro = 10 sites (après go-live). *Source : `MATRICE…`, `FONCTIONNEMENT.md`.*
- Statuts canon : `anon`, `acct_unverified`, `acct_verified`, `pro`, `link_public`, `link_team`. *Source : `MATRICE…` §Statuts.*

## 6. Design (si l'agent touche l'UI)

- Maquettes `docs/design/maquettes/<dossier>/code.html` + `screen.png` = **références figées** du body (pixel-perfect structure). **Ne jamais modifier** les maquettes, leur design, couleurs ou textes sauf demande explicite de l'owner. *Source : `AGENTS.md` §Design, `01-REGLES-STRICTES.md` §4.*
- Stitch **gelé** : ne pas le relancer. *Source : `01-REGLES-STRICTES.md` §1.*
- Couleurs = tokens (`apps/web/src/styles/tokens.css`) **palette v2 (boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`)** ; aucun hex inventé ; aucune teinte décorative (accent, secondaire, bordures) ne code un score — seules les couleurs de notes/statuts le font ; pas de violet, pas de `#000` plein écran. *Source : `couleurs-palette-et-phrases-Cursor.md` §A, `design.mdc`.*
- Charte claire = `docs/design/DESIGN.md` + `03-THEME-LIGHT-ARC-SOFT.md` ; sombre gelé = `04-THEME-DARK.md`. Clair par défaut, puis `prefers-color-scheme` appliqué dès l'entrée (décision owner 2026-10-29). *Source : `design.mdc` + §0.*
- Police shell = **Inter** (auto-hébergée, zéro Google Fonts) ; JetBrains Mono pour valeurs techniques. *Source : `design.mdc`, `couleurs…` §A.4.*
- Logo : uniquement `docs/design/logos/audixio-logos/out/` ; ne jamais régénérer/recolorer. *Source : `01-REGLES-STRICTES.md` §3.*
- Nav : Accueil · Méthode · Sites suivis · Tarifs | FR/EN · thème · Connexion (ou Compte). Footer compact. *Source : `NAV-CANON-desktop-et-mobile.md`, `FOOTER-CANON-compact.md`.*
- Statut = forme + libellé + couleur ; contraste AA ; `prefers-reduced-motion`. *Source : `01-REGLES-STRICTES.md` §6.*

## 7. Sécurité (base)

- Site non vérifié = tests **passifs** seulement ; actifs = propriété vérifiée et **revérifiée < 10 min** avant (tracé `audit_log`). *Source : `AGENTS.md` §Sécurité, `security.mdc`.*
- Réseau sortant vers un site audité : **`safeFetch`** (`packages/net`) uniquement, jamais `fetch` direct. *Source : idem.*
- Aucun secret dans code/tests/logs/commits ; `service_role` côté fonctions seulement ; valider toute entrée (zod). *Source : `AGENTS.md`, `security.mdc`.*
- RLS sur **toutes** les tables + tests RLS ; migrations dans `supabase/migrations`. *Source : `stack.mdc`.*
- Ne rien exploiter, forcer, soumettre : on observe. GitHub Actions interdit comme navigateur public. *Source : `AGENTS.md`.*

## 8. Déploiement et ops

- **Interdit** : `netlify deploy`, liaison Git Netlify, previews, build hooks. Autorisé : `netlify dev`, builds locaux. PART-27 = owner seul. *Source : `AGENTS.md` §Déploiement, `00-core.mdc`.*
- Maximum en local ; go bêta publique = **owner seul**. *Source : `DECISIONS-OWNER…` §9.*

## 9. Qualité et traçabilité

- TypeScript strict ; tests obligatoires (Vitest ; Playwright + axe pour l'UI) ; hors ligne avec fixtures/mocks. Pas de PR sans tests verts. *Source : `AGENTS.md` §Qualité.*
- Fin de chaque étape : cocher la checklist de l'étape et noter ce qui a été fait. ⚠️ Aucun « CHANGELOG » canon n'existe dans le dépôt et `docs/archive/journal/` est déclaré « pas pour coder » → **voir CONTRADICTIONS dans README** : en attendant, noter un résumé dans la description de PR et proposer à l'owner une ligne dans `docs/archive/journal/`.
