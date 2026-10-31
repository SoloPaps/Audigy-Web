import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  type BrowserAuditResult,
  BrowserAuditResultSchema,
} from '@audigy/browser-runner';
import {
  createRequestBudget,
  type DohResolver,
  NetError,
  type SafeFetch,
  type SafeResponse,
  type TlsProbe,
} from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { fr, type MessageKey } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import { sameSite } from '../checks/vie_privee/hits.js';
import { BROWSER_KEY, VIE_PRIVEE_CHECKS } from '../checks/vie_privee/index.js';
import {
  classifyLink,
  findLegalLinks,
  legalElements,
} from '../checks/vie_privee/links.js';
import {
  matchesTracker,
  TRACKER_DOMAINS,
  TRACKER_LIST,
} from '../checks/vie_privee/trackers.js';
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

const ORIGIN = 'https://exemple.test';
const FIXTURES = fileURLToPath(
  new URL('../../browser-runner/fixtures/', import.meta.url),
);
const DATA = fileURLToPath(new URL('../data/trackers/', import.meta.url));
const seen = new Set<string>();
const GUILT =
  /ill[eé]gal|interdit|faute|coupable|infraction|espion|vous violez|hors-la-loi|non-conforme/iu;

const noDns: DohResolver = {
  query: () => Promise.reject(new Error('DNS non disponible en test')),
  addresses: () => Promise.reject(new Error('DNS non disponible en test')),
};
const noTls: TlsProbe = () =>
  Promise.reject(new Error('TLS non disponible en test'));

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(`${FIXTURES}${name}`, 'utf8')) as unknown;
}

function cloneReport(name: string): BrowserAuditResult {
  return JSON.parse(JSON.stringify(fixture(name))) as BrowserAuditResult;
}

