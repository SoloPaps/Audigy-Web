import type { BrowserAudit, CmpVendor } from '@audigy/browser-runner';
import { trackerDomain } from './trackers.js';

/** Hôtes du bandeau lui-même : les retirer du constat de traceurs. */
const CMP_HOSTS: Record<CmpVendor, readonly string[]> = {
  tarteaucitron: ['tarteaucitron.io'],
  axeptio: ['axept.io'],
  didomi: ['didomi.io', 'privacy-center.org'],
  cookiebot: ['cookiebot.com', 'cookiebot.eu'],
  onetrust: ['onetrust.com', 'cookielaw.org'],
};

const MULTI = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu']);
const PLATFORM_SUFFIXES = [
  'github.io',
  'netlify.app',
  'vercel.app',
  'pages.dev',
  'herokuapp.com',
  'web.app',
  'firebaseapp.com',
  'cloudfront.net',
  'azurewebsites.net',
  'myshopify.com',
] as const;

export interface TrackerHit {
  host: string;
  via: 'cookie' | 'request';
}

function norm(host: string): string {
  const name = host.trim().toLowerCase();
  return name.endsWith('.') ? name.slice(0, -1) : name;
}

function apex(host: string): string {
  const name = norm(host);
  return name.startsWith('www.') ? name.slice(4) : name;
}

/** Même site que la cible, avec une heuristique de suffixe public. */
export function sameSite(resourceHost: string, targetHost: string): boolean {
  return siteKey(resourceHost) === siteKey(targetHost);
}

function siteKey(host: string): string {
  const name = apex(host);
  for (const suffix of PLATFORM_SUFFIXES) {
    if (name === suffix) return name;
    if (name.endsWith(`.${suffix}`)) {
      const rest = name.slice(0, -(suffix.length + 1));
      const label = rest.split('.').at(-1);
      return label ? `${label}.${suffix}` : name;
    }
  }
  const labels = name.split('.').filter((label) => label !== '');
  if (labels.length <= 2) return labels.join('.');
  const tld = labels.at(-1) ?? '';
  const sld = labels.at(-2) ?? '';
  if (tld.length === 2 && MULTI.has(sld)) return labels.slice(-3).join('.');
  return labels.slice(-2).join('.');
}

function cmpHost(host: string, vendor: CmpVendor | null): boolean {
  if (!vendor) return false;
  return CMP_HOSTS[vendor].some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

export function resourceKind(
  resourceType: string,
  url: string,
  host: string,
): 'script' | 'font' | null {
  const path = pathOf(url);
  if (resourceType === 'script' || /\.(?:mjs|js)$/i.test(path)) return 'script';
  if (resourceType === 'font' || /\.(?:woff2?|ttf|otf|eot)$/i.test(path))
    return 'font';
  if (resourceType === 'stylesheet' && /(?:^|\.)fonts?\./i.test(host))
    return 'font';
  return null;
}

export function trackerHits(
  audit: BrowserAudit,
  targetHost: string,
): TrackerHit[] {
  const seen = new Set<string>();
  const hits: TrackerHit[] = [];
  const push = (host: string, via: TrackerHit['via']): void => {
    const domain = trackerDomain(host);
    if (!domain || seen.has(domain) || cmpHost(host, audit.cmp.vendor)) return;
    seen.add(domain);
    hits.push({ host: domain, via });
  };
  for (const cookie of audit.cookies) push(cookie.domain, 'cookie');
  for (const request of audit.requests) {
    if (
      request.resourceType === 'document' &&
      sameSite(request.host, targetHost)
    )
      continue;
    push(request.host, 'request');
  }
  hits.sort((a, b) => (a.host < b.host ? -1 : a.host > b.host ? 1 : 0));
  return hits;
}

export function thirdPartyHits(
  audit: BrowserAudit,
  targetHost: string,
): { scripts: string[]; fonts: string[] } {
  const scripts = new Set<string>();
  const fonts = new Set<string>();
  for (const request of audit.requests) {
    if (sameSite(request.host, targetHost)) continue;
    if (cmpHost(request.host, audit.cmp.vendor)) continue;
    const kind = resourceKind(request.resourceType, request.url, request.host);
    const key = siteKey(request.host);
    if (kind === 'script') scripts.add(key);
    if (kind === 'font') fonts.add(key);
  }
  return {
    scripts: [...scripts].sort(),
    fonts: [...fonts].sort(),
  };
}
