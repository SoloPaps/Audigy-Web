> **HISTORIQUE / architecture** — ce fichier sert aux PART et à la checklist déploiement.  
> **Ne pas contredire** `docs/00-DECISIONS.md`, `docs/produit/FONCTIONNEMENT.md`, `MATRICE-STATUT-DROITS-CANON.md`, `SOFT-GATE-PARTIEL-CANON.md`.  
> Soft-gate PARTIEL + lock (28 oct 2026 soir) : scores UI = lettres **A–F** ; hub = **TOP 10 titres** + 8 cartes (pas 3 priorités détaillées) ; un design **COMPLET** + Verrouillé. Mentions /100 ou « top 3 » ci-dessous = **héritage** — ne pas coder ainsi.
# Audixio — Plan de réalisation

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Connexion = **e-mail + mot de passe**, ou **Google / GitHub**. Plus de magic link.
> - Vérification de propriété = **5 méthodes** : Google Search Console (recommandée, OAuth lecture seule « siteOwner »), DNS TXT, balise meta, fichier HTML à la racine, fichier `.well-known`. Remplace les « vagues » de preuves du 28/10 et « GSC ≠ vérification » du 27/10.
> - Stripe / Pro **gelés** : liste d'attente seulement. Popup Pro uniquement quand la limite est atteinte (gratuit : 2 sites, 1 lien actif).
> - Stack conservée : Astro + Svelte + Netlify Functions + Supabase (pas de Next.js).
> - Notes **A à F** (E et F ajoutées). Pas de /100.

Statut : plan validable, aucun code applicatif. Langue de l'UI : français (i18n prêt).
Légende : **(V)** vérifié le 23/10/2026 sur la doc officielle · **(NV)** non vérifié, à confirmer au moment de la PART concernée.

---

## 0. Mode d'emploi (économie de tokens)

- Une PART = une conversation neuve = une branche = une PR.
- L'agent lit seulement : `AGENTS.md`, la section de la PART (§15) et les fichiers listés dans « Contexte ». Les interfaces partagées sont décrites ici (§5) pour éviter de relire le code.
- Modèle : **Fort** (modèle frontier, effort élevé) seulement quand c'est marqué. Sinon **Éco** (Auto / modèle rapide).
- Prompt type à coller :

```text
Lis AGENTS.md puis docs/dev/PLAN.md §15 « PART-XX » et seulement les fichiers listés en Contexte.
Réalise uniquement cette PART, tests inclus, sur une branche feat/part-XX-<nom>. Ouvre une PR. Pas de récap.
```

---

## 1. Produit

Audixio audite un site et rend, pour un particulier non technicien :
- un **score global /100** et un score /100 par domaine, avec une phrase simple et une action ;
- une **liste de corrections priorisées** en français clair, adaptées à l'hébergeur (Netlify, GitHub Pages, générique) ;
- un **historique** (courbes), des **audits planifiés**, des **alertes**, un **résumé hebdomadaire** ;
- un **rapport probant** : empreinte SHA-256, horodatage RFC 3161, lien et QR de vérification, PDF et page web partageable.

Domaines notés : Performance · SEO · Sécurité · Écologie · Accessibilité · Qualité technique · Vie privée/RGPD · DNS/e-mail.
Affichés à part (non inclus dans le global, cf. Q21) : Réputation (avis Google) · Disponibilité (uptime %).

**MVP v1** = PART 00 à 17 : l'outil tourne en local (`netlify dev` + CLI) sur les 2 sites du propriétaire :
- `https://angelique-osteo.fr` (Netlify, domaine propre : tous les domaines testables) ;
- `https://solopaps.github.io/Projet-Site-Artiste/` (GitHub Pages, portée = chemin : DNS/e-mail « Non applicable », en-têtes HTTP non modifiables chez GitHub Pages → correction proposée = alternative honnête).

Les PART 18 à 26 complètent le périmètre (preuve, Search Console, suivi, ouverture au public). PART 27 = déploiement unique.

---

## 2. Contraintes des offres gratuites

| Service | Limite | Conséquence pour Audixio |
|---|---|---|
| Netlify Free | 300 crédits/mois, plafond dur ; **15 crédits par déploiement de production** ; previews/branch deploys gratuits ; crédits épuisés = **tous les projets de l'équipe en pause** (V) | Un seul déploiement. **Équipe Netlify séparée de celle d'angelique-osteo.fr** (Q1) sinon Audixio peut mettre angelique-osteo.fr hors ligne. |
| Netlify Functions | sync 60 s · scheduled 30 s · background 15 min · payload background 256 Ko · 1024 Mo par défaut ; calcul = 10 crédits/GB-h (V) | Un audit est toujours **asynchrone** (background). Scheduled ne fait que planifier. |
| Netlify région Functions | Choix de région = Pro/Enterprise ; défaut `cmh` (Ohio, US) (V) | En gratuit, le traitement serveur se fait aux US. Données perso minimisées côté fonctions ; stockage en UE (Q2). |
| Netlify bande passante / requêtes | 20 crédits/Go · 2 crédits/10 000 requêtes (V) | Site Audixio léger (< 500 Ko accueil). Les requêtes d'audit coûtent aussi des crédits au **site audité** s'il est sur Netlify → budget de requêtes (§11). |
| Supabase Free | 500 Mo DB · 1 Go stockage · 5 Go egress · 50 000 MAU · 2 projets · **pause après 1 semaine d'inactivité** (V) | Activité hebdo assurée par les audits planifiés. Rétention des artefacts (Q11). |
| Supabase Edge Functions | 2 s CPU/requête, 150 s wall clock (V) | Inutilisables pour les audits. Non utilisées. |
| GitHub Actions (repo privé) | ~2 000 min/mois sur GitHub Free (NV) ; arrondi à la minute par job (NV) | OK pour CI + runner navigateur hebdo. **Pas** pour l'uptime (2 880 jobs/mois). |
| PageSpeed Insights API | clé requise (sans clé : quota 0) ; quota non publié, 25 000/j et 240/min cités en 2022 ; 120 s max par appel (NV) | Appels depuis background uniquement ; 1 audit / hôte / 15 min. |
| CrUX dans PSI | Google annonce le retrait des données terrain de l'API PSI (V) | Données terrain via **CrUX API** directement. |

Estimation crédits Netlify/mois (2 sites, NV) : audits hebdo ≈ 2 · uptime 15 min ≈ 12 · trafic app ≈ 5 → **~20 à 40 crédits**, + 15 pour l'unique déploiement.

---

## 3. Architecture

