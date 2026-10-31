import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createRequestBudget,
  type DohResolver,
  type ExternalApi,
  type ExternalRequest,
  type SafeFetch,
  type SafeResponse,
  type TlsProbe,
} from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { fr, type MessageKey } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import { memoryDayCache } from '../checks/performance/cache.js';
import type {
  PsiBundle,
  PsiStrategyResult,
} from '../checks/performance/types.js';
import {
  PERFORMANCE_CHECK_TIMEOUT_MS,
  PSI_SHARED_KEY,
} from '../checks/performance/types.js';
import { parseHtml } from '../checks/seo/html.js';
import { createSeoChecks, SEO_CHECKS } from '../checks/seo/index.js';
import {
  googlebotAllowed,
  parseRobots,
  ruleMatches,
} from '../checks/seo/robots-parse.js';
import { parseSitemap } from '../checks/seo/sitemap-parse.js';
import { FIXES_FR_DIR, fileFixStore } from '../src/fixes-fs.js';
import {
  type Check,
  type CheckResult,
  createRegistry,
  createSharedArtifacts,
  type GscSnapshot,
  loadFixes,
  type RunContext,
  runChecks,
  type SearchConsolePort,
  scoreDomain,
} from '../src/index.js';

const NOW = new Date('2026-10-23T12:00:00.000Z');
const ORIGIN = 'https://exemple.test';
const FIXTURES = fileURLToPath(new URL('../fixtures/seo/', import.meta.url));
const PSI = fileURLToPath(new URL('../fixtures/performance/', import.meta.url));
const SECRET = 'clef-test-seo';
const TITLE = "Cabinet d'ostéopathie à Lyon";
const DESC =
  'Le cabinet reçoit sur rendez-vous et explique le déroulé de la première séance.';
const seen = new Set<string>();

const noDns: DohResolver = {
  query: () => Promise.reject(new Error('DNS non disponible en test')),
  addresses: () => Promise.reject(new Error('DNS non disponible en test')),
};
const noTls: TlsProbe = () =>
  Promise.reject(new Error('TLS non disponible en test'));

function fixture(name: string): string {
  return readFileSync(`${FIXTURES}${name}`, 'utf8');
}

function response(init: {
  url: string;
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  redirects?: string[];
}): SafeResponse {
  const headers = new Headers(init.headers);
  const body = init.body ?? '';
  return {
    url: init.url,
    status: init.status ?? 200,
    headers,
    body: new TextEncoder().encode(body),
    transferBytes: new TextEncoder().encode(body).length,
    ip: '93.184.216.34',
    redirects: init.redirects ?? [],
    text: () => body,
  };
}

