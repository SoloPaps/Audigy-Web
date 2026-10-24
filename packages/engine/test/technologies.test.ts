import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createRequestBudget,
  type DohResolver,
  type ExternalApi,
  type ExternalRequest,
  KEV_HOST,
  NetError,
  NVD_HOST,
  OSV_HOST,
  type SafeFetch,
  type SafeResponse,
} from '@audigy/net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fr, type MessageKey } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import { memoryDayCache } from '../checks/performance/cache.js';
import { extractScripts } from '../checks/securite/technologies/html.js';
import {
  CVE_TIMEOUT_MS,
  createTechnologiesChecks,
  TECHNOLOGIES_CHECKS,
  TECHNOLOGIES_TIMEOUT_MS,
} from '../checks/securite/technologies/index.js';
import { SCRIPT_LIMIT } from '../checks/securite/technologies/inventory.js';
import { groupVulns } from '../checks/securite/technologies/judge.js';
import {
  NPM_VERSION_RE,
  OSV_NPM,
} from '../checks/securite/technologies/libraries.js';
import {
  RETIRE_LIBRARIES,
  SIGNATURES,
  scanContent,
  scanUrl,
  strongest,
} from '../checks/securite/technologies/retire.js';
import {
  softwareFromGenerator,
  softwareFromHeader,
} from '../checks/securite/technologies/software.js';
import {
  cpeName,
  parseKev,
  parseNvdVuln,
  parseOsvPage,
  parseOsvVuln,
} from '../checks/securite/technologies/sources.js';
import { nvdApiKey } from '../src/external.js';
import { FIXES_FR_DIR, fileFixStore } from '../src/fixes-fs.js';
import {
  type CheckOutcome,
  type CheckResult,
  createRegistry,
  createSharedArtifacts,
  loadFixes,
  RETIRE_SIGNATURES,
  type RunContext,
  runChecks,
} from '../src/index.js';

const NOW = new Date('2026-10-24T12:00:00.000Z');
const ORIGIN = 'https://exemple.test';
const SECRET = 'clef-nvd-test';
const FIXTURES = fileURLToPath(
  new URL('../fixtures/technologies/', import.meta.url),
);
const fixture = (name: string) => readFileSync(`${FIXTURES}${name}`, 'utf8');
const OSV_JQUERY = fixture('osv-jquery-3.4.1.json');
const OSV_BOOTSTRAP = fixture('osv-bootstrap-3.3.7.json');
const OSV_LODASH = fixture('osv-lodash-4.17.20.json');
const OSV_EMPTY = fixture('osv-empty.json');
const NVD_NGINX = fixture('nvd-nginx-1.18.0.json');
const NVD_APACHE = fixture('nvd-apache-2.4.49.json');
const KEV = fixture('kev.json');
const NVD_EMPTY = JSON.stringify({ totalResults: 0, vulnerabilities: [] });
const seen = new Set<string>();

const JQUERY =
  '/*! jQuery v3.4.1 | (c) JS Foundation and other contributors */';
const BOOTSTRAP = '/*!\n * Bootstrap v3.3.7 (http://getbootstrap.com)\n */';
const LODASH = '/**\n * @license\n * Lodash 4.17.20 <https://lodash.com/>\n */';

function nvd(id: string, severity: string): string {
  return JSON.stringify({
    totalResults: 1,
    vulnerabilities: [
      {
        cve: {
          id,
          vulnStatus: 'Analyzed',
          metrics: {
            cvssMetricV31: [
              { type: 'Primary', cvssData: { baseSeverity: severity } },
            ],
          },
        },
      },
    ],
  });
}

