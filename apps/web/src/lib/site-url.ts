export interface SiteDraft {
  url: string;
  scope: 'origin' | 'path';
  host: string;
  pathPrefix: string | null;
  hosting: 'netlify' | 'github_pages' | 'other';
  label: string;
}

export class InvalidSiteUrl extends Error {
  override readonly name = 'InvalidSiteUrl';
}

const RESERVED_TLDS = ['test', 'localhost', 'invalid', 'example', 'local'];
const HOST_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/;
const MAX_URL_LENGTH = 2048;

function hostingFor(host: string): SiteDraft['hosting'] {
  if (host.endsWith('.github.io')) return 'github_pages';
  if (host.endsWith('.netlify.app')) return 'netlify';
  return 'other';
}

function prefixOf(pathname: string): string {
  const segments = pathname.split('/').filter((segment) => segment !== '');
  const last = segments.at(-1);
  if (last?.includes('.') && !pathname.endsWith('/')) segments.pop();
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
}

function isIp(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, '');
  if (bare.includes(':')) return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(bare)) return true;
  return false;
}

/**
 * Même règles que l’orchestrateur : https forcé, pas d’identifiant,
 * pas de port, pas d’adresse IP, pas de nom réservé.
 */
export function normalizeSiteUrl(raw: string): SiteDraft {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.length > MAX_URL_LENGTH) {
    throw new InvalidSiteUrl('invalid_url');
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new InvalidSiteUrl('invalid_url');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidSiteUrl('invalid_url');
  }
  if (url.username !== '' || url.password !== '') {
    throw new InvalidSiteUrl('invalid_url');
  }
  if (url.port !== '') throw new InvalidSiteUrl('invalid_url');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (isIp(host) || !HOST_RE.test(host))
    throw new InvalidSiteUrl('invalid_url');
  const tld = host.slice(host.lastIndexOf('.') + 1);
  if (RESERVED_TLDS.includes(tld)) throw new InvalidSiteUrl('invalid_url');

  const prefix = prefixOf(url.pathname);
  const scope = prefix === '/' ? 'origin' : 'path';
  return {
    url: scope === 'origin' ? `https://${host}` : `https://${host}${prefix}`,
    scope,
    host,
    pathPrefix: scope === 'origin' ? null : prefix,
    hosting: hostingFor(host),
    label: scope === 'origin' ? host : `${host}${prefix}`,
  };
}
