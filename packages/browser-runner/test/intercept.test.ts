import { gzipSync } from 'node:zlib';
import {
  createSafeFetch,
  NetError,
  type SafeFetch,
  type SafeResponse,
} from '@audigy/net';
import { describe, expect, it, vi } from 'vitest';
import {
  createInterceptor,
  createResponseCache,
  fulfillHeaders,
  MAX_RECORDS,
  type RouteLike,
} from '../src/intercept.js';

interface Fulfilled {
  status: number;
  headers: Record<string, string>;
  body?: Buffer;
}

function fakeRoute(
  url: string,
  method = 'GET',
  resourceType = 'document',
  headers: Record<string, string> = {},
) {
  const calls: { fulfilled?: Fulfilled; aborted?: string } = {};
  const route: RouteLike = {
    request: () => ({
      url: () => url,
      method: () => method,
      resourceType: () => resourceType,
      headers: () => headers,
    }),
    fulfill: async (response) => {
      calls.fulfilled = response;
    },
    abort: async (code) => {
      calls.aborted = code ?? 'failed';
    },
  };
  return { route, calls };
}

function response(
  url: string,
  init: {
    status?: number;
    headers?: [string, string][];
    body?: string;
    transferBytes?: number;
  } = {},
): SafeResponse {
  const body = new TextEncoder().encode(init.body ?? 'ok');
  return {
    url,
    status: init.status ?? 200,
    headers: new Headers(init.headers ?? [['content-type', 'text/html']]),
    body,
    transferBytes: init.transferBytes ?? body.length,
    ip: '93.184.216.34',
    redirects: [],
    text: () => init.body ?? 'ok',
  };
}

function setup(fetch: SafeFetch, cache = createResponseCache()) {
  return createInterceptor({
    fetch,
    firstPartyHost: 'www.exemple.fr',
    cache,
  });
}

