import {
  type ExternalApi,
  type ExternalResponse,
  KEV_HOST,
  NVD_HOST,
  OSV_HOST,
} from '@audigy/net';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export interface Vuln {
  id: string;
  cves: string[];
  severity: Severity;
}

export type Lookup =
  | { ok: true; vulns: Vuln[]; truncated: boolean }
  | { ok: false; reason: 'quota' | 'error'; status?: number };

export interface KevEntry {
  dateAdded: string;
  ransomware: boolean;
}

export type KevBundle =
  | { ok: true; catalogVersion: string; entries: Record<string, KevEntry> }
  | { ok: false; reason: 'quota' | 'error'; status?: number };

export const OSV_QUERY_URL = `https://${OSV_HOST}/v1/query`;
export const NVD_CVES_URL = `https://${NVD_HOST}/rest/json/cves/2.0`;
export const KEV_URL = `https://${KEV_HOST}/sites/default/files/feeds/known_exploited_vulnerabilities.json`;

export const OSV_ATTEMPT_TIMEOUT_MS = 15_000;
export const NVD_ATTEMPT_TIMEOUT_MS = 20_000;
export const KEV_ATTEMPT_TIMEOUT_MS = 30_000;
const OSV_MAX_PAGES = 3;
const NVD_PAGE_SIZE = 2000;
const NVD_MAX_PAGES = 2;
const RETRYABLE = new Set([408, 500, 502, 503, 504]);
const CVE_RE = /^CVE-\d{4}-\d{4,}$/;

type Attempt =
  | { kind: 'ok'; text: string }
  | { kind: 'quota'; status: number }
  | { kind: 'fail'; status?: number };

/** Un réessai sur erreur réseau, 408, 429 ou 5xx. Un second 429 est un quota. */
async function attempt(
  api: ExternalApi,
  request: Parameters<ExternalApi['request']>[0],
  quota: ReadonlySet<number>,
): Promise<Attempt> {
  let last: Attempt = { kind: 'fail' };
  for (let round = 0; round < 2; round += 1) {
    if (request.signal?.aborted) return { kind: 'fail' };
    let res: ExternalResponse;
    try {
      res = await api.request(request);
    } catch {
      last = { kind: 'fail' };
      continue;
    }
    if (res.status === 200) return { kind: 'ok', text: res.text };
    if (quota.has(res.status)) {
      last = { kind: 'quota', status: res.status };
      if (res.status === 429 && round === 0) continue;
      return last;
    }
    last = { kind: 'fail', status: res.status };
    if (!RETRYABLE.has(res.status)) return last;
  }
  return last;
}

function failure(step: Attempt): Lookup & { ok: false } {
  if (step.kind === 'quota')
    return { ok: false, reason: 'quota', status: step.status };
  return step.kind === 'fail' && step.status !== undefined
    ? { ok: false, reason: 'error', status: step.status }
    : { ok: false, reason: 'error' };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function severityOf(label: unknown): Severity {
  if (typeof label !== 'string') return 'unknown';
  switch (label.trim().toUpperCase()) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'high';
    case 'MODERATE':
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
    case 'NONE':
      return 'low';
    default:
      return 'unknown';
  }
}

/** Un élément OSV. Retiré (`withdrawn`) ou sans identifiant : ignoré. */
export function parseOsvVuln(value: unknown): Vuln | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== 'string' || record.id === '') return null;
  if (typeof record.withdrawn === 'string' && record.withdrawn !== '')
    return null;
  const cves = new Set<string>();
  if (CVE_RE.test(record.id)) cves.add(record.id);
  for (const alias of asArray(record.aliases)) {
    if (typeof alias === 'string' && CVE_RE.test(alias)) cves.add(alias);
  }
  return {
    id: record.id.slice(0, 64),
    cves: [...cves].sort(),
    severity: severityOf(asRecord(record.database_specific)?.severity),
  };
}

export function parseOsvPage(
  text: string,
): { vulns: Vuln[]; next: string | null } | null {
  const root = asRecord(parseJson(text));
  if (!root) return null;
  if (root.vulns !== undefined && !Array.isArray(root.vulns)) return null;
  const vulns = asArray(root.vulns)
    .map(parseOsvVuln)
    .filter((item): item is Vuln => item !== null);
  const next =
    typeof root.next_page_token === 'string' && root.next_page_token !== ''
      ? root.next_page_token
      : null;
  return { vulns, next };
}

/** POST /v1/query : OSV compare lui-même la version aux plages touchées. */
export async function queryOsv(
  api: ExternalApi,
  pkg: { ecosystem: string; name: string },
  version: string,
  signal: AbortSignal,
): Promise<Lookup> {
  const vulns: Vuln[] = [];
  let token: string | null = null;
  for (let page = 0; page < OSV_MAX_PAGES; page += 1) {
    const body: Record<string, unknown> = {
      package: { name: pkg.name, ecosystem: pkg.ecosystem },
      version,
    };
    if (token) body.page_token = token;
    const step = await attempt(
      api,
      {
        method: 'POST',
        url: new URL(OSV_QUERY_URL),
        body: JSON.stringify(body),
        timeoutMs: OSV_ATTEMPT_TIMEOUT_MS,
        signal,
      },
      new Set([429]),
    );
    if (step.kind !== 'ok') return failure(step);
    const parsed = parseOsvPage(step.text);
    if (!parsed) return { ok: false, reason: 'error' };
    vulns.push(...parsed.vulns);
    token = parsed.next;
    if (!token) return { ok: true, vulns, truncated: false };
  }
  return { ok: true, vulns, truncated: true };
}

