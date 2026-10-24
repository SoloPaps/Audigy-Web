import { NetError, type SafeResponse } from '@audigy/net';
import { describe, expect, it } from 'vitest';
import {
  activeAllowed,
  buildChallenge,
  challengeName,
  FRESH_MS,
  generateToken,
  metaContent,
  type ProofRecord,
  probeOwnership,
  scopedUrl,
  TOKEN_RE,
  verificationFileUrl,
} from '../src/index.js';

const NOW = new Date('2026-10-24T12:00:00.000Z');
const TOKEN = 'a'.repeat(43);

const origin = {
  host: 'exemple.fr',
  scope: 'origin' as const,
  pathPrefix: null,
};
const pathSite = {
  host: 'solopaps.github.io',
  scope: 'path' as const,
  pathPrefix: '/Projet-Site-Artiste/',
};

function proof(extra: Partial<ProofRecord> = {}): ProofRecord {
  return {
    status: 'verified',
    method: 'file',
    lastCheckedAt: new Date(NOW.getTime() - 60_000),
    host: 'exemple.fr',
    scope: 'origin',
    pathPrefix: null,
    ...extra,
  };
}

function response(body: string, status = 200): SafeResponse {
  const bytes = new TextEncoder().encode(body);
  return {
    url: 'https://exemple.fr/',
    status,
    headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
    body: bytes,
    transferBytes: bytes.byteLength,
    ip: '93.184.216.34',
    redirects: [],
    text: () => body,
  };
}

describe('jeton', () => {
  it('produit un jeton de la forme attendue, à chaque fois différent', () => {
    const first = generateToken();
    const second = generateToken();
    expect(first).toMatch(TOKEN_RE);
    expect(second).toMatch(TOKEN_RE);
    expect(first).not.toBe(second);
  });
});

describe('défi', () => {
  it('décrit les trois méthodes, sans dossier caché', () => {
    const dns = buildChallenge(origin, 'dns_txt', TOKEN);
    expect(dns.dnsName).toBe('_audigy-challenge.exemple.fr');
    expect(dns.dnsValue).toBe(`audigy-site-verification=${TOKEN}`);
    expect(challengeName('www.exemple.fr')).toBe(
      '_audigy-challenge.exemple.fr',
    );
    const file = buildChallenge(pathSite, 'file', TOKEN);
    expect(file.fileUrl).toBe(
      'https://solopaps.github.io/Projet-Site-Artiste/audigy-verification.txt',
    );
    expect(file.fileUrl).not.toContain('.well-known');
    const meta = buildChallenge(origin, 'meta', TOKEN);
    expect(meta.metaTag).toBe(
      `<meta name="audigy-verification" content="${TOKEN}">`,
    );
    expect(verificationFileUrl(origin).pathname).toBe(
      '/audigy-verification.txt',
    );
  });

  it('refuse de sortir de la portée', () => {
    expect(scopedUrl(pathSite, '.git/HEAD').href).toBe(
      'https://solopaps.github.io/Projet-Site-Artiste/.git/HEAD',
    );
    expect(() => scopedUrl(pathSite, '../.env')).toThrow(/path_escape/);
  });
});

describe('autorisation de l’actif', () => {
  it('refuse si la preuve a 10 minutes ou plus', () => {
    expect(
      activeAllowed(
        proof({ lastCheckedAt: new Date(NOW.getTime() - FRESH_MS) }),
        origin,
        NOW,
      ),
    ).toEqual({ ok: false, reason: 'stale' });
    expect(
      activeAllowed(
        proof({ lastCheckedAt: new Date(NOW.getTime() - FRESH_MS + 1) }),
        origin,
        NOW,
      ),
    ).toEqual({ ok: true });
  });

  it('refuse si la portée ne correspond pas', () => {
    const narrow = proof({
      method: 'file',
      host: 'solopaps.github.io',
      scope: 'path',
      pathPrefix: '/Projet-Site-Artiste/',
    });
    expect(activeAllowed(narrow, pathSite, NOW)).toEqual({ ok: true });
    expect(
      activeAllowed(narrow, { ...pathSite, pathPrefix: '/autre/' }, NOW),
    ).toEqual({ ok: false, reason: 'scope' });
    expect(
      activeAllowed(
        narrow,
        { host: 'solopaps.github.io', scope: 'origin', pathPrefix: null },
        NOW,
      ),
    ).toEqual({ ok: false, reason: 'scope' });
    expect(
      activeAllowed(
        proof({
          method: 'dns_txt',
          host: 'solopaps.github.io',
          scope: 'origin',
        }),
        pathSite,
        NOW,
      ),
    ).toEqual({ ok: true });
    expect(activeAllowed(proof({ host: 'autre.fr' }), origin, NOW)).toEqual({
      ok: false,
      reason: 'scope',
    });
  });

  it('refuse un statut autre que vérifié', () => {
    expect(activeAllowed(null, origin, NOW)).toEqual({
      ok: false,
      reason: 'missing',
    });
    expect(activeAllowed(proof({ status: 'expired' }), origin, NOW)).toEqual({
      ok: false,
      reason: 'status',
    });
    expect(activeAllowed(proof({ status: 'pending' }), origin, NOW)).toEqual({
      ok: false,
      reason: 'status',
    });
  });
});

describe('lecture de la preuve', () => {
  it('reconnaît le DNS, le fichier et la balise', async () => {
    const dns = await probeOwnership('dns_txt', TOKEN, origin, {
      fetch: async () => response(''),
      dns: {
        query: async () => ({
          status: 0,
          authenticated: false,
          records: [
            {
              name: '_audigy-challenge.exemple.fr',
              type: 'TXT',
              ttl: 60,
              data: `audigy-site-verification=${TOKEN}`,
            },
          ],
        }),
        addresses: async () => [],
      },
    });
    expect(dns.outcome).toBe('present');

    const file = await probeOwnership('file', TOKEN, origin, {
      fetch: async () => response(`${TOKEN}\n`),
      dns: {
        query: async () => {
          throw new Error('inutile');
        },
        addresses: async () => [],
      },
    });
    expect(file.outcome).toBe('present');

    const html = `<html><head><meta content="${TOKEN}" name="audigy-verification"></head></html>`;
    expect(metaContent(html)).toBe(TOKEN);
    const meta = await probeOwnership('meta', TOKEN, origin, {
      fetch: async () => response(html),
      dns: {
        query: async () => {
          throw new Error('inutile');
        },
        addresses: async () => [],
      },
    });
    expect(meta.outcome).toBe('present');
  });

  it('ignore un fichier qui est en fait la page HTML', async () => {
    const html = `<!doctype html><p>${TOKEN}</p>`;
    const file = await probeOwnership('file', TOKEN, origin, {
      fetch: async () => response(html),
      dns: {
        query: async () => {
          throw new Error('inutile');
        },
        addresses: async () => [],
      },
    });
    expect(file.outcome).toBe('absent');
  });

  it('ne conclut pas si le DNS échoue', async () => {
    const dns = await probeOwnership('dns_txt', TOKEN, origin, {
      fetch: async () => response(''),
      dns: {
        query: async () => ({
          status: 2,
          authenticated: false,
          records: [],
        }),
        addresses: async () => [],
      },
    });
    expect(dns.outcome).toBe('error');
    const down = await probeOwnership('dns_txt', TOKEN, origin, {
      fetch: async () => response(''),
      dns: {
        query: async () => {
          throw new NetError('TIMEOUT', 'délai');
        },
        addresses: async () => [],
      },
    });
    expect(down.outcome).toBe('error');
  });
});
