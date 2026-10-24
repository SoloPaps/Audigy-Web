import { isNetError, type SafeResponse } from '@audigy/net';
import type { CheckContext } from '../../../src/types.js';
import { isHtml, loadHome } from '../shared.js';
import { extractScripts } from './html.js';
import { libraryLabel } from './libraries.js';
import {
  EVIDENCE_RANK,
  type Evidence,
  type RetireHit,
  scanContent,
  scanUrl,
  strongest,
} from './retire.js';
import {
  type SoftwareHit,
  softwareFromAspNet,
  softwareFromGenerator,
  softwareFromHeader,
} from './software.js';

export const INVENTORY_KEY = 'securite.technologies';
/** Scripts externes lus au plus, dans l’ordre de la page. */
export const SCRIPT_LIMIT = 10;
const SCRIPT_CONCURRENCY = 3;

export interface LibraryFinding {
  library: string;
  label: string;
  version: string;
  evidence: Evidence;
  /** Le script a été lu (réponse 2xx, pas une page HTML). */
  verified: boolean;
  where: 'inline' | 'external';
}

export interface ScriptCounts {
  /** Scripts externes listés par la page. */
  found: number;
  read: number;
  /** Erreur réseau, délai ou budget atteint. */
  unread: number;
  /** Réponse hors 2xx ou page HTML : le script n’est pas chargé. */
  missing: number;
  /** Au-delà de la limite. */
  skipped: number;
  inline: number;
  budgetStopped: boolean;
}

export type Inventory =
  | {
      ok: true;
      finalUrl: string;
      software: SoftwareHit[];
      libraries: LibraryFinding[];
      scripts: ScriptCounts;
      /** Versions annoncées dans les en-têtes, ex. « Apache 2.4.41 ». */
      disclosed: string[];
    }
  | { ok: false; status?: number };

export function loadInventory(ctx: CheckContext): Promise<Inventory> {
  return ctx.shared.get(INVENTORY_KEY, () => buildInventory(ctx));
}

async function buildInventory(ctx: CheckContext): Promise<Inventory> {
  let home: SafeResponse;
  try {
    home = await loadHome(ctx);
  } catch {
    return { ok: false };
  }
  if (home.status < 200 || home.status >= 400)
    return { ok: false, status: home.status };
  const software = headerSoftware(home.headers);
  const scripts: ScriptCounts = {
    found: 0,
    read: 0,
    unread: 0,
    missing: 0,
    skipped: 0,
    inline: 0,
    budgetStopped: false,
  };
  const libraries: LibraryFinding[] = [];
  if (isHtml(home.headers) && home.status < 300) {
    const page = extractScripts(home.text(), new URL(home.url));
    for (const value of page.generators) {
      const found = softwareFromGenerator(value, 'generator');
      if (found) software.push(found);
    }
    scripts.found = page.sources.length;
    scripts.inline = page.inline.length;
    const queue = page.sources.slice(0, SCRIPT_LIMIT);
    scripts.skipped = page.sources.length - queue.length;
    for (const body of page.inline) {
      for (const hit of strongest(scanContent(body)))
        libraries.push(finding(hit, true, 'inline'));
    }
    await pool(queue, SCRIPT_CONCURRENCY, async (url) => {
      const outcome = await readScript(ctx, url);
      if (outcome.kind === 'missing') {
        scripts.missing += 1;
        return;
      }
      if (outcome.kind === 'unread') {
        scripts.unread += 1;
        if (outcome.budget) scripts.budgetStopped = true;
      } else scripts.read += 1;
      for (const hit of outcome.hits)
        libraries.push(finding(hit, outcome.kind === 'read', 'external'));
    });
  }
  return {
    ok: true,
    finalUrl: home.url,
    software: uniqueSoftware(software),
    libraries: uniqueLibraries(libraries),
    scripts,
    disclosed: disclosedVersions(software),
  };
}

function headerSoftware(headers: Headers): SoftwareHit[] {
  const found: SoftwareHit[] = [];
  const server = headers.get('server');
  if (server) found.push(...softwareFromHeader(server, 'server'));
  const powered = headers.get('x-powered-by');
  if (powered) found.push(...softwareFromHeader(powered, 'x-powered-by'));
  for (const name of ['x-aspnet-version', 'x-aspnetmvc-version'] as const) {
    const value = headers.get(name);
    if (value?.trim()) found.push(softwareFromAspNet(value, name));
  }
  const generator = headers.get('x-generator');
  if (generator) {
    const hit = softwareFromGenerator(generator, 'x-generator');
    if (hit) found.push(hit);
  }
  return found;
}

type ScriptOutcome =
  | { kind: 'read'; hits: RetireHit[] }
  | { kind: 'unread'; hits: RetireHit[]; budget: boolean }
  | { kind: 'missing' };

async function readScript(ctx: CheckContext, url: URL): Promise<ScriptOutcome> {
  const fromUrl = scanUrl(url);
  let res: SafeResponse;
  try {
    res = await ctx.net.fetch(url, { accept: '*/*', signal: ctx.signal });
  } catch (error) {
    return {
      kind: 'unread',
      hits: strongest(fromUrl),
      budget: isNetError(error, 'BUDGET_EXCEEDED'),
    };
  }
  if (res.status < 200 || res.status >= 300 || looksHtml(res))
    return { kind: 'missing' };
  const finalUrl = new URL(res.url);
  const hits = [
    ...fromUrl,
    ...(finalUrl.href === url.href ? [] : scanUrl(finalUrl)),
    ...scanContent(res.text()),
  ];
  return { kind: 'read', hits: strongest(hits) };
}

function looksHtml(res: SafeResponse): boolean {
  if (isHtml(res.headers)) return true;
  const head = new TextDecoder()
    .decode(res.body.subarray(0, 256))
    .trimStart()
    .toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
}

function finding(
  hit: RetireHit,
  verified: boolean,
  where: LibraryFinding['where'],
): LibraryFinding {
  return {
    library: hit.library,
    label: libraryLabel(hit.library),
    version: hit.version,
    evidence: hit.evidence,
    verified,
    where,
  };
}

function uniqueLibraries(list: LibraryFinding[]): LibraryFinding[] {
  const best = new Map<string, LibraryFinding>();
  for (const item of list) {
    const key = `${item.library} ${item.version}`;
    const current = best.get(key);
    if (
      !current ||
      (item.verified && !current.verified) ||
      (item.verified === current.verified &&
        EVIDENCE_RANK[item.evidence] > EVIDENCE_RANK[current.evidence])
    )
      best.set(key, item);
  }
  return [...best.values()].sort((a, b) =>
    a.library === b.library
      ? compare(a.version, b.version)
      : compare(a.library, b.library),
  );
}

function uniqueSoftware(list: SoftwareHit[]): SoftwareHit[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = `${item.id} ${item.announced ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function disclosedVersions(list: SoftwareHit[]): string[] {
  const out = new Set<string>();
  for (const item of list) {
    if (item.origin === 'generator' || item.announced === null) continue;
    if (!/\d/.test(item.announced)) continue;
    out.add(`${item.label} ${item.announced}`);
  }
  return [...out];
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

async function pool<T>(
  items: readonly T[],
  size: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from(
    { length: Math.min(size, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next] as T;
        next += 1;
        await work(item);
      }
    },
  );
  await Promise.all(lanes);
}
