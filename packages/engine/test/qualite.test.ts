import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createRequestBudget,
  type DohResolver,
  NetError,
  type SafeFetch,
  type SafeFetchInit,
  type SafeResponse,
  type TlsProbe,
} from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { fr, type MessageKey } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import { extractDocument } from '../checks/qualite/extract.js';
import { QUALITE_CHECKS } from '../checks/qualite/index.js';
import {
  ESSENTIAL_RULES,
  EXTERNAL_LIMIT,
  IMAGE_MAX_BYTES,
  PAGE_LIMIT,
  QUALITE_TIMEOUT_MS,
} from '../checks/qualite/limits.js';
import { inScope, looksLikePage } from '../checks/qualite/scope.js';
import { crawlerAllowed, parseRobots } from '../checks/seo/robots-parse.js';
import { FIXES_FR_DIR, fileFixStore } from '../src/fixes-fs.js';
import {
  type Check,
  type CheckResult,
  createRegistry,
  createSharedArtifacts,
  loadFixes,
  type RunContext,
  runChecks,
  scoreDomain,
} from '../src/index.js';

const NOW = new Date('2026-10-23T12:00:00.000Z');
const ORIGIN = 'https://exemple.test';
const seen = new Set<string>();

const noDns: DohResolver = {
  query: () => Promise.reject(new Error('DNS non disponible en test')),
  addresses: () => Promise.reject(new Error('DNS non disponible en test')),
};
const noTls: TlsProbe = () =>
  Promise.reject(new Error('TLS non disponible en test'));

interface Call {
  href: string;
  method: string;
  host: string;
  at: number;
}

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
    headers: new Headers(init.headers),
    body: new TextEncoder().encode(body),
    transferBytes: new TextEncoder().encode(body).length,
    ip: '93.184.216.34',
    redirects: [],
    text: () => body,
  };
}