function addRequest(
  report: BrowserAuditResult,
  url: string,
  host: string,
  resourceType: string,
): BrowserAuditResult {
  report.loads.desktop.requests.push({
    url,
    method: 'GET',
    resourceType,
    host,
    thirdParty: true,
    outcome: 'network',
    status: 200,
    mimeType: null,
    transferBytes: 80,
    reason: null,
  });
  return report;
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

function html(url: string, body: string, status = 200): SafeResponse {
  return response({
    url,
    status,
    body,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

const MENTIONS = `<!doctype html><html lang="fr"><body>
<p>Éditeur : Jeanne Martin, directrice de la publication du cabinet.</p>
<p>Hébergeur : Netlify, qui publie ces pages.</p>
<p>Contact : <a href="mailto:contact@exemple.fr">contact@exemple.fr</a></p>
</body></html>`;

const PRIVACY = `<!doctype html><html lang="fr"><body>
<p>Cette page explique les données lues, leur finalité et leur durée de conservation.</p>
<p>Contact : <a href="mailto:contact@exemple.fr">contact@exemple.fr</a></p>
</body></html>`;

function home(links = true): string {
  const nav = links
    ? '<a href="/mentions-legales">Mentions légales</a><a href="/confidentialite">Politique de confidentialité</a>'
    : '';
  return `<!doctype html><html lang="fr"><body><p>Cabinet Martin, ostéopathie.</p>${nav}</body></html>`;
}

function context(
  options: {
    target?: string;
    scope?: 'origin' | 'path';
    pages?: Record<string, SafeResponse | 'throw' | 'budget'>;
    fetch?: SafeFetch;
  } = {},
): RunContext {
  const pages = options.pages ?? {};
  const fetch: SafeFetch = options.fetch
    ? options.fetch
    : async (input) => {
        const url = new URL(input);
        const hit = pages[url.href];
        if (hit === 'throw') throw new NetError('NETWORK', 'panne');
        if (hit === 'budget') throw new NetError('BUDGET_EXCEEDED', 'budget');
        if (hit) return hit;
        if (url.pathname === '/robots.txt') {
          return response({
            url: url.href,
            status: 404,
            headers: { 'content-type': 'text/plain' },
          });
        }
        throw new Error(`fetch inattendu ${url.href}`);
      };
  const ctx: RunContext = {
    target: {
      url: new URL(options.target ?? `${ORIGIN}/`),
      scope: options.scope ?? 'origin',
      hosting: 'other',
    },
    verified: false,
    net: { fetch, dns: noDns, tls: noTls },
    shared: createSharedArtifacts(),
    budget: createRequestBudget({ perHostIntervalMs: 0 }),
    now: () => new Date('2026-10-24T12:00:00.000Z'),
  };
  return ctx;
}

async function seed(ctx: RunContext, name: string | unknown): Promise<void> {
  const value = typeof name === 'string' ? fixture(name) : name;
  await ctx.shared.get(BROWSER_KEY, async () => value);
}

const byId = Object.fromEntries(
  VIE_PRIVEE_CHECKS.map((check) => [check.id, check]),
);

function check(id: string): Check {
  const found = byId[id];
  if (!found) throw new Error(id);
  return found;
}

async function run(
  id: string,
  ctx: RunContext,
  available: readonly Check['needs'][number][] = ['http', 'browser'],
): Promise<CheckResult> {
  const [outcome] = await runChecks([check(id)], ctx, {
    available,
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
  if (result.reason?.startsWith('vie_privee.')) seen.add(result.reason);
  const template = fr[key as MessageKey];
  expect(template, key).toBeTruthy();
  const issues = lintText(template, 'apps/web/src/i18n/fr.ts');
  expect(failureCount(issues), template).toBe(0);
  expect(
    issues.filter((issue) => issue.rule === 'sentence-length'),
    template,
  ).toEqual([]);
  expect(template).not.toMatch(GUILT);
  for (const name of template.matchAll(/\{([A-Za-z0-9_]+)\}/g)) {
    expect(result.params?.[name[1] ?? ''], key).toBeDefined();
  }
  if (status === 'warn' || status === 'fail')
    expect(result.fixKey).toBe(idOf(key));
  else expect(result.fixKey).toBeUndefined();
}

function idOf(key: string): string {
  if (key.startsWith('vie_privee.untested')) return key;
  const parts = key.split('.');
  return `${parts[0]}.${parts[1]}`;
}

function legalPages(): Record<string, SafeResponse> {
  return {
    [`${ORIGIN}/`]: html(`${ORIGIN}/`, home()),
    [`${ORIGIN}/mentions-legales`]: html(
      `${ORIGIN}/mentions-legales`,
      MENTIONS,
    ),
    [`${ORIGIN}/confidentialite`]: html(`${ORIGIN}/confidentialite`, PRIVACY),
  };
}

describe('liste de traceurs', () => {
  it('note la licence, le commit et l’empreinte', () => {
    expect(TRACKER_LIST.license).toBe('CC BY-NC-SA 4.0');
    expect(TRACKER_LIST.commit).toBe(
      'a54ee0ccc2a90192123341f4842d2884d1832dc3',
    );
    expect(TRACKER_LIST.verifiedOn).toBe('2026-10-24');
    const license = readFileSync(`${DATA}LICENSE`, 'utf8');
    expect(license).toContain('Copyright 2020 Duck Duck Go, Inc.');
    expect(license).toContain('CC BY-NC-SA 4.0');
    const notice = readFileSync(`${DATA}NOTICE.md`, 'utf8');
    expect(notice).toContain(TRACKER_LIST.commit);
    expect(notice).toContain(TRACKER_LIST.sha256);
    const domains = readFileSync(`${DATA}domains.txt`);
    // Git (`core.autocrlf`) réécrit LF en CRLF sur Windows. L’empreinte
    // publiée est celle du fichier LF. On ne réécrit pas domains.txt.
    const pourEmpreinte =
      process.platform === 'win32' ? sansRetourChariot(domains) : domains;
    expect(createHash('sha256').update(pourEmpreinte).digest('hex')).toBe(
      TRACKER_LIST.sha256,
    );
    const lf = Uint8Array.from([0x61, 0x0a]);
    const crlf = Uint8Array.from([0x61, 0x0d, 0x0a]);
    const empreinteLf = createHash('sha256').update(lf).digest('hex');
    const empreinteCrlf = createHash('sha256')
      .update(sansRetourChariot(crlf))
      .digest('hex');
    expect(empreinteCrlf).toBe(empreinteLf);
    if (process.platform !== 'win32') {
      expect(createHash('sha256').update(crlf).digest('hex')).not.toBe(
        createHash('sha256').update(lf).digest('hex'),
      );
    }
    expect(TRACKER_DOMAINS.size).toBe(45835);
    expect(matchesTracker('www.google-analytics.com')).toBe(true);
    expect(matchesTracker('fonts.gstatic.com')).toBe(true);
    expect(matchesTracker('cdn.cabinet-martin.test')).toBe(false);
    expect(TRACKER_DOMAINS.has('%2a.googleapis.com')).toBe(false);
  });
});

describe('schéma du runner', () => {
  it('accepte les fixtures et refuse une valeur de trace', () => {
    for (const name of [
      'clean.json',
      'trackers.json',
      'cmp-reject.json',
      'no-reject.json',
      'fonts.json',
      'scripts.json',
    ]) {
      expect(
        BrowserAuditResultSchema.safeParse(fixture(name)).success,
        name,
      ).toBe(true);
    }
    const rejected = fixture('cookie-value.json');
    expect(BrowserAuditResultSchema.safeParse(rejected).success).toBe(false);
    expect(JSON.stringify(rejected)).toContain('secret-trace');
    const wrongVersion = cloneReport('clean.json');
    expect(
      BrowserAuditResultSchema.safeParse({ ...wrongVersion, version: 2 })
        .success,
    ).toBe(false);
  });

  it('conserve le type de ressource tel que le runner le nomme', () => {
    const audit = cloneReport('clean.json');
    const first = audit.loads.desktop.requests[0];
    if (!first) throw new Error('requête');
    first.resourceType = 'ping';
    const parsed = BrowserAuditResultSchema.parse(audit);
    expect(parsed.loads.desktop.requests[0]?.resourceType).toBe('ping');
  });
});

describe('même site', () => {
  it('rapproche www et un sous-domaine, pas deux sites github.io', () => {
    expect(sameSite('cdn.exemple.test', 'www.exemple.test')).toBe(true);
    expect(sameSite('other.github.io', 'user.github.io')).toBe(false);
    expect(sameSite('cdn.user.github.io', 'user.github.io')).toBe(true);
  });
});

describe('checks navigateur', () => {
  it('ne contacte pas le site et reste neutre sans traceur', async () => {
    const ctx = context({
      fetch: () => Promise.reject(new Error('réseau interdit')),
    });
    await seed(ctx, 'clean.json');
    expectResult(
      await run('vie_privee.traceurs', ctx),
      'pass',
      'vie_privee.traceurs.pass',
    );
    expectResult(
      await run('vie_privee.cmp', ctx),
      'pass',
      'vie_privee.cmp.pass_none',
    );
    expectResult(
      await run('vie_privee.refus', ctx),
      'na',
      'vie_privee.refus.na',
    );
    expectResult(
      await run('vie_privee.tiers', ctx),
      'pass',
      'vie_privee.tiers.pass',
    );
    const seeded = await runChecks(
      VIE_PRIVEE_CHECKS.filter((item) => item.needs.includes('browser')),
      ctx,
      { available: ['http', 'browser'], concurrency: 1 },
    );
    for (const outcome of seeded) {
      expect(outcome.result.messageKey).not.toContain('untested');
      expect(outcome.result.reason ?? '').not.toContain('runner');
    }
  });

  it('signale les traceurs de la fixture, pas le bandeau', async () => {
    const tracked = context();
    await seed(tracked, 'trackers.json');
    const many = await run('vie_privee.traceurs', tracked);
    expectResult(many, 'fail', 'vie_privee.traceurs.fail_many');
    expect(many.params).toEqual({ count: 2 });
    expect(many.measured).toMatchObject({
      hosts: ['doubleclick.net', 'google-analytics.com'],
    });
    expectResult(
      await run('vie_privee.cmp', tracked),
      'fail',
      'vie_privee.cmp.fail',
    );
    expectResult(
      await run('vie_privee.refus', tracked),
      'fail',
      'vie_privee.refus.fail_absent',
    );
    expectResult(
      await run('vie_privee.tiers', tracked),
      'fail',
      'vie_privee.tiers.fail_scripts_one',
    );

    const one = context();
    const single = cloneReport('clean.json');
    single.preConsent.cookies = [
      {
        name: '_ga',
        domain: '.google-analytics.com',
        path: '/',
        thirdParty: true,
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expires: null,
        lifetimeDays: null,
        setBy: 'script',
        valueLength: 8,
      },
    ];
    await seed(one, single);
    expectResult(
      await run('vie_privee.traceurs', one),
      'fail',
      'vie_privee.traceurs.fail_one',
    );
  });

  it('accepte un refus au premier niveau et ignore le script du bandeau', async () => {
    const ctx = context();
    await seed(ctx, 'cmp-reject.json');
    const trackers = await run('vie_privee.traceurs', ctx);
    expectResult(trackers, 'fail', 'vie_privee.traceurs.fail_one');
    expect(trackers.measured).toMatchObject({
      hosts: ['google-analytics.com'],
    });
    expect(JSON.stringify(trackers.measured)).not.toContain('cookiebot');
    expectResult(
      await run('vie_privee.cmp', ctx),
      'pass',
      'vie_privee.cmp.pass',
    );
    expectResult(
      await run('vie_privee.refus', ctx),
      'pass',
      'vie_privee.refus.pass',
    );
  });

  it('signale un refus absent du premier niveau', async () => {
    const ctx = context();
    await seed(ctx, 'no-reject.json');
    expectResult(
      await run('vie_privee.traceurs', ctx),
      'pass',
      'vie_privee.traceurs.pass',
    );
    expectResult(
      await run('vie_privee.cmp', ctx),
      'pass',
      'vie_privee.cmp.pass',
    );
    expectResult(
      await run('vie_privee.refus', ctx),
      'fail',
      'vie_privee.refus.fail',
    );
  });

  it('distingue une police tierce d’un script tiers', async () => {
    const fonts = context();
    await seed(fonts, 'fonts.json');
    expectResult(
      await run('vie_privee.traceurs', fonts),
      'pass',
      'vie_privee.traceurs.pass',
    );
    expectResult(
      await run('vie_privee.tiers', fonts),
      'warn',
      'vie_privee.tiers.warn_fonts_one',
    );
    const many = context();
    await seed(
      many,
      addRequest(
        cloneReport('fonts.json'),
        'https://fonts.cabinet-martin.test/texte.woff2',
        'fonts.cabinet-martin.test',
        'font',
      ),
    );
    const warned = await run('vie_privee.tiers', many);
    expectResult(warned, 'warn', 'vie_privee.tiers.warn_fonts_many');
    expect(warned.params).toEqual({ count: 2 });

    const scripts = context();
    await seed(scripts, 'scripts.json');
    expectResult(
      await run('vie_privee.tiers', scripts),
      'fail',
      'vie_privee.tiers.fail_scripts_one',
    );
    const several = context();
    await seed(
      several,
      addRequest(
        cloneReport('scripts.json'),
        'https://cdn.autre-cabinet.test/app.js',
        'cdn.autre-cabinet.test',
        'script',
      ),
    );
    const failed = await run('vie_privee.tiers', several);
    expectResult(failed, 'fail', 'vie_privee.tiers.fail_scripts_many');
    expect(failed.params).toEqual({ count: 2 });
  });

  it('sans rapport, ou avec un rapport inutilisable, reste non testé', async () => {
    const missing = context({
      fetch: () => Promise.reject(new Error('réseau interdit')),
    });
    for (const id of [
      'vie_privee.traceurs',
      'vie_privee.cmp',
      'vie_privee.refus',
      'vie_privee.tiers',
    ]) {
      const result = await run(id, missing);
      expectResult(result, 'untested', `${id}.untested`);
      expect(result.reason).toBe('vie_privee.untested_runner');
    }
    const invalid = context();
    await seed(invalid, 'cookie-value.json');
    const bad = await run('vie_privee.cmp', invalid);
    expectResult(bad, 'untested', 'vie_privee.untested_runner_invalid');
    expect(JSON.stringify(bad)).not.toContain('secret-trace');
    const clicked = context();
    await seed(clicked, {
      ...(fixture('clean.json') as object),
      interacted: true,
    });
    expectResult(
      await run('vie_privee.tiers', clicked),
      'untested',
      'vie_privee.untested_interaction',
    );
  });

  it('sans navigateur, ne lance pas le check', async () => {
    const ctx = context({ pages: legalPages() });
    await seed(ctx, 'clean.json');
    const result = await run('vie_privee.traceurs', ctx, ['http']);
    expectResult(result, 'untested', 'reason.missing_source');
    expect(result.params).toEqual({ source: 'browser' });
    const outcomes = await runChecks([...VIE_PRIVEE_CHECKS], ctx, {
      available: ['http'],
      concurrency: 1,
    });
    const domain = scoreDomain('vie_privee', outcomes);
    expect(domain.score).toBeNull();
    expect(domain.level).toBe('untested');
    expect(domain.coverage).toBeLessThan(0.5);
  });

  it('sans rapport navigateur, couverture sous 50 % et sept clés nommées', async () => {
    const ctx = context({ pages: legalPages() });
    const outcomes = await runChecks([...VIE_PRIVEE_CHECKS], ctx, {
      available: ['http', 'browser'],
      concurrency: 1,
    });
    const browserIds = [
      'vie_privee.cmp',
      'vie_privee.refus',
      'vie_privee.tiers',
      'vie_privee.traceurs',
    ];
    for (const id of browserIds) {
      const outcome = outcomes.find((item) => item.checkId === id);
      if (!outcome) throw new Error(id);
      expectResult(outcome.result, 'untested', `${id}.untested`);
    }
    const domain = scoreDomain('vie_privee', outcomes);
    expect(domain.score).toBeNull();
    expect(domain.level).toBe('untested');
    expect(domain.coverage).toBeCloseTo(5 / 15);
    expect(new Set(outcomes.map((item) => item.result.messageKey)).size).toBe(
      7,
    );
  });
});

describe('pages légales', () => {
  it('lit les liens, le texte et les trois éléments', async () => {
    const page = new URL(`${ORIGIN}/`);
    const links = findLegalLinks(home(), page);
    expect(links.map((link) => link.kind)).toEqual(['mentions', 'privacy']);
    expect(
      classifyLink('Mentions légales', new URL(`${ORIGIN}/mentions-legales`)),
    ).toBe('mentions');
    expect(legalElements(MENTIONS, MENTIONS)).toMatchObject({
      editor: true,
      host: true,
      contact: true,
    });
    const ctx = context({ pages: legalPages() });
    expectResult(
      await run('vie_privee.mentions', ctx),
      'pass',
      'vie_privee.mentions.pass',
    );
    expectResult(
      await run('vie_privee.confidentialite', ctx),
      'pass',
      'vie_privee.confidentialite.pass',
    );
    expectResult(
      await run('vie_privee.elements', ctx),
      'pass',
      'vie_privee.elements.pass',
    );
  });

  it('une seule page peut couvrir les deux liens', async () => {
    const body = `<!doctype html><html lang="fr"><body>
      <a href="/mentions-legales">Mentions légales et politique de confidentialité</a>
    </body></html>`;
    const ctx = context({
      pages: {
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, body),
        [`${ORIGIN}/mentions-legales`]: html(
          `${ORIGIN}/mentions-legales`,
          MENTIONS,
        ),
      },
    });
    expectResult(
      await run('vie_privee.mentions', ctx),
      'pass',
      'vie_privee.mentions.pass',
    );
    expectResult(
      await run('vie_privee.confidentialite', ctx),
      'pass',
      'vie_privee.confidentialite.pass',
    );
  });

  it('signale une page absente, vide, ou illisible', async () => {
    const missing = context({
      pages: { [`${ORIGIN}/`]: html(`${ORIGIN}/`, home(false)) },
    });
    expectResult(
      await run('vie_privee.mentions', missing),
      'fail',
      'vie_privee.mentions.fail_missing',
    );
    expectResult(
      await run('vie_privee.confidentialite', missing),
      'fail',
      'vie_privee.confidentialite.fail_missing',
    );
    expectResult(
      await run('vie_privee.elements', missing),
      'fail',
      'vie_privee.elements.fail',
    );

    const empty = context({
      pages: {
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, home()),
        [`${ORIGIN}/mentions-legales`]: html(
          `${ORIGIN}/mentions-legales`,
          '<p>Court</p>',
        ),
        [`${ORIGIN}/confidentialite`]: html(
          `${ORIGIN}/confidentialite`,
          '<p>Court aussi</p>',
        ),
      },
    });
    expectResult(
      await run('vie_privee.mentions', empty),
      'fail',
      'vie_privee.mentions.fail_empty',
    );
    expectResult(
      await run('vie_privee.confidentialite', empty),
      'fail',
      'vie_privee.confidentialite.fail_empty',
    );

    const partial = context({
      pages: {
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, home()),
        [`${ORIGIN}/mentions-legales`]: html(
          `${ORIGIN}/mentions-legales`,
          '<p>Éditeur : Jeanne Martin. Hébergeur : Netlify, qui publie le cabinet depuis Lyon.</p>',
        ),
        [`${ORIGIN}/confidentialite`]: html(
          `${ORIGIN}/confidentialite`,
          '<p>Court</p>',
        ),
      },
    });
    const warn = await run('vie_privee.elements', partial);
    expectResult(warn, 'warn', 'vie_privee.elements.warn');
    expect(warn.params).toEqual({ missing: 'un contact' });

    const pdf = context({
      pages: {
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, home()),
        [`${ORIGIN}/mentions-legales`]: response({
          url: `${ORIGIN}/mentions-legales`,
          body: '%PDF-1.7',
          headers: { 'content-type': 'application/pdf' },
        }),
        [`${ORIGIN}/confidentialite`]: html(
          `${ORIGIN}/confidentialite`,
          '<p>Court</p>',
        ),
      },
    });
    expectResult(
      await run('vie_privee.mentions', pdf),
      'untested',
      'vie_privee.untested_page',
    );
  });

  it('reste non testé si l’accueil, robots ou la page légale ne répond pas', async () => {
    const down = context({
      pages: { [`${ORIGIN}/`]: 'throw' },
    });
    expectResult(
      await run('vie_privee.mentions', down),
      'untested',
      'vie_privee.untested_home',
    );

    const status = context({
      pages: {
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, home(), 503),
      },
    });
    const homeStatus = await run('vie_privee.confidentialite', status);
    expectResult(homeStatus, 'untested', 'vie_privee.untested_home_status');
    expect(homeStatus.params).toEqual({ status: 503 });

    const plain = context({
      pages: {
        [`${ORIGIN}/`]: response({
          url: `${ORIGIN}/`,
          body: 'bonjour',
          headers: { 'content-type': 'text/plain' },
        }),
      },
    });
    expectResult(
      await run('vie_privee.elements', plain),
      'untested',
      'vie_privee.untested_not_html',
    );

    const robotsDown = context({
      pages: { [`${ORIGIN}/robots.txt`]: 'throw' },
    });
    expectResult(
      await run('vie_privee.mentions', robotsDown),
      'untested',
      'vie_privee.untested_robots_down',
    );

    const robotsStatus = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: response({
          url: `${ORIGIN}/robots.txt`,
          status: 500,
          headers: { 'content-type': 'text/plain' },
        }),
      },
    });
    const robots = await run('vie_privee.elements', robotsStatus);
    expectResult(robots, 'untested', 'vie_privee.untested_robots_status');
    expect(robots.params).toEqual({ status: 500 });

    const budget = context({
      pages: { [`${ORIGIN}/robots.txt`]: 'budget' },
    });
    expectResult(
      await run('vie_privee.confidentialite', budget),
      'untested',
      'vie_privee.untested_budget',
    );

    const blocked = context({
      pages: {
        [`${ORIGIN}/robots.txt`]: response({
          url: `${ORIGIN}/robots.txt`,
          body: 'User-agent: audigybot\nDisallow: /mentions-legales\n',
          headers: { 'content-type': 'text/plain' },
        }),
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, home()),
        [`${ORIGIN}/confidentialite`]: html(
          `${ORIGIN}/confidentialite`,
          PRIVACY,
        ),
      },
    });
    expectResult(
      await run('vie_privee.mentions', blocked),
      'untested',
      'vie_privee.untested_robots',
    );

    const pageDown = context({
      pages: {
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, home()),
        [`${ORIGIN}/mentions-legales`]: 'throw',
        [`${ORIGIN}/confidentialite`]: html(
          `${ORIGIN}/confidentialite`,
          PRIVACY,
        ),
      },
    });
    expectResult(
      await run('vie_privee.mentions', pageDown),
      'untested',
      'vie_privee.untested_down',
    );

    const pageStatus = context({
      pages: {
        [`${ORIGIN}/`]: html(`${ORIGIN}/`, home()),
        [`${ORIGIN}/mentions-legales`]: html(
          `${ORIGIN}/mentions-legales`,
          MENTIONS,
          502,
        ),
        [`${ORIGIN}/confidentialite`]: html(
          `${ORIGIN}/confidentialite`,
          PRIVACY,
        ),
      },
    });
    const legal = await run('vie_privee.mentions', pageStatus);
    expectResult(legal, 'untested', 'vie_privee.untested_page_status');
    expect(legal.params).toEqual({ status: 502 });
  });

  it('ignore un lien hors du chemin audité', async () => {
    const ctx = context({
      target: `${ORIGIN}/cabinet/`,
      scope: 'path',
      pages: {
        [`${ORIGIN}/cabinet/`]: html(
          `${ORIGIN}/cabinet/`,
          `<!doctype html><html lang="fr"><body><a href="/mentions-legales">Mentions légales</a></body></html>`,
        ),
      },
    });
    expectResult(
      await run('vie_privee.mentions', ctx),
      'fail',
      'vie_privee.mentions.fail_missing',
    );
  });
});

