/** Analyse des enregistrements DNS publics (RFC, forme texte du DoH JSON). */

export type Qualifier = '+' | '-' | '~' | '?';

export type SpfTerm =
  | { kind: 'all'; qualifier: Qualifier }
  | { kind: 'ip4' | 'ip6'; qualifier: Qualifier }
  | { kind: 'exp' }
  | { kind: 'redirect'; domain: string; macro: boolean }
  | {
      kind: 'include' | 'exists';
      qualifier: Qualifier;
      domain: string;
      macro: boolean;
    }
  | {
      kind: 'a' | 'mx' | 'ptr';
      qualifier: Qualifier;
      macro: boolean;
      domain?: string;
    };

const LABEL = '[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?';
const DOMAIN_RE = new RegExp(`^(?:${LABEL}\\.)*${LABEL}\\.?$`, 'i');

export function isSpf(data: string): boolean {
  return /^v=spf1($|\s)/i.test(data.trim());
}

export function parseSpf(record: string): SpfTerm[] | null {
  const parts = record.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() !== 'v=spf1') return null;
  const terms: SpfTerm[] = [];
  let redirects = 0;
  for (const part of parts.slice(1)) {
    const term = parseTerm(part);
    if (term === 'ignore') continue;
    if (term === null) return null;
    if (term.kind === 'redirect') {
      redirects += 1;
      if (redirects > 1) return null;
    }
    terms.push(term);
  }
  return terms;
}

export interface MxRecord {
  preference: number;
  exchange: string;
}

export function parseMx(data: string): MxRecord | null {
  const match = /^(\d+)\s+(\S+)$/.exec(data.trim());
  if (!match) return null;
  const preference = Number(match[1]);
  const raw = match[2];
  if (!Number.isInteger(preference) || preference > 65535 || raw === undefined)
    return null;
  const exchange = raw === '.' ? '.' : raw.toLowerCase().replace(/\.$/, '');
  if (exchange !== '.' && !isDomain(exchange)) return null;
  return { preference, exchange };
}

export type DmarcPolicy = 'none' | 'quarantine' | 'reject';

export interface DmarcRecord {
  p: DmarcPolicy;
  pct: number;
  rua: string[];
}

export function parseDmarc(data: string): DmarcRecord | null {
  const tags = tagList(data);
  if (!tags) return null;
  const first = tags[0];
  if (first?.key !== 'v' || first.value.toUpperCase() !== 'DMARC1') return null;
  const map = tagMap(tags.slice(1));
  const p = map.get('p')?.toLowerCase();
  if (p !== 'none' && p !== 'quarantine' && p !== 'reject') return null;
  let pct = 100;
  const rawPct = map.get('pct');
  if (rawPct !== undefined) {
    if (!/^\d{1,3}$/.test(rawPct)) return null;
    pct = Number(rawPct);
    if (pct > 100) return null;
  }
  const rawRua = map.get('rua');
  const rua = rawRua === undefined ? [] : mailtos(rawRua);
  if (rawRua !== undefined && rua.length === 0) return null;
  return { p, pct, rua };
}

export type DkimRecord = 'valid' | 'invalid' | 'other';

export function parseDkim(data: string): DkimRecord {
  const tags = tagList(data);
  if (!tags || tags.length === 0) return 'other';
  const map = tagMap(tags);
  const version = map.get('v');
  if (version === undefined && !map.has('p')) return 'other';
  if (version !== undefined) {
    if (tags[0]?.key !== 'v' || version.toUpperCase() !== 'DKIM1')
      return 'invalid';
  }
  const key = map.get('p');
  if (key === undefined || key === '') return 'invalid';
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(key)) return 'invalid';
  return 'valid';
}

export interface CaaRecord {
  flags: number;
  tag: string;
  value: string;
}

const CAA_RE = /^(\d+)\s+([a-z0-9]+)\s+(?:"([^"]*)"|(\S+))$/i;