function page(body: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Page</title></head><body>${body}</body></html>`;
}

function html(url: string, body: string, status = 200): SafeResponse {
  return response({
    url,
    status,
    body,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function bytes(
  url: string,
  length: number | null,
  type = 'image/webp',
): SafeResponse {
  const headers: Record<string, string> = {};
  if (type !== '') headers['content-type'] = type;
  if (length !== null) headers['content-length'] = String(length);
  return response({ url, headers });
}

function context(
  options: {
    target?: string;
    scope?: 'origin' | 'path';
    pages?: Record<string, SafeResponse>;
    maxRequests?: number;
    budget?: ReturnType<typeof createRequestBudget>;
    now?: () => number;
    fallback?: (url: URL, init: SafeFetchInit | undefined) => SafeResponse;
    robotsDefault?: boolean;
  } = {},
): {
  ctx: RunContext;
  calls: Call[];
  budget: ReturnType<typeof createRequestBudget>;
} {
  const calls: Call[] = [];
  const budget =
    options.budget ??
    createRequestBudget({
      perHostIntervalMs: 0,
      maxRequests: options.maxRequests ?? 80,
    });
  const pages = options.pages ?? {};
  const fetch: SafeFetch = async (input, init) => {
    const url = new URL(String(input));
    await budget.acquire(url.hostname);
    calls.push({
      href: url.href,
      method: init?.method ?? 'GET',
      host: url.hostname,
      at: options.now?.() ?? 0,
    });
    const found = pages[url.href];
    if (found) return found;
    if (options.robotsDefault !== false && url.pathname === '/robots.txt') {
      return response({
        url: url.href,
        status: 404,
        headers: { 'content-type': 'text/plain' },
      });
    }
    if (options.fallback) return options.fallback(url, init);
    throw new Error(`fetch inattendu ${init?.method ?? 'GET'} ${url.href}`);
  };
  return {
    calls,
    budget,
    ctx: {
      target: {
        url: new URL(options.target ?? `${ORIGIN}/`),
        scope: options.scope ?? 'origin',
        hosting: 'other',
      },
      verified: false,
      net: { fetch, dns: noDns, tls: noTls },
      shared: createSharedArtifacts(),
      budget,
      now: () => NOW,
    },
  };
}

const byId = Object.fromEntries(QUALITE_CHECKS.map((item) => [item.id, item]));

function check(id: string): Check {
  const found = byId[id];
  if (!found) throw new Error(id);
  return found;
}

async function run(id: string, ctx: RunContext): Promise<CheckResult> {
  const [outcome] = await runChecks([check(id)], ctx, { concurrency: 1 });
  if (!outcome) throw new Error(id);
  return outcome.result;
}

function expectResult(
  result: CheckResult,
  status: CheckResult['status'],
  key: string,
  id: string,
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
  if (status === 'warn' || status === 'fail') expect(result.fixKey).toBe(id);
  else expect(result.fixKey).toBeUndefined();
}

describe('portée, robots et extraction', () => {
  it('reste dans le chemin et ignore les liens non http', () => {
    const target = new URL(`${ORIGIN}/projet`);
    expect(inScope(target, 'path', new URL(`${ORIGIN}/projet`))).toBe(true);
    expect(inScope(target, 'path', new URL(`${ORIGIN}/projet/suite`))).toBe(
      true,
    );
    expect(inScope(target, 'path', new URL(`${ORIGIN}/projet2`))).toBe(false);
    expect(inScope(target, 'path', new URL(`${ORIGIN}/autre`))).toBe(false);
    expect(inScope(target, 'origin', new URL(`${ORIGIN}/autre`))).toBe(true);
    expect(looksLikePage(new URL(`${ORIGIN}/contact`))).toBe(true);
    expect(looksLikePage(new URL(`${ORIGIN}/a/b.html`))).toBe(true);
    expect(looksLikePage(new URL(`${ORIGIN}/doc.pdf`))).toBe(false);

    const extracted = extractDocument(
      `${page('<script>var x = \'<a href="https://evil.test/no"></a>\';</script><a href="page">page</a><a href="mailto:a@b.c">mail</a><a href="#ici">ici</a><base href="https://exemple.test/dir/">')}`,
      new URL(`${ORIGIN}/`),
    );
    expect(extracted.links.map((link) => link.href)).toEqual([
      'https://exemple.test/page',
    ]);
  });

  it('résout la base et les images modernes', () => {
    const extracted = extractDocument(
      page(
        '<base href="https://exemple.test/dir/"><a href="page">page</a><a href="https://autre.test/x">ext</a><picture><source srcset="/a.avif 1x" type="image/avif"><img src="b.jpg" width="10" height="20"></picture><img src="/logo.svg" width="4" height="4">',
      ),
      new URL(`${ORIGIN}/index.html`),
    );
    expect(extracted.links.map((link) => link.href)).toEqual([
      'https://exemple.test/dir/page',
      'https://autre.test/x',
    ]);
    expect(extracted.images[0]).toMatchObject({
      width: true,
      height: true,
      modernMarkup: true,
      svg: false,
    });
    expect(extracted.images[1]).toMatchObject({
      svg: true,
      modernMarkup: false,
    });
  });

  it('applique le groupe AudigyBot, pas celui d’un autre robot', () => {
    const blocked = parseRobots(
      'User-agent: AudigyBot\nDisallow: /prive\n\nUser-agent: *\nAllow: /\n',
    );
    expect(
      crawlerAllowed(blocked, new URL(`${ORIGIN}/prive`), 'audigybot'),
    ).toBe(false);
    expect(crawlerAllowed(blocked, new URL(`${ORIGIN}/ok`), 'audigybot')).toBe(
      true,
    );
    const google = parseRobots('User-agent: Googlebot\nDisallow: /\n');
    expect(crawlerAllowed(google, new URL(`${ORIGIN}/`), 'audigybot')).toBe(
      true,
    );
  });
});

describe('registre qualité', () => {
  it('expose cinq checks passifs, dans l’ordre des identifiants', () => {
    expect(QUALITE_CHECKS.map((item) => item.id)).toEqual([
      'qualite.html',
      'qualite.images_dimensions',
      'qualite.images_format',
      'qualite.images_poids',
      'qualite.liens',
    ]);
    expect(ESSENTIAL_RULES).toContain('void-content');
    expect(ESSENTIAL_RULES).not.toContain('wcag/h37');
    const registry = createRegistry(QUALITE_CHECKS);
    expect(registry.list({ domain: 'qualite' })).toHaveLength(5);
    expect(registry.list({ mode: 'active' })).toHaveLength(0);
    const weights: Record<string, number> = {
      'qualite.html': 2,
      'qualite.images_dimensions': 1,
      'qualite.images_format': 1,
      'qualite.images_poids': 2,
      'qualite.liens': 3,
    };
    for (const item of QUALITE_CHECKS) {
      expect(item.mode).toBe('passive');
      expect(item.needs).toEqual(['http']);
      expect(item.timeoutMs).toBe(QUALITE_TIMEOUT_MS);
      expect(item.weight).toBe(weights[item.id]);
    }
  });
});

describe('parcours', () => {
  it('respecte robots, la portée, et ne refait pas le parcours', async () => {
    const home = `${ORIGIN}/projet/`;
    const { ctx, calls } = context({
      target: home,
      scope: 'path',
      pages: {
        [home]: html(
          home,
          page(
            '<a href="/projet/suite">suite</a><a href="/autre">autre</a><a href="/projet/prive">prive</a><a href="https://autre.test/ext">ext</a>',
          ),
        ),
        [`${ORIGIN}/projet/suite`]: html(
          `${ORIGIN}/projet/suite`,
          page('<p>Suite</p>'),
        ),
        [`${ORIGIN}/robots.txt`]: response({
          url: `${ORIGIN}/robots.txt`,
          headers: { 'content-type': 'text/plain' },
          body: 'User-agent: AudigyBot\nDisallow: /projet/prive\n\nUser-agent: *\nDisallow:\n',
        }),
        'https://autre.test/ext': response({
          url: 'https://autre.test/ext',
          status: 200,
        }),
      },
    });
    const outcomes = await runChecks(QUALITE_CHECKS, ctx);
    const hrefs = calls.map((call) => call.href);
    expect(hrefs.filter((href) => href === home)).toHaveLength(1);
    expect(hrefs).toContain(`${ORIGIN}/projet/suite`);
    expect(hrefs).toContain(`${ORIGIN}/robots.txt`);
    expect(hrefs).not.toContain(`${ORIGIN}/autre`);
    expect(hrefs).not.toContain(`${ORIGIN}/projet/prive`);
    expect(
      calls.find((call) => call.href === 'https://autre.test/ext')?.method,
    ).toBe('HEAD');
    const liens = outcomes.find((item) => item.checkId === 'qualite.liens');
    expect(liens?.result.measured).toMatchObject({
      horsPortee: 1,
      robotsBlocked: 1,
    });
    expectResult(
      liens?.result as CheckResult,
      'pass',
      'qualite.liens.pass',
      'qualite.liens',
    );
  });

  it('ne dépasse ni 50 pages, ni 30 liens externes, ni le budget', async () => {
    const pages: Record<string, SafeResponse> = {
      [`${ORIGIN}/`]: html(
        `${ORIGIN}/`,
        page(
          `${Array.from({ length: 80 }, (_, index) => `<a href="/p/${index + 1}">p</a>`).join('')}<a href="https://autre.test/loin">loin</a><img src="/photo.webp" width="10" height="10" alt="">`,
        ),
      ),
    };
    for (let index = 1; index <= 80; index += 1) {
      const url = `${ORIGIN}/p/${index}`;
      pages[url] = html(url, page('<p>Page</p>'));
    }
    const capped = context({ pages, maxRequests: 200 });
    const htmlResult = await run('qualite.html', capped.ctx);
    expectResult(htmlResult, 'pass', 'qualite.html.pass', 'qualite.html');
    expect(htmlResult.measured).toMatchObject({ pages: PAGE_LIMIT });
    expect(
      capped.calls.filter((call) => call.href === `${ORIGIN}/p/49`),
    ).toHaveLength(1);
    expect(capped.calls.some((call) => call.href === `${ORIGIN}/p/50`)).toBe(
      false,
    );
    expect(capped.calls.some((call) => call.host === 'autre.test')).toBe(true);

    const manyExternal: Record<string, SafeResponse> = {
      [`${ORIGIN}/`]: html(
        `${ORIGIN}/`,
        page(
          Array.from(
            { length: 40 },
            (_, index) => `<a href="https://autre.test/e/${index + 1}">e</a>`,
          ).join(''),
        ),
      ),
    };
    for (let index = 1; index <= 40; index += 1) {
      manyExternal[`https://autre.test/e/${index}`] = response({
        url: `https://autre.test/e/${index}`,
      });
    }
    const external = context({ pages: manyExternal, maxRequests: 200 });
    expectResult(
      await run('qualite.liens', external.ctx),
      'pass',
      'qualite.liens.pass',
      'qualite.liens',
    );
    const heads = external.calls.filter((call) => call.method === 'HEAD');
    expect(heads).toHaveLength(EXTERNAL_LIMIT);
    expect(heads.some((call) => call.href.endsWith('/e/31'))).toBe(false);

    const tight = context({ pages, maxRequests: 50 });
    const poids = await run('qualite.images_poids', tight.ctx);
    const liens = await run(
      'qualite.liens',
      context({ pages, maxRequests: 50 }).ctx,
    );
    expect(tight.budget.requests).toBeLessThanOrEqual(50);
    expect(tight.calls.length).toBeLessThanOrEqual(50);
    expect(tight.calls.every((call) => call.host === 'exemple.test')).toBe(
      true,
    );
    expectResult(
      poids,
      'untested',
      'qualite.untested_budget',
      'qualite.images_poids',
    );
    expectResult(liens, 'pass', 'qualite.liens.pass', 'qualite.liens');
    expect(liens.measured).toMatchObject({ pages: expect.any(Number) });
    expect(Number(liens.measured?.pages)).toBeLessThanOrEqual(PAGE_LIMIT);
  });

  it('espace les sondes externes d’une seconde sur le même hôte', async () => {
    let now = 0;
    const budget = createRequestBudget({
      maxRequests: 20,
      perHostIntervalMs: 1000,
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });
    const { calls, ctx } = context({
      budget,
      now: () => now,
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<a href="/contact">contact</a><a href="https://autre.test/a">a</a><a href="https://autre.test/b">b</a>',
          ),
        ),
        [`${ORIGIN}/contact`]: html(
          `${ORIGIN}/contact`,
          page('<p>Contact</p>'),
        ),
        'https://autre.test/a': response({ url: 'https://autre.test/a' }),
        'https://autre.test/b': response({ url: 'https://autre.test/b' }),
      },
    });
    expectResult(
      await run('qualite.liens', ctx),
      'pass',
      'qualite.liens.pass',
      'qualite.liens',
    );
    const external = calls.filter((call) => call.host === 'autre.test');
    expect(external.map((call) => call.method)).toEqual(['HEAD', 'HEAD']);
    expect(
      (external[1]?.at ?? 0) - (external[0]?.at ?? 0),
    ).toBeGreaterThanOrEqual(1000);
    expect(
      calls.find((call) => call.href === `${ORIGIN}/contact`)?.method,
    ).toBe('GET');
  });

  it('s’arrête si la page, le robots ou la portée empêche la lecture', async () => {
    const down = context({
      fallback: () => {
        throw new NetError('NETWORK', 'panne');
      },
    });
    expectResult(
      await run('qualite.html', down.ctx),
      'untested',
      'qualite.untested_down',
      'qualite.html',
    );

    const robotsDown = context({
      robotsDefault: false,
      fallback: (url) => {
        if (url.pathname === '/robots.txt')
          throw new NetError('DNS_FAILURE', 'dns');
        throw new Error(url.href);
      },
    });
    expectResult(
      await run('qualite.liens', robotsDown.ctx),
      'untested',
      'qualite.untested_robots_down',
      'qualite.liens',
    );

    const robotsStatus = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: response({
          url: `${ORIGIN}/robots.txt`,
          status: 503,
          headers: { 'content-type': 'text/plain' },
        }),
      },
    });
    expectResult(
      await run('qualite.html', robotsStatus.ctx),
      'untested',
      'qualite.untested_robots',
      'qualite.html',
    );
    expect((await run('qualite.html', robotsStatus.ctx)).params).toEqual({
      status: 503,
    });

    const blocked = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: response({
          url: `${ORIGIN}/robots.txt`,
          headers: { 'content-type': 'text/plain' },
          body: 'User-agent: *\nDisallow: /\n',
        }),
      },
    });
    expectResult(
      await run('qualite.images_format', blocked.ctx),
      'na',
      'qualite.na_robots',
      'qualite.images_format',
    );
    expect(blocked.calls.map((call) => call.href)).toEqual([
      `${ORIGIN}/robots.txt`,
    ]);

    const status = context({
      pages: {
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, page('<p>Non</p>'), 503),
      },
    });
    expectResult(
      await run('qualite.liens', status.ctx),
      'untested',
      'qualite.untested_status',
      'qualite.liens',
    );

    const text = context({
      pages: {
        [`${ORIGIN}/`]: response({
          url: `${ORIGIN}/`,
          body: 'bonjour',
          headers: { 'content-type': 'text/plain' },
        }),
      },
    });
    expectResult(
      await run('qualite.html', text.ctx),
      'na',
      'qualite.na_not_html',
      'qualite.html',
    );

    const left = context({
      pages: {
        [`${ORIGIN}/`]: html(
          'https://autre.test/ailleurs',
          page('<p>Ailleurs</p>'),
        ),
      },
    });
    expectResult(
      await run('qualite.images_poids', left.ctx),
      'na',
      'qualite.na_scope',
      'qualite.images_poids',
    );
    expect(left.calls.some((call) => call.host === 'autre.test')).toBe(false);
  });
});

