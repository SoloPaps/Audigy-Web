# Arc Soft Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l’habillage papier calme par une coquille unique Arc Soft sur tout le site, le rapport restant l’écran principal.

**Architecture:** Les couleurs vivent dans `apps/web/src/styles/tokens.css`. La coquille (fond, blobs, verre, mouvement) vit dans `apps/web/src/styles/arc.css` et `apps/web/src/layouts/Base.astro`. Les pages ne font que remplir cette coquille. Le mouvement est du CSS plus la View Transitions API d’Astro. Trois PR successives, dans cet ordre : A, tâches 1 à 6 (tokens, charte, barre, accueil) ; B, tâches 7 à 9 (rapport et progression) ; C, tâches 10 à 12 (compte, sites, pages légales, recette). Une PR mergée ne laisse pas une page Arc Soft à côté d’une page encore papier sans que le fond et la barre soient déjà ceux du §2 de la spec.

**Tech Stack:** Astro 7 (sortie statique), îlots Svelte 5, CSS, `ClientRouter` de `astro:transitions`, Vitest, Playwright et axe. Outfit auto-hébergée. Node 22, pnpm 10.18.2.

## Global Constraints

Chaque tâche inclut ces contraintes. Les valeurs sont celles de `docs/superpowers/specs/2026-10-24-arc-soft-design.md`.

- Intensité verrouillée : très spectaculaire. `docs/DESIGN.md` est révisé dans la tâche 3, pendant l’implémentation, pas dans la PR qui ne contient que ce plan.
- Famille visuelle : verre lumineux, inspiré d’Apple et d’Arc. Direction retenue : A — Arc Soft.
- Périmètre : tout le site. Accueil, rapport, compte, sites, pages légales. Les autres routes passent par `Base.astro` et reçoivent le même fond et la même barre.
- Calendrier : PART-26 est sur `main` (`e702fdb`). Ce plan n’ajoute aucun correctif de durcissement, aucun déploiement Netlify, aucun achat de domaine. `netlify dev` reste autorisé hors de ces PR. Ne pas lancer `netlify deploy`, une liaison Git, une deploy preview ni un build hook.
- Verre. Enveloppe claire `rgba(255, 255, 255, 0.64)`. Enveloppe sombre `rgba(29, 33, 38, 0.72)`. `backdrop-filter: blur(20px)` et le préfixe `-webkit-backdrop-filter` avec la même valeur. Bordure `1px solid rgba(255, 255, 255, 0.30)` en clair, `rgba(255, 255, 255, 0.18)` en sombre. Ombre unique `0 18px 48px rgb(27 31 36 / 0.10)` en clair, `0 18px 48px rgb(0 0 0 / 0.35)` en sombre. Pas de halo coloré, pas de seconde ombre au survol. Plaque opaque `#FFFFFF` en clair et `#1D2126` en sombre derrière chaque texte, rayon inférieur de 4px au panneau. Sans `backdrop-filter`, l’enveloppe prend la plaque opaque et la bordure `--line` (`#E3DED5` clair, `#2E343B` sombre).
- Fond. Dégradé linéaire du haut vers le bas, `background-attachment: fixed`. Clair : `#FAF8F4` puis `#D7E7F2`. Sombre : `#15181C` puis `#1A2830`. Le thème suit `prefers-color-scheme` et le réglage manuel déjà en localStorage. Pas de noir pur.
- Blobs. Pétrole `#9FCFCB`, 42vw, plafond 640px, coin haut gauche décalé de −10vw et −8vh, opacité claire 0,55. Pêche `#F3C7B4`, 36vw, plafond 520px, droite du premier écran, centré verticalement, opacité 0,45. Lilas `#E3D4F0`, 28vw, plafond 420px, bas gauche, opacité 0,35. `blur(64px)`, `pointer-events: none`, sous les panneaux. En sombre les trois opacités passent à 0,18, mêmes teintes. Sous 768px le lilas n’est pas peint. Le lilas n’est jamais une couleur de marque, de lien, de bouton ou de score.
- Interdit : `#6366F1`, `#8B5CF6`, `#A855F7`, tout dégradé violet, tout texte en dégradé, emoji, DSFR, police Marianne, Lottie, témoignages, logos clients, statistiques inventées, tracker tiers, police distante, Google Fonts.
- Accent pétrole `#0F5C5A` en clair, `#5FC1BC` en sombre. Secondaire pêche : remplissage `#F8E4D8`, bord `#E39A78`. Le texte sur ce remplissage est `#1B1F24` dans les deux thèmes. Le pêche ne code aucun statut. Couleurs, formes et libellés de score inchangés (`docs/DESIGN.md` §4). Anneau de focus 2px `#C2410C`, décalage 2px, y compris sur le verre.
- Échelle d’espace inchangée : 4, 8, 12, 16, 24, 32, 48, 64. Contenu max 1120px. Rayons : 4px champs et badges, 8px boutons, 12px modules intérieurs, 16px enveloppes flottantes. Le flou de verre est 20px : c’est une valeur de la spec, pas un pas de l’échelle d’espace. La levée est −3px, même exception.
- Typographie. Corps, interface et scores : Atkinson Hyperlegible Next, woff2 latin déjà dans `apps/web/src/fonts/`, `font-display: swap`, graisses 400, 600, 700. Échelle 12, 14, 16, 18, 22, 28. Corps en interligne 1,5, titres 1,2, ligne ≤ 70ch. Scores et nombres de jauge : `font-variant-numeric: tabular-nums`. Chiffre de jauge à 20 % de la largeur de la jauge, « /100 » à part, au moins 12px. JetBrains Mono reste réservé aux URL, en-têtes HTTP et valeurs techniques.
- Affichage, choix fermé : **Outfit**, SIL OFL, auto-hébergée, latin, `font-display: swap`, graisses 600 et 700 seulement. Fichiers exacts : `apps/web/src/fonts/outfit-latin-600-normal.woff2` (14 140 octets) et `apps/web/src/fonts/outfit-latin-700-normal.woff2` (14 060 octets), extraits de `@fontsource/outfit@5.2.8`. Licence : `apps/web/src/fonts/OFL-outfit.txt`. Outfit ne s’applique qu’au H1 de page. Les H1 des pages légales restent en Atkinson. Sora et Manrope sont écartées : ne pas les télécharger, ne pas les nommer dans `fonts.css`. Inter, Geist, Space Grotesk, Instrument Serif et Poppins restent interdits. Pas d’italique serif sur un mot du titre. Casse de phrase.
- Mouvement. Survol 200 ms, entrée 280 ms, jauge ≤ 400 ms, transition de page ≤ 450 ms, dérive de blob 32 s linéaire alternée. Courbe `cubic-bezier(0.22, 1, 0.36, 1)`. Levée `translateY(-3px)` sur les tuiles de site, les lignes de domaine et le bouton principal. L’ombre ne change pas. Listes : décalage 40 ms, 6 lignes au plus, le reste avec la dernière, séquence totale < 450 ms (durée de ligne 240 ms, dernier délai 200 ms, total 440 ms). Blobs : translation ≤ 24px, jamais devant un panneau. Technique verrouillée : CSS pour le survol, les blobs et la jauge ; View Transitions pour le changement de page ; Motion One (`motion`) seulement si un ressort futur ne peut pas s’écrire avec la courbe ci-dessus. Ces tâches n’ajoutent pas de dépendance `motion`. Pas d’animation dans un attribut HTML. Pas de Lottie.
- `prefers-reduced-motion: reduce` : durées à 0, blobs figés à leur position de départ, pas de levée, pas de décalage de liste, jauge déjà à la valeur finale, View Transitions désactivées par `@media`. Le contenu reste au même endroit. Astro coupe déjà ses animations dans ce cas ; le CSS du plan le fait aussi.
- Pages légales (méthode, CGU, confidentialité, mentions, accessibilité) : prose 70ch, titres Atkinson, mêmes fond et barre, blobs figés même si le mouvement est autorisé ailleurs. Pas de hero, pas d’aperçu, pas de jauge.
- Copie via `t('clé')` dans `apps/web/src/i18n/fr.ts`. Vouvoiement, phrases ≤ 20 mots. Nombres et dates déjà formatés par `formatNumber` et `formatDate` (Europe/Paris).
- Sécurité inchangée. CSP par page dans `apps/web/dist/_headers`, empreintes, `script-src-attr 'none'`, pas de `unsafe-inline` sur les scripts. `style-src-attr 'unsafe-inline'` existe déjà pour les variables de jauge. Ne pas élargir la CSP. Aucun `fetch` direct vers un site audité. Le bouton « Supprimer définitivement » envoie toujours `{ confirm: 'supprimer' }` au corps déjà exigé par `packages/orchestrator/src/account.ts`. Ne pas modifier ce contrat.
- Budget accueil : 700 000 octets pour le document, le CSS, le JS et les polices, constante `HOME_MAX_BYTES`. Ce plafond remplace 500 000 seulement dans la tâche 3, en même temps que `docs/DESIGN.md`. Zéro requête tierce.
- Tests hors ligne. Vitest pour les tokens, l’axe horaire et les règles pures. Playwright + axe pour l’accueil, le rapport (`/dev/composants`) et la connexion. Porte de chaque PR : `pnpm check`.

## Découpage

- PR A, tâches 1 à 6. Base `main`. Porte en fin de tâche 6.
- PR B, tâches 7 à 9. Base = branche de A une fois A mergée. Porte en fin de tâche 9.
- PR C, tâches 10 à 12. Base = branche de B une fois B mergée. Porte en fin de tâche 12.

Ne pas ouvrir la PR B avant que A soit sur `main`. Même règle pour C.

## Map des fichiers

Créés :

- `apps/web/src/fonts/outfit-latin-600-normal.woff2` — Outfit 600, latin, 14 140 octets.
- `apps/web/src/fonts/outfit-latin-700-normal.woff2` — Outfit 700, latin, 14 060 octets.
- `apps/web/src/fonts/OFL-outfit.txt` — texte SIL OFL copié depuis le paquet.
- `apps/web/src/styles/arc.css` — fond, blobs, verre, barre, mouvement. Aucune couleur littérale.
- `apps/web/src/components/SiteBar.svelte` — liens de la barre, session, menu sous 768px.
- `apps/web/src/components/HomeAuditForm.svelte` — champ URL de l’accueil et son erreur.
- `apps/web/src/components/AuditOverlay.svelte` — squelette et région live, sans balayage.
- `apps/web/src/lib/home-example.ts` — scores d’exemple figés, aucun appel réseau.
- `apps/web/src/lib/home-example.test.ts` — contrat de ces scores.
- `apps/web/src/lib/progress-live.ts` — texte de la région live selon le statut.
- `apps/web/src/lib/progress-live.test.ts` — contrat de ce texte.
- `apps/web/src/lib/site-tiles.ts` — dernier audit par site pour la mini-jauge.
- `apps/web/src/lib/site-tiles.test.ts` — contrat de ce choix.
- `scripts/arc-soft.test.ts` — contrat des tokens, des polices et du CSS.
- `apps/web/e2e/arc-barre.spec.ts` — barre, lien d’évitement, menu, axe.
- `apps/web/e2e/arc-accueil.spec.ts` — accueil, axe, viewports.
- `apps/web/e2e/arc-motion.spec.ts` — mouvement réduit sur accueil, rapport, compte, sites.

Modifiés :

- `apps/web/src/styles/tokens.css` — tokens Arc Soft. Seul fichier de couleurs littérales.
- `apps/web/src/styles/fonts.css` — deux `@font-face` Outfit.
- `apps/web/src/styles/base.css` — H1 Outfit, bouton pêche, bouton bordé, colonne, carte.
- `apps/web/src/layouts/Base.astro` — blobs, barre, pied, `ClientRouter`, prop `still`.
- `apps/web/src/i18n/fr.ts` — chaînes nouvelles et trois libellés remplacés.
- `apps/web/src/pages/index.astro` — hero asymétrique et zones sous la ligne de flottaison.
- `apps/web/src/lib/site-url.ts` — `isCompleteHttpUrl`.
- `apps/web/src/lib/site-url.test.ts` — cas de cette fonction.
- `apps/web/src/lib/history.ts` — `axisHour` et `axisLabels`.
- `apps/web/src/lib/history.test.ts` — attentes d’axe alignées sur la spec.
- `apps/web/src/components/ScoreGauge.svelte` — courbe, nom de transition, taille `mini`.
- `apps/web/src/components/CategoryList.svelte` — la ligne entière est un lien, levée.
- `apps/web/src/components/FindingList.svelte` — classe de décalage sur les groupes.
- `apps/web/src/components/ReportView.svelte` — colonne 720px et modules de verre.
- `apps/web/src/components/ProgressPanel.svelte` — overlay pendant l’attente.
- `apps/web/src/components/LoginForm.svelte` — carte, titre, texte après envoi.
- `apps/web/src/components/AccountPanel.svelte` — quatre modules et confirmation.
- `apps/web/src/components/SitesPanel.svelte` — tuiles, mini-score, un bouton principal.
- `apps/web/src/pages/connexion.astro` — la carte porte le titre, plus de second en-tête.
- `apps/web/src/pages/compte.astro` — colonne 720px.
- `apps/web/src/pages/sites.astro` — colonne de tuiles.
- `apps/web/src/pages/methode.astro`, `cgu.astro`, `confidentialite.astro`, `mentions-legales.astro`, `accessibilite.astro` — `still`.
- `apps/web/src/pages/dev/composants.astro` — classe `reading` pour le banc hors ligne.
- `apps/web/e2e/legal.spec.ts` — libellé du pied.
- `apps/web/e2e/parcours.spec.ts` — URL complète, libellés, région live.
- `docs/DESIGN.md` — exceptions Arc Soft et plafond 700 Ko.
- `.cursor/rules/design.mdc` — même charte pour l’agent.
- `scripts/publish-policy.ts` — `HOME_MAX_BYTES = 700_000`.
- `docs/RECETTE.md` — une phrase qui distingue la mesure PART-26 du nouveau plafond.

