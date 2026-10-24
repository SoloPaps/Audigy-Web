/**
 * Auto-audit du build local, servi sur 127.0.0.1.
 * Le moteur refuse la boucle locale (`safeFetch`) : ce script ne parle qu’à
 * son propre serveur. Les autres hôtes reçoivent une réponse factice, sans
 * réseau. Les domaines qui exigent une API, un DNS public ou un certificat
 * public restent « Non testé » et sont listés pour le propriétaire.
 */

import { readFile, stat } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  DohResolver,
  SafeFetch,
  SafeResponse,
  TlsProbe,
} from '@audigy/net';
import { createRequestBudget } from '@audigy/net';
import {
  type CheckOutcome,
  createSharedArtifacts,
  createTechnologiesChecks,
  DNS_EMAIL_CHECKS,
  type DomainScore,
  ECOLOGIE_CHECKS,
  PERFORMANCE_CHECKS,
  QUALITE_CHECKS,
  type RunContext,
  SECURITE_CHECKS,
  SEO_CHECKS,
  scoreDomains,
  VIE_PRIVEE_CHECKS,
} from '../packages/engine/src/index.js';
import { runChecks } from '../packages/engine/src/runner.js';
import {
  FONT_MAX_BYTES,
  HOME_MAX_BYTES,
  headersFor,
  pageWeight,
  parseHeaderFile,
  trackerHits,
} from './publish-policy.js';

const SCORE_MIN = 90;
const REQUIRED = ['securite', 'seo', 'qualite'] as const;
const VERIFIER_EXAMPLE = '00000000-0000-4000-8000-000000000019';

const TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

interface LocalSite {
  port: number;
  origin: string;
  close(): Promise<void>;
}

