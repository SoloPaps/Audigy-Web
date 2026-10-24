import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createRequestBudget,
  type DohResolver,
  type ExternalApi,
  type ExternalRequest,
  type SafeFetch,
  type TlsProbe,
} from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { fr, type MessageKey } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import {
  ACCESSIBILITE_CHECKS,
  createAccessibiliteChecks,
} from '../checks/accessibilite/index.js';
import { memoryDayCache } from '../checks/performance/cache.js';
import type {
  PsiBundle,
  PsiStrategyResult,
} from '../checks/performance/types.js';
import {
  PERFORMANCE_CHECK_TIMEOUT_MS,
  PSI_SHARED_KEY,
} from '../checks/performance/types.js';
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
const PSI = fileURLToPath(new URL('../fixtures/performance/', import.meta.url));
const SECRET = 'clef-test-acces';
const seen = new Set<string>();

const noDns: DohResolver = {
  query: () => Promise.reject(new Error('DNS non disponible en test')),
  addresses: () => Promise.reject(new Error('DNS non disponible en test')),
};
const noTls: TlsProbe = () =>
  Promise.reject(new Error('TLS non disponible en test'));

function strategy(
  name: 'mobile' | 'desktop',
  accessibility: number | null,
): PsiStrategyResult {
  const empty = { score: null, numericValue: null };
  return {
    strategy: name,
    categories: {
      performance: null,
      accessibility,
      'best-practices': null,
      seo: null,
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

function context(api?: ExternalApi): { ctx: RunContext } {
  const fetch: SafeFetch = () => {
    throw new Error('fetch inattendu');
  };
  return {
    ctx: {
      target: {
        url: new URL('https://exemple.test/'),
        scope: 'origin',
        hosting: 'other',
      },
      verified: false,
      net: {
        fetch,
        dns: noDns,
        tls: noTls,
        ...(api ? { api } : {}),
      },
      shared: createSharedArtifacts(),
      budget: createRequestBudget({ perHostIntervalMs: 0 }),
      now: () => NOW,
    },
  };
}

async function seedPsi(ctx: RunContext, value: PsiBundle): Promise<void> {
  await ctx.shared.get(PSI_SHARED_KEY, async () => value);
}

const check = ACCESSIBILITE_CHECKS[0] as Check;

async function run(
  ctx: RunContext,
  available: readonly Check['needs'][number][] = ['http', 'dns', 'tls', 'gsc'],
): Promise<CheckResult> {
  const [outcome] = await runChecks([check], ctx, {
    available,
    concurrency: 1,
  });
  if (!outcome) throw new Error(check.id);
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
    expect(result.fixKey).toBe('accessibilite.lighthouse');
  else expect(result.fixKey).toBeUndefined();
}

describe('registre Accès', () => {
  it('expose un check passif qui lit le lot PSI', () => {
    expect(ACCESSIBILITE_CHECKS.map((item) => item.id)).toEqual([
      'accessibilite.lighthouse',
    ]);
    const registry = createRegistry(ACCESSIBILITE_CHECKS);
    expect(registry.list({ domain: 'accessibilite' })).toHaveLength(1);
    expect(registry.list({ mode: 'active' })).toHaveLength(0);
    expect(check.mode).toBe('passive');
    expect(check.domain).toBe('accessibilite');
    expect(check.needs).toEqual([]);
    expect(check.timeoutMs).toBe(PERFORMANCE_CHECK_TIMEOUT_MS);
    expect(check.weight).toBe(3);
  });

  it('ne joint pas le réseau hors de ctx.net', () => {
    const dir = fileURLToPath(
      new URL('../checks/accessibilite/', import.meta.url),
    );
    const source = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(`${dir}/${name}`, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(
      /node:https|node:http|globalThis\.fetch|createExternalApi|process\.env|GOOGLE_API_KEY/,
    );
  });
});

describe('accessibilite.lighthouse', () => {
  it('lit la catégorie accessibilité du lot partagé, sans second appel', async () => {
    const calls: ExternalRequest[] = [];
    const api: ExternalApi = {
      request: async (input) => {
        calls.push(input);
        throw new Error('appel inattendu');
      },
    };
    const { ctx } = context(api);
    await seedPsi(ctx, bundle(0.91, 0.92));
    const result = await run(ctx);
    expectResult(result, 'pass', 'accessibilite.lighthouse.pass');
    expect(result.params).toEqual({ mobile: 91, desktop: 92 });
    expect(result.score).toBe(0.91);
    expect(result.measured).toMatchObject({
      score: 0.91,
      mobile: 0.91,
      desktop: 0.92,
      lighthouseVersion: '12.6.1',
    });
    expect(calls).toHaveLength(0);
    const domain = scoreDomain('accessibilite', [
      {
        checkId: check.id,
        domain: 'accessibilite',
        mode: 'passive',
        weight: check.weight,
        result,
      },
    ]);
    expect(domain.score).toBe(91);
    expect(domain.coverage).toBeGreaterThanOrEqual(0.5);
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
    const lighthouse = createAccessibiliteChecks({
      apiKey: () => SECRET,
      cache,
    })[0];
    if (!lighthouse) throw new Error('lighthouse');
    const { ctx } = context(api);
    const [first] = await runChecks([lighthouse], ctx, {
      available: ['http', 'psi'],
    });
    const [second] = await runChecks([lighthouse], ctx, {
      available: ['http', 'psi'],
    });
    expectResult(
      first?.result as CheckResult,
      'pass',
      'accessibilite.lighthouse.pass',
    );
    expect(first?.result.params).toEqual({ mobile: 88, desktop: 90 });
    expect(second?.result.score).toBe(0.88);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url.searchParams.getAll('category')).toContain(
      'accessibility',
    );
    expect(JSON.stringify(first?.result)).not.toContain(SECRET);
    const again = context(api);
    await runChecks([lighthouse], again.ctx, { available: ['http', 'psi'] });
    expect(calls).toHaveLength(2);
  });

  it('note les seuils, le manque et les échecs de source', async () => {
    const warn = context();
    await seedPsi(warn.ctx, bundle(0.62, 0.7));
    expectResult(await run(warn.ctx), 'warn', 'accessibilite.lighthouse.warn');
    const fail = context();
    await seedPsi(fail.ctx, bundle(0.32, 0.4));
    const failed = await run(fail.ctx);
    expectResult(failed, 'fail', 'accessibilite.lighthouse.fail');
    expect(failed.params).toEqual({ mobile: 32, desktop: 40 });

    const high = context();
    await seedPsi(high.ctx, bundle(0.91, null));
    const partial = await run(high.ctx);
    expectResult(partial, 'warn', 'accessibilite.lighthouse.partial');
    expect(partial.params).toEqual({ score: 91 });

    const low = context();
    await seedPsi(low.ctx, bundle(0.4, null));
    const partialFail = await run(low.ctx);
    expectResult(partialFail, 'fail', 'accessibilite.lighthouse.partial');
    expect(partialFail.params).toEqual({ score: 40 });

    const absent = context();
    await seedPsi(absent.ctx, {
      ok: true,
      mobile: strategy('mobile', null),
      desktop: strategy('desktop', null),
      fetchedOn: '2026-10-23',
    });
    expectResult(
      await run(absent.ctx),
      'untested',
      'accessibilite.lighthouse.absent',
    );

    const missing = context();
    const missed = await run(missing.ctx);
    expectResult(missed, 'untested', 'accessibilite.lighthouse.missing_key');
    const domain = scoreDomain('accessibilite', [
      {
        checkId: check.id,
        domain: 'accessibilite',
        mode: 'passive',
        weight: check.weight,
        result: missed,
      },
    ]);
    expect(domain.score).toBeNull();
    expect(domain.level).toBe('untested');
    expect(domain.coverage).toBe(0);

    const quota = context();
    await seedPsi(quota.ctx, { ok: false, reason: 'quota', status: 429 });
    expectResult(
      await run(quota.ctx),
      'untested',
      'accessibilite.lighthouse.quota',
    );
    const error = context();
    await seedPsi(error.ctx, { ok: false, reason: 'error', status: 500 });
    expectResult(
      await run(error.ctx),
      'untested',
      'accessibilite.lighthouse.error',
    );
    const bare = context();
    await seedPsi(bare.ctx, { ok: false, reason: 'error' });
    expectResult(
      await run(bare.ctx),
      'untested',
      'accessibilite.lighthouse.error',
    );
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
    const lighthouse = createAccessibiliteChecks({
      apiKey: () => SECRET,
      cache: memoryDayCache(),
    })[0];
    if (!lighthouse) throw new Error('lighthouse');
    const { ctx } = context(api);
    const [outcome] = await runChecks([lighthouse], ctx, {
      available: ['http', 'psi'],
    });
    expectResult(
      outcome?.result as CheckResult,
      'untested',
      'accessibilite.lighthouse.quota',
    );
    expect(calls.length).toBeGreaterThan(0);
    expect(JSON.stringify(outcome?.result)).not.toContain(SECRET);
  });
});

describe('textes, fiche et méthode', () => {
  it('chaque clé Accès est produite par un test', () => {
    const keys = Object.keys(fr).filter((key) =>
      key.startsWith('accessibilite.lighthouse.'),
    );
    expect(keys.filter((key) => !seen.has(key)).sort()).toEqual([]);
  });

  it('la fiche et la méthode décrivent le check', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    const methode = readFileSync(
      fileURLToPath(new URL('../../../docs/METHODE.md', import.meta.url)),
      'utf8',
    );
    const sheet = sheets.get('accessibilite.lighthouse');
    expect(sheet).toBeTruthy();
    if (!sheet) return;
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
      const issues = lintText(prose, 'accessibilite.lighthouse.md');
      expect(failureCount(issues), prose).toBe(0);
      expect(
        issues.filter((issue) => issue.rule === 'sentence-length'),
        prose,
      ).toEqual([]);
    }
    expect(methode).toContain(
      '| accessibilite.lighthouse | 3 | Les deux scores sont là, et le plus faible vaut au moins 80. |',
    );
  });
});
