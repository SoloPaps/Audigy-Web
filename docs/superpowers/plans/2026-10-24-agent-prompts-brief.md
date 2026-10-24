# Brief agent (approche B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le prompt simple d’UX-18 par un brief unique, choisi dans le rapport du propriétaire, collable dans Cursor ou un chat.

**Architecture:** Le texte est assemblé dans le navigateur à partir du rapport déjà chargé et de `docs/METHODE.md` (identifiant, colonne Réussi, critère RGESN, citation seulement si le chapitre la porte déjà). Les fiches de correction déjà servies fournissent la puce « Référence déjà notée » quand elles ont une source. Aucun appel réseau, aucune fonction Netlify, aucun envoi vers une IA. Le panneau vit sous la liste des constats. Le score public ne reçoit pas ce parcours.

**Tech Stack:** Astro 7 (sortie statique), îlots Svelte 5, TypeScript strict, Vitest, Playwright et axe, `t()` / `scripts/copy-lint.ts`, `formatDateTime` (Europe/Paris). Node 22, pnpm.

## Global Constraints

Chaque tâche inclut ces contraintes. Les valeurs sont celles de `docs/superpowers/specs/2026-10-24-agent-prompts-brief-design.md`.

- Base : `main` après fusion de la spec. Ne pas empiler cette PR sur la PR de spec. Ne pas rouvrir l’impression (UX-16), le Markdown du rapport (UX-17), ni la ligne de constat (UX-19).
- UX-18 est ce brief. Le prompt d’une constatation, limité au correctif déjà montré, ne se livre pas. S’il est déjà sur la branche (`correctionPrompt`, clés `prompt.*`, bouton « Copier le prompt »), la tâche 9 le retire. S’il est absent, la tâche 9 ne le crée pas.
- Langue de l’interface : français, `t()`, copy-lint, phrases de 20 mots au plus. Le corps du brief est français, vouvoiement, un seul texte. Le libellé visible « Fix » reste ce mot. copy-lint ne le reformule pas.
- Cible : un seul texte, collable dans Cursor ou dans un chat. Jamais d’exécution dans le navigateur. Jamais d’envoi automatique vers une IA. Pas d’e-mail. Pas de modale. Pas de seconde page. Pas d’assistant.
- Rapport du propriétaire seulement. Le score public et le partage n’ont ni brief, ni terminal, ni détail réservé au propriétaire.
- Assemblage dans le navigateur, rapport déjà chargé. Pas de nouvel appel réseau. Pas de nouvelle fonction Netlify. Pas de modification de `packages/engine`, de ses données, des seuils, de la couverture, ni des formules de score.
- Montrer un critère déjà catalogué est de la copie. Écrire un nouveau critère est hors scope. Aucune référence n’est rédigée dans l’interface : la puce n’existe que si `docs/METHODE.md` ou la fiche déjà affichée porte la citation. Pas de catalogue OWASP. Pas de NIST inventé. L’URL NVD déjà écrite au §14 de la méthode reste licite pour `securite.cve_logiciels`.
- Les fragments `t('brief.*')` ne contiennent pas le mot « clé », ni un nom de variable d’environnement. Une cellule de `docs/METHODE.md` recopiée telle quelle n’est pas réécrite. Aucune valeur `measured`, aucun jeton, aucun cookie n’est interpolé.
- Date d’audit via `formatDateTime`, fuseau Europe/Paris (« 23 oct. 2026, 14 h 30 »). La ligne « Technique reconnue » n’existe que si `securite.technologies` a déjà une `{liste}` sur `securite.technologies.pass` ou `securite.technologies.warn`.
- Ordre des constats dans le brief : l’ordre déjà affiché par `groupFindings` (gravité, impact, titre). Ne pas changer ce tri pour coller au §6 de la méthode.
- Déploiement Netlify, liaison Git, aperçu de branche et build hook restent interdits. `netlify dev` reste autorisé hors de cette PR. Tests hors ligne. Pas d’appel à un site réel.
- Tokens Arc Soft déjà en place. Anneau de focus 2 px déjà porté par `:focus-visible`. Pas de mouvement nouveau. `prefers-reduced-motion` ne change pas ce parcours. Reflow à 320 px, sans scroll horizontal. Zoom 200 % reste utilisable.

---

## Map des fichiers

Créés :

- `apps/web/src/lib/methode-catalog.ts` — parse les tableaux de `docs/METHODE.md`. Aucune phrase de critère écrite ici.
- `apps/web/src/lib/methode-catalog.test.ts` — contrat du parse sur le fichier réel.
- `apps/web/src/lib/methode-load.ts` — charge le markdown en `?raw` pour l’îlot. Les tests ne l’importent pas.
- `apps/web/src/lib/brief.ts` — assemblage des six premières parties, pile reconnue, dédoublonnage.
- `apps/web/src/lib/brief.test.ts` — ordre, omissions, voie rapide, sélection.
- `apps/web/src/lib/brief-terminal.ts` — partie Terminal, suggestions de lecture, interdits.
- `apps/web/src/lib/brief-terminal.test.ts` — Vérif sans écriture, Fix sans commande destructrice, outil absent.
- `apps/web/src/lib/brief-file.ts` — nom `audigy-brief-…md` et dernière ligne.
- `apps/web/src/lib/brief-file.test.ts` — hôte et jour civil de Paris.
- `apps/web/src/lib/brief-bar.ts` — compteur, boutons actifs, message « tous réussis ».
- `apps/web/src/lib/brief-bar.test.ts` — cas limites du §8.
- `apps/web/e2e/brief.spec.ts` — parcours clavier, copie, 320 px, axe, absence de requête.
- `apps/web/src/lib/brief-scope.test.ts` — le score public et le prompt UX-18 simple ne sont pas le comportement livré.

Modifiés :

- `apps/web/src/i18n/fr.ts` — clés `brief.*` seulement.
- `apps/web/src/lib/report-model.ts` — `reportRows`, sans changer `reportFindings` ni les scores.
- `apps/web/src/lib/report-model.test.ts` — `na` visible pour le brief, toujours écarté de `reportFindings`.
- `apps/web/src/components/FindingList.svelte` — cases, sélecteurs, barre, panneau. Le `<details>` de correction reste.
- `apps/web/src/components/ReportView.svelte` — brief seulement en `mode === 'report'`.
- `apps/web/src/styles/base.css` — zone mono et pile à 320 px. Aucune couleur littérale.
- `apps/web/src/data/demo.ts` — `checkId` réels sur les constats d’exemple.
- `apps/web/src/pages/dev/composants.astro` — passe le contexte du brief à la liste d’exemple.

Non touchés : `packages/engine/**`, `netlify/**`, `PublicScore.svelte`, `PrintReport.svelte`, pages d’impression, Markdown d’UX-17, `docs/METHODE.md`, `docs/DESIGN.md`.

## Types partagés

Ces noms sont stables d’une tâche à l’autre.

```ts
export interface MethodeEntry {
  id: string;
  pass: string | null;
  criterion: string | null;
  citation: string | null;
}

export interface BriefSource {
  label: string;
  url: string;
}

export type TerminalMode = 'rien' | 'verif' | 'fix';

export type CatalogStatus = 'pass' | 'warn' | 'fail' | 'untested' | 'na';

export interface BriefFinding {
  id: string;
  checkId: string;
  title: string;
  statusLabel: string;
  proof: string;
  impact: string | null;
  terminal: TerminalMode;
}

export interface BriefDocument {
  url: string;
  at: Date | null;
  stack: string | null;
  findings: readonly BriefFinding[];
  catalog: ReadonlyMap<string, MethodeEntry>;
  sources: ReadonlyMap<string, readonly BriefSource[]>;
  includeTerminal: boolean;
}
```

`reportRows` produit en plus, sur chaque `Finding` :

```ts
export interface ReportRow extends Finding {
  checkId: string;
  catalogStatus: CatalogStatus;
  proof: string;
  impactText: string | null;
  sources: BriefSource[];
}
```

`impactText` vaut `null` : la ligne du rapport n’affiche qu’une phrase (`why`). Le brief ne fabrique pas un impact.

---

### Task 1: Catalogue méthode

**Files:**
- Create: `apps/web/src/lib/methode-catalog.ts`
- Create: `apps/web/src/lib/methode-catalog.test.ts`
- Create: `apps/web/src/lib/methode-load.ts`
- Test: `apps/web/src/lib/methode-catalog.test.ts`

**Interfaces:**
- Consumes: `docs/METHODE.md` (lecture seule).
- Produces: `parseMethodeCatalog(markdown: string): Map<string, MethodeEntry>` et `methodeCatalog(): ReadonlyMap<string, MethodeEntry>`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/methode-catalog.test.ts`

```ts
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseMethodeCatalog } from './methode-catalog.js';

const markdown = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../../docs/METHODE.md'),
  'utf8',
);

