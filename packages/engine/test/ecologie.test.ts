import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createExternalApi,
  createRequestBudget,
  type ExternalApi,
  type ExternalRequest,
  GREEN_WEB_HOST,
} from '@audigy/net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fr, type MessageKey } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import {
  CO2_LIBRARY,
  estimateVisit,
  formatGrams,
} from '../checks/ecologie/co2.js';
import {
  computeEcoIndex,
  ECOINDEX_QUANTILE_TABLE,
  gradeOf,
  greenhouseGases,
  roundHalfEven,
  sizeKbFromBytes,
  waterCl,
} from '../checks/ecologie/ecoindex.js';
import {
  GREEN_CHECK_TIMEOUT_MS,
  GREEN_SHARED_KEY,
  greenCheckUrl,
  loadGreen,
  parseGreenCheck,
} from '../checks/ecologie/green.js';
import {
  createEcologieChecks,
  ECOLOGIE_CHECKS,
} from '../checks/ecologie/index.js';
import {
  judgeBudget,
  judgeCache,
  judgeCo2,
  judgeCompression,
  judgeEcoIndex,
  judgeFonts,
  judgeHost,
  judgeImages,
} from '../checks/ecologie/judge.js';
import { labPage } from '../checks/ecologie/page.js';
import {
  parseRgesnResponses,
  RGESN_QUESTIONS,
  RGESN_VERSION,
  RgesnSchemaError,
  rgesnProgress,
  rgesnQuestion,
} from '../checks/ecologie/questionnaire.js';
import { memoryDayCache } from '../checks/performance/cache.js';
import {
  parsePageFacts,
  parsePsiStrategy,
} from '../checks/performance/parse.js';
import {
  PERFORMANCE_CHECK_TIMEOUT_MS,
  PSI_SHARED_KEY,
  type PsiBundle,
  type PsiPageFacts,
  type PsiStrategyResult,
} from '../checks/performance/types.js';
import { FIXES_FR_DIR, fileFixStore } from '../src/fixes-fs.js';
import {
  type CheckOutcome,
  type CheckResult,
  createRegistry,
  createSharedArtifacts,
  loadFixes,
  type RunContext,
  runChecks,
  withExternalApi,
} from '../src/index.js';
import { makeContext } from './helpers.js';

const SECRET = 'clef-test-ecologie';
const NOW = new Date('2026-10-23T12:00:00.000Z');
const FIXTURES = fileURLToPath(
  new URL('../fixtures/ecologie/', import.meta.url),
);
const PAGE = readFileSync(`${FIXTURES}psi-page.json`, 'utf8');
const GREEN = JSON.stringify({
  green: true,
  url: 'www.exemple.test',
  hosted_by: 'Exemple Vert',
  supporting_documents: [{ id: 'document-secret' }],
});
const seen = new Set<string>();

interface Reply {
  status: number;
  text: string;
}

