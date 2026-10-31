# Étape 11 — Langues FR/EN (i18n) — faite par Cursor

> Décidé owner 30/10/2026. Spec complète : [`produit/FONCTIONNEMENT.md` §12bis](../produit/FONCTIONNEMENT.md). Décision : [`00-DECISIONS.md`](../00-DECISIONS.md) (30 octobre).
> **Calendrier :** l'anglais est livré **après le cœur**, mais la règle « aucun texte en dur » s'applique **dès maintenant** à tout code écrit.

## Objectif

Le site existe en français (référence, à la racine) et en anglais (sous `/en/`), avec **une seule page par écran**, tous les textes dans deux fichiers JSON, un bouton **EN** fonctionnel dans la nav, et un SEO bilingue propre (hreflang + sitemap).

## Modèle Cursor conseillé

- **Extraction des textes + câblage** (étapes 1 à 6 ci-dessous) : un **modèle Cursor rapide standard** (travail mécanique, répétitif, beaucoup de fichiers).
- **Relecture finale de l'anglais** (`en.json`, titres, descriptions, e-mails) : le **modèle le plus puissant** disponible dans Cursor, en une seule passe à la fin (ton naturel, cohérence des termes, pas de traduction mot à mot).

## Fichiers à lire

- `docs/produit/FONCTIONNEMENT.md` §12bis (règles, SEO, rapports, e-mails)
- `docs/design/maquettes/chrome/NAV-CANON-desktop-et-mobile.md` (bouton FR|EN dans la nav)
- `apps/web/astro.config.mjs`, `apps/web/src/i18n/` (existant : `fr.ts`, `report-fr.ts`, `brief-fr.ts`, `index.ts`, `format.ts`)

## À faire (dans l'ordre)

1. **Routage Astro natif** — `astro.config.mjs` :
   `i18n: { locales: ['fr','en'], defaultLocale: 'fr', routing: { prefixDefaultLocale: false } }`.
   FR à la racine sans préfixe (`/`, `/methode`), EN sous `/en/...`. Liens internes via `getRelativeLocaleUrl(lang, path)`, jamais de chemin écrit à la main.
2. **Textes dans les JSON** — créer `apps/web/src/i18n/messages/fr.json` et `apps/web/src/i18n/messages/en.json` (mêmes clés). Migrer `fr.ts` / `report-fr.ts` / `brief-fr.ts` ; `index.ts` expose `t(lang, 'cle')`. Clé absente en EN → repli FR **et** test en échec.
3. **Aucun texte en dur** — ni dans `.astro`, `.svelte`, ni dans les fonctions : `aria-label`, `alt`, `title`, erreurs, toasts compris. Ajouter un contrôle (`copy-lint` ou test) qui signale toute chaîne en dur.
4. **Une seule page par écran** — le contenu vit dans un composant (ex. `src/screens/Methode.astro`) qui reçoit `lang` ; les routes FR et EN ne font que l'appeler (`[...lang]` + `getStaticPaths`, ou deux fichiers d'une ligne). **Interdit :** `methode-en.astro` ou toute page dupliquée.
5. **Bouton « EN » de la nav** — dans l'AppHeader partagé (desktop + mobile) : lien vers **la même page** dans l'autre langue (`getRelativeLocaleUrl`), avec `hreflang` et `lang`. Au clic : cookie `audixio_lang` (1 an, `SameSite=Lax`) + `localStorage`, et préférence du compte si connecté (migration `locale`, §12bis point 6). Première visite navigateur EN : bandeau de proposition, **jamais de redirection**.
6. **SEO bilingue** — sur chaque page : `<html lang>`, `canonical` par langue, `hreflang` `fr` / `en` / `x-default` (URLs absolues, réciproques), title / description / OG traduits. `sitemap.xml` avec les URLs FR **et** EN et leurs alternates (`@astrojs/sitemap` option `i18n`).
7. **Relecture EN** (modèle le plus puissant) — passer `en.json` et les modèles d'e-mail en revue ; corriger le ton, les termes, les longueurs qui cassent la mise en page.

## Maquettes

Les maquettes `docs/design/maquettes/finales/` restent **en français uniquement**. Leur lien **EN** correspond, dans le vrai site, à la même page sous `/en/`. On ne crée **pas** de maquette anglaise.

## Critères de fin (checklist)

- [ ] `astro.config.mjs` : `fr` par défaut sans préfixe + `en` sous `/en/`.
- [ ] `messages/fr.json` et `messages/en.json` ont exactement les mêmes clés (test vitest en échec sinon).
- [ ] Aucune chaîne en dur dans `.astro` / `.svelte` / fonctions (contrôle automatique vert).
- [ ] Chaque écran = un seul composant ; aucune page dupliquée pour l'anglais.
- [ ] Bouton EN de la nav : même page, choix mémorisé (cookie + localStorage + compte), testé connecté et déconnecté ; aucune redirection forcée.
- [ ] Chaque page : `html lang`, canonical par langue, hreflang `fr` / `en` / `x-default` absolus et réciproques ; title / description / OG traduits.
- [ ] `sitemap.xml` bilingue avec alternates.
- [ ] Rapports : constats résolus par clé selon la langue ; aucun texte FR stocké en base. E-mails Brevo dans la langue du compte.
- [ ] Relecture finale de l'anglais faite avec le modèle le plus puissant.
- [ ] `pnpm check` vert ; auto-audit Audixio : `seo.hreflang` et `seo.canonical` réussis en FR et en EN.

## Interdits

- `next-intl` ou passage à Next.js (stack Astro + Svelte conservée).
- Redirection automatique selon la langue du navigateur.
- Dupliquer une page pour l'anglais ; écrire des URLs `/en/...` à la main.
- `netlify deploy` / deploy previews.
