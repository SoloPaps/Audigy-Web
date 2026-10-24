export interface ChallengeSite {
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
}

export interface LocalChallenge {
  dnsName: string;
  dnsValue: string;
  fileUrl: string;
  pageUrl: string;
  metaTag: string;
}

function dnsDomain(host: string): string {
  const bare = host.toLowerCase().replace(/\.$/, '');
  return bare.startsWith('www.') ? bare.slice(4) : bare;
}

function prefix(path: string | null): string {
  if (!path || path === '/') return '/';
  let value = path.startsWith('/') ? path : `/${path}`;
  if (!value.endsWith('/')) value = `${value}/`;
  return value;
}

/** Même forme que `buildChallenge`, sans importer le moteur dans la page. */
export function localChallenge(
  site: ChallengeSite,
  token: string,
): LocalChallenge {
  const host = site.host.toLowerCase().replace(/\.$/, '');
  const base =
    site.scope === 'path'
      ? `https://${host}${prefix(site.pathPrefix)}`
      : `https://${host}/`;
  return {
    dnsName: `_audigy-challenge.${dnsDomain(host)}`,
    dnsValue: `audigy-site-verification=${token}`,
    fileUrl: new URL('audigy-verification.txt', base).href,
    pageUrl: base,
    metaTag: `<meta name="audigy-verification" content="${token}">`,
  };
}