describe('parseMethodeCatalog', () => {
  const catalog = parseMethodeCatalog(markdown);

  it('lit chaque ligne Identifiant / Réussi, sans inventer de test', () => {
    expect(catalog.size).toBe(66);
    expect(catalog.get('securite.hsts')?.pass).toContain('15768000');
    expect(catalog.get('securite.https')?.pass).toContain('chiffrée');
    expect(catalog.get('performance.lcp')?.pass).toContain('2,5 s');
    expect(catalog.get('invente.owasp')).toBeUndefined();
  });

  it('copie le critère RGESN déjà tabulé, et rien pour les autres tests', () => {
    expect(catalog.get('ecologie.rgesn_budget')?.criterion).toBe(
      '6.1 — Poids et nombre de requêtes, plafonds absolus.',
    );
    expect(catalog.get('ecologie.rgesn_polices')?.criterion).toContain('4.8');
    expect(catalog.get('securite.hsts')?.criterion).toBeNull();
  });

  it('cite la référence déjà écrite dans le chapitre, sinon rien', () => {
    expect(catalog.get('securite.hsts')?.citation).toBe('MDN HTTP Observatory');
    expect(catalog.get('securite.csp')?.citation).toBe('MDN HTTP Observatory');
    expect(catalog.get('performance.lighthouse')?.citation).toBe(
      'PageSpeed Insights',
    );
    expect(catalog.get('performance.lcp')?.citation).toBe('CrUX');
    expect(catalog.get('performance.poids')?.citation).toBe('Lighthouse');
    expect(catalog.get('seo.lighthouse')?.citation).toBe('Lighthouse');
    expect(catalog.get('accessibilite.lighthouse')?.citation).toBe('Lighthouse');
    expect(catalog.get('seo.title')?.citation).toBeNull();
    expect(catalog.get('dns_email.spf')?.citation).toBe('RFC 7208');
    expect(catalog.get('dns_email.mx')?.citation).toBe('RFC 7505');
    expect(catalog.get('dns_email.dkim')?.citation).toBeNull();
    expect(catalog.get('ecologie.ecoindex')?.citation).toBe(
      'https://www.ecoindex.fr/comment-ca-marche/',
    );
    expect(catalog.get('ecologie.co2')?.citation).toBe('Sustainable Web Design');
    expect(catalog.get('ecologie.hebergeur')?.citation).toBe(
      'thegreenwebfoundation.org',
    );
    expect(catalog.get('ecologie.rgesn_cache')?.citation).toBe(
      'référentiel général d’écoconception',
    );
    expect(catalog.get('qualite.html')?.citation).toBe('html-validate');
    expect(catalog.get('securite.cve_scripts')?.citation).toBe('https://osv.dev/');
    expect(catalog.get('securite.cve_logiciels')?.citation).toBe(
      'https://nvd.nist.gov/developers/vulnerabilities',
    );
    expect(catalog.get('securite.technologies')?.citation).toBeNull();
    expect(catalog.get('vie_privee.traceurs')?.citation).toBe('Tracker Radar');
    expect(catalog.get('vie_privee.cmp')?.citation).toBe('Tracker Radar');
    expect(catalog.get('vie_privee.mentions')?.citation).toBeNull();
    expect(catalog.get('securite.fichiers')?.citation).toBeNull();
    expect(catalog.get('securite.listing')?.citation).toBeNull();
    expect(catalog.get('securite.tls')?.citation).toBeNull();
    expect(catalog.get('reputation.avis')?.citation).toBeNull();
    for (const entry of catalog.values()) {
      expect(entry.citation ?? '').not.toMatch(/OWASP|NIST SP|NIST 800|CSF/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/methode-catalog.test.ts`

Expected: FAIL, `parseMethodeCatalog` introuvable.

- [ ] **Step 3: Write minimal implementation**

`apps/web/src/lib/methode-catalog.ts`

```ts
export interface MethodeEntry {
  id: string;
  pass: string | null;
  criterion: string | null;
  citation: string | null;
}

/** Aiguille qui doit déjà être dans le chapitre du test. Absent : pas de puce. */
const NEEDLE: Readonly<Record<string, string>> = {
  'securite.https': 'MDN HTTP Observatory',
  'securite.hsts': 'MDN HTTP Observatory',
  'securite.csp': 'MDN HTTP Observatory',
  'securite.xcto': 'MDN HTTP Observatory',
  'securite.frames': 'MDN HTTP Observatory',
  'securite.referrer': 'MDN HTTP Observatory',
  'securite.permissions': 'MDN HTTP Observatory',
  'securite.cookies': 'MDN HTTP Observatory',
  'securite.certificate': 'MDN HTTP Observatory',
  'securite.mixed': 'MDN HTTP Observatory',
  'securite.security_txt': 'MDN HTTP Observatory',
  'performance.lighthouse': 'PageSpeed Insights',
  'performance.lcp': 'CrUX',
  'performance.inp': 'CrUX',
  'performance.cls': 'CrUX',
  'performance.poids': 'Lighthouse',
  'performance.cache': 'Lighthouse',
  'performance.compression': 'Lighthouse',
  'seo.lighthouse': 'Lighthouse',
  'accessibilite.lighthouse': 'Lighthouse',
  'dns_email.spf': 'RFC 7208',
  'dns_email.mx': 'RFC 7505',
  'ecologie.ecoindex': 'https://www.ecoindex.fr/comment-ca-marche/',
  'ecologie.co2': 'Sustainable Web Design',
  'ecologie.hebergeur': 'thegreenwebfoundation.org',
  'ecologie.rgesn_polices': 'référentiel général d’écoconception',
  'ecologie.rgesn_images': 'référentiel général d’écoconception',
  'ecologie.rgesn_budget': 'référentiel général d’écoconception',
  'ecologie.rgesn_cache': 'référentiel général d’écoconception',
  'ecologie.rgesn_compression': 'référentiel général d’écoconception',
  'qualite.html': 'html-validate',
  'securite.cve_scripts': 'https://osv.dev/',
  'securite.cve_logiciels':
    'https://nvd.nist.gov/developers/vulnerabilities',
  'vie_privee.traceurs': 'Tracker Radar',
  'vie_privee.cmp': 'Tracker Radar',
};

function cells(line: string): string[] {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return body.split('|').map((cell) => cell.trim());
}

function isSeparator(line: string): boolean {
  return /^\|\s*:?-{3,}/u.test(line.trim());
}

interface Table {
  header: string[];
  rows: string[][];
}

function tablesOf(section: string): Table[] {
  const lines = section.split('\n');
  const found: Table[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!(lines[index] ?? '').trim().startsWith('|')) {
      index += 1;
      continue;
    }
    const block: string[] = [];
    while (index < lines.length && (lines[index] ?? '').trim().startsWith('|')) {
      block.push(lines[index] ?? '');
      index += 1;
    }
    if (block.length < 2 || !isSeparator(block[1] ?? '')) continue;
    found.push({
      header: cells(block[0] ?? ''),
      rows: block
        .slice(2)
        .map(cells)
        .filter((row) => row.some((cell) => cell !== '')),
    });
  }
  return found;
}

function sectionsOf(markdown: string): string[] {
  return markdown.split(/^## /m).slice(1).map((part) => {
    const cut = part.indexOf('\n');
    return cut === -1 ? '' : part.slice(cut + 1);
  });
}

function clean(value: string): string | null {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text === '' || text === '—') return null;
  return text;
}

export function parseMethodeCatalog(markdown: string): Map<string, MethodeEntry> {
  const catalog = new Map<string, MethodeEntry>();
  const criteria = new Map<string, string>();
  for (const section of sectionsOf(markdown)) {
    for (const table of tablesOf(section)) {
      const header = table.header.map((cell) => cell.toLocaleLowerCase('fr-FR'));
      if (
        header[0] !== 'critère' ||
        header[1] !== 'test' ||
        header[2] !== 'observation'
      ) {
        continue;
      }
      for (const row of table.rows) {
        const id = (row[1] ?? '').trim();
        if (id === '') continue;
        const text = `${row[0] ?? ''} — ${row[2] ?? ''}`.replace(/\s+/g, ' ').trim();
        criteria.set(id, text);
      }
    }
    for (const table of tablesOf(section)) {
      if (
        !table.header.includes('Identifiant') ||
        !table.header.includes('Poids') ||
        !table.header.includes('Réussi')
      ) {
        continue;
      }
      const idAt = table.header.indexOf('Identifiant');
      const passAt = table.header.indexOf('Réussi');
      for (const row of table.rows) {
        const id = (row[idAt] ?? '').trim();
        if (!/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/u.test(id)) continue;
        const needle = NEEDLE[id];
        catalog.set(id, {
          id,
          pass: clean(row[passAt] ?? ''),
          criterion: criteria.get(id) ?? null,
          citation: needle !== undefined && section.includes(needle) ? needle : null,
        });
      }
    }
  }
  return catalog;
}
```

`apps/web/src/lib/methode-load.ts`

```ts
import { type MethodeEntry, parseMethodeCatalog } from './methode-catalog.js';

const files = import.meta.glob('../../../../docs/METHODE.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

let cached: Map<string, MethodeEntry> | null = null;

export function methodeCatalog(): ReadonlyMap<string, MethodeEntry> {
  if (cached) return cached;
  const text = Object.values(files)[0];
  if (typeof text !== 'string') {
    throw new Error('catalogue méthode absent');
  }
  cached = parseMethodeCatalog(text);
  return cached;
}
```

Ne pas importer `methode-load.ts` depuis un test Vitest : le glob vit dans le build Astro, comme `fix-catalog.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/methode-catalog.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/methode-catalog.ts apps/web/src/lib/methode-catalog.test.ts apps/web/src/lib/methode-load.ts
git commit -m "test: catalogue du brief lu dans la méthode"
```

---

### Task 2: Fragments français

**Files:**
- Modify: `apps/web/src/i18n/fr.ts` (après `'finding.copied'`)
- Create: `apps/web/src/i18n/brief-copy.test.ts`
- Test: `apps/web/src/i18n/brief-copy.test.ts`

**Interfaces:**
- Consumes: `t()` et `lintText` de `scripts/copy-lint.ts`.
- Produces: les clés `brief.*` listées ci-dessous. Les tâches suivantes les appellent par ces noms exacts.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { failureCount, lintText } from '../../../../scripts/copy-lint.js';
import { fr } from './fr.js';

const KEYS = [
  'brief.role.fix',
  'brief.role.dev',
  'brief.context.url',
  'brief.context.stack',
  'brief.context.date',
  'brief.h.role',
  'brief.h.context',
  'brief.h.findings',
  'brief.h.catalog',
  'brief.h.expected',
  'brief.h.guards',
  'brief.h.terminal',
  'brief.finding.status',
  'brief.finding.proof',
  'brief.finding.impact',
  'brief.ref.id',
  'brief.ref.criterion',
  'brief.ref.pass',
  'brief.ref.source',
  'brief.expected.diff',
  'brief.expected.stack',
  'brief.expected.score',
  'brief.guard.secret',
  'brief.guard.prod',
  'brief.guard.scope',
  'brief.guard.ask',
  'brief.guard.attack',
  'brief.terminal.absent',
  'brief.terminal.origin',
  'brief.terminal.ban',
  'brief.terminal.active',
  'brief.terminal.headers',
  'brief.terminal.cert',
  'brief.terminal.dns',
  'brief.terminal.lh',
  'brief.terminal.fixSuggest',
  'brief.terminal.guess',
  'brief.terminal.fixWrite',
  'brief.count.one',
  'brief.count.many',
  'brief.allFails',
  'brief.generate',
  'brief.generate.hint',
  'brief.none',
  'brief.untested',
  'brief.copy',
  'brief.copied',
  'brief.copyFail',
  'brief.regenerate',
  'brief.download',
  'brief.collapse',
  'brief.show',
  'brief.live',
  'brief.include',
  'brief.panel',
  'brief.terminal.group',
  'brief.terminal.rien',
  'brief.terminal.rien.long',
  'brief.terminal.verif',
  'brief.terminal.verif.long',
  'brief.terminal.fix',
  'brief.terminal.fix.long',
  'brief.notProof',
] as const;

describe('fragments du brief', () => {
  it('existe, tient en 20 mots, et ne dit pas clé', () => {
    for (const key of KEYS) {
      const text = fr[key];
      expect(text, key).toBeTypeOf('string');
      const issues = lintText(text, key);
      expect(failureCount(issues), key).toBe(0);
      expect(issues.some((issue) => issue.rule === 'sentence-length'), key).toBe(
        false,
      );
      expect(text.toLocaleLowerCase('fr-FR'), key).not.toContain('clé');
    }
    expect(fr['brief.terminal.fix']).toBe('Fix');
    expect(fr['brief.copied']).toBe('Brief copié');
    expect(fr['brief.copyFail']).toBe(
      'La copie a échoué. Sélectionnez le texte.',
    );
    expect(fr['brief.notProof']).toBe('Ce fichier n’est pas une preuve.');
    expect(fr['brief.untested']).toBe('Non testé — pas de brief');
    expect(fr['brief.none']).toBe('Aucun constat à corriger');
    expect(fr['brief.generate.hint']).toBe(
      'Cochez un constat, ou prenez tous les échecs.',
    );
    expect(fr['brief.live']).toBe('Brief généré, {n} constats');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/i18n/brief-copy.test.ts`

Expected: FAIL, clé `brief.role.fix` absente de `fr`.

- [ ] **Step 3: Write minimal implementation**

Insérer dans `apps/web/src/i18n/fr.ts`, juste après la ligne `'finding.copied': 'Copié',` :

```ts
  'brief.h.role': 'Rôle',
  'brief.h.context': 'Contexte du site',
  'brief.h.findings': 'Constats',
  'brief.h.catalog': 'Référentiel',
  'brief.h.expected': 'Attendu',
  'brief.h.guards': 'Garde-fous',
  'brief.h.terminal': 'Terminal',
  'brief.role.fix':
    'Vous corrigez le site {url} d’après un audit Audigy.',
  'brief.role.dev': 'Vous êtes le développeur web de ce site.',
  'brief.context.url': 'Adresse : {url}.',
  'brief.context.stack': 'Technique reconnue : {stack}.',
  'brief.context.date': 'Audit du {date}.',
  'brief.finding.status': 'Statut : {label}.',
  'brief.finding.proof': 'Preuve : {proof}.',
  'brief.finding.impact': 'Pour la personne : {impact}.',
  'brief.ref.id': 'Test : {id}.',
  'brief.ref.criterion': 'Critère : {criterion}.',
  'brief.ref.pass': 'Réussi veut dire : {pass}.',
  'brief.ref.source': 'Référence déjà notée : {citation}.',
  'brief.expected.diff':
    'Proposez un diff, un fichier ou une configuration.',
  'brief.expected.stack': 'N’inventez pas la technique du site.',
  'brief.expected.score': 'N’inventez pas de note.',
  'brief.guard.secret': 'Ne recopiez aucun secret.',
  'brief.guard.prod': 'Ne changez pas la production sans demander.',
  'brief.guard.scope': 'Restez dans les constats de ce brief.',
  'brief.guard.ask':
    'Si une information manque, demandez avant d’agir.',
  'brief.guard.attack':
    'Pas de procédure d’attaque, de charge utile, ni de contournement.',
  'brief.terminal.absent': 'Si l’outil n’est pas là, passez.',
  'brief.terminal.origin': 'Ces commandes ne partent pas d’Audigy.',
  'brief.terminal.ban': 'N’utilisez pas rm, ni un push forcé.',
  'brief.terminal.active': 'Ne lancez pas de test actif.',
  'brief.terminal.headers':
    'Lisez les en-têtes de la réponse. N’écrivez rien.',
  'brief.terminal.cert': 'Lisez le certificat public. N’écrivez rien.',
  'brief.terminal.dns':
    'Lisez le DNS public. N’écrivez aucun enregistrement.',
  'brief.terminal.lh':
    'Lancez Lighthouse en ligne de commande si l’outil est là.',
  'brief.terminal.fixSuggest':
    'Proposez un fichier, une configuration, ou une commande qui ne détruit rien.',
  'brief.terminal.guess': 'S’il faut deviner la technique, demandez.',
  'brief.terminal.fixWrite': 'N’appliquez rien sans qu’on vous le demande.',
  'brief.count.one': '1 sélectionné',
  'brief.count.many': '{n} sélectionnés',
  'brief.allFails': 'Tous les échecs',
  'brief.generate': 'Générer le brief',
  'brief.generate.hint': 'Cochez un constat, ou prenez tous les échecs.',
  'brief.none': 'Aucun constat à corriger',
  'brief.untested': 'Non testé — pas de brief',
  'brief.copy': 'Copier',
  'brief.copied': 'Brief copié',
  'brief.copyFail': 'La copie a échoué. Sélectionnez le texte.',
  'brief.regenerate': 'Régénérer',
  'brief.download': 'Télécharger en Markdown',
  'brief.collapse': 'Réduire',
  'brief.show': 'Afficher le brief',
  'brief.live': 'Brief généré, {n} constats',
  'brief.include': 'Inclure {title}',
  'brief.panel': 'Texte du brief',
  'brief.terminal.group': 'Commande pour {title}',
  'brief.terminal.rien': 'Rien',
  'brief.terminal.rien.long': 'Pas de commande',
  'brief.terminal.verif': 'Vérif',
  'brief.terminal.verif.long': 'Vérifier, sans écrire',
  'brief.terminal.fix': 'Fix',
  'brief.terminal.fix.long': 'Proposer une correction',
  'brief.notProof': 'Ce fichier n’est pas une preuve.',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/i18n/brief-copy.test.ts && pnpm copy-lint`

Expected: PASS. `copy-lint` se termine avec le code 0. Aucune nouvelle erreur sur `brief.*`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/i18n/fr.ts apps/web/src/i18n/brief-copy.test.ts
git commit -m "feat: fragments français du brief agent"
```

---

### Task 3: Corps du brief

**Files:**
- Create: `apps/web/src/lib/brief.ts`
- Create: `apps/web/src/lib/brief.test.ts`
- Test: `apps/web/src/lib/brief.test.ts`

**Interfaces:**
- Consumes: `MethodeEntry`, `BriefSource`, `BriefFinding`, `BriefDocument` (sans que `includeTerminal` change encore le texte), `t`, `formatDateTime`, `asParams`.
- Produces: `sameSentence(a: string, b: string): boolean`, `recognizedStack(findings): string | null`, `referenceOf(sources, citation): string | null`, `renderBriefBody(input: BriefDocument): string`, `renderBrief(input: BriefDocument): string` (pour l’instant identique à `renderBriefBody`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  type BriefDocument,
  type BriefFinding,
  recognizedStack,
  renderBrief,
  sameSentence,
} from './brief.js';
import type { MethodeEntry } from './methode-catalog.js';

function finding(partial: Partial<BriefFinding> = {}): BriefFinding {
  return {
    id: 'securite.hsts-0',
    checkId: 'securite.hsts',
    title: 'Garder le navigateur en adresse chiffrée',
    statusLabel: 'Problème',
    proof: 'L’en-tête manque.',
    impact: null,
    terminal: 'rien',
    ...partial,
  };
}

function doc(partial: Partial<BriefDocument> = {}): BriefDocument {
  const catalog = new Map<string, MethodeEntry>([
    [
      'securite.hsts',
      {
        id: 'securite.hsts',
        pass: 'En-tête présent, max-age d’au moins six mois.',
        criterion: null,
        citation: 'MDN HTTP Observatory',
      },
    ],
  ]);
  return {
    url: 'https://exemple.fr/chemin',
    at: new Date('2026-10-23T12:30:00Z'),
    stack: null,
    findings: [finding()],
    catalog,
    sources: new Map(),
    includeTerminal: false,
    ...partial,
  };
}

describe('renderBrief', () => {
  it('suit les six titres, dans cet ordre', () => {
    const text = renderBrief(doc());
    const titles = [
      'Rôle',
      'Contexte du site',
      'Constats',
      'Référentiel',
      'Attendu',
      'Garde-fous',
    ];
    let cursor = -1;
    for (const title of titles) {
      const at = text.indexOf(title);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
    expect(text).not.toContain('Terminal');
    expect(text).toContain('Vous corrigez le site https://exemple.fr/chemin');
    expect(text).toContain('Adresse : https://exemple.fr/chemin.');
    expect(text).toContain('Audit du 23 oct. 2026, 14 h 30.');
    expect(text).not.toContain('Technique reconnue');
    expect(text).toContain('Statut : Problème.');
    expect(text).toContain('Preuve : L’en-tête manque.');
    expect(text).not.toContain('Pour la personne');
    expect(text).toContain('Test : securite.hsts.');
    expect(text).toContain(
      'Réussi veut dire : En-tête présent, max-age d’au moins six mois.',
    );
    expect(text).toContain('Référence déjà notée : MDN HTTP Observatory.');
    expect(text).not.toContain('Critère :');
    expect(text).toContain('Ne recopiez aucun secret.');
    expect(text).toContain('N’inventez pas de note.');
  });

  it('omet la pile, la citation et la définition absentes', () => {
    const text = renderBrief(
      doc({
        at: null,
        catalog: new Map(),
        findings: [finding({ checkId: 'qualite.liens' })],
      }),
    );
    expect(text).not.toContain('Audit du');
    expect(text).not.toContain('Technique reconnue');
    expect(text).not.toContain('Réussi veut dire');
    expect(text).not.toContain('Référence déjà notée');
    expect(text).toContain('Test : qualite.liens.');
    expect(text).not.toMatch(/OWASP/);
  });

  it('préfère la source déjà affichée, et n’écrit pas deux fois la même phrase', () => {
    expect(sameSentence('  Même phrase. ', 'même phrase.')).toBe(true);
    const text = renderBrief(
      doc({
        sources: new Map([
          [
            'securite.hsts',
            [{ label: 'MDN', url: 'https://developer.mozilla.org/fr/' }],
          ],
        ]),
        findings: [
          finding({
            proof: 'Même phrase.',
            impact: 'même phrase.',
          }),
        ],
      }),
    );
    expect(text).toContain(
      'Référence déjà notée : MDN — https://developer.mozilla.org/fr/.',
    );
    expect(text).not.toContain('MDN HTTP Observatory');
    expect(text).not.toContain('Pour la personne');
  });

  it('ajoute l’impact seulement s’il est une autre phrase', () => {
    const text = renderBrief(
      doc({
        findings: [
          finding({
            proof: 'L’en-tête manque.',
            impact: 'Le navigateur peut retomber en clair.',
          }),
        ],
      }),
    );
    expect(text).toContain(
      'Pour la personne : Le navigateur peut retomber en clair.',
    );
  });

  it('reconnaît la technique seulement si l’audit l’a déjà listée', () => {
    expect(
      recognizedStack([
        {
          checkId: 'securite.technologies',
          messageKey: 'securite.technologies.pass',
          params: { liste: 'nginx' },
        },
      ]),
    ).toBe('nginx');
    expect(
      recognizedStack([
        {
          checkId: 'securite.technologies',
          messageKey: 'securite.technologies.pass_aucune',
          params: {},
        },
      ]),
    ).toBeNull();
    expect(
      recognizedStack([
        {
          checkId: 'securite.technologies',
          messageKey: 'securite.technologies.warn',
          params: { liste: 'Apache/2.4.1' },
        },
      ]),
    ).toBe('Apache/2.4.1');
    const text = renderBrief(doc({ stack: 'nginx' }));
    expect(text).toContain('Technique reconnue : nginx.');
  });

  it('garde l’ordre reçu et le critère RGESN copié', () => {
    const text = renderBrief(
      doc({
        findings: [
          finding({ id: 'a', title: 'Second', checkId: 'seo.title' }),
          finding({
            id: 'b',
            title: 'Premier',
            checkId: 'ecologie.rgesn_budget',
          }),
        ],
        catalog: new Map([
          [
            'ecologie.rgesn_budget',
            {
              id: 'ecologie.rgesn_budget',
              pass: '≤ 1 Mio et ≤ 30 requêtes',
              criterion: '6.1 — Poids et nombre de requêtes, plafonds absolus.',
              citation: 'référentiel général d’écoconception',
            },
          ],
        ]),
      }),
    );
    expect(text.indexOf('Second')).toBeLessThan(text.indexOf('Premier'));
    expect(text).toContain(
      'Critère : 6.1 — Poids et nombre de requêtes, plafonds absolus.',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/brief.test.ts`

Expected: FAIL, module `brief.js` absent.

- [ ] **Step 3: Write minimal implementation**

`apps/web/src/lib/brief.ts`

```ts
import { formatDateTime } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import type { MethodeEntry } from './methode-catalog.js';
import { asParams } from './translate.js';

export interface BriefSource {
  label: string;
  url: string;
}

export type TerminalMode = 'rien' | 'verif' | 'fix';

export interface BriefFinding {
  id: string;
  checkId: string;
  title: string;
  statusLabel: string;
  proof: string;
  impact: string | null;
  terminal: TerminalMode;
}

export interface BriefDocument {
  url: string;
  at: Date | null;
  stack: string | null;
  findings: readonly BriefFinding[];
  catalog: ReadonlyMap<string, MethodeEntry>;
  sources: ReadonlyMap<string, readonly BriefSource[]>;
  includeTerminal: boolean;
}

export function sameSentence(a: string, b: string): boolean {
  const fold = (value: string): string =>
    value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr-FR');
  return fold(a) !== '' && fold(a) === fold(b);
}

export function recognizedStack(
  findings: readonly {
    checkId: string;
    messageKey: string;
    params: unknown;
  }[],
): string | null {
  const row = findings.find((item) => item.checkId === 'securite.technologies');
  if (!row) return null;
  if (
    row.messageKey !== 'securite.technologies.pass' &&
    row.messageKey !== 'securite.technologies.warn'
  ) {
    return null;
  }
  const list = asParams(row.params)?.liste;
  if (typeof list !== 'string') return null;
  const stack = list.trim();
  return stack === '' ? null : stack;
}

export function referenceOf(
  sources: readonly BriefSource[],
  citation: string | null,
): string | null {
  const parts = sources
    .filter((source) => source.label.trim() !== '' && source.url.trim() !== '')
    .map((source) => `${source.label.trim()} — ${source.url.trim()}`);
  if (parts.length > 0) return parts.join(' ; ');
  if (citation === null || citation.trim() === '') return null;
  return citation.trim();
}

function bullet(line: string, indent = ''): string {
  return `${indent}- ${line}`;
}

function findingBlock(item: BriefFinding): string[] {
  const lines = [bullet(`${item.title} — ${item.statusLabel}`)];
  lines.push(bullet(t('brief.finding.proof', { proof: item.proof }), '  '));
  if (item.impact && !sameSentence(item.proof, item.impact)) {
    lines.push(
      bullet(t('brief.finding.impact', { impact: item.impact }), '  '),
    );
  }
  return lines;
}

function catalogBlock(
  item: BriefFinding,
  catalog: ReadonlyMap<string, MethodeEntry>,
  sources: ReadonlyMap<string, readonly BriefSource[]>,
): string[] {
  const entry = catalog.get(item.checkId);
  const lines = [bullet(item.title), bullet(t('brief.ref.id', { id: item.checkId }), '  ')];
  if (entry?.criterion) {
    lines.push(
      bullet(t('brief.ref.criterion', { criterion: entry.criterion }), '  '),
    );
  }
  if (entry?.pass) {
    lines.push(bullet(t('brief.ref.pass', { pass: entry.pass }), '  '));
  }
  const citation = referenceOf(sources.get(item.checkId) ?? [], entry?.citation ?? null);
  if (citation) {
    lines.push(bullet(t('brief.ref.source', { citation }), '  '));
  }
  return lines;
}

export function renderBriefBody(input: BriefDocument): string {
  const lines: string[] = [
    t('brief.h.role'),
    bullet(t('brief.role.fix', { url: input.url })),
    bullet(t('brief.role.dev')),
    '',
    t('brief.h.context'),
    bullet(t('brief.context.url', { url: input.url })),
  ];
  if (input.stack) {
    lines.push(bullet(t('brief.context.stack', { stack: input.stack })));
  }
  if (input.at) {
    lines.push(bullet(t('brief.context.date', { date: formatDateTime(input.at) })));
  }
  lines.push('', t('brief.h.findings'));
  for (const item of input.findings) lines.push(...findingBlock(item));
  lines.push('', t('brief.h.catalog'));
  for (const item of input.findings) {
    lines.push(...catalogBlock(item, input.catalog, input.sources));
  }
  lines.push(
    '',
    t('brief.h.expected'),
    bullet(t('brief.expected.diff')),
    bullet(t('brief.expected.stack')),
    bullet(t('brief.expected.score')),
    '',
    t('brief.h.guards'),
    bullet(t('brief.guard.secret')),
    bullet(t('brief.guard.prod')),
    bullet(t('brief.guard.scope')),
    bullet(t('brief.guard.ask')),
    bullet(t('brief.guard.attack')),
  );
  return `${lines.join('\n')}\n`;
}

export function renderBrief(input: BriefDocument): string {
  return renderBriefBody(input);
}
```

`includeTerminal` est lu par la tâche 4. Ici il ne change pas le texte. Ne pas préfixer le paramètre d’un underscore : le type public garde le champ.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/brief.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/brief.ts apps/web/src/lib/brief.test.ts
git commit -m "feat: assemble le corps du brief dans le navigateur"
```

---

### Task 4: Partie Terminal

**Files:**
- Create: `apps/web/src/lib/brief-terminal.ts`
- Create: `apps/web/src/lib/brief-terminal.test.ts`
- Modify: `apps/web/src/lib/brief.ts` (`renderBrief` seulement)
- Modify: `apps/web/src/lib/brief.test.ts`
- Test: `apps/web/src/lib/brief-terminal.test.ts`, `apps/web/src/lib/brief.test.ts`

**Interfaces:**
- Consumes: `BriefFinding`, `renderBriefBody`, `t`.
- Produces: `terminalKind(checkId: string): 'headers' | 'cert' | 'dns' | 'lighthouse' | 'none'`, `renderTerminal(findings: readonly BriefFinding[]): string`, `briefViolations(text: string): string[]`. `renderBrief` ajoute le terminal seulement si `includeTerminal` est vrai et qu’au moins un constat est `verif` ou `fix`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/brief-terminal.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import type { BriefFinding } from './brief.js';
import {
  briefViolations,
  renderTerminal,
  terminalKind,
} from './brief-terminal.js';

function row(
  checkId: string,
  terminal: BriefFinding['terminal'],
  title = 'Constat',
): BriefFinding {
  return {
    id: checkId,
    checkId,
    title,
    statusLabel: 'Problème',
    proof: 'Preuve visible.',
    impact: null,
    terminal,
  };
}

describe('terminal', () => {
  it('classe les lectures déjà prévues, et refuse le sondage actif', () => {
    expect(terminalKind('securite.hsts')).toBe('headers');
    expect(terminalKind('securite.certificate')).toBe('cert');
    expect(terminalKind('securite.tls')).toBe('cert');
    expect(terminalKind('dns_email.spf')).toBe('dns');
    expect(terminalKind('performance.lcp')).toBe('lighthouse');
    expect(terminalKind('seo.lighthouse')).toBe('lighthouse');
    expect(terminalKind('accessibilite.lighthouse')).toBe('lighthouse');
    expect(terminalKind('ecologie.rgesn_cache')).toBe('lighthouse');
    expect(terminalKind('securite.fichiers')).toBe('none');
    expect(terminalKind('securite.listing')).toBe('none');
    expect(terminalKind('securite.cve_scripts')).toBe('none');
    expect(terminalKind('vie_privee.traceurs')).toBe('none');
  });

  it('omet la partie quand tout est Rien', () => {
    expect(renderTerminal([row('securite.hsts', 'rien')])).toBe('');
  });

  it('groupe Vérif et Fix, sans écriture en Vérif', () => {
    const text = renderTerminal([
      row('securite.hsts', 'verif', 'HSTS'),
      row('seo.title', 'rien', 'Titre'),
      row('dns_email.spf', 'fix', 'SPF'),
    ]);
    expect(text.startsWith('Terminal\n')).toBe(true);
    expect(text).toContain('HSTS — Vérif');
    expect(text).toContain('Lisez les en-têtes de la réponse.');
    expect(text).toContain('N’écrivez rien.');
    expect(text).not.toContain('Titre —');
    expect(text).toContain('SPF — Fix');
    expect(text).toContain('Proposez un fichier, une configuration');
    expect(text).toContain('S’il faut deviner la technique, demandez.');
    expect(text).toContain('Si l’outil n’est pas là, passez.');
    expect(text).toContain('Ces commandes ne partent pas d’Audigy.');
    expect(text).toContain('Ne lancez pas de test actif.');
    expect(briefViolations(text)).toEqual([]);
  });

  it('repère une commande destructrice ou un secret', () => {
    expect(briefViolations('rm -rf /tmp')).toEqual(
      expect.arrayContaining([expect.stringContaining('rm')]),
    );
    expect(briefViolations('git push --force')).not.toEqual([]);
    expect(briefViolations('git push -f')).not.toEqual([]);
    expect(briefViolations('NVD_API_KEY')).not.toEqual([]);
    expect(briefViolations('cookie=abc')).not.toEqual([]);
    expect(briefViolations('N’utilisez pas rm, ni un push forcé.')).toEqual([]);
  });
});
```

Ajouter dans `apps/web/src/lib/brief.test.ts` :

```ts
  it('n’ajoute Terminal que si on le demande et qu’un constat n’est pas Rien', () => {
    const withMode = doc({
      includeTerminal: true,
      findings: [finding({ terminal: 'verif' })],
    });
    expect(renderBrief(withMode)).toContain('Terminal');
    expect(renderBrief(withMode)).toContain('Vérif');
    expect(renderBrief({ ...withMode, includeTerminal: false })).not.toContain(
      'Terminal',
    );
    expect(
      renderBrief(
        doc({
          includeTerminal: true,
          findings: [finding({ terminal: 'rien' })],
        }),
      ),
    ).not.toContain('Terminal');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/brief-terminal.test.ts apps/web/src/lib/brief.test.ts`

Expected: FAIL, `brief-terminal.js` absent, et le test Terminal de `brief.test.ts` échoue.

- [ ] **Step 3: Write minimal implementation**

`apps/web/src/lib/brief-terminal.ts`

```ts
import { t } from '../i18n/index.js';
import type { BriefFinding } from './brief.js';

export type TerminalKind = 'headers' | 'cert' | 'dns' | 'lighthouse' | 'none';

const LIGHTHOUSE = new Set([
  'performance.lighthouse',
  'performance.lcp',
  'performance.inp',
  'performance.cls',
  'performance.poids',
  'performance.cache',
  'performance.compression',
  'seo.lighthouse',
  'accessibilite.lighthouse',
  'ecologie.rgesn_cache',
  'ecologie.rgesn_compression',
]);

export function terminalKind(checkId: string): TerminalKind {
  if (checkId === 'securite.certificate' || checkId === 'securite.tls') {
    return 'cert';
  }
  if (checkId.startsWith('dns_email.')) return 'dns';
  if (LIGHTHOUSE.has(checkId)) return 'lighthouse';
  if (
    checkId.startsWith('securite.') &&
    checkId !== 'securite.fichiers' &&
    checkId !== 'securite.listing' &&
    checkId !== 'securite.cve_scripts' &&
    checkId !== 'securite.cve_logiciels' &&
    checkId !== 'securite.technologies'
  ) {
    return 'headers';
  }
  return 'none';
}

const BANNED: readonly RegExp[] = [
  /\brm\s+-/u,
  /\bgit\s+push\s+--force\b/u,
  /\bgit\s+push\s+-f\b/u,
  /\bdrop\s+database\b/iu,
  /\bdrop\s+table\b/iu,
  /NVD_API_KEY/u,
  /service_role/u,
  /cookie\s*=/iu,
  /OWASP/u,
];

export function briefViolations(text: string): string[] {
  return BANNED.filter((pattern) => pattern.test(text)).map(
    (pattern) => pattern.source,
  );
}

function suggestion(kind: TerminalKind): string {
  if (kind === 'headers') return t('brief.terminal.headers');
  if (kind === 'cert') return t('brief.terminal.cert');
  if (kind === 'dns') return t('brief.terminal.dns');
  if (kind === 'lighthouse') return t('brief.terminal.lh');
  return t('brief.terminal.active');
}

export function renderTerminal(findings: readonly BriefFinding[]): string {
  const chosen = findings.filter(
    (item) => item.terminal === 'verif' || item.terminal === 'fix',
  );
  if (chosen.length === 0) return '';
  const lines = [
    t('brief.h.terminal'),
    `- ${t('brief.terminal.origin')}`,
    `- ${t('brief.terminal.ban')}`,
    `- ${t('brief.terminal.active')}`,
  ];
  for (const item of chosen) {
    const label =
      item.terminal === 'verif'
        ? t('brief.terminal.verif')
        : t('brief.terminal.fix');
    lines.push(`- ${item.title} — ${label}`);
    if (item.terminal === 'verif') {
      lines.push(`  - ${suggestion(terminalKind(item.checkId))}`);
    } else {
      lines.push(`  - ${t('brief.terminal.fixSuggest')}`);
      lines.push(`  - ${t('brief.terminal.guess')}`);
      lines.push(`  - ${t('brief.terminal.fixWrite')}`);
    }
    lines.push(`  - ${t('brief.terminal.absent')}`);
  }
  return `${lines.join('\n')}\n`;
}
```

Dans `apps/web/src/lib/brief.ts`, remplacer `renderBrief` :

```ts
import { renderTerminal } from './brief-terminal.js';

export function renderBrief(input: BriefDocument): string {
  const body = renderBriefBody(input);
  if (!input.includeTerminal) return body;
  const terminal = renderTerminal(input.findings);
  if (terminal === '') return body;
  return `${body}\n${terminal}`;
}
```

`brief-terminal.ts` importe `BriefFinding` avec `import type` depuis `brief.ts`. `brief.ts` importe `renderTerminal` en valeur. Il n’y a pas de cycle à l’exécution.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/brief-terminal.test.ts apps/web/src/lib/brief.test.ts`

Expected: PASS. `briefViolations` du texte Vérif/Fix est `[]`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/brief-terminal.ts apps/web/src/lib/brief-terminal.test.ts apps/web/src/lib/brief.ts apps/web/src/lib/brief.test.ts
git commit -m "feat: ajoute la partie terminal optionnelle du brief"
```

---

### Task 5: Fichier, sélection, barre

**Files:**
- Create: `apps/web/src/lib/brief-file.ts`
- Create: `apps/web/src/lib/brief-file.test.ts`
- Create: `apps/web/src/lib/brief-bar.ts`
- Create: `apps/web/src/lib/brief-bar.test.ts`
- Test: les deux fichiers de test

**Interfaces:**
- Consumes: `renderBrief`, `BriefDocument`, `BriefFinding`, `ReportRow` n’est pas encore requis. `t`.
- Produces:
  - `exportHost(url: string): string`
  - `parisCivilDay(date: Date): string`
  - `briefFilename(url: string, at: Date): string`
  - `briefFileBody(brief: string): string`
  - `downloadTextFile(filename: string, body: string): void`
  - `selectionLabel(count: number): string`
  - `generatedLive(count: number): string`
  - `failsOf(rows: readonly { id: string; catalogStatus: CatalogStatus }[]): string[]`
  - `barState(input: BarInput): BarState`

```ts
export interface BarInput {
  failCount: number;
  warnCount: number;
  passCount: number;
  selectedCount: number;
}

export interface BarState {
  visible: boolean;
  allClear: boolean;
  generateEnabled: boolean;
  failsEnabled: boolean;
  hint: boolean;
}
```

Si `apps/web/src/lib/report-export.ts` exporte déjà `exportHost` et `parisCivilDay`, les importer depuis là et ne pas les redéfinir. Le test de jour civil reste dans `brief-file.test.ts` et appelle les fonctions publiques de `brief-file.ts`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/brief-file.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { briefFileBody, briefFilename, exportHost, parisCivilDay } from './brief-file.js';

describe('fichier du brief', () => {
  it('retire le schéma, le chemin et la casse de l’hôte', () => {
    expect(exportHost('https://Exemple.FR/a/b?q=1')).toBe('exemple.fr');
    expect(exportHost('pas une adresse')).toBe('site');
  });

  it('prend le jour civil de Paris, le même que le Markdown du rapport', () => {
    expect(parisCivilDay(new Date('2026-10-23T12:30:00Z'))).toBe('2026-10-23');
    expect(parisCivilDay(new Date('2026-10-23T22:00:00Z'))).toBe('2026-10-24');
    expect(briefFilename('https://Exemple.FR/chemin', new Date('2026-10-23T22:00:00Z'))).toBe(
      'audigy-brief-exemple.fr-2026-10-24.md',
    );
  });

  it('ajoute la ligne finale sans remplacer le brief', () => {
    const body = briefFileBody('Rôle\n- ligne\n');
    expect(body.endsWith('Ce fichier n’est pas une preuve.\n')).toBe(true);
    expect(body).toContain('Rôle\n- ligne\n');
    expect(body.trim().split('\n').at(-1)).toBe(
      'Ce fichier n’est pas une preuve.',
    );
  });
});
```

`apps/web/src/lib/brief-bar.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { barState, failsOf, generatedLive, selectionLabel } from './brief-bar.js';

describe('barre du brief', () => {
  it('compte et active selon les cases', () => {
    expect(selectionLabel(0)).toBe('0 sélectionnés');
    expect(selectionLabel(1)).toBe('1 sélectionné');
    expect(selectionLabel(2)).toBe('2 sélectionnés');
    expect(generatedLive(3)).toBe('Brief généré, 3 constats');
    expect(
      barState({ failCount: 2, warnCount: 1, passCount: 1, selectedCount: 0 }),
    ).toEqual({
      visible: true,
      allClear: false,
      generateEnabled: false,
      failsEnabled: true,
      hint: true,
    });
    expect(
      barState({ failCount: 2, warnCount: 1, passCount: 0, selectedCount: 1 }),
    ).toMatchObject({ generateEnabled: true, hint: false, failsEnabled: true });
  });

  it('réserve le message tous réussis, et coupe la voie rapide sans problème', () => {
    expect(
      barState({ failCount: 0, warnCount: 0, passCount: 2, selectedCount: 0 }),
    ).toEqual({
      visible: false,
      allClear: true,
      generateEnabled: false,
      failsEnabled: false,
      hint: false,
    });
    expect(
      barState({ failCount: 0, warnCount: 0, passCount: 0, selectedCount: 0 }),
    ).toMatchObject({ visible: false, allClear: false });
    expect(
      barState({ failCount: 0, warnCount: 2, passCount: 0, selectedCount: 0 }),
    ).toMatchObject({ visible: true, failsEnabled: false, allClear: false });
  });

  it('la voie rapide ne prend que les problèmes, dans l’ordre reçu', () => {
    expect(
      failsOf([
        { id: 'a', catalogStatus: 'warn' },
        { id: 'b', catalogStatus: 'fail' },
        { id: 'c', catalogStatus: 'na' },
        { id: 'd', catalogStatus: 'fail' },
      ]),
    ).toEqual(['b', 'd']);
  });
});
```

`selectionLabel(0)` utilise `brief.count.many` avec `{n: 0}`. Le bouton Générer est inactif dans ce cas : le libellé « 0 sélectionnés » reste affiché. La spec ne donne pas une autre formule pour zéro.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/brief-file.test.ts apps/web/src/lib/brief-bar.test.ts`

Expected: FAIL, modules absents.

- [ ] **Step 3: Write minimal implementation**

`apps/web/src/lib/brief-file.ts`

```ts
import { t } from '../i18n/index.js';

export function exportHost(url: string): string {
  try {
    const host = new URL(url).hostname.toLocaleLowerCase('fr-FR');
    if (/^[a-z0-9.-]+$/u.test(host) && !host.startsWith('.')) return host;
  } catch {
    // adresse illisible
  }
  return 'site';
}

export function parisCivilDay(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function briefFilename(url: string, at: Date): string {
  return `audigy-brief-${exportHost(url)}-${parisCivilDay(at)}.md`;
}

export function briefFileBody(brief: string): string {
  const core = brief.replace(/\n$/u, '');
  return `${core}\n${t('brief.notProof')}\n`;
}

export function downloadTextFile(filename: string, body: string): void {
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
```

`apps/web/src/lib/brief-bar.ts`

```ts
import { t } from '../i18n/index.js';

export type CatalogStatus = 'pass' | 'warn' | 'fail' | 'untested' | 'na';

export interface BarInput {
  failCount: number;
  warnCount: number;
  passCount: number;
  selectedCount: number;
}

export interface BarState {
  visible: boolean;
  allClear: boolean;
  generateEnabled: boolean;
  failsEnabled: boolean;
  hint: boolean;
}

export function selectionLabel(count: number): string {
  if (count === 1) return t('brief.count.one');
  return t('brief.count.many', { n: count });
}

export function generatedLive(count: number): string {
  return t('brief.live', { n: count });
}

export function barState(input: BarInput): BarState {
  const actionable = input.failCount + input.warnCount > 0;
  return {
    visible: actionable,
    allClear: !actionable && input.passCount > 0,
    generateEnabled: input.selectedCount > 0,
    failsEnabled: input.failCount > 0,
    hint: actionable && input.selectedCount === 0,
  };
}

export function failsOf(
  rows: readonly { id: string; catalogStatus: CatalogStatus }[],
): string[] {
  return rows
    .filter((row) => row.catalogStatus === 'fail')
    .map((row) => row.id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/brief-file.test.ts apps/web/src/lib/brief-bar.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/brief-file.ts apps/web/src/lib/brief-file.test.ts apps/web/src/lib/brief-bar.ts apps/web/src/lib/brief-bar.test.ts
git commit -m "feat: nomme le fichier du brief et l’état de la barre"
```

---

### Task 6: Lignes du rapport propriétaire

**Files:**
- Modify: `apps/web/src/lib/report-model.ts`
- Modify: `apps/web/src/lib/report-model.test.ts`
- Test: `apps/web/src/lib/report-model.test.ts`

**Interfaces:**
- Consumes: `AuditPayload`, `toFinding`, `FixView`, `BriefSource`, `CatalogStatus`.
- Produces: `reportRows(payload: AuditPayload, fixes: ReadonlyMap<string, FixView>, domain?: string): ReportRow[]`. `reportFindings` continue d’écarter `na`. Les scores ne changent pas.

`ReportRow` est déclaré dans `report-model.ts` et réexporte les champs de `Finding` plus `checkId`, `catalogStatus`, `proof`, `impactText`, `sources`.

- [ ] **Step 1: Write the failing test**

Ajouter dans le `describe('rapport')` de `report-model.test.ts` :

```ts
  it('garde le non applicable pour le brief, hors du score affiché', () => {
    const fixes = new Map([['securite.https', fix]]);
    const rows = reportRows(payload, fixes);
    expect(rows.map((item) => item.checkId)).toEqual([
      'securite.https',
      'vie_privee.traceurs',
      'seo.hors',
    ]);
    expect(rows.map((item) => item.catalogStatus)).toEqual([
      'fail',
      'untested',
      'na',
    ]);
    expect(rows[0]?.sources).toEqual([
      { label: 'MDN', url: 'https://developer.mozilla.org/fr/' },
    ]);
    expect(rows[0]?.proof).toBe(rows[0]?.why);
    expect(rows[0]?.impactText).toBeNull();
    expect(rows[2]?.status).toBe('untested');
    expect(reportFindings(payload, fixes).some((item) => item.id.includes('seo.hors'))).toBe(
      false,
    );
  });
```

L’import de `reportRows` s’ajoute à l’import existant depuis `./report-model.js`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/report-model.test.ts`

Expected: FAIL, `reportRows` introuvable. Le test « écarte le non applicable » reste vert.

- [ ] **Step 3: Write minimal implementation**

Dans `apps/web/src/lib/report-model.ts` :

```ts
import type { BriefSource } from './brief.js';

export type CatalogStatus = 'pass' | 'warn' | 'fail' | 'untested' | 'na';

export interface ReportRow extends Finding {
  checkId: string;
  catalogStatus: CatalogStatus;
  proof: string;
  impactText: string | null;
  sources: BriefSource[];
}

function catalogStatusOf(raw: string, status: Finding['status']): CatalogStatus {
  if (raw === 'na') return 'na';
  if (raw === 'pass' || raw === 'warn' || raw === 'fail' || raw === 'untested') {
    return raw;
  }
  return status;
}

export function reportRows(
  payload: AuditPayload,
  fixes: ReadonlyMap<string, FixView>,
  domain?: string,
): ReportRow[] {
  return payload.findings.flatMap((row, index) => {
    if (domain === undefined && row.domain === 'reputation') return [];
    if (domain !== undefined && row.domain !== domain) return [];
    const fix = row.fixKey ? fixes.get(row.fixKey) : undefined;
    const finding = toFinding(row, fix);
    finding.id = `${row.checkId}-${index}`;
    const sources: BriefSource[] = [];
    if (fix?.sourceHref && fix.sourceLabel) {
      sources.push({ label: fix.sourceLabel, url: fix.sourceHref });
    }
    return [
      {
        ...finding,
        checkId: row.checkId,
        catalogStatus: catalogStatusOf(row.status, finding.status),
        proof: finding.why,
        impactText: null,
        sources,
      },
    ];
  });
}
```

Ne pas retirer le `if (row.status === 'na') return []` de `reportFindings`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/report-model.test.ts`

Expected: PASS, y compris « relie la fiche, écarte le non applicable ».

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/report-model.ts apps/web/src/lib/report-model.test.ts
git commit -m "feat: prépare les lignes du brief sans changer le score"
```

---

### Task 7: Cases, sélecteurs, panneau

**Files:**
- Modify: `apps/web/src/components/FindingList.svelte`
- Modify: `apps/web/src/styles/base.css`
- Modify: `apps/web/src/data/demo.ts`
- Modify: `apps/web/src/pages/dev/composants.astro`
- Test: `pnpm exec vitest run apps/web/src/lib/brief.test.ts apps/web/src/lib/brief-bar.test.ts` puis le parcours Playwright de la tâche 9. Cette tâche ne se termine pas sans le commit ; la tâche 9 prouve l’écran.

**Interfaces:**
- Consumes: `ReportRow`, `renderBrief`, `methodeCatalog`, `recognizedStack` n’est pas appelé ici, `barState`, `failsOf`, `selectionLabel`, `generatedLive`, `briefFilename`, `briefFileBody`, `downloadTextFile`, `groupFindings`, `t`.
- Produces: props `brief?: { url: string; at: Date | null; stack: string | null } | null`. Sans `brief`, la liste actuelle ne gagne ni case, ni barre, ni panneau. Avec `brief`, les `findings` sont des `ReportRow`.

Comportement à tenir dans le composant :

- Case seulement si `catalogStatus` est `fail` ou `warn`. Nom accessible `t('brief.include', { title })`.
- `untested` et `na` : pas de case, paragraphe `t('brief.untested')`.
- `pass` : pas de case, pas de hint.
- Sélecteur radio par constat cochable. Défaut `rien`. Le choix vit dans un `Map` d’état, pas en base. Générer, Régénérer et Réduire ne le vident pas.
- Libellé visible : `brief.terminal.rien` / `verif` / `fix`. Nom accessible : la variante `.long`, dans un `span.visually-hidden`. Le mot visible est `aria-hidden="true"`.
- Barre visible selon `barState`. Compteur `selectionLabel`. « Tous les échecs » appelle `renderBrief` sur les seuls `fail`, `includeTerminal: false`, sans modifier cases ni radios. « Générer le brief » est inactif à zéro case. Hint si `bar.hint`.
- `allClear` : paragraphe `t('brief.none')`, pas de barre, pas de panneau.
- Panneau sous la liste, pas une modale. `textarea` en lecture seule, `rows={14}`, `class="brief-text"`, `aria-label={t('brief.panel')}`.
- Après ouverture, le bouton Générer a `button button-secondary`. Copier a `button button-primary`. Régénérer a `button button-secondary`. Télécharger a `link-action`. Réduire a `button button-secondary`.
- Copier écrit `briefText` entier dans `navigator.clipboard.writeText`. Succès : `t('brief.copied')`. Échec : `t('brief.copyFail')`. Aucun `fetch`.
- Régénérer relit cases et radios. Réduire met `panelOpen` à faux et garde `briefText`. « Afficher le brief » remet `panelOpen` à vrai sans rappeler `renderBrief`.
- Changer une case ne rappelle pas `renderBrief`.
- Après génération, région `role="status"` : vider le texte, `await tick()`, puis `generatedLive(count)`.
- L’ordre passé à `renderBrief` est `[...groupFindings(rows).priority, ...avertissements cochés dans groupFindings(rows).next]`.

- [ ] **Step 1: Étendre l’exemple sans casser les titres**

Dans `apps/web/src/data/demo.ts`, ajouter `checkId` sur chaque entrée de `FINDINGS` et le copier dans l’objet retourné par `demoFindings` :

| id affiché | checkId |
|---|---|
| `https` | `securite.https` |
| `frame` | `securite.frames` |
| `images` | `qualite.images_poids` |
| `description` | `seo.description` |
| `cookies` | `securite.cookies` |
| `title` | `seo.title` |
| `lang` | `seo.hreflang` |

Le retour de `demoFindings` satisfait `ReportRow` : `catalogStatus` égale `status`, `proof` égale `why`, `impactText` vaut `null`, `sources` reprend `sourceLabel` et `sourceHref` quand les deux existent. Les titres `t('demo.*')` ne changent pas.

Dans `apps/web/src/pages/dev/composants.astro`, la liste devient :

```astro
<FindingList
  findings={findings}
  brief={{ url, at: auditedAt, stack: null }}
  client:load
/>
```

- [ ] **Step 2: Barre et panneau dans `FindingList.svelte`**

Ajouter les imports et l’état. Conserver filtres, groupes, `<details>` et le bouton qui copie le code du constat.

```ts
import { tick } from 'svelte';
import {
  type BriefDocument,
  type BriefFinding,
  type TerminalMode,
  renderBrief,
} from '../lib/brief.js';
import { barState, failsOf, generatedLive, selectionLabel } from '../lib/brief-bar.js';
import { briefFileBody, briefFilename, downloadTextFile } from '../lib/brief-file.js';
import { methodeCatalog } from '../lib/methode-load.js';
import type { ReportRow } from '../lib/report-model.js';

interface BriefContext {
  url: string;
  at: Date | null;
  stack: string | null;
}

interface Props {
  findings: Finding[] | ReportRow[];
  brief?: BriefContext | null;
}

let { findings, brief = null }: Props = $props();
let checked = $state<Record<string, boolean>>({});
let terminal = $state<Record<string, TerminalMode>>({});
let briefText = $state<string | null>(null);
let panelOpen = $state(false);
let toast = $state('');
let live = $state('');

function asRow(item: Finding | ReportRow): ReportRow {
  if ('catalogStatus' in item) return item;
  return {
    ...item,
    checkId: item.id,
    catalogStatus: item.status,
    proof: item.why,
    impactText: null,
    sources: [],
  };
}

const rows = $derived(findings.map(asRow));
const countsBrief = $derived({
  failCount: rows.filter((row) => row.catalogStatus === 'fail').length,
  warnCount: rows.filter((row) => row.catalogStatus === 'warn').length,
  passCount: rows.filter((row) => row.catalogStatus === 'pass').length,
  selectedCount: rows.filter((row) => checked[row.id]).length,
});
const bar = $derived(brief ? barState(countsBrief) : null);

function modeOf(id: string): TerminalMode {
  return terminal[id] ?? 'rien';
}

function toBriefFinding(row: ReportRow, mode: TerminalMode): BriefFinding {
  return {
    id: row.id,
    checkId: row.checkId,
    title: row.title,
    statusLabel: t(
      row.catalogStatus === 'warn' ? 'status.warn' : 'status.fail',
    ),
    proof: row.proof,
    impact: row.impactText,
    terminal: mode,
  };
}

function documentFrom(items: readonly ReportRow[], includeTerminal: boolean): BriefDocument {
  const sources = new Map(items.map((row) => [row.checkId, row.sources]));
  return {
    url: brief?.url ?? '',
    at: brief?.at ?? null,
    stack: brief?.stack ?? null,
    findings: items.map((row) => toBriefFinding(row, includeTerminal ? modeOf(row.id) : 'rien')),
    catalog: methodeCatalog(),
    sources,
    includeTerminal,
  };
}

function ordered(ids: readonly string[]): ReportRow[] {
  const wanted = new Set(ids);
  const groups = groupFindings(rows);
  const warn = groups.next.filter((row) => asRow(row).catalogStatus === 'warn');
  return [...groups.priority, ...warn].map(asRow).filter((row) => wanted.has(row.id));
}

async function publish(text: string, count: number): Promise<void> {
  briefText = text;
  panelOpen = true;
  live = '';
  await tick();
  live = generatedLive(count);
}

async function generate(): Promise<void> {
  const ids = rows.filter((row) => checked[row.id]).map((row) => row.id);
  const items = ordered(ids);
  if (items.length === 0 || !brief) return;
  await publish(renderBrief(documentFrom(items, true)), items.length);
}

async function allFails(): Promise<void> {
  if (!brief) return;
  const items = ordered(failsOf(rows));
  if (items.length === 0) return;
  await publish(renderBrief(documentFrom(items, false)), items.length);
}

async function copyBrief(): Promise<void> {
  if (!briefText) return;
  try {
    await navigator.clipboard.writeText(briefText);
    toast = t('brief.copied');
  } catch {
    toast = t('brief.copyFail');
  }
}

function saveBrief(): void {
  if (!briefText || !brief) return;
  const at = brief.at ?? new Date();
  downloadTextFile(briefFilename(brief.url, at), briefFileBody(briefText));
}
```

Dans le snippet `rows`, avant `<div class="finding-row">`, si `brief` est passé :

```svelte
{#if brief && (asRow(finding).catalogStatus === 'fail' || asRow(finding).catalogStatus === 'warn')}
  <div class="brief-choice">
    <label>
      <input
        type="checkbox"
        checked={checked[finding.id] ?? false}
        onchange={(event) => {
          const target = event.currentTarget;
          if (target instanceof HTMLInputElement) checked[finding.id] = target.checked;
        }}
      />
      <span class="visually-hidden">{t('brief.include', { title: finding.title })}</span>
    </label>
    <div role="radiogroup" aria-label={t('brief.terminal.group', { title: finding.title })}>
      <label>
        <input type="radio" name={`terminal-${finding.id}`} value="rien" checked={modeOf(finding.id) === 'rien'} onchange={() => { terminal[finding.id] = 'rien'; }} />
        <span aria-hidden="true">{t('brief.terminal.rien')}</span>
        <span class="visually-hidden">{t('brief.terminal.rien.long')}</span>
      </label>
      <label>
        <input type="radio" name={`terminal-${finding.id}`} value="verif" checked={modeOf(finding.id) === 'verif'} onchange={() => { terminal[finding.id] = 'verif'; }} />
        <span aria-hidden="true">{t('brief.terminal.verif')}</span>
        <span class="visually-hidden">{t('brief.terminal.verif.long')}</span>
      </label>
      <label>
        <input type="radio" name={`terminal-${finding.id}`} value="fix" checked={modeOf(finding.id) === 'fix'} onchange={() => { terminal[finding.id] = 'fix'; }} />
        <span aria-hidden="true">{t('brief.terminal.fix')}</span>
        <span class="visually-hidden">{t('brief.terminal.fix.long')}</span>
      </label>
    </div>
  </div>
{:else if brief && (asRow(finding).catalogStatus === 'untested' || asRow(finding).catalogStatus === 'na')}
  <p class="hint">{t('brief.untested')}</p>
{/if}
```

Les trois `t()` sont des clés littérales. `MessageKey` refuse une clé construite.

Après `</div>` de `.groups`, ajouter :

```svelte
{#if brief && bar?.allClear}
  <p class="hint">{t('brief.none')}</p>
{/if}
{#if brief && bar?.visible}
  <div class="brief-bar">
    <p>{selectionLabel(countsBrief.selectedCount)}</p>
    <button
      type="button"
      class="button button-secondary"
      disabled={!bar.failsEnabled}
      onclick={allFails}
    >{t('brief.allFails')}</button>
    <button
      type="button"
      class={panelOpen && briefText ? 'button button-secondary' : 'button button-primary'}
      disabled={!bar.generateEnabled}
      onclick={generate}
    >{t('brief.generate')}</button>
    {#if bar.hint}
      <p class="hint">{t('brief.generate.hint')}</p>
    {/if}
  </div>
{/if}
{#if brief && panelOpen && briefText}
  <section class="brief-panel">
    <p role="status">{live}</p>
    <textarea class="brief-text" rows="14" readonly aria-label={t('brief.panel')} value={briefText}></textarea>
    <button type="button" class="button button-primary" onclick={copyBrief}>{t('brief.copy')}</button>
    <button type="button" class="button button-secondary" onclick={generate}>{t('brief.regenerate')}</button>
    <button type="button" class="link-action" onclick={saveBrief}>{t('brief.download')}</button>
    <button type="button" class="button button-secondary" onclick={() => { panelOpen = false; }}>{t('brief.collapse')}</button>
    {#if toast}
      <p class="hint" role="status">{toast}</p>
    {/if}
  </section>
{:else if brief && briefText}
  <button type="button" class="button button-secondary" onclick={() => { panelOpen = true; }}>{t('brief.show')}</button>
{/if}
```

Régénérer appelle `generate`, qui relit les cases. Il ne vide pas `checked` ni `terminal`.

- [ ] **Step 3: Styles**

Ajouter à la fin de `apps/web/src/styles/base.css`. Aucune couleur en dur : seulement les tokens déjà définis.

```css
.brief-bar,
.brief-panel,
.brief-choice {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  max-width: 100%;
}

.brief-panel {
  margin-top: var(--space-4);
}

.brief-text {
  width: 100%;
  overflow: auto;
  resize: vertical;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: var(--leading-body);
  color: var(--ink);
  background: var(--surface);
  border: var(--border) solid var(--line);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
}

.brief-choice input {
  min-width: var(--touch-min);
  min-height: var(--touch-min);
}

@media (max-width: 320px) {
  .brief-bar,
  .brief-panel,
  .brief-choice {
    flex-direction: column;
    align-items: stretch;
  }
}
```

- [ ] **Step 4: Vérifier le typage**

Run: `pnpm --filter @audigy/web exec astro check` si le script existe, sinon `pnpm exec tsc -p apps/web --noEmit` selon le script `typecheck` du `package.json` racine.

Expected: 0 erreur. Si `astro check` n’est pas le script du dépôt, lancer `pnpm typecheck` et ne corriger que les fichiers de cette tâche.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/FindingList.svelte apps/web/src/styles/base.css apps/web/src/data/demo.ts apps/web/src/pages/dev/composants.astro
git commit -m "feat: choisit les constats et affiche le brief"
```

---

### Task 8: Brancher le rapport, exclure le public

**Files:**
- Modify: `apps/web/src/components/ReportView.svelte`
- Create: `apps/web/src/lib/brief-scope.test.ts`
- Test: `apps/web/src/lib/brief-scope.test.ts`

**Interfaces:**
- Consumes: `reportRows`, `recognizedStack`, `fixesFor`, `hostingOf`, `FindingList`.
- Produces: le brief sur le rapport complet seulement. `PublicScore.svelte` n’est pas modifié.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('périmètre du brief', () => {
  it('n’entre pas dans le score public ni le partage', () => {
    const score = source('apps/web/src/components/PublicScore.svelte');
    expect(score).not.toContain('FindingList');
    expect(score).not.toContain('Générer le brief');
    expect(score).not.toContain('methode-load');
    const page = source('apps/web/src/pages/score/index.astro');
    expect(page).not.toContain('FindingList');
    const share = source('apps/web/src/pages/partage/index.astro');
    expect(share).not.toContain('FindingList');
  });

  it('ne lance pas le brief depuis une page de domaine', () => {
    const view = source('apps/web/src/components/ReportView.svelte');
    expect(view).toContain('mode === \'report\'');
    expect(view).toContain('reportRows');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/brief-scope.test.ts`

Expected: FAIL, `ReportView.svelte` ne contient pas encore `reportRows`.

- [ ] **Step 3: Write minimal implementation**

Dans `ReportView.svelte`, importer `reportRows` et `recognizedStack`. Remplacer l’usage unique de `FindingList` :

```svelte
{#if mode === 'report'}
  <FindingList
    findings={reportRows(payload, fixesFor(hostingOf(payload.audit.site.hosting)))}
    brief={{
      url: payload.audit.site.url,
      at: stamp,
      stack: recognizedStack(payload.findings),
    }}
  />
{:else}
  <FindingList findings={shown} />
{/if}
```

`shown` reste le chemin du domaine. Ne pas passer `brief` dans cette branche. Ne pas modifier `PublicScore.svelte`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/brief-scope.test.ts apps/web/src/lib/report-model.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ReportView.svelte apps/web/src/lib/brief-scope.test.ts
git commit -m "feat: limite le brief au rapport du propriétaire"
```

---

### Task 9: Parcours, accessibilité, retrait d’UX-18

**Files:**
- Create: `apps/web/e2e/brief.spec.ts`
- Modify: seulement si le prompt simple est présent — `apps/web/src/lib/report-export.ts`, `apps/web/src/i18n/fr.ts`, `apps/web/src/components/FindingList.svelte`, et le test qui appelle `correctionPrompt`.
- Test: `apps/web/e2e/brief.spec.ts` et `apps/web/src/lib/brief-scope.test.ts`

**Interfaces:**
- Consumes: l’écran `/dev/composants` et les clés de la tâche 2.
- Produces: aucun symbole `correctionPrompt`. UX-16, UX-17 et UX-19 restent.

- [ ] **Step 1: Write the failing test**

Étendre `brief-scope.test.ts` :

```ts
  it('ne livre plus le prompt simple par constat', () => {
    const list = source('apps/web/src/components/FindingList.svelte');
    const copy = source('apps/web/src/i18n/fr.ts');
    expect(list).not.toContain('Copier le prompt');
    expect(copy).not.toContain('prompt.copy');
    expect(list).not.toContain('correctionPrompt');
  });
```

`apps/web/e2e/brief.spec.ts`

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('le brief se génère au clavier, sans requête', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (request) => {
    urls.push(request.url());
  });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/dev/composants');
  await expect(page.getByText('Non testé — pas de brief')).toBeVisible();
  const fail = page.getByRole('checkbox', {
    name: 'Inclure Le site accepte encore une adresse non chiffrée',
  });
  await fail.focus();
  await page.keyboard.press('Space');
  await expect(fail).toBeChecked();
  const generate = page.getByRole('button', { name: 'Générer le brief' });
  await generate.click();
  const zone = page.getByRole('textbox', { name: 'Texte du brief' });
  await expect(zone).toBeVisible();
  await expect(zone).toHaveValue(/Test : securite\.https\./);
  await expect(zone).toHaveValue(/Réussi veut dire :/);
  await expect(zone).not.toHaveValue(/\nTerminal\n/);
  await expect(page.getByText('Brief généré, 1 constats')).toBeVisible();
  const failRow = page.locator('article', {
    has: page.getByRole('checkbox', {
      name: 'Inclure Le site accepte encore une adresse non chiffrée',
    }),
  });
  await failRow.getByRole('radio', { name: 'Vérifier, sans écrire' }).check();
  await page.getByRole('button', { name: 'Régénérer' }).click();
  await expect(zone).toHaveValue(/Terminal/);
  await expect(zone).toHaveValue(/N’écrivez rien/);
  await expect(zone).not.toHaveValue(/rm\s+-/);
  await expect(fail).toBeChecked();
  await page.getByRole('button', { name: 'Copier' }).click();
  await expect(page.getByText('Brief copié')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Terminal');
  expect(urls.some((url) => /openai|anthropic|cursor\.com\/api/u.test(url))).toBe(
    false,
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('la voie rapide ignore les cases et le terminal', async ({ page }) => {
  await page.goto('/dev/composants');
  const warn = page.getByRole('checkbox', {
    name: 'Inclure La page peut être affichée dans un cadre trompeur',
  });
  await warn.check();
  await page.getByRole('button', { name: 'Tous les échecs' }).click();
  const zone = page.getByRole('textbox', { name: 'Texte du brief' });
  await expect(zone).toHaveValue(/adresse non chiffrée/);
  await expect(zone).not.toHaveValue(/cadre trompeur/);
  await expect(zone).not.toHaveValue(/\nTerminal\n/);
  await expect(warn).toBeChecked();
});

test('réduire garde le texte et une case ne régénère pas', async ({ page }) => {
  await page.goto('/dev/composants');
  await page
    .getByRole('checkbox', {
      name: 'Inclure Le site accepte encore une adresse non chiffrée',
    })
    .check();
  await page.getByRole('button', { name: 'Générer le brief' }).click();
  const zone = page.getByRole('textbox', { name: 'Texte du brief' });
  const before = await zone.inputValue();
  await page.getByRole('button', { name: 'Réduire' }).click();
  await expect(zone).toHaveCount(0);
  await page.getByRole('button', { name: 'Afficher le brief' }).click();
  await expect(zone).toHaveValue(before);
  await page
    .getByRole('checkbox', {
      name: 'Inclure La description de la page est trop courte',
    })
    .check();
  await expect(zone).toHaveValue(before);
});

test('à 320 px le panneau ne déborde pas', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/dev/composants');
  await page
    .getByRole('checkbox', {
      name: 'Inclure Le site accepte encore une adresse non chiffrée',
    })
    .check();
  await page.getByRole('button', { name: 'Générer le brief' }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/lib/brief-scope.test.ts && pnpm --filter @audigy/web exec playwright test e2e/brief.spec.ts`

Expected: le test de périmètre PASS si la tâche 7 est faite. Playwright PASS sur les quatre tests. S’il échoue, corriger le composant, pas le texte attendu de la spec.

Si `brief-scope` échoue sur `prompt.copy`, le symbole est déjà sur la branche : passer au step 3 de retrait, puis relancer.

- [ ] **Step 3: Retirer le prompt simple s’il est là**

S’il est absent, ne rien créer. S’il est présent :

- Supprimer `correctionPrompt` et `PromptInput` de `apps/web/src/lib/report-export.ts`. Garder `renderMarkdown`, `presentFinding`, `exportHost`, `parisCivilDay`, `markdownFilename`, `saveTextFile`.
- Supprimer les clés `prompt.copy`, `prompt.copied`, `prompt.failed`, `prompt.label`, `prompt.limit.none`, `prompt.address`, `prompt.title`, `prompt.statement`, `prompt.limit`, `prompt.step`, `prompt.code`, `prompt.ask.owner`, `prompt.ask.score`, `prompt.ask.test`.
- Retirer le bouton et la zone « Copier le prompt » de `FindingList.svelte`. Garder le `<details>` de correction et ses étapes.
- Adapter le test unitaire qui importait `correctionPrompt` pour qu’il attende l’absence de cette fonction, sans recréer le prompt.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/lib/brief.test.ts apps/web/src/lib/brief-terminal.test.ts apps/web/src/lib/brief-file.test.ts apps/web/src/lib/brief-bar.test.ts apps/web/src/lib/brief-scope.test.ts apps/web/src/lib/methode-catalog.test.ts apps/web/src/lib/report-model.test.ts apps/web/src/i18n/brief-copy.test.ts && pnpm copy-lint && pnpm --filter @audigy/web exec playwright test e2e/brief.spec.ts e2e/ux-vague1.spec.ts e2e/imprimer.spec.ts`

Expected: PASS. `copy-lint` code 0. Les parcours preuve et impression déjà verts le restent. Aucune requête vers une IA dans `brief.spec.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/brief.spec.ts apps/web/src/lib/brief-scope.test.ts
git commit -m "test: parcours du brief et retrait du prompt simple"
```

Ajouter au commit les fichiers du step 3 seulement s’ils ont changé.

---

## Self-review (rédacteur du plan)

- Spec §1 à §8 : tâches 3 à 8. Terminal : tâche 4. Fichier : tâche 5. Public : tâche 8. Cas tous réussis, non testé, zéro case, voie rapide, mobile, clavier, live : tâches 5, 7 et 9.
- Hors scope tenu : pas de moteur, pas de Netlify, pas d’e-mail, pas de modale, pas d’exécution, UX-16/17/19 non réécrites.
- Références : Observatory, CrUX, Lighthouse, PageSpeed Insights, RFC 7208 et 7505, EcoIndex, CO2.js / Sustainable Web Design, Green Web, RGESN, html-validate, OSV, NVD, Tracker Radar. Aucun OWASP. NIST seulement via l’URL NVD déjà dans la méthode.
- Pas de `TBD`, pas de test sans code, pas de type renommé d’une tâche à l’autre.
