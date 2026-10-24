import type { IncomingHttpHeaders } from 'node:http';
import { createServer as createHttpsServer, type Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createExternalApi,
  EXTERNAL_API_HOSTS,
  type ExternalApi,
  GREEN_WEB_HOST,
  KEV_HOST,
  NVD_HOST,
  OSV_HOST,
} from '../src/index.js';
import { generateTestCerts } from './certs.js';

const PUBLIC_IP = '93.184.216.34';
const SECRET = 'clef-test-externe';
const certs = generateTestCerts();

interface Seen {
  method: string;
  url: string;
  body: string;
  headers: IncomingHttpHeaders;
}

let server: Server;
let port: number;
const seen: Seen[] = [];

beforeAll(async () => {
  server = createHttpsServer(
    { key: certs.leafKey, cert: certs.leafCert },
    (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const url = req.url ?? '/';
        seen.push({
          method: req.method ?? '',
          url,
          body: Buffer.concat(chunks).toString('utf8'),
          headers: req.headers,
        });
        if (url.startsWith('/slow')) return;
        if (url.startsWith('/hop')) {
          res.writeHead(302, { location: 'https://evil.example/secret' });
          res.end();
          return;
        }
        if (url.startsWith('/big')) {
          res.end(Buffer.alloc(80, 'a'));
          return;
        }
        if (url.startsWith('/gzip')) {
          res.writeHead(200, {
            'content-type': 'application/json',
            'content-encoding': 'gzip',
          });
          res.end(gzipSync('{"ok":true}'));
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"ok":true}');
      });
    },
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

function client(
  extra: Parameters<typeof createExternalApi>[0] = {},
): ExternalApi {
  return createExternalApi({
    allow: ['audigy.test'],
    resolve: async () => [PUBLIC_IP],
    dial: () => ({ host: '127.0.0.1', port }),
    ca: [certs.caCert],
    ...extra,
  });
}

describe('createExternalApi', () => {
  it('n’autorise que PSI, CrUX, Search Console, Green Web, OSV, NVD et KEV par défaut', () => {
    expect([...EXTERNAL_API_HOSTS]).toEqual([
      'www.googleapis.com',
      'chromeuxreport.googleapis.com',
      'oauth2.googleapis.com',
      'searchconsole.googleapis.com',
      GREEN_WEB_HOST,
      'api.osv.dev',
      'services.nvd.nist.gov',
      'www.cisa.gov',
    ]);
    expect([OSV_HOST, NVD_HOST, KEV_HOST]).toEqual([
      'api.osv.dev',
      'services.nvd.nist.gov',
      'www.cisa.gov',
    ]);
  });

  it('ajoute un en-tête permis sans remplacer ceux du client', async () => {
    seen.length = 0;
    const api = client();
    const got = await api.request({
      method: 'GET',
      url: new URL('https://audigy.test/nvd'),
      headers: { apiKey: SECRET },
      timeoutMs: 1000,
    });
    expect(got.status).toBe(200);
    expect(seen[0]?.headers.apikey).toBe(SECRET);
    expect(seen[0]?.headers['user-agent']).toContain('AudigyBot');
    for (const headers of [
      { 'User-Agent': 'autre' },
      { Host: 'evil.example' },
      { cookie: 'a=b' },
      { 'bad name': 'x' },
      { apiKey: 'a\r\nx-injecte: 1' },
      { apiKey: 'a', APIKEY: 'b' },
    ]) {
      const error = await api
        .request({
          method: 'GET',
          url: new URL('https://audigy.test/nvd'),
          headers,
          timeoutMs: 1000,
        })
        .catch((caught: unknown) => caught);
      expect(error, JSON.stringify(headers)).toMatchObject({
        code: 'BLOCKED_HEADER',
      });
      expect(JSON.stringify(error)).not.toContain(SECRET);
    }
    expect(seen).toHaveLength(1);
  });

  it('passe l’allowlist puis refuse une IP privée, sans composer la clé', async () => {
    const resolve = vi.fn(async () => ['10.1.2.3']);
    const dial = vi.fn();
    const api = createExternalApi({ resolve, dial });
    const url =
      'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?key=SECRET';
    await expect(
      api.request({ method: 'GET', url: new URL(url), timeoutMs: 1000 }),
    ).rejects.toMatchObject({ code: 'BLOCKED_ADDRESS' });
    expect(resolve).toHaveBeenCalledWith('www.googleapis.com');
    expect(dial).not.toHaveBeenCalled();
    const crux = createExternalApi({
      resolve: async () => ['10.1.2.3'],
      dial,
    });
    await expect(
      crux.request({
        method: 'GET',
        url: new URL(`https://chromeuxreport.googleapis.com/v1?key=${SECRET}`),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: 'BLOCKED_ADDRESS' });
  });

  it('refuse un hôte hors liste avant tout DNS', async () => {
    const resolve = vi.fn(async () => [PUBLIC_IP]);
    const api = createExternalApi({ resolve });
    const error = await api
      .request({
        method: 'GET',
        url: new URL(`https://evil.example/?key=${SECRET}`),
        timeoutMs: 1000,
      })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'BLOCKED_ADDRESS' });
    expect(resolve).not.toHaveBeenCalled();
    expect(JSON.stringify(error)).not.toContain(SECRET);
  });

  it('refuse http, un port et des identifiants', async () => {
    const api = client();
    await expect(
      api.request({
        method: 'GET',
        url: new URL('http://audigy.test/'),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: 'BLOCKED_SCHEME' });
    await expect(
      api.request({
        method: 'GET',
        url: new URL('https://audigy.test:444/'),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: 'BLOCKED_PORT' });
    await expect(
      api.request({
        method: 'GET',
        url: new URL('https://user:pass@audigy.test/'),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: 'BLOCKED_CREDENTIALS' });
  });

  it('envoie GET et POST vers l’IP épinglée, sans cookie', async () => {
    seen.length = 0;
    const resolve = vi.fn(async () => [PUBLIC_IP]);
    const api = client({ resolve });
    const got = await api.request({
      method: 'GET',
      url: new URL(`https://audigy.test/ok?key=${SECRET}`),
      timeoutMs: 1000,
    });
    expect(got).toEqual({ status: 200, text: '{"ok":true}' });
    const posted = await api.request({
      method: 'POST',
      url: new URL(`https://audigy.test/crux?key=${SECRET}`),
      body: '{"url":"https://exemple.test/"}',
      timeoutMs: 1000,
    });
    expect(posted.status).toBe(200);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(seen.map((item) => item.method)).toEqual(['GET', 'POST']);
    expect(seen[1]?.body).toBe('{"url":"https://exemple.test/"}');
    expect(seen[0]?.headers['user-agent']).toContain('AudigyBot');
    expect(seen[0]?.headers.cookie).toBeUndefined();
    expect(seen[0]?.headers.accept).toBe('application/json');
    expect(seen[1]?.headers['content-type']).toContain('application/json');
    expect(seen[0]?.url).toContain(`key=${SECRET}`);
  });

  it('ne suit pas une redirection', async () => {
    seen.length = 0;
    const api = client();
    const got = await api.request({
      method: 'GET',
      url: new URL('https://audigy.test/hop'),
      timeoutMs: 1000,
    });
    expect(got).toEqual({ status: 302, text: '' });
    expect(seen).toHaveLength(1);
  });

  it('décompresse gzip et borne la taille', async () => {
    const api = client();
    const got = await api.request({
      method: 'GET',
      url: new URL('https://audigy.test/gzip'),
      timeoutMs: 1000,
    });
    expect(got.text).toBe('{"ok":true}');
    const small = client({ maxBytes: 40 });
    await expect(
      small.request({
        method: 'GET',
        url: new URL('https://audigy.test/big'),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
  });

  it('expire sans recopier la clé', async () => {
    const api = client();
    const error = await api
      .request({
        method: 'GET',
        url: new URL(`https://audigy.test/slow?key=${SECRET}`),
        timeoutMs: 80,
      })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'TIMEOUT' });
    expect(JSON.stringify(error)).not.toContain(SECRET);
  });

  it('masque la clé si la connexion échoue', async () => {
    const api = createExternalApi({
      allow: ['audigy.test'],
      resolve: async () => [PUBLIC_IP],
      dial: () => {
        throw new Error(`boom ?key=${SECRET}`);
      },
    });
    const error = await api
      .request({
        method: 'GET',
        url: new URL(`https://audigy.test/?key=${SECRET}`),
        timeoutMs: 1000,
      })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'NETWORK' });
    expect(JSON.stringify(error)).not.toContain(SECRET);
    const cause = (error as { cause?: unknown }).cause;
    expect(String(cause)).not.toContain(SECRET);
  });

  it('pose Authorization sans le recopier, et refuse le même nom dans headers', async () => {
    seen.length = 0;
    const api = client();
    const bearer = 'Bearer jeton-test-gsc';
    const got = await api.request({
      method: 'POST',
      url: new URL('https://audigy.test/token'),
      body: 'grant_type=refresh_token',
      contentType: 'application/x-www-form-urlencoded',
      authorization: bearer,
      timeoutMs: 1000,
    });
    expect(got.status).toBe(200);
    expect(seen[0]?.headers.authorization).toBe(bearer);
    expect(seen[0]?.headers['content-type']).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(seen[0]?.body).toBe('grant_type=refresh_token');
    const error = await api
      .request({
        method: 'GET',
        url: new URL('https://audigy.test/nvd'),
        headers: { authorization: bearer },
        timeoutMs: 1000,
      })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'BLOCKED_HEADER' });
    expect(JSON.stringify(error)).not.toContain('jeton-test-gsc');
  });
});