Non touchés : `packages/engine/**`, la méthode de score, les seuils 50 et 80, les libellés « Bon », « À améliorer », « Problème », « Non testé », `netlify.toml`, les fonctions, le schéma `{ confirm: 'supprimer' }`.

---

### Task 1: Tokens et Outfit

**Files:**
- Create: `apps/web/src/fonts/outfit-latin-600-normal.woff2`
- Create: `apps/web/src/fonts/outfit-latin-700-normal.woff2`
- Create: `apps/web/src/fonts/OFL-outfit.txt`
- Create: `scripts/arc-soft.test.ts`
- Modify: `apps/web/src/styles/tokens.css`
- Modify: `apps/web/src/styles/fonts.css`
- Test: `scripts/arc-soft.test.ts`

**Interfaces:**
- Consumes: rien des tâches suivantes. Les tokens de score existants restent `--score-good` `#1f5fad`, `--score-improve` `#9a5800`, `--score-problem` `#b3261e`, `--score-untested` `#5f6672`, et leurs variantes sombres.
- Produces: variables `--wash-top`, `--wash-bottom`, `--blob-petrol`, `--blob-peach`, `--blob-lilac`, `--blob-opacity-petrol`, `--blob-opacity-peach`, `--blob-opacity-lilac`, `--glass`, `--glass-border`, `--glass-blur`, `--shadow-float`, `--plate`, `--peach-fill`, `--peach-border`, `--on-peach`, `--radius-float`, `--font-display`, `--ease-out`, `--duration-hover`, `--duration-enter`, `--duration-row`, `--duration-page`, `--duration-blob`, `--lift`, `--bar-height`, `--scroll-pad`, `--gauge-mini`, `--reading-max`, `--login-max`. `--font-display` vaut `"Outfit", "Atkinson Hyperlegible Next", sans-serif`. `--shadow-overlay` disparaît.

- [ ] **Step 1: Write the failing test**

Créer `scripts/arc-soft.test.ts` :

```ts
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function text(path: string): string {
  return readFileSync(`${root}/${path}`, 'utf8');
}

describe('tokens Arc Soft', () => {
  const css = () => text('apps/web/src/styles/tokens.css').toLowerCase();

  it('pose le verre, les blobs et Outfit, sans violet de marque', () => {
    const tokens = css();
    expect(tokens).toContain('--wash-top: #faf8f4');
    expect(tokens).toContain('--wash-bottom: #d7e7f2');
    expect(tokens).toContain('--blob-petrol: #9fcfcb');
    expect(tokens).toContain('--blob-peach: #f3c7b4');
    expect(tokens).toContain('--blob-lilac: #e3d4f0');
    expect(tokens).toContain('--blob-opacity-petrol: 0.55');
    expect(tokens).toContain('--blob-opacity-peach: 0.45');
    expect(tokens).toContain('--blob-opacity-lilac: 0.35');
    expect(tokens).toContain('--glass: rgb(255 255 255 / 0.64)');
    expect(tokens).toContain('--glass-border: rgb(255 255 255 / 0.3)');
    expect(tokens).toContain('--glass-blur: 20px');
    expect(tokens).toContain('--shadow-float: 0 18px 48px rgb(27 31 36 / 0.1)');
    expect(tokens).toContain('--plate: #ffffff');
    expect(tokens).toContain('--peach-fill: #f8e4d8');
    expect(tokens).toContain('--peach-border: #e39a78');
    expect(tokens).toContain('--on-peach: #1b1f24');
    expect(tokens).toContain('--radius-float: 16px');
    expect(tokens).toContain('--font-display: "outfit"');
    expect(tokens).toContain('--ease-out: cubic-bezier(0.22, 1, 0.36, 1)');
    expect(tokens).toContain('--duration-hover: 200ms');
    expect(tokens).toContain('--duration-enter: 280ms');
    expect(tokens).toContain('--duration-row: 240ms');
    expect(tokens).toContain('--duration-page: 450ms');
    expect(tokens).toContain('--duration-blob: 32s');
    expect(tokens).toContain('--duration-gauge: 400ms');
    expect(tokens).toContain('--lift: -3px');
    expect(tokens).toContain('--bar-height: 56px');
    expect(tokens).toContain('--scroll-pad: 88px');
    expect(tokens).toContain('--gauge-mini: 64px');
    expect(tokens).toContain('--reading-max: 45rem');
    expect(tokens).toContain('--login-max: 30rem');
    expect(tokens).not.toContain('--shadow-overlay');
    for (const banned of ['#6366f1', '#8b5cf6', '#a855f7']) {
      expect(tokens).not.toContain(banned);
    }
    expect(tokens).toContain('--accent: #0f5c5a');
    expect(tokens).toContain('--score-good: #1f5fad');
    expect(tokens).not.toMatch(/--accent:[^;]*#e3d4f0/);
    expect(tokens).not.toMatch(/--score-[a-z]+: #e3d4f0/);
  });

  it('assombrit le fond, le verre et les blobs sans toucher au pêche ni aux scores', () => {
    const tokens = css();
    expect(tokens).toContain('--wash-bottom: #1a2830');
    expect(tokens).toContain('--glass: rgb(29 33 38 / 0.72)');
    expect(tokens).toContain('--glass-border: rgb(255 255 255 / 0.18)');
    expect(tokens).toContain('--shadow-float: 0 18px 48px rgb(0 0 0 / 0.35)');
    expect(tokens).toContain('--plate: #1d2126');
    expect(tokens).toContain('--blob-opacity-petrol: 0.18');
    expect(tokens).toContain('--blob-opacity-peach: 0.18');
    expect(tokens).toContain('--blob-opacity-lilac: 0.18');
    expect(tokens).toContain('--score-good: #7fb0ee');
    expect(tokens.match(/--on-peach: #1b1f24/g)?.length).toBe(1);
  });
});

describe('Outfit', () => {
  it('auto-héberge deux graisses latin et la licence, sans Sora ni Manrope', () => {
    expect(statSync(`${root}/apps/web/src/fonts/outfit-latin-600-normal.woff2`).size).toBe(14140);
    expect(statSync(`${root}/apps/web/src/fonts/outfit-latin-700-normal.woff2`).size).toBe(14060);
    expect(text('apps/web/src/fonts/OFL-outfit.txt')).toContain('SIL Open Font License');
    const fonts = text('apps/web/src/styles/fonts.css');
    expect(fonts).toContain('font-family: "Outfit"');
    expect(fonts).toContain('font-weight: 600');
    expect(fonts).toContain('font-weight: 700');
    expect(fonts).toContain('font-display: swap');
    expect(fonts).toContain('outfit-latin-600-normal.woff2');
    expect(fonts).toContain('outfit-latin-700-normal.woff2');
    expect(fonts.toLowerCase()).not.toContain('fonts.googleapis.com');
    expect(fonts.toLowerCase()).not.toContain('sora');
    expect(fonts.toLowerCase()).not.toContain('manrope');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run scripts/arc-soft.test.ts`

Expected: FAIL. `ENOENT` sur `outfit-latin-600-normal.woff2`, ou assertion sur `--wash-top` absente.

- [ ] **Step 3: Vendor Outfit and add the tokens**

Depuis la racine du dépôt :

```bash
pnpm add -D @fontsource/outfit@5.2.8
cp node_modules/@fontsource/outfit/files/outfit-latin-600-normal.woff2 apps/web/src/fonts/outfit-latin-600-normal.woff2
cp node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff2 apps/web/src/fonts/outfit-latin-700-normal.woff2
cp node_modules/@fontsource/outfit/LICENSE apps/web/src/fonts/OFL-outfit.txt
pnpm remove -D @fontsource/outfit
```

Le `pnpm-lock.yaml` doit revenir à son état précédent. Ne pas laisser `@fontsource/outfit` dans `package.json`.

Ajouter à la fin de `apps/web/src/styles/fonts.css` :

```css
@font-face {
  font-family: "Outfit";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("../fonts/outfit-latin-600-normal.woff2") format("woff2");
}

@font-face {
  font-family: "Outfit";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("../fonts/outfit-latin-700-normal.woff2") format("woff2");
}
```

Dans `:root` de `apps/web/src/styles/tokens.css`, remplacer `--on-accent: var(--paper);` par `--on-accent: #ffffff;` et remplacer `--shadow-overlay: 0 4px 16px rgb(0 0 0 / 0.08);` par le bloc suivant :

```css
  --wash-top: #faf8f4;
  --wash-bottom: #d7e7f2;
  --blob-petrol: #9fcfcb;
  --blob-peach: #f3c7b4;
  --blob-lilac: #e3d4f0;
  --blob-opacity-petrol: 0.55;
  --blob-opacity-peach: 0.45;
  --blob-opacity-lilac: 0.35;
  --glass: rgb(255 255 255 / 0.64);
  --glass-border: rgb(255 255 255 / 0.3);
  --glass-blur: 20px;
  --shadow-float: 0 18px 48px rgb(27 31 36 / 0.1);
  --plate: #ffffff;
  --peach-fill: #f8e4d8;
  --peach-border: #e39a78;
  --on-peach: #1b1f24;
  --radius-float: 16px;
  --font-display: "Outfit", "Atkinson Hyperlegible Next", sans-serif;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-hover: 200ms;
  --duration-enter: 280ms;
  --duration-row: 240ms;
  --duration-page: 450ms;
  --duration-blob: 32s;
  --lift: -3px;
  --bar-height: 56px;
  --scroll-pad: 88px;
  --gauge-mini: 64px;
  --reading-max: 45rem;
  --login-max: 30rem;
```

Laisser `--duration-gauge: 400ms` en place. Ne pas modifier les lignes `--score-*`.

Coller ce bloc à l’intérieur de `:root[data-theme="dark"]` et le même bloc à l’intérieur de `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` :

```css
  --wash-top: #15181c;
  --wash-bottom: #1a2830;
  --glass: rgb(29 33 38 / 0.72);
  --glass-border: rgb(255 255 255 / 0.18);
  --shadow-float: 0 18px 48px rgb(0 0 0 / 0.35);
  --plate: #1d2126;
  --blob-opacity-petrol: 0.18;
  --blob-opacity-peach: 0.18;
  --blob-opacity-lilac: 0.18;
```

Ne pas redéclarer `--on-peach`, `--peach-fill` ni `--peach-border` dans le sombre : le texte sur pêche reste `#1b1f24`.

Dans le bloc `@media print` existant, remplacer `--shadow-overlay: none;` par :

```css
    --wash-top: #ffffff;
    --wash-bottom: #ffffff;
    --glass: #ffffff;
    --glass-border: #4a5260;
    --shadow-float: none;
    --plate: #ffffff;
```

Vérifier qu’aucun autre fichier ne cite l’ancien token :

Run: `rg -n "shadow-overlay" apps/web scripts`

