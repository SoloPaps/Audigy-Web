import {
  createServer as createHttpServer,
  type IncomingHttpHeaders,
  type RequestListener,
  type Server,
} from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createRequestBudget,
  createSafeFetch,
  type Resolve,
  type SafeFetchOptions,
} from '../src/index.js';
import { generateTestCerts } from './certs.js';

const PUBLIC_IP = '93.184.216.34';
const PUBLIC_IP_2 = '93.184.216.35';
const MB = 1024 * 1024;

interface Seen {
  path: string;
  headers: IncomingHttpHeaders;
}

let server: Server;
let port: number;
const seen: Seen[] = [];

const routes: Record<string, RequestListener> = {
  '/ok': (_req, res) => {
    res.setHeader('set-cookie', 'session=secret');
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<p>Bonjour</p>');
  },
  '/to-ok': (_req, res) => {
    res.writeHead(302, { location: '/ok', 'set-cookie': 'track=1' });
    res.end();
  },
  '/to-private': (_req, res) => {
    res.writeHead(302, { location: 'http://127.0.0.1/' });
    res.end();
  },
  '/to-metadata': (_req, res) => {
    res.writeHead(301, {
      location: 'http://169.254.169.254/latest/meta-data/',
    });
    res.end();
  },
  '/to-internal-host': (_req, res) => {
    res.writeHead(307, { location: 'http://interne.test/' });
    res.end();
  },
  '/to-8080': (_req, res) => {
    res.writeHead(302, { location: 'http://public.test:8080/' });
    res.end();
  },
  '/to-file': (_req, res) => {
    res.writeHead(302, { location: 'file:///etc/passwd' });
    res.end();
  },
  '/big-html': (_req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end(Buffer.alloc(5 * MB + 1, 'a'));
  },
  '/big-chunked': (_req, res) => {
    res.setHeader('content-type', 'text/html');
    const chunk = Buffer.alloc(MB, 'a');
    for (let i = 0; i < 6; i++) res.write(chunk);
    res.end();
  },
  '/html-5mb': (_req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end(Buffer.alloc(5 * MB, 'a'));
  },
  '/gzip-bomb': (_req, res) => {
    res.writeHead(200, {
      'content-type': 'text/html',
      'content-encoding': 'gzip',
    });
    res.end(gzipSync(Buffer.alloc(6 * MB, 'a')));
  },
  '/gzip': (_req, res) => {
    res.writeHead(200, {
      'content-type': 'text/plain',
      'content-encoding': 'gzip',
    });
    res.end(gzipSync('compressé'));
  },
  '/slow': () => {},
  '/slow-body': (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write('début');
  },
};

for (let i = 0; i < 7; i++) {
  routes[`/loop/${i}`] = (_req, res) => {
    res.writeHead(302, { location: `/loop/${i + 1}` });
    res.end();
  };
}

beforeAll(async () => {
  server = createHttpServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://local');
    seen.push({ path: url.pathname, headers: req.headers });
    const route = routes[url.pathname];
    if (route) return route(req, res);
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(`fin ${url.pathname}`);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
});

function setup(
  options: Partial<SafeFetchOptions> & {
    addresses?: Record<string, string[]>;
  } = {},
) {
  const addresses = options.addresses ?? {
    'public.test': [PUBLIC_IP],
    'interne.test': ['10.0.0.7'],
  };
  const resolve = vi.fn<Resolve>(async (host) => {
    const found = addresses[host];
    if (!found) throw new Error('ENOTFOUND');
    return found;
  });
  const dialed: string[] = [];
  const { addresses: _ignored, ...rest } = options;
  const safeFetch = createSafeFetch({
    resolve,
    dial: (ip) => {
      dialed.push(ip);
      return { host: '127.0.0.1', port };
    },
    ...rest,
  });
  return { safeFetch, resolve, dialed };
}