describe('textes, fiches et méthode', () => {
  it('chaque clé vie privée est produite par un test', () => {
    const keys = Object.keys(fr).filter((key) => key.startsWith('vie_privee.'));
    expect(keys.filter((key) => !seen.has(key)).sort()).toEqual([]);
  });

  it('chaque check a une fiche CNIL, sans formulation culpabilisante', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    const methode = readFileSync(
      fileURLToPath(
        new URL('../../../docs/produit/METHODE.md', import.meta.url),
      ),
      'utf8',
    );
    expect(methode).toContain('CC BY-NC-SA 4.0');
    expect(methode).toContain('a54ee0ccc2a90192123341f4842d2884d1832dc3');
    createRegistry([...VIE_PRIVEE_CHECKS]);
    for (const item of VIE_PRIVEE_CHECKS) {
      const sheet = sheets.get(item.id);
      expect(sheet, item.id).toBeTruthy();
      if (!sheet) continue;
      expect(
        sheet.sources.some((source) =>
          source.url.startsWith('https://www.cnil.fr/'),
        ),
      ).toBe(true);
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
        expect(prose).not.toMatch(GUILT);
      }
      expect(methode).toContain(`| ${item.id} | ${item.weight} |`);
    }
  });
});

/** Retire les CR des paires CRLF. Un fichier déjà en LF est inchangé. */
function sansRetourChariot(octets: Uint8Array): Uint8Array {
  let retraits = 0;
  for (let i = 0; i < octets.length - 1; i += 1) {
    if (octets[i] === 0x0d && octets[i + 1] === 0x0a) retraits += 1;
  }
  if (retraits === 0) return octets;
  const out = new Uint8Array(octets.length - retraits);
  let n = 0;
  for (let i = 0; i < octets.length; i += 1) {
    if (octets[i] === 0x0d && octets[i + 1] === 0x0a) continue;
    out[n] = octets[i] ?? 0;
    n += 1;
  }
  return out;
}
