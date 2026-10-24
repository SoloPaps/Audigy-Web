import { isIP } from 'node:net';

/**
 * Suffixes publics à plusieurs étiquettes les plus courants (extrait de la Public Suffix List).
 * Un hébergement mutualisé (`github.io`, `netlify.app`…) sépare les sites de ses clients.
 */
const MULTI_LABEL_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'co.jp',
  'com.br',
  'com.es',
  'com.mx',
  'com.tr',
  'com.cn',
  'co.za',
  'co.in',
  'gouv.fr',
  'asso.fr',
  'nom.fr',
  'com.fr',
  'tm.fr',
  'github.io',
  'gitlab.io',
  'netlify.app',
  'vercel.app',
  'pages.dev',
  'web.app',
  'firebaseapp.com',
  'herokuapp.com',
  'azurewebsites.net',
  'cloudfront.net',
  'wixsite.com',
  'wordpress.com',
  'blogspot.com',
  'myshopify.com',
  'webflow.io',
  'surge.sh',
  'onrender.com',
  'fly.dev',
]);

/** Site (domaine enregistrable) d'un hôte, par heuristique sur les suffixes courants. */
export function siteOf(host: string): string {
  const bare = host
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (isIP(bare)) return bare;
  const labels = bare.split('.');
  if (labels.length <= 2) return bare;
  const lastTwo = labels.slice(-2).join('.');
  if (MULTI_LABEL_SUFFIXES.has(lastTwo)) return labels.slice(-3).join('.');
  return lastTwo;
}

export function isThirdParty(host: string, firstPartyHost: string): boolean {
  return siteOf(host) !== siteOf(firstPartyHost);
}

/** Le domaine d'une trace (`.exemple.fr`) appartient-il au site audité ? */
export function cookieIsThirdParty(
  cookieDomain: string,
  firstPartyHost: string,
): boolean {
  return isThirdParty(cookieDomain.replace(/^\./, ''), firstPartyHost);
}
