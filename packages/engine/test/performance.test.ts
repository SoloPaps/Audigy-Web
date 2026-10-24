import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createRequestBudget,
  type ExternalApi,
  type ExternalRequest,
} from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { fr, type MessageKey } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import { memoryDayCache } from '../checks/performance/cache.js';
import {
  CRUX_ATTEMPT_TIMEOUT_MS,
  CRUX_SHARED_KEY,
  createPerformanceChecks,
  PERFORMANCE_CHECKS,
  PSI_ATTEMPT_TIMEOUT_MS,
  PSI_SHARED_KEY,
} from '../checks/performance/index.js';
import {
  judgeCache,
  judgeCls,
  judgeCompression,
  judgeInp,
  judgeLcp,
  judgeLighthouse,
  judgeWeight,
} from '../checks/performance/judge.js';
import type {
  CruxBundle,
  CruxOk,
  PsiBundle,
  PsiStrategyResult,
} from '../checks/performance/types.js';
import { PSI_CATEGORIES } from '../checks/performance/types.js';
import { FIXES_FR_DIR, fileFixStore } from '../src/fixes-fs.js';
import { googleApiKey, withGoogleApi } from '../src/google-api.js';
import {
  type CheckOutcome,
  type CheckResult,
  createRegistry,
  createSharedArtifacts,
  loadFixes,
  type RunContext,
  runChecks,
  scoreDomain,
} from '../src/index.js';
import { makeContext } from './helpers.js';

const SECRET = 'clef-test-performance';
const NOW = new Date('2026-10-23T12:00:00.000Z');
const FIXTURES = fileURLToPath(
  new URL('../fixtures/performance/', import.meta.url),
);
const AVAILABLE = ['http', 'dns', 'tls', 'psi', 'crux'] as const;
const seen = new Set<string>();

interface Reply {
  status: number;
  text: string;
}

function fixture(name: string): string {
  return readFileSync(`${FIXTURES}${name}`, 'utf8');
}

function ok(name: string): Reply {
  return { status: 200, text: fixture(name) };
}

function asList(reply: Reply | Reply[]): Reply[] {
  return Array.isArray(reply) ? [...reply] : [reply];
}

function scripted(options: {
  mobile?: Reply | Reply[];
  desktop?: Reply | Reply[];
  cruxUrl?: Reply | Reply[];
  cruxOrigin?: Reply | Reply[];
}): { api: ExternalApi; calls: ExternalRequest[] } {
  const queues = {
    mobile: asList(options.mobile ?? []),
    desktop: asList(options.desktop ?? []),
    url: asList(options.cruxUrl ?? []),
    origin: asList(options.cruxOrigin ?? []),
  };
  const calls: ExternalRequest[] = [];
  const api: ExternalApi = {
    async request(input) {
      calls.push(input);
      if (input.url.hostname === 'www.googleapis.com') {
        const strategy = input.url.searchParams.get('strategy');
        const next =
          strategy === 'desktop'
            ? queues.desktop.shift()
            : queues.mobile.shift();
        if (!next) throw new Error(`psi inattendu ${strategy ?? ''}`);
        return next;
      }
      const body = JSON.parse(input.body ?? '{}') as {
        url?: string;
        origin?: string;
      };
      const next = body.url
        ? queues.url.shift()
        : body.origin
          ? queues.origin.shift()
          : undefined;
      if (!next) throw new Error('crux inattendu');
      return next;
    },
  };
  return { api, calls };
}

function context(
  api: ExternalApi | undefined,
  options: { now?: Date; url?: string } = {},
): RunContext {
  return {
    target: {
      url: new URL(options.url ?? 'https://exemple.test/'),
      scope: 'origin',
      hosting: 'other',
    },
    verified: false,
    net: {
      fetch: async () => {
        throw new Error('fetch du site inattendu');
      },
      dns: {
        query: async () => {
          throw new Error('dns inattendu');
        },
        addresses: async () => {
          throw new Error('dns inattendu');
        },
      },
      tls: async () => {
        throw new Error('tls inattendu');
      },
      ...(api ? { api } : {}),
    },
    shared: createSharedArtifacts(),
    budget: createRequestBudget({ perHostIntervalMs: 0 }),
    now: () => options.now ?? NOW,
  };
}

