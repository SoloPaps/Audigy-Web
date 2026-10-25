import { type FixSheet, parseFix, variantFor } from '@audigy/engine/fixes';
import { stepsFromVariant } from './fix-steps.js';
import type { FixView } from './report-model.js';

type Hosting = 'netlify' | 'github_pages' | 'other';

const files = import.meta.glob('../../../../packages/engine/fixes/fr/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

let sheets: Map<string, FixSheet> | null = null;
const viewCache = new Map<Hosting, Map<string, FixView>>();

function allSheets(): Map<string, FixSheet> {
  if (sheets) return sheets;
  const next = new Map<string, FixSheet>();
  for (const [file, text] of Object.entries(files)) {
    const name = file.split('/').pop()?.replace(/\.md$/u, '');
    if (!name || typeof text !== 'string') continue;
    next.set(name, parseFix(name, text));
  }
  sheets = next;
  return next;
}

export function hostingOf(value: string): Hosting {
  if (value === 'netlify' || value === 'github_pages') return value;
  return 'other';
}

/** Nom d’hébergeur pour le brief ; `null` quand l’audit ne l’a pas reconnu. */
export function hostingLabel(value: string): string | null {
  if (value === 'netlify') return 'Netlify';
  if (value === 'github_pages') return 'GitHub Pages';
  return null;
}

export function fixesFor(hosting: Hosting): Map<string, FixView> {
  const cached = viewCache.get(hosting);
  if (cached) return cached;
  const views = new Map<string, FixView>();
  for (const [id, sheet] of allSheets()) {
    const parsed = stepsFromVariant(variantFor(sheet, hosting));
    const source = sheet.sources[0];
    const view: FixView = {
      title: sheet.title,
      why: sheet.why,
      effortMinutes: sheet.effortMinutes,
      steps: parsed.steps,
    };
    if (parsed.code) view.code = parsed.code;
    if (source) {
      view.sourceLabel = source.label;
      view.sourceHref = source.url;
    }
    views.set(id, view);
  }
  viewCache.set(hosting, views);
  return views;
}