export function parseCaa(data: string): CaaRecord | null {
  const match = CAA_RE.exec(data.trim());
  if (!match) return null;
  const flags = Number(match[1]);
  const tag = match[2]?.toLowerCase();
  const value = match[3] ?? match[4];
  if (
    !Number.isInteger(flags) ||
    flags > 255 ||
    tag === undefined ||
    value === undefined
  )
    return null;
  return { flags, tag, value };
}

/** Étiquettes CAA comprises. Une étiquette inconnue avec le bit critique est un échec. */
export const CAA_KNOWN = new Set([
  'issue',
  'issuewild',
  'iodef',
  'contactemail',
  'contactphone',
  'issuemail',
  'issuevmc',
]);

export function parseMtaStsId(data: string): string | null {
  const tags = tagList(data);
  if (!tags) return null;
  const first = tags[0];
  if (first?.key !== 'v' || first.value.toUpperCase() !== 'STSV1') return null;
  const id = tagMap(tags).get('id');
  if (id === undefined || !/^[A-Za-z0-9]{1,32}$/.test(id)) return null;
  return id;
}

export interface MtaStsPolicy {
  mode: 'enforce' | 'testing' | 'none';
  mx: string[];
  maxAge: number;
}

export function parseMtaStsPolicy(text: string): MtaStsPolicy | null {
  let version: string | undefined;
  let mode: string | undefined;
  let maxAge: number | undefined;
  const mx: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;
    const sep = line.indexOf(':');
    if (sep === -1) return null;
    const key = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();
    if (key === 'version') version = value;
    else if (key === 'mode') mode = value.toLowerCase();
    else if (key === 'mx') mx.push(value);
    else if (key === 'max_age') {
      if (!/^\d+$/.test(value)) return null;
      maxAge = Number(value);
    }
  }
  if (version?.toUpperCase() !== 'STSV1') return null;
  if (mode !== 'enforce' && mode !== 'testing' && mode !== 'none') return null;
  if (maxAge === undefined || maxAge <= 0 || maxAge > 31_557_600) return null;
  if (mx.length === 0 || mx.some((item) => item === '')) return null;
  return { mode, mx, maxAge };
}

export function parseTlsRpt(data: string): { rua: string[] } | null {
  const tags = tagList(data);
  if (!tags) return null;
  const first = tags[0];
  if (first?.key !== 'v' || first.value.toUpperCase() !== 'TLSRPTV1')
    return null;
  const raw = tagMap(tags).get('rua');
  if (raw === undefined) return null;
  const rua = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
  if (rua.length === 0) return null;
  const ok = rua.every(
    (uri) => /^mailto:.+@.+$/i.test(uri) || /^https:\/\/.+/i.test(uri),
  );
  return ok ? { rua } : null;
}

function parseTerm(raw: string): SpfTerm | 'ignore' | null {
  const modifier = /^([a-z0-9_.-]+)=(.*)$/i.exec(raw);
  if (modifier) {
    const name = modifier[1]?.toLowerCase();
    const value = modifier[2] ?? '';
    if (name !== 'redirect' && name !== 'exp') return 'ignore';
    if (value === '') return null;
    const macro = value.includes('%');
    if (!macro && !isDomain(value)) return null;
    if (name === 'exp') return { kind: 'exp' };
    return { kind: 'redirect', domain: value, macro };
  }
  let qualifier: Qualifier = '+';
  let body = raw;
  const head = body[0];
  if (head === '+' || head === '-' || head === '~' || head === '?') {
    qualifier = head;
    body = body.slice(1);
  }
  const match = /^([A-Za-z][A-Za-z0-9]*)(.*)$/.exec(body);
  const name = match?.[1]?.toLowerCase();
  const rest = match?.[2] ?? '';
  if (name === undefined) return null;
  if (name === 'all') return rest === '' ? { kind: 'all', qualifier } : null;
  if (name === 'ip4') return validIp4(rest) ? { kind: 'ip4', qualifier } : null;
  if (name === 'ip6') return validIp6(rest) ? { kind: 'ip6', qualifier } : null;
  if (name === 'include' || name === 'exists') {
    const domain = domainOnly(rest);
    if (domain === null) return null;
    return {
      kind: name,
      qualifier,
      domain: domain.value,
      macro: domain.macro,
    };
  }
  if (name === 'a' || name === 'mx' || name === 'ptr') {
    const spec = domainCidr(rest);
    if (spec === null) return null;
    if (spec.domain === undefined)
      return { kind: name, qualifier, macro: spec.macro };
    return { kind: name, qualifier, macro: spec.macro, domain: spec.domain };
  }
  return null;
}

