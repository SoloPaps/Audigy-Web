import type { Hosting } from './types.js';

export const FIX_VARIANTS = ['netlify', 'github_pages', 'generic'] as const;
export type FixVariant = (typeof FIX_VARIANTS)[number];

export const FIX_ID_RE = /^[a-z_]+\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$/;

export interface FixSource {
  label: string;
  url: string;
}

/** Fiche de correction `fixes/fr/<check-id>.md` (PLAN §5.3). */
export interface FixSheet {
  id: string;
  title: string;
  why: string;
  effortMinutes: number;
  sources: FixSource[];
  variants: Record<FixVariant, string>;
}

/** Accès aux fiches, injecté : le moteur ne lit pas le disque lui-même. */
export interface FixStore {
  list(): Promise<string[]>;
  read(id: string): Promise<string>;
}

export class FixParseError extends Error {
  override readonly name = 'FixParseError';
}

function fail(id: string, message: string): never {
  throw new FixParseError(`Fiche ${id} : ${message}`);
}

/**
 * Format :
 * ```
 * ---
 * title: …
 * why: … (une phrase)
 * effortMinutes: 5
 * sources:
 *   - MDN | https://developer.mozilla.org/…
 * ---
 * ## netlify
 * …
 * ## github_pages
 * …
 * ## generic
 * …
 * ```
 */
export function parseFix(id: string, text: string): FixSheet {
  if (!FIX_ID_RE.test(id)) fail(id, 'identifiant invalide');
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0] !== '---') fail(id, 'en-tête absent');
  const end = lines.indexOf('---', 1);
  if (end === -1) fail(id, 'en-tête non fermé');

  const fields = new Map<string, string>();
  const sources: FixSource[] = [];
  let inSources = false;
  for (const line of lines.slice(1, end)) {
    if (line.trim() === '') continue;
    const item = /^\s+-\s+(.+?)\s*\|\s*(\S+)\s*$/.exec(line);
    if (inSources && item) {
      const url = item[2] as string;
      if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(url))
        fail(id, `source non https : ${url}`);
      sources.push({ label: item[1] as string, url });
      continue;
    }
    const field = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (!field) fail(id, `ligne d'en-tête invalide : ${line}`);
    const [, key, value] = field as unknown as [string, string, string];
    if (fields.has(key) || (key === 'sources' && inSources))
      fail(id, `champ en double : ${key}`);
    inSources = key === 'sources';
    if (inSources) {
      if (value !== '') fail(id, 'sources doit être une liste');
      fields.set(key, '');
    } else fields.set(key, value.trim());
  }

  for (const key of fields.keys())
    if (!['title', 'why', 'effortMinutes', 'sources'].includes(key))
      fail(id, `champ inconnu : ${key}`);
  const title = fields.get('title');
  const why = fields.get('why');
  if (!title) fail(id, 'title manquant');
  if (!why) fail(id, 'why manquant');
  const effortMinutes = Number(fields.get('effortMinutes'));
  if (!Number.isInteger(effortMinutes) || effortMinutes < 1)
    fail(id, 'effortMinutes doit être un entier ≥ 1');
  if (sources.length === 0) fail(id, 'au moins une source requise');

  const variants: Partial<Record<FixVariant, string>> = {};
  let current: FixVariant | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (current === null) {
      if (buffer.join('').trim() !== '')
        fail(id, 'texte avant la première variante');
    } else {
      const body = buffer.join('\n').trim();
      if (body === '') fail(id, `variante ${current} vide`);
      variants[current] = body;
    }
    buffer = [];
  };
  for (const line of lines.slice(end + 1)) {
    const heading = /^## (\S+)\s*$/.exec(line);
    if (heading) {
      flush();
      const name = heading[1] as FixVariant;
      if (!FIX_VARIANTS.includes(name)) fail(id, `variante inconnue : ${name}`);
      if (variants[name] !== undefined)
        fail(id, `variante en double : ${name}`);
      current = name;
    } else buffer.push(line);
  }
  flush();
  for (const variant of FIX_VARIANTS)
    if (variants[variant] === undefined)
      fail(id, `variante manquante : ${variant}`);

  return {
    id,
    title,
    why,
    effortMinutes,
    sources,
    variants: variants as Record<FixVariant, string>,
  };
}

export function variantFor(sheet: FixSheet, hosting: Hosting): string {
  return sheet.variants[hosting === 'other' ? 'generic' : hosting];
}

/** Charge et valide toutes les fiches ; lève à la première fiche invalide. */
export async function loadFixes(
  store: FixStore,
): Promise<Map<string, FixSheet>> {
  const ids = [...(await store.list())].sort();
  const sheets = new Map<string, FixSheet>();
  for (const id of ids) sheets.set(id, parseFix(id, await store.read(id)));
  return sheets;
}
