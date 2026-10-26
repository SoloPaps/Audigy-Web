# Audit et triage — 25 octobre 2026

Revue du dépôt `SoloPaps/Audigy-Web` sur `main` à `2df2fb10` (PR #55). Cette PR n’implémente aucun correctif : elle enregistre l’état, le nettoyage, et l’ordre de reprise.

Backlog owner déjà validé : [`docs/bugs-a-reprendre-2026-11.md`](bugs-a-reprendre-2026-11.md). Les bugs 1–7 et les axes A–K y restent. Ici, chaque point est recoupé avec le code. Rien n’est ajouté sans fichier, test ou doc à l’appui.

Référence sécurité du produit : [MDN HTTP Observatory](https://developer.mozilla.org/en-US/observatory/docs/tests_and_scoring), comme [`docs/METHODE.md`](METHODE.md) §8. Pas une grille OWASP.

---

## 1. Ce qui a été fait dans cette PR

**Aucun fichier mort trouvé.** Aucune suppression, aucun déplacement.

Preuve de la recherche (sans ouvrir `packages/engine/data/trackers/`, `domains.txt`, `signatures.json`, ni `pnpm-lock.yaml`) :

| Piste | Résultat |
|---|---|
| Artefacts (`*.bak`, `*.old`, `*.map`, `*.warc`, `*.orig`, `.DS_Store`, brouillons, journaux) | Aucun, hors `packages/evidence/fixtures/rapport.pdf`. |
| `rapport.pdf` | Fixture. Référencée par `packages/evidence/test/*`, `packages/evidence/scripts/ecrire-fixtures.ts`, `apps/web/e2e/verifier.spec.ts`, `apps/web/public/preuves/…019.json`. Conservée. |
| `apps/web/src/pages/dev/composants.astro` et `apps/web/src/data/demo.ts` | Page de labo des e2e (`brief.spec.ts`, `design-system.test.ts`). Conservés. |
| `packages/engine/checks/ecologie/questionnaire.ts` | Pas d’écran, mais exporté (`packages/engine/src/index.ts`) et testé (`ecologie.test.ts`). Conservé. |
| `docs/superpowers/**` | Décisions owner. Quatre fichiers sont dans [`docs/README.md`](README.md). Le plan `plans/2026-10-24-agent-prompts-brief.md` n’y est pas, mais il décrit le brief livré (#54) et cite la spec. Doute : **conservé**, à vérifier. |
| `docs/METHODE.md`, `docs/PLAN.md`, `docs/DESIGN.md`, `docs/legal/`, `.env.example`, fixtures de tests | Non touchés. |

À vérifier plus tard, sans les supprimer :

- [`README.md`](../README.md) et [`docs/README.md`](README.md) décrivent encore la Vague 2 comme ouverte et le brief comme absent de l’interface. `main` a pourtant #53 (Vague 3), #54 (brief) et #55 (backlog). Documents utiles, texte périmé.
- Le plan brief (fichier ci-dessus) : historique d’implémentation, plus une spec. Le garder tant qu’un agent s’en sert pour les contraintes du brief.

---

## 2. État du dépôt

Monorepo pnpm, Node 22. Produit : audit gratuit en français. PART-00 à PART-26 sont dans le dépôt. PART-27 (déploiement) est réservée au propriétaire ([`docs/PLAN.md`](PLAN.md)). Méthode `2026.1`. Moteur `0.20.0` (`packages/engine/src/types.ts`).

```text
apps/web/          Astro statique + îlots Svelte (rapport, sites, brief, i18n fr)
netlify/functions/ handlers fins (api, audit background, oauth, schedule, digest)
packages/net/      safeFetch, DoH, TLS, API tierces allowlistées
packages/engine/   checks, score, fiches fixes/fr, données (non relues ici)
packages/browser-runner/  Playwright : axe, traceurs, WARC, PDF
packages/orchestrator/    file d’audits, OAuth, pipeline, vérif de propriété
packages/evidence/        manifeste, hash, horodatage
packages/db/ + supabase/migrations/   RLS, request_audit, scores publics
packages/cli/      audit local
fixtures/sites/    labo hors ligne
scripts/           garde-fou anti-deploy, copy-lint, CSP de build, auto-audit
.github/workflows/ ci.yml (pnpm check), browser-audit.yml (workflow_dispatch)
docs/              PLAN, METHODE, DESIGN, QUESTIONS, RECETTE, legal, bugs
```

Huit domaines entrent dans le score global (`MAIN_DOMAINS`) : performance, SEO, sécurité, écologie, accessibilité, qualité, vie privée, DNS/e-mail. Réputation et disponibilité sont à part. Le score d’un domaine reste `null` si la couverture testée est sous 50 % (`MIN_COVERAGE` dans `packages/engine/src/score.ts`).

UI : français via `t()`. Thème en place : Arc Soft (#38–#40). Brief agent sur le rapport propriétaire (#54). Export PDF / Markdown déjà livré (Vague 2).

Aucun site de production. `netlify.toml` sert au dev local. La CI lance `pnpm check` (garde-fou, Biome, copy-lint, types, Vitest, build, auto-audit, Playwright, Lighthouse a11y).

---

## 3. Bugs et dettes

Source owner : [`docs/bugs-a-reprendre-2026-11.md`](bugs-a-reprendre-2026-11.md). Ci-dessous, la preuve dans le code au 25 oct. 2026. Les bugs 1–7 et les axes A–K restent ouverts.

### Bugs 1 à 4 — brief / sélecteur (encore ouverts)

Fichier unique : `apps/web/src/components/FindingList.svelte`. Spec : `docs/superpowers/specs/2026-10-24-agent-prompts-brief-design.md`.

| # | Constat code |
|---|---|
| 1 | La case est un `<input type="checkbox">` natif. Le libellé visible est `visually-hidden`. Le CSS force `min-width` / `min-height` à `--touch-min` sur `.brief-choice input`, sans dessin dédié. |
| 2 | Rien / Vérif / Fix sont des radios natifs dans le même bloc. La pastille de sélection est le glyphe du navigateur, calé en haut de la boîte de 44 px. Aucun centrage (`appearance`, flex sur le contrôle). L’e2e `apps/web/e2e/brief.spec.ts` vérifie le rôle accessible, pas l’alignement. |
| 3 | Le compteur « N sélectionnés » (`selectionLabel` dans `apps/web/src/lib/brief-bar.ts`) ne lit que `checked[id]`. Les radios écrivent `terminal[id]` et ne changent pas ce nombre. Générer reste inactif tant que la case n’est pas cochée. En plus, le badge du filtre « À améliorer » vaut `groups.next.length` : `groupFindings` (`apps/web/src/lib/findings.ts`) y met `warn` **et** `untested`. L’e2e ne couvre que la case sur `/dev/composants` (« 1 sélectionné »). |
| 4 | `renderBrief` (`apps/web/src/lib/brief.ts`) a bien les sept parties de la spec. La ligne de stack n’existe que si `recognizedStack` trouve `securite.technologies` en `pass` ou `warn` avec `params.liste` (chaîne). Un constat `fail`, ou une techno seulement dans `securite.cve_*`, ne remplit pas le brief. Les voies terminal (`brief-terminal.ts`) restent génériques (en-têtes, certificat, DNS, Lighthouse). |

### Bug 5 — rapport trop dense

Liste plate par gravité (`groupFindings`), pas par domaine. Plusieurs modules verre s’empilent dans `ReportView.svelte` (jauge, catégories, constats, historique, export). L’axe H du backlog (score, puis priorités, puis détails) n’est pas le rythme actuel. Export Markdown / impression déjà là (`report-export.ts`, `PrintReport.svelte`).

### Bug 6 — mauvais layout au premier affichage

Piste étayée, non rejouée dans cette PR (pas de correctif, pas de session navigateur dédiée) :

- `apps/web/src/layouts/Base.astro` monte `<ClientRouter fallback="swap" />` et `transition:animate={fade}`.
- Le thème passe par un script externe `/theme-init.js` (bloquant dans le `<head>`), puis par `ThemeToggle` en `client:load`.
- Les polices sont en `font-display: swap` (`docs/DESIGN.md`).

Un rafraîchissement rejoue une navigation complète. Une transition Astro peut montrer la page d’avant le temps que les îlots et le thème se posent. Cause exacte encore à isoler (transition, thème, ou hydratation).

### Bug 7 — constats vie privée manquants ou illisibles

Mécanisme mesuré :

1. Quatre checks exigent le navigateur (`needs: ['browser']`) : `vie_privee.traceurs` (poids 3), `cmp` (2), `refus` (3), `tiers` (2). Total 10.
2. Trois checks HTTP partent sans navigateur : `confidentialite` (2), `mentions` (2), `elements` (1). Total 5.
3. Poids total 15. Sans runner, couverture 5/15 ≈ 33 %, sous `MIN_COVERAGE` (0,5). Le score du domaine reste `null`.
4. [`docs/RECETTE.md`](RECETTE.md) le mesure déjà : vie privée « non mesuré », couverture 33 %, « checks navigateur absents hors ligne ».
5. Si le runner ne dépose pas de JSON, `process.ts` pose des placeholders `reason.runner_absent` (`pipeline.ts`), sans `fixKey`. Le titre affiché est la phrase générique « le navigateur d’audit n’a pas tourné » (`fr.ts`), quatre fois, sans le nom du test. Les fiches `fixes/fr/vie_privee.traceurs.md` (et voisines) ne s’accrochent pas.
6. Ces lignes tombent dans le groupe « ensuite » avec les avertissements, pas dans un bloc Vie privée.
7. Les pages mentions / confidentialité, elles, ont un titre de fiche : elles restent visibles. Cela colle au retour owner (courrier, DNS, page confidentialité, éco présents ; vie privée absente).

Le runner n’est lancé que si `GH_DISPATCH_TOKEN` permet `workflow_dispatch` sur `.github/workflows/browser-audit.yml` (`packages/orchestrator/src/dispatch.ts`). Sans jeton : `not_configured`, puis `runner_absent`.

### Axe A — relancer un audit montre l’ancien

`public.request_audit` (`supabase/migrations/20261024000000_orchestration.sql`) : s’il existe **un** audit du même site et du même mode créé depuis moins de 15 minutes, il renvoie cet id avec `existing`, **quel que soit le statut** (`done` inclus). Le commentaire SQL dit « double clic = le même audit ».

`packages/orchestrator/src/create.ts` ne réveille la fonction background que si `outcome === 'created'`. `LaunchAudit.svelte` envoie toujours vers `/progression?id=…`. Si l’audit existant est `done`, `ProgressPanel.svelte` affiche tout de suite le lien vers **ce** rapport.

`SitesPanel.svelte` ouvre aussi le dernier audit connu (`latestAuditBySite`), pas une nouvelle demande.

### Axes B à K

| Axe | État dans le code |
|---|---|
| B Estimation de temps | Absente. `progress-live.ts` dit le statut ou le dernier domaine déjà noté. Pas de fourchette. |
| C Liens sources | Une fiche peut porter `sourceHref`. Pas de lien par constat vers la section de [`docs/METHODE.md`](METHODE.md) / `/methode`. `methode-catalog.ts` ne cite que quelques tests. |
| D Langues (max 3) | `fr` seulement (`apps/web/src/i18n/fr.ts`, `brief-fr.ts`). `profiles.locale` prévu dans le PLAN. |
| E Empty states + Relancer | `EmptyState.svelte` existe (historique vide, filtre vide). Pas de CTA « Relancer un audit » sur sites / historique / rapport. |
| F Étapes nommées | Overlay : domaines déjà notés, pas la file DNS / pages / vie privée. |
| G Page Méthode vitrine | `/methode` existe. Pas de cartes vers Observatory, Lighthouse, EcoIndex, Tracker Radar. |
| H Densité de l’export | Export livré. Densité du rapport : bug 5. |
| I Barre brief | La barre est dans le flux (`.brief-bar`), pas `position: sticky`. Compteur : bug 3. |
| J A11y du sélecteur | Noms accessibles présents (e2e + axe sur `/dev/composants`). Cible 44 px via `min-height` sur l’input natif, d’où le bug 2. Focus visible hérité du global, pas vérifié sur ce contrôle en particulier. |
| K Recette manuelle | [`docs/RECETTE.md`](RECETTE.md) : auto-audit local du 24 oct. NVDA, Firefox, zoom 200 %, `security.txt` prod et auto-audit prod restent à faire au go-live. |

### Pistes d’archi (backlog)

Inchangées. Timeouts Netlify et cache jour UTC : déjà en place, ne pas rouvrir. Stack dans le prompt et liens méthode : bugs 4 et axes C / G.

### Dettes doc (trouvées ici)

- `README.md` et `docs/README.md` en retard sur #53–#55.
- `docs/README.md` n’indexe ni le backlog de novembre, ni ce fichier, ni le plan brief.

---

## 4. Sécurité

Pratiques lues : `packages/net`, orchestration, en-têtes, OAuth, RLS, score public, tests actifs. Aucun secret ouvert. `.env.example` ne contient que des noms vides (PLAN §9).

### Déjà tenu

| Sujet | Où | Lecture |
|---|---|---|
| Anti-SSRF | `packages/net/src/safe-fetch.ts`, `target.ts` | http/https, ports 80/443, IP publique épinglée, redirection revalidée (max 5), tailles et délai bornés, `AudigyBot`, pas de cookie. Tests : `packages/net/test/safe-fetch.test.ts`. |
| API tierces | `packages/net/src/external-api.ts` | Allowlist (PSI, CrUX, OAuth, Search Console, Places, Green Web, OSV, NVD, KEV). Pas le site audité. Jeton Bearer absent des erreurs. |
| Navigateur | `packages/browser-runner` (intercept) | Le trafic page repasse par `safeFetch`. |
| Actif vs passif | `packages/engine/src/runner.ts`, `checks/securite/active.ts` | Trois checks actifs (`securite.fichiers`, `securite.listing`, `securite.tls`). Refus si `ctx.verified !== true`. Création SQL : vérif fraîche de moins de 10 minutes. Journal `audit_log`. Le contenu doit avoir la forme attendue (METHODE §16), pas un simple code 200. |
| OAuth Search Console | `oauth-google.ts`, `token-box.ts` | Scope `webmasters.readonly`, contrôlé au retour. Jetons AES-256-GCM, AAD `audigy-oauth-v1`, clé `TOKEN_ENC_KEY` (32 octets). |
| En-têtes de l’app | `netlify.toml`, `scripts/publish-policy.ts` | `nosniff`, `DENY`, Referrer-Policy, Permissions-Policy fermée, HSTS. CSP par page au build (empreintes, pas de `unsafe-inline` sur les scripts). `netlify.toml` ne porte pas la CSP (test `local-dev-policy`). |
| RLS | migrations `init`, `places` | RLS activé sur les tables `public`. `rate_limits` et `oauth_tokens` sans politique (rôle service), déjà noté dans la recette. |
| Score public | `apps/web/src/lib/public-score.ts` | `measured` non recopié. Détail sécurité seulement si `exposeSecurity === true`. |
| Secrets / CI | `.gitignore`, `.github/workflows/ci.yml` | `.env` ignoré. CI : `contents: read`, `pnpm check`, pas d’étape de déploiement. `scripts/guard-no-deploy.ts`. |
| Tests | Vitest, fixtures locales | Pas d’appel aux vrais sites en CI (règle AGENTS). |

Fetch direct hors `safeFetch` : DoH, Brevo, déclenchement GitHub, client Supabase. Ce ne sont pas le site audité. Le commentaire de `dispatch.ts` le dit pour GitHub.

Grille des checks sécurité passifs : METHODE §8, alignée Observatory (modificateurs traduits en Réussi / À améliorer / Problème). L’API Observatory reste optionnelle ; le calcul local est le défaut (PLAN §7).

### Risques résiduels

| # | Risque | Sévérité | Pourquoi |
|---|---|---|---|
| S1 | Vie privée non couverte sans runner GitHub | Moyenne | Quatre tests sur sept ne partent pas. Le domaine n’est pas noté (bug 7). Ce n’est pas une fuite : c’est un trou affiché trop vaguement. |
| S2 | `GH_DISPATCH_TOKEN` (`actions:write` sur ce dépôt) | Moyenne si le secret fuite | Absent du git. Un jeton volé peut lancer `browser-audit.yml`. Ne pas l’élargir. |
| S3 | HSTS `max-age=63072000; includeSubDomains` déjà dans `netlify.toml` | Moyenne au premier déploiement | Le premier HTTPS sur le domaine fige les sous-domaines pour deux ans. Décision owner, PART-27. |
| S4 | OAuth Google « mode test », jetons ~7 jours | Moyenne avant ouverture | Cité PLAN §7 comme non vérifié dans la console. Le code ne contourne pas l’expiration. |
| S5 | Runner GitHub Actions comme navigateur d’audit | Basse tant que l’usage est privé | QUESTIONS Q3–Q4 : les conditions GitHub ne visent pas un service public. Afficher « Non testé » pour les autres comptes tant que ce n’est pas tranché. |
| S6 | Registre [`docs/legal/registre.md`](legal/registre.md) non relu | Basse (juridique) | Le fichier le dit. Ne pas le présenter comme validé. |
| S7 | Tests actifs (fichiers exposés, listing) | Basse si la porte `verified` tient | Déjà gardée dans le runner et dans SQL. Ne pas ajouter de chemin, de charge utile, ni de contournement. Recette : propriété revérifiée juste avant. |

Pas de fail critique ouvert dans le code lu (SSRF, secret commité, actif sans vérif, CSP d’app absente du build).

---

## 5. Domaines d’audit

Maturité = checks branchés sur le score, pas l’ambition du PLAN. Détail des seuils : [`docs/METHODE.md`](METHODE.md).

| Domaine | Maturité | Ce qui tourne | Trou |
|---|---|---|---|
| Performance / CrUX / Lighthouse | Solide si clé Google | 7 checks : `performance.lighthouse`, `lcp`, `inp`, `cls`, `poids`, `cache`, `compression`. Labo PSI, terrain CrUX (pas le bloc CrUX de PSI). Cache jour UTC. | Sans `GOOGLE_API_KEY` : Non testé. Recette locale : couverture 0 %. |
| SEO | Solide en passif | `seo.title`, `description`, `canonical`, `hreflang`, `jsonld`, `robots`, `sitemap`, `noindex`, `lighthouse`, plus GSC (`gsc_sitemaps`, `gsc_inspection`, `gsc_indexed`). | GSC : OAuth. Sans connexion, constats Non testé avec lien `/search-console`. |
| Sécurité (Observatory) | Solide en passif | 11 tests METHODE §8 + `securite.technologies`, `cve_scripts`, `cve_logiciels` (retire.js, OSV, NVD, KEV, cache 24 h). Actifs : §16, porte propriété. | Contenu mixte dynamique hors lot passif (METHODE §8). API Observatory non appelée par défaut. |
| Écologie / EcoIndex / RGESN | Partiel | `ecologie.co2`, `ecoindex`, `hebergeur`, `rgesn_budget`, `rgesn_cache`, `rgesn_compression`, `rgesn_images`, `rgesn_polices`. EcoIndex lu depuis PSI, pas depuis le DOM du runner. Hébergeur : Green Web. | Questionnaire RGESN : schéma + tests, **pas d’écran**. Le PLAN visait aussi le runner pour le poids réel. |
| Accessibilité | Partiel | Un check noté : `accessibilite.lighthouse` (catégorie PSI). | axe-core et la carte RGAA 4.1 vivent dans `packages/browser-runner` (`rgaa.ts`). Aucun check moteur ne les note. La recette le dit : « pas de check moteur ». L’a11y de l’app Audigy, elle, est testée (Playwright axe, `scripts/lighthouse-a11y.mjs`). |
| Qualité / retire.js / OSV | Qualité HTML solide ; CVE dans Sécurité | `qualite.html`, `images_dimensions`, `images_format`, `images_poids`, `liens` (crawl borné). CVE : domaine sécurité, pas qualité. | Erreurs console (PLAN) absentes des checks qualité. |
| Vie privée / Tracker Radar | Code complet, résultat souvent vide | 7 checks METHODE §15. Liste Tracker Radar (commit cité dans la méthode ; données non relues). CMP reconnues : liste courte dans `hits.ts`. | Sans runner : bug 7. Quatre titres identiques. Le navigateur ne clique pas (voulu). |
| DNS / e-mail | Solide | `mx`, `spf`, `dkim`, `dmarc`, `caa`, `dnssec`, `mta_sts`, `tls_rpt`. DoH. | IP nue et certains hôtes : Non applicable (`dns_email/shared.ts`). Inutile sans DNS public (recette locale 0 %). |
| Réputation | Optionnel, à part | `reputation.avis` via Places, côté serveur. Section masquée sans domaine avis. | Clé + fiche confirmée. Hors score global. |
| Disponibilité | Non notée | Tables `uptime_*`, `schedule-tick`, incidents. Le type `disponibilite` existe. | Aucun check `disponibilite.*` dans `packages/engine/checks`. Recette : non mesuré. |

---

## 6. Design

Thème principal : **Arc Soft**.

Objectif : un effet wouah, impressionnant (animations, motion design, polish global), tout en gardant le rapport d’audit vraiment clair et structuré.

Le détail visuel reste dans [`docs/DESIGN.md`](DESIGN.md) et dans la spec Arc Soft. Cette PR ne le redécrit pas et ne le modifie pas.

---

## 7. Triage prioritaire

Ordre des PR : P0 d’abord, une PR par sujet, tests Vitest (et Playwright si l’UI bouge). Pas de déploiement.

### P0 — bloquants

**P0.1 Vie privée lisible (bug 7)**  
Impact : le domaine peut rester sans note alors que le reste du rapport a l’air complet. Risque de confiance. Effort : moyen (orchestration déjà écrite ; le trou est l’absence de runner et des titres génériques).

1. Garder le seuil de couverture. Ne pas inventer une note.
2. `packages/orchestrator/src/pipeline.ts` : les placeholders `browser` doivent porter un `messageKey` par check (`vie_privee.untested_runner` ou équivalent déjà dans `fr.ts`), pas quatre fois `reason.runner_absent` seul.
3. `apps/web/src/lib/report-model.ts` : titre = nom du test (fiche ou clé dédiée) + phrase « non testé ». Le groupe ou un sous-titre Vie privée doit lister les sept checks (`FindingList.svelte` / `groupFindings` seulement si ça ne mélange plus ces lignes dans « À améliorer » sans nom).
4. Vérifier qu’un audit avec JSON runner (`runBrowserPhase`) produit traceurs, CMP, refus et tiers en pass / fail, pas en placeholder.
5. En local sans jeton : `pnpm lab:audit --browser` (déjà décrit dans `packages/orchestrator/src/index.ts`) doit suffire à remplir `ctx.shared`.
6. Done : recette ou test — couverture 33 % ⇒ score `null` **et** sept lignes nommées ; avec fixture navigateur ⇒ les quatre checks navigateur ne sont plus « runner absent ». Fichiers tests : `packages/engine/test` vie privée, `apps/web/src/lib/report-model.test.ts`.

**P0.2 Sélecteur du brief (bugs 1, 2, 3, axe I, axe J)**  
Impact : on ne peut pas choisir des constats de façon fiable. Effort : petit, un composant.

1. `FindingList.svelte` : dessiner la case et le groupe Rien / Vérif / Fix pour que la pastille soit dans le cercle, centrée. Garder les rôles `checkbox` et `radiogroup` et les noms longs déjà dans `brief-fr.ts`.
2. Cible tactile et focus visible (axe J), y compris sous 320 px (le CSS passe déjà en colonne).
3. Compteur : `selectedCount` reste le nombre de cases cochées. Le libellé ne doit pas reprendre le badge du filtre. Sortir `untested` du compteur « À améliorer » (`findings.ts`, compteurs du filtre dans `FindingList.svelte`).
4. Barre : la rendre sticky seulement si ça ne cache pas le rapport (axe I). Compteur = cases cochées.
5. Done : e2e `apps/web/e2e/brief.spec.ts` — après une case, « 1 sélectionné » ; un radio Vérif ne change pas ce nombre ; axe 0 violation. Pas de capture exigée dans le test d’alignement si un test de style (centre du glyphe) est trop fragile : au minimum revue visuelle sur `/dev/composants` et sur un rapport fixture.

**P0.3 Brief plus complet, stack réelle (bug 4)**  
Impact : le prompt collé à un agent reste générique. Effort : petit à moyen. Ne pas inventer une techno.

1. `recognizedStack` (`brief.ts`) : aujourd’hui `securite.technologies` en pass/warn + `params.liste`. Étendre seulement aux listes **déjà** produites par `packages/engine/checks/securite/technologies/judge.ts` (même champ `liste`), y compris un fail qui contient une liste réelle. Si `liste` est vide, omettre la ligne (déjà le cas).
2. Enrichir les fragments `brief-fr.ts` là où la spec a une partie trop courte (constat, critère, garde-fous déjà présents). Pas de nouvelle procédure d’attaque, pas de chemin de test actif.
3. Terminal : rester sur les familles déjà dans `brief-terminal.ts`. Y ajouter la stack seulement comme contexte, pas comme commande inventée.
4. Done : `brief.test.ts` — stack absente si rien n’est détecté ; stack présente si `liste` est là ; le texte ne contient pas de secret ni `rm`.

**P0.4 Relancer montre le nouvel audit (axe A, lié à E)**  
Impact : la personne croit relancer et relit l’ancien rapport. Effort : moyen (SQL + UI).

1. `request_audit` : `existing` seulement si l’audit récent est `queued`, `running` ou `partial`. Un `done` / `failed` dans la fenêtre de 15 minutes doit rester une limite (`host_limit` + `Retry-After`), avec une phrase déjà traduite (`audit.retry.minutes`), pas un faux nouveau parcours.
2. `create.ts` / `LaunchAudit.svelte` : si `existing` et statut pas fini, aller à `/progression?id=` de **cet** id (le vrai en cours). Ne pas ouvrir `/rapport` du précédent.
3. `SitesPanel.svelte` et le rapport : CTA « Relancer » vers `/lancer?site=…`, libellé `t()`. Empty state si aucun audit (axe E).
4. Done : test SQL ou test orchestrateur — un audit `done` de 2 minutes ne renvoie pas `existing` ; un `running` oui. Test UI : le lien de progression porte le nouvel id.

### P1 — dettes sécu et fiabilité

**P1.1 Runner navigateur explicite (S1, S2, S5)**  
Pourquoi : sans lui, P0.1 n’a que des lignes « non testé ». Risque ops sur le jeton. Effort : config owner + un message UI, pas un nouveau crawler.

1. Documenter dans `docs/DEV-LOCAL.md` le minimum : jeton fine-grained `actions:write` sur ce dépôt seul, ou le repli `lab:audit --browser`. Ne pas commiter de valeur.
2. UI progression : si `runner_absent`, le dire (clé `reason.runner_absent` déjà là) au lieu d’un rapport qui a l’air fini.
3. Done : un audit local sans jeton finit `done` avec les placeholders nommés (P0.1), et le journal ne contient pas le jeton (`dispatch.ts` le garantit déjà : ajouter un test s’il manque).

**P1.2 Flash au premier affichage (bug 6)**  
Pourquoi : la première vue ment, le rafraîchissement corrige. Effort : petit une fois la cause isolée.

1. Reproduire avec le routeur Astro (`Base.astro`) : accueil → rapport, clair/sombre, `prefers-reduced-motion`.
2. Corriger la cause vue (ordre du thème, `fallback` du `ClientRouter`, ou CSS des îlots). Garder Arc Soft.
3. Done : le premier paint et le paint après refresh montrent le même thème et la même grille. Playwright sur une navigation client, pas seulement un `goto` à froid.

**P1.3 Garde-fous déjà codés, à ne pas casser**  
Pas une feature. Avant toute PR sécu :

- Site audité : `safeFetch` seulement.
- Actif : `verified` + revérif de moins de 10 minutes.
- CSP de l’app : `scripts/publish-policy.ts` seulement.
- Détail sécurité public : défaut masqué.

**P1.4 Avant ouverture, pas dans une PR de code maintenant (S3, S4, S6)**  
HSTS `includeSubDomains` : décision au moment du domaine. OAuth : sortir du mode test ou assumer l’expiration 7 jours dans la copie Search Console. Registre : relecture humaine. Voir §8.

### P2 — polish Arc Soft, rapport clair

Après P0. Le rapport reste structuré (verdict, puis priorités, puis détail). Le mouvement reste celui déjà autorisé, coupé par `prefers-reduced-motion`.

| Quoi | Pourquoi | Comment | Done |
|---|---|---|---|
| P2.1 Densité (bug 5, axe H) | Les constats sont entassés. | `ReportView.svelte`, `FindingList.svelte` : score et priorités d’abord, détail replié. | On trouve le premier problème sans scroller dans les réussites. Les réussites restent dans le `<details>` déjà là. |
| P2.2 Motion / wouah | Le thème est posé ; le rapport est encore statique et dense. | Animations et polish global sur l’entrée du rapport et la jauge, dans le cadre Arc Soft. | Le rapport se lit dans l’ordre. Mouvement réduit : pas d’animation. axe 0. |
| P2.3 Sources (axes C, G) | On ne voit pas sur quoi le constat s’appuie. | Depuis chaque constat, lien vers l’ancre de `/methode` déjà servie par `methode-catalog.ts` / `methode.astro`. Cartes sobres vers Observatory, Lighthouse, EcoIndex, Tracker Radar, DoH — seulement les noms déjà dans METHODE. | Chaque check catalogué a un href. Pas de référentiel inventé. |
| P2.4 Barre et sélecteur (axes I, J) | Suite visuelle de P0.2. | Polish du groupe Rien / Vérif / Fix une fois le centrage corrigé. | Même e2e brief, plus la revue du focus clavier. |

### P3 — plus tard

| Quoi | Pourquoi | Comment | Done |
|---|---|---|---|
| P3.1 Temps restant (axe B) | Attente opaque. | Fourchette grossière dans `ProgressPanel.svelte` / `progress-live.ts` (file + runner ≤ 10 min déjà dans l’orchestrateur). Pas un chrono faux à la seconde. | La phrase affichée est une fourchette `t()`, pas une promesse. |
| P3.2 Étapes nommées (axe F) | On ne sait pas ce qui est en cours. | Libellés de phase (DNS, pages, vie privée) à partir des checks déjà connus, pas d’un nouvel état serveur si `partial` suffit. | L’overlay cite la phase, en français. |
| P3.3 Trois langues (axe D) | Demandé, pas bloquant. | Français conservé. Anglais ensuite. Troisième langue plus tard. Pas plus de trois catalogues. | `t()` reste le seul chemin. Aucune chaîne en dur. |
| P3.4 axe / RGAA dans le score | Le runner mesure déjà, le score ignore. | Brancher un check `accessibilite.*` sur la sortie navigateur, couverture partielle dite comme telle (METHODE / `rgaa.ts`). | Sans runner : Non testé. Avec fixture : violations axe visibles, sans prétendre un RGAA complet. |
| P3.5 Disponibilité | Domaine prévu, sans check. | Checks planifiés + `schedule-tick` existant. Hors score global, comme la réputation. | Un site labo a un % ou « Non testé », pas une note inventée. |
| P3.6 Questionnaire RGESN | Schéma prêt, pas d’UI. | Écran volontaire, réponses via `parseRgesnResponses`. Ne pas noter le silence comme un échec. | Une non-réponse = Non applicable ou absent, selon METHODE §12. |
| P3.7 Docs d’accueil | README périmé. | Mettre à jour `README.md` et `docs/README.md` (Vague 3 et brief sur `main`, lien vers ce fichier et le backlog). | Un lecteur ne croit plus que le brief est « pour plus tard ». |
| P3.8 Recette manuelle (axe K) | Go-live. | [`docs/RECETTE.md`](RECETTE.md), au moment du déploiement owner. | NVDA ou VoiceOver, Firefox, zoom 200 %, contrastes, liens externes, `security.txt`, auto-audit de la prod. |

### Ordre de PR suggéré

1. P0.1 vie privée (titres + section), tests moteur / modèle de rapport.
2. P0.4 relance (SQL + parcours), pour ne plus rouvrir l’ancien id.
3. P0.2 sélecteur et compteur.
4. P0.3 stack dans le brief.
5. P1.1 message runner absent, P1.2 flash.
6. P2.1 puis P2.2 (clarté, ensuite le wouah), puis P2.3–P2.4.
7. P3 quand le P0 est fermé.

Ne pas mélanger un correctif P0 et un polish motion dans la même PR.

---

## 8. Hors scope / à ne pas faire maintenant

- Déploiement Netlify (`netlify deploy`, liaison Git, previews, branch deploys, build hooks). `netlify dev` seulement.
- Achat de `audigyweb.fr` chez OVH.
- Secrets, valeurs dans `.env`, rotation, console Google, console Netlify.
- PART-27 et l’unique déploiement final : propriétaire seulement ([`docs/PLAN.md`](PLAN.md), section PART-27, et §14).
- Recette prod et auto-audit du domaine réel (axe K) : après ce déploiement.
- Baisser `MIN_COVERAGE` pour afficher une note de vie privée.
- Redis, crawl depuis le navigateur, cache « 1 h » à la place du cache jour UTC (backlog : non prioritaire).
- Nouvelle langue au-delà de trois, refonte de `docs/DESIGN.md`, tokens ou mise en page décrits dans cette PR.
- Ouvrir `packages/engine/data/trackers/`, `domains.txt`, `signatures.json` pour « vérifier » la liste. La méthode cite déjà le commit Tracker Radar.
- Exploit, test actif sur un site non revérifié, soumission de formulaire, charge utile.

## 9. Vague « reste » (après #58)

Livré dans le code, hors de la PR #58 :

- P3.4 : check `accessibilite.axe`, branché sur la sortie navigateur. Sans runner : Non testé. Avec axe : écarts visibles. Le texte dit que ce n’est pas un audit RGAA complet. Couverture mesurée : partielle.
- P3.5 : `disponibilite.uptime` lit les sondes `uptime_daily`. Hors score global. Sans sonde : Non testé, pas de pourcentage inventé.
- P3.6 : page `/ecoconception`. Une réponse vide n’est pas un échec et n’est pas un « non ». Les réponses restent dans le navigateur.
- P2.2 : le rapport entre avec le mouvement déjà prévu (entrée 240 ms, jauge 400 ms), coupé par `prefers-reduced-motion`. Pas de nouvelle couleur.
- P3.3 : français par défaut, anglais via `t()` après chargement de `/dictionnaire-en.json`. Pas de troisième langue. Les pages statiques et le brief restent en français.
- P2.4 : non fait. Une barre sticky masquerait les constats. Le sélecteur reste dans le flux.