```text
Navigateur ── Astro statique (FR) + îlots Svelte ─────────────┐
   │ auth + lectures directes (RLS)                         │ POST /api/*
   ▼                                                        ▼
Supabase UE (Postgres, Auth, Storage)  ◄── écrit ──  Netlify Functions
   ▲                                                  ├─ api-*                  (sync ≤ 60 s, validation, file d'attente)
   │                                                  ├─ audit-run-background   (≤ 15 min) → packages/engine
   │                                                  │     checks HTTP/DNS/TLS + PSI + CrUX + API publiques
   │                                                  ├─ schedule-tick          (scheduled ≤ 30 s) → uptime + mise en file
   │                                                  └─ dispatch ─► GitHub Actions browser-audit.yml
   └──────────── écrit ─── Runner navigateur (Playwright : axe, cookies, captures, WARC, PDF)
                           exécutable : GitHub Actions (v1) | CLI locale | Tauri (après v1)
```

Principes :
1. **Moteur pur et portable** (`packages/engine`) : mêmes checks en fonction Netlify, CLI locale, GitHub Actions, puis Tauri.
2. **Deux exécuteurs** : sans navigateur (fonctions, peu coûteux) et avec navigateur (Playwright, hors Netlify). Si le runner navigateur n'a pas tourné, les checks concernés sont « Non testé » avec la raison. Rien n'est caché.
3. **Pas de Lighthouse dans une fonction** : Chromium dans une fonction serverless est lourd (taille du bundle, mémoire, démarrage à froid, crédits) et bruité. PSI exécute Lighthouse chez Google, gratuitement, en ≤ 120 s : compatible background (15 min), incompatible sync (60 s).
4. **Front 100 % statique** : zéro crédit de calcul pour l'affichage, même build réutilisé par Tauri.
5. **Dev sans déploiement** : tout tourne avec `netlify dev`, `netlify functions:invoke`, Supabase local (`supabase start`, Docker) et la CLI.

---

## 4. Stack justifiée

| Choix | Pourquoi | Alternatives écartées |
|---|---|---|
| pnpm workspaces, Node 22, TypeScript strict, ESM | monorepo simple, un seul langage du front au runner | Turborepo (inutile à cette taille) |
| Biome | lint + format en un outil rapide, peu de config | ESLint + Prettier (plus de deps) |
| Vitest, Playwright Test, @axe-core/playwright | unitaires rapides ; e2e + a11y de l'UI Audixio | Jest |
| Astro (sortie statique) + îlots Svelte | 0 JS par défaut (accueil < 500 Ko), routage i18n, statique réutilisable par Tauri | Next.js (SSR, plus lourd, crédits) |
| Netlify Functions v2 (Web `Request/Response`) | imposé ; background 15 min gratuit (V) | Edge Functions Netlify (limites CPU) |
| Supabase (Postgres, Auth e-mail + mot de passe / Google / GitHub, Storage, RLS) région UE | gratuit, Postgres standard, RLS, pas de serveur | Netlify Database (calcul facturé en crédits, région NV) |
| Brevo (SMTP/API) | entreprise FR, offre gratuite ~300 e-mails/j (NV) ; le SMTP par défaut de Supabase est trop limité (NV) | Resend (US) |
| uPlot (graphiques) | léger, styles de trait, bandes de seuil ; conseillé par DESIGN.md | Observable Plot (dépend de d3, plus lourd) |
| zod | validation des entrées et des résultats de check | — |
| undici + ipaddr.js | `safeFetch` avec IP épinglée et classification IPv4/IPv6 | `fetch` brut (SSRF) |
| cheerio | parsing HTML côté serveur | jsdom (lourd) |
| html-validate | validité HTML locale, hors ligne | instance publique W3C Nu (usage limité, NV) |
| @tgwf/co2 (CO2.js, Apache-2.0) | modèle SWD, calcul local | API Website Carbon (même modèle, dépendance externe inutile) |
| axe-core (MPL-2.0) | référence a11y, base de la correspondance RGAA | — |
| pkijs + asn1js | requêtes/réponses RFC 3161 et vérification | openssl en sous-processus (non portable) |
| `canonicalize` (JCS RFC 8785), `node:crypto` (SHA-256, Ed25519) | sérialisation déterministe avant hachage ; signature sans dépendance | — |
| warcio (Webrecorder) | écriture WARC 1.1 (API Node NV) | conversion HAR maison |
| qrcode | QR de vérification dans le PDF | — |

Licences des jeux de données (NV, à vérifier en PART 12 et 14) : signatures retire.js (Apache-2.0), DuckDuckGo Tracker Radar (CC BY-NC-SA) — **MAJ 28 oct soir : PAS au lancement** tant que licence commerciale / liste alternative OK (owner) ; bêta = tests partiels HTTP/HTML sans DDG ni navigateur d'audit, fingerprints type Wappalyzer (souvent GPL : à éviter, liste maison préférée).

---

## 5. Moteur d'audit (contrats partagés)

### 5.1 Interfaces (spécification, pas du code final)

```ts
type Domain = 'performance' | 'seo' | 'securite' | 'ecologie' | 'accessibilite'
  | 'qualite' | 'vie_privee' | 'dns_email' | 'reputation' | 'disponibilite';
type Status = 'pass' | 'warn' | 'fail' | 'untested' | 'na';

interface Check {
  id: string;                       // 'securite.hsts'
  domain: Domain;
  mode: 'passive' | 'active';       // active => site vérifié obligatoire
  needs: Array<'http' | 'dns' | 'tls' | 'psi' | 'crux' | 'browser' | 'gsc' | 'places'>;
  weight: 1 | 2 | 3;                // importance dans le score du domaine
  run(ctx: CheckContext): Promise<CheckResult>;
}

interface CheckContext {
  target: { url: URL; scope: 'origin' | 'path'; hosting: 'netlify' | 'github_pages' | 'other' };
  verified: boolean;                // propriété vérifiée et revérifiée < 10 min
  net: { fetch: SafeFetch; dns: DohResolver; tls: TlsProbe };
  shared: SharedArtifacts;          // page d'accueil, PSI, CrUX, données runner : récupérés une fois
  budget: RequestBudget;            // plafond de requêtes vers le site audité
  now(): Date;
}

interface CheckResult {
  status: Status;
  score?: number;                   // 0..1 (défaut : pass 1, warn 0.5, fail 0)
  severity: 1 | 2 | 3 | 4;          // 4 = le plus grave
  impact: 1 | 2 | 3;
  measured?: Record<string, unknown>; // valeurs observées (preuve)
  messageKey: string;               // clé i18n : constat en français simple
  params?: Record<string, string | number>;
  fixKey?: string;                  // fiche de correction
  reason?: string;                  // si untested/na : pourquoi, en clair
}
```