const NVD_METRICS = [
  'cvssMetricV40',
  'cvssMetricV31',
  'cvssMetricV30',
  'cvssMetricV2',
] as const;

function nvdSeverity(metrics: Record<string, unknown> | null): Severity {
  if (!metrics) return 'unknown';
  for (const key of NVD_METRICS) {
    const list = asArray(metrics[key])
      .map(asRecord)
      .filter((item) => item !== null);
    if (list.length === 0) continue;
    const chosen = list.find((item) => item.type === 'Primary') ?? list[0];
    const data = asRecord(chosen?.cvssData);
    const found = severityOf(data?.baseSeverity ?? chosen?.baseSeverity);
    if (found !== 'unknown') return found;
  }
  return 'unknown';
}

/** Une fiche NVD. Rejetée ou contestée (`disputed`) : ignorée. */
export function parseNvdVuln(value: unknown): Vuln | null {
  const cve = asRecord(asRecord(value)?.cve);
  if (!cve || typeof cve.id !== 'string' || !CVE_RE.test(cve.id)) return null;
  if (cve.vulnStatus === 'Rejected') return null;
  for (const tag of asArray(cve.cveTags)) {
    if (asArray(asRecord(tag)?.tags).includes('disputed')) return null;
  }
  return {
    id: cve.id,
    cves: [cve.id],
    severity: nvdSeverity(asRecord(cve.metrics)),
  };
}

export function parseNvdPage(
  text: string,
): { vulns: Vuln[]; total: number; count: number } | null {
  const root = asRecord(parseJson(text));
  if (!root || !Array.isArray(root.vulnerabilities)) return null;
  const total =
    typeof root.totalResults === 'number' ? root.totalResults : Number.NaN;
  if (!Number.isFinite(total)) return null;
  const vulns = root.vulnerabilities
    .map(parseNvdVuln)
    .filter((item): item is Vuln => item !== null);
  return { vulns, total, count: root.vulnerabilities.length };
}

export function cpeName(cpe: string, version: string): string {
  return `cpe:2.3:a:${cpe}:${version}:*:*:*:*:*:*:*`;
}

/** GET cves/2.0?cpeName=… : NVD applique les plages de versions des fiches. */
export async function queryNvd(
  api: ExternalApi,
  cpe: string,
  version: string,
  apiKey: string | undefined,
  signal: AbortSignal,
): Promise<Lookup> {
  const vulns: Vuln[] = [];
  let start = 0;
  for (let page = 0; page < NVD_MAX_PAGES; page += 1) {
    const url = new URL(NVD_CVES_URL);
    url.searchParams.set('cpeName', cpeName(cpe, version));
    url.searchParams.set('noRejected', '');
    url.searchParams.set('resultsPerPage', String(NVD_PAGE_SIZE));
    url.searchParams.set('startIndex', String(start));
    const step = await attempt(
      api,
      {
        method: 'GET',
        url,
        ...(apiKey ? { headers: { apiKey } } : {}),
        timeoutMs: NVD_ATTEMPT_TIMEOUT_MS,
        signal,
      },
      new Set([403, 429]),
    );
    if (step.kind !== 'ok') return failure(step);
    const parsed = parseNvdPage(step.text);
    if (!parsed) return { ok: false, reason: 'error' };
    vulns.push(...parsed.vulns);
    start += parsed.count;
    if (parsed.count === 0 || start >= parsed.total)
      return { ok: true, vulns, truncated: false };
  }
  return { ok: true, vulns, truncated: true };
}

export function parseKev(text: string): KevBundle | null {
  const root = asRecord(parseJson(text));
  if (!root || !Array.isArray(root.vulnerabilities)) return null;
  const entries: Record<string, KevEntry> = {};
  for (const item of root.vulnerabilities) {
    const record = asRecord(item);
    const id = record?.cveID;
    if (typeof id !== 'string' || !CVE_RE.test(id)) continue;
    entries[id] = {
      dateAdded:
        typeof record?.dateAdded === 'string'
          ? record.dateAdded.slice(0, 10)
          : '',
      ransomware: record?.knownRansomwareCampaignUse === 'Known',
    };
  }
  if (Object.keys(entries).length === 0) return null;
  return {
    ok: true,
    catalogVersion:
      typeof root.catalogVersion === 'string'
        ? root.catalogVersion.slice(0, 20)
        : '',
    entries,
  };
}

/** Catalogue public CISA, lu seulement si au moins une faille a un numéro CVE. */
export async function fetchKev(
  api: ExternalApi,
  signal: AbortSignal,
): Promise<KevBundle> {
  const step = await attempt(
    api,
    {
      method: 'GET',
      url: new URL(KEV_URL),
      timeoutMs: KEV_ATTEMPT_TIMEOUT_MS,
      signal,
    },
    new Set([429]),
  );
  if (step.kind !== 'ok') return failure(step);
  return parseKev(step.text) ?? { ok: false, reason: 'error' };
}