describe('liens', () => {
  it('échoue sur un lien interne mort, y compris un fichier', async () => {
    const one = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<a href="/manquant">manquant</a><a href="/doc.pdf">pdf</a>'),
        ),
        [`${ORIGIN}/doc.pdf`]: response({
          url: `${ORIGIN}/doc.pdf`,
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        }),
        [`${ORIGIN}/manquant`]: response({
          url: `${ORIGIN}/manquant`,
          status: 404,
        }),
      },
    });
    const result = await run('qualite.liens', one.ctx);
    expectResult(
      result,
      'fail',
      'qualite.liens.fail_internal_one',
      'qualite.liens',
    );
    expect(
      one.calls.find((call) => call.href.endsWith('/doc.pdf'))?.method,
    ).toBe('GET');

    const many = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<a href="/a">a</a><a href="/b">b</a>'),
        ),
        [`${ORIGIN}/a`]: response({ url: `${ORIGIN}/a`, status: 404 }),
        [`${ORIGIN}/b`]: response({ url: `${ORIGIN}/b`, status: 500 }),
      },
    });
    const failed = await run('qualite.liens', many.ctx);
    expectResult(
      failed,
      'fail',
      'qualite.liens.fail_internal_many',
      'qualite.liens',
    );
    expect(failed.params).toEqual({ count: 2 });
  });

  it('distingue lien externe mort, erreur temporaire et réponse incertaine', async () => {
    const dead = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<a href="https://autre.test/morte">morte</a>'),
        ),
        'https://autre.test/morte': response({
          url: 'https://autre.test/morte',
          status: 404,
        }),
      },
    });
    expectResult(
      await run('qualite.liens', dead.ctx),
      'fail',
      'qualite.liens.fail_external_one',
      'qualite.liens',
    );

    const deads = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<a href="https://autre.test/a">a</a><a href="https://autre.test/b">b</a>',
          ),
        ),
        'https://autre.test/a': response({
          url: 'https://autre.test/a',
          status: 404,
        }),
        'https://autre.test/b': response({
          url: 'https://autre.test/b',
          status: 410,
        }),
      },
    });
    const many = await run('qualite.liens', deads.ctx);
    expectResult(
      many,
      'fail',
      'qualite.liens.fail_external_many',
      'qualite.liens',
    );
    expect(many.params).toEqual({ count: 2 });

    const slow = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<a href="https://autre.test/lent">lent</a>'),
        ),
        'https://autre.test/lent': response({
          url: 'https://autre.test/lent',
          status: 429,
        }),
      },
    });
    const warned = await run('qualite.liens', slow.ctx);
    expectResult(
      warned,
      'warn',
      'qualite.liens.warn_temp_one',
      'qualite.liens',
    );
    expect(warned.status).not.toBe('fail');

    const timeouts = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<a href="https://autre.test/delai">delai</a>'),
        ),
      },
      fallback: (url) => {
        if (url.hostname === 'autre.test')
          throw new NetError('TIMEOUT', 'délai');
        throw new Error(url.href);
      },
    });
    expectResult(
      await run('qualite.liens', timeouts.ctx),
      'warn',
      'qualite.liens.warn_temp_one',
      'qualite.liens',
    );

    const temps = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<a href="https://autre.test/a">a</a><a href="https://autre.test/b">b</a>',
          ),
        ),
        'https://autre.test/a': response({
          url: 'https://autre.test/a',
          status: 503,
        }),
        'https://autre.test/b': response({
          url: 'https://autre.test/b',
          status: 502,
        }),
      },
    });
    const tempMany = await run('qualite.liens', temps.ctx);
    expectResult(
      tempMany,
      'warn',
      'qualite.liens.warn_temp_many',
      'qualite.liens',
    );
    expect(tempMany.params).toEqual({ count: 2 });

    const denied = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<a href="https://autre.test/ferme">ferme</a>'),
        ),
        'https://autre.test/ferme': response({
          url: 'https://autre.test/ferme',
          status: 403,
        }),
      },
    });
    expectResult(
      await run('qualite.liens', denied.ctx),
      'warn',
      'qualite.liens.warn_uncertain_one',
      'qualite.liens',
    );

    const deniedMany = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<a href="https://autre.test/a">a</a><a href="https://autre.test/b">b</a>',
          ),
        ),
        'https://autre.test/a': response({
          url: 'https://autre.test/a',
          status: 401,
        }),
        'https://autre.test/b': response({
          url: 'https://autre.test/b',
          status: 405,
        }),
      },
    });
    const uncertain = await run('qualite.liens', deniedMany.ctx);
    expectResult(
      uncertain,
      'warn',
      'qualite.liens.warn_uncertain_many',
      'qualite.liens',
    );
    expect(uncertain.params).toEqual({ count: 2 });

    const mixed = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<a href="/mort">mort</a><a href="https://autre.test/lent">lent</a>',
          ),
        ),
        [`${ORIGIN}/mort`]: response({ url: `${ORIGIN}/mort`, status: 404 }),
        'https://autre.test/lent': response({
          url: 'https://autre.test/lent',
          status: 503,
        }),
      },
    });
    const both = await run('qualite.liens', mixed.ctx);
    expectResult(
      both,
      'fail',
      'qualite.liens.fail_internal_one',
      'qualite.liens',
    );
    expect(both.measured).toMatchObject({ externalTemporary: 1 });
  });
});

