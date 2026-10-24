export interface GscPropertyRef {
  siteUrl: string;
  permissionLevel: string;
}

const USABLE = new Set(['siteOwner', 'siteFullUser', 'siteRestrictedUser']);

const DOMAIN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/**
 * Propriété Search Console qui couvre la page.
 * Préfixe d’URL le plus long, sinon `sc-domain:` le plus précis.
 * Une propriété non vérifiée ne compte pas.
 */
export function matchProperty(
  pageUrl: string,
  properties: readonly GscPropertyRef[],
): string | null {
  let page: URL;
  try {
    page = new URL(pageUrl);
  } catch {
    return null;
  }
  if (page.protocol !== 'http:' && page.protocol !== 'https:') return null;

  const host = hostname(page);
  let bestPrefix: { url: string; length: number } | null = null;
  let bestDomain: { url: string; length: number } | null = null;

  for (const property of properties) {
    if (!USABLE.has(property.permissionLevel)) continue;
    const raw = property.siteUrl.trim();
    const domain = domainOf(raw);
    if (domain) {
      if (host === domain || host.endsWith(`.${domain}`)) {
        if (!bestDomain || domain.length > bestDomain.length) {
          bestDomain = { url: `sc-domain:${domain}`, length: domain.length };
        }
      }
      continue;
    }
    const prefix = prefixOf(raw);
    if (!prefix || !covers(prefix, page)) continue;
    const length = prefix.pathname.length;
    if (!bestPrefix || length > bestPrefix.length) {
      bestPrefix = { url: raw, length };
    }
  }

  return bestPrefix?.url ?? bestDomain?.url ?? null;
}

function domainOf(siteUrl: string): string | null {
  const lower = siteUrl.toLowerCase();
  if (!lower.startsWith('sc-domain:')) return null;
  const domain = lower.slice('sc-domain:'.length).replace(/\.$/, '');
  if (!DOMAIN.test(domain)) return null;
  return domain;
}

function prefixOf(siteUrl: string): URL | null {
  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  return url;
}

function hostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/\.$/, '');
}

function portOf(url: URL): string {
  if (url.port) return url.port;
  return url.protocol === 'https:' ? '443' : '80';
}

function covers(prefix: URL, page: URL): boolean {
  if (prefix.protocol !== page.protocol) return false;
  if (hostname(prefix) !== hostname(page)) return false;
  if (portOf(prefix) !== portOf(page)) return false;
  const base = prefix.pathname.endsWith('/')
    ? prefix.pathname
    : `${prefix.pathname}/`;
  const path = page.pathname.endsWith('/')
    ? page.pathname
    : `${page.pathname}/`;
  return path.startsWith(base);
}