### 5.2 Score
- Score de domaine = `round(100 × Σ(weight × score) / Σ(weight))` sur les checks `pass|warn|fail`. `untested` et `na` exclus.
- **Couverture** du domaine = poids testé / poids total. < 50 % → domaine « Non testé » (pas de chiffre trompeur).
- Score Lighthouse (PSI) = un check de poids 3 dans son domaine ; les checks maison complètent.
- Global = moyenne des domaines notés parmi les 8 principaux (pondération égale par défaut, Q21). Couverture globale affichée.
- Niveaux : 80–100 Bon · 50–79 À améliorer · 0–49 Problème · — Non testé (DESIGN.md §4).
- Priorité des corrections : sévérité, puis impact, puis effort croissant.
- `method_version` (ex. `2026.1`) stockée sur chaque audit ; page publique « Méthode » versionnée. Toute modification de pondération = nouvelle version.

### 5.3 Fiches de correction
`packages/engine/fixes/fr/<check-id>.md` avec en-tête : `title`, `why` (1 phrase), `effortMinutes`, `sources` (CNIL, MDN, ANSSI, RGAA, Google), puis variantes `netlify` / `github_pages` / `generic` (étapes numérotées, bloc copiable). Si l'hébergeur empêche la correction, la fiche le dit et propose une alternative.

### 5.4 Passif / actif (définition opposable)
- **Passif** (tout site) : ce qu'un visiteur ou un moteur de recherche ferait. GET de pages publiques liées (≤ 50 requêtes, 1 req/s), `robots.txt`, `sitemap.xml`, `/.well-known/security.txt`, un handshake TLS, requêtes DNS publiques, API tierces (PSI, CrUX, Green Web…), chargement de la page par le runner navigateur sans interaction.
- **Actif** (site vérifié uniquement) : chemins non liés (fichiers exposés : `/.git/HEAD`, `/.env`, sauvegardes…), énumération des versions TLS, crawl > 50 pages, tout ce qui dépasse le budget passif.
- Jamais : exploitation, injection, force brute, soumission de formulaire, test de charge.

---

## 6. Domaines, checks et sources

| Domaine | Checks principaux | Source / outil | Mode | Exécuteur |
|---|---|---|---|---|
| Performance | score Lighthouse mobile + desktop, LCP/INP/CLS terrain, poids total, cache, compression | PSI, CrUX API | passif | fonction |
| SEO | Lighthouse SEO, `robots.txt`, sitemap (validité, URLs 200), noindex / X-Robots-Tag, canonical, title/description, hreflang, JSON-LD (parse + types schema.org de base), indexation (Search Console) | PSI, maison, Search Console API | passif | fonction |
| Sécurité | HTTPS + redirection, HSTS, CSP, X-Content-Type-Options, frame-ancestors/X-Frame-Options, Referrer-Policy, Permissions-Policy, cookies (Secure/HttpOnly/SameSite), certificat (expiration, chaîne, SAN), contenu mixte, `security.txt`, technos + CVE ; actif : fichiers exposés, versions TLS | grille inspirée de MDN HTTP Observatory, `tls`, OSV.dev, NVD, CISA KEV | passif + actif | fonction (+ runner pour contenu mixte dynamique) |
| Écologie | EcoIndex (DOM, requêtes, poids), CO2/visite (CO2.js SWD), hébergeur vert, sous-ensemble automatisable RGESN + questionnaire guidé | CO2.js, Green Web Foundation, méthode EcoIndex, RGESN | passif | fonction + runner |
| Accessibilité | Lighthouse a11y, axe-core complet, correspondance RGAA 4.1 (partielle, dite comme telle) | PSI, axe-core | passif | fonction + runner |
| Qualité technique | liens cassés internes/externes (crawl borné), validité HTML, images lourdes / formats / dimensions, erreurs console | maison, html-validate, PSI, runner | passif | fonction + runner |
| Vie privée/RGPD | cookies et traceurs déposés **avant** consentement, présence et type de CMP, bouton « Tout refuser » au 1er niveau, mentions légales, politique de confidentialité, polices/scripts tiers | runner, liste de traceurs, lignes directrices CNIL | passif | runner + fonction |
| DNS/e-mail | MX, SPF (syntaxe, ≤ 10 lookups), DKIM (sélecteurs courants), DMARC (politique, rua), CAA, DNSSEC, MTA-STS, TLS-RPT | DoH | passif | fonction |
| Réputation | note et nombre d'avis Google | Places API (New), optionnel | passif | fonction |
| Disponibilité | HEAD/GET toutes les 15 min, incidents, % sur 30 jours, temps de réponse | maison | passif | scheduled |

Écrire « Nous n'avons pas pu tester… » quand une source manque (quota, clé absente, runner absent).

---

## 7. API externes et quotas

| API | Usage | Accès | Quota connu | Statut |
|---|---|---|---|---|
| PageSpeed Insights v5 | Lighthouse mobile/desktop | clé API Google | non publié ; 25 000/j, 240/min cités (2022) ; 120 s/appel | clé requise (V) ; quota (NV) |
| CrUX API + CrUX History API | données terrain 28 j + historique | même clé | ~150 req/min (NV) | remplace CrUX dans PSI (V) |
| Search Console API | sitemaps, URL Inspection, performances | OAuth `webmasters.readonly` | URL Inspection ~2 000/j/propriété, ~600/min (NV) | app OAuth en mode « test » → jetons expirant en 7 j (NV), cf. Q14 |
| MDN HTTP Observatory API v2 | comparaison optionnelle | aucun | ~1 scan/hôte/min (NV) | grille recalculée en local par défaut |
| Green Web Foundation greencheck v3 | hébergeur vert | aucun | non publié (NV) | — |
| OSV.dev | CVE des bibliothèques JS détectées | aucun | non publié (NV) | — |
| NVD API 2.0 | CVE par CPE | clé optionnelle | 5 req/30 s sans clé, 50 avec (NV) | cache 24 h obligatoire |
| CISA KEV | vulnérabilités exploitées | fichier JSON public | — | cache 24 h |
| DoH (dns.google, cloudflare-dns.com) | DNS + drapeau DNSSEC | aucun | non publié (NV) | — |
| Google Places API (New) | note + nombre d'avis | clé + **compte de facturation** | paliers gratuits mensuels par SKU (NV) | optionnel (Q13) |
| Brevo | alertes, résumé hebdo, e-mails de compte (confirmation, mot de passe oublié) | clé API / SMTP | ~300 e-mails/j (NV) | — |
| TSA RFC 3161 | horodatage | aucun | FreeTSA, DigiCert, Sectigo : conditions d'usage (NV) | **non qualifié eIDAS** ; qualifié = prestataire de la liste de confiance UE, en général payant (NV), cf. Q9 |
| SSL Labs API v4 | — | enregistrement requis, usage non commercial (NV) | — | hors v1 |

Règle : toute réponse d'API tierce est mise en cache (clé = API + cible + jour) et chaque appel vit derrière un adaptateur mockable.

---

## 8. Modèle de données (Supabase, RLS partout)