function rootDir(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function localHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function inside(root: string, file: string): boolean {
  const resolved = path.resolve(file);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`);
}

async function fileFor(dist: string, pathname: string): Promise<string | null> {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const rel = decoded.replace(/^\/+/, '');
  const candidates =
    rel === ''
      ? [path.join(dist, 'index.html')]
      : [
          path.join(dist, rel),
          path.join(dist, rel, 'index.html'),
          path.join(dist, `${rel}.html`),
        ];
  for (const candidate of candidates) {
    if (!inside(dist, candidate)) continue;
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      // essai suivant
    }
  }
  const fallback = fallbackFile(pathname);
  if (!fallback) return null;
  const file = path.join(dist, fallback);
  if (!inside(dist, file)) return null;
  try {
    const info = await stat(file);
    return info.isFile() ? file : null;
  } catch {
    return null;
  }
}

function fallbackFile(pathname: string): string | null {
  if (/^\/verifier\/.+/u.test(pathname)) {
    return `verifier/${VERIFIER_EXAMPLE}/index.html`;
  }
  if (/^\/score\/.+/u.test(pathname)) return 'score/index.html';
  if (/^\/partage\/.+/u.test(pathname)) return 'partage/index.html';
  const print = pathname.match(/^\/rapport\/([^/]+)\/imprimer\/?$/u);
  if (print && print[1] !== 'imprimer') return 'rapport/imprimer/index.html';
  return null;
}

async function start(dist: string): Promise<LocalSite> {
  const rules = parseHeaderFile(
    await readFile(path.join(dist, '_headers'), 'utf8'),
  );
  const server = createServer((req, res) => {
    void serve(dist, rules, req.url ?? '/', req.method ?? 'GET', res);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('port');
  return {
    port: address.port,
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function serve(
  dist: string,
  rules: ReturnType<typeof parseHeaderFile>,
  rawUrl: string,
  method: string,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(rawUrl, 'http://127.0.0.1');
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' });
    res.end();
    return;
  }
  const file = await fileFor(dist, url.pathname);
  const headers = headersFor(rules, url.pathname);
  if (!file) {
    res.writeHead(404, {
      ...headers,
      'content-type': 'text/plain; charset=utf-8',
    });
    res.end(method === 'HEAD' ? undefined : 'introuvable');
    return;
  }
  const body = await readFile(file);
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
  res.writeHead(200, {
    ...headers,
    'content-type': type,
    'content-length': String(body.byteLength),
  });
  res.end(method === 'HEAD' ? undefined : body);
}

function safe(
  url: string,
  status: number,
  headers: Headers,
  body: Uint8Array,
  redirects: string[],
): SafeResponse {
  return {
    url,
    status,
    headers,
    body,
    transferBytes: body.byteLength,
    ip: '127.0.0.1',
    redirects,
    text: () => new TextDecoder().decode(body),
  };
}

function publicHref(input: URL): string {
  const url = new URL(input.href);
  url.protocol = 'https:';
  url.hostname = '127.0.0.1';
  url.port = '';
  return url.href;
}

function localFetch(port: number, external: Set<string>): SafeFetch {
  return async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    if (!localHost(url.hostname)) {
      external.add(url.hostname);
      return safe(
        url.href,
        200,
        new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
        new Uint8Array(),
        [],
      );
    }
    if (url.protocol === 'http:') {
      const next = new URL(url.href);
      next.protocol = 'https:';
      const final = await readLocal(port, next, method, init?.signal);
      return { ...final, redirects: [url.href, ...final.redirects] };
    }
    return readLocal(port, url, method, init?.signal);
  };
}

async function readLocal(
  port: number,
  url: URL,
  method: string,
  signal: AbortSignal | undefined,
): Promise<SafeResponse> {
  const target = `http://127.0.0.1:${port}${url.pathname}${url.search}`;
  const res = await fetch(target, {
    method,
    redirect: 'manual',
    ...(signal ? { signal } : {}),
  });
  const bytes = new Uint8Array(await res.arrayBuffer());
  return safe(publicHref(url), res.status, res.headers, bytes, []);
}

async function audit(site: LocalSite): Promise<{
  domains: DomainScore[];
  outcomes: CheckOutcome[];
  external: string[];
}> {
  const external = new Set<string>();
  const ctx: RunContext = {
    target: {
      url: new URL('https://127.0.0.1/'),
      scope: 'origin',
      hosting: 'other',
    },
    verified: false,
    net: {
      fetch: localFetch(site.port, external),
      dns: {
        query: () => Promise.reject(new Error('dns hors recette')),
        addresses: () => Promise.reject(new Error('dns hors recette')),
      } satisfies DohResolver,
      tls: (() =>
        Promise.reject(new Error('tls hors recette'))) satisfies TlsProbe,
    },
    shared: createSharedArtifacts(),
    budget: createRequestBudget({ perHostIntervalMs: 0, maxRequests: 400 }),
    now: () => new Date(),
  };
  const checks = [
    ...SECURITE_CHECKS,
    ...createTechnologiesChecks({ nvdApiKey: () => undefined }),
    ...PERFORMANCE_CHECKS,
    ...SEO_CHECKS,
    ...DNS_EMAIL_CHECKS,
    ...ECOLOGIE_CHECKS,
    ...QUALITE_CHECKS,
    ...VIE_PRIVEE_CHECKS,
  ];
  const outcomes = await runChecks(checks, ctx, {
    available: ['http'],
    timeoutMs: 60_000,
  });
  return {
    domains: scoreDomains(outcomes),
    outcomes,
    external: [...external].sort(),
  };
}

interface AuditPage {
  on(event: 'pageerror', listener: (error: Error) => void): void;
  on(event: 'console', listener: (msg: { text(): string }) => void): void;
  goto(url: string, options: { waitUntil: 'load' }): Promise<unknown>;
  waitForFunction(
    expression: string,
    arg: undefined,
    options: { timeout: number },
  ): Promise<unknown>;
  getByLabel(name: string): { selectOption(value: string): Promise<unknown> };
  evaluate(expression: string): Promise<unknown>;
}

interface AuditBrowser {
  newPage(): Promise<AuditPage>;
  close(): Promise<void>;
}

async function loadChromium(): Promise<{
  launch(options: { headless: boolean; args: string[] }): Promise<AuditBrowser>;
}> {
  const href = pathToFileURL(
    path.join(rootDir(), 'apps/web/node_modules/@playwright/test/index.js'),
  ).href;
  const loaded = (await import(href)) as {
    chromium?: {
      launch(options: {
        headless: boolean;
        args: string[];
      }): Promise<AuditBrowser>;
    };
    default?: {
      chromium?: {
        launch(options: {
          headless: boolean;
          args: string[];
        }): Promise<AuditBrowser>;
      };
    };
  };
  const chromium = loaded.chromium ?? loaded.default?.chromium;
  if (!chromium) throw new Error('Chromium Playwright introuvable');
  return chromium;
}

async function assertHydrated(origin: string): Promise<void> {
  const chromium = await loadChromium();
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const refused: string[] = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', (error) => {
      refused.push(error instanceof Error ? error.message : String(error));
    });
    page.on('console', (msg) => {
      const text = msg.text();
      if (/content security policy|refused to/i.test(text)) refused.push(text);
    });
    await page.goto(`${origin}/`, { waitUntil: 'load' });
    await page.waitForFunction(
      "() => { const island = document.querySelector('astro-island'); return Boolean(island && !island.hasAttribute('ssr')); }",
      undefined,
      { timeout: 20_000 },
    );
    await page.getByLabel('Thème').selectOption('dark');
    const theme = await page.evaluate(
      "document.documentElement.getAttribute('data-theme')",
    );
    if (theme !== 'dark') refused.push('thème non appliqué');
  } finally {
    await browser.close();
  }
  if (refused.length > 0) throw new Error(refused.join('\n'));
}