describe('interception des requêtes du navigateur', () => {
  it('rejoue un GET par safeFetch et relaie corps, statut et en-têtes', async () => {
    const fetch = vi.fn<SafeFetch>(async (input) =>
      response(String(input), {
        headers: [
          ['content-type', 'text/html; charset=utf-8'],
          ['content-encoding', 'gzip'],
          ['content-length', '12'],
          ['set-cookie', 'a=1; Path=/'],
          ['set-cookie', 'b=2; HttpOnly'],
        ],
        body: '<p>Bonjour</p>',
        transferBytes: 12,
      }),
    );
    const interceptor = setup(fetch);
    const { route, calls } = fakeRoute('https://www.exemple.fr/');
    await interceptor.handle(route);

    expect(fetch).toHaveBeenCalledWith(new URL('https://www.exemple.fr/'), {
      method: 'GET',
    });
    expect(calls.fulfilled?.status).toBe(200);
    expect(calls.fulfilled?.body?.toString()).toBe('<p>Bonjour</p>');
    expect(calls.fulfilled?.headers).toEqual({
      'content-type': 'text/html; charset=utf-8',
      'set-cookie': 'a=1; Path=/\nb=2; HttpOnly',
    });
    expect(interceptor.records).toEqual([
      {
        url: 'https://www.exemple.fr/',
        method: 'GET',
        resourceType: 'document',
        host: 'www.exemple.fr',
        thirdParty: false,
        outcome: 'network',
        status: 200,
        mimeType: 'text/html',
        transferBytes: 12,
        reason: null,
      },
    ]);
    expect(interceptor.headerCookies.get('www.exemple.fr')).toEqual(
      new Set(['a', 'b']),
    );
  });

  it("n'envoie jamais un POST : réponse vide locale", async () => {
    const fetch = vi.fn<SafeFetch>();
    const interceptor = setup(fetch);
    const { route, calls } = fakeRoute(
      'https://collecte.traceur.net/event',
      'POST',
      'fetch',
      { origin: 'https://www.exemple.fr' },
    );
    await interceptor.handle(route);
    expect(fetch).not.toHaveBeenCalled();
    expect(calls.fulfilled).toEqual({
      status: 204,
      headers: {
        'access-control-allow-origin': 'https://www.exemple.fr',
        'access-control-allow-credentials': 'true',
      },
    });
    expect(interceptor.records[0]).toMatchObject({
      outcome: 'stubbed',
      thirdParty: true,
      reason: 'METHOD',
    });
    expect(interceptor.refused.has('https://collecte.traceur.net/event')).toBe(
      true,
    );
  });

  it('refuse les schémas autres que http et https', async () => {
    const fetch = vi.fn<SafeFetch>();
    const interceptor = setup(fetch);
    const { route, calls } = fakeRoute('ftp://www.exemple.fr/fichier');
    await interceptor.handle(route);
    expect(fetch).not.toHaveBeenCalled();
    expect(calls.aborted).toBe('blockedbyclient');
    expect(interceptor.records[0]?.reason).toBe('BLOCKED_SCHEME');
  });

  it("bloque ce que l'anti-SSRF refuse", async () => {
    const interceptor = setup(async () => {
      throw new NetError('BLOCKED_ADDRESS', 'Adresse refusée (private)');
    });
    const { route, calls } = fakeRoute('http://10.0.0.1/admin', 'GET', 'image');
    await interceptor.handle(route);
    expect(calls.aborted).toBe('blockedbyclient');
    expect(interceptor.records[0]).toMatchObject({
      outcome: 'blocked',
      reason: 'BLOCKED_ADDRESS',
      host: '10.0.0.1',
    });
    expect(interceptor.budgetExhausted).toBe(false);
  });

  it('signale un budget épuisé', async () => {
    const interceptor = setup(async () => {
      throw new NetError('BUDGET_EXCEEDED', 'Budget atteint');
    });
    await interceptor.handle(fakeRoute('https://www.exemple.fr/a.js').route);
    expect(interceptor.budgetExhausted).toBe(true);
  });

  it('distingue une panne réseau', async () => {
    const interceptor = setup(async () => {
      throw new NetError('TIMEOUT', 'Délai');
    });
    const { route, calls } = fakeRoute('https://www.exemple.fr/lent.js');
    await interceptor.handle(route);
    expect(calls.aborted).toBe('failed');
    expect(interceptor.records[0]).toMatchObject({
      outcome: 'error',
      reason: 'TIMEOUT',
    });
  });

  it('rejoue une redirection, puis sert la cible depuis le cache', async () => {
    const fetch = vi.fn<SafeFetch>(async () =>
      response('https://www.exemple.fr/accueil'),
    );
    const interceptor = setup(fetch);
    const first = fakeRoute('http://www.exemple.fr/');
    await interceptor.handle(first.route);
    expect(first.calls.fulfilled).toEqual({
      status: 302,
      headers: { location: 'https://www.exemple.fr/accueil' },
    });
    const second = fakeRoute('https://www.exemple.fr/accueil');
    await interceptor.handle(second.route);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(second.calls.fulfilled?.status).toBe(200);
    expect(interceptor.records.map((r) => [r.status, r.outcome])).toEqual([
      [302, 'network'],
      [200, 'network'],
    ]);
  });

  it('partage le cache entre chargements : rien de neuf pour le site', async () => {
    const fetch = vi.fn<SafeFetch>(async (input) => response(String(input)));
    const cache = createResponseCache();
    const desktop = setup(fetch, cache);
    await desktop.handle(fakeRoute('https://www.exemple.fr/').route);
    const mobile = setup(fetch, cache);
    await mobile.handle(fakeRoute('https://www.exemple.fr/').route);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mobile.records[0]?.outcome).toBe('cache');
    expect(mobile.transferBytes).toBe(desktop.transferBytes);
  });

  it('enregistre un WebSocket refusé', () => {
    const interceptor = setup(vi.fn<SafeFetch>());
    interceptor.recordWebSocket('wss://direct.exemple.fr/flux');
    expect(interceptor.records[0]).toMatchObject({
      resourceType: 'websocket',
      outcome: 'blocked',
      reason: 'WEBSOCKET',
    });
  });

  it('borne la liste mais compte tout', async () => {
    const interceptor = setup(async (input) =>
      response(String(input), { transferBytes: 1 }),
    );
    for (let i = 0; i < MAX_RECORDS + 5; i += 1)
      await interceptor.handle(fakeRoute(`https://www.exemple.fr/${i}`).route);
    expect(interceptor.records).toHaveLength(MAX_RECORDS);
    expect(interceptor.total).toBe(MAX_RECORDS + 5);
    expect(interceptor.transferBytes).toBe(MAX_RECORDS + 5);
    expect(interceptor.inflight).toBe(0);
  });

  it('passe par le vrai safeFetch : une IP privée ne reçoit aucune connexion', async () => {
    const dial = vi.fn(() => ({ host: '127.0.0.1', port: 9 }));
    const fetch = createSafeFetch({
      resolve: async () => ['192.168.1.20'],
      dial,
    });
    const interceptor = setup(fetch);
    const { route, calls } = fakeRoute('https://box.exemple.fr/');
    await interceptor.handle(route);
    expect(dial).not.toHaveBeenCalled();
    expect(calls.aborted).toBe('blockedbyclient');
    expect(interceptor.records[0]?.reason).toBe('BLOCKED_ADDRESS');
  });
});

describe('fulfillHeaders', () => {
  it('retire les en-têtes de transport : le corps est déjà décompressé', () => {
    const headers = new Headers([
      ['Content-Encoding', 'br'],
      ['Transfer-Encoding', 'chunked'],
      ['Content-Length', String(gzipSync('x').length)],
      ['Cache-Control', 'max-age=60'],
    ]);
    expect(fulfillHeaders(headers)).toEqual({ 'cache-control': 'max-age=60' });
  });
});