beforeAll(() => {
  vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau interdit')));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

interface Reply {
  status: number;
  text: string;
}

type Route = Reply | Reply[] | Error;

/** Clé d’une requête : `osv:paquet@version`, `nvd:cpe` ou `kev`. */
function routeOf(input: ExternalRequest): string {
  if (input.url.hostname === OSV_HOST) {
    const body = JSON.parse(String(input.body)) as {
      package: { name: string };
      version: string;
    };
    return `osv:${body.package.name}@${body.version}`;
  }
  if (input.url.hostname === NVD_HOST)
    return `nvd:${input.url.searchParams.get('cpeName')}`;
  if (input.url.hostname === KEV_HOST) return 'kev';
  throw new Error(`hôte inattendu ${input.url.hostname}`);
}

function scripted(routes: Record<string, Route>): {
  api: ExternalApi;
  calls: ExternalRequest[];
  keys: string[];
} {
  const queues = new Map<string, Route>(Object.entries(routes));
  const calls: ExternalRequest[] = [];
  const keys: string[] = [];
  const api: ExternalApi = {
    async request(input) {
      calls.push(input);
      const key = routeOf(input);
      keys.push(key);
      const route = queues.get(key);
      if (route === undefined) throw new Error(`route inattendue ${key}`);
      if (route instanceof Error) throw route;
      if (!Array.isArray(route)) return route;
      const next = route.shift();
      if (!next) throw new Error(`réponse épuisée ${key}`);
      return next;
    },
  };
  return { api, calls, keys };
}

const ok = (text: string): Reply => ({ status: 200, text });

function response(init: {
  url: string;
  status?: number;
  headers?: Record<string, string>;
  body?: string;
}): SafeResponse {
  const body = init.body ?? '';
  return {
    url: init.url,
    status: init.status ?? 200,
    headers: new Headers(init.headers ?? {}),
    body: new TextEncoder().encode(body),
    transferBytes: new TextEncoder().encode(body).length,
    ip: '93.184.216.34',
    redirects: [],
    text: () => body,
  };
}

function html(body: string): string {
  return `<!doctype html><html lang="fr"><head><title>Test</title>${body}</head><body><p>Bonjour</p></body></html>`;
}

function js(path: string, body: string): [string, SafeResponse] {
  const url = `${ORIGIN}${path}`;
  return [
    url,
    response({
      url,
      headers: { 'content-type': 'application/javascript' },
      body,
    }),
  ];
}

const noDns: DohResolver = {
  query: () => Promise.reject(new Error('DNS non disponible en test')),
  addresses: () => Promise.reject(new Error('DNS non disponible en test')),
};

function site(options: {
  headers?: Record<string, string>;
  page?: string;
  status?: number;
  files?: Record<string, SafeResponse | Error>;
  homeError?: Error;
}): { fetch: SafeFetch; fetched: string[] } {
  const fetched: string[] = [];
  const home = response({
    url: `${ORIGIN}/`,
    status: options.status ?? 200,
    headers: { 'content-type': 'text/html; charset=utf-8', ...options.headers },
    body: options.page ?? html(''),
  });
  const fetch: SafeFetch = async (input) => {
    const url = new URL(String(input)).href;
    fetched.push(url);
    if (url === `${ORIGIN}/`) {
      if (options.homeError) throw options.homeError;
      return home;
    }
    const found = options.files?.[url];
    if (found instanceof Error) throw found;
    if (!found) throw new Error(`fetch inattendu ${url}`);
    return found;
  };
  return { fetch, fetched };
}

function context(
  fetch: SafeFetch,
  api: ExternalApi | undefined,
  now: Date = NOW,
): RunContext {
  return {
    target: { url: new URL(`${ORIGIN}/`), scope: 'origin', hosting: 'other' },
    verified: false,
    net: {
      fetch,
      dns: noDns,
      tls: () => Promise.reject(new Error('TLS non disponible en test')),
      ...(api ? { api } : {}),
    },
    shared: createSharedArtifacts(),
    budget: createRequestBudget({ perHostIntervalMs: 0 }),
    now: () => now,
  };
}

async function audit(
  ctx: RunContext,
  options: Parameters<typeof createTechnologiesChecks>[0] = {},
): Promise<Record<string, CheckResult>> {
  const outcomes = await runChecks(
    createTechnologiesChecks({ nvdApiKey: () => undefined, ...options }),
    ctx,
    { concurrency: 3 },
  );
  return byId(outcomes);
}

function byId(outcomes: CheckOutcome[]): Record<string, CheckResult> {
  return Object.fromEntries(
    outcomes.map((item) => [item.checkId, item.result]),
  );
}

function expectResult(
  result: CheckResult | undefined,
  status: CheckResult['status'],
  key: string,
): CheckResult {
  if (!result) throw new Error(`résultat absent ${key}`);
  expect(result.status, `${key} ${result.messageKey}`).toBe(status);
  expect(result.messageKey).toBe(key);
  seen.add(key);
  const template = fr[key as MessageKey];
  expect(template, key).toBeTruthy();
  const issues = lintText(template, 'apps/web/src/i18n/fr.ts');
  expect(failureCount(issues), template).toBe(0);
  expect(
    issues.filter((issue) => issue.rule === 'sentence-length'),
    template,
  ).toEqual([]);
  for (const name of template.matchAll(/\{([A-Za-z0-9_]+)\}/g)) {
    expect(result.params?.[name[1] ?? ''], key).toBeDefined();
  }
  if (status === 'warn' || status === 'fail')
    expect(result.fixKey).toBeTruthy();
  else expect(result.fixKey).toBeUndefined();
  if (status === 'untested' || status === 'na') expect(result.reason).toBe(key);
  return result;
}

describe('signatures retire.js', () => {
  it('note la licence, l’avis et le commit', () => {
    expect(SIGNATURES.license).toBe('Apache-2.0');
    expect(SIGNATURES.copyright).toBe('Copyright 2018 Erlend Oftedal');
    expect(SIGNATURES.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(RETIRE_SIGNATURES).toEqual(SIGNATURES);
    const dir = fileURLToPath(new URL('../data/retire/', import.meta.url));
    const license = readFileSync(`${dir}LICENSE.md`, 'utf8');
    expect(license).toContain('Apache License');
    expect(license).toContain('Version 2.0');
    const notice = readFileSync(`${dir}NOTICE.md`, 'utf8');
    expect(notice).toContain('Copyright 2018 Erlend Oftedal');
    const raw = JSON.parse(readFileSync(`${dir}signatures.json`, 'utf8')) as {
      source: string;
      changes: string;
      libraries: Record<string, Record<string, unknown>>;
    };
    expect(raw.source).toContain(SIGNATURES.commit);
    expect(raw.changes).toContain('Audigy');
    for (const entry of Object.values(raw.libraries)) {
      expect(
        Object.keys(entry).every((name) =>
          [
            'uri',
            'filename',
            'filecontent',
            'filecontentreplace',
            'hashes',
          ].includes(name),
        ),
      ).toBe(true);
      for (const hash of Object.keys((entry.hashes as object) ?? {}))
        expect(hash).toMatch(/^[0-9a-f]{40}$/);
    }
    const methode = readFileSync(
      fileURLToPath(new URL('../../../docs/METHODE.md', import.meta.url)),
      'utf8',
    );
    expect(methode).toContain(SIGNATURES.commit);
    expect(methode).toContain('Apache-2.0');
  });

  it('associe chaque bibliothèque à un paquet npm ou à rien', () => {
    expect(RETIRE_LIBRARIES.length).toBeGreaterThan(50);
    expect(Object.keys(OSV_NPM).sort()).toEqual([...RETIRE_LIBRARIES]);
    expect(OSV_NPM.jquery).toBe('jquery');
    expect(OSV_NPM.angularjs).toBe('angular');
    expect(OSV_NPM.prototypejs).toBeNull();
    expect(NPM_VERSION_RE.test('3.4.1')).toBe(true);
    expect(NPM_VERSION_RE.test('4.0.0-beta.2')).toBe(true);
    expect(NPM_VERSION_RE.test('3.4')).toBe(false);
    expect(NPM_VERSION_RE.test('3.4.1.min')).toBe(false);
  });

  it('lit l’adresse, le nom de fichier puis le contenu', () => {
    expect(
      scanUrl(new URL('https://cdn.test/ajax/libs/jquery/3.4.1/jquery.min.js')),
    ).toContainEqual({ library: 'jquery', version: '3.4.1', evidence: 'uri' });
    expect(
      scanUrl(new URL('https://exemple.test/js/jquery-3.5.0.min.js?v=9.9.9')),
    ).toEqual([{ library: 'jquery', version: '3.5.0', evidence: 'filename' }]);
    expect(scanUrl(new URL('https://exemple.test/js/app.js'))).toEqual([]);
    expect(scanContent(JQUERY)).toEqual([
      { library: 'jquery', version: '3.4.1', evidence: 'filecontent' },
    ]);
    expect(scanContent(BOOTSTRAP.replaceAll('\n', '\r\n'))).toContainEqual({
      library: 'bootstrap',
      version: '3.3.7',
      evidence: 'filecontent',
    });
    expect(scanContent('dojo.version={major:1,minor:16,patch:4,')).toEqual([
      { library: 'dojo', version: '1.16.4', evidence: 'filecontentreplace' },
    ]);
    expect(scanContent('console.log(1)')).toEqual([]);
    const best = strongest([
      { library: 'jquery', version: '3.4.0', evidence: 'uri' },
      { library: 'jquery', version: '3.4.1', evidence: 'filecontent' },
      { library: 'lodash', version: '4.17.20', evidence: 'filename' },
    ]);
    expect(best).toEqual([
      { library: 'jquery', version: '3.4.1', evidence: 'filecontent' },
      { library: 'lodash', version: '4.17.20', evidence: 'filename' },
    ]);
  });

  it('reconnaît une empreinte SHA-1 connue', () => {
    const dir = fileURLToPath(new URL('../data/retire/', import.meta.url));
    const raw = JSON.parse(readFileSync(`${dir}signatures.json`, 'utf8')) as {
      libraries: Record<string, { hashes?: Record<string, string> }>;
    };
    const known = Object.values(raw.libraries).flatMap((entry) =>
      Object.keys(entry.hashes ?? {}),
    );
    expect(known.length).toBeGreaterThan(0);
    const digest = createHash('sha1').update('console.log(1)').digest('hex');
    expect(known).not.toContain(digest);
  });
});

describe('logiciels annoncés', () => {
  it('sépare produits, versions et paquets de distribution', () => {
    const [apache, php] = softwareFromHeader(
      'Apache/2.4.41 (Ubuntu) PHP/7.4.3',
      'server',
    );
    expect(apache).toMatchObject({
      id: 'apache',
      announced: '2.4.41',
      version: '2.4.41',
      precise: true,
      distro: true,
      cve: { kind: 'nvd', cpe: 'apache:http_server' },
    });
    expect(php).toMatchObject({ id: 'php', version: '7.4.3', distro: true });
    const [suffixed] = softwareFromHeader(
      'PHP/7.4.33-1+deb11u5',
      'x-powered-by',
    );
    expect(suffixed).toMatchObject({
      id: 'php',
      version: '7.4.33',
      precise: true,
      distro: true,
    });
    const [branch] = softwareFromHeader('Apache/2.4', 'server');
    expect(branch).toMatchObject({ version: '2.4', precise: false });
    expect(softwareFromHeader('Apache', 'server')[0]).toMatchObject({
      announced: null,
      precise: false,
    });
    expect(softwareFromHeader('nginx/1.18.0', 'server')[0]).toMatchObject({
      cve: { kind: 'nvd', cpe: 'f5:nginx' },
      distro: false,
    });
    expect(softwareFromHeader('Netlify', 'server')[0]).toMatchObject({
      role: 'host',
    });
    const powered = softwareFromHeader(
      'Express, Next.js 14.2.3',
      'x-powered-by',
    );
    expect(powered.map((item) => [item.id, item.version])).toEqual([
      ['express', null],
      ['nextjs', '14.2.3'],
    ]);
    expect(powered[1]?.cve).toEqual({
      kind: 'osv',
      ecosystem: 'npm',
      name: 'next',
    });
    expect(softwareFromHeader('Mystère/1.0\u0007', 'server')[0]).toMatchObject({
      id: 'autre:mystère',
      cve: null,
    });
  });

  it('lit la balise generator', () => {
    expect(softwareFromGenerator('WordPress 6.4.2', 'generator')).toMatchObject(
      {
        id: 'wordpress',
        version: '6.4.2',
        precise: true,
        cve: { kind: 'nvd', cpe: 'wordpress:wordpress' },
      },
    );
    expect(softwareFromGenerator('WordPress', 'generator')).toMatchObject({
      version: null,
      precise: false,
    });
    expect(softwareFromGenerator('Hugo 0.120.4', 'generator')).toMatchObject({
      id: 'hugo',
      role: 'tool',
      cve: null,
    });
    expect(softwareFromGenerator('   ', 'generator')).toBeNull();
    expect(cpeName('f5:nginx', '1.18.0')).toBe(
      'cpe:2.3:a:f5:nginx:1.18.0:*:*:*:*:*:*:*',
    );
  });

  it('extrait les scripts exécutables et la balise generator', () => {
    const page = extractScripts(
      `<!-- <script src="/vieux.js"></script> -->
      <base href="https://cdn.test/lib/">
      <meta name="Generator" content="Hugo 0.120.4">
      <script src="a.js"></script>
      <script src="a.js"></script>
      <script type="module" src="/b.js"></script>
      <script type="application/ld+json">{"a":1}</script>
      <script type="text/template" src="c.js"></script>
      <script src="javascript:alert(1)"></script>
      <script>${JQUERY}</script>
      <style>.x{}</style>`,
      new URL(`${ORIGIN}/`),
    );
    expect(page.sources.map((url) => url.href)).toEqual([
      'https://cdn.test/lib/a.js',
      'https://cdn.test/b.js',
    ]);
    expect(page.inline).toEqual([JQUERY]);
    expect(page.generators).toEqual(['Hugo 0.120.4']);
  });
});

describe('réponses des bases', () => {
  it('lit OSV, NVD et le catalogue KEV avec prudence', () => {
    const jquery = parseOsvPage(OSV_JQUERY);
    expect(jquery?.vulns.map((item) => item.cves)).toEqual([
      ['CVE-2020-11022'],
      ['CVE-2020-11023'],
    ]);
    expect(jquery?.vulns[0]?.severity).toBe('medium');
    expect(parseOsvPage(OSV_EMPTY)).toEqual({ vulns: [], next: null });
    expect(parseOsvPage('pas du json')).toBeNull();
    expect(parseOsvPage('{"vulns":3}')).toBeNull();
    expect(
      parseOsvVuln({ id: 'GHSA-x', withdrawn: '2024-01-01T00:00:00Z' }),
    ).toBeNull();
    expect(
      parseNvdVuln({
        cve: { id: 'CVE-2020-0001', cveTags: [{ tags: ['disputed'] }] },
      }),
    ).toBeNull();
    expect(
      parseNvdVuln({ cve: { id: 'CVE-2020-0002', vulnStatus: 'Rejected' } }),
    ).toBeNull();
    expect(
      parseNvdVuln({
        cve: {
          id: 'CVE-2020-0003',
          metrics: {
            cvssMetricV40: [
              { type: 'Secondary', cvssData: { baseSeverity: 'LOW' } },
            ],
            cvssMetricV31: [
              { type: 'Primary', cvssData: { baseSeverity: 'CRITICAL' } },
            ],
          },
        },
      }),
    ).toMatchObject({ severity: 'low' });
    const kev = parseKev(KEV);
    expect(kev?.ok && kev.entries['CVE-2021-41773']).toBeTruthy();
    expect(parseKev('{"vulnerabilities":[]}')).toBeNull();
    expect(
      groupVulns([
        { id: 'GHSA-1', cves: ['CVE-2020-1'], severity: 'medium' },
        { id: 'CVE-2020-1', cves: ['CVE-2020-1'], severity: 'high' },
        { id: 'GHSA-2', cves: [], severity: 'low' },
      ]),
    ).toHaveLength(2);
  });
});

describe('exécution', () => {
  it('expose trois checks passifs', () => {
    expect(TECHNOLOGIES_CHECKS.map((item) => item.id)).toEqual([
      'securite.cve_logiciels',
      'securite.cve_scripts',
      'securite.technologies',
    ]);
    const registry = createRegistry(TECHNOLOGIES_CHECKS);
    expect(registry.list({ mode: 'active' })).toHaveLength(0);
    const weights: Record<string, number> = {
      'securite.cve_logiciels': 2,
      'securite.cve_scripts': 2,
      'securite.technologies': 1,
    };
    for (const item of TECHNOLOGIES_CHECKS) {
      expect(item.mode).toBe('passive');
      expect(item.domain).toBe('securite');
      expect(item.needs).toEqual(['http']);
      expect(item.weight).toBe(weights[item.id]);
      expect(item.timeoutMs).toBe(
        item.id === 'securite.technologies'
          ? TECHNOLOGIES_TIMEOUT_MS
          : CVE_TIMEOUT_MS,
      );
    }
    expect(nvdApiKey({ NVD_API_KEY: ' ' })).toBeUndefined();
    expect(nvdApiKey({})).toBeUndefined();
  });

  it('jQuery 3.4.1 : faille exploitée selon la CISA', async () => {
    const files = Object.fromEntries([js('/js/jquery.min.js', JQUERY)]);
    const web = site({
      page: html('<script src="/js/jquery.min.js"></script>'),
      files,
    });
    const script = scripted({
      'osv:jquery@3.4.1': ok(OSV_JQUERY),
      kev: ok(KEV),
    });
    const results = await audit(context(web.fetch, script.api));
    const scripts = expectResult(
      results['securite.cve_scripts'],
      'fail',
      'securite.cve_scripts.fail_kev',
    );
    expect(scripts.severity).toBe(4);
    expect(scripts.params).toEqual({ liste: 'jQuery 3.4.1', count: 2 });
    expect(scripts.measured).toMatchObject({
      vulnerable: [
        {
          name: 'jQuery 3.4.1',
          kev: ['CVE-2020-11023'],
          ids: ['CVE-2020-11022', 'CVE-2020-11023'],
        },
      ],
      signatures: { commit: SIGNATURES.commit, license: 'Apache-2.0' },
    });
    expectResult(
      results['securite.cve_logiciels'],
      'na',
      'securite.cve_logiciels.na_aucun',
    );
    const tech = expectResult(
      results['securite.technologies'],
      'pass',
      'securite.technologies.pass',
    );
    expect(tech.params).toEqual({ liste: 'jQuery 3.4.1' });
    expect(script.keys).toEqual(['osv:jquery@3.4.1', 'kev']);
    expect(web.fetched.filter((url) => url === `${ORIGIN}/`)).toHaveLength(1);
  });

  it('Bootstrap modéré, Lodash grave, rien pour une version sans faille', async () => {
    const run = async (body: string, version: string, reply: string) => {
      const files = Object.fromEntries([js('/app.js', body)]);
      const web = site({
        page: html('<script src="/app.js"></script>'),
        files,
      });
      const name = body === BOOTSTRAP ? 'bootstrap' : 'lodash';
      const script = scripted({
        [`osv:${name}@${version}`]: ok(reply),
        kev: ok(KEV),
      });
      const results = await audit(context(web.fetch, script.api));
      return { result: results['securite.cve_scripts'], keys: script.keys };
    };
    const bootstrap = await run(BOOTSTRAP, '3.3.7', OSV_BOOTSTRAP);
    const warn = expectResult(
      bootstrap.result,
      'warn',
      'securite.cve_scripts.warn',
    );
    expect(warn.params).toEqual({ liste: 'Bootstrap 3.3.7', count: 7 });
    expect(warn.severity).toBe(2);
    const lodash = await run(LODASH, '4.17.20', OSV_LODASH);
    const fail = expectResult(
      lodash.result,
      'fail',
      'securite.cve_scripts.fail',
    );
    expect(fail.severity).toBe(3);
    const clean = await run(LODASH, '4.17.20', OSV_EMPTY);
    const pass = expectResult(
      clean.result,
      'pass',
      'securite.cve_scripts.pass',
    );
    expect(pass.params).toEqual({ liste: 'Lodash 4.17.20' });
    expect(clean.keys).toEqual(['osv:lodash@4.17.20']);
  });

  it('ignore un script absent ou une page HTML, et ne compare pas un script non lu', async () => {
    const files: Record<string, SafeResponse | Error> = {
      [`${ORIGIN}/js/jquery-3.4.1.min.js`]: response({
        url: `${ORIGIN}/js/jquery-3.4.1.min.js`,
        status: 404,
        body: 'introuvable',
      }),
      [`${ORIGIN}/js/lodash-4.17.20.js`]: response({
        url: `${ORIGIN}/js/lodash-4.17.20.js`,
        headers: { 'content-type': 'text/plain' },
        body: `<!DOCTYPE html><p>${LODASH}</p>`,
      }),
    };
    const page = html(
      '<script src="/js/jquery-3.4.1.min.js"></script><script src="/js/lodash-4.17.20.js"></script>',
    );
    const api = scripted({});
    const missing = await audit(context(site({ page, files }).fetch, api.api));
    const none = expectResult(
      missing['securite.cve_scripts'],
      'na',
      'securite.cve_scripts.na_aucun',
    );
    expect(none.measured).toMatchObject({ scripts: { found: 2, missing: 2 } });
    expectResult(
      missing['securite.technologies'],
      'pass',
      'securite.technologies.pass_aucune',
    );
    const budget = new NetError('BUDGET_EXCEEDED', 'budget');
    const stopped = await audit(
      context(
        site({
          page: html('<script src="/js/jquery-3.4.1.min.js"></script>'),
          files: { [`${ORIGIN}/js/jquery-3.4.1.min.js`]: budget },
        }).fetch,
        api.api,
      ),
    );
    const untested = expectResult(
      stopped['securite.cve_scripts'],
      'untested',
      'securite.cve_scripts.untested_scripts',
    );
    expect(untested.measured).toMatchObject({
      scripts: { unread: 1, budgetStopped: true },
      unverified: ['jQuery 3.4.1'],
    });
    expect(api.calls).toHaveLength(0);
  });

  it('signale une lecture partielle et la limite de scripts', async () => {
    const tags = Array.from(
      { length: SCRIPT_LIMIT + 1 },
      (_, index) => `<script src="/s${index}.js"></script>`,
    ).join('');
    const files: Record<string, SafeResponse | Error> = {};
    for (let index = 0; index <= SCRIPT_LIMIT; index += 1) {
      const [url, res] = js(`/s${index}.js`, index === 0 ? LODASH : 'void 0;');
      files[url] = index === 1 ? new NetError('TIMEOUT', 'délai') : res;
    }
    const script = scripted({ 'osv:lodash@4.17.20': ok(OSV_EMPTY) });
    const results = await audit(
      context(site({ page: html(tags), files }).fetch, script.api),
    );
    const partial = expectResult(
      results['securite.cve_scripts'],
      'pass',
      'securite.cve_scripts.pass_partiel',
    );
    expect(partial.params).toEqual({ liste: 'Lodash 4.17.20', count: 2 });
    expect(partial.measured).toMatchObject({
      scripts: { found: 11, read: 9, unread: 1, skipped: 1 },
    });
  });

  it('ne signale aucune faille sans version comparable', async () => {
    const files = Object.fromEntries([
      js('/a.js', '/*! jQuery v3.4 */'),
      js('/b.js', 'var Prototype={Version:"1.7.3"};'),
    ]);
    const web = site({
      page: html('<script src="/a.js"></script><script src="/b.js"></script>'),
      headers: { server: 'Apache/2.4' },
      files,
    });
    const script = scripted({});
    const results = await audit(context(web.fetch, script.api));
    const scripts = expectResult(
      results['securite.cve_scripts'],
      'na',
      'securite.cve_scripts.na_version',
    );
    expect(scripts.params?.liste).toContain('jQuery 3.4');
    const software = expectResult(
      results['securite.cve_logiciels'],
      'na',
      'securite.cve_logiciels.na_version',
    );
    expect(software.params).toEqual({ liste: 'Apache 2.4' });
    const tech = expectResult(
      results['securite.technologies'],
      'warn',
      'securite.technologies.warn',
    );
    expect(tech.params).toEqual({ liste: 'Apache 2.4' });
    expect(tech.severity).toBe(1);
    expect(script.calls).toHaveLength(0);
  });

  it('Apache 2.4.49 : faille exploitée ; nginx d’une distribution : prudence', async () => {
    const apacheCpe = cpeName('apache:http_server', '2.4.49');
    const nginxCpe = cpeName('f5:nginx', '1.18.0');
    const script = scripted({
      [`nvd:${apacheCpe}`]: ok(NVD_APACHE),
      [`nvd:${nginxCpe}`]: ok(NVD_NGINX),
      kev: ok(KEV),
    });
    const cache = memoryDayCache();
    const apache = await audit(
      context(site({ headers: { server: 'Apache/2.4.49' } }).fetch, script.api),
      { cache },
    );
    const fail = expectResult(
      apache['securite.cve_logiciels'],
      'fail',
      'securite.cve_logiciels.fail_kev',
    );
    expect(fail.params).toEqual({ liste: 'Apache 2.4.49', count: 5 });
    expect(fail.severity).toBe(4);
    expect(fail.impact).toBe(3);
    const distro = await audit(
      context(
        site({ headers: { server: 'nginx/1.18.0 (Ubuntu)' } }).fetch,
        script.api,
      ),
      { cache },
    );
    const warn = expectResult(
      distro['securite.cve_logiciels'],
      'warn',
      'securite.cve_logiciels.warn_distribution',
    );
    expect(warn.severity).toBe(3);
    expect(warn.params).toEqual({ liste: 'nginx 1.18.0', count: 6 });
    expect(script.keys).toEqual([`nvd:${apacheCpe}`, 'kev', `nvd:${nginxCpe}`]);
    expectResult(
      distro['securite.cve_scripts'],
      'na',
      'securite.cve_scripts.na_aucun',
    );
  });

  it('juge la gravité sans catalogue KEV, et la distribution sans gravité', async () => {
    const php = cpeName('php:php', '8.1.2');
    const openssl = cpeName('openssl:openssl', '1.1.1k');
    const script = scripted({
      [`nvd:${php}`]: ok(nvd('CVE-2024-0001', 'MEDIUM')),
      [`nvd:${openssl}`]: ok(nvd('CVE-2024-0002', 'HIGH')),
      kev: { status: 503, text: '' },
    });
    const medium = await audit(
      context(
        site({ headers: { 'x-powered-by': 'PHP/8.1.2' } }).fetch,
        script.api,
      ),
    );
    expectResult(
      medium['securite.cve_logiciels'],
      'warn',
      'securite.cve_logiciels.warn',
    );
    const high = await audit(
      context(
        site({ headers: { server: 'OpenSSL/1.1.1k' } }).fetch,
        script.api,
      ),
    );
    const fail = expectResult(
      high['securite.cve_logiciels'],
      'fail',
      'securite.cve_logiciels.fail',
    );
    expect(fail.measured).toMatchObject({ kev: 'indisponible' });
    const mild = scripted({
      [`nvd:${php}`]: ok(nvd('CVE-2024-0001', 'MEDIUM')),
      kev: ok(KEV),
    });
    const backport = await audit(
      context(
        site({ headers: { 'x-powered-by': 'PHP/8.1.2-1ubuntu2.14' } }).fetch,
        mild.api,
      ),
    );
    const warn = expectResult(
      backport['securite.cve_logiciels'],
      'warn',
      'securite.cve_logiciels.warn_distribution',
    );
    expect(warn.severity).toBe(2);
  });

  it('ne compare ni l’hébergeur ni l’outil de construction', async () => {
    const script = scripted({});
    const hosted = await audit(
      context(
        site({
          headers: { server: 'Netlify' },
          page: html('<meta name="generator" content="Hugo 0.120.4">'),
        }).fetch,
        script.api,
      ),
    );
    const tool = expectResult(
      hosted['securite.cve_logiciels'],
      'na',
      'securite.cve_logiciels.na_outil',
    );
    expect(tool.params).toEqual({ liste: 'Hugo' });
    const tech = expectResult(
      hosted['securite.technologies'],
      'pass',
      'securite.technologies.pass',
    );
    expect(tech.params).toEqual({ liste: 'Netlify, Hugo 0.120.4' });
    const host = await audit(
      context(site({ headers: { server: 'GitHub.com' } }).fetch, script.api),
    );
    const managed = expectResult(
      host['securite.cve_logiciels'],
      'na',
      'securite.cve_logiciels.na_hebergeur',
    );
    expect(managed.params).toEqual({ liste: 'GitHub Pages' });
    expect(script.calls).toHaveLength(0);
  });

  it('plafonne NVD et signale les logiciels non vérifiés', async () => {
    const routes: Record<string, Route> = {};
    for (const [cpe, version] of [
      ['apache:http_server', '2.4.62'],
      ['php:php', '8.3.12'],
      ['openssl:openssl', '3.0.15'],
      ['f5:nginx', '1.27.2'],
    ] as const) {
      routes[`nvd:${cpeName(cpe, version)}`] = ok(NVD_EMPTY);
    }
    const script = scripted(routes);
    const results = await audit(
      context(
        site({
          headers: {
            server: 'Apache/2.4.62 PHP/8.3.12 OpenSSL/3.0.15 nginx/1.27.2',
          },
          page: html('<meta name="generator" content="WordPress 6.6.2">'),
        }).fetch,
        script.api,
      ),
    );
    const partial = expectResult(
      results['securite.cve_logiciels'],
      'pass',
      'securite.cve_logiciels.pass_partiel',
    );
    expect(partial.params?.count).toBe(1);
    expect(script.calls).toHaveLength(4);
    expect(script.keys).not.toContain('kev');
    const single = scripted({
      [`nvd:${cpeName('wordpress:wordpress', '6.6.2')}`]: ok(NVD_EMPTY),
    });
    const wordpress = await audit(
      context(
        site({
          page: html('<meta name="generator" content="WordPress 6.6.2">'),
        }).fetch,
        single.api,
      ),
    );
    const pass = expectResult(
      wordpress['securite.cve_logiciels'],
      'pass',
      'securite.cve_logiciels.pass',
    );
    expect(pass.params).toEqual({ liste: 'WordPress 6.6.2' });
    expectResult(
      wordpress['securite.technologies'],
      'pass',
      'securite.technologies.pass',
    );
  });

  it('reste non testé si la base refuse ou ne répond pas', async () => {
    const jquery = Object.fromEntries([js('/j.js', JQUERY)]);
    const page = html('<script src="/j.js"></script>');
    const nginx = `nvd:${cpeName('f5:nginx', '1.18.0')}`;
    const quota = scripted({
      'osv:jquery@3.4.1': [
        { status: 429, text: '' },
        { status: 429, text: '' },
      ],
      [nginx]: { status: 403, text: '' },
    });
    const limited = await audit(
      context(
        site({ page, files: jquery, headers: { server: 'nginx/1.18.0' } })
          .fetch,
        quota.api,
      ),
    );
    expectResult(
      limited['securite.cve_scripts'],
      'untested',
      'securite.cve_scripts.quota',
    );
    expectResult(
      limited['securite.cve_logiciels'],
      'untested',
      'securite.cve_logiciels.quota',
    );
    expect(quota.keys.filter((key) => key === nginx)).toHaveLength(1);
    const down = scripted({
      'osv:jquery@3.4.1': new Error('réseau'),
      [nginx]: [
        { status: 503, text: '' },
        { status: 200, text: 'pas du json' },
      ],
    });
    const failed = await audit(
      context(
        site({ page, files: jquery, headers: { server: 'nginx/1.18.0' } })
          .fetch,
        down.api,
      ),
    );
    expectResult(
      failed['securite.cve_scripts'],
      'untested',
      'securite.cve_scripts.untested_source',
    );
    expectResult(
      failed['securite.cve_logiciels'],
      'untested',
      'securite.cve_logiciels.untested_source',
    );
    expect(down.keys.filter((key) => key === 'osv:jquery@3.4.1')).toHaveLength(
      2,
    );
    const bare = await audit(
      context(
        site({ page, files: jquery, headers: { server: 'nginx/1.18.0' } })
          .fetch,
        undefined,
      ),
    );
    expectResult(
      bare['securite.cve_scripts'],
      'untested',
      'securite.cve_scripts.missing_api',
    );
    expectResult(
      bare['securite.cve_logiciels'],
      'untested',
      'securite.cve_logiciels.missing_api',
    );
  });

  it('reste non testé si la page ne répond pas', async () => {
    for (const web of [
      site({ status: 500 }),
      site({ homeError: new Error('réseau') }),
    ]) {
      const results = await audit(context(web.fetch, scripted({}).api));
      expectResult(
        results['securite.technologies'],
        'untested',
        'securite.technologies.untested',
      );
      expectResult(
        results['securite.cve_scripts'],
        'untested',
        'securite.cve_scripts.untested_page',
      );
      expectResult(
        results['securite.cve_logiciels'],
        'untested',
        'securite.cve_logiciels.untested_page',
      );
    }
  });

  it('réutilise les réponses le même jour UTC, puis relit le lendemain', async () => {
    const files = Object.fromEntries([js('/j.js', JQUERY)]);
    const page = html('<script src="/j.js"></script>');
    const script = scripted({
      'osv:jquery@3.4.1': [ok(OSV_JQUERY), ok(OSV_JQUERY)],
      kev: [ok(KEV), ok(KEV)],
    });
    const cache = memoryDayCache();
    const later = new Date('2026-10-24T23:59:00.000Z');
    const next = new Date('2026-10-25T00:01:00.000Z');
    for (const now of [NOW, later]) {
      const results = await audit(
        context(site({ page, files }).fetch, script.api, now),
        { cache },
      );
      expect(results['securite.cve_scripts']?.messageKey).toBe(
        'securite.cve_scripts.fail_kev',
      );
    }
    expect(script.keys).toEqual(['osv:jquery@3.4.1', 'kev']);
    await audit(context(site({ page, files }).fetch, script.api, next), {
      cache,
    });
    expect(script.keys).toEqual([
      'osv:jquery@3.4.1',
      'kev',
      'osv:jquery@3.4.1',
      'kev',
    ]);
  });

  it('lit le catalogue KEV une fois par audit, et ne mémorise pas un échec', async () => {
    const files = Object.fromEntries([js('/j.js', JQUERY)]);
    const page = html('<script src="/j.js"></script>');
    const script = scripted({
      'osv:jquery@3.4.1': ok(OSV_JQUERY),
      [`nvd:${cpeName('apache:http_server', '2.4.49')}`]: ok(NVD_APACHE),
      kev: [{ status: 404, text: '' }, ok(KEV)],
    });
    const cache = memoryDayCache();
    const first = await audit(
      context(
        site({ page, files, headers: { server: 'Apache/2.4.49' } }).fetch,
        script.api,
      ),
      { cache },
    );
    expectResult(
      first['securite.cve_scripts'],
      'warn',
      'securite.cve_scripts.warn',
    );
    expect(first['securite.cve_logiciels']?.messageKey).toBe(
      'securite.cve_logiciels.fail',
    );
    expect(script.keys.filter((key) => key === 'kev')).toHaveLength(1);
    const second = await audit(
      context(
        site({ page, files, headers: { server: 'Apache/2.4.49' } }).fetch,
        script.api,
      ),
      { cache },
    );
    expect(second['securite.cve_scripts']?.messageKey).toBe(
      'securite.cve_scripts.fail_kev',
    );
    expect(script.keys.filter((key) => key === 'kev')).toHaveLength(2);
    expect(script.keys.filter((key) => key.startsWith('nvd:'))).toHaveLength(1);
  });

  it('envoie la clé NVD en en-tête, jamais dans l’adresse ni le résultat', async () => {
    const cpe = cpeName('f5:nginx', '1.18.0');
    const script = scripted({ [`nvd:${cpe}`]: ok(NVD_NGINX), kev: ok(KEV) });
    const results = await audit(
      context(site({ headers: { server: 'nginx/1.18.0' } }).fetch, script.api),
      { nvdApiKey: () => SECRET },
    );
    expect(results['securite.cve_logiciels']?.messageKey).toBe(
      'securite.cve_logiciels.fail_kev',
    );
    const call = script.calls.find((item) => item.url.hostname === NVD_HOST);
    expect(call?.headers).toEqual({ apiKey: SECRET });
    expect(call?.url.href).not.toContain(SECRET);
    expect(call?.url.searchParams.get('noRejected')).toBe('');
    expect(JSON.stringify(results)).not.toContain(SECRET);
    const kevCall = script.calls.find((item) => item.url.hostname === KEV_HOST);
    expect(kevCall?.headers).toBeUndefined();
    expect(kevCall?.url.pathname).toBe(
      '/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    );
  });

  it('ne sort pas du réseau autrement que par ctx.net', () => {
    const dir = fileURLToPath(
      new URL('../checks/securite/technologies/', import.meta.url),
    );
    const source = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(`${dir}${name}`, 'utf8'))
      .join('\n');
    expect(source).toContain('ctx.net.fetch(');
    expect(source).not.toMatch(/(?<!net\.)\bfetch\s*\(/);
    expect(source).not.toMatch(/node:(http|https|net|tls|dns)/);
    expect(source).not.toContain('apps/web');
  });
});

describe('texte, fiches et méthode', () => {
  it('reste prudent sur chaque alerte de faille', () => {
    for (const [key, template] of Object.entries(fr)) {
      if (!/^securite\.cve_(scripts|logiciels)\.(fail|warn)/.test(key))
        continue;
      expect(template, key).toContain('possiblement vulnérable');
    }
  });

  it('chaque check a une fiche, et la grille est dans la méthode', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    const methode = readFileSync(
      fileURLToPath(new URL('../../../docs/METHODE.md', import.meta.url)),
      'utf8',
    );
    for (const name of ['OSV', 'NVD', 'KEV', 'retire.js']) {
      expect(methode).toContain(name);
    }
    for (const item of TECHNOLOGIES_CHECKS) {
      const sheet = sheets.get(item.id);
      expect(sheet, item.id).toBeTruthy();
      if (!sheet) continue;
      expect(sheet.variants.github_pages).toContain('Limite');
      expect(sheet.variants.github_pages).toContain('Alternative');
      expect(sheet.variants.generic.length).toBeGreaterThan(20);
      expect(
        sheet.why.split(/[.!?…]+/).filter((part) => part.trim() !== ''),
      ).toHaveLength(1);
      for (const text of [
        sheet.title,
        sheet.why,
        ...Object.values(sheet.variants),
      ]) {
        const prose = text.replace(/```[\s\S]*?```/g, ' ');
        const issues = lintText(prose, `${item.id}.md`);
        expect(failureCount(issues), prose).toBe(0);
        expect(
          issues.filter((issue) => issue.rule === 'sentence-length'),
          prose,
        ).toEqual([]);
      }
      expect(methode).toContain(`| ${item.id} | ${item.weight} |`);
    }
  });

  it('chaque clé est produite par un test', () => {
    const keys = Object.keys(fr).filter((key) =>
      /^securite\.(technologies|cve_scripts|cve_logiciels)\./.test(key),
    );
    expect(keys.length).toBe(30);
    expect(keys.filter((key) => !seen.has(key)).sort()).toEqual([]);
  });
});