async function runAll(
  api: ExternalApi,
  options: {
    cache?: ReturnType<typeof memoryDayCache>;
    now?: Date;
    url?: string;
    apiKey?: () => string | undefined;
  } = {},
): Promise<{
  outcomes: CheckOutcome[];
  ctx: RunContext;
  calls: ExternalRequest[];
}> {
  const script = api as ExternalApi & { calls?: ExternalRequest[] };
  const checks = createPerformanceChecks({
    apiKey: options.apiKey ?? (() => SECRET),
    ...(options.cache ? { cache: options.cache } : {}),
  });
  const ctx = context(api, options);
  const outcomes = await runChecks(checks, ctx, {
    available: AVAILABLE,
    concurrency: 4,
  });
  expect(JSON.stringify(outcomes)).not.toContain(SECRET);
  return { outcomes, ctx, calls: script.calls ?? [] };
}

function resultOf(outcomes: CheckOutcome[], id: string): CheckResult {
  const found = outcomes.find((item) => item.checkId === id);
  if (!found) throw new Error(id);
  return found.result;
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

function strategy(
  name: 'mobile' | 'desktop',
  score: number | null,
  auditScore: number | null,
  bytes: number | null,
): PsiStrategyResult {
  const audit = { score: auditScore, numericValue: bytes };
  return {
    strategy: name,
    categories: {
      performance: score,
      accessibility: null,
      'best-practices': null,
      seo: null,
    },
    audits: {
      'total-byte-weight': audit,
      'uses-long-cache-ttl': { score: auditScore, numericValue: null },
      'uses-text-compression': { score: auditScore, numericValue: null },
    },
    lighthouseVersion: '12.6.1',
  };
}

function psi(
  mobile: PsiStrategyResult | null,
  desktop: PsiStrategyResult | null,
): PsiBundle {
  return { ok: true, mobile, desktop, fetchedOn: '2026-10-23' };
}

function outcome(
  checkId: string,
  weight: 1 | 2 | 3,
  result: CheckResult,
): CheckOutcome {
  return {
    checkId,
    domain: 'performance',
    mode: 'passive',
    weight,
    result,
  };
}

/** Laboratoire noté, cache et compression sans audit (cas PSI réel fréquent). */
function labOnlyPsi(): PsiBundle {
  const none = { score: null, numericValue: null };
  const mobile = strategy('mobile', 0.91, 0.9, 200_000);
  const desktop = strategy('desktop', 0.95, 0.9, 180_000);
  mobile.audits['uses-long-cache-ttl'] = none;
  desktop.audits['uses-long-cache-ttl'] = none;
  mobile.audits['uses-text-compression'] = none;
  desktop.audits['uses-text-compression'] = none;
  return psi(mobile, desktop);
}

function fieldOutcomes(
  bundle: PsiBundle,
  cruxBundle: CruxBundle,
): CheckOutcome[] {
  return [
    outcome('performance.cache', 1, judgeCache(bundle)),
    outcome('performance.cls', 2, judgeCls(cruxBundle)),
    outcome('performance.compression', 1, judgeCompression(bundle)),
    outcome('performance.inp', 2, judgeInp(cruxBundle)),
    outcome('performance.lcp', 2, judgeLcp(cruxBundle)),
    outcome('performance.lighthouse', 3, judgeLighthouse(bundle)),
    outcome('performance.poids', 1, judgeWeight(bundle)),
  ];
}

function crux(
  metrics: Partial<CruxOk['metrics']>,
  scope: 'url' | 'origin' = 'url',
): CruxOk {
  return {
    ok: true,
    scope,
    formFactor: 'PHONE',
    metrics: { lcpMs: null, inpMs: null, cls: null, ...metrics },
    period: { first: '2026-09-26', last: '2026-10-23' },
    fetchedOn: '2026-10-23',
  };
}

describe('registre performance', () => {
  it('expose sept checks passifs, dans l’ordre des identifiants', () => {
    expect(PERFORMANCE_CHECKS.map((item) => item.id)).toEqual([
      'performance.cache',
      'performance.cls',
      'performance.compression',
      'performance.inp',
      'performance.lcp',
      'performance.lighthouse',
      'performance.poids',
    ]);
    const registry = createRegistry(PERFORMANCE_CHECKS);
    expect(registry.list({ domain: 'performance' })).toHaveLength(7);
    expect(registry.list({ mode: 'active' })).toHaveLength(0);
    for (const item of PERFORMANCE_CHECKS) {
      expect(item.mode).toBe('passive');
      expect(item.domain).toBe('performance');
      expect(item.needs).toEqual(
        item.id === 'performance.lcp' ||
          item.id === 'performance.inp' ||
          item.id === 'performance.cls'
          ? ['crux']
          : ['psi'],
      );
    }
    const slow = PERFORMANCE_CHECKS.find(
      (item) => item.id === 'performance.lighthouse',
    );
    expect(slow?.timeoutMs).toBe(PSI_ATTEMPT_TIMEOUT_MS * 4 + 20_000);
  });

  it('ne sort pas du réseau autrement que par ctx.net.api', () => {
    const dir = fileURLToPath(
      new URL('../checks/performance/', import.meta.url),
    );
    const source = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(`${dir}/${name}`, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(
      /node:https|node:http|globalThis\.fetch|createExternalApi|process\.env|GOOGLE_API_KEY/,
    );
    const wire = readFileSync(
      fileURLToPath(new URL('../src/google-api.ts', import.meta.url)),
      'utf8',
    );
    expect(wire).toContain('createExternalApi');
    expect(wire).toContain('GOOGLE_API_KEY');
  });
});

describe('réponses de laboratoire et de terrain', () => {
  it('note un site rapide et garde les catégories pour la suite', async () => {
    const { api, calls } = scripted({
      mobile: ok('psi-mobile.json'),
      desktop: ok('psi-desktop.json'),
      cruxUrl: ok('crux-url.json'),
    });
    const { outcomes, ctx } = await runAll(api);
    expectResult(
      resultOf(outcomes, 'performance.lighthouse'),
      'pass',
      'performance.lighthouse.pass',
    );
    expect(resultOf(outcomes, 'performance.lighthouse').params).toEqual({
      mobile: 96,
      desktop: 91,
    });
    expect(resultOf(outcomes, 'performance.lighthouse').score).toBe(0.91);
    expectResult(
      resultOf(outcomes, 'performance.lcp'),
      'pass',
      'performance.lcp.pass',
    );
    expect(resultOf(outcomes, 'performance.lcp').params).toEqual({
      secondes: '1,8',
    });
    expect(resultOf(outcomes, 'performance.lcp').measured).toMatchObject({
      scope: 'url',
      lcpMs: 1800,
      formFactor: 'PHONE',
    });
    expectResult(
      resultOf(outcomes, 'performance.inp'),
      'pass',
      'performance.inp.pass',
    );
    expect(resultOf(outcomes, 'performance.inp').params).toEqual({
      millisecondes: 150,
    });
    expectResult(
      resultOf(outcomes, 'performance.cls'),
      'pass',
      'performance.cls.pass',
    );
    expect(resultOf(outcomes, 'performance.cls').params).toEqual({
      valeur: '0,05',
    });
    expectResult(
      resultOf(outcomes, 'performance.poids'),
      'pass',
      'performance.poids.pass',
    );
    expect(resultOf(outcomes, 'performance.poids').params).toEqual({
      poids: '391 ko',
    });
    expectResult(
      resultOf(outcomes, 'performance.cache'),
      'pass',
      'performance.cache.pass',
    );
    expectResult(
      resultOf(outcomes, 'performance.compression'),
      'pass',
      'performance.compression.pass',
    );
    expect(scoreDomain('performance', outcomes).score).toBe(98);

    const psiCalls = calls.filter(
      (call) => call.url.hostname === 'www.googleapis.com',
    );
    expect(psiCalls).toHaveLength(2);
    expect(psiCalls[0]?.timeoutMs).toBe(PSI_ATTEMPT_TIMEOUT_MS);
    expect(psiCalls[0]?.url.searchParams.getAll('category')).toEqual([
      ...PSI_CATEGORIES,
    ]);
    expect(
      psiCalls.map((call) => call.url.searchParams.get('strategy')),
    ).toEqual(['mobile', 'desktop']);
    expect(psiCalls[0]?.url.searchParams.get('key')).toBe(SECRET);
    const post = calls.find((call) => call.method === 'POST');
    expect(post?.timeoutMs).toBe(CRUX_ATTEMPT_TIMEOUT_MS);
    expect(JSON.parse(post?.body ?? '{}')).toEqual({
      url: 'https://exemple.test/',
      formFactor: 'PHONE',
    });
    expect(calls.some((call) => call.body?.includes('origin'))).toBe(false);

    const stored = (await ctx.shared.get(PSI_SHARED_KEY, async () => {
      throw new Error('rechargé');
    })) as PsiBundle;
    if (!stored.ok || !stored.mobile) throw new Error('psi');
    expect(stored.mobile.categories).toMatchObject({
      performance: 0.96,
      accessibility: 0.88,
      'best-practices': 1,
      seo: 0.91,
    });
    expect(Object.keys(stored.mobile.audits).sort()).toEqual([
      'total-byte-weight',
      'uses-long-cache-ttl',
      'uses-text-compression',
    ]);
    expect(ctx.shared.has(CRUX_SHARED_KEY)).toBe(true);
  });

  it('note un site lent', async () => {
    const { api } = scripted({
      mobile: ok('psi-mobile-poor.json'),
      desktop: ok('psi-desktop-poor.json'),
      cruxUrl: ok('crux-poor.json'),
    });
    const { outcomes } = await runAll(api);
    expectResult(
      resultOf(outcomes, 'performance.lighthouse'),
      'fail',
      'performance.lighthouse.fail',
    );
    expect(resultOf(outcomes, 'performance.lighthouse').params).toEqual({
      mobile: 32,
      desktop: 40,
    });
    expectResult(
      resultOf(outcomes, 'performance.lcp'),
      'fail',
      'performance.lcp.fail',
    );
    expect(resultOf(outcomes, 'performance.lcp').params).toEqual({
      secondes: '5,2',
    });
    expectResult(
      resultOf(outcomes, 'performance.inp'),
      'fail',
      'performance.inp.fail',
    );
    expectResult(
      resultOf(outcomes, 'performance.cls'),
      'fail',
      'performance.cls.fail',
    );
    expectResult(
      resultOf(outcomes, 'performance.poids'),
      'fail',
      'performance.poids.fail',
    );
    expect(resultOf(outcomes, 'performance.poids').params).toEqual({
      poids: '7,6 Mo',
    });
    expectResult(
      resultOf(outcomes, 'performance.cache'),
      'fail',
      'performance.cache.fail',
    );
    expectResult(
      resultOf(outcomes, 'performance.compression'),
      'fail',
      'performance.compression.fail',
    );
    expect(scoreDomain('performance', outcomes).score).toBe(12);
  });

  it('note un site moyen', async () => {
    const { api } = scripted({
      mobile: ok('psi-mobile-mid.json'),
      desktop: ok('psi-desktop-mid.json'),
      cruxUrl: ok('crux-mid.json'),
    });
    const { outcomes } = await runAll(api);
    expectResult(
      resultOf(outcomes, 'performance.lighthouse'),
      'warn',
      'performance.lighthouse.warn',
    );
    expect(resultOf(outcomes, 'performance.lighthouse').params).toEqual({
      mobile: 62,
      desktop: 70,
    });
    expectResult(
      resultOf(outcomes, 'performance.lcp'),
      'warn',
      'performance.lcp.warn',
    );
    expect(resultOf(outcomes, 'performance.lcp').params).toEqual({
      secondes: '3,0',
    });
    expectResult(
      resultOf(outcomes, 'performance.inp'),
      'warn',
      'performance.inp.warn',
    );
    expect(resultOf(outcomes, 'performance.inp').params).toEqual({
      millisecondes: 320,
    });
    expectResult(
      resultOf(outcomes, 'performance.cls'),
      'warn',
      'performance.cls.warn',
    );
    expect(resultOf(outcomes, 'performance.cls').params).toEqual({
      valeur: '0,18',
    });
    expectResult(
      resultOf(outcomes, 'performance.poids'),
      'warn',
      'performance.poids.warn',
    );
    expect(resultOf(outcomes, 'performance.poids').params).toEqual({
      poids: '2,4 Mo',
    });
    expectResult(
      resultOf(outcomes, 'performance.cache'),
      'warn',
      'performance.cache.warn',
    );
    expectResult(
      resultOf(outcomes, 'performance.compression'),
      'warn',
      'performance.compression.warn',
    );
    expect(scoreDomain('performance', outcomes).score).toBe(56);
  });
});

describe('échecs honnêtes', () => {
  it('un quota 429 devient Non testé, sans insister sur l’autre stratégie', async () => {
    const quota = { status: 429, text: fixture('psi-quota.json') };
    const { api, calls } = scripted({
      mobile: [quota, quota],
      cruxUrl: ok('crux-url.json'),
    });
    const { outcomes } = await runAll(api);
    expectResult(
      resultOf(outcomes, 'performance.lighthouse'),
      'untested',
      'performance.quota',
    );
    expect(fr['performance.quota']).toMatch(/^Nous n’avons pas pu tester/);
    expect(JSON.stringify(outcomes)).not.toContain('RESOURCE_EXHAUSTED');
    expect(
      calls.filter(
        (call) => call.url.searchParams.get('strategy') === 'desktop',
      ),
    ).toHaveLength(0);
    expect(
      calls.filter(
        (call) => call.url.searchParams.get('strategy') === 'mobile',
      ),
    ).toHaveLength(2);
    expectResult(
      resultOf(outcomes, 'performance.lcp'),
      'pass',
      'performance.lcp.pass',
    );
  });

  it('réessaie une fois puis accepte la réponse', async () => {
    const { api, calls } = scripted({
      mobile: [{ status: 500, text: '' }, ok('psi-mobile.json')],
      desktop: ok('psi-desktop.json'),
      cruxUrl: ok('crux-url.json'),
    });
    const { outcomes } = await runAll(api);
    expect(resultOf(outcomes, 'performance.lighthouse').status).toBe('pass');
    expect(
      calls.filter(
        (call) => call.url.searchParams.get('strategy') === 'mobile',
      ),
    ).toHaveLength(2);
  });

  it('une stratégie manquante est dite, sans cacher le score obtenu', async () => {
    const { api } = scripted({
      mobile: ok('psi-mobile.json'),
      desktop: [
        { status: 500, text: '' },
        { status: 500, text: '' },
      ],
      cruxUrl: ok('crux-url.json'),
    });
    const { outcomes } = await runAll(api);
    const result = resultOf(outcomes, 'performance.lighthouse');
    expectResult(result, 'warn', 'performance.lighthouse.partial');
    expect(result.params).toEqual({ score: 96 });
    expect(result.score).toBe(0.96);
  });

  it('sans donnée d’adresse, interroge l’origine', async () => {
    const missing = { status: 404, text: fixture('crux-not-found.json') };
    const { api, calls } = scripted({
      mobile: ok('psi-mobile.json'),
      desktop: ok('psi-desktop.json'),
      cruxUrl: missing,
      cruxOrigin: ok('crux-origin.json'),
    });
    const { outcomes } = await runAll(api, {
      url: 'https://exemple.test/dossier/page',
    });
    const lcp = resultOf(outcomes, 'performance.lcp');
    expectResult(lcp, 'pass', 'performance.lcp.pass');
    expect(lcp.params).toEqual({ secondes: '2,0' });
    expect(lcp.measured).toMatchObject({ scope: 'origin', lcpMs: 2000 });
    expect(resultOf(outcomes, 'performance.cls').params).toEqual({
      valeur: '0,04',
    });
    const posts = calls.filter((call) => call.method === 'POST');
    expect(JSON.parse(posts[0]?.body ?? '{}')).toEqual({
      url: 'https://exemple.test/dossier/page',
      formFactor: 'PHONE',
    });
    expect(JSON.parse(posts[1]?.body ?? '{}')).toEqual({
      origin: 'https://exemple.test',
      formFactor: 'PHONE',
    });
  });

  it('sans donnée de terrain, le dit sans accuser le site', async () => {
    const missing = { status: 404, text: fixture('crux-not-found.json') };
    const { api } = scripted({
      mobile: ok('psi-mobile.json'),
      desktop: ok('psi-desktop.json'),
      cruxUrl: missing,
      cruxOrigin: missing,
    });
    const { outcomes } = await runAll(api);
    for (const id of [
      'performance.lcp',
      'performance.inp',
      'performance.cls',
    ]) {
      expectResult(resultOf(outcomes, id), 'na', 'performance.field.absent');
    }
    expect(fr['performance.field.absent']).not.toMatch(/pas pu tester|lent/);
    expect(scoreDomain('performance', outcomes)).toMatchObject({
      score: 96,
      coverage: 1,
      testedWeight: 6,
      totalWeight: 6,
    });
  });

  it('sans donnée de terrain, le laboratoire suffit à noter la vitesse', () => {
    const bundle = labOnlyPsi();
    const absent = { ok: false as const, reason: 'no_data' as const };
    for (const result of [
      judgeLcp(absent),
      judgeInp(absent),
      judgeCls(absent),
    ]) {
      expectResult(result, 'na', 'performance.field.absent');
      expect(result.reason).toBe('performance.field.absent');
    }
    expect(judgeCache(bundle).status).toBe('na');
    expect(judgeCompression(bundle).status).toBe('na');
    expect(
      scoreDomain('performance', fieldOutcomes(bundle, absent)),
    ).toMatchObject({
      score: 91,
      coverage: 1,
      testedWeight: 4,
      totalWeight: 4,
      level: 'good',
    });
  });

  it('clé absente, quota ou erreur de terrain restent Non testé', () => {
    const bundle = labOnlyPsi();
    const cases = [
      { reason: 'missing_key' as const, key: 'performance.missing_key' },
      {
        reason: 'quota' as const,
        key: 'performance.quota',
        status: 429,
      },
      { reason: 'error' as const, key: 'performance.error', status: 500 },
    ];
    for (const item of cases) {
      const failure = {
        ok: false as const,
        reason: item.reason,
        ...(item.status === undefined ? {} : { status: item.status }),
      };
      for (const result of [
        judgeLcp(failure),
        judgeInp(failure),
        judgeCls(failure),
      ]) {
        expectResult(result, 'untested', item.key);
      }
      expect(
        scoreDomain('performance', fieldOutcomes(bundle, failure)),
      ).toMatchObject({
        score: null,
        coverage: 0.4,
        testedWeight: 4,
        totalWeight: 10,
        level: 'untested',
      });
    }
  });

  it('une mesure de terrain absente reste Non testé', async () => {
    const record = JSON.parse(fixture('crux-url.json')) as {
      record: { metrics: Record<string, unknown> };
    };
    delete record.record.metrics.interaction_to_next_paint;
    const { api } = scripted({
      mobile: ok('psi-mobile.json'),
      desktop: ok('psi-desktop.json'),
      cruxUrl: { status: 200, text: JSON.stringify(record) },
    });
    const { outcomes } = await runAll(api);
    expectResult(
      resultOf(outcomes, 'performance.inp'),
      'untested',
      'performance.field.metric_absent',
    );
    expect(resultOf(outcomes, 'performance.lcp').status).toBe('pass');
  });

  it('une erreur réseau devient Non testé', async () => {
    const calls: ExternalRequest[] = [];
    const api: ExternalApi = {
      async request(input) {
        calls.push(input);
        if (input.url.hostname === 'www.googleapis.com') {
          throw new Error('réseau coupé');
        }
        return ok('crux-url.json');
      },
    };
    const { outcomes } = await runAll(api);
    expectResult(
      resultOf(outcomes, 'performance.lighthouse'),
      'untested',
      'performance.error',
    );
    expect(calls.filter((call) => call.method === 'GET')).toHaveLength(4);
  });

  it('sans clé et sans client, aucun appel', async () => {
    const { api, calls } = scripted({
      mobile: ok('psi-mobile.json'),
      desktop: ok('psi-desktop.json'),
      cruxUrl: ok('crux-url.json'),
    });
    const { outcomes } = await runAll(api, { apiKey: () => undefined });
    expect(calls).toHaveLength(0);
    expectResult(
      resultOf(outcomes, 'performance.lighthouse'),
      'untested',
      'performance.missing_key',
    );
    const ctx = context(undefined);
    const [orphan] = await runChecks(
      createPerformanceChecks({ apiKey: () => SECRET }),
      ctx,
      { available: AVAILABLE },
    );
    expect(orphan?.result.messageKey).toBe('performance.missing_key');
  });

  it('met en cache le succès et le quota, pas l’erreur, pour la journée', async () => {
    const wrapped = new Map<string, string>();
    const guarded = {
      get: (key: string) => wrapped.get(key),
      set: (key: string, value: string) => {
        expect(key).not.toContain(SECRET);
        expect(value).not.toContain(SECRET);
        wrapped.set(key, value);
      },
    };
    const first = scripted({
      mobile: ok('psi-mobile.json'),
      desktop: ok('psi-desktop.json'),
      cruxUrl: ok('crux-url.json'),
    });
    await runAll(first.api, { cache: guarded });
    const after = first.calls.length;
    const second = scripted({
      mobile: ok('psi-mobile.json'),
      desktop: ok('psi-desktop.json'),
      cruxUrl: ok('crux-url.json'),
    });
    await runAll(second.api, { cache: guarded });
    expect(second.calls).toHaveLength(0);
    expect(after).toBeGreaterThan(0);

    const quota = { status: 429, text: fixture('psi-quota.json') };
    const quotaCache = memoryDayCache();
    const q1 = scripted({
      mobile: [quota, quota],
      cruxUrl: ok('crux-url.json'),
    });
    await runAll(q1.api, { cache: quotaCache });
    const q2 = scripted({
      mobile: [quota, quota],
      cruxUrl: ok('crux-url.json'),
    });
    await runAll(q2.api, { cache: quotaCache });
    expect(q2.calls).toHaveLength(0);

    const failed = scripted({
      mobile: [
        { status: 500, text: '' },
        { status: 500, text: '' },
      ],
      desktop: [
        { status: 500, text: '' },
        { status: 500, text: '' },
      ],
      cruxUrl: ok('crux-url.json'),
    });
    const errorCache = memoryDayCache();
    await runAll(failed.api, { cache: errorCache });
    const again = scripted({
      mobile: [
        { status: 500, text: '' },
        { status: 500, text: '' },
      ],
      desktop: [
        { status: 500, text: '' },
        { status: 500, text: '' },
      ],
      cruxUrl: ok('crux-url.json'),
    });
    await runAll(again.api, { cache: errorCache });
    expect(again.calls.filter((call) => call.method === 'GET')).toHaveLength(4);
    expect(again.calls.filter((call) => call.method === 'POST')).toHaveLength(
      0,
    );

    const next = scripted({
      mobile: ok('psi-mobile.json'),
      desktop: ok('psi-desktop.json'),
      cruxUrl: ok('crux-url.json'),
    });
    await runAll(next.api, {
      cache: guarded,
      now: new Date('2026-10-24T00:00:00.000Z'),
    });
    expect(next.calls.length).toBeGreaterThan(0);
  });
});

describe('seuils', () => {
  it('arrondit le score de laboratoire au point', () => {
    expectResult(
      judgeLighthouse(
        psi(
          strategy('mobile', 0.795, 1, 1000),
          strategy('desktop', 0.795, 1, 1000),
        ),
      ),
      'pass',
      'performance.lighthouse.pass',
    );
    expectResult(
      judgeLighthouse(
        psi(
          strategy('mobile', 0.794, 1, 1000),
          strategy('desktop', 0.794, 1, 1000),
        ),
      ),
      'warn',
      'performance.lighthouse.warn',
    );
    expectResult(
      judgeLighthouse(
        psi(
          strategy('mobile', 0.495, 1, 1000),
          strategy('desktop', 0.495, 1, 1000),
        ),
      ),
      'warn',
      'performance.lighthouse.warn',
    );
    expectResult(
      judgeLighthouse(
        psi(
          strategy('mobile', 0.494, 1, 1000),
          strategy('desktop', 0.494, 1, 1000),
        ),
      ),
      'fail',
      'performance.lighthouse.fail',
    );
  });

  it('suit les seuils de visite réelle', () => {
    expect(judgeLcp(crux({ lcpMs: 2500 })).status).toBe('pass');
    expect(judgeLcp(crux({ lcpMs: 2501 })).status).toBe('warn');
    expect(judgeLcp(crux({ lcpMs: 4000 })).status).toBe('warn');
    expect(judgeLcp(crux({ lcpMs: 4001 })).status).toBe('fail');
    expect(judgeInp(crux({ inpMs: 200 })).status).toBe('pass');
    expect(judgeInp(crux({ inpMs: 201 })).status).toBe('warn');
    expect(judgeInp(crux({ inpMs: 500 })).status).toBe('warn');
    expect(judgeInp(crux({ inpMs: 501 })).status).toBe('fail');
    expect(judgeCls(crux({ cls: 0.1 })).status).toBe('pass');
    expect(judgeCls(crux({ cls: 0.11 })).status).toBe('warn');
    expect(judgeCls(crux({ cls: 0.25 })).status).toBe('warn');
    expect(judgeCls(crux({ cls: 0.26 })).status).toBe('fail');
  });

  it('dit quand le poids n’a pas de valeur, ou que l’audit ne s’applique pas', () => {
    const none = { score: null, numericValue: null };
    expectResult(
      judgeWeight(
        psi(strategy('mobile', 1, 1, null), strategy('desktop', 1, 1, null)),
      ),
      'pass',
      'performance.poids.pass_sans_valeur',
    );
    expectResult(
      judgeWeight(
        psi(
          strategy('mobile', 1, 0.6, null),
          strategy('desktop', 1, 0.6, null),
        ),
      ),
      'warn',
      'performance.poids.warn_sans_valeur',
    );
    expectResult(
      judgeWeight(
        psi(
          strategy('mobile', 1, 0.2, null),
          strategy('desktop', 1, 0.2, null),
        ),
      ),
      'fail',
      'performance.poids.fail_sans_valeur',
    );
    const empty = strategy('mobile', 0.9, null, null);
    empty.audits['uses-long-cache-ttl'] = none;
    empty.audits['uses-text-compression'] = none;
    empty.audits['total-byte-weight'] = none;
    expectResult(judgeCache(psi(empty, null)), 'na', 'performance.audit.na');
    expectResult(
      judgeCompression(psi(empty, null)),
      'na',
      'performance.audit.na',
    );
  });
});

describe('clé, fiches et méthode', () => {
  it('lit la clé sans la poser dans le client déjà injecté', async () => {
    expect(googleApiKey({})).toBeUndefined();
    expect(googleApiKey({ GOOGLE_API_KEY: '   ' })).toBeUndefined();
    expect(googleApiKey({ GOOGLE_API_KEY: '  abc  ' })).toBe('abc');
    const plain = withGoogleApi(makeContext(), {});
    expect(plain.net.api).toBeUndefined();
    const wired = withGoogleApi(makeContext(), {
      GOOGLE_API_KEY: SECRET,
    });
    if (!wired.net.api) throw new Error('api');
    const error = await wired.net.api
      .request({
        method: 'GET',
        url: new URL(`https://127.0.0.1/?key=${SECRET}`),
        timeoutMs: 1000,
      })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'BLOCKED_ADDRESS' });
    expect(JSON.stringify(error)).not.toContain(SECRET);
    const custom: ExternalApi = {
      request: async () => ({ status: 204, text: '' }),
    };
    const kept = withGoogleApi(
      { ...makeContext(), net: { ...makeContext().net, api: custom } },
      { GOOGLE_API_KEY: SECRET },
    );
    expect(kept.net.api).toBe(custom);
  });

  it('chaque check a une fiche, et la grille est dans la méthode', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    const methode = readFileSync(
      fileURLToPath(new URL('../../../docs/METHODE.md', import.meta.url)),
      'utf8',
    );
    expect(methode).toContain('120 secondes');
    expect(methode).toContain('CrUX');
    expect(methode).toMatch(
      /Sans donnée de visite réelle[\s\S]{0,240}Non applicable/,
    );
    for (const item of PERFORMANCE_CHECKS) {
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
    for (const name of readdirSync(FIXTURES)) {
      expect(name.endsWith('.json')).toBe(true);
      expect(() => JSON.parse(fixture(name))).not.toThrow();
    }
  });

  it('chaque clé de performance est produite par un test', () => {
    const keys = Object.keys(fr).filter((key) =>
      key.startsWith('performance.'),
    );
    expect(keys.filter((key) => !seen.has(key)).sort()).toEqual([]);
  });
});
