/**
 * Serveur local des sites de test `fixtures/sites/<site>/` (127.0.0.1 uniquement).
 * `headers.json` d'un site = en-têtes ajoutés à chaque réponse (jamais servi).
 * Usage : `pnpm fixtures bon [port]` ou `startFixtureServer('bon')` dans un test.
 */
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURE_SITES = ['bon', 'mauvais'] as const;
export type FixtureSite = (typeof FIXTURE_SITES)[number];

const SITES_DIR = fileURLToPath(new URL('./sites/', import.meta.url));

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.json': 'application/json',
};

export interface FixtureServer {
  port: number;
  origin: string;
  /** Chemins demandés, dans l'ordre. */
  requests: string[];
  close(): Promise<void>;
}

export async function startFixtureServer(
  site: FixtureSite,
  port = 0,
): Promise<FixtureServer> {
  if (!FIXTURE_SITES.includes(site)) throw new Error(`Site inconnu : ${site}`);
  const root = path.join(SITES_DIR, site);
  const extraHeaders = JSON.parse(
    await readFile(path.join(root, 'headers.json'), 'utf8'),
  ) as Record<string, string>;
  const requests: string[] = [];

  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://fixture').pathname;
    requests.push(pathname);
    for (const [name, value] of Object.entries(extraHeaders))
      res.setHeader(name, value);

    let relative: string;
    try {
      relative = decodeURIComponent(pathname);
    } catch {
      relative = '';
    }
    if (relative.endsWith('/')) relative += 'index.html';
    const file = path.join(root, relative);
    const allowed =
      relative !== '' &&
      file.startsWith(root + path.sep) &&
      path.basename(file) !== 'headers.json' &&
      (req.method === 'GET' || req.method === 'HEAD');
    try {
      if (!allowed) throw new Error('refusé');
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
        'Content-Length': body.length,
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : 'Introuvable');
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const actual = (server.address() as AddressInfo).port;
  return {
    port: actual,
    origin: `http://127.0.0.1:${actual}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const site = (process.argv[2] ?? 'bon') as FixtureSite;
  const server = await startFixtureServer(site, Number(process.argv[3] ?? 0));
  console.log(`Site de test « ${site} » : ${server.origin}`);
}