describe('html et images', () => {
  it('juge le HTML essentiel des pages lues', async () => {
    const good = context({
      pages: {
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, page('<p>Bonjour</p>')),
      },
    });
    expectResult(
      await run('qualite.images_poids', good.ctx),
      'na',
      'qualite.images_poids.na',
      'qualite.images_poids',
    );
    expectResult(
      await run('qualite.images_dimensions', good.ctx),
      'na',
      'qualite.images_dimensions.na',
      'qualite.images_dimensions',
    );
    expectResult(
      await run('qualite.images_format', good.ctx),
      'na',
      'qualite.images_format.na',
      'qualite.images_format',
    );

    const one = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          '<html><body><br>texte</br></body></html>',
        ),
      },
    });
    const invalid = await run('qualite.html', one.ctx);
    expectResult(invalid, 'fail', 'qualite.html.fail_one', 'qualite.html');
    expect(invalid.measured?.rules).toEqual(
      expect.arrayContaining(['missing-doctype', 'void-content']),
    );

    const many = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          '<html><body><a href="/bis">bis</a><br>texte</br></body></html>',
        ),
        [`${ORIGIN}/bis`]: html(
          `${ORIGIN}/bis`,
          '<html><body><div class="a" class="b"></div></body></html>',
        ),
      },
    });
    const failed = await run('qualite.html', many.ctx);
    expectResult(failed, 'fail', 'qualite.html.fail_many', 'qualite.html');
    expect(failed.params).toEqual({ count: 2 });
  });

  it('mesure le poids, les dimensions et le format', async () => {
    const limit = IMAGE_MAX_BYTES;
    const good = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            `<picture><source srcset="/a.avif" type="image/avif"><img src="/a.webp" width="10" height="10"></picture><img src="/logo.svg" width="8" height="8">`,
          ),
        ),
        [`${ORIGIN}/a.avif`]: bytes(`${ORIGIN}/a.avif`, limit, 'image/avif'),
        [`${ORIGIN}/a.webp`]: bytes(`${ORIGIN}/a.webp`, 1000),
        [`${ORIGIN}/logo.svg`]: bytes(
          `${ORIGIN}/logo.svg`,
          100,
          'image/svg+xml',
        ),
      },
    });
    const outcomes = await runChecks(QUALITE_CHECKS, good.ctx);
    expect(scoreDomain('qualite', outcomes).score).toBe(100);
    for (const outcome of outcomes) {
      expectResult(
        outcome.result,
        'pass',
        expectPassKey(outcome.checkId),
        outcome.checkId,
      );
    }
    expect(
      good.calls.find((call) => call.href === `${ORIGIN}/a.webp`)?.method,
    ).toBe('HEAD');

    const heavyOne = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<img src="/lourd.jpg" width="10" height="10">'),
        ),
        [`${ORIGIN}/lourd.jpg`]: bytes(
          `${ORIGIN}/lourd.jpg`,
          limit + 1,
          'image/jpeg',
        ),
      },
    });
    expectResult(
      await run('qualite.images_poids', heavyOne.ctx),
      'fail',
      'qualite.images_poids.fail_one',
      'qualite.images_poids',
    );
    expectResult(
      await run('qualite.images_format', heavyOne.ctx),
      'fail',
      'qualite.images_format.fail',
      'qualite.images_format',
    );

    const heavyMany = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<img src="/a.jpg" width="1" height="1"><img src="/b.jpg" width="1" height="1">',
          ),
        ),
        [`${ORIGIN}/a.jpg`]: bytes(`${ORIGIN}/a.jpg`, limit + 1, 'image/jpeg'),
        [`${ORIGIN}/b.jpg`]: bytes(`${ORIGIN}/b.jpg`, limit + 50, 'image/jpeg'),
      },
    });
    const heavy = await run('qualite.images_poids', heavyMany.ctx);
    expectResult(
      heavy,
      'fail',
      'qualite.images_poids.fail_many',
      'qualite.images_poids',
    );
    expect(heavy.params).toEqual({ count: 2 });

    const unknown = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<img src="/a.webp" width="10" height="10">'),
        ),
        [`${ORIGIN}/a.webp`]: bytes(`${ORIGIN}/a.webp`, null),
      },
    });
    expectResult(
      await run('qualite.images_poids', unknown.ctx),
      'warn',
      'qualite.images_poids.warn_unknown_one',
      'qualite.images_poids',
    );

    const unknownMany = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<img src="/a.webp" width="10" height="10"><img src="/b.webp" width="10" height="10">',
          ),
        ),
        [`${ORIGIN}/a.webp`]: bytes(`${ORIGIN}/a.webp`, null),
        [`${ORIGIN}/b.webp`]: bytes(`${ORIGIN}/b.webp`, null),
      },
    });
    const missing = await run('qualite.images_poids', unknownMany.ctx);
    expectResult(
      missing,
      'warn',
      'qualite.images_poids.warn_unknown_many',
      'qualite.images_poids',
    );
    expect(missing.params).toEqual({ count: 2 });

    const sizes = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<img src="/ok.webp" width="10" height="10"><img src="/nu.webp"><img src="/nu2.webp" width="4">',
          ),
        ),
        [`${ORIGIN}/ok.webp`]: bytes(`${ORIGIN}/ok.webp`, 100),
        [`${ORIGIN}/nu.webp`]: bytes(`${ORIGIN}/nu.webp`, 100),
        [`${ORIGIN}/nu2.webp`]: bytes(`${ORIGIN}/nu2.webp`, 100),
      },
    });
    const partial = await run('qualite.images_dimensions', sizes.ctx);
    expectResult(
      partial,
      'warn',
      'qualite.images_dimensions.warn_many',
      'qualite.images_dimensions',
    );
    expect(partial.params).toEqual({ count: 2 });

    const oneDim = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<img src="/ok.webp" width="10" height="10"><img src="/nu.webp">',
          ),
        ),
        [`${ORIGIN}/ok.webp`]: bytes(`${ORIGIN}/ok.webp`, 100),
        [`${ORIGIN}/nu.webp`]: bytes(`${ORIGIN}/nu.webp`, 100),
      },
    });
    expectResult(
      await run('qualite.images_dimensions', oneDim.ctx),
      'warn',
      'qualite.images_dimensions.warn_one',
      'qualite.images_dimensions',
    );

    const none = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<img src="/nu.webp"><img src="/nu2.webp">'),
        ),
        [`${ORIGIN}/nu.webp`]: bytes(`${ORIGIN}/nu.webp`, 100),
        [`${ORIGIN}/nu2.webp`]: bytes(`${ORIGIN}/nu2.webp`, 100),
      },
    });
    expectResult(
      await run('qualite.images_dimensions', none.ctx),
      'fail',
      'qualite.images_dimensions.fail',
      'qualite.images_dimensions',
    );

    const mixedFormat = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<img src="/a.webp" width="10" height="10"><img src="/b.jpg" width="10" height="10">',
          ),
        ),
        [`${ORIGIN}/a.webp`]: bytes(`${ORIGIN}/a.webp`, 100),
        [`${ORIGIN}/b.jpg`]: bytes(`${ORIGIN}/b.jpg`, 100, 'image/jpeg'),
      },
    });
    expectResult(
      await run('qualite.images_format', mixedFormat.ctx),
      'warn',
      'qualite.images_format.warn_one',
      'qualite.images_format',
    );

    const legacy = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page(
            '<img src="/a.jpg" width="1" height="1"><img src="/b.png" width="1" height="1"><img src="/c.webp" width="1" height="1">',
          ),
        ),
        [`${ORIGIN}/a.jpg`]: bytes(`${ORIGIN}/a.jpg`, 100, 'image/jpeg'),
        [`${ORIGIN}/b.png`]: bytes(`${ORIGIN}/b.png`, 100, 'image/png'),
        [`${ORIGIN}/c.webp`]: bytes(`${ORIGIN}/c.webp`, 100),
      },
    });
    const formats = await run('qualite.images_format', legacy.ctx);
    expectResult(
      formats,
      'warn',
      'qualite.images_format.warn_many',
      'qualite.images_format',
    );
    expect(formats.params).toEqual({ count: 2 });

    const negotiated = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<img src="/photo.jpg" width="10" height="10">'),
        ),
        [`${ORIGIN}/photo.jpg`]: bytes(
          `${ORIGIN}/photo.jpg`,
          100,
          'image/webp',
        ),
      },
    });
    expectResult(
      await run('qualite.images_format', negotiated.ctx),
      'pass',
      'qualite.images_format.pass',
      'qualite.images_format',
    );

    const svg = context({
      pages: {
        [`${ORIGIN}/`]: html(
          `${ORIGIN}/`,
          page('<img src="/logo.svg" width="8" height="8">'),
        ),
        [`${ORIGIN}/logo.svg`]: bytes(
          `${ORIGIN}/logo.svg`,
          80,
          'image/svg+xml',
        ),
      },
    });
    expectResult(
      await run('qualite.images_format', svg.ctx),
      'na',
      'qualite.images_format.na',
      'qualite.images_format',
    );
    expectResult(
      await run('qualite.images_dimensions', svg.ctx),
      'pass',
      'qualite.images_dimensions.pass',
      'qualite.images_dimensions',
    );
    expectResult(
      await run('qualite.images_poids', svg.ctx),
      'pass',
      'qualite.images_poids.pass',
      'qualite.images_poids',
    );
  });
});