beforeAll(() => {
  vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau interdit')));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function asList(reply: Reply | Reply[]): Reply[] {
  return Array.isArray(reply) ? [...reply] : [reply];
}

function scripted(
  options: {
    psi?: Reply | Reply[];
    green?: Reply | Reply[];
    throwGreen?: boolean;
  } = {},
): { api: ExternalApi; calls: ExternalRequest[] } {
  const psi = asList(options.psi ?? []);
  const green = asList(options.green ?? []);
  const calls: ExternalRequest[] = [];
  const api: ExternalApi = {
    async request(input) {
      calls.push(input);
      if (input.url.hostname === 'www.googleapis.com') {
        const next = psi.shift();
        if (!next) throw new Error('psi inattendu');
        return next;
      }
      if (input.url.hostname === GREEN_WEB_HOST) {
        if (options.throwGreen) throw new Error('réseau');
        const next = green.shift();
        if (!next) throw new Error('annuaire inattendu');
        return next;
      }
      throw new Error(`hôte inattendu ${input.url.hostname}`);
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

function facts(partial: Partial<PsiPageFacts> = {}): PsiPageFacts {
  return {
    bytes: null,
    requests: null,
    domElements: null,
    fontFiles: null,
    fontBytes: null,
    rasterImages: null,
    efficientImages: null,
    ...partial,
  };
}

function side(
  name: 'mobile' | 'desktop',
  page: Partial<PsiPageFacts>,
  audits: { cache?: number | null; compression?: number | null } = {},
): PsiStrategyResult {
  return {
    strategy: name,
    categories: {
      performance: 1,
      accessibility: null,
      'best-practices': null,
      seo: null,
    },
    audits: {
      'total-byte-weight': {
        score: 1,
        numericValue: page.bytes ?? null,
      },
      'uses-long-cache-ttl': {
        score: audits.cache === undefined ? null : audits.cache,
        numericValue: null,
      },
      'uses-text-compression': {
        score: audits.compression === undefined ? null : audits.compression,
        numericValue: null,
      },
    },
    lighthouseVersion: '12.6.1',
    page: facts(page),
  };
}

function psi(
  mobile: PsiStrategyResult | null,
  desktop: PsiStrategyResult | null,
): PsiBundle {
  return { ok: true, mobile, desktop, fetchedOn: '2026-10-23' };
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
  if (status === 'untested' || status === 'na') expect(result.reason).toBe(key);
}

describe('formule EcoIndex', () => {
  it('reproduit trois cas de référence', () => {
    expect(ECOINDEX_QUANTILE_TABLE).toBe('ecoindex-5.10.0');
    expect(sizeKbFromBytes(107_178)).toBeCloseTo(107.178, 6);
    const readme = computeEcoIndex({ dom: 100, requests: 100, sizeKb: 100 });
    expect(readme).toEqual({ score: 72, grade: 'B', ges: 1.56, water: 2.34 });
    const library = computeEcoIndex({
      dom: 201,
      requests: 6,
      sizeKb: 107.178,
    });
    expect(library).toEqual({ score: 87, grade: 'A', ges: 1.26, water: 1.89 });
    const edge = computeEcoIndex({ dom: 47, requests: 2, sizeKb: 1.37 });
    expect(edge).toEqual({ score: 95, grade: 'A', ges: 1.1, water: 1.65 });
    expect(greenhouseGases(72)).toBe(1.56);
    expect(waterCl(72)).toBe(2.34);
  });

  it('arrondit moitié-pair et borne la lettre', () => {
    expect(roundHalfEven(0.5)).toBe(0);
    expect(roundHalfEven(1.5)).toBe(2);
    expect(roundHalfEven(2.5)).toBe(2);
    expect(gradeOf(100)).toBe('A');
    expect(gradeOf(81)).toBe('A');
    expect(gradeOf(80)).toBe('B');
    expect(gradeOf(0)).toBe('G');
    expect(computeEcoIndex({ dom: -1, requests: 0, sizeKb: 0 })).toBeNull();
    expect(computeEcoIndex({ dom: 1.2, requests: 0, sizeKb: 0 })).toBeNull();
    const heavy = computeEcoIndex({
      dom: 666,
      requests: 148,
      sizeKb: 1163.386,
    });
    expect(heavy).toMatchObject({
      score: 39,
      grade: 'E',
      ges: 2.22,
      water: 3.33,
    });
  });
});

describe('CO2.js', () => {
  it('estime une visite avec le modèle SWD', () => {
    expect(CO2_LIBRARY).toBe('0.19.0');
    const grey = estimateVisit(1_000_000, false);
    const green = estimateVisit(1_000_000, true);
    expect(grey).toMatchObject({ rating: 'C' });
    expect(green).toMatchObject({ rating: 'B' });
    expect(grey?.grams).toBeCloseTo(0.1482, 4);
    expect(green?.grams).toBeCloseTo(0.12103, 5);
    expect(formatGrams(0.1482)).toBe('0,15');
    expect(formatGrams(0.12103)).toBe('0,12');
    expect(formatGrams(0.0001482)).toBe('moins de 0,01');
    expect(estimateVisit(-1, false)).toBeNull();
  });
});

describe('jugements', () => {
  const light = { bytes: 100_000, requests: 100, domElements: 100 };
  const good = { bytes: 107_178, requests: 6, domElements: 201 };
  const heavy = { bytes: 1_163_386, requests: 148, domElements: 666 };

  it('note l’EcoIndex et dit que c’est une estimation', () => {
    const warn = judgeEcoIndex(
      psi(side('mobile', light), side('desktop', light)),
    );
    expectResult(warn, 'warn', 'ecologie.ecoindex.warn');
    expect(warn.params).toEqual({ score: 72, lettre: 'B' });
    expect(warn.score).toBe(0.72);
    expect(warn.measured).toMatchObject({
      estimate: true,
      ges: 1.56,
      water: 2.34,
      strategy: 'mobile',
      single: false,
    });
    const pass = judgeEcoIndex(
      psi(side('mobile', good), side('desktop', good)),
    );
    expectResult(pass, 'pass', 'ecologie.ecoindex.pass');
    expect(pass.params).toEqual({ score: 87, lettre: 'A' });
    const fail = judgeEcoIndex(
      psi(side('mobile', heavy), side('desktop', heavy)),
    );
    expectResult(fail, 'fail', 'ecologie.ecoindex.fail');
    expect(fail.severity).toBe(3);
    expect(fail.params).toEqual({ score: 39, lettre: 'E' });
    expectResult(
      judgeEcoIndex(psi(side('mobile', good), null)),
      'pass',
      'ecologie.ecoindex.pass_une',
    );
    expectResult(
      judgeEcoIndex(psi(side('mobile', light), null)),
      'warn',
      'ecologie.ecoindex.warn_une',
    );
    expectResult(
      judgeEcoIndex(psi(side('mobile', heavy), null)),
      'fail',
      'ecologie.ecoindex.fail_une',
    );
    const incomplete = judgeEcoIndex(
      psi(side('mobile', { bytes: 1000, requests: 2 }), null),
    );
    expectResult(incomplete, 'untested', 'ecologie.ecoindex.incomplete');
    expect(incomplete.params).toEqual({ manque: 'le nombre d’éléments' });
    expectResult(
      judgeEcoIndex({ ok: false, reason: 'missing_key' }),
      'untested',
      'ecologie.missing_key',
    );
    expectResult(
      judgeEcoIndex({ ok: false, reason: 'quota', status: 429 }),
      'untested',
      'ecologie.psi_quota',
    );
    const errored = judgeEcoIndex({ ok: false, reason: 'error', status: 500 });
    expectResult(errored, 'untested', 'ecologie.psi_error');
    expect(errored.measured).toEqual({ httpStatus: 500 });
    expectResult(
      judgeEcoIndex({ ok: false, reason: 'error' }),
      'untested',
      'ecologie.psi_error',
    );
    expectResult(
      judgeEcoIndex(psi(null, null)),
      'untested',
      'ecologie.psi_error',
    );
  });

  it('retient le côté le plus complet, puis le plus lourd', () => {
    const chosen = labPage(
      psi(side('mobile', light), side('desktop', good)) as Extract<
        PsiBundle,
        { ok: true }
      >,
    );
    expect(chosen).toMatchObject({ strategy: 'desktop', single: false });
    const tie = labPage(
      psi(side('mobile', light), side('desktop', light)) as Extract<
        PsiBundle,
        { ok: true }
      >,
    );
    expect(tie?.strategy).toBe('mobile');
    const only = labPage(
      psi(
        side('mobile', good),
        side('desktop', { bytes: 9_000_000 }),
      ) as Extract<PsiBundle, { ok: true }>,
    );
    expect(only).toMatchObject({ strategy: 'mobile', single: true });
  });

  it('estime le CO2 selon l’annuaire', () => {
    const page = { bytes: 1_000_000, requests: 10, domElements: 10 };
    const grey = judgeCo2(psi(side('mobile', page), side('desktop', page)), {
      ok: true,
      green: false,
      host: 'exemple.test',
      provider: null,
      fetchedOn: '2026-10-23',
    });
    expectResult(grey, 'warn', 'ecologie.co2.warn');
    expect(grey.params).toEqual({ grammes: '0,15', lettre: 'C' });
    expect(grey.severity).toBe(2);
    const listed = judgeCo2(psi(side('mobile', page), null), {
      ok: true,
      green: true,
      host: 'exemple.test',
      provider: 'Vert',
      fetchedOn: '2026-10-23',
    });
    expectResult(listed, 'pass', 'ecologie.co2.pass_vert');
    expect(listed.params).toEqual({ grammes: '0,12', lettre: 'B' });
    expectResult(
      judgeCo2(psi(side('mobile', { bytes: 2_000_000 }), null), {
        ok: true,
        green: false,
        host: 'exemple.test',
        provider: null,
        fetchedOn: '2026-10-23',
      }),
      'fail',
      'ecologie.co2.fail',
    );
    expectResult(
      judgeCo2(psi(side('mobile', { bytes: 1000 }), null), {
        ok: true,
        green: false,
        host: 'exemple.test',
        provider: null,
        fetchedOn: '2026-10-23',
      }),
      'pass',
      'ecologie.co2.pass',
    );
    expectResult(
      judgeCo2(psi(side('mobile', { bytes: 4_000_000 }), null), {
        ok: true,
        green: true,
        host: 'exemple.test',
        provider: 'Vert',
        fetchedOn: '2026-10-23',
      }),
      'fail',
      'ecologie.co2.fail_vert',
    );
    expectResult(
      judgeCo2(psi(side('mobile', { bytes: 2_000_000 }), null), {
        ok: true,
        green: true,
        host: 'exemple.test',
        provider: 'Vert',
        fetchedOn: '2026-10-23',
      }),
      'warn',
      'ecologie.co2.warn_vert',
    );
    expectResult(
      judgeCo2(psi(side('mobile', { bytes: 1000 }), null), {
        ok: false,
        reason: 'error',
      }),
      'pass',
      'ecologie.co2.pass_inconnu',
    );
    expectResult(
      judgeCo2(psi(side('mobile', { bytes: 1_000_000 }), null), {
        ok: false,
        reason: 'error',
      }),
      'warn',
      'ecologie.co2.warn_inconnu',
    );
    expectResult(
      judgeCo2(psi(side('mobile', { bytes: 2_000_000 }), null), {
        ok: false,
        reason: 'quota',
      }),
      'fail',
      'ecologie.co2.fail_inconnu',
    );
    expectResult(
      judgeCo2(psi(side('mobile', { requests: 4 }), null), {
        ok: true,
        green: false,
        host: 'exemple.test',
        provider: null,
        fetchedOn: '2026-10-23',
      }),
      'untested',
      'ecologie.co2.incomplete',
    );
  });

  it('lit l’annuaire sans en faire une preuve du critère 8.5', () => {
    const named = judgeHost({
      ok: true,
      green: true,
      host: 'exemple.test',
      provider: 'Hébergeur Vert',
      fetchedOn: '2026-10-23',
    });
    expectResult(named, 'pass', 'ecologie.hebergeur.pass');
    expect(named.params).toEqual({ nom: 'Hébergeur Vert' });
    expect(named.measured).not.toHaveProperty('criterion');
    expectResult(
      judgeHost({
        ok: true,
        green: true,
        host: 'exemple.test',
        provider: null,
        fetchedOn: '2026-10-23',
      }),
      'pass',
      'ecologie.hebergeur.pass_anonyme',
    );
    const absent = judgeHost({
      ok: true,
      green: false,
      host: 'exemple.test',
      provider: null,
      fetchedOn: '2026-10-23',
    });
    expectResult(absent, 'fail', 'ecologie.hebergeur.fail');
    expect(absent.severity).toBe(2);
    expectResult(
      judgeHost({ ok: false, reason: 'ip' }),
      'untested',
      'ecologie.hebergeur.ip',
    );
    expectResult(
      judgeHost({ ok: false, reason: 'missing_api' }),
      'untested',
      'ecologie.missing_api',
    );
    const quota = judgeHost({ ok: false, reason: 'quota', status: 429 });
    expectResult(quota, 'untested', 'ecologie.quota');
    expect(quota.measured).toEqual({ httpStatus: 429 });
    const errored = judgeHost({ ok: false, reason: 'error', status: 404 });
    expectResult(errored, 'untested', 'ecologie.error');
    expect(errored.measured).toEqual({ httpStatus: 404 });
    expect(errored.status).not.toBe('fail');
    const bare = judgeHost({ ok: false, reason: 'error' });
    expectResult(bare, 'untested', 'ecologie.error');
    expect(bare.measured).toBeUndefined();
  });

  it('compare le budget à des plafonds absolus', () => {
    const both = (bytes: number, requests: number) =>
      psi(
        side('mobile', { bytes, requests, domElements: 10 }),
        side('desktop', { bytes, requests, domElements: 10 }),
      );
    expectResult(
      judgeBudget(both(500_000, 20)),
      'pass',
      'ecologie.rgesn_budget.pass',
    );
    expectResult(
      judgeBudget(both(Math.round(1.5 * 1024 * 1024), 20)),
      'warn',
      'ecologie.rgesn_budget.warn',
    );
    expectResult(
      judgeBudget(both(3 * 1024 * 1024, 20)),
      'fail',
      'ecologie.rgesn_budget.fail',
    );
    expectResult(
      judgeBudget(both(500_000, 150)),
      'fail',
      'ecologie.rgesn_budget.fail',
    );
    expectResult(
      judgeBudget(psi(side('mobile', { bytes: 500_000 }), null)),
      'warn',
      'ecologie.rgesn_budget.warn_poids',
    );
    expectResult(
      judgeBudget(psi(side('mobile', { bytes: 3 * 1024 * 1024 }), null)),
      'fail',
      'ecologie.rgesn_budget.fail_poids',
    );
    expectResult(
      judgeBudget(psi(side('mobile', { requests: 20 }), null)),
      'warn',
      'ecologie.rgesn_budget.warn_requetes',
    );
    expectResult(
      judgeBudget(psi(side('mobile', { requests: 150 }), null)),
      'fail',
      'ecologie.rgesn_budget.fail_requetes',
    );
    expectResult(
      judgeBudget(psi(side('mobile', { domElements: 10 }), null)),
      'untested',
      'ecologie.rgesn_budget.incomplete',
    );
  });

  it('relit le cache et la compression', () => {
    const scored = (cache: number | null, compression: number | null) =>
      psi(
        side('mobile', light, { cache, compression }),
        side('desktop', light, { cache, compression }),
      );
    expectResult(
      judgeCache(scored(1, null)),
      'pass',
      'ecologie.rgesn_cache.pass',
    );
    expectResult(
      judgeCache(scored(0.6, null)),
      'warn',
      'ecologie.rgesn_cache.warn',
    );
    expectResult(
      judgeCache(scored(0.2, null)),
      'fail',
      'ecologie.rgesn_cache.fail',
    );
    expectResult(
      judgeCache(scored(null, null)),
      'na',
      'ecologie.rgesn_cache.na',
    );
    expectResult(
      judgeCompression(scored(null, 1)),
      'pass',
      'ecologie.rgesn_compression.pass',
    );
    expectResult(
      judgeCompression(scored(null, 0.6)),
      'warn',
      'ecologie.rgesn_compression.warn',
    );
    expectResult(
      judgeCompression(scored(null, 0.2)),
      'fail',
      'ecologie.rgesn_compression.fail',
    );
    expectResult(
      judgeCompression(scored(null, null)),
      'na',
      'ecologie.rgesn_compression.na',
    );
  });

  it('compte les polices et les images de la page', () => {
    const fonts = (fontFiles: number | null, fontBytes: number | null) =>
      judgeFonts(
        psi(
          side('mobile', {
            fontFiles,
            fontBytes,
            bytes: 1000,
            requests: 1,
            domElements: 1,
          }),
          null,
        ),
      );
    expectResult(fonts(0, 0), 'pass', 'ecologie.rgesn_polices.pass_aucune');
    expectResult(fonts(1, 1000), 'pass', 'ecologie.rgesn_polices.pass');
    expectResult(
      fonts(2, null),
      'pass',
      'ecologie.rgesn_polices.pass_sans_poids',
    );
    expectResult(fonts(3, 500_000), 'warn', 'ecologie.rgesn_polices.warn');
    expectResult(
      fonts(3, null),
      'warn',
      'ecologie.rgesn_polices.warn_sans_poids',
    );
    expectResult(fonts(6, 500_000), 'fail', 'ecologie.rgesn_polices.fail');
    expectResult(
      fonts(null, null),
      'untested',
      'ecologie.rgesn_polices.incomplete',
    );
    const images = (raster: number | null, efficient: number | null) =>
      judgeImages(
        psi(
          side('mobile', {
            rasterImages: raster,
            efficientImages: efficient,
            bytes: 1000,
            requests: 1,
            domElements: 1,
          }),
          null,
        ),
      );
    expectResult(images(10, 8), 'pass', 'ecologie.rgesn_images.pass');
    expectResult(images(10, 6), 'warn', 'ecologie.rgesn_images.warn');
    expectResult(images(10, 2), 'fail', 'ecologie.rgesn_images.fail');
    expectResult(images(0, 0), 'na', 'ecologie.rgesn_images.na');
    expectResult(
      images(null, null),
      'untested',
      'ecologie.rgesn_images.incomplete',
    );
  });
});

describe('parseur de page', () => {
  it('compte sans conserver les adresses', () => {
    const parsed = parsePsiStrategy(PAGE, 'mobile');
    expect(parsed?.page).toEqual({
      bytes: 107178,
      requests: 6,
      domElements: 201,
      fontFiles: 1,
      fontBytes: 1000,
      rasterImages: 3,
      efficientImages: 1,
    });
    expect(JSON.stringify(parsed?.page)).not.toContain('https://');
    const summary = parsePageFacts({
      'resource-summary': {
        details: {
          items: [
            { resourceType: 'total', requestCount: 12, transferSize: 100 },
            { resourceType: 'font', requestCount: 2, transferSize: 400 },
          ],
        },
      },
    });
    expect(summary.requests).toBe(12);
    expect(summary.fontFiles).toBe(2);
    expect(summary.rasterImages).toBeNull();
    const mixed = parsePageFacts({
      'network-requests': {
        details: {
          items: [
            { url: 'blob:https://exemple.test/1', resourceType: 'Image' },
            { url: 'https://cdn.test/a.svg', mimeType: 'image/svg+xml' },
            { url: 'https://cdn.test/b.jxl', resourceType: 'Image' },
            { url: 'https://cdn.test/c.bmp', mimeType: 'image/bmp' },
            {
              url: 'https://cdn.test/d.woff2',
              resourceType: 'Font',
              mimeType: 'font/woff2',
            },
          ],
        },
      },
    });
    expect(mixed.requests).toBe(4);
    expect(mixed.rasterImages).toBe(3);
    expect(mixed.efficientImages).toBe(1);
    expect(mixed.fontFiles).toBe(1);
    expect(mixed.fontBytes).toBeNull();
  });
});

describe('questionnaire', () => {
  it('décrit les 78 critères sans les noter', () => {
    expect(RGESN_VERSION).toBe('2024');
    expect(RGESN_QUESTIONS).toHaveLength(78);
    expect(new Set(RGESN_QUESTIONS.map((item) => item.id)).size).toBe(78);
    expect(rgesnQuestion('4.8')?.observedBy).toBe('ecologie.rgesn_polices');
    expect(rgesnQuestion('5.1')?.observedBy).toBe('ecologie.rgesn_images');
    expect(rgesnQuestion('6.1')?.observedBy).toBe('ecologie.rgesn_budget');
    expect(rgesnQuestion('6.2')?.observedBy).toBe('ecologie.rgesn_cache');
    expect(rgesnQuestion('6.3')?.observedBy).toBe('ecologie.rgesn_compression');
    expect(rgesnQuestion('8.5')?.observedBy).toBeUndefined();
    const observed = RGESN_QUESTIONS.filter((item) => item.observedBy).map(
      (item) => item.id,
    );
    expect(observed).toEqual(['4.8', '5.1', '6.1', '6.2', '6.3']);
    expect(parseRgesnResponses([])).toEqual([]);
    expect(rgesnProgress([])).toEqual({ answered: 0, total: 78 });
    const one = parseRgesnResponses([{ answer: 'partiel', id: '8.5' }]);
    expect(one).toEqual([{ id: '8.5', answer: 'partiel' }]);
    expect(rgesnProgress(one).answered).toBe(1);
    expect(() => parseRgesnResponses({})).toThrow(RgesnSchemaError);
    expect(() =>
      parseRgesnResponses([{ id: '1.1', answer: 'oui', extra: 1 }]),
    ).toThrow(/champs/);
    expect(() => parseRgesnResponses([{ id: '9.9', answer: 'oui' }])).toThrow(
      /inconnu/,
    );
    expect(() =>
      parseRgesnResponses([
        { id: '1.1', answer: 'oui' },
        { id: '1.1', answer: 'non' },
      ]),
    ).toThrow(/double/);
    expect(() =>
      parseRgesnResponses([{ id: '1.1', answer: 'peut-être' }]),
    ).toThrow(/invalide/);
  });

  it('a un libellé français pour chaque question', () => {
    const keys = [
      'rgesn.intro',
      ...RGESN_QUESTIONS.map((item) => item.promptKey),
      ...[
        'strategie',
        'specifications',
        'architecture',
        'ux',
        'contenus',
        'frontend',
        'backend',
        'hebergement',
        'algorithmie',
      ].map((theme) => `rgesn.theme.${theme}`),
      'rgesn.answer.oui',
      'rgesn.answer.partiel',
      'rgesn.answer.non',
      'rgesn.answer.na',
    ];
    for (const key of keys) {
      const template = fr[key as MessageKey];
      expect(template, key).toBeTruthy();
      const issues = lintText(template, 'apps/web/src/i18n/fr.ts');
      expect(failureCount(issues), `${key} ${template}`).toBe(0);
      expect(
        issues.filter((issue) => issue.rule === 'sentence-length'),
        template,
      ).toEqual([]);
      expect(template).not.toMatch(/RGESN/);
    }
  });
});

describe('exécution', () => {
  it('expose huit checks passifs, dans l’ordre des identifiants', () => {
    expect(ECOLOGIE_CHECKS.map((item) => item.id)).toEqual([
      'ecologie.co2',
      'ecologie.ecoindex',
      'ecologie.hebergeur',
      'ecologie.rgesn_budget',
      'ecologie.rgesn_cache',
      'ecologie.rgesn_compression',
      'ecologie.rgesn_images',
      'ecologie.rgesn_polices',
    ]);
    const weights: Record<string, number> = {
      'ecologie.co2': 2,
      'ecologie.ecoindex': 3,
      'ecologie.hebergeur': 2,
      'ecologie.rgesn_budget': 2,
      'ecologie.rgesn_cache': 1,
      'ecologie.rgesn_compression': 1,
      'ecologie.rgesn_images': 1,
      'ecologie.rgesn_polices': 1,
    };
    const registry = createRegistry(ECOLOGIE_CHECKS);
    expect(registry.list({ domain: 'ecologie' })).toHaveLength(8);
    expect(registry.list({ mode: 'active' })).toHaveLength(0);
    for (const item of ECOLOGIE_CHECKS) {
      expect(item.mode).toBe('passive');
      expect(item.weight).toBe(weights[item.id]);
      expect(item.needs).toEqual(
        item.id === 'ecologie.hebergeur' ? [] : ['psi'],
      );
      expect(item.timeoutMs).toBe(
        item.id === 'ecologie.hebergeur'
          ? GREEN_CHECK_TIMEOUT_MS
          : PERFORMANCE_CHECK_TIMEOUT_MS,
      );
    }
  });

  it('ne contacte pas le site et partage les lectures', async () => {
    const script = scripted({
      psi: [
        { status: 200, text: PAGE },
        { status: 200, text: PAGE },
      ],
      green: [{ status: 200, text: GREEN }],
    });
    const cache = memoryDayCache();
    const checks = createEcologieChecks({ apiKey: () => SECRET, cache });
    const ctx = context(script.api, {
      url: 'https://www.Exemple.TEST./page',
    });
    const outcomes = await runChecks(checks, ctx, {
      available: ['psi'],
      concurrency: 4,
    });
    expect(JSON.stringify(outcomes)).not.toContain(SECRET);
    expect(JSON.stringify(outcomes)).not.toContain('document-secret');
    const greenCalls = script.calls.filter(
      (call) => call.url.hostname === GREEN_WEB_HOST,
    );
    expect(greenCalls).toHaveLength(1);
    expect(greenCalls[0]?.url.pathname).toBe(
      '/api/v3/greencheck/www.exemple.test',
    );
    expect(greenCalls[0]?.url.search).toBe('');
    expect(greenCalls[0]?.url.port).toBe('');
    expect(
      script.calls.filter((call) => call.url.hostname === 'www.googleapis.com'),
    ).toHaveLength(2);
    expect(
      script.calls.some((call) => call.url.hostname.endsWith('exemple.test')),
    ).toBe(false);
    expect(resultOf(outcomes, 'ecologie.ecoindex')).toMatchObject({
      status: 'pass',
      messageKey: 'ecologie.ecoindex.pass',
      params: { score: 87, lettre: 'A' },
    });
    expect(resultOf(outcomes, 'ecologie.hebergeur').params).toEqual({
      nom: 'Exemple Vert',
    });
    expect(resultOf(outcomes, 'ecologie.co2').messageKey).toBe(
      'ecologie.co2.pass_vert',
    );
    const again = context(script.api, {
      url: 'https://www.Exemple.TEST./page',
    });
    await runChecks(checks, again, { available: ['psi'], concurrency: 4 });
    expect(script.calls).toHaveLength(3);
  });

  it('ne mémorise pas un échec d’annuaire et réessaie une fois', async () => {
    const script = scripted({
      green: [
        { status: 429, text: '' },
        { status: 200, text: '{"green":false,"data":false}' },
      ],
    });
    const checks = createEcologieChecks({
      apiKey: () => undefined,
      cache: memoryDayCache(),
    }).filter((item) => item.id === 'ecologie.hebergeur');
    const first = await runChecks(checks, context(script.api), {
      available: [],
    });
    expect(resultOf(first, 'ecologie.hebergeur').status).toBe('fail');
    expect(script.calls).toHaveLength(2);
    const quota = scripted({
      green: [
        { status: 429, text: '' },
        { status: 429, text: '' },
        { status: 200, text: GREEN },
      ],
    });
    const cache = memoryDayCache();
    const host = createEcologieChecks({
      apiKey: () => undefined,
      cache,
    }).filter((item) => item.id === 'ecologie.hebergeur');
    const blocked = await runChecks(host, context(quota.api), {
      available: [],
    });
    expect(resultOf(blocked, 'ecologie.hebergeur').messageKey).toBe(
      'ecologie.quota',
    );
    const recovered = await runChecks(host, context(quota.api), {
      available: [],
    });
    expect(resultOf(recovered, 'ecologie.hebergeur').status).toBe('pass');
    expect(quota.calls).toHaveLength(3);
  });

  it('laisse une adresse IP et une source absente non testées', async () => {
    const called = vi.fn();
    const api: ExternalApi = {
      request: async (input) => {
        called(input.url.hostname);
        throw new Error('réseau');
      },
    };
    const checks = createEcologieChecks({ apiKey: () => SECRET }).filter(
      (item) => item.id === 'ecologie.hebergeur',
    );
    for (const url of ['https://192.0.2.1/a', 'https://[2001:db8::1]/a']) {
      const outcomes = await runChecks(checks, context(api, { url }), {
        available: [],
      });
      expect(resultOf(outcomes, 'ecologie.hebergeur').messageKey).toBe(
        'ecologie.hebergeur.ip',
      );
    }
    expect(called).not.toHaveBeenCalled();
    const bare = context(undefined);
    const outcomes = await runChecks(
      createEcologieChecks({ apiKey: () => undefined }),
      bare,
      { available: ['psi'] },
    );
    expect(resultOf(outcomes, 'ecologie.ecoindex').messageKey).toBe(
      'ecologie.missing_key',
    );
    expect(resultOf(outcomes, 'ecologie.hebergeur').messageKey).toBe(
      'ecologie.missing_api',
    );
    expect(bare.shared.has(PSI_SHARED_KEY)).toBe(false);
    expect(bare.shared.has(GREEN_SHARED_KEY)).toBe(false);
  });

  it('réutilise un rapport déjà chargé sans clé', async () => {
    const script = scripted();
    const ctx = context(script.api);
    await ctx.shared.get(PSI_SHARED_KEY, async () =>
      psi(
        side('mobile', { bytes: 107_178, requests: 6, domElements: 201 }),
        null,
      ),
    );
    const outcomes = await runChecks(
      createEcologieChecks({ apiKey: () => undefined }).filter(
        (item) => item.id === 'ecologie.ecoindex',
      ),
      ctx,
      { available: ['psi'] },
    );
    expect(resultOf(outcomes, 'ecologie.ecoindex').messageKey).toBe(
      'ecologie.ecoindex.pass_une',
    );
    expect(script.calls).toHaveLength(0);
  });

  it('branche le client externe et refuse une IP privée', async () => {
    const plain = withExternalApi(makeContext());
    expect(plain.net.api).toBeDefined();
    const custom: ExternalApi = {
      request: async () => ({ status: 204, text: '' }),
    };
    const kept = withExternalApi({
      ...makeContext(),
      net: { ...makeContext().net, api: custom },
    });
    expect(kept.net.api).toBe(custom);
    const dial = vi.fn();
    const api = createExternalApi({
      resolve: async () => ['10.1.2.3'],
      dial,
    });
    await expect(
      api.request({
        method: 'GET',
        url: greenCheckUrl('exemple.test'),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: 'BLOCKED_ADDRESS' });
    expect(dial).not.toHaveBeenCalled();
    expect(parseGreenCheck('{"green":false}')).toEqual({
      green: false,
      provider: null,
    });
    expect(parseGreenCheck('{}')).toBeNull();
    const noisy = `A\u0000B ${'C'.repeat(90)}`;
    const ctx = context(
      scripted({
        green: [
          {
            status: 200,
            text: JSON.stringify({ green: true, hosted_by: noisy }),
          },
        ],
      }).api,
    );
    const bundle = await loadGreen(
      Object.assign(ctx, { signal: new AbortController().signal }),
      memoryDayCache(),
    );
    expect(bundle.ok && bundle.provider?.startsWith('A B ')).toBe(true);
    expect(bundle.ok ? bundle.provider?.length : 0).toBe(80);
  });

  it('ne sort pas du réseau autrement que par ctx.net.api', () => {
    const dir = fileURLToPath(new URL('../checks/ecologie/', import.meta.url));
    const source = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(`${dir}/${name}`, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain('apps/web');
    expect(source).not.toContain(SECRET);
  });
});

describe('texte, fiches et méthode', () => {
  it('dit que les chiffres sont des estimations', () => {
    for (const [key, template] of Object.entries(fr)) {
      if (!key.startsWith('ecologie.') && !key.startsWith('rgesn.')) continue;
      expect(template, key).not.toMatch(/RGESN/);
      if (
        !key.startsWith('ecologie.ecoindex.') &&
        !key.startsWith('ecologie.co2.')
      ) {
        continue;
      }
      expect(template.toLocaleLowerCase('fr-FR')).toContain('estimation');
      if (!key.endsWith('.incomplete')) {
        expect(template).toContain('mesure exacte');
      }
    }
  });

  it('chaque check a une fiche, et la grille est dans la méthode', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    const methode = readFileSync(
      fileURLToPath(new URL('../../../docs/METHODE.md', import.meta.url)),
      'utf8',
    );
    expect(methode.toLocaleLowerCase('fr-FR')).toContain('estimation');
    for (const criterion of ['4.8', '5.1', '6.1', '6.2', '6.3', '8.5']) {
      expect(methode).toContain(criterion);
    }
    for (const item of ECOLOGIE_CHECKS) {
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

  it('chaque clé d’écologie est produite par un test', () => {
    const keys = Object.keys(fr).filter((key) => key.startsWith('ecologie.'));
    expect(keys.filter((key) => !seen.has(key)).sort()).toEqual([]);
  });
});

function resultOf(outcomes: CheckOutcome[], id: string): CheckResult {
  const found = outcomes.find((item) => item.checkId === id);
  if (!found) throw new Error(id);
  return found.result;
}
