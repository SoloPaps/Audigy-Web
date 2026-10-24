/**
 * Contrat de sortie du runner navigateur (PART-13), version 1.
 * Le runner charge la page sans interaction. Les checks vie privée
 * ne lisent que ces champs. Les autres champs du rapport sont ignorés.
 * Une trace ne porte jamais sa valeur.
 */

export const BROWSER_SCHEMA_VERSION = 1 as const;

export const CMP_VENDORS = [
  'tarteaucitron',
  'axeptio',
  'didomi',
  'cookiebot',
  'onetrust',
] as const;
export type CmpVendor = (typeof CMP_VENDORS)[number];

export const RESOURCE_TYPES = [
  'document',
  'stylesheet',
  'image',
  'media',
  'font',
  'script',
  'xhr',
  'fetch',
  'other',
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface BrowserCookie {
  name: string;
  domain: string;
}

export interface BrowserRequest {
  url: string;
  host: string;
  resourceType: ResourceType;
}

export interface BrowserCmp {
  present: boolean;
  vendor: CmpVendor | null;
  rejectAllFirstLevel: boolean;
}

export interface BrowserAudit {
  schemaVersion: typeof BROWSER_SCHEMA_VERSION;
  url: string;
  /** Vrai seulement si le runner a cliqué. La vie privée exige faux. */
  interacted: boolean;
  cookies: BrowserCookie[];
  requests: BrowserRequest[];
  cmp: BrowserCmp;
  truncated: boolean;
}

const MAX_COOKIES = 200;
const MAX_REQUESTS = 500;
const KNOWN_TYPES = new Set<string>(RESOURCE_TYPES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function httpUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2000)
    return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username !== '' || url.password !== '') return null;
    if (url.hostname === '') return null;
    return url;
  } catch {
    return null;
  }
}

function hostName(value: string): string {
  const host = value.trim().toLowerCase();
  const bare = host.endsWith('.') ? host.slice(0, -1) : host;
  return bare.startsWith('.') ? bare.slice(1) : bare;
}

function cookie(value: unknown): BrowserCookie | null {
  if (!isRecord(value)) return null;
  if ('value' in value) return null;
  if (typeof value.name !== 'string' || typeof value.domain !== 'string')
    return null;
  const name = value.name.trim();
  const domain = hostName(value.domain);
  if (name === '' || name.length > 128 || /[;\s]/.test(name)) return null;
  if (domain === '' || domain.length > 253 || /[\s/;]/.test(domain))
    return null;
  return { name, domain };
}

function request(value: unknown): BrowserRequest | null {
  if (!isRecord(value)) return null;
  const url = httpUrl(value.url);
  if (!url || typeof value.host !== 'string') return null;
  if (typeof value.resourceType !== 'string' || value.resourceType === '')
    return null;
  const host = hostName(value.host);
  if (host !== hostName(url.hostname)) return null;
  const resourceType = (
    KNOWN_TYPES.has(value.resourceType) ? value.resourceType : 'other'
  ) as ResourceType;
  return { url: url.href, host, resourceType };
}

function cmp(value: unknown): BrowserCmp | null {
  if (!isRecord(value)) return null;
  if (typeof value.present !== 'boolean') return null;
  if (typeof value.rejectAllFirstLevel !== 'boolean') return null;
  if (value.vendor !== null && typeof value.vendor !== 'string') return null;
  const vendor =
    value.vendor === null
      ? null
      : (CMP_VENDORS.find((item) => item === value.vendor) ?? undefined);
  if (vendor === undefined) return null;
  if (!value.present && (vendor !== null || value.rejectAllFirstLevel))
    return null;
  return {
    present: value.present,
    vendor,
    rejectAllFirstLevel: value.rejectAllFirstLevel,
  };
}

/** `null` si le rapport n’est pas exploitable. Les valeurs de traces sont refusées. */
export function parseBrowserAudit(value: unknown): BrowserAudit | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== BROWSER_SCHEMA_VERSION) return null;
  const url = httpUrl(value.url);
  if (!url) return null;
  if (value.interacted !== undefined && typeof value.interacted !== 'boolean')
    return null;
  if (!Array.isArray(value.cookies) || !Array.isArray(value.requests))
    return null;
  const banner = cmp(value.cmp);
  if (!banner) return null;
  const cookies: BrowserCookie[] = [];
  for (const item of value.cookies) {
    const parsed = cookie(item);
    if (!parsed) return null;
    cookies.push(parsed);
  }
  const requests: BrowserRequest[] = [];
  for (const item of value.requests) {
    const parsed = request(item);
    if (!parsed) return null;
    requests.push(parsed);
  }
  const truncated =
    cookies.length > MAX_COOKIES || requests.length > MAX_REQUESTS;
  return {
    schemaVersion: BROWSER_SCHEMA_VERSION,
    url: url.href,
    interacted: value.interacted === true,
    cookies: cookies.slice(0, MAX_COOKIES),
    requests: requests.slice(0, MAX_REQUESTS),
    cmp: banner,
    truncated,
  };
}