function line(domain: DomainScore): string {
  const score = domain.score === null ? 'non mesuré' : String(domain.score);
  const coverage = Math.round(domain.coverage * 100);
  return `${domain.domain} ${score} (couverture ${coverage} %)`;
}

async function main(): Promise<void> {
  const dist = path.join(rootDir(), 'apps', 'web', 'dist');
  try {
    await stat(path.join(dist, 'index.html'));
    await stat(path.join(dist, '_headers'));
  } catch {
    console.error('Build absent. Lancer pnpm build.');
    process.exitCode = 2;
    return;
  }
  const weight = await pageWeight(dist);
  const trackers = await trackerHits(dist);
  const problems: string[] = [];
  if (weight.bytes > HOME_MAX_BYTES) {
    problems.push(`accueil ${weight.bytes} octets, plafond ${HOME_MAX_BYTES}`);
  }
  if (weight.fonts > FONT_MAX_BYTES) {
    problems.push(`polices ${weight.fonts} octets, plafond ${FONT_MAX_BYTES}`);
  }
  if (trackers.length > 0) problems.push(`tiers ${trackers.join(', ')}`);
  console.log(`accueil ${weight.bytes} octets (plafond ${HOME_MAX_BYTES})`);
  console.log(`polices ${weight.fonts} octets (plafond ${FONT_MAX_BYTES})`);

  const site = await start(dist);
  try {
    const result = await audit(site);
    for (const domain of result.domains) console.log(line(domain));
    for (const outcome of result.outcomes) {
      const status = outcome.result.status;
      if (status === 'pass' || status === 'na') continue;
      console.log(
        `  ${outcome.checkId} ${status} ${outcome.result.messageKey}`,
      );
    }
    console.log(
      `hôtes externes non contactés : ${result.external.length === 0 ? 'aucun' : result.external.join(', ')}`,
    );
    for (const domain of result.domains) {
      if (domain.score !== null && domain.score < SCORE_MIN) {
        problems.push(`${domain.domain} ${domain.score}`);
      }
    }
    for (const id of REQUIRED) {
      const domain = result.domains.find((item) => item.domain === id);
      if (!domain || domain.score === null) problems.push(`${id} non mesuré`);
    }
    try {
      await assertHydrated(site.origin);
      console.log('hydratation Chromium ok');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      problems.push(`hydratation ${message}`);
    }
  } finally {
    await site.close();
  }
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exitCode = 1;
  }
}

const calledDirectly =
  import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (calledDirectly) await main();
