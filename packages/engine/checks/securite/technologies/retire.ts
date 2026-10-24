import { createHash } from 'node:crypto';
import data from '../../../data/retire/signatures.json' with { type: 'json' };

/** Ordre de confiance : le contenu l’emporte sur l’adresse. */
export const EVIDENCE_RANK = {
  uri: 1,
  filename: 2,
  filecontentreplace: 3,
  filecontent: 4,
  hash: 5,
} as const;
export type Evidence = keyof typeof EVIDENCE_RANK;

export interface RetireHit {
  library: string;
  version: string;
  evidence: Evidence;
}

export interface SignatureSource {
  source: string;
  commit: string;
  license: string;
  copyright: string;
}

interface RawLibrary {
  uri?: string[];
  filename?: string[];
  filecontent?: string[];
  filecontentreplace?: string[];
  hashes?: Record<string, string>;
}

interface Replacement {
  re: RegExp;
  template: string;
}

interface Compiled {
  library: string;
  uri: RegExp[];
  filename: RegExp[];
  filecontent: RegExp[];
  filecontentreplace: Replacement[];
}

/** Même motif que retire.js (`replaceVersion`). */
const VERSION_PATTERN = '[0-9][0-9.a-z_\\-]+';
const MAX_MATCHES = 5;
/** Au-delà, seul le début du script est lu par les motifs. */
export const CONTENT_SCAN_MAX = 3 * 1024 * 1024;

const raw = data as {
  source: string;
  commit: string;
  license: string;
  copyright: string;
  libraries: Record<string, RawLibrary>;
};

export const SIGNATURES: SignatureSource = {
  source: raw.source,
  commit: raw.commit,
  license: raw.license,
  copyright: raw.copyright,
};

export const RETIRE_LIBRARIES: readonly string[] = Object.keys(
  raw.libraries,
).sort();

let compiled: Compiled[] | null = null;
let hashes: Map<string, { library: string; version: string }> | null = null;

function regex(source: string, anchored = false): RegExp {
  const body = source.replaceAll('§§version§§', VERSION_PATTERN);
  return new RegExp(anchored ? `^${body}$` : body, 'g');
}

function replacement(source: string): Replacement | null {
  const parts = /^\/(.*[^\\])\/([^/]+)\/$/.exec(source);
  if (!parts) return null;
  return { re: regex(parts[1] as string), template: parts[2] as string };
}

function load(): Compiled[] {
  if (compiled) return compiled;
  const list: Compiled[] = [];
  const byHash = new Map<string, { library: string; version: string }>();
  for (const library of RETIRE_LIBRARIES) {
    const entry = raw.libraries[library] as RawLibrary;
    list.push({
      library,
      uri: (entry.uri ?? []).map((item) => regex(item)),
      filename: (entry.filename ?? []).map((item) => regex(item, true)),
      filecontent: (entry.filecontent ?? []).map((item) => regex(item)),
      filecontentreplace: (entry.filecontentreplace ?? [])
        .map(replacement)
        .filter((item): item is Replacement => item !== null),
    });
    for (const [hash, version] of Object.entries(entry.hashes ?? {})) {
      if (!byHash.has(hash)) byHash.set(hash, { library, version });
    }
  }
  compiled = list;
  hashes = byHash;
  return list;
}

function clean(version: string): string {
  return version.replace(/(\.|-)min$/, '');
}

function matches(re: RegExp, text: string): string[] {
  const found: string[] = [];
  re.lastIndex = 0;
  let match = re.exec(text);
  while (match && found.length < MAX_MATCHES) {
    if (match[1]) found.push(clean(match[1]));
    if (match[0] === '') re.lastIndex += 1;
    match = re.exec(text);
  }
  re.lastIndex = 0;
  return found;
}

function replaced(item: Replacement, text: string): string[] {
  const found: string[] = [];
  item.re.lastIndex = 0;
  const single = new RegExp(item.re.source);
  let match = item.re.exec(text);
  while (match && found.length < MAX_MATCHES) {
    const version = match[0].replace(single, item.template);
    if (version !== '' && version !== match[0]) found.push(clean(version));
    if (match[0] === '') item.re.lastIndex += 1;
    match = item.re.exec(text);
  }
  item.re.lastIndex = 0;
  return found;
}

function unique(hits: RetireHit[]): RetireHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = `${hit.library} ${hit.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Adresse complète, puis dernier segment du chemin (sans requête), comme retire.js. */
export function scanUrl(url: URL): RetireHit[] {
  const hits: RetireHit[] = [];
  const href = url.href;
  const segments = url.pathname.split('/');
  let file = segments[segments.length - 1] ?? '';
  try {
    file = decodeURIComponent(file);
  } catch {
    // segment mal encodé : lu tel quel
  }
  for (const item of load()) {
    for (const re of item.uri) {
      for (const version of matches(re, href))
        hits.push({ library: item.library, version, evidence: 'uri' });
    }
    if (file === '') continue;
    for (const re of item.filename) {
      for (const version of matches(re, file))
        hits.push({ library: item.library, version, evidence: 'filename' });
    }
  }
  return unique(hits);
}

/** Contenu : motifs, puis remplacements, puis empreinte SHA-1 (ordre de retire.js). */
export function scanContent(content: string): RetireHit[] {
  const text = content.replace(/\r\n|\r/g, '\n');
  const window =
    text.length > CONTENT_SCAN_MAX ? text.slice(0, CONTENT_SCAN_MAX) : text;
  const list = load();
  const direct: RetireHit[] = [];
  for (const item of list) {
    for (const re of item.filecontent) {
      for (const version of matches(re, window))
        direct.push({
          library: item.library,
          version,
          evidence: 'filecontent',
        });
    }
  }
  if (direct.length > 0) return unique(direct);
  const swapped: RetireHit[] = [];
  for (const item of list) {
    for (const rule of item.filecontentreplace) {
      for (const version of replaced(rule, window))
        swapped.push({
          library: item.library,
          version,
          evidence: 'filecontentreplace',
        });
    }
  }
  if (swapped.length > 0) return unique(swapped);
  const digest = createHash('sha1').update(text, 'utf8').digest('hex');
  const known = hashes?.get(digest);
  return known ? [{ ...known, evidence: 'hash' }] : [];
}

/** Par bibliothèque, garde seulement les versions du meilleur niveau de preuve. */
export function strongest(hits: readonly RetireHit[]): RetireHit[] {
  const best = new Map<string, number>();
  for (const hit of hits) {
    const rank = EVIDENCE_RANK[hit.evidence];
    if (rank > (best.get(hit.library) ?? 0)) best.set(hit.library, rank);
  }
  return unique(
    hits.filter((hit) => EVIDENCE_RANK[hit.evidence] === best.get(hit.library)),
  );
}