| Table | Colonnes clés | Notes |
|---|---|---|
| `profiles` | `id` (= auth.users), `display_name`, `locale` ('fr'), `weekly_digest` bool, `created_at` | — |
| `sites` | `id`, `owner_id`, `url`, `scope` ('origin'/'path'), `host`, `path_prefix`, `label`, `hosting` (auto-détecté), `public_slug` unique null, `is_public`, `deleted_at` | unicité (`owner_id`, `url`) |
| `site_verifications` | `id`, `site_id`, `method` ('dns_txt'/'file'/'meta'), `token`, `status` ('pending'/'verified'/'failed'/'expired'), `verified_at`, `last_checked_at`, `evidence` jsonb | revérification avant actif + quotidienne |
| `audits` | `id`, `site_id`, `trigger` ('manual'/'schedule'), `mode` ('passive'/'active'), `status` ('queued'/'running'/'partial'/'done'/'failed'), `method_version`, `engine_version`, `global_score`, `coverage`, `started_at`, `finished_at`, `error` | file d'attente via `FOR UPDATE SKIP LOCKED` (RPC) |
| `domain_scores` | PK (`audit_id`, `domain`), `score` null, `coverage`, `level` | — |
| `findings` | `id`, `audit_id`, `domain`, `check_id`, `status`, `severity`, `impact`, `score`, `measured` jsonb, `message_key`, `params` jsonb, `fix_key`, `effort_minutes` | ~150 lignes/audit |
| `artifacts` | `id`, `audit_id`, `kind` ('json'/'pdf'/'screenshot'/'warc'/'tsr'/'sig'), `storage_path`, `sha256`, `bytes` | Storage privé |
| `reports` | `id`, `audit_id`, `share_token` (128 bits), `visibility` ('private'/'link'/'public'), `manifest_sha256`, `tsa`, `tsa_gen_time`, `signature`, `revoked_at` | page `/verifier/<id>` |
| `schedules` | `site_id`, `cadence` ('weekly'/'monthly'), `next_run_at`, `enabled`, `mode` | — |
| `uptime_checks` | `site_id`, `checked_at`, `ok`, `status_code`, `ms` | brut 30 j puis agrégé |
| `uptime_daily` | `site_id`, `day`, `checks`, `failures`, `p50_ms` | — |
| `incidents` | `id`, `site_id`, `started_at`, `resolved_at`, `cause` | — |
| `alerts` | `id`, `user_id`, `site_id`, `kind`, `payload`, `sent_at` | anti-doublon |
| `oauth_tokens` | `user_id`, `provider`, `scope`, `refresh_token_enc` bytea, `created_at` | AES-256-GCM, clé hors DB |
| `rate_limits` | `key`, `window_start`, `count` | IP jamais stockée en clair (hash + sel du jour) |
| `audit_log` | `id`, `actor`, `action`, `target`, `at`, `details` | trace des vérifications et tests actifs |
| `terms_acceptances` | `user_id`, `version`, `accepted_at` | — |

Volumétrie : ~50 Ko de findings par audit → ~5 Mo/an pour 2 sites en hebdo. Le stockage (1 Go) est le vrai plafond : captures WebP ~200 Ko, PDF ~300 Ko, WARC 2–5 Mo (uniquement sur rapport probant, Q11).

---

## 9. Variables d'environnement (noms seulement, jamais de valeur dans le repo)