Expected: aucune ligne. S’il en reste une, la remplacer par `var(--shadow-float)` dans ce même commit.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run scripts/arc-soft.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/fonts/outfit-latin-600-normal.woff2 apps/web/src/fonts/outfit-latin-700-normal.woff2 apps/web/src/fonts/OFL-outfit.txt apps/web/src/styles/tokens.css apps/web/src/styles/fonts.css scripts/arc-soft.test.ts package.json pnpm-lock.yaml
git commit -m "feat: tokens Arc Soft et police Outfit"
```

### Task 2: Coquille, verre, blobs, mouvement

**Files:**
- Create: `apps/web/src/styles/arc.css`
- Modify: `apps/web/src/layouts/Base.astro` (import du CSS et blobs seulement ; la barre reste pour la tâche 4)
- Modify: `scripts/arc-soft.test.ts`
- Test: `scripts/arc-soft.test.ts`

**Interfaces:**
- Consumes: les variables de la tâche 1. `--space-8` vaut 64px et sert de flou de blob. `--space-1` vaut 4px et sert d’écart de rayon entre enveloppe et plaque.
- Produces: classes `.blobs`, `.blob`, `.blob-petrol`, `.blob-peach`, `.blob-lilac`, `.glass`, `.glass-plate`, `.glass-module`, `.lift`, `.stagger`, `.reading`, `.login-card`. Keyframes `drift` et `rise`. Le sélecteur `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` pose le repli opaque.

- [ ] **Step 1: Write the failing test**

Ajouter dans `scripts/arc-soft.test.ts` :

```ts
describe('coquille', () => {
  const arc = () => text('apps/web/src/styles/arc.css');

  it('n’écrit aucune couleur littérale et pose le verre', () => {
    const css = arc();
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(css).toContain('background: var(--glass)');
    expect(css).toContain('backdrop-filter: blur(var(--glass-blur))');
    expect(css).toContain('-webkit-backdrop-filter: blur(var(--glass-blur))');
    expect(css).toContain('box-shadow: var(--shadow-float)');
    expect(css).toContain('background: var(--plate)');
    expect(css).toContain('filter: blur(var(--space-8))');
    expect(css).toContain('.blob-lilac');
    expect(css).toContain('display: none');
    expect(css).toContain('@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('animation: none');
    expect(css).toContain('animation-delay: 200ms');
    expect(css).toContain('var(--duration-row)');
    expect(css).not.toContain('translateY');
  });
});
```

La levée utilise `translate`, pas `translateY`, pour ne pas écraser le centrage des blobs.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run scripts/arc-soft.test.ts`

Expected: FAIL avec `ENOENT` sur `apps/web/src/styles/arc.css`.

- [ ] **Step 3: Write arc.css and mount it**

Créer `apps/web/src/styles/arc.css` :

```css
html {
  scroll-padding-top: var(--scroll-pad);
}

body {
  background: linear-gradient(to bottom, var(--wash-top), var(--wash-bottom)) fixed;
}

.blobs {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(var(--space-8));
  pointer-events: none;
}

.blob-petrol {
  width: min(42vw, 640px);
  height: min(42vw, 640px);
  background: var(--blob-petrol);
  opacity: var(--blob-opacity-petrol);
  top: -8vh;
  left: -10vw;
}

.blob-peach {
  width: min(36vw, 520px);
  height: min(36vw, 520px);
  background: var(--blob-peach);
  opacity: var(--blob-opacity-peach);
  top: calc(50vh - min(18vw, 260px));
  right: -4vw;
}

.blob-lilac {
  width: min(28vw, 420px);
  height: min(28vw, 420px);
  background: var(--blob-lilac);
  opacity: var(--blob-opacity-lilac);
  bottom: -8vh;
  left: -6vw;
}

.glass {
  background: var(--glass);
  border: var(--border) solid var(--glass-border);
  border-radius: var(--radius-float);
  box-shadow: var(--shadow-float);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: var(--space-1);
}

.glass-plate {
  background: var(--plate);
  border-radius: calc(var(--radius-float) - var(--space-1));
  padding: var(--space-5);
}

.glass-module {
  border-radius: var(--radius-lg);
}

.glass-module .glass-plate {
  border-radius: calc(var(--radius-lg) - var(--space-1));
}

.reading {
  width: min(100%, var(--reading-max));
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.login-card {
  width: min(100%, var(--login-max));
  margin-inline: auto;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass {
    background: var(--plate);
    border-color: var(--line);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@media (max-width: 768px) {
  .blob-lilac {
    display: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  body:not(.blobs-still) .blob-petrol {
    animation: drift var(--duration-blob) linear infinite alternate;
  }

  body:not(.blobs-still) .blob-peach {
    animation: drift var(--duration-blob) linear infinite alternate-reverse;
  }

  body:not(.blobs-still) .blob-lilac {
    animation: drift var(--duration-blob) linear infinite alternate;
  }

  .lift {
    transition: translate var(--duration-hover) var(--ease-out);
  }

  .lift:hover {
    translate: 0 var(--lift);
  }

  .stagger > :nth-child(-n + 6) {
    animation: rise var(--duration-row) var(--ease-out) both;
  }

  .stagger > :nth-child(2) { animation-delay: 40ms; }
  .stagger > :nth-child(3) { animation-delay: 80ms; }
  .stagger > :nth-child(4) { animation-delay: 120ms; }
  .stagger > :nth-child(5) { animation-delay: 160ms; }
  .stagger > :nth-child(6) { animation-delay: 200ms; }
}

@media (prefers-reduced-motion: reduce) {
  .blob,
  .lift,
  .stagger > * {
    animation: none;
    transition: none;
  }
}

@keyframes drift {
  from { translate: 0 0; }
  to { translate: 24px 12px; }
}

@keyframes rise {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media print {
  .blobs,
  .site-bar {
    display: none;
  }

  body {
    padding-top: 0;
    background: var(--plate);
  }

  .glass {
    background: var(--plate);
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```

Dans `apps/web/src/layouts/Base.astro`, ajouter l’import sous les trois imports de CSS existants :

```astro
import '../styles/arc.css';
```

Juste après `<body>`, avant le `<header>` actuel, ajouter :

```astro
    <div class="blobs" aria-hidden="true">
      <div class="blob blob-petrol"></div>
      <div class="blob blob-peach"></div>
      <div class="blob blob-lilac"></div>
    </div>
```

Le header papier actuel reste jusqu’à la tâche 4. `main` et `header` doivent passer au-dessus des blobs. Ajouter dans `arc.css` :

```css
.site-header,
.site-bar,
.wrap,
.site-footer {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run scripts/arc-soft.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/styles/arc.css apps/web/src/layouts/Base.astro scripts/arc-soft.test.ts
git commit -m "feat: coquille de verre, blobs et mouvement"
```

### Task 3: Charte et plafond 700 Ko

**Files:**
- Modify: `docs/DESIGN.md`
- Modify: `.cursor/rules/design.mdc`
- Modify: `scripts/publish-policy.ts`
- Modify: `docs/RECETTE.md`
- Modify: `scripts/arc-soft.test.ts`
- Test: `scripts/arc-soft.test.ts`

**Interfaces:**
- Consumes: `HOME_MAX_BYTES` exporté par `scripts/publish-policy.ts`. Aujourd’hui il vaut `500_000`.
- Produces: `HOME_MAX_BYTES === 700_000`. `docs/DESIGN.md` autorise le verre, les blobs, l’ombre flottante, Outfit et le mouvement du §3, et conserve le reste des interdits. La checklist §9 ne classe plus ces exceptions comme motifs interdits.

- [ ] **Step 1: Write the failing test**

Ajouter dans `scripts/arc-soft.test.ts` :

```ts
import { HOME_MAX_BYTES } from './publish-policy.js';

describe('plafond et charte', () => {
  it('porte l’accueil à 700 Ko et cite Outfit dans la charte', () => {
    expect(HOME_MAX_BYTES).toBe(700_000);
    const design = text('docs/DESIGN.md');
    expect(design).toContain('Outfit');
    expect(design).toContain('700');
    expect(design).toContain('0 18px 48px rgb(27 31 36 / 0.10)');
    expect(design).toContain('#9FCFCB');
    expect(design).toContain('#E3D4F0');
    expect(design).not.toContain('Source Serif');
    const rule = text('.cursor/rules/design.mdc');
    expect(rule).toContain('Outfit');
    expect(rule).not.toContain('Source Serif');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run scripts/arc-soft.test.ts`

Expected: FAIL. `HOME_MAX_BYTES` vaut 500000, ou `docs/DESIGN.md` ne contient pas `Outfit`.

- [ ] **Step 3: Update the charter, the agent rule, and the ceiling**

Dans `scripts/publish-policy.ts`, remplacer `export const HOME_MAX_BYTES = 500_000;` par :

```ts
export const HOME_MAX_BYTES = 700_000;
```

Laisser `FONT_MAX_BYTES` à `400 * 1024`.

Dans `docs/RECETTE.md`, juste après la ligne « Poids de l’accueil : 75 255 octets (plafond 500 000). », ajouter :

```markdown
Le plafond de 500 000 octets est celui de la mesure PART-26 ci-dessus. L’implémentation Arc Soft porte la constante à 700 000 octets pour le document, le CSS, le JS et les polices de l’accueil. Le chiffre 75 255 ne change pas.
```

Dans `docs/DESIGN.md` §2, remplacer les trois premières puces par :

```markdown
- Dégradés violet/indigo vers bleu/rose, et texte en dégradé. Le dégradé de fond Arc Soft est autorisé : `#FAF8F4` vers `#D7E7F2` en clair, `#15181C` vers `#1A2830` en sombre, linéaire, du haut vers le bas, fixe.
- Violet ou indigo comme couleur de marque, de lien, de bouton ou de score (`#6366F1`, `#8B5CF6`, `#A855F7`). Le lilas `#E3D4F0` n’existe que comme blob.
- Verre hors bornes. Le verre autorisé a une enveloppe `rgba(255, 255, 255, 0.64)` en clair et `rgba(29, 33, 38, 0.72)` en sombre, un flou de 20px, une bordure blanche à 30 % (18 % en sombre) et une plaque opaque derrière le texte. Pas de shimmer argenté.
- Blobs autres que le pétrole `#9FCFCB`, la pêche `#F3C7B4` et le lilas `#E3D4F0`, aux tailles et positions de la spec Arc Soft. Pas de halo coloré.
```

Dans `docs/DESIGN.md` §3, remplacer la phrase « Une seule famille sans empattement : un second caractère d’affichage fait « modèle ». » par :

```markdown
Le corps, l’interface, les scores et les titres des pages légales restent en Atkinson Hyperlegible Next. Le H1 des autres pages utilise Outfit (SIL OFL, auto-hébergée, graisses 600 et 700). Sora et Manrope ne sont pas utilisées.
```

Dans `docs/DESIGN.md` §5, remplacer « Rayons hiérarchisés : 4px (champs, badges), 8px (boutons), 12px (panneaux). » par :

```markdown
Rayons hiérarchisés : 4px (champs, badges), 8px (boutons), 12px (modules intérieurs), 16px (enveloppes flottantes : barre, hero, modales).
```

Remplacer « Une seule ombre est autorisée, pour les menus/modales : `0 4px 16px rgb(0 0 0 / .08)`. » par :

```markdown
Une seule ombre, la même partout : `0 18px 48px rgb(27 31 36 / 0.10)` en clair, `0 18px 48px rgb(0 0 0 / 0.35)` en sombre. Elle ne change pas au survol.
```

Dans `docs/DESIGN.md` §8, remplacer « page d'accueil < 500 Ko » par :

```markdown
page d’accueil < 700 Ko gzippés pour le document, le CSS, le JS et les polices du premier écran
```

Dans `docs/DESIGN.md` §9, remplacer la première case par :

```markdown
- [ ] Aucun violet de marque, aucun texte en dégradé, aucun emoji, aucune grille de 3 cartes identiques, aucun hero centré générique, aucun shimmer. Le verre, les trois blobs pastel, l’ombre flottante et le mouvement court sont ceux de la spec Arc Soft, coupés par `prefers-reduced-motion`.
```

Remplacer la puce « Fade-up au scroll sur chaque élément » de la §2 par :

```markdown
- Fade-up au scroll sur chaque élément. Le mouvement autorisé est celui de la spec Arc Soft (survol 200 ms, entrée 280 ms, jauge ≤ 400 ms, page ≤ 450 ms, blobs 32 s), toujours coupé par `prefers-reduced-motion`.
```

Remplacer `.cursor/rules/design.mdc` par :

```markdown
---
description: Charte de design obligatoire pour toute UI
globs: apps/web/**/*.astro,apps/web/**/*.svelte,apps/web/**/*.css,apps/web/src/i18n/**
alwaysApply: false
---
- `docs/DESIGN.md` fait foi. Lire seulement la section utile.
- Uniquement les tokens de `apps/web/src/styles/tokens.css` (couleurs, espacements 4px, rayons 4/8/12/16).
- Statut = forme + libellé + couleur. Jamais rouge/vert seuls. Le pêche ne code aucun score.
- Polices auto-hébergées : Atkinson Hyperlegible Next (texte, interface, scores, titres légaux), Outfit (H1 de page hors pages légales), JetBrains Mono (URL et valeurs techniques). Zéro requête tierce.
- Interdits : violet de marque, texte en dégradé, emoji, hero centré générique, 3 cartes identiques, capitales criées, shimmer. Verre, blobs pastel et ombre flottante : seulement dans les bornes de DESIGN.md.
- Ton : vouvoiement, ≤ 20 mots/phrase, constat puis conséquence puis action.
- Avant merge : checklist §9 + axe 0 violation. `prefers-reduced-motion` coupe le mouvement.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run scripts/arc-soft.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/DESIGN.md .cursor/rules/design.mdc scripts/publish-policy.ts docs/RECETTE.md scripts/arc-soft.test.ts
git commit -m "docs: autoriser Arc Soft dans la charte"
```

### Task 4: Barre flottante

**Files:**
- Create: `apps/web/src/components/SiteBar.svelte`
- Create: `apps/web/e2e/arc-barre.spec.ts`
- Modify: `apps/web/src/layouts/Base.astro`
- Modify: `apps/web/src/styles/arc.css`
- Modify: `apps/web/src/i18n/fr.ts`
- Modify: `apps/web/e2e/legal.spec.ts`
- Test: `apps/web/e2e/arc-barre.spec.ts`
- Test: `apps/web/e2e/legal.spec.ts`

**Interfaces:**
- Consumes: `currentSession(): Promise<Session | null>` de `apps/web/src/lib/browser-session.ts`. `t` de `apps/web/src/i18n/index.ts`. Classes `.glass` et `.glass-plate` de la tâche 2. Clés existantes `skip.content`, `brand.name`, `nav.main`, `nav.sites`, `nav.account`, `nav.login`, `footer.method.nav`.
- Produces: `SiteBar` avec prop `pathname: string`. Liens dont le texte est `t('nav.method')`, `t('nav.login')`, `t('nav.sites')`, `t('nav.account')`. Bouton `t('nav.menu')` avec `aria-expanded` et `aria-controls="nav-panel"`. Lien actif : `aria-current="page"`. Pied : ordre Méthode, Conditions d’utilisation, Confidentialité, Mentions légales, Accessibilité. `footer.terms` vaut `Conditions d’utilisation`.

- [ ] **Step 1: Write the failing test**

Créer `apps/web/e2e/arc-barre.spec.ts` :

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('la barre flottante indique la page et le menu se ferme avec Échap', async ({
  page,
}) => {
  await page.goto('/methode');
  const bar = page.getByRole('navigation', { name: 'Pages' });
  await expect(bar.getByRole('link', { name: 'Méthode' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(bar.getByRole('link', { name: 'Connexion' })).toBeVisible();
  await expect(bar.getByRole('link', { name: 'Sites' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 800 });
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('le pied nomme les conditions et reste sur une navigation', async ({
  page,
}) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(
    footer.getByRole('link', { name: 'Conditions d’utilisation' }),
  ).toHaveAttribute('href', '/cgu');
  await expect(footer.getByRole('link', { name: 'Méthode' })).toHaveAttribute(
    'href',
    '/methode',
  );
});
```

Dans `apps/web/e2e/legal.spec.ts`, une seule occurrence vise le pied. Remplacer :

```ts
    footer.getByRole('link', { name: 'Conditions' }),
```

par :

```ts
    footer.getByRole('link', { name: 'Conditions d’utilisation' }),
```

Le titre `Conditions d’utilisation` déjà attendu sur `/cgu` ne change pas.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @audigy/web exec playwright install chromium && pnpm --filter @audigy/web exec playwright test e2e/arc-barre.spec.ts`

Expected: FAIL. Le lien « Méthode » est absent de la navigation `Pages`, ou le bouton « Menu » est introuvable.

- [ ] **Step 3: Implement the bar**

Dans `apps/web/src/i18n/fr.ts`, ajouter après `'nav.login'` :

```ts
  'nav.method': 'Méthode',
  'nav.menu': 'Menu',
```

Remplacer `'footer.terms': 'Conditions',` par :

```ts
  'footer.terms': 'Conditions d’utilisation',
```

Créer `apps/web/src/components/SiteBar.svelte` :

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n/index.js';
  import { currentSession } from '../lib/browser-session.js';

  interface Props {
    pathname: string;
  }

  let { pathname }: Props = $props();
  let loggedIn = $state(false);
  let open = $state(false);
  let menuButton = $state<HTMLButtonElement | null>(null);

  function normalize(path: string): string {
    if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
    return path;
  }

  const here = $derived(normalize(pathname));

  function current(href: string): 'page' | undefined {
    return here === href ? 'page' : undefined;
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !open) return;
    open = false;
    menuButton?.focus();
  }

  onMount(() => {
    window.addEventListener('keydown', onKey);
    void currentSession().then((session) => {
      loggedIn = session !== null;
    });
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<nav aria-label={t('nav.main')}>
  <button
    bind:this={menuButton}
    class="button menu-button"
    type="button"
    aria-expanded={open}
    aria-controls="nav-panel"
    onclick={() => { open = !open; }}
  >
    {t('nav.menu')}
  </button>
  <div id="nav-panel" class:open>
    <a href="/methode" aria-current={current('/methode')}>{t('nav.method')}</a>
    {#if loggedIn}
      <a href="/sites" aria-current={current('/sites')}>{t('nav.sites')}</a>
      <a href="/compte" aria-current={current('/compte')}>{t('nav.account')}</a>
    {:else}
      <a href="/connexion" aria-current={current('/connexion')}>{t('nav.login')}</a>
    {/if}
  </div>
</nav>

<style>
  nav { position: relative; }
  #nav-panel { display: flex; flex-wrap: wrap; gap: var(--space-4); }
  .menu-button { display: none; }
  a[aria-current='page'] {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }
  @media (max-width: 768px) {
    .menu-button { display: inline-flex; }
    #nav-panel { display: none; }
    #nav-panel.open {
      display: flex;
      flex-direction: column;
      position: absolute;
      top: calc(100% + var(--space-2));
      right: 0;
      min-width: 12rem;
      padding: var(--space-4);
      background: var(--plate);
      border: var(--border) solid var(--glass-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-float);
    }
  }
</style>
```

Le panneau mobile est une plaque opaque (`--plate`) parce qu’il contient du texte. Le flou reste sur l’enveloppe `.site-bar`.

La tâche 2 a déjà inséré un conteneur `.blobs` avant l’ancien header. Le retirer pour n’en garder qu’un. Remplacer depuis le lien d’évitement (s’il est encore dans le header) jusqu’à la fin du `</header>` par le bloc suivant. Le lien d’évitement est le premier enfant de `<body>`, avant `.blobs` et avant la barre. `ThemeToggle` reste dans la barre, hors du menu. Il n’y a qu’un seul `<div class="blobs">`.

```astro
    <a class="skip" href="#contenu">{t('skip.content')}</a>
    <div class="blobs" aria-hidden="true">
      <div class="blob blob-petrol"></div>
      <div class="blob blob-peach"></div>
      <div class="blob blob-lilac"></div>
    </div>
    <header class:list={['site-bar', { 'print-hide': print }]}>
      <div class="glass bar-glass">
        <div class="glass-plate bar-plate">
          <a class="brand" href="/">{t('brand.name')}</a>
          <SiteBar pathname={Astro.url.pathname} client:load />
          <ThemeToggle initial={initialTheme} client:load />
        </div>
      </div>
    </header>
```

Ajouter l’import de `SiteBar` à côté de celui de `ThemeToggle`.

Dans le `<footer>`, remplacer l’ordre des liens par : Méthode, Conditions d’utilisation, Confidentialité, Mentions légales, Accessibilité. Les `href` restent `/methode`, `/cgu`, `/confidentialite`, `/mentions-legales`, `/accessibilite`. Retirer le paragraphe `footer.note` de l’intérieur d’un verre : le pied n’a pas de classe `glass`. Garder le filet déjà posé par `.site-footer`.

Ajouter dans `apps/web/src/styles/arc.css` :

```css
body { padding-top: var(--scroll-pad); }

.site-bar {
  position: fixed;
  z-index: 2;
  top: var(--space-4);
  left: 50%;
  translate: -50% 0;
  width: min(var(--content-max), calc(100% - var(--space-6)));
  height: var(--bar-height);
}

.bar-glass,
.bar-plate {
  height: 100%;
}

.bar-plate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: 0;
  padding-inline: var(--space-4);
}

.skip { z-index: 3; }

.site-footer {
  border-top: var(--border) solid var(--line);
  background: transparent;
  box-shadow: none;
}
```

Supprimer les règles `.site-header` de `apps/web/src/styles/base.css` qui dessinaient le filet papier (le bloc `.site-header { display:flex ... border-bottom ... }`). Garder `.brand` et `.site-nav` n’est plus utile : les styles de liens vivent dans `SiteBar.svelte`. Ne pas laisser un second header dans les pages.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @audigy/web exec playwright test e2e/arc-barre.spec.ts e2e/legal.spec.ts`

Expected: PASS. axe : 0 violation.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/SiteBar.svelte apps/web/src/layouts/Base.astro apps/web/src/styles/arc.css apps/web/src/styles/base.css apps/web/src/i18n/fr.ts apps/web/e2e/arc-barre.spec.ts apps/web/e2e/legal.spec.ts
git commit -m "feat: barre flottante unique"
```

### Task 5: Accueil

**Files:**
- Create: `apps/web/src/lib/home-example.ts`
- Create: `apps/web/src/lib/home-example.test.ts`
- Create: `apps/web/src/components/HomeAuditForm.svelte`
- Create: `apps/web/e2e/arc-accueil.spec.ts`
- Modify: `apps/web/src/lib/site-url.ts`
- Modify: `apps/web/src/lib/site-url.test.ts`
- Modify: `apps/web/src/pages/index.astro`
- Modify: `apps/web/src/styles/base.css`
- Modify: `apps/web/src/styles/arc.css`
- Modify: `apps/web/src/i18n/fr.ts`
- Modify: `apps/web/e2e/parcours.spec.ts`
- Test: `apps/web/src/lib/home-example.test.ts`
- Test: `apps/web/src/lib/site-url.test.ts`
- Test: `apps/web/e2e/arc-accueil.spec.ts`

**Interfaces:**
- Consumes: `REPORT_DOMAINS` et `domainPlain` de `apps/web/src/lib/domains.ts`. `levelForScore` de `apps/web/src/lib/score.ts`. `ScoreGauge` (`size="hero"`) et `StatusMark`. `normalizeSiteUrl` reste inchangé : `exemple.fr` sans schéma reste valable pour `/lancer` et pour le formulaire des sites.
- Produces: `isCompleteHttpUrl(raw: string): boolean`. Vrai seulement pour une URL `http:` ou `https:` d’au plus 2048 caractères dont l’hôte contient un point. `HOME_EXAMPLE_SCORE = 72`. `HOME_EXAMPLE_ROWS = [{ key: 'domain.seo.plain', score: 64 }, { key: 'home.example.https', score: 86 }]`. `HOME_OFFER_SCORES` couvre chaque id de `REPORT_DOMAINS` avec les valeurs 72, 64, 58, 81, 76, 83, 69, 44 dans l’ordre du tableau `REPORT_DOMAINS`.

- [ ] **Step 1: Write the failing test**

Ajouter dans `apps/web/src/lib/site-url.test.ts` un import de `isCompleteHttpUrl` et :

```ts
describe('isCompleteHttpUrl', () => {
  it('accepte une adresse complète et refuse un nom seul', () => {
    expect(isCompleteHttpUrl('https://exemple.fr')).toBe(true);
    expect(isCompleteHttpUrl('http://exemple.fr/chemin')).toBe(true);
    expect(isCompleteHttpUrl('exemple.fr')).toBe(false);
    expect(isCompleteHttpUrl('')).toBe(false);
    expect(isCompleteHttpUrl('ftp://exemple.fr')).toBe(false);
    expect(isCompleteHttpUrl('https://localhost')).toBe(false);
  });
});
```

Créer `apps/web/src/lib/home-example.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { REPORT_DOMAINS } from './domains.js';
import {
  HOME_EXAMPLE_ROWS,
  HOME_EXAMPLE_SCORE,
  HOME_OFFER_SCORES,
} from './home-example.js';
import { levelForScore } from './score.js';

describe('exemple d’accueil', () => {
  it('fixe la jauge à 72 et deux lignes de formes différentes', () => {
    expect(HOME_EXAMPLE_SCORE).toBe(72);
    expect(levelForScore(HOME_EXAMPLE_SCORE)).toBe('improve');
    expect(HOME_EXAMPLE_ROWS).toEqual([
      { key: 'domain.seo.plain', score: 64 },
      { key: 'home.example.https', score: 86 },
    ]);
    expect(levelForScore(64)).toBe('improve');
    expect(levelForScore(86)).toBe('good');
    expect(Object.keys(HOME_OFFER_SCORES)).toEqual([...REPORT_DOMAINS]);
  });
});
```

Créer `apps/web/e2e/arc-accueil.spec.ts` :

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('l’accueil montre l’exemple avant de demander l’adresse', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Vérifiez la santé de votre site, gratuitement.',
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Un score, ce qu’il veut dire, et quoi corriger. Rien n’est publié sans vous.',
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Adresse du site')).toHaveAttribute('type', 'url');
  await expect(page.getByRole('button', { name: "Lancer l'audit" })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Comment le score est calculé' }),
  ).toHaveAttribute('href', '/methode');
  await expect(page.getByText('Exemple')).toBeVisible();
  await expect(
    page.getByRole('img', { name: /Score global : 72 sur 100, à améliorer/ }),
  ).toBeVisible();
  await expect(page.getByText('Visibilité sur Google')).toBeVisible();
  await expect(page.getByText('Connexion chiffrée')).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Ce que vous obtenez' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Gratuit pour les particuliers' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Comment lire le score' }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('une adresse incomplète reste sur l’accueil', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => {
    const root = globalThis as unknown as {
      document: {
        querySelectorAll: (
          selector: string,
        ) => Iterable<{ hasAttribute: (name: string) => boolean }>;
      };
    };
    const islands = [...root.document.querySelectorAll('astro-island')];
    return islands.length > 0 && islands.every((island) => !island.hasAttribute('ssr'));
  });
  await page.getByLabel('Adresse du site').fill('exemple.fr');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText(/Indiquez une adresse complète/)).toBeVisible();
});

test('l’accueil ne défile pas en large à 320, 768 et 1280', async ({ page }) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  }
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await expect(page.locator('.blob-lilac')).toBeHidden();
});
```

Dans `apps/web/e2e/parcours.spec.ts`, remplacer `fill('exemple.fr')` du formulaire d’accueil par `fill('https://exemple.fr')`. Le reste du parcours, jusqu’à `/connexion`, ne change pas dans cette tâche.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/home-example.test.ts apps/web/src/lib/site-url.test.ts`

Expected: FAIL. `isCompleteHttpUrl` ou `home-example` est introuvable.

- [ ] **Step 3: Implement the home page**

Ajouter dans `apps/web/src/lib/site-url.ts` :

```ts
export function isCompleteHttpUrl(raw: string): boolean {
  if (raw.length === 0 || raw.length > MAX_URL_LENGTH) return false;
  try {
    const url = new URL(raw);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.hostname.includes('.')
    );
  } catch {
    return false;
  }
}
```

Créer `apps/web/src/lib/home-example.ts` :

```ts
import { REPORT_DOMAINS } from './domains.js';

type DomainId = (typeof REPORT_DOMAINS)[number];

export const HOME_EXAMPLE_SCORE = 72;

export const HOME_EXAMPLE_ROWS = [
  { key: 'domain.seo.plain', score: 64 },
  { key: 'home.example.https', score: 86 },
] as const;

export const HOME_OFFER_SCORES: Record<DomainId, number> = {
  performance: 72,
  seo: 64,
  securite: 58,
  ecologie: 81,
  accessibilite: 76,
  qualite: 83,
  vie_privee: 69,
  dns_email: 44,
};
```

Dans `apps/web/src/i18n/fr.ts`, ajouter :

```ts
  'home.support':
    'Un score, ce qu’il veut dire, et quoi corriger. Rien n’est publié sans vous.',
  'home.url.example': 'https://exemple.fr',
  'home.url.error':
    'Indiquez une adresse complète, comme https://exemple.fr.',
  'home.method': 'Comment le score est calculé',
  'home.example.badge': 'Exemple',
  'home.example.sentence': 'Votre site peut encore gagner en clarté.',
  'home.example.https': 'Connexion chiffrée',
  'home.offer.title': 'Ce que vous obtenez',
  'home.offer.link': 'Voir la méthode',
  'home.free.title': 'Gratuit pour les particuliers',
  'home.free.audit': 'L’audit est gratuit.',
  'home.free.account':
    'Un compte n’est pas obligatoire pour lancer une vérification.',
  'home.free.private': 'Le détail d’un site n’est pas public par défaut.',
  'home.scale.title': 'Comment lire le score',
  'home.scale.range.good': '80–100',
  'home.scale.range.improve': '50–79',
  'home.scale.range.problem': '0–49',
```

Créer `apps/web/src/components/HomeAuditForm.svelte` :

```svelte
<script lang="ts">
  import { t } from '../i18n/index.js';
  import { isCompleteHttpUrl } from '../lib/site-url.js';

  let invalid = $state(false);

  function onSubmit(event: SubmitEvent): void {
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    const raw = String(new FormData(form).get('url') ?? '').trim();
    if (isCompleteHttpUrl(raw)) {
      invalid = false;
      return;
    }
    event.preventDefault();
    invalid = true;
  }
</script>

<form class="audit-form" action="/lancer" method="get" novalidate onsubmit={onSubmit}>
  <div class="field">
    <label for="site-url">{t('home.url')}</label>
    <input
      id="site-url"
      class="mono"
      name="url"
      type="url"
      inputmode="url"
      autocomplete="url"
      required
      spellcheck="false"
      maxlength="2048"
      placeholder={t('home.url.example')}
      aria-describedby={invalid ? 'url-error' : 'url-hint'}
      aria-invalid={invalid ? 'true' : undefined}
    />
    <p id="url-hint" class="hint">{t('home.url.hint')}</p>
    {#if invalid}
      <p id="url-error" class="form-error" aria-live="polite">{t('home.url.error')}</p>
    {/if}
  </div>
  <button class="button button-primary lift" type="submit">{t('home.submit')}</button>
</form>
<p class="page-links">
  <a href="/methode">{t('home.method')}</a>
</p>
```

Remplacer tout le fichier `apps/web/src/pages/index.astro` par :

```astro
---
import HomeAuditForm from '../components/HomeAuditForm.svelte';
import ScoreGauge from '../components/ScoreGauge.svelte';
import StatusMark from '../components/StatusMark.svelte';
import { t } from '../i18n/index.js';
import Base from '../layouts/Base.astro';
import { domainPlain, REPORT_DOMAINS } from '../lib/domains.js';
import {
  HOME_EXAMPLE_ROWS,
  HOME_EXAMPLE_SCORE,
  HOME_OFFER_SCORES,
} from '../lib/home-example.js';
import { levelForScore } from '../lib/score.js';

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Audigy',
  inLanguage: 'fr',
  description: t('meta.home.description'),
});

const levels = ['good', 'improve', 'problem', 'untested'] as const;

const labels = {
  good: t('level.good'),
  improve: t('level.improve'),
  problem: t('level.problem'),
  untested: t('level.untested'),
} as const;

const ranges = {
  good: t('home.scale.range.good'),
  improve: t('home.scale.range.improve'),
  problem: t('home.scale.range.problem'),
  untested: t('score.empty'),
} as const;
---

<Base title={t('home.headline')} description={t('meta.home.description')} jsonLd={jsonLd}>
  <section class="hero">
    <div class="hero-copy">
      <h1>{t('home.headline')}</h1>
      <p class="prose">{t('home.support')}</p>
      <HomeAuditForm client:load />
    </div>
    <aside class="hero-preview glass">
      <div class="glass-plate">
        <p class="badge">{t('home.example.badge')}</p>
        <ScoreGauge domain={t('domain.global')} score={HOME_EXAMPLE_SCORE} size="hero" />
        <p>{t('home.example.sentence')}</p>
        <ul class="stagger offer-list">
          {HOME_EXAMPLE_ROWS.map((row) => (
            <li>
              <span>{row.key === 'domain.seo.plain' ? t('domain.seo.plain') : t('home.example.https')}</span>
              <span>{row.score}</span>
              <StatusMark level={levelForScore(row.score)} />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  </section>
  <section class="below">
    <article class="offer glass glass-module">
      <div class="glass-plate">
        <h2>{t('home.offer.title')}</h2>
        <ul class="offer-list">
          {REPORT_DOMAINS.map((id) => (
            <li>
              <span>{domainPlain(id)}</span>
              <span>{HOME_OFFER_SCORES[id]}</span>
              <StatusMark level={levelForScore(HOME_OFFER_SCORES[id])} />
            </li>
          ))}
        </ul>
        <p><a href="/methode">{t('home.offer.link')}</a></p>
      </div>
    </article>
    <article class="free glass glass-module">
      <div class="glass-plate">
        <h2>{t('home.free.title')}</h2>
        <p>{t('home.free.audit')}</p>
        <p>{t('home.free.account')}</p>
        <p>{t('home.free.private')}</p>
      </div>
    </article>
    <article class="scale glass glass-module">
      <div class="glass-plate">
        <h2>{t('home.scale.title')}</h2>
        <ul class="offer-list">
          {levels.map((level) => (
            <li>
              <StatusMark level={level} />
              <span>{labels[level]}</span>
              <span>{ranges[level]}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  </section>
</Base>
```

Dans `apps/web/src/styles/base.css`, le groupe `h1, h2, h3, h4` ne doit plus imposer `--font-text` au H1. Le remplacer par `h2, h3, h4` avec les mêmes propriétés. Ajouter ensuite :

```css
h1 {
  margin: 0 0 var(--space-3);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  line-height: var(--leading-title);
  text-wrap: wrap;
}

.legal h1,
.legal h2,
.legal h3,
.legal h4 {
  font-family: var(--font-text);
}
```

Supprimer l’ancien bloc `h1 { font-size: var(--text-2xl); }` devenu redondant.

Remplacer le bloc `.button-secondary` existant de `base.css` par la règle pêche ci-dessous, et ajouter `.button-bordered` et `.badge` à la suite. Le principal reçoit la classe `lift` seulement là où le HTML la pose (accueil, tuiles, lignes). Dans `base.css` :

```css
.button-secondary {
  border-color: var(--peach-border);
  background: var(--peach-fill);
  color: var(--on-peach);
}

.button-bordered {
  border-color: var(--line);
  background: var(--plate);
  color: var(--ink);
}

.badge {
  display: inline-block;
  margin: 0 0 var(--space-3);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--text-xs);
  font-weight: 600;
}
```

Ajouter la grille dans `arc.css` :

```css
.hero,
.below {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--space-5);
}

.hero-copy { grid-column: 1 / 7; }
.hero-preview { grid-column: 7 / 13; margin-top: var(--space-7); }
.offer { grid-column: 1 / 9; }
.free { grid-column: 9 / 13; margin-top: var(--space-6); }
.scale { grid-column: 1 / -1; }
.below { margin-top: var(--space-8); }

.offer-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.offer-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-3);
  border-bottom: var(--border) solid var(--line);
}

@media (max-width: 768px) {
  .hero,
  .below { grid-template-columns: 1fr; }
  .hero-copy,
  .hero-preview,
  .offer,
  .free,
  .scale { grid-column: auto; margin-top: 0; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/home-example.test.ts apps/web/src/lib/site-url.test.ts && pnpm copy-lint && pnpm --filter @audigy/web exec playwright test e2e/arc-accueil.spec.ts e2e/parcours.spec.ts`

Expected: PASS. Le parcours atteint encore `/connexion` après `https://exemple.fr`. copy-lint : 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/home-example.ts apps/web/src/lib/home-example.test.ts apps/web/src/lib/site-url.ts apps/web/src/lib/site-url.test.ts apps/web/src/components/HomeAuditForm.svelte apps/web/src/pages/index.astro apps/web/src/styles/base.css apps/web/src/styles/arc.css apps/web/src/i18n/fr.ts apps/web/e2e/arc-accueil.spec.ts apps/web/e2e/parcours.spec.ts
git commit -m "feat: accueil Arc Soft"
```

### Task 6: Transitions de page

**Files:**
- Modify: `apps/web/src/layouts/Base.astro`
- Modify: `apps/web/src/components/ScoreGauge.svelte`
- Modify: `apps/web/src/styles/arc.css`
- Modify: `scripts/arc-soft.test.ts`
- Test: `scripts/arc-soft.test.ts`
- Test: `apps/web/e2e/composants.spec.ts` (déjà vert, ne pas l’affaiblir)

**Interfaces:**
- Consumes: `ScoreGauge` prop `size?: 'hero' | 'compact'`. La classe `.gauge-fill` et `--duration-gauge` (400ms) existent. `ClientRouter` et `fade` sont exportés par `astro:transitions` (Astro 7).
- Produces: le H1 de page n’est pas concerné. L’élément `.gauge[data-size='hero']` a `view-transition-name: audigy-gauge`. Les tailles `compact` et `mini` n’ont pas ce nom. `<html>` utilise `transition:animate={fade({ duration: '280ms' })}`. `<ClientRouter fallback="swap" />` est dans `<head>`.

- [ ] **Step 1: Write the failing test**

Ajouter dans `scripts/arc-soft.test.ts` :

```ts
describe('transitions', () => {
  it('nomme la jauge hero et coupe le mouvement réduit', () => {
    const gauge = text('apps/web/src/components/ScoreGauge.svelte');
    expect(gauge).toContain('view-transition-name: audigy-gauge');
    expect(gauge).toContain("data-size='hero'");
    const layout = text('apps/web/src/layouts/Base.astro');
    expect(layout).toContain('ClientRouter');
    expect(layout).toContain('fallback="swap"');
    expect(layout).toContain('fade({ duration: \'280ms\' })');
    const arc = text('apps/web/src/styles/arc.css');
    expect(arc).toContain('::view-transition-old(root)');
    expect(arc).toContain('prefers-reduced-motion: reduce');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run scripts/arc-soft.test.ts`

Expected: FAIL sur `view-transition-name: audigy-gauge` absent.

- [ ] **Step 3: Wire view transitions**

Dans le frontmatter de `Base.astro` :

```astro
import { ClientRouter, fade } from 'astro:transitions';
```

Sur la balise `<html lang="fr">` :

```astro
<html lang="fr" transition:animate={fade({ duration: '280ms' })}>
```

Dans `<head>`, après les meta :

```astro
    <ClientRouter fallback="swap" />
```

`fallback="swap"` évite une translation de secours quand le navigateur n’a pas l’API. Ne pas appeler `navigate()` à la main. Les formulaires GET continuent en navigation classique : le routeur n’intercepte que les clics sur les ancres de même origine.

Dans le `<style>` de `ScoreGauge.svelte`, ajouter :

```css
  .gauge[data-size='hero'] {
    view-transition-name: audigy-gauge;
  }

  @media (prefers-reduced-motion: no-preference) {
    .gauge-fill {
      animation: gauge-rise var(--duration-gauge) var(--ease-out) both;
    }
  }
```

Retirer l’ancienne règle qui animait `.gauge-fill` en `linear` hors de ce media. Le media `prefers-reduced-motion: no-preference` existant autour de `gauge-rise` reste la seule animation. Sous `reduce`, aucune animation n’est déclarée, donc le test `composants.spec.ts` voit `animationName === 'none'`.

Ajouter dans `arc.css` :

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 280ms;
  animation-timing-function: var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0s;
    animation-delay: 0s;
  }
}
```

Ne pas mettre `audigy-gauge` sur un disque de squelette. Une page ne doit avoir qu’une jauge `size="hero"`. C’est déjà le cas de l’accueil, du rapport, de l’impression, du score public et de `/dev/composants`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run scripts/arc-soft.test.ts && pnpm --filter @audigy/web exec playwright test e2e/composants.spec.ts e2e/arc-accueil.spec.ts`

Expected: PASS. La jauge réduite a une durée `0s` ou un nom `none`. La jauge animée reste ≤ 400 ms.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/layouts/Base.astro apps/web/src/components/ScoreGauge.svelte apps/web/src/styles/arc.css scripts/arc-soft.test.ts
git commit -m "feat: transitions de page et jauge partagée"
```

- [ ] **Step 6: Gate of PR A**

Run: `pnpm check`

Expected: exit 0. La ligne d’auto-audit contient `plafond 700000`. Aucun tiers. Ne pas déployer.

### Task 7: Axe horaire du même jour

**Files:**
- Modify: `apps/web/src/lib/history.ts`
- Modify: `apps/web/src/lib/history.test.ts`
- Test: `apps/web/src/lib/history.test.ts`

**Interfaces:**
- Consumes: `parisDayKey`, `axisDay` et `PARIS = 'Europe/Paris'` déjà dans `history.ts`.
- Produces: `axisHour(unixSeconds: number): string`. Minute 0 : `` `${hour} h` `` avec l’heure 0–23 sans zéro devant (`9 h`, `14 h`, `0 h`). Minute non nulle : `` `${hour} h ${minute}` `` sur deux chiffres (`0 h 30`, `14 h 32`). `axisLabels(unixSeconds: readonly number[]): string[]`. Si tous les instants partagent un seul jour civil de Paris, ou s’il n’y a qu’un instant, chaque libellé est `axisHour`. Sinon chaque libellé est `axisDay` (`23 oct.`, `3 mars`), même si deux points d’un graphe multi-jours tombent le même jour. `axisTime` privé disparaît.

- [ ] **Step 1: Write the failing test**

Remplacer le `describe('libellés d’axe')` de `apps/web/src/lib/history.test.ts` par :

```ts
describe('libellés d’axe', () => {
  const at = (iso: string) => Date.parse(iso) / 1000;

  it('garde le jour quand les points changent de jour de Paris', () => {
    expect(
      axisLabels([
        at('2026-03-03T08:00:00.000Z'),
        at('2026-10-23T12:30:00.000Z'),
      ]),
    ).toEqual(['3 mars', '23 oct.']);
  });

  it('passe en heures quand tous les points sont le même jour de Paris', () => {
    expect(
      axisLabels([
        at('2026-10-23T22:30:00.000Z'),
        at('2026-10-24T12:32:00.000Z'),
      ]),
    ).toEqual(['0 h 30', '14 h 32']);
  });

  it('affiche les heures piles demandées par la spec', () => {
    expect(
      axisLabels([
        at('2026-10-23T07:00:00.000Z'),
        at('2026-10-23T12:00:00.000Z'),
        at('2026-10-23T16:00:00.000Z'),
      ]),
    ).toEqual(['9 h', '14 h', '18 h']);
  });

  it('affiche l’heure d’un point isolé, pas la date', () => {
    expect(axisLabels([at('2026-10-23T12:00:00.000Z')])).toEqual(['14 h']);
  });

  it('reste en dates courtes dès que deux jours de Paris sont visibles', () => {
    expect(
      axisLabels([
        at('2026-10-22T10:00:00.000Z'),
        at('2026-10-23T22:30:00.000Z'),
        at('2026-10-24T12:32:00.000Z'),
      ]),
    ).toEqual(['22 oct.', '24 oct.', '24 oct.']);
  });

  it('sépare minuit à Paris même si l’instant UTC est le même jour', () => {
    expect(
      axisLabels([
        at('2026-10-23T21:30:00.000Z'),
        at('2026-10-23T22:30:00.000Z'),
      ]),
    ).toEqual(['23 oct.', '24 oct.']);
  });

  it('distingue un jour de Paris traversé par le changement d’heure', () => {
    expect(
      axisLabels([
        at('2026-03-28T23:30:00.000Z'),
        at('2026-03-29T12:00:00.000Z'),
      ]),
    ).toEqual(['0 h 30', '14 h']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/history.test.ts`

Expected: FAIL. Le cas du 24 oct. attend encore `24 oct. 00:30` au lieu de `0 h 30`.

- [ ] **Step 3: Implement axisHour**

Dans `apps/web/src/lib/history.ts`, supprimer `axisTimeFormat` et `axisTime`. Ajouter :

```ts
const axisClockParts = new Intl.DateTimeFormat('fr-FR', {
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
  timeZone: PARIS,
});

export function axisHour(unixSeconds: number): string {
  const parts = axisClockParts.formatToParts(new Date(unixSeconds * 1000));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(
    parts.find((part) => part.type === 'minute')?.value ?? '0',
  );
  if (minute === 0) return `${hour} h`;
  return `${hour} h ${String(minute).padStart(2, '0')}`;
}

export function axisLabels(unixSeconds: readonly number[]): string[] {
  const keys = unixSeconds.map(parisDayKey);
  if (new Set(keys).size <= 1) return unixSeconds.map(axisHour);
  return unixSeconds.map(axisDay);
}
```

Remplacer l’ancienne fonction `axisLabels`. Le commentaire au-dessus devient : « Heure si un seul jour de Paris est visible, date courte sinon. »

`HistoryPanel.svelte` appelle déjà `axisLabels`. Ne pas le modifier dans cette tâche.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/history.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/history.ts apps/web/src/lib/history.test.ts
git commit -m "fix: heures sur l’axe quand la journée est unique"
```

### Task 8: Rapport en une colonne de verre

**Files:**
- Modify: `apps/web/src/components/ReportView.svelte`
- Modify: `apps/web/src/components/CategoryList.svelte`
- Modify: `apps/web/src/components/FindingList.svelte`
- Modify: `apps/web/src/pages/dev/composants.astro`
- Test: `apps/web/e2e/composants.spec.ts`
- Test: `apps/web/e2e/parcours.spec.ts`

**Interfaces:**
- Consumes: `CategoryItem.href` déjà produit par `categoryItems`. `groupFindings` et les clés `group.priority`, `group.next`, `group.good`, `finding.fix`. Classes `.glass`, `.glass-module`, `.glass-plate`, `.reading`, `.stagger`, `.lift`.
- Produces: le rapport prêt est un `<div class="reading">`. Chaque bloc (verdict, domaines, corrections, historique, pied `ReportFooter`) est un `<section class="glass glass-module"><div class="glass-plate">`. La réputation, le lien d’impression et `PreuveMentions` restent dans cette colonne, après les domaines pour la réputation et avant le pied pour le reste. Ils ne deviennent pas une colonne latérale. La ligne de domaine avec `href` est un seul `<a class="domain lift">` qui enveloppe le nom, la phrase, le score et `StatusMark`. Pas de lien imbriqué.

- [ ] **Step 1: Write the failing test**

Ajouter dans `apps/web/e2e/composants.spec.ts` :

```ts
test('la ligne de domaine est un seul lien dans une colonne', async ({
  page,
}) => {
  await page.goto('/dev/composants');
  const row = page.getByRole('link', { name: /Visibilité sur Google/ });
  await expect(row).toBeVisible();
  const nested = await row.locator('a').count();
  expect(nested).toBe(0);
  const box = await page.locator('.reading').boundingBox();
  expect(Math.round(box?.width ?? 0)).toBeLessThanOrEqual(720);
});
```

Si `/dev/composants` n’enveloppe pas encore la page dans `.reading`, le test échoue sur le bounding box.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @audigy/web exec playwright test e2e/composants.spec.ts --grep "colonne"`

Expected: FAIL. `.reading` est absent, ou la ligne contient un lien imbriqué.

- [ ] **Step 3: Wrap the report and make the row one link**

Dans `CategoryList.svelte`, remplacer le `<li>` par :

```svelte
<li>
  {#if item.href}
    <a class="domain lift" href={item.href}>
      {@render body(item, level)}
    </a>
  {:else}
    <div class="domain">
      {@render body(item, level)}
    </div>
  {/if}
</li>
```

Le snippet `body` reprend le contenu actuel de `.domain-copy` et `.domain-score`, sans la balise `<a class="domain-plain">` intérieure : le nom courant est un `<span class="domain-plain">`. Ajouter `class="stagger"` sur `<ul class="domains">`.

Dans le `<style>` du composant, `.domain` garde `display: flex`. Ajouter :

```css
  a.domain {
    color: inherit;
    text-decoration: none;
  }

  a.domain:focus-visible {
    outline: var(--focus-width) solid var(--focus);
    outline-offset: var(--focus-width);
  }
```

Le survol vient de `.lift` dans `arc.css`. Ne pas changer `box-shadow` au survol.

Dans `FindingList.svelte`, ajouter `class="stagger"` sur le conteneur de chaque groupe (`priority`, `next`, et le contenu du `<details>` « Ce qui va bien »). Ne pas retirer les filtres : ce sont de vrais filtres, rayon `--radius-sm`, pas des pilules. Le troisième groupe reste un `<details>` fermé. « Voir comment corriger » reste le `<details>` intérieur.

Dans `ReportView.svelte`, envelopper le rendu `phase === 'ready'` dans `<div class="reading">`. Chaque bloc direct (verdict, catégories, réputation, corrections, historique, impression et vérification, `ReportFooter`) devient :

```svelte
<section class="glass glass-module">
  <div class="glass-plate">
    <!-- contenu actuel du bloc -->
  </div>
</section>
```

Les liens d’action sous le verdict restent des `<a>` dans une `<ol>`, pas des `<button>`. Au plus trois, déjà garantis par `topActions(shown)`.

Dans `apps/web/src/pages/dev/composants.astro`, ajouter la classe `reading` sur l’`<article>` qui contient la jauge, la liste et les corrections.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @audigy/web exec playwright test e2e/composants.spec.ts e2e/parcours.spec.ts`

Expected: PASS. Le parcours trouve encore le lien dont le nom contient `Protection` et « Voir comment corriger ».

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ReportView.svelte apps/web/src/components/CategoryList.svelte apps/web/src/components/FindingList.svelte apps/web/src/pages/dev/composants.astro apps/web/e2e/composants.spec.ts
git commit -m "feat: rapport en modules de verre"
```

### Task 9: Overlay de progression

**Files:**
- Create: `apps/web/src/lib/progress-live.ts`
- Create: `apps/web/src/lib/progress-live.test.ts`
- Create: `apps/web/src/components/AuditOverlay.svelte`
- Modify: `apps/web/src/components/ProgressPanel.svelte`
- Modify: `apps/web/src/components/ReportView.svelte`
- Modify: `apps/web/src/i18n/fr.ts`
- Modify: `apps/web/e2e/parcours.spec.ts`
- Test: `apps/web/src/lib/progress-live.test.ts`
- Test: `apps/web/e2e/parcours.spec.ts`

**Interfaces:**
- Consumes: `domainPlain(id: string): string`. Statuts d’audit `queued`, `running`, `partial`, `done`, `failed`. Clé existante `progress.failed`.
- Produces: `progressLive(status: string, finishedNames: readonly string[]): string`. `queued` ou `running` sans nom : `t('progress.live')` = `Analyse en cours.` Avec un nom et un statut encore en cours : le dernier nom du tableau. `done` : `t('progress.ready')` = `Rapport prêt.` `failed` : `t('progress.failed')`. `partial` : `t('progress.partial')`. `AuditOverlay` affiche ce texte dans `<p role="status" aria-live="polite">`, un disque et trois barres, et un lien `t('progress.home')` vers `/`. Pas de `aria-modal`. Pas de `role="dialog"`.

- [ ] **Step 1: Write the failing test**

Créer `apps/web/src/lib/progress-live.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { progressLive } from './progress-live.js';

describe('progressLive', () => {
  it('annonce l’analyse, puis le domaine, puis le rapport', () => {
    expect(progressLive('queued', [])).toBe('Analyse en cours.');
    expect(progressLive('running', [])).toBe('Analyse en cours.');
    expect(progressLive('running', ['Visibilité sur Google'])).toBe(
      'Visibilité sur Google',
    );
    expect(progressLive('done', ['Visibilité sur Google'])).toBe('Rapport prêt.');
    expect(progressLive('failed', [])).toContain('abouti');
  });
});
```

Dans `parcours.spec.ts`, remplacer les deux attentes sur la région de statut de la progression :

```ts
  const status = page.getByRole('status');
  await expect(status).toContainText('Analyse en cours');
  await expect(status).toContainText('Rapport prêt', { timeout: 15_000 });
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Revenir à l’accueil' }),
  ).toBeVisible();
```

Garder le clic sur « Voir le rapport » une fois le statut prêt. Le lien d’accueil peut disparaître quand l’overlay se ferme au statut `done` : l’assertion sur ce lien se place pendant l’attente, avant `Rapport prêt`. Ordre :

```ts
  await expect(status).toContainText('Analyse en cours');
  await expect(
    page.getByRole('link', { name: 'Revenir à l’accueil' }),
  ).toBeVisible();
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
  await expect(status).toContainText('Rapport prêt', { timeout: 15_000 });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/progress-live.test.ts`

Expected: FAIL. Module `progress-live` introuvable.

- [ ] **Step 3: Implement the overlay**

Créer `apps/web/src/lib/progress-live.ts` :

```ts
import { t } from '../i18n/index.js';

export function progressLive(
  status: string,
  finishedNames: readonly string[],
): string {
  if (status === 'done') return t('progress.ready');
  if (status === 'failed') return t('progress.failed');
  if (status === 'partial') return t('progress.partial');
  const last = finishedNames[finishedNames.length - 1];
  if (last) return last;
  return t('progress.live');
}
```

Ajouter dans `fr.ts` :

```ts
  'progress.live': 'Analyse en cours.',
  'progress.ready': 'Rapport prêt.',
  'progress.home': 'Revenir à l’accueil',
```

Créer `apps/web/src/components/AuditOverlay.svelte` :

```svelte
<script lang="ts">
  import { t } from '../i18n/index.js';

  interface Props {
    message: string;
  }

  let { message }: Props = $props();
</script>

<div class="overlay glass">
  <div class="glass-plate">
    <p role="status" aria-live="polite">{message}</p>
    <div class="disk"></div>
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
    <p><a href="/">{t('progress.home')}</a></p>
  </div>
</div>

<style>
  .disk,
  .bar {
    background: var(--line);
    border-radius: var(--radius-sm);
  }

  .disk {
    width: var(--gauge-hero);
    height: var(--gauge-hero);
    border-radius: 50%;
  }

  .bar {
    height: var(--space-4);
    margin-top: var(--space-3);
  }

  @media (prefers-reduced-motion: no-preference) {
    .bar { animation: pulse 1s linear infinite alternate; }
  }

  @keyframes pulse {
    from { opacity: 0.45; }
    to { opacity: 1; }
  }
</style>
```

Aucun dégradé animé. Le disque n’a pas de `view-transition-name`.

Dans `ProgressPanel.svelte`, calculer les noms avec `domainPlain` pour chaque domaine du payload dont `score` est un nombre, dans l’ordre reçu. Afficher `AuditOverlay` tant que le statut est `queued` ou `running`. Au `done`, `partial` ou `failed`, ne pas monter l’overlay : garder le lien « Voir le rapport » ou « Relancer l’audit » déjà présent. Le texte de la région, overlay ou non, est `progressLive(...)`.

Dans `ReportView.svelte`, quand `phase === 'loading'` ou quand le statut reçu est `queued` ou `running`, rendre `<div class="reading"><AuditOverlay message={progressLive(status, names)} /></div>` au lieu du seul paragraphe. Au passage à `ready`, l’overlay n’est plus dans le DOM et la jauge hero joue son remplissage CSS (ou apparaît finale si le mouvement est réduit).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/progress-live.test.ts && pnpm --filter @audigy/web exec playwright test e2e/parcours.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/progress-live.ts apps/web/src/lib/progress-live.test.ts apps/web/src/components/AuditOverlay.svelte apps/web/src/components/ProgressPanel.svelte apps/web/src/components/ReportView.svelte apps/web/src/i18n/fr.ts apps/web/e2e/parcours.spec.ts
git commit -m "feat: overlay de progression sans balayage"
```

- [ ] **Step 6: Gate of PR B**

Run: `pnpm check`

Expected: exit 0.

### Task 10: Connexion et compte

**Files:**
- Modify: `apps/web/src/components/LoginForm.svelte`
- Modify: `apps/web/src/pages/connexion.astro`
- Modify: `apps/web/src/components/AccountPanel.svelte`
- Modify: `apps/web/src/pages/compte.astro`
- Modify: `apps/web/src/i18n/fr.ts`
- Modify: `apps/web/e2e/parcours.spec.ts`
- Modify: `apps/web/src/i18n/index.test.ts`
- Test: `apps/web/src/i18n/index.test.ts`
- Test: `apps/web/e2e/parcours.spec.ts`

**Interfaces:**
- Consumes: `sendMagicLink`, `signOut`, `currentSession` de `browser-session.ts`. `session.user.email: string | undefined`. `GET /api/compte/cgu` répond `{ version: string, accepted: boolean, acceptedAt: string | null }`. `POST /api/compte/suppression` avec corps `{ confirm: 'supprimer' }` inchangé. `formatDate(date: Date): string` produit `23 oct. 2026`. `TERMS_VERSION` importé de `@audigy/db`.
- Produces: H1 de connexion `t('login.card.title')` = `Recevoir un lien de connexion`, à l’intérieur de `.login-card.glass`. Bouton `t('login.submit')` = `Envoyer le lien`. Après envoi, la même carte affiche `t('login.sent')` = `Le lien arrive dans votre boîte. Il expire tout seul.` Compte : colonne `.reading`. Module profil (e-mail, bouton secondaire `t('login.signout')`), module conditions (`t('account.terms.when', { date, version })`), module export (bouton principal `t('account.export.action')` et `t('account.export.hint')`), module suppression (bouton `.button-bordered` `t('account.delete.open')`, puis phrase `t('account.delete.confirm')`, lien `t('account.delete.cancel')`, bouton `.button-bordered` `t('account.delete.forever')`). Le clic définitif envoie `{ confirm: 'supprimer' }`. Pas de champ texte « Écrivez supprimer ».

- [ ] **Step 1: Write the failing test**

Dans `parcours.spec.ts`, remplacer le clic `Recevoir le lien` par `Envoyer le lien`, et l’attente `Consultez votre messagerie` par `Le lien arrive dans votre boîte`.

Ajouter un test dans `apps/web/e2e/arc-accueil.spec.ts` ne convient pas : la connexion a déjà un parcours. Étendre `parcours.spec.ts` n’est pas rejouable sans session pour le compte. Ajouter à la fin de `apps/web/e2e/legal.spec.ts` un test qui ne dépend pas du compte :

```ts
test('la connexion est une carte avec un seul envoi', async ({ page }) => {
  await page.goto('/connexion');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Recevoir un lien de connexion' }),
  ).toBeVisible();
  await expect(page.getByLabel('Adresse e-mail')).toHaveAttribute('type', 'email');
  await expect(page.getByRole('button', { name: 'Envoyer le lien' })).toBeVisible();
  const card = page.locator('.login-card');
  const box = await card.boundingBox();
  expect(Math.round(box?.width ?? 0)).toBeLessThanOrEqual(480);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

`AxeBuilder` est déjà importé dans ce fichier.

Ajouter dans `apps/web/src/i18n/index.test.ts`, dans le `describe('t')` :

```ts
  it('pose les phrases Arc Soft du compte et de la connexion', () => {
    expect(t('login.card.title')).toBe('Recevoir un lien de connexion');
    expect(t('login.submit')).toBe('Envoyer le lien');
    expect(t('login.sent')).toBe(
      'Le lien arrive dans votre boîte. Il expire tout seul.',
    );
    expect(t('account.export.hint')).toBe(
      'Le fichier contient vos sites, vos rapports et l’historique.',
    );
    expect(
      t('account.terms.when', { date: '23 oct. 2026', version: '1' }),
    ).toBe('Acceptées le 23 oct. 2026, version 1.');
    expect(t('account.delete.confirm')).toBe(
      'Cette action efface vos sites, vos rapports et vos fichiers. Elle est définitive.',
    );
    expect(t('account.delete.cancel')).toBe('Annuler');
    expect(t('account.delete.forever')).toBe('Supprimer définitivement');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @audigy/web exec playwright test e2e/legal.spec.ts --grep "carte"`

Expected: FAIL. Le H1 « Recevoir un lien de connexion » est absent.

- [ ] **Step 3: Implement login and account modules**

Clés dans `fr.ts` :

```ts
  'login.card.title': 'Recevoir un lien de connexion',
  'login.submit': 'Envoyer le lien',
  'login.sent': 'Le lien arrive dans votre boîte. Il expire tout seul.',
  'account.export.hint':
    'Le fichier contient vos sites, vos rapports et l’historique.',
  'account.terms.when': 'Acceptées le {date}, version {version}.',
  'account.delete.open': 'Supprimer mon compte',
  'account.delete.confirm':
    'Cette action efface vos sites, vos rapports et vos fichiers. Elle est définitive.',
  'account.delete.cancel': 'Annuler',
  'account.delete.forever': 'Supprimer définitivement',
```

`login.title` reste `Connexion` pour `compte/retour.astro`.

`connexion.astro` ne rend plus de H1 ni de paragraphe d’introduction. Il rend seulement `<LoginForm client:load />` dans `Base`.

`LoginForm.svelte` : le titre `<h1>{t('login.card.title')}</h1>` est le premier enfant de `<div class="login-card glass"><div class="glass-plate">`. Le formulaire actuel reste, avec le bouton principal. Quand `sent` est vrai, le même bloc affiche `<p role="status">{t('login.sent')}</p>` à la place du formulaire, sans `location.assign`. L’erreur de formulaire utilise `aria-live="polite"`, pas `role="alert"`.

`compte.astro` :

```astro
<Base title={t('meta.account.title')} description={t('meta.account.description')}>
  <div class="reading">
    <h1>{t('account.title')}</h1>
    <AccountPanel client:load />
  </div>
</Base>
```

Dans `AccountPanel.svelte`, garder `loadTerms`. Étendre le JSON lu :

```ts
const body = (await res.json()) as {
  accepted?: boolean;
  acceptedAt?: string | null;
  version?: string;
};
accepted = body.accepted === true;
acceptedAt = body.acceptedAt ?? null;
```

Afficher l’e-mail avec `session.user.email` stocké dans un état `email`. Quatre `<section class="glass glass-module"><div class="glass-plate">` dans l’ordre profil, conditions, export, suppression.

Profil :

```svelte
<p>{email}</p>
<button type="button" class="button button-secondary" onclick={onSignOut}>
  {t('login.signout')}
</button>
```

`onSignOut` appelle `signOut()` puis `location.assign('/')`.

Conditions, si `accepted && acceptedAt` :

```svelte
<p>{t('account.terms.when', { date: formatDate(new Date(acceptedAt)), version })}</p>
<a href="/cgu">{t('account.terms.link')}</a>
```

Sinon, garder le formulaire d’acceptation existant.

Export : le bouton existant devient `button button-primary`. Ajouter `<p>{t('account.export.hint')}</p>`.

Suppression : un état `confirmOpen`. Fermé : bouton `button button-bordered` qui met `confirmOpen` à vrai. Ouvert :

```svelte
<p>{t('account.delete.confirm')}</p>
<p class="page-links">
  <button type="button" class="button button-link" onclick={() => { confirmOpen = false; }}>
    {t('account.delete.cancel')}
  </button>
  <button type="button" class="button button-bordered" onclick={onDelete} disabled={pending}>
    {t('account.delete.forever')}
  </button>
</p>
```

`onDelete` ne lit plus un champ. Il envoie le corps existant :

```ts
body: JSON.stringify({ confirm: 'supprimer' }),
```

Retirer le champ et les clés visibles `account.delete.label` / `account.delete.hint` du rendu. Les laisser dans `fr.ts` ne sert plus : les supprimer du dictionnaire dans ce commit, elles n’ont aucun autre appelant.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/i18n/index.test.ts && pnpm copy-lint && pnpm --filter @audigy/web exec playwright test e2e/legal.spec.ts e2e/parcours.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/LoginForm.svelte apps/web/src/pages/connexion.astro apps/web/src/components/AccountPanel.svelte apps/web/src/pages/compte.astro apps/web/src/i18n/fr.ts apps/web/src/i18n/index.test.ts apps/web/e2e/legal.spec.ts apps/web/e2e/parcours.spec.ts
git commit -m "feat: cartes compte et connexion"
```

### Task 11: Tuiles de sites

**Files:**
- Create: `apps/web/src/lib/site-tiles.ts`
- Create: `apps/web/src/lib/site-tiles.test.ts`
- Modify: `apps/web/src/components/SitesPanel.svelte`
- Modify: `apps/web/src/components/ScoreGauge.svelte`
- Modify: `apps/web/src/pages/sites.astro`
- Modify: `apps/web/src/i18n/fr.ts`
- Modify: `apps/web/e2e/parcours.spec.ts`
- Test: `apps/web/src/lib/site-tiles.test.ts`
- Test: `apps/web/e2e/parcours.spec.ts`

**Interfaces:**
- Consumes: lignes d’audit `{ id, site_id, status, global_score, finished_at, created_at }` déjà triées de la plus récente à la plus ancienne par l’appelant. `ScoreGauge` gagne `size="mini"`. `formatDate`.
- Produces: `latestAuditBySite(rows): Map<string, { auditId: string, at: string, score: number | null }>`. La première ligne `done` ou `partial` de chaque `site_id` gagne. `at` vaut `finished_at` sinon `created_at`. Une tuile avec marque est un `<a class="site-tile lift glass glass-module" href={/rapport?id=}>` qui contient le nom, l’URL en `.kicker`, la date, et `<ScoreGauge size="mini" />`. Sans marque : le même lien vers `/lancer?site=`, libellé visible `t('sites.audit')` = `Lancer un audit`, forme `untested`. `SiteShare`, la preuve de propriété, Search Console et la réputation restent des frères du lien, dans `<div class="site-extra">`, jamais à l’intérieur du `<a>`. Le bouton principal de la page est `t('sites.add')` = `Ajouter un site`.

- [ ] **Step 1: Write the failing test**

Créer `apps/web/src/lib/site-tiles.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { latestAuditBySite } from './site-tiles.js';

describe('latestAuditBySite', () => {
  it('garde le premier audit prêt de chaque site', () => {
    const marks = latestAuditBySite([
      {
        id: 'new',
        site_id: 's1',
        status: 'done',
        global_score: 80,
        finished_at: '2026-10-23T12:00:00.000Z',
        created_at: '2026-10-23T11:00:00.000Z',
      },
      {
        id: 'old',
        site_id: 's1',
        status: 'done',
        global_score: 40,
        finished_at: '2026-03-03T08:00:00.000Z',
        created_at: '2026-03-03T08:00:00.000Z',
      },
      {
        id: 'run',
        site_id: 's2',
        status: 'running',
        global_score: null,
        finished_at: null,
        created_at: '2026-10-24T08:00:00.000Z',
      },
    ]);
    expect(marks.get('s1')).toEqual({
      auditId: 'new',
      at: '2026-10-23T12:00:00.000Z',
      score: 80,
    });
    expect(marks.has('s2')).toBe(false);
  });
});
```

Dans `parcours.spec.ts`, le bouton « Ajouter le site » devient « Ajouter un site ». Le lien après ajout :

```ts
  await expect(page.getByRole('link', { name: /Lancer un audit/ })).toBeVisible();
  await expect(page.getByText('notes.exemple.fr')).toBeVisible();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/site-tiles.test.ts`

Expected: FAIL. Module introuvable.

- [ ] **Step 3: Implement the tiles**

Créer `apps/web/src/lib/site-tiles.ts` avec le type et la fonction décrits dans Interfaces. Ignorer les statuts autres que `done` et `partial`. Si `finished_at` est null, `at` est `created_at`.

Dans `ScoreGauge.svelte`, étendre le type :

```ts
size?: 'hero' | 'compact' | 'mini';
```

```css
  .gauge[data-size='mini'] {
    width: var(--gauge-mini);
  }
```

`data-size='mini'` ne reçoit pas `view-transition-name`.

Dans `fr.ts`, remplacer :

```ts
  'sites.add': 'Ajouter un site',
  'sites.audit': 'Lancer un audit',
```

Dans `sites.astro`, envelopper le H1 et `SitesPanel` dans `<div class="reading">`.

Dans `SitesPanel.svelte`, après le chargement des sites, si `rows.length > 0` :

```ts
const ids = rows.map((site) => site.id);
const audits = await supabase
  .from('audits')
  .select('id, site_id, status, global_score, finished_at, created_at')
  .in('site_id', ids)
  .order('finished_at', { ascending: false, nullsFirst: false });
const marks = latestAuditBySite(audits.data ?? []);
```

Rendu de chaque site :

```svelte
<li>
  {#if mark}
    <a class="site-tile lift glass glass-module" href={`/rapport?id=${encodeURIComponent(mark.auditId)}`}>
      <span class="glass-plate">
        <span>{site.label}</span>
        <span class="kicker">{site.url}</span>
        <span>{formatDate(new Date(mark.at))}</span>
        <ScoreGauge domain={site.label} score={mark.score} size="mini" />
      </span>
    </a>
  {:else}
    <a class="site-tile lift glass glass-module" href={`/lancer?site=${encodeURIComponent(site.id)}`}>
      <span class="glass-plate">
        <span>{site.label}</span>
        <span class="kicker">{site.url}</span>
        <StatusMark level="untested" />
        <span>{t('level.untested')}</span>
        <span>{t('sites.audit')}</span>
      </span>
    </a>
  {/if}
  <div class="site-extra">
    <a href={`/verifier?site=${encodeURIComponent(site.id)}`}>
      {t('sites.verify')}
      <span class="visually-hidden">{site.label}</span>
    </a>
    {#if places?.enabled}
      <ReputationPanel
        siteId={site.id}
        token={accessToken}
        place={placeFor(site.id)}
      />
    {/if}
    <SiteShare {site} />
  </div>
</li>
```

Le lien « Lancer un audit » n’est pas répété dans `.site-extra` : il est la tuile elle-même quand il n’y a pas d’audit. Le lien Search Console déjà rendu au-dessus de la liste (`t('gsc.connect')`) reste à sa place, hors des tuiles.

Le bouton d’ajout reste le seul `button-primary` de la page. Le bouton de déconnexion de la page sites reste `button-link`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/site-tiles.test.ts && pnpm --filter @audigy/web exec playwright test e2e/parcours.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/site-tiles.ts apps/web/src/lib/site-tiles.test.ts apps/web/src/components/SitesPanel.svelte apps/web/src/components/ScoreGauge.svelte apps/web/src/pages/sites.astro apps/web/src/i18n/fr.ts apps/web/e2e/parcours.spec.ts
git commit -m "feat: tuiles de sites avec mini-score"
```

### Task 12: Pages légales, mouvement réduit, poids et CSP

**Files:**
- Create: `apps/web/e2e/arc-motion.spec.ts`
- Modify: `apps/web/src/layouts/Base.astro`
- Modify: `apps/web/src/pages/methode.astro`
- Modify: `apps/web/src/pages/cgu.astro`
- Modify: `apps/web/src/pages/confidentialite.astro`
- Modify: `apps/web/src/pages/mentions-legales.astro`
- Modify: `apps/web/src/pages/accessibilite.astro`
- Test: `apps/web/e2e/arc-motion.spec.ts`
- Test: `pnpm self-audit` après `pnpm build`

**Interfaces:**
- Consumes: classe `blobs-still` déjà lue par `arc.css` (`body:not(.blobs-still) .blob`). Prop nouvelle de `Base`.
- Produces: `Base` accepte `still?: boolean`. Si vrai, `<body class="blobs-still">` et `<main class="wrap legal">`. Les cinq pages légales passent `still`. Elles ne gagnent pas de hero ni de jauge. Leur H1 reste en Atkinson grâce à `.legal h1`.

- [ ] **Step 1: Write the failing test**

Créer `apps/web/e2e/arc-motion.spec.ts` :

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['/', '/dev/composants', '/compte', '/sites', '/methode'] as const;

test('le mouvement réduit fige les blobs et la jauge', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of pages) {
    await page.goto(path);
    const name = await page.locator('.blob-petrol').evaluate((element) => {
      const view = globalThis as unknown as {
        getComputedStyle: (node: unknown) => { animationName: string };
      };
      return view.getComputedStyle(element).animationName;
    });
    expect(name).toBe('none');
  }
  await page.goto('/');
  const gauge = await page.locator('.gauge-fill').first().evaluate((element) => {
    const view = globalThis as unknown as {
      getComputedStyle: (node: unknown) => { animationName: string };
    };
    return view.getComputedStyle(element).animationName;
  });
  expect(gauge).toBe('none');
  await page.goto('/methode');
  await expect(page.locator('h1')).toHaveCSS(
    'font-family',
    /Atkinson Hyperlegible Next/,
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('la méthode fige les blobs même si le mouvement est permis', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/methode');
  const name = await page.locator('.blob-petrol').evaluate((element) => {
    const view = globalThis as unknown as {
      getComputedStyle: (node: unknown) => { animationName: string };
    };
    return view.getComputedStyle(element).animationName;
  });
  expect(name).toBe('none');
  await expect(page.locator('.hero')).toHaveCount(0);
  await expect(page.locator('.gauge')).toHaveCount(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @audigy/web exec playwright test e2e/arc-motion.spec.ts`

Expected: FAIL. Sur `/methode` avec mouvement permis, `animationName` n’est pas `none`, ou le H1 n’est pas Atkinson.

- [ ] **Step 3: Freeze legal blobs**

Dans `Base.astro`, ajouter la prop `still?: boolean` (défaut `false`).

```astro
<body class:list={{ 'blobs-still': still }}>
```

```astro
<main id="contenu" class:list={['wrap', { legal: still }]} tabindex="-1">
```

Sur chacune des cinq pages `methode.astro`, `cgu.astro`, `confidentialite.astro`, `mentions-legales.astro`, `accessibilite.astro`, passer `still` à `Base` :

```astro
<Base still title={...} description={...}>
```

Ne pas ajouter de jauge ni de hero. Ne pas changer le texte juridique.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @audigy/web exec playwright test e2e/arc-motion.spec.ts e2e/legal.spec.ts e2e/arc-accueil.spec.ts`

Expected: PASS.

- [ ] **Step 5: Weight and CSP**

Run: `pnpm build && pnpm self-audit`

Expected: exit 0. La sortie contient `plafond 700000` et ne contient pas `fonts.googleapis.com`. `apps/web/dist/_headers` garde `script-src-attr 'none'` et ne contient pas `script-src` avec `'unsafe-inline'`. Si l’auto-audit échoue parce qu’un script du `ClientRouter` n’est pas empreinté, corriger `scripts/publish-policy.ts` pour qu’il empreinte ce script déjà présent dans le HTML. Ne pas ajouter `unsafe-inline` ni `unsafe-eval`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/e2e/arc-motion.spec.ts apps/web/src/layouts/Base.astro apps/web/src/pages/methode.astro apps/web/src/pages/cgu.astro apps/web/src/pages/confidentialite.astro apps/web/src/pages/mentions-legales.astro apps/web/src/pages/accessibilite.astro
git commit -m "feat: pages légales calmes et mouvement réduit"
```

Si l’étape 5 a modifié `scripts/publish-policy.ts`, l’ajouter à ce commit.

- [ ] **Step 7: Gate of PR C**

Run: `pnpm check`

Expected: exit 0. Aucun déploiement Netlify.

## Couverture de la spec

- §1 objectif et non-objectifs : en-tête, Global Constraints, aucune tâche ne change la méthode, les seuils, les libellés de score, ni le réseau d’audit.
- §2 fond, blobs, verre, accent, pêche, formes : tâches 1, 2, 3.
- §2 typographie et choix Outfit : tâche 1. Sora et Manrope écartées dans le test.
- §3 durées, levée, listes, jauge, blobs, reduced-motion : tâches 2, 6, 8, 9, 12.
- §4 accueil : tâche 5.
- §5 rapport, axe, overlay : tâches 7, 8, 9.
- §6 compte, connexion, sites, légal : tâches 10, 11, 12.
- §7 barre : tâche 4.
- §8 contraste, clavier, live polite, 700 Ko, zéro tiers : tâches 3, 4, 5, 9, 10, 12. Le lecteur d’écran réel (NVDA ou VoiceOver) reste la case ouverte de `docs/RECETTE.md` ; la CI vérifie les noms accessibles et axe.
- §9 DESIGN.md : tâche 3.
- §10 hors périmètre : Global Constraints. Pas de correctif PART-26, pas de DNS, pas de Lottie.
- §11 critères des PR d’implémentation : portes `pnpm check` des tâches 6, 9 et 12.