function htmlResponse(url: string, body: string, status = 200): SafeResponse {
  return response({
    url,
    status,
    body,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function textResponse(
  url: string,
  body: string,
  type = 'text/plain; charset=utf-8',
  status = 200,
): SafeResponse {
  return response({
    url,
    status,
    body,
    headers: { 'content-type': type },
  });
}

function document(head: string): string {
  return `<!doctype html><html lang="fr"><head>${head}</head><body><p>Bonjour</p></body></html>`;
}

function strategy(
  name: 'mobile' | 'desktop',
  seo: number | null,
): PsiStrategyResult {
  const empty = { score: null, numericValue: null };
  return {
    strategy: name,
    categories: {
      performance: null,
      accessibility: null,
      'best-practices': null,
      seo,
    },
    audits: {
      'total-byte-weight': empty,
      'uses-long-cache-ttl': empty,
      'uses-text-compression': empty,
    },
    lighthouseVersion: '12.6.1',
  };
}

function bundle(mobile: number | null, desktop: number | null): PsiBundle {
  return {
    ok: true,
    mobile: mobile === null ? null : strategy('mobile', mobile),
    desktop: desktop === null ? null : strategy('desktop', desktop),
    fetchedOn: '2026-10-23',
  };
}

function context(
  options: {
    target?: string;
    scope?: 'origin' | 'path';
    pages?: Record<string, SafeResponse>;
    fallback?: (url: URL) => SafeResponse;
    api?: ExternalApi;
    gsc?: SearchConsolePort;
  } = {},
): { ctx: RunContext; calls: string[] } {
  const calls: string[] = [];
  const pages = options.pages ?? {};
  const fetch: SafeFetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url.href);
    const found = pages[url.href];
    if (found) return found;
    if (options.fallback) return options.fallback(url);
    throw new Error(`fetch inattendu ${url.href}`);
  };
  return {
    calls,
    ctx: {
      target: {
        url: new URL(options.target ?? `${ORIGIN}/`),
        scope: options.scope ?? 'origin',
        hosting: 'other',
      },
      verified: false,
      net: {
        fetch,
        dns: noDns,
        tls: noTls,
        ...(options.api ? { api: options.api } : {}),
        ...(options.gsc ? { gsc: options.gsc } : {}),
      },
      shared: createSharedArtifacts(),
      budget: createRequestBudget({ perHostIntervalMs: 0 }),
      now: () => NOW,
    },
  };
}

function goodGsc(): SearchConsolePort {
  return {
    async snapshot() {
      return {
        sites: 'ok',
        property: 'sc-domain:exemple.test',
        sitemaps: {
          ok: true,
          entries: [
            {
              path: `${ORIGIN}/sitemap-ok.xml`,
              errors: 0,
              warnings: 0,
              pending: false,
              isIndex: false,
              submitted: 10,
              indexed: 10,
            },
          ],
        },
        inspection: { ok: true, verdict: 'PASS' },
      };
    },
  };
}

async function seedPsi(ctx: RunContext, value: PsiBundle): Promise<void> {
  await ctx.shared.get(PSI_SHARED_KEY, async () => value);
}

const byId = Object.fromEntries(SEO_CHECKS.map((check) => [check.id, check]));

function check(id: string): Check {
  const found = byId[id];
  if (!found) throw new Error(id);
  return found;
}

async function run(
  id: string,
  ctx: RunContext,
  available: readonly string[] = ['http', 'psi'],
): Promise<CheckResult> {
  const [outcome] = await runChecks([check(id)], ctx, {
    available: available as Check['needs'],
    concurrency: 1,
  });
  if (!outcome) throw new Error(id);
  return outcome.result;
}

function expectResult(
  result: CheckResult,
  status: CheckResult['status'],
  key: string,
): void {
  expect(result.status, key).toBe(status);
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
}

function goodPages(): Record<string, SafeResponse> {
  return {
    [`${ORIGIN}/`]: htmlResponse(`${ORIGIN}/`, fixture('home-good.html')),
    [`${ORIGIN}/contact`]: htmlResponse(`${ORIGIN}/contact`, '<p>Contact</p>'),
    [`${ORIGIN}/robots.txt`]: textResponse(
      `${ORIGIN}/robots.txt`,
      fixture('robots-allow.txt'),
    ),
    [`${ORIGIN}/sitemap-ok.xml`]: textResponse(
      `${ORIGIN}/sitemap-ok.xml`,
      fixture('sitemap-ok.xml'),
      'application/xml',
    ),
  };
}

describe('registre SEO', () => {
  it('expose douze checks passifs, dans l’ordre des identifiants', () => {
    expect(SEO_CHECKS.map((item) => item.id)).toEqual([
      'seo.canonical',
      'seo.description',
      'seo.gsc_indexed',
      'seo.gsc_inspection',
      'seo.gsc_sitemaps',
      'seo.hreflang',
      'seo.jsonld',
      'seo.lighthouse',
      'seo.noindex',
      'seo.robots',
      'seo.sitemap',
      'seo.title',
    ]);
    const registry = createRegistry(SEO_CHECKS);
    expect(registry.list({ domain: 'seo' })).toHaveLength(12);
    expect(registry.list({ mode: 'active' })).toHaveLength(0);
    for (const item of SEO_CHECKS) {
      expect(item.mode).toBe('passive');
      expect(item.domain).toBe('seo');
      expect(item.needs).toEqual(
        item.id === 'seo.lighthouse'
          ? ['psi']
          : item.id.startsWith('seo.gsc_')
            ? ['gsc']
            : ['http'],
      );
    }
    expect(check('seo.lighthouse').timeoutMs).toBe(
      PERFORMANCE_CHECK_TIMEOUT_MS,
    );
    expect(check('seo.lighthouse').weight).toBe(3);
    expect(check('seo.sitemap').timeoutMs).toBe(60_000);
  });

  it('ne joint pas le réseau hors de ctx.net', () => {
    const dir = fileURLToPath(new URL('../checks/seo/', import.meta.url));
    const source = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(`${dir}/${name}`, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(
      /node:https|node:http|globalThis\.fetch|createExternalApi|process\.env|GOOGLE_API_KEY/,
    );
  });
});

describe('analyse des fichiers', () => {
  it('lit les fixtures sans réseau', () => {
    const names = readdirSync(FIXTURES).sort();
    expect(names).toEqual([
      'home-good.html',
      'home-noindex.html',
      'robots-allow.txt',
      'robots-block.txt',
      'robots-html.html',
      'sitemap-bad.xml',
      'sitemap-empty.xml',
      'sitemap-index.xml',
      'sitemap-many.xml',
      'sitemap-ok.xml',
    ]);
    const home = parseHtml(fixture('home-good.html'));
    expect(home.titles).toEqual([TITLE]);
    expect(home.descriptions[0]).toBe(DESC);
    expect(TITLE.length).toBeGreaterThanOrEqual(15);
    expect(DESC.length).toBeGreaterThanOrEqual(50);
    expect(DESC.length).toBeLessThanOrEqual(160);
    expect(parseSitemap(fixture('sitemap-ok.xml'))).toMatchObject({
      kind: 'urlset',
      total: 2,
    });
    expect(parseSitemap(fixture('sitemap-index.xml'))?.kind).toBe(
      'sitemapindex',
    );
    expect(parseSitemap(fixture('sitemap-bad.xml'))).toBeNull();
    expect(parseSitemap(fixture('sitemap-empty.xml'))).toMatchObject({
      total: 0,
    });
    expect(parseSitemap(fixture('sitemap-many.xml'))?.total).toBe(21);
    expect(
      googlebotAllowed(
        parseRobots(fixture('robots-allow.txt')),
        new URL(`${ORIGIN}/`),
      ),
    ).toBe(true);
    expect(
      googlebotAllowed(
        parseRobots(fixture('robots-block.txt')),
        new URL(`${ORIGIN}/`),
      ),
    ).toBe(false);
  });

  it('applique la règle la plus longue, Allow à égalité', () => {
    expect(ruleMatches('/fish', '/fish.html')).toBe(true);
    expect(ruleMatches('/fish$', '/fish')).toBe(true);
    expect(ruleMatches('/fish$', '/fish.html')).toBe(false);
    expect(ruleMatches('/*.pdf$', '/a.pdf')).toBe(true);
    const file = parseRobots(
      'User-agent: *\nDisallow: /private\nAllow: /private/ok\n',
    );
    expect(googlebotAllowed(file, new URL(`${ORIGIN}/private/ok`))).toBe(true);
    expect(googlebotAllowed(file, new URL(`${ORIGIN}/private/no`))).toBe(false);
    const tie = parseRobots(
      'User-agent: *\nDisallow: /secret$\nAllow: /secret$\n',
    );
    expect(googlebotAllowed(tie, new URL(`${ORIGIN}/secret`))).toBe(true);
    const bot = parseRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /\n',
    );
    expect(googlebotAllowed(bot, new URL(`${ORIGIN}/`))).toBe(true);
  });
});

describe('page entière', () => {
  it('réussit le lot sur les fixtures, et partage les lectures', async () => {
    const { ctx, calls } = context({ pages: goodPages(), gsc: goodGsc() });
    await seedPsi(ctx, bundle(1, 1));
    const outcomes = await runChecks(SEO_CHECKS, ctx, {
      available: ['http', 'psi', 'gsc'],
      concurrency: 4,
    });
    for (const outcome of outcomes) {
      expectResult(outcome.result, 'pass', `${outcome.checkId}.pass`);
    }
    expect(scoreDomain('seo', outcomes).score).toBe(100);
    expect(
      calls.filter((href) => href === `${ORIGIN}/robots.txt`),
    ).toHaveLength(1);
    expect(calls.filter((href) => href === `${ORIGIN}/`)).toHaveLength(2);
    expect(calls).toContain(`${ORIGIN}/sitemap-ok.xml`);
    expect(calls).toContain(`${ORIGIN}/contact`);
    expect(calls.some((href) => href.includes('autre.test'))).toBe(false);
  });

  it('laisse robots et le plan hors du chemin, sans les demander', async () => {
    const { ctx, calls } = context({
      scope: 'path',
      target: 'https://solopaps.github.io/Projet-Site-Artiste/',
      pages: {
        'https://solopaps.github.io/Projet-Site-Artiste/': htmlResponse(
          'https://solopaps.github.io/Projet-Site-Artiste/',
          fixture('home-good.html').replaceAll(
            `${ORIGIN}/`,
            'https://solopaps.github.io/Projet-Site-Artiste/',
          ),
        ),
      },
      gsc: goodGsc(),
    });
    await seedPsi(ctx, bundle(1, 1));
    const outcomes = await runChecks(SEO_CHECKS, ctx, {
      available: ['http', 'psi', 'gsc'],
    });
    const by = Object.fromEntries(
      outcomes.map((item) => [item.checkId, item.result]),
    );
    expectResult(by['seo.robots'] as CheckResult, 'na', 'seo.robots.na_scope');
    expectResult(
      by['seo.sitemap'] as CheckResult,
      'na',
      'seo.sitemap.na_scope',
    );
    expect(calls.some((href) => href.endsWith('/robots.txt'))).toBe(false);
    expect(calls.some((href) => href.endsWith('/sitemap.xml'))).toBe(false);
    const score = scoreDomain('seo', outcomes);
    expect(score.score).toBe(100);
    expect(score.totalWeight).toBe(18);
  });
});

describe('seo.lighthouse', () => {
  it('lit la catégorie SEO du lot partagé, sans second appel', async () => {
    const calls: ExternalRequest[] = [];
    const api: ExternalApi = {
      request: async (input) => {
        calls.push(input);
        throw new Error('appel inattendu');
      },
    };
    const { ctx } = context({ api });
    await seedPsi(ctx, bundle(0.91, 0.92));
    const result = await run('seo.lighthouse', ctx);
    expectResult(result, 'pass', 'seo.lighthouse.pass');
    expect(result.params).toEqual({ mobile: 91, desktop: 92 });
    expect(result.score).toBe(0.91);
    expect(calls).toHaveLength(0);
  });

  it('charge le lot PSI de PART-07 une seule fois', async () => {
    const calls: ExternalRequest[] = [];
    const api: ExternalApi = {
      async request(input) {
        calls.push(input);
        const strategyName = input.url.searchParams.get('strategy');
        const name =
          strategyName === 'desktop' ? 'psi-desktop.json' : 'psi-mobile.json';
        return { status: 200, text: readFileSync(`${PSI}${name}`, 'utf8') };
      },
    };
    const cache = memoryDayCache();
    const checks = createSeoChecks({ apiKey: () => SECRET, cache });
    const lighthouse = checks.find((item) => item.id === 'seo.lighthouse');
    if (!lighthouse) throw new Error('lighthouse');
    const { ctx } = context({ api });
    const [first] = await runChecks([lighthouse], ctx, {
      available: ['http', 'psi'],
    });
    const [second] = await runChecks([lighthouse], ctx, {
      available: ['http', 'psi'],
    });
    expectResult(first?.result as CheckResult, 'pass', 'seo.lighthouse.pass');
    expect(first?.result.params).toEqual({ mobile: 91, desktop: 92 });
    expect(second?.result.score).toBe(0.91);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url.searchParams.getAll('category')).toContain('seo');
    expect(JSON.stringify(first?.result)).not.toContain(SECRET);
    const again = context({ api });
    await runChecks([lighthouse], again.ctx, { available: ['http', 'psi'] });
    expect(calls).toHaveLength(2);
  });

  it('note les seuils, le manque et les échecs de source', async () => {
    const warn = context();
    await seedPsi(warn.ctx, bundle(0.62, 0.7));
    expectResult(
      await run('seo.lighthouse', warn.ctx),
      'warn',
      'seo.lighthouse.warn',
    );
    const fail = context();
    await seedPsi(fail.ctx, bundle(0.32, 0.4));
    const failed = await run('seo.lighthouse', fail.ctx);
    expectResult(failed, 'fail', 'seo.lighthouse.fail');
    expect(failed.params).toEqual({ mobile: 32, desktop: 40 });

    const high = context();
    await seedPsi(high.ctx, bundle(0.91, null));
    const partial = await run('seo.lighthouse', high.ctx);
    expectResult(partial, 'warn', 'seo.lighthouse.partial');
    expect(partial.params).toEqual({ score: 91 });

    const low = context();
    await seedPsi(low.ctx, bundle(0.4, null));
    const partialFail = await run('seo.lighthouse', low.ctx);
    expectResult(partialFail, 'fail', 'seo.lighthouse.partial');
    expect(partialFail.params).toEqual({ score: 40 });

    const absent = context();
    await seedPsi(absent.ctx, {
      ok: true,
      mobile: strategy('mobile', null),
      desktop: strategy('desktop', null),
      fetchedOn: '2026-10-23',
    });
    expectResult(
      await run('seo.lighthouse', absent.ctx),
      'untested',
      'seo.lighthouse.absent',
    );

    const missing = context();
    expectResult(
      await run('seo.lighthouse', missing.ctx),
      'untested',
      'seo.lighthouse.missing_key',
    );
    const quota = context();
    await seedPsi(quota.ctx, { ok: false, reason: 'quota', status: 429 });
    expectResult(
      await run('seo.lighthouse', quota.ctx),
      'untested',
      'seo.lighthouse.quota',
    );
    const error = context();
    await seedPsi(error.ctx, { ok: false, reason: 'error', status: 500 });
    expectResult(
      await run('seo.lighthouse', error.ctx),
      'untested',
      'seo.lighthouse.error',
    );

    const skipped = await run('seo.lighthouse', context().ctx, ['http']);
    expect(skipped.reason).toBe('reason.missing_source');
  });

  it('traduit un quota 429 en non testé', async () => {
    const calls: ExternalRequest[] = [];
    const api: ExternalApi = {
      async request(input) {
        calls.push(input);
        return {
          status: 429,
          text: readFileSync(`${PSI}psi-quota.json`, 'utf8'),
        };
      },
    };
    const lighthouse = createSeoChecks({
      apiKey: () => SECRET,
      cache: memoryDayCache(),
    }).find((item) => item.id === 'seo.lighthouse');
    if (!lighthouse) throw new Error('lighthouse');
    const { ctx } = context({ api });
    const [outcome] = await runChecks([lighthouse], ctx, {
      available: ['http', 'psi'],
    });
    expectResult(
      outcome?.result as CheckResult,
      'untested',
      'seo.lighthouse.quota',
    );
    expect(calls.length).toBeGreaterThan(0);
    expect(JSON.stringify(outcome?.result)).not.toContain(SECRET);
  });
});