function domainOnly(rest: string): { value: string; macro: boolean } | null {
  if (!rest.startsWith(':') || rest.includes('/')) return null;
  const value = rest.slice(1);
  if (value === '') return null;
  const macro = value.includes('%');
  if (!macro && !isDomain(value)) return null;
  return { value, macro };
}

function domainCidr(rest: string): { domain?: string; macro: boolean } | null {
  if (rest === '') return { macro: false };
  let body = rest;
  let domain: string | undefined;
  if (body.startsWith(':')) {
    const slash = body.indexOf('/');
    domain = slash === -1 ? body.slice(1) : body.slice(1, slash);
    if (domain === '') return null;
    body = slash === -1 ? '' : body.slice(slash);
  }
  if (body !== '' && !/^\/\d{1,3}(?:\/\/\d{1,3})?$/.test(body)) return null;
  const nums = body.split('/').filter((item) => item !== '');
  if (nums.some((item) => Number(item) > 128)) return null;
  const macro = domain?.includes('%') ?? false;
  if (domain !== undefined && !macro && !isDomain(domain)) return null;
  if (domain === undefined) return { macro };
  return { domain, macro };
}

function validIp4(rest: string): boolean {
  if (!rest.startsWith(':')) return false;
  const [addr, prefix, extra] = rest.slice(1).split('/');
  if (!addr || extra !== undefined) return false;
  const octets = addr.split('.');
  if (octets.length !== 4) return false;
  if (!octets.every((item) => /^\d{1,3}$/.test(item) && Number(item) <= 255))
    return false;
  if (prefix === undefined) return true;
  return /^\d{1,2}$/.test(prefix) && Number(prefix) <= 32;
}

function validIp6(rest: string): boolean {
  if (!rest.startsWith(':')) return false;
  const raw = rest.slice(1);
  const slash = raw.lastIndexOf('/');
  let addr = raw;
  if (slash !== -1) {
    addr = raw.slice(0, slash);
    const prefix = raw.slice(slash + 1);
    if (!/^\d{1,3}$/.test(prefix) || Number(prefix) > 128) return false;
  }
  if (!addr.includes(':') || !/^[0-9a-f:]+$/i.test(addr)) return false;
  return addr.split('::').length <= 2;
}

function isDomain(value: string): boolean {
  return value.length <= 253 && DOMAIN_RE.test(value);
}

interface Tag {
  key: string;
  value: string;
}

function tagList(data: string): Tag[] | null {
  const tags: Tag[] = [];
  for (const part of data.split(';')) {
    const trimmed = part.trim();
    if (trimmed === '') continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return null;
    const key = trimmed.slice(0, eq).trim().toLowerCase();
    const value = trimmed.slice(eq + 1).trim();
    if (!/^[a-z0-9]+$/.test(key)) return null;
    tags.push({ key, value });
  }
  return tags;
}

function tagMap(tags: readonly Tag[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of tags) map.set(tag.key, tag.value);
  return map;
}

function mailtos(raw: string): string[] {
  const list = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
  if (!list.every((uri) => /^mailto:.+@.+$/i.test(uri))) return [];
  return list;
}