describe('safeFetch — URLs refusées avant toute connexion', () => {
  it.each([
    ['http://127.0.0.1/', 'BLOCKED_ADDRESS'],
    ['http://10.0.0.1/', 'BLOCKED_ADDRESS'],
    ['http://10.255.0.9/', 'BLOCKED_ADDRESS'],
    ['http://172.16.0.1/', 'BLOCKED_ADDRESS'],
    ['http://172.31.255.254/', 'BLOCKED_ADDRESS'],
    ['http://192.168.1.1/', 'BLOCKED_ADDRESS'],
    ['http://169.254.169.254/latest/meta-data/', 'BLOCKED_ADDRESS'],
    ['http://100.64.0.1/', 'BLOCKED_ADDRESS'],
    ['http://100.127.255.254/', 'BLOCKED_ADDRESS'],
    ['http://[::1]/', 'BLOCKED_ADDRESS'],
    ['http://[fc00::1]/', 'BLOCKED_ADDRESS'],
    ['http://[fdff::1]/', 'BLOCKED_ADDRESS'],
    ['http://[fe80::1]/', 'BLOCKED_ADDRESS'],
    ['http://[::ffff:127.0.0.1]/', 'BLOCKED_ADDRESS'],
    ['http://[::ffff:a9fe:a9fe]/', 'BLOCKED_ADDRESS'],
    ['http://2130706433/', 'BLOCKED_ADDRESS'],
    ['http://0x7f.1/', 'BLOCKED_ADDRESS'],
    ['http://0177.0.0.1/', 'BLOCKED_ADDRESS'],
    ['http://127.1/', 'BLOCKED_ADDRESS'],
    ['http://localhost/', 'BLOCKED_ADDRESS'],
    ['http://api.localhost/', 'BLOCKED_ADDRESS'],
    ['http://public.test:8080/', 'BLOCKED_PORT'],
    ['https://public.test:8443/', 'BLOCKED_PORT'],
    ['http://public.test:22/', 'BLOCKED_PORT'],
    ['file:///etc/passwd', 'BLOCKED_SCHEME'],
    ['ftp://public.test/', 'BLOCKED_SCHEME'],
    ['gopher://public.test/', 'BLOCKED_SCHEME'],
    ['data:text/plain,x', 'BLOCKED_SCHEME'],
    ['http://user:pass@public.test/', 'BLOCKED_CREDENTIALS'],
    ['pas une url', 'INVALID_URL'],
  ])('%s → %s', async (url, code) => {
    const { safeFetch, dialed } = setup();
    await expect(safeFetch(url)).rejects.toMatchObject({
      name: 'NetError',
      code,
    });
    expect(dialed).toEqual([]);
  });

  it('refuse un nom qui résout vers une IP privée', async () => {
    const { safeFetch, dialed } = setup();
    await expect(safeFetch('http://interne.test/')).rejects.toMatchObject({
      code: 'BLOCKED_ADDRESS',
    });
    expect(dialed).toEqual([]);
  });

  it('refuse si une seule des adresses résolues est privée', async () => {
    const { safeFetch } = setup({
      addresses: { 'mixte.test': [PUBLIC_IP, '127.0.0.1'] },
    });
    await expect(safeFetch('http://mixte.test/')).rejects.toMatchObject({
      code: 'BLOCKED_ADDRESS',
    });
  });

  it('refuse un nom qui résout vers ::ffff:10.0.0.1', async () => {
    const { safeFetch } = setup({
      addresses: { 'mapped.test': ['::ffff:10.0.0.1'] },
    });
    await expect(safeFetch('http://mapped.test/')).rejects.toMatchObject({
      code: 'BLOCKED_ADDRESS',
    });
  });

  it('signale un échec DNS', async () => {
    const { safeFetch } = setup();
    await expect(safeFetch('http://absent.test/')).rejects.toMatchObject({
      code: 'DNS_FAILURE',
    });
  });

  it('refuse toute méthode autre que GET/HEAD', async () => {
    const { safeFetch } = setup();
    const init = { method: 'POST' } as unknown as Parameters<
      typeof safeFetch
    >[1];
    await expect(safeFetch('http://public.test/', init)).rejects.toMatchObject({
      code: 'BLOCKED_METHOD',
    });
  });
});