describe('seo.robots', () => {
  it('autorise, bloque, ou manque', async () => {
    const allow = context({ pages: goodPages() });
    expectResult(await run('seo.robots', allow.ctx), 'pass', 'seo.robots.pass');

    const absent = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          404,
        ),
      },
    });
    expectResult(
      await run('seo.robots', absent.ctx),
      'pass',
      'seo.robots.pass_absent',
    );

    const block = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          fixture('robots-block.txt'),
        ),
      },
    });
    expectResult(
      await run('seo.robots', block.ctx),
      'fail',
      'seo.robots.fail_block',
    );

    const html = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          fixture('robots-html.html'),
          'text/html',
        ),
      },
    });
    expectResult(
      await run('seo.robots', html.ctx),
      'fail',
      'seo.robots.fail_html',
    );

    const plain = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          fixture('robots-html.html'),
          'text/plain',
        ),
      },
    });
    expectResult(
      await run('seo.robots', plain.ctx),
      'fail',
      'seo.robots.fail_html',
    );

    const down = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          500,
        ),
      },
    });
    const result = await run('seo.robots', down.ctx);
    expectResult(result, 'untested', 'seo.robots.untested_status');
    expect(result.params).toEqual({ status: 500 });
  });
});

describe('seo.sitemap', () => {
  it('vérifie le plan annoncé, y compris un index', async () => {
    const direct = context({ pages: goodPages() });
    expectResult(
      await run('seo.sitemap', direct.ctx),
      'pass',
      'seo.sitemap.pass',
    );

    const indexed = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          'User-agent: *\nAllow: /\nSitemap: https://exemple.test/sitemap-index.xml\n',
        ),
        [`${ORIGIN}/sitemap-index.xml`]: textResponse(
          `${ORIGIN}/sitemap-index.xml`,
          fixture('sitemap-index.xml'),
          'application/xml',
        ),
        [`${ORIGIN}/sitemap-ok.xml`]: textResponse(
          `${ORIGIN}/sitemap-ok.xml`,
          fixture('sitemap-ok.xml'),
          'application/xml',
        ),
        [`${ORIGIN}/`]: htmlResponse(`${ORIGIN}/`, '<p>Accueil</p>'),
        [`${ORIGIN}/contact`]: htmlResponse(
          `${ORIGIN}/contact`,
          '<p>Contact</p>',
        ),
      },
    });
    expectResult(
      await run('seo.sitemap', indexed.ctx),
      'pass',
      'seo.sitemap.pass',
    );
    expect(indexed.calls).toContain(`${ORIGIN}/sitemap-index.xml`);
    expect(indexed.calls).toContain(`${ORIGIN}/sitemap-ok.xml`);
  });

  it('borne à 20 adresses et signale le reste', async () => {
    const many = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          'User-agent: *\nAllow: /\nSitemap: https://exemple.test/sitemap-many.xml\n',
        ),
        [`${ORIGIN}/sitemap-many.xml`]: textResponse(
          `${ORIGIN}/sitemap-many.xml`,
          fixture('sitemap-many.xml'),
          'application/xml',
        ),
      },
      fallback(url) {
        const match = /^\/p(\d+)$/.exec(url.pathname);
        if (!match) throw new Error(url.href);
        const number = Number(match[1]);
        if (number > 20) throw new Error(`adresse en trop ${url.href}`);
        return htmlResponse(url.href, '<p>Page</p>');
      },
    });
    const result = await run('seo.sitemap', many.ctx);
    expectResult(result, 'pass', 'seo.sitemap.pass_sample');
    expect(result.params).toEqual({ count: 20, total: 21 });
    expect(many.calls.some((href) => href.endsWith('/p21'))).toBe(false);
    expect(many.calls.filter((href) => /\/p\d+$/.test(href))).toHaveLength(20);
  });

  it('distingue plan absent, illisible, vide, externe ou redirigé', async () => {
    const missing = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          404,
        ),
        [`${ORIGIN}/sitemap.xml`]: textResponse(
          `${ORIGIN}/sitemap.xml`,
          '',
          'application/xml',
          404,
        ),
      },
    });
    expectResult(
      await run('seo.sitemap', missing.ctx),
      'warn',
      'seo.sitemap.warn_missing',
    );

    const bad = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          404,
        ),
        [`${ORIGIN}/sitemap.xml`]: textResponse(
          `${ORIGIN}/sitemap.xml`,
          fixture('sitemap-bad.xml'),
          'application/xml',
        ),
      },
    });
    expectResult(
      await run('seo.sitemap', bad.ctx),
      'fail',
      'seo.sitemap.fail_xml',
    );

    const empty = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          404,
        ),
        [`${ORIGIN}/sitemap.xml`]: textResponse(
          `${ORIGIN}/sitemap.xml`,
          fixture('sitemap-empty.xml'),
          'application/xml',
        ),
      },
    });
    expectResult(
      await run('seo.sitemap', empty.ctx),
      'fail',
      'seo.sitemap.fail_empty',
    );

    const external = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          404,
        ),
        [`${ORIGIN}/sitemap.xml`]: textResponse(
          `${ORIGIN}/sitemap.xml`,
          `<urlset><url><loc>${ORIGIN}/</loc></url><url><loc>https://autre.test/page</loc></url></urlset>`,
          'application/xml',
        ),
        [`${ORIGIN}/`]: htmlResponse(`${ORIGIN}/`, '<p>Accueil</p>'),
      },
    });
    expectResult(
      await run('seo.sitemap', external.ctx),
      'warn',
      'seo.sitemap.warn_external',
    );
    expect(external.calls.some((href) => href.includes('autre.test'))).toBe(
      false,
    );

    const moved = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          404,
        ),
        [`${ORIGIN}/sitemap.xml`]: textResponse(
          `${ORIGIN}/sitemap.xml`,
          `<urlset><url><loc>${ORIGIN}/ancienne</loc></url></urlset>`,
          'application/xml',
        ),
        [`${ORIGIN}/ancienne`]: response({
          url: `${ORIGIN}/nouvelle`,
          body: '<p>Nouvelle</p>',
          headers: { 'content-type': 'text/html' },
          redirects: [`${ORIGIN}/ancienne`],
        }),
      },
    });
    expectResult(
      await run('seo.sitemap', moved.ctx),
      'warn',
      'seo.sitemap.warn_redirect',
    );
  });

  it('échoue si une adresse ou le fichier annoncé ne répond pas', async () => {
    const one = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          404,
        ),
        [`${ORIGIN}/sitemap.xml`]: textResponse(
          `${ORIGIN}/sitemap.xml`,
          `<urlset><url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/manque</loc></url></urlset>`,
          'application/xml',
        ),
        [`${ORIGIN}/`]: htmlResponse(`${ORIGIN}/`, '<p>Accueil</p>'),
        [`${ORIGIN}/manque`]: htmlResponse(`${ORIGIN}/manque`, 'non', 404),
      },
    });
    expectResult(
      await run('seo.sitemap', one.ctx),
      'fail',
      'seo.sitemap.fail_status_one',
    );

    const several = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          404,
        ),
        [`${ORIGIN}/sitemap.xml`]: textResponse(
          `${ORIGIN}/sitemap.xml`,
          `<urlset><url><loc>${ORIGIN}/a</loc></url><url><loc>${ORIGIN}/b</loc></url></urlset>`,
          'application/xml',
        ),
        [`${ORIGIN}/a`]: htmlResponse(`${ORIGIN}/a`, 'non', 404),
        [`${ORIGIN}/b`]: htmlResponse(`${ORIGIN}/b`, 'non', 500),
      },
    });
    const many = await run('seo.sitemap', several.ctx);
    expectResult(many, 'fail', 'seo.sitemap.fail_status_many');
    expect(many.params).toEqual({ count: 2 });

    const file = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          'Sitemap: https://exemple.test/plan.xml\n',
        ),
        [`${ORIGIN}/plan.xml`]: textResponse(
          `${ORIGIN}/plan.xml`,
          '',
          'application/xml',
          404,
        ),
      },
    });
    expectResult(
      await run('seo.sitemap', file.ctx),
      'fail',
      'seo.sitemap.fail_file',
    );

    const down = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: textResponse(
          `${ORIGIN}/robots.txt`,
          '',
          'text/plain',
          404,
        ),
        [`${ORIGIN}/sitemap.xml`]: textResponse(
          `${ORIGIN}/sitemap.xml`,
          '',
          'application/xml',
          503,
        ),
      },
    });
    const result = await run('seo.sitemap', down.ctx);
    expectResult(result, 'untested', 'seo.sitemap.untested_status');
    expect(result.params).toEqual({ status: 503 });
  });
});