`SUPABASE_URL`, `SUPABASE_ANON_KEY` (publique), `SUPABASE_SERVICE_ROLE_KEY` (fonctions/runner), `GOOGLE_API_KEY` (PSI + CrUX, restreinte à ces API), `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `TOKEN_ENC_KEY`, `SIGNING_PRIVATE_KEY`, `BREVO_API_KEY`, `GH_DISPATCH_TOKEN` (fine-grained, `actions:write` sur ce repo seul), `NVD_API_KEY` (opt.), `PLACES_API_KEY` (opt.), `APP_BASE_URL`.
Local : `.env` (ignoré par git) + `.env.example` (noms vides). Prod : interface Netlify (PART 27). CI : GitHub Secrets.

---

## 10. Arborescence cible

```text
apps/web/                 Astro statique (pages, composants, i18n, styles/tokens.css, fonts/)
netlify/functions/        handlers fins : api-*, audit-run-background, schedule-tick, digest-weekly, oauth-*
packages/net/             safeFetch, DoH, sonde TLS, budget de requêtes
packages/engine/          checks/<domaine>/*, runner, scoring, fixes/fr/*.md, data/ (RGAA, traceurs)
packages/browser-runner/  Playwright : axe, cookies/traceurs, captures, WARC, PDF
packages/evidence/        JCS, SHA-256, RFC 3161, signature, manifeste
packages/db/              client typé, requêtes, types générés
packages/cli/             `audigy audit <url>` (local)
supabase/migrations/      SQL + tests RLS
fixtures/sites/           sites de test locaux (bons et mauvais) servis en CI
scripts/                  garde-fous (no-deploy, copy-lint)
.github/workflows/        ci.yml (sans déploiement), browser-audit.yml (workflow_dispatch)
docs/                     PLAN, QUESTIONS, DESIGN, METHODE (publique), legal/
```

---

## 11. Sécurité et cadre légal

**Anti-SSRF (`safeFetch`)** : schémas http/https ; ports 80/443 ; résolution DNS puis refus des plages privées, réservées, loopback, link-local (169.254.0.0/16, métadonnées cloud), CGNAT 100.64.0.0/10, multicast, IPv6 ULA/link-local, IPv4 mappées en IPv6, notations décimale/octale/hexa ; **IP épinglée** pour la connexion (anti DNS rebinding) ; revalidation à chaque redirection (max 5) ; réponse plafonnée (5 Mo HTML, 20 Mo total) ; délai 10 s ; pas de cookies ni d'identifiants ; `User-Agent: AudixioBot/1.0 (+<url>/robot)`.

**Respect des sites audités** : budget passif ≤ 50 requêtes et 1 req/s par hôte ; `robots.txt` respecté pour le crawl ; 1 audit / hôte / 15 min ; uptime en HEAD (repli GET minimal).

**Vérification de propriété** (prérequis du mode actif) :
- DNS TXT : `_audigy-challenge.<domaine>` = `audigy-site-verification=<jeton>` (portée : tout le domaine).
- Fichier : `<portée>/audigy-verification.txt` contenant le jeton. Pour GitHub Pages, éviter `/.well-known/` (dossiers à point ignorés par Jekyll sans `.nojekyll`).
- Balise : `<meta name="audigy-verification" content="<jeton>">` sur la page de la portée.
- Une portée « chemin » (`solopaps.github.io/Projet-Site-Artiste/`) n'autorise les tests actifs **que** sous ce chemin.
- Revérifiée < 10 min avant chaque audit actif et chaque jour ; disparition = statut `expired`, retour au passif, notification.
- Chaque vérification et chaque test actif est tracé dans `audit_log`.
- Texte légal : tests actifs sans autorisation = risque pénal (art. 323-1 Code pénal) ; la CGU fait déclarer que l'utilisateur est propriétaire ou mandaté.

**Données** : stockage en UE (Supabase) ; fonctions Netlify aux US en gratuit (Q2) ; aucun traceur tiers, aucune police distante ; seuls stockages strictement nécessaires (session) → pas de bannière cookies ; registre des traitements dans `docs/legal/`.

**Publicité des résultats** : la page publique et le lien partagé montrent les scores, jamais le détail des failles de sécurité (sauf choix explicite du propriétaire).

---

## 12. Rapports probants

1. Fin d'audit → `results.json` canonique (JCS RFC 8785) : cible, IP résolue, empreinte du certificat TLS, UA, viewport, versions (moteur, méthode, Lighthouse), findings.
2. Artefacts : captures (mobile + desktop, WebP), WARC de la page d'accueil (sur demande), PDF. SHA-256 de chacun.
3. `manifest.json` = liste {fichier, sha256, octets} + sha256 de `results.json` ; son SHA-256 = **empreinte du rapport**.
4. Horodatage RFC 3161 de l'empreinte auprès de **2 TSA** indépendantes (robustesse) ; stockage des jetons `.tsr` et chaînes de certificats.
5. Signature optionnelle Ed25519 du manifeste par la clé Audixio ; clé publique publiée (`/.well-known/audigy-signing-key`). Signature PAdES dans le PDF : après v1.
6. PDF : identifiant du rapport, empreinte de `results.json`, date (Europe/Paris), URL de vérification + QR. Le PDF ne peut pas contenir sa propre empreinte : la page de vérification la retrouve dans le manifeste.
7. Page `/verifier/<id>` : l'utilisateur dépose le PDF ou le JSON, le hachage se fait **dans le navigateur** (WebCrypto, fichier jamais envoyé), comparaison au manifeste, affichage des jetons TSA (heure, émetteur) et de la signature. Doc expert : `openssl ts -verify`.
8. Mentions obligatoires sur le rapport et la page :
   - « Ce rapport n'est pas un constat de commissaire de justice et n'en a pas la valeur. Il décrit ce que nos robots ont observé, à la date indiquée. »
   - « Horodatage RFC 3161 non qualifié au sens d'eIDAS » tant qu'une TSA qualifiée n'est pas utilisée. Un horodatage non qualifié reste recevable comme preuve (eIDAS art. 41.1) mais sans présomption d'exactitude (art. 41.2) (formulation à faire valider, Q12).

---

## 13. Différenciation

| Concurrent | Positionnement observé (23/10/2026) | Ce qu'Audixio fait autrement |
|---|---|---|
| WebProbe (webprobe.fr) | FR, orienté technique ; preuve DNS TXT, mode « Deep », CVE NVD/KEV ; RGPD délégué à StackLégal | Public non technicien ; corrections pas à pas selon l'hébergeur ; écologie (RGESN, EcoIndex), RGAA et RGPD notés ; rapport horodaté vérifiable publiquement |
| Full Stack Audit (fullstackaudit.com) | EN, développeurs, très large (Lighthouse, DNS, e-mail, « AI visibility »), bêta, gratuit limité | FR d'abord, référentiels français (RGAA, RGESN, CNIL), 100 % gratuit, zéro traceur, méthode publique versionnée |
| Pulso (heypulso.com, à confirmer Q25) | Maintenance WordPress payante ; rapport gratuit « top 3 », audit PDF 25 $ | Gratuit, autonome, tout site statique, explique comment corriger soi-même |
| (aussi) TestMonSite | FR, gratuit, sans compte, 30 s, ~40 critères | Suivi dans le temps, alertes, preuve, honnêteté sur la couverture (« Non testé ») |

Promesses distinctives : 1) chaque score s'explique et donne une action ; 2) « Non testé » plutôt qu'un faux chiffre ; 3) corrections adaptées à l'hébergeur, y compris « impossible chez cet hébergeur, voici l'alternative » ; 4) rapport scellé et vérifiable ; 5) Audixio obtient lui-même ≥ 90 partout (auto-audit en recette).

---

## 14. Garde-fous « pas de déploiement »

- Aucun site Netlify lié au repo GitHub. Pas de build hook, pas de deploy preview, pas de branch deploy.
- `scripts/guard-no-deploy` exécuté en CI : échec si un workflow, un script `package.json` ou `netlify.toml` contient `netlify deploy`, `nwtgck/actions-netlify`, `NETLIFY_AUTH_TOKEN`, un build hook ou un contexte de déploiement.
- `netlify.toml` ne contient que la config de build locale, des fonctions et des en-têtes.
- Les fonctions planifiées ne tournent qu'en production : en dev, on les invoque à la main (`netlify functions:invoke schedule-tick`).

---

## 15. PARTS

Format : **Objectif** · Contexte (à lire) · Livrables · Critères d'acceptation (CA) · Modèle · Dépend de.

### Phase A — Socle

**PART-00 — Bootstrap monorepo et CI**
- Objectif : squelette pnpm, TS strict, Biome, Vitest, CI GitHub sans déploiement.
- Contexte : AGENTS.md, §4, §10, §14.
- Livrables : `package.json` racine, workspaces vides, `tsconfig` base, `biome.json`, `.nvmrc`, `.env.example`, `ci.yml` (install, lint, typecheck, test, build), `scripts/guard-no-deploy`, `netlify.toml` minimal (dev seulement).
- CA : `pnpm i && pnpm check` vert en local et en CI ; le garde-fou échoue sur un workflow de test contenant `netlify deploy` ; aucune liaison Netlify.
- Modèle : Éco. Dépend de : —

**PART-01 — Design system**
- Objectif : tokens, polices auto-hébergées, layout, composants de base.
- Contexte : docs/design/DESIGN.md (entier), §10.
- Livrables : `tokens.css` (clair/sombre, `prefers-color-scheme` + bascule mémorisée), polices woff2 latines, layout (lien d'évitement, `lang="fr"`), composants : `ScoreGauge` (arc 270°), `StatusMark` (forme + libellé), `CategoryList`, `FindingList` (filtres + `<details>`), `Button`, `ReportFooter` (mono), `DataTable` ; page `/dev/composants` exclue du build prod.
- CA : checklist DESIGN §9 cochée ; Playwright + axe 0 violation (clair et sombre) ; Lighthouse a11y 100 en local ; 0 requête tierce ; reflow 320 px ; reduced-motion respecté ; test qui échoue si une couleur hors tokens apparaît dans les CSS.
- Modèle : **Fort**. Dépend de : 00.

**PART-02 — i18n et règles de texte**
- Objectif : dictionnaire typé `fr`, fonction `t()`, formats FR, linter de texte.
- Contexte : DESIGN §7, §5.1 (`messageKey`).
- Livrables : `apps/web/src/i18n/{fr.ts,index.ts}`, formateurs (nombres « 1 234 », durées « 3,5 s », dates « 23 oct. 2026 », Europe/Paris), `scripts/copy-lint` (emoji, MAJUSCULES, mots interdits « boostez, propulsez, sublimez, révolutionnaire… », phrases > 20 mots en avertissement).
- CA : clé manquante = erreur de typage ; copy-lint en CI ; tests des formateurs.
- Modèle : Éco. Dépend de : 00.

**PART-03 — Réseau sûr (`packages/net`)**
- Objectif : `safeFetch`, résolveur DoH, sonde TLS, budget de requêtes.
- Contexte : §11 (anti-SSRF), `.cursor/rules/security.mdc`.
- Livrables : API documentée en tête de fichier, tests.
- CA : tests refusant 127.0.0.1, 10/8, 172.16/12, 192.168/16, 169.254.169.254, 100.64/10, ::1, fc00::/7, fe80::/10, ::ffff:127.0.0.1, `http://2130706433`, `http://0x7f.1`, redirection vers IP privée, rebinding (2e résolution différente ignorée), port 8080, `file:`, réponse trop grosse, délai dépassé ; sonde TLS sur serveur de test local (expiration, chaîne, SAN, protocole).
- Modèle : **Fort**. Dépend de : 00.

**PART-04 — Cœur du moteur**
- Objectif : interfaces §5.1, registre, runner (concurrence, délais par check, garde passif/actif), score §5.2, chargeur de fiches §5.3, fixtures.
- Contexte : §5 entier, §6 (titres seulement).
- Livrables : `packages/engine` (sans aucun check métier sauf 2 checks factices de test), `fixtures/sites/{bon,mauvais}` + serveur local, `METHODE.md` v2026.1.
- CA : un check `active` n'est jamais exécuté si `verified=false` (test) ; check en erreur ou délai dépassé → `untested` avec raison ; couverture < 50 % → domaine non noté ; scores déterministes (snapshot).
- Modèle : **Fort**. Dépend de : 03.

**PART-05 — Base de données et authentification**
- Objectif : schéma §8, RLS, auth e-mail + mot de passe / Google / GitHub, client typé.
- Contexte : §8, §9.
- Livrables : `supabase/migrations/*`, seeds (les 2 sites du propriétaire), `packages/db`, tests RLS (Supabase local).
- CA : utilisateur A ne lit ni n'écrit rien de B ; `anon` ne lit que rapports `public`/`link` valides et `sites.is_public` ; RPC `claim_next_audit` concurrente sûre (test) ; migrations rejouables à vide.
- Modèle : Éco (relire les policies RLS avec soin). Dépend de : 00.

### Phase B — Checks passifs (fonction, sans navigateur)

Chaque PART de cette phase : checks dans `packages/engine/checks/<domaine>/`, fiches `fixes/fr/`, tests sur fixtures et mocks d'API, aucun appel réseau réel.

**PART-06 — Sécurité passive**
- Contexte : §5.1, §5.3, §6 (ligne Sécurité), API de `packages/net`.
- Checks : HTTPS et redirection, HSTS, CSP (présence + directives dangereuses), XCTO, frame-ancestors/XFO, Referrer-Policy, Permissions-Policy, cookies, certificat, contenu mixte statique (HTML), `security.txt`.
- CA : grille de points documentée dans METHODE.md (inspirée d'Observatory) ; variantes de fiche `netlify` (`_headers`) et `github_pages` (limite expliquée + alternative) ; tests passants/échouants par check.
- Modèle : Éco. Dépend de : 04.

**PART-07 — Performance (PSI + CrUX)**
- Contexte : §5, §7 (PSI, CrUX), §6.
- Livrables : adaptateur PSI (mobile + desktop, catégories performance/accessibility/best-practices/seo, délai 120 s, réessai 1 fois), adaptateur CrUX API (URL puis origine), stockage dans `ctx.shared`, correspondance des audits Lighthouse principaux → findings + fiches.
- CA : réponses PSI/CrUX enregistrées en fixtures JSON ; absence de données terrain → message honnête ; quota 429 → `untested` « Nous n'avons pas pu tester… ».
- Modèle : Éco. Dépend de : 04.

**PART-08 — SEO**
- Contexte : §5, §6 (SEO).
- Checks : Lighthouse SEO (via `shared`), `robots.txt`, sitemap (XML valide, ≤ 20 URLs vérifiées), noindex/X-Robots-Tag, canonical, title/description (longueur, doublons), hreflang, JSON-LD (parse + `@type` connus).
- CA : tests sur fixtures ; portée « chemin » gérée (sitemap/robots au niveau origine signalés comme hors portée si besoin).
- Modèle : Éco. Dépend de : 04 (07 pour Lighthouse, sinon `untested`).

**PART-09 — DNS et e-mail**
- Contexte : §5, §6 (DNS), API DoH de `packages/net`.
- Checks : MX, SPF (syntaxe, `all`, ≤ 10 lookups), DMARC (p, pct, rua), DKIM (sélecteurs : default, google, selector1, selector2, k1, mail, s1, s2, dkim), CAA, DNSSEC (AD), MTA-STS, TLS-RPT. Domaine sans MX : SPF `-all` et DMARC `p=reject` conseillés (anti-usurpation).
- CA : portée github.io → domaine « Non applicable » ; tests sur réponses DoH mockées.
- Modèle : Éco. Dépend de : 04.

**PART-10 — Écologie**
- Contexte : §5, §6 (Écologie), §7 (Green Web).
- Livrables : EcoIndex (formule publique, NV), CO2/visite (CO2.js, modèle SWD), hébergeur vert, sous-ensemble RGESN automatisable (liste des critères couverts dans METHODE.md), schéma du questionnaire RGESN (UI plus tard).
- CA : calcul EcoIndex validé sur 3 cas de référence ; texte qui dit clairement qu'il s'agit d'estimations.
- Modèle : Éco. Dépend de : 04 (07 pour poids/requêtes).

**PART-11 — Qualité technique**
- Contexte : §5, §6 (Qualité), §11 (budget).
- Checks : crawl borné (≤ 50 pages, même portée, robots respecté), liens cassés internes (GET) et externes (HEAD, 1/s, ≤ 30), validité HTML (html-validate, règles essentielles), images lourdes (> 200 Ko), sans dimensions, sans format moderne.
- CA : budget jamais dépassé (test) ; liens externes en erreur temporaire = `warn`, pas `fail`.
- Modèle : Éco. Dépend de : 04.

**PART-12 — Technologies et CVE (passif)**
- Contexte : §5, §7 (OSV, NVD, KEV).
- Livrables : détection (en-têtes `Server`/`X-Powered-By`, `meta generator`, signatures retire.js sur scripts chargés), requêtes OSV/NVD avec cache 24 h, croisement KEV.
- CA : formulation prudente (« version possiblement vulnérable ») ; version inconnue → pas d'alerte CVE ; licence des signatures vérifiée et notée.
- Modèle : **Fort** (faux positifs). Dépend de : 04.

### Phase C — Navigateur, orchestration, interface (fin du MVP)

**PART-13 — Runner navigateur**
- Contexte : §3, §5.1 (`shared`), §6 (lignes runner).
- Livrables : `packages/browser-runner` (Playwright Chromium, profil vierge, aucune interaction) : axe-core complet, cookies + requêtes tierces avant consentement, détection CMP (tarteaucitron, Axeptio, Didomi, Cookiebot, OneTrust…), erreurs console, contenu mixte dynamique, captures mobile/desktop, poids/requêtes/DOM pour EcoIndex ; `data/rgaa-axe-map.json` (couverture partielle déclarée) ; workflow `browser-audit.yml` (`workflow_dispatch`, entrée `auditId`) ; exécution CLI locale.
- CA : sur fixtures locales : cookies avant consentement détectés ; axe trouve les erreurs plantées ; sortie conforme au schéma zod ; le runner passe par l'anti-SSRF (proxy de requêtes ou interception Playwright).
- Modèle : **Fort**. Dépend de : 04.

**PART-14 — Vie privée et RGPD**
- Contexte : §6 (Vie privée), sortie du runner (schéma).
- Checks : traceurs avant consentement (liste de traceurs, licence vérifiée), présence CMP, « Tout refuser » au 1er niveau, polices/scripts tiers, pages « Mentions légales » et « Confidentialité » trouvées et non vides, éléments attendus (éditeur, hébergeur, contact) par heuristique.
- CA : fiches avec sources CNIL ; formulations non culpabilisantes ; sans runner → `untested`.
- Modèle : Éco. Dépend de : 13.

**PART-15 — Orchestration et CLI**
- Contexte : §3, §5, §8 (`audits`, `rate_limits`), §9.
- Livrables : fonctions `api-audits-create` (validation zod, limites : 10/jour/utilisateur, 1/hôte/15 min), `api-audits-get`, `audit-run-background` (claim, run, merge, score, écriture), dispatch GitHub du runner + délai d'attente → `partial` ; `packages/cli` (`audigy audit <url> [--json] [--browser]`) ; doc `netlify dev`.
- CA : audit complet de bout en bout en local sur fixtures (`netlify dev` + Supabase local) ; double clic = un seul audit ; runner absent → audit `partial` puis `done` avec `untested` explicites ; aucun secret loggé.
- Modèle : **Fort**. Dépend de : 05, 06–14 (fonctionne avec ceux déjà faits).

**PART-16 — Interface : accueil, progression, rapport, sites**
- Contexte : DESIGN §1, §6, §7 ; composants PART-01 ; API PART-15.
- Livrables : accueil (« Vérifiez la santé de votre site, gratuitement. » + champ URL + « Lancer l'audit »), connexion (e-mail + mot de passe, Google, GitHub), liste des sites, ajout de site, progression (`aria-live`), rapport (jauge globale, liste des domaines, liste des corrections filtrable, pied vérifiable), rapport d'un domaine.
- CA : DESIGN §9 complet ; e2e Playwright du parcours ; axe 0 violation ; accueil < 500 Ko ; copy-lint vert.
- Modèle : **Fort**. Dépend de : 01, 02, 15.

**PART-17 — Historique et comparaison**
- Contexte : DESIGN §6 (graphiques), §8.
- Livrables : courbes uPlot (axe 0–100, seuils 50/80, ≤ 3 séries en traits différents, points cliquables), « Voir en tableau », résumé texte (« +12 points depuis le 3 mars »), comparaison de 2 audits (nouveaux problèmes / corrigés).
- CA : alternative tableau testée ; rendu en niveaux de gris lisible.
- Modèle : Éco. Dépend de : 16.

> **Jalon MVP** : après PART-17, le propriétaire utilise Audixio en local sur ses 2 sites.

### Phase D — Confiance

**PART-18 — Vérification de propriété et tests actifs**

> **MAJ owner 28 oct 2026 soir :** ordre preuves = **immédiat** (1) fichier + (2) balise meta + (4) lien HTML ; **vague suivante** (3) DNS TXT/CNAME ; **plus tard** (6) OAuth hébergeur / Search Console-like. DNS décalé (trio marché = fichier + balise/lien + DNS). Marque UI = **Audixio**.
- Contexte : §11 (vérification), §5.4, §8 (`site_verifications`, `audit_log`).
- Livrables : génération de jeton, 3 méthodes (DNS TXT, fichier, meta), instructions pas à pas par hébergeur (Netlify DNS, registrar, GitHub Pages), revérification, passage à `expired` ; checks actifs : fichiers exposés (~30 chemins, détection par **signature de contenu**, car un repli SPA renvoie 200), listing de répertoire, versions TLS acceptées.
- CA : refus de l'actif si la vérification a plus de 10 min ou si la portée ne correspond pas (test) ; pas de faux positif sur un site qui renvoie `index.html` pour tout chemin (fixture) ; journal complet.
- Modèle : **Fort**. Dépend de : 15, 16.

**PART-19 — Preuve : empreinte, horodatage, signature, vérification**
- Contexte : §12 entier.
- Livrables : `packages/evidence` (JCS, manifeste, client RFC 3161 avec nonce et vérification de l'empreinte, 2 TSA, Ed25519), page `/verifier/<id>` (hachage WebCrypto local), QR.
- CA : un octet modifié dans le PDF ou le JSON → « ne correspond pas » ; jeton TSA vérifié hors ligne sur fixtures ; mentions §12.8 présentes.
- Modèle : **Fort**. Dépend de : 15.

**PART-20 — PDF, captures horodatées, WARC**
- Contexte : §12 (étapes 2, 6), runner PART-13.
- Livrables : vue impression `/rapport/<id>/imprimer`, PDF via Playwright `page.pdf()`, WARC de la page d'accueil (sur demande), plafonds de taille, intégration au manifeste.
- CA : PDF lisible en niveaux de gris, polices embarquées, ≤ 1 Mo ; WARC rejouable (ReplayWeb.page en local) ; artefacts hachés.
- Modèle : Éco. Dépend de : 13, 19.

**PART-21 — Search Console (OAuth)**
- Contexte : §7 (Search Console), §8 (`oauth_tokens`), §9.
- Livrables : `oauth-google-start/callback` (PKCE, `state`, accès hors ligne), chiffrement AES-256-GCM, correspondance site ↔ propriété (`sc-domain:` ou préfixe d'URL), checks : sitemaps soumis/erreurs, URL Inspection de la page d'accueil, pages indexées (résumé), révocation.
- CA : jeton jamais renvoyé au client ; révocation supprime le jeton ; sans OAuth → `untested` avec lien « Connecter Search Console ».
- Modèle : **Fort**. Dépend de : 15.

### Phase E — Suivi et ouverture

**PART-22 — Planification, disponibilité, alertes, résumé hebdo**
- Contexte : §2 (scheduled 30 s), §8 (`schedules`, `uptime_*`, `incidents`, `alerts`).
- Livrables : `schedule-tick` (toutes les 15 min : uptime + mise en file des audits dus → background), `digest-weekly` (lundi 8 h Paris), envoi Brevo, gabarits e-mail FR (texte + HTML simple), désabonnement en 1 clic (List-Unsubscribe), alertes : site injoignable 2 fois de suite, rétablissement, baisse ≥ 10 points, nouveau « Problème » grave, certificat < 21 j.
- CA : `schedule-tick` < 30 s sur 50 sites simulés ; pas de doublon d'alerte ; agrégation `uptime_daily` + purge 30 j.
- Modèle : Éco. Dépend de : 15.

**PART-23 — Page de score publique et partage**
- Contexte : §8 (`sites.public_slug`, `reports`), §11 (publicité).
- Livrables : `/score/<slug>` opt-in (scores, date, méthode, lien de vérification, pas de détail sécurité), lien de partage révocable `noindex`, badge SVG optionnel sans traceur.
- CA : révocation immédiate ; détail sécurité masqué par défaut (test).
- Modèle : Éco. Dépend de : 16, 19.

**PART-24 — Réputation (avis Google)**
- Contexte : §7 (Places), Q13.
- Livrables : recherche du lieu et confirmation par l'utilisateur, note + nombre d'avis, score affiché à part, cache 7 j ; sans clé → section masquée.
- CA : fonctionne sans clé (masqué) ; aucun appel côté client.
- Modèle : Éco. Dépend de : 15.

**PART-25 — Légal et comptes**
- Contexte : §11 (données), §12.8, Q18, Q12.
- Livrables : CGU (dont engagement de propriété/mandat), politique de confidentialité, mentions légales, déclaration d'accessibilité, page « Méthode », `docs/legal/registre.md`, export JSON et suppression de compte, acceptation versionnée des CGU.
- CA : relecture humaine par le propriétaire ; suppression = données et artefacts effacés (test) ; liens dans le pied de page.
- Modèle : Éco. Dépend de : 16.

**PART-26 — Durcissement et recette**
- Contexte : AGENTS.md, DESIGN §9, §11, §14.
- Livrables : revue de sécurité (entrées, RLS, en-têtes de l'app Audixio, CSP stricte), limites anti-abus, auto-audit d'Audixio (build local servi en local), tests NVDA/VoiceOver de la jauge et de la liste, budgets de poids, relecture de tout le texte, `docs/dev/RECETTE.md` rempli.
- CA : Audixio ≥ 90 dans chaque domaine applicable ; DESIGN §9 coché sur toutes les pages ; zéro tiers ; CI verte.
- Modèle : **Fort**. Dépend de : toutes.

### PART-27 — Déploiement unique final (propriétaire, manuel)

**Avant (rien n'est déployé à ce stade)**
- [ ] Toutes les PARTS mergées sur `main`, CI verte, tag `v1.0.0`.
- [ ] Questions de `docs/produit/QUESTIONS.md` tranchées (au minimum Q1, Q2, Q7, Q9, Q18, Q23, Q24).
- [ ] Équipe Netlify dédiée à Audixio (crédits séparés d'angelique-osteo.fr), solde ≥ 100 crédits.
- [ ] Site Netlify créé **sans liaison Git** ; deploy previews et branch deploys désactivés.
- [ ] Supabase prod (UE) : `supabase db push`, tests RLS rejoués contre la prod, SMTP Brevo configuré, URL de redirection auth = domaine final, sauvegarde manuelle du schéma.
- [ ] Variables §9 saisies dans l'interface Netlify (jamais dans le repo) ; `GOOGLE_API_KEY` restreinte à PSI + CrUX.
- [ ] OAuth Google : URI de redirection de prod ; écran de consentement à jour (Q14).
- [ ] Clé de signature générée hors ligne ; clé publique dans le build.
- [ ] Domaine (Q7) : DNS, HTTPS ; domaine d'envoi d'e-mail avec SPF, DKIM, DMARC.
- [ ] Répétition locale : `pnpm i --frozen-lockfile && pnpm check && pnpm build && netlify build` sans erreur.
- [ ] `GH_DISPATCH_TOKEN` : jeton fine-grained limité à ce repo, expiration notée.

**Le déploiement (une seule fois)**
- [ ] Depuis la machine du propriétaire : `netlify deploy --build --prod` (15 crédits).

**Après**
- [ ] Fumée : accueil, connexion, ajout des 2 sites, audit passif, vérification d'angelique-osteo.fr, audit actif, PDF + vérification, partage, page publique.
- [ ] Interface Netlify : fonctions planifiées visibles ; premier `schedule-tick` réussi ; e-mail de test reçu.
- [ ] Audixio s'auto-audite en prod : ≥ 90 partout.
- [ ] Suivi des crédits Netlify et du stockage Supabase la première semaine.
- [ ] Incident : correction sur GitHub d'abord ; tout nouveau déploiement = décision explicite du propriétaire (15 crédits). Pas de correctif à chaud.

---

## 16. Après la v1 (hors séquence)

- **Tauri 2** (`apps/desktop`) : réutilise le build statique d'`apps/web` ; moteur + runner en sidecar (Node SEA, NV) avec Chrome du système ; audits depuis l'IP de l'utilisateur, sans coût serveur. Ne nécessite pas Netlify.
- Anglais (`en`), questionnaire RGESN complet, signature PAdES, TSA qualifiée eIDAS, runner navigateur hébergé en UE pour le public (Q4).

---

## 17. Risques principaux

| Risque | Parade |
|---|---|
| Crédits Netlify partagés avec angelique-osteo.fr | équipe séparée (Q1) |
| Pause Supabase | audits hebdo planifiés = activité ; alerte e-mail Supabase surveillée |
| Quota PSI ou changement d'API Google | adaptateurs mockés, cache, `untested` honnête |
| CGU GitHub Actions pour un service public | v1 limité aux sites du propriétaire ; runner hébergé à décider avant ouverture (Q4) |
| Faux positifs CVE / RGPD | formulations prudentes, mention « à confirmer », sources liées |
| Nom « Audixio » (à vérifier ; l’ancien nom était une marque Creative Labs) | vérification INPI/EUIPO avant ouverture (Q8) |
| Promesse juridique excessive des rapports | mentions §12.8 validées (Q12) |