describe('safeFetch — requêtes', () => {
  it('se connecte à l’IP épinglée, envoie le User-Agent et aucun cookie', async () => {
    const { safeFetch, dialed } = setup({ botUrl: 'https://audigy.example/' });
    const res = await safeFetch('http://public.test/to-ok');
    expect(res.status).toBe(200);
    expect(res.text()).toBe('<p>Bonjour</p>');
    expect(res.url).toBe('http://public.test/ok');
    expect(res.redirects).toEqual(['http://public.test/to-ok']);
    expect(res.ip).toBe(PUBLIC_IP);
    expect(dialed).toEqual([PUBLIC_IP, PUBLIC_IP]);
    const last = seen.at(-1);
    expect(last?.path).toBe('/ok');
    expect(last?.headers['user-agent']).toBe(
      'AudigyBot/1.0 (+https://audigy.example/robot)',
    );
    expect(last?.headers.host).toBe('public.test');
    expect(last?.headers.cookie).toBeUndefined();
    expect(last?.headers.authorization).toBeUndefined();
  });

  it('HEAD ne lit pas de corps', async () => {
    const { safeFetch } = setup();
    const res = await safeFetch('http://public.test/ok', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.body.byteLength).toBe(0);
  });

  it('décompresse gzip', async () => {
    const { safeFetch } = setup();
    expect((await safeFetch('http://public.test/gzip')).text()).toBe(
      'compressé',
    );
  });

  it('refuse une redirection vers une IP privée', async () => {
    const { safeFetch, dialed } = setup();
    await expect(
      safeFetch('http://public.test/to-private'),
    ).rejects.toMatchObject({ code: 'BLOCKED_ADDRESS' });
    expect(dialed).toEqual([PUBLIC_IP]);
  });

  it('refuse une redirection vers les métadonnées cloud', async () => {
    const { safeFetch } = setup();
    await expect(
      safeFetch('http://public.test/to-metadata'),
    ).rejects.toMatchObject({ code: 'BLOCKED_ADDRESS' });
  });

  it('refuse une redirection vers un hôte résolu en IP privée', async () => {
    const { safeFetch, dialed } = setup();
    await expect(
      safeFetch('http://public.test/to-internal-host'),
    ).rejects.toMatchObject({ code: 'BLOCKED_ADDRESS' });
    expect(dialed).toEqual([PUBLIC_IP]);
  });

  it('refuse une redirection vers le port 8080 ou file:', async () => {
    const { safeFetch } = setup();
    await expect(safeFetch('http://public.test/to-8080')).rejects.toMatchObject(
      { code: 'BLOCKED_PORT' },
    );
    await expect(safeFetch('http://public.test/to-file')).rejects.toMatchObject(
      { code: 'BLOCKED_SCHEME' },
    );
  });

  it('suit 5 redirections, refuse la 6e', async () => {
    const { safeFetch } = setup();
    const ok = await safeFetch('http://public.test/loop/2');
    expect(ok.redirects).toHaveLength(5);
    expect(ok.text()).toBe('fin /loop/7');
    await expect(safeFetch('http://public.test/loop/0')).rejects.toMatchObject({
      code: 'TOO_MANY_REDIRECTS',
    });
  });

  it('DNS rebinding : la 2e résolution, différente, est ignorée', async () => {
    const answers = [[PUBLIC_IP], ['127.0.0.1'], ['10.0.0.1']];
    const resolve = vi.fn<Resolve>(async () => answers.shift() ?? []);
    const dialed: string[] = [];
    const safeFetch = createSafeFetch({
      resolve,
      dial: (ip) => {
        dialed.push(ip);
        return { host: '127.0.0.1', port };
      },
    });
    await safeFetch('http://rebind.test/to-ok');
    await safeFetch('http://rebind.test/ok');
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(dialed).toEqual([PUBLIC_IP, PUBLIC_IP, PUBLIC_IP]);
  });

  it('épingle la première adresse publique', async () => {
    const { safeFetch, dialed } = setup({
      addresses: { 'multi.test': [PUBLIC_IP_2, PUBLIC_IP] },
    });
    await safeFetch('http://multi.test/ok');
    expect(dialed).toEqual([PUBLIC_IP_2]);
  });

  it('accepte 5 Mo de HTML, refuse au-delà (Content-Length)', async () => {
    const { safeFetch } = setup();
    expect(
      (await safeFetch('http://public.test/html-5mb')).body.byteLength,
    ).toBe(5 * MB);
    await expect(
      safeFetch('http://public.test/big-html'),
    ).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
  });

  it('refuse une réponse trop grosse sans Content-Length', async () => {
    const { safeFetch } = setup();
    await expect(
      safeFetch('http://public.test/big-chunked'),
    ).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
  });

  it('refuse une bombe gzip', async () => {
    const { safeFetch } = setup();
    await expect(
      safeFetch('http://public.test/gzip-bomb'),
    ).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
  });

  it('plafonne les réponses non HTML (maxBytes)', async () => {
    const { safeFetch } = setup({ maxBytes: 4 });
    await expect(safeFetch('http://public.test/gzip')).rejects.toMatchObject({
      code: 'RESPONSE_TOO_LARGE',
    });
  });

  it('applique le plafond total du budget', async () => {
    const budget = createRequestBudget({
      maxTotalBytes: 6 * MB,
      perHostIntervalMs: 0,
    });
    const { safeFetch } = setup({ budget });
    await safeFetch('http://public.test/html-5mb');
    await expect(
      safeFetch('http://public.test/html-5mb'),
    ).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
    expect(budget.requests).toBe(2);
  });

  it('refuse au-delà du budget de requêtes', async () => {
    const budget = createRequestBudget({
      maxRequests: 1,
      perHostIntervalMs: 0,
    });
    const { safeFetch } = setup({ budget });
    await expect(safeFetch('http://public.test/to-ok')).rejects.toMatchObject({
      code: 'BUDGET_EXCEEDED',
    });
  });

  it('délai dépassé en attente des en-têtes', async () => {
    const { safeFetch } = setup({ timeoutMs: 150 });
    await expect(safeFetch('http://public.test/slow')).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });

  it('délai dépassé pendant la lecture du corps', async () => {
    const { safeFetch } = setup({ timeoutMs: 150 });
    await expect(
      safeFetch('http://public.test/slow-body'),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('délai dépassé pendant la résolution DNS', async () => {
    const safeFetch = createSafeFetch({
      timeoutMs: 100,
      resolve: () => new Promise(() => {}),
    });
    await expect(safeFetch('http://lent.test/')).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });
});

describe('safeFetch — https', () => {
  it('vérifie le certificat pour le nom demandé (SNI) en se connectant à l’IP épinglée', async () => {
    const certs = generateTestCerts();
    const tlsServer = createHttpsServer(
      { key: certs.leafKey, cert: certs.leafCert },
      (req, res) => {
        res.end(
          `sni ${String((req.socket as { servername?: string }).servername)}`,
        );
      },
    );
    await new Promise<void>((r) => tlsServer.listen(0, '127.0.0.1', r));
    const tlsPort = (tlsServer.address() as AddressInfo).port;
    const dial = () => ({ host: '127.0.0.1', port: tlsPort });
    try {
      const resolve = async () => [PUBLIC_IP];
      const trusted = createSafeFetch({ resolve, dial, ca: [certs.caCert] });
      expect((await trusted('https://audigy.test/')).text()).toBe(
        'sni audigy.test',
      );
      await expect(trusted('https://autre.test/')).rejects.toMatchObject({
        code: 'NETWORK',
      });
      const untrusted = createSafeFetch({ resolve, dial });
      await expect(untrusted('https://audigy.test/')).rejects.toMatchObject({
        code: 'NETWORK',
      });
    } finally {
      tlsServer.closeAllConnections();
      await new Promise((r) => tlsServer.close(r));
    }
  });
});