describe('contenu de la page', () => {
  function pageOf(head: string, status = 200): { ctx: RunContext } {
    return context({
      pages: {
        [`${ORIGIN}/`]: htmlResponse(`${ORIGIN}/`, document(head), status),
      },
    });
  }

  const goodHead = `<title>${TITLE}</title><meta name="description" content="${DESC}"><link rel="canonical" href="${ORIGIN}/">`;

  it('juge le titre', async () => {
    expectResult(
      await run('seo.title', pageOf(goodHead).ctx),
      'pass',
      'seo.title.pass',
    );
    const short = 'Court';
    const shortResult = await run(
      'seo.title',
      pageOf(`<title>${short}</title>`).ctx,
    );
    expectResult(shortResult, 'warn', 'seo.title.warn_short');
    expect(shortResult.params).toEqual({ count: short.length });
    const long = 'T'.repeat(61);
    const longResult = await run(
      'seo.title',
      pageOf(`<title>${long}</title>`).ctx,
    );
    expectResult(longResult, 'warn', 'seo.title.warn_long');
    expect(longResult.params).toEqual({ count: 61 });
    expectResult(
      await run(
        'seo.title',
        pageOf('<meta name="description" content="x">').ctx,
      ),
      'fail',
      'seo.title.fail_missing',
    );
    expectResult(
      await run(
        'seo.title',
        pageOf(
          '<title>Un titre assez clair</title><title>Un autre titre clair</title>',
        ).ctx,
      ),
      'fail',
      'seo.title.fail_duplicate',
    );
    expectResult(
      await run(
        'seo.title',
        pageOf(`<title>${TITLE}</title><title>${TITLE}</title>`).ctx,
      ),
      'warn',
      'seo.title.warn_repeat',
    );
  });

  it('juge la description et le doublon avec le titre', async () => {
    expectResult(
      await run('seo.description', pageOf(goodHead).ctx),
      'pass',
      'seo.description.pass',
    );
    expectResult(
      await run('seo.description', pageOf(`<title>${TITLE}</title>`).ctx),
      'warn',
      'seo.description.warn_missing',
    );
    const short = 'Trop court.';
    const shortResult = await run(
      'seo.description',
      pageOf(
        `<title>${TITLE}</title><meta name="description" content="${short}">`,
      ).ctx,
    );
    expectResult(shortResult, 'warn', 'seo.description.warn_short');
    expect(shortResult.params).toEqual({ count: short.length });
    const long = 'D'.repeat(161);
    const longResult = await run(
      'seo.description',
      pageOf(
        `<title>${TITLE}</title><meta name="description" content="${long}">`,
      ).ctx,
    );
    expectResult(longResult, 'warn', 'seo.description.warn_long');
    expect(longResult.params).toEqual({ count: 161 });
    const same = 'Le cabinet reçoit les patients sur rendez-vous au centre.';
    expect(same.length).toBeGreaterThanOrEqual(50);
    expect(same.length).toBeLessThanOrEqual(60);
    expectResult(
      await run(
        'seo.description',
        pageOf(
          `<title>${same}</title><meta name="description" content="${same}">`,
        ).ctx,
      ),
      'warn',
      'seo.description.warn_same',
    );
    expectResult(
      await run(
        'seo.description',
        pageOf(
          `<title>${TITLE}</title><meta name="description" content="${DESC}"><meta name="description" content="${'Autre description assez longue pour le résultat de recherche.'.padEnd(80, ' ')}">`,
        ).ctx,
      ),
      'warn',
      'seo.description.warn_duplicate',
    );
    expectResult(
      await run(
        'seo.description',
        pageOf(
          `<title>${TITLE}</title><meta name="description" content="${DESC}"><meta name="description" content="${DESC}">`,
        ).ctx,
      ),
      'warn',
      'seo.description.warn_repeat',
    );
  });

  it('juge l’adresse de référence', async () => {
    expectResult(
      await run('seo.canonical', pageOf(goodHead).ctx),
      'pass',
      'seo.canonical.pass',
    );
    expectResult(
      await run(
        'seo.canonical',
        pageOf(`<title>${TITLE}</title><link rel="canonical" href="/">`).ctx,
      ),
      'pass',
      'seo.canonical.pass',
    );
    expectResult(
      await run('seo.canonical', pageOf(`<title>${TITLE}</title>`).ctx),
      'warn',
      'seo.canonical.warn_missing',
    );
    expectResult(
      await run(
        'seo.canonical',
        pageOf(`<link rel="canonical" href="${ORIGIN}/contact">`).ctx,
      ),
      'warn',
      'seo.canonical.warn_other',
    );
    expectResult(
      await run(
        'seo.canonical',
        pageOf(
          `<link rel="canonical" href="${ORIGIN}/"><link rel="canonical" href="${ORIGIN}/">`,
        ).ctx,
      ),
      'warn',
      'seo.canonical.warn_repeat',
    );
    expectResult(
      await run(
        'seo.canonical',
        pageOf(
          `<link rel="canonical" href="${ORIGIN}/"><link rel="canonical" href="${ORIGIN}/contact">`,
        ).ctx,
      ),
      'fail',
      'seo.canonical.fail_conflict',
    );
    expectResult(
      await run(
        'seo.canonical',
        pageOf('<link rel="canonical" href="https://autre.test/">').ctx,
      ),
      'fail',
      'seo.canonical.fail_other_host',
    );
    expectResult(
      await run('seo.canonical', pageOf('<link rel="canonical" href="">').ctx),
      'fail',
      'seo.canonical.fail_invalid',
    );
  });

  it('juge les langues et les données structurées', async () => {
    const langs = `<link rel="alternate" hreflang="fr" href="${ORIGIN}/"><link rel="alternate" hreflang="en" href="${ORIGIN}/en">`;
    expectResult(
      await run('seo.hreflang', pageOf(langs).ctx),
      'pass',
      'seo.hreflang.pass',
    );
    expectResult(
      await run('seo.hreflang', pageOf(`<title>${TITLE}</title>`).ctx),
      'na',
      'seo.hreflang.na',
    );
    expectResult(
      await run(
        'seo.hreflang',
        pageOf(`<link rel="alternate" hreflang="en" href="${ORIGIN}/en">`).ctx,
      ),
      'warn',
      'seo.hreflang.warn_self',
    );
    expectResult(
      await run(
        'seo.hreflang',
        pageOf(
          `<link rel="alternate" hreflang="fr" href="/"><link rel="alternate" hreflang="en" href="/en">`,
        ).ctx,
      ),
      'warn',
      'seo.hreflang.warn_relative',
    );
    expectResult(
      await run(
        'seo.hreflang',
        pageOf(
          '<link rel="alternate" hreflang="francais" href="https://exemple.test/fr">',
        ).ctx,
      ),
      'fail',
      'seo.hreflang.fail_lang',
    );
    expectResult(
      await run(
        'seo.hreflang',
        pageOf(
          `<link rel="alternate" hreflang="fr" href="${ORIGIN}/"><link rel="alternate" hreflang="fr" href="${ORIGIN}/fr">`,
        ).ctx,
      ),
      'fail',
      'seo.hreflang.fail_conflict',
    );
    expectResult(
      await run(
        'seo.hreflang',
        pageOf('<link rel="alternate" hreflang="en" href="">').ctx,
      ),
      'fail',
      'seo.hreflang.fail_href',
    );

    const data =
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Cabinet"}</script>';
    const json = await run('seo.jsonld', pageOf(data).ctx);
    expectResult(json, 'pass', 'seo.jsonld.pass');
    expect(json.params).toEqual({ type: 'LocalBusiness' });
    expectResult(
      await run('seo.jsonld', pageOf(`<title>${TITLE}</title>`).ctx),
      'warn',
      'seo.jsonld.warn_missing',
    );
    const unknown = await run(
      'seo.jsonld',
      pageOf(
        '<script type="application/ld+json">{"@type":"NotARealType"}</script>',
      ).ctx,
    );
    expectResult(unknown, 'warn', 'seo.jsonld.warn_type');
    expect(unknown.params).toEqual({ type: 'NotARealType' });
    expectResult(
      await run(
        'seo.jsonld',
        pageOf('<script type="application/ld+json">{</script>').ctx,
      ),
      'fail',
      'seo.jsonld.fail_parse',
    );
    expectResult(
      await run(
        'seo.jsonld',
        pageOf('<script type="application/ld+json">{"name":"Cabinet"}</script>')
          .ctx,
      ),
      'fail',
      'seo.jsonld.fail_type',
    );
  });

  it('repère noindex dans la page ou l’en-tête', async () => {
    const hidden = context({
      pages: {
        [`${ORIGIN}/`]: htmlResponse(
          `${ORIGIN}/`,
          fixture('home-noindex.html'),
        ),
      },
    });
    const meta = await run('seo.noindex', hidden.ctx);
    expectResult(meta, 'fail', 'seo.noindex.fail');
    expect(meta.measured).toMatchObject({ source: 'meta' });

    const header = context({
      pages: {
        [`${ORIGIN}/`]: response({
          url: `${ORIGIN}/`,
          body: fixture('home-good.html'),
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'x-robots-tag': 'googlebot: noindex',
          },
        }),
      },
    });
    const fromHeader = await run('seo.noindex', header.ctx);
    expectResult(fromHeader, 'fail', 'seo.noindex.fail');
    expect(fromHeader.measured).toMatchObject({ source: 'header' });

    const other = context({
      pages: {
        [`${ORIGIN}/`]: response({
          url: `${ORIGIN}/`,
          body: '<p>Image</p>',
          headers: {
            'content-type': 'text/plain',
            'x-robots-tag': 'bingbot: noindex',
          },
        }),
      },
    });
    expectResult(
      await run('seo.noindex', other.ctx),
      'pass',
      'seo.noindex.pass',
    );
    expectResult(
      await run('seo.title', other.ctx),
      'na',
      'seo.page.na_not_html',
    );
  });

  it('reste non testé si la page ne répond pas', async () => {
    const down = pageOf(`<title>${TITLE}</title>`, 503);
    const result = await run('seo.title', down.ctx);
    expectResult(result, 'untested', 'seo.page.untested_status');
    expect(result.params).toEqual({ status: 503 });
  });
});