function expectPassKey(id: string): string {
  if (id === 'qualite.html') return 'qualite.html.pass';
  if (id === 'qualite.images_dimensions')
    return 'qualite.images_dimensions.pass';
  if (id === 'qualite.images_format') return 'qualite.images_format.pass';
  if (id === 'qualite.images_poids') return 'qualite.images_poids.pass';
  return 'qualite.liens.pass';
}

describe('textes, fiches et méthode', () => {
  it('chaque clé qualité est produite par un test', () => {
    const keys = Object.keys(fr).filter((key) => key.startsWith('qualite.'));
    expect(keys.filter((key) => !seen.has(key)).sort()).toEqual([]);
  });

  it('chaque check a une fiche et une ligne de méthode', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    const methode = readFileSync(
      fileURLToPath(
        new URL('../../../docs/produit/METHODE.md', import.meta.url),
      ),
      'utf8',
    );
    expect(methode).toContain('50 pages');
    expect(methode).toContain('erreur temporaire');
    expect(methode).toContain('200 Ko');
    for (const item of QUALITE_CHECKS) {
      const sheet = sheets.get(item.id);
      expect(sheet, item.id).toBeTruthy();
      if (!sheet) continue;
      expect(sheet.variants.github_pages).toContain('Limite');
      expect(sheet.variants.github_pages).toContain('Alternative');
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
