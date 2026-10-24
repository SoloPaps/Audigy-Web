import type { ExternalApi } from '@audigy/net';
import type { CheckContext } from '../../../src/types.js';
import {
  cacheKey,
  type DayCache,
  readCache,
  utcDay,
} from '../../performance/cache.js';
import type { Inventory } from './inventory.js';
import { NPM_VERSION_RE, OSV_NPM } from './libraries.js';
import type { CveSource } from './software.js';
import {
  fetchKev,
  type KevBundle,
  type Lookup,
  queryNvd,
  queryOsv,
  type Severity,
  type Vuln,
} from './sources.js';

export const KEV_KEY = 'securite.technologies.kev';
/** Bibliothèques interrogées au plus dans OSV, par audit. */
export const OSV_LOOKUP_LIMIT = 10;
/** NVD sans clé : 5 requêtes par 30 s. Quatre logiciels au plus par audit. */
export const NVD_LOOKUP_LIMIT = 4;
const OSV_CONCURRENCY = 4;

export interface Candidate {
  label: string;
  version: string;
  source: CveSource;
  /** Paquet de distribution (en-tête `Server`, suffixe de version). */
  distro: boolean;
}

export interface Checked extends Candidate {
  lookup: Lookup;
}

export interface Selection {
  candidates: Candidate[];
  /** Repérés sans version complète ni base fiable : jamais d’alerte. */
  unknown: string[];
  /** Au-delà des plafonds de requêtes. */
  skipped: number;
}

/** Bibliothèques lues dans un script, avec un paquet npm et une version complète. */
export function scriptCandidates(
  inventory: Inventory & { ok: true },
): Selection {
  const candidates: Candidate[] = [];
  const unknown = new Set<string>();
  const seen = new Set<string>();
  let skipped = 0;
  for (const item of inventory.libraries) {
    if (!item.verified) continue;
    const name = OSV_NPM[item.library] ?? null;
    if (name === null || !NPM_VERSION_RE.test(item.version)) {
      unknown.add(`${item.label} ${item.version}`);
      continue;
    }
    const key = `${name}@${item.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (candidates.length >= OSV_LOOKUP_LIMIT) {
      skipped += 1;
      continue;
    }
    candidates.push({
      label: item.label,
      version: item.version,
      source: { kind: 'osv', ecosystem: 'npm', name },
      distro: false,
    });
  }
  return { candidates, unknown: [...unknown], skipped };
}

/** Logiciels annoncés avec une version complète et une base de failles connue. */
export function softwareCandidates(
  inventory: Inventory & { ok: true },
): Selection {
  const candidates: Candidate[] = [];
  const unknown = new Set<string>();
  const seen = new Set<string>();
  let skipped = 0;
  let nvd = 0;
  for (const item of inventory.software) {
    if (item.role === 'host' || item.role === 'tool') continue;
    if (!item.cve || !item.precise || item.version === null) {
      unknown.add(
        item.announced ? `${item.label} ${item.announced}` : item.label,
      );
      continue;
    }
    const key = `${sourceKey(item.cve)}@${item.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (item.cve.kind === 'nvd') {
      if (nvd >= NVD_LOOKUP_LIMIT) {
        skipped += 1;
        continue;
      }
      nvd += 1;
    }
    candidates.push({
      label: item.label,
      version: item.version,
      source: item.cve,
      distro: item.distro,
    });
  }
  return { candidates, unknown: [...unknown], skipped };
}

function sourceKey(source: CveSource): string {
  return source.kind === 'nvd'
    ? `nvd:${source.cpe}`
    : `osv:${source.ecosystem}/${source.name}`;
}

export interface LookupOptions {
  api: ExternalApi;
  cache: DayCache;
  nvdApiKey?: string | undefined;
}

/** Chaque réponse réussie est réutilisée le même jour UTC (24 h au plus). */
export async function lookupAll(
  ctx: CheckContext,
  candidates: readonly Candidate[],
  options: LookupOptions,
): Promise<Checked[]> {
  const out: Checked[] = new Array(candidates.length);
  let next = 0;
  const lanes = Array.from(
    { length: Math.min(OSV_CONCURRENCY, candidates.length) },
    async () => {
      while (next < candidates.length) {
        const index = next;
        next += 1;
        const item = candidates[index] as Candidate;
        out[index] = { ...item, lookup: await lookupOne(ctx, item, options) };
      }
    },
  );
  await Promise.all(lanes);
  return out;
}

async function lookupOne(
  ctx: CheckContext,
  item: Candidate,
  options: LookupOptions,
): Promise<Lookup> {
  const day = utcDay(ctx.now());
  const key = cacheKey(
    item.source.kind,
    `${sourceKey(item.source)}@${item.version}`,
    day,
  );
  const hit = readCache(options.cache, key);
  if (isLookupOk(hit)) return hit;
  const source = item.source;
  const result =
    source.kind === 'osv'
      ? await queryOsv(options.api, source, item.version, ctx.signal)
      : await queryNvd(
          options.api,
          source.cpe,
          item.version,
          options.nvdApiKey,
          ctx.signal,
        );
  if (result.ok) options.cache.set(key, JSON.stringify(result));
  return result;
}

/** Catalogue KEV, une fois par audit et par jour UTC. */
export function loadKev(
  ctx: CheckContext,
  options: LookupOptions,
): Promise<KevBundle> {
  return ctx.shared.get(KEV_KEY, async () => {
    const key = cacheKey('kev', 'catalogue', utcDay(ctx.now()));
    const hit = readCache(options.cache, key);
    if (isKevOk(hit)) return hit;
    const bundle = await fetchKev(options.api, ctx.signal);
    if (bundle.ok) options.cache.set(key, JSON.stringify(bundle));
    return bundle;
  });
}

const SEVERITIES: readonly Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'unknown',
];

function isVuln(value: unknown): value is Vuln {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    Array.isArray(v.cves) &&
    v.cves.every((item) => typeof item === 'string') &&
    SEVERITIES.includes(v.severity as Severity)
  );
}

function isLookupOk(value: unknown): value is Lookup & { ok: true } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.ok === true &&
    typeof v.truncated === 'boolean' &&
    Array.isArray(v.vulns) &&
    v.vulns.every(isVuln)
  );
}

function isKevOk(value: unknown): value is KevBundle & { ok: true } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.ok === true &&
    typeof v.catalogVersion === 'string' &&
    typeof v.entries === 'object' &&
    v.entries !== null
  );
}
