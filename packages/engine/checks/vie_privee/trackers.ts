import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Noms de domaine de DuckDuckGo Tracker Radar.
 * Licence CC BY-NC-SA 4.0, vérifiée le 24 octobre 2026.
 * Voir `data/trackers/NOTICE.md`.
 */
export const TRACKER_LIST = {
  source: 'https://github.com/duckduckgo/tracker-radar',
  commit: 'a54ee0ccc2a90192123341f4842d2884d1832dc3',
  license: 'CC BY-NC-SA 4.0',
  verifiedOn: '2026-10-24',
  originFile: 'build-data/generated/domain_summary.json',
  sha256: 'e71a638296809d3d2a5c5a93b48521eeb3cab5cbeb83c554b1026142198e69e3',
} as const;

const FILE = fileURLToPath(
  new URL('../../data/trackers/domains.txt', import.meta.url),
);

function loadDomains(): ReadonlySet<string> {
  const text = readFileSync(FILE, 'utf8');
  const domains = new Set<string>();
  for (const line of text.split('\n')) {
    const name = line.trim();
    if (name !== '') domains.add(name);
  }
  return domains;
}

export const TRACKER_DOMAINS: ReadonlySet<string> = loadDomains();

/** Domaine de la liste qui couvre cet hôte, sinon `null`. */
export function trackerDomain(host: string): string | null {
  let name = host.trim().toLowerCase();
  if (name.endsWith('.')) name = name.slice(0, -1);
  if (name.startsWith('.')) name = name.slice(1);
  while (name.includes('.')) {
    if (TRACKER_DOMAINS.has(name)) return name;
    const dot = name.indexOf('.');
    name = name.slice(dot + 1);
  }
  return null;
}

/** Le nom, ou un parent, est dans la liste. Le suffixe seul (`com`) ne compte pas. */
export function matchesTracker(host: string): boolean {
  return trackerDomain(host) !== null;
}