describe('Search Console', () => {
  function port(snapshot: GscSnapshot): SearchConsolePort {
    return {
      async snapshot() {
        return snapshot;
      },
    };
  }

  function ready(
    patch: Partial<GscSnapshot> & Pick<GscSnapshot, 'sitemaps' | 'inspection'>,
  ): GscSnapshot {
    return {
      sites: 'ok',
      property: 'sc-domain:exemple.test',
      ...patch,
    };
  }

  async function gscResult(
    id: string,
    gsc?: SearchConsolePort,
  ): Promise<CheckResult> {
    const { ctx } = context(gsc ? { gsc } : {});
    return run(id, ctx, ['gsc']);
  }

  it('sans OAuth, les trois tests sont non testés', async () => {
    for (const id of [
      'seo.gsc_sitemaps',
      'seo.gsc_inspection',
      'seo.gsc_indexed',
    ]) {
      const result = await gscResult(id);
      expectResult(result, 'untested', 'seo.gsc.untested_connect');
      expect(JSON.stringify(result)).not.toContain('refresh-token');
    }
  });

  it('signale un quota, une connexion expirée, une erreur ou une propriété absente', async () => {
    const down = (failure: 'quota' | 'auth' | 'error'): GscSnapshot => ({
      sites: failure,
      property: null,
      sitemaps: { ok: false, failure },
      inspection: { ok: false, failure },
    });
    expectResult(
      await gscResult('seo.gsc_sitemaps', port(down('quota'))),
      'untested',
      'seo.gsc.untested_quota',
    );
    expectResult(
      await gscResult('seo.gsc_inspection', port(down('auth'))),
      'untested',
      'seo.gsc.untested_auth',
    );
    expectResult(
      await gscResult('seo.gsc_indexed', port(down('error'))),
      'untested',
      'seo.gsc.untested_error',
    );
    expectResult(
      await gscResult(
        'seo.gsc_sitemaps',
        port(
          ready({
            property: null,
            sitemaps: { ok: true, entries: [] },
            inspection: { ok: true, verdict: 'PASS' },
          }),
        ),
      ),
      'untested',
      'seo.gsc.untested_property',
    );
  });

  it('note les plans, l’inspection et le résumé d’indexation', async () => {
    const empty = ready({
      sitemaps: { ok: true, entries: [] },
      inspection: { ok: true, verdict: 'PARTIAL' },
    });
    expectResult(
      await gscResult('seo.gsc_sitemaps', port(empty)),
      'warn',
      'seo.gsc_sitemaps.warn_none',
    );
    expectResult(
      await gscResult('seo.gsc_indexed', port(empty)),
      'warn',
      'seo.gsc_indexed.warn_none',
    );
    expectResult(
      await gscResult('seo.gsc_inspection', port(empty)),
      'warn',
      'seo.gsc_inspection.warn',
    );

    const pending = ready({
      sitemaps: {
        ok: true,
        entries: [
          {
            path: `${ORIGIN}/sitemap.xml`,
            errors: 0,
            warnings: 0,
            pending: true,
            isIndex: false,
            submitted: 4,
            indexed: 0,
          },
        ],
      },
      inspection: { ok: true, verdict: 'FAIL' },
    });
    expectResult(
      await gscResult('seo.gsc_sitemaps', port(pending)),
      'warn',
      'seo.gsc_sitemaps.warn_pending',
    );
    expectResult(
      await gscResult('seo.gsc_inspection', port(pending)),
      'fail',
      'seo.gsc_inspection.fail',
    );

    const warnings = ready({
      sitemaps: {
        ok: true,
        entries: [
          {
            path: `${ORIGIN}/sitemap.xml`,
            errors: 0,
            warnings: 2,
            pending: false,
            isIndex: false,
            submitted: 10,
            indexed: 7,
          },
        ],
      },
      inspection: { ok: true, verdict: 'NEUTRAL' },
    });
    expectResult(
      await gscResult('seo.gsc_sitemaps', port(warnings)),
      'warn',
      'seo.gsc_sitemaps.warn_warnings',
    );
    expectResult(
      await gscResult('seo.gsc_indexed', port(warnings)),
      'warn',
      'seo.gsc_indexed.warn_partial',
    );
    expectResult(
      await gscResult('seo.gsc_inspection', port(warnings)),
      'warn',
      'seo.gsc_inspection.warn',
    );

    const errors = ready({
      sitemaps: {
        ok: true,
        entries: [
          {
            path: `${ORIGIN}/sitemap.xml`,
            errors: 1,
            warnings: 0,
            pending: false,
            isIndex: false,
            submitted: 5,
            indexed: 0,
          },
        ],
      },
      inspection: { ok: true, verdict: 'PASS' },
    });
    expectResult(
      await gscResult('seo.gsc_sitemaps', port(errors)),
      'fail',
      'seo.gsc_sitemaps.fail',
    );
    expectResult(
      await gscResult('seo.gsc_indexed', port(errors)),
      'fail',
      'seo.gsc_indexed.fail',
    );
    expectResult(
      await gscResult('seo.gsc_inspection', port(errors)),
      'pass',
      'seo.gsc_inspection.pass',
    );

    const index = ready({
      sitemaps: {
        ok: true,
        entries: [
          {
            path: `${ORIGIN}/sitemap.xml`,
            errors: 0,
            warnings: 0,
            pending: false,
            isIndex: true,
            submitted: 100,
            indexed: 100,
          },
          {
            path: `${ORIGIN}/pages.xml`,
            errors: 0,
            warnings: 0,
            pending: false,
            isIndex: false,
            submitted: 10,
            indexed: 8,
          },
        ],
      },
      inspection: { ok: true, verdict: 'PASS' },
    });
    const indexed = await gscResult('seo.gsc_indexed', port(index));
    expectResult(indexed, 'pass', 'seo.gsc_indexed.pass');
    expect(indexed.measured).toMatchObject({ submitted: 10, indexed: 8 });
    expectResult(
      await gscResult('seo.gsc_sitemaps', port(index)),
      'pass',
      'seo.gsc_sitemaps.pass',
    );
  });
});

describe('textes, fiches et méthode', () => {
  it('chaque clé SEO est produite par un test', () => {
    const keys = Object.keys(fr).filter((key) => key.startsWith('seo.'));
    expect(keys.filter((key) => !seen.has(key)).sort()).toEqual([]);
  });

  it('chaque check a une fiche netlify, github_pages et generic', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    const methode = readFileSync(
      fileURLToPath(new URL('../../../docs/produit/METHODE.md', import.meta.url)),
      'utf8',
    );
    expect(methode).toContain('vingt adresses');
    expect(methode).toContain('hors de la portée');
    for (const item of SEO_CHECKS) {
      const sheet = sheets.get(item.id);
      expect(sheet, item.id).toBeTruthy();
      if (!sheet) continue;
      expect(sheet.variants.github_pages).toContain('Limite');
      expect(sheet.variants.github_pages).toContain('Alternative');
      expect(sheet.variants.generic.length).toBeGreaterThan(20);
      expect(sheet.variants.netlify.length).toBeGreaterThan(20);
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
});
