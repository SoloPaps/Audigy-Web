import {
  createRequestBudget,
  createSafeFetch,
  type Resolve,
  type SafeFetch,
} from '@audigy/net';

export const PUBLIC_IP = '93.184.216.34';

/** Noms de test : tous publics, sauf `interne.example` (réseau privé). */
export const ADDRESSES: Record<string, string[]> = {
  'navigateur.example': [PUBLIC_IP],
  'bon.example': [PUBLIC_IP],
  'traceur.example': [PUBLIC_IP],
  'media.example': [PUBLIC_IP],
  'interne.example': ['10.0.0.7'],
};

/**
 * Le vrai `safeFetch` (validation d'URL, résolution, refus des IP non publiques,
 * budget), dont seule la connexion finale est redirigée vers le serveur local.
 * Le serveur de test ne parle pas TLS : une URL `https:` y est servie en clair,
 * puis l'URL de la réponse reprend son schéma d'origine.
 */
export function fixtureFetch(port: number): {
  fetch: SafeFetch;
  dialed: string[];
} {
  const dialed: string[] = [];
  const resolve: Resolve = async (host) => {
    const found = ADDRESSES[host];
    if (!found) throw new Error('ENOTFOUND');
    return found;
  };
  const safe = createSafeFetch({
    resolve,
    budget: createRequestBudget({ maxRequests: 300, perHostIntervalMs: 0 }),
    dial: (ip) => {
      dialed.push(ip);
      return { host: '127.0.0.1', port };
    },
  });
  const fetch: SafeFetch = async (input, init) => {
    const url = new URL(String(input));
    const secure = url.protocol === 'https:';
    if (secure) url.protocol = 'http:';
    const res = await safe(url, init);
    if (!secure) return res;
    return {
      ...res,
      url: res.url.replace(/^http:/, 'https:'),
      text: () => res.text(),
    };
  };
  return { fetch, dialed };
}
