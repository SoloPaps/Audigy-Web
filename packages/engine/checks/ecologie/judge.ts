import type { CheckResult, Status } from '../../src/types.js';
import {
  formatWeight,
  percent,
  statusFromPercent,
} from '../performance/judge.js';
import type {
  LighthouseAuditId,
  PsiBundle,
  PsiOk,
  PsiPageFacts,
} from '../performance/types.js';
import {
  CO2_LIBRARY,
  CO2_MODEL,
  CO2_VERSION,
  estimateVisit,
  formatGrams,
  statusFromRating,
} from './co2.js';
import {
  computeEcoIndex,
  ECOINDEX_QUANTILE_TABLE,
  sizeKbFromBytes,
} from './ecoindex.js';
import type { GreenBundle } from './green.js';
import { type LabPage, labPage } from './page.js';

const MIB = 1024 * 1024;
const WEIGHT_PASS = MIB;
const WEIGHT_WARN = 2 * MIB;
const REQUEST_PASS = 30;
const REQUEST_WARN = 100;
const FONT_BYTE_LIMIT = 400 * 1024;

export function judgeEcoIndex(bundle: PsiBundle): CheckResult {
  const stopped = blocked('ecologie.ecoindex', bundle);
  if (stopped) return stopped;
  if (!bundle.ok) return psiError('ecologie.ecoindex');
  const page = labPage(bundle);
  if (!page) return psiError('ecologie.ecoindex');
  const missing = missingLabel(page.facts);
  if (missing) {
    return finding(
      'ecologie.ecoindex',
      'untested',
      1,
      1,
      'ecologie.ecoindex.incomplete',
      { params: { manque: missing }, measured: baseMeasured(page) },
    );
  }
  const value = computeEcoIndex({
    dom: page.facts.domElements as number,
    requests: page.facts.requests as number,
    sizeKb: sizeKbFromBytes(page.facts.bytes as number),
  });
  if (!value) return psiError('ecologie.ecoindex');
  const status = statusFromScore(value.score);
  const suffix = page.single ? '_une' : '';
  return finding(
    'ecologie.ecoindex',
    status,
    status === 'fail' ? 3 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 3,
    `ecologie.ecoindex.${status}${suffix}`,
    {
      score: value.score / 100,
      params: { score: value.score, lettre: value.grade },
      measured: {
        ...baseMeasured(page),
        estimate: true,
        score: value.score,
        grade: value.grade,
        ges: value.ges,
        water: value.water,
        quantileTable: ECOINDEX_QUANTILE_TABLE,
      },
    },
  );
}

export function judgeCo2(bundle: PsiBundle, green: GreenBundle): CheckResult {
  const stopped = blocked('ecologie.co2', bundle);
  if (stopped) return stopped;
  if (!bundle.ok) return psiError('ecologie.co2');
  const page = labPage(bundle);
  const bytes = page?.facts.bytes ?? null;
  if (!page || bytes === null) {
    return finding(
      'ecologie.co2',
      'untested',
      1,
      1,
      'ecologie.co2.incomplete',
      {
        measured: page ? baseMeasured(page) : { estimate: true },
      },
    );
  }
  const listed = green.ok && green.green;
  const unknown = !green.ok;
  const estimate = estimateVisit(bytes, listed);
  if (!estimate) return psiError('ecologie.co2');
  const status = statusFromRating(estimate.rating);
  const host = listed ? '_vert' : unknown ? '_inconnu' : '';
  return finding(
    'ecologie.co2',
    status,
    status === 'fail' ? 2 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 2,
    `ecologie.co2.${status}${host}`,
    {
      score: status === 'pass' ? 1 : status === 'warn' ? 0.5 : 0,
      params: { grammes: formatGrams(estimate.grams), lettre: estimate.rating },
      measured: {
        ...baseMeasured(page),
        estimate: true,
        grams: estimate.grams,
        rating: estimate.rating,
        green: listed ? true : unknown ? null : false,
        model: CO2_MODEL,
        modelVersion: CO2_VERSION,
        library: CO2_LIBRARY,
      },
    },
  );
}

export function judgeHost(bundle: GreenBundle): CheckResult {
  if (!bundle.ok) {
    if (bundle.reason === 'missing_api') {
      return finding(
        'ecologie.hebergeur',
        'untested',
        1,
        1,
        'ecologie.missing_api',
      );
    }
    if (bundle.reason === 'ip') {
      return finding(
        'ecologie.hebergeur',
        'untested',
        1,
        1,
        'ecologie.hebergeur.ip',
      );
    }
    if (bundle.reason === 'quota') {
      return finding('ecologie.hebergeur', 'untested', 1, 1, 'ecologie.quota', {
        measured: { httpStatus: bundle.status ?? 429 },
      });
    }
    return finding(
      'ecologie.hebergeur',
      'untested',
      1,
      1,
      'ecologie.error',
      bundle.status !== undefined
        ? { measured: { httpStatus: bundle.status } }
        : {},
    );
  }
  const measured: Record<string, unknown> = {
    host: bundle.host,
    green: bundle.green,
    fetchedOn: bundle.fetchedOn,
  };
  if (bundle.provider) measured.provider = bundle.provider;
  if (bundle.green) {
    return finding(
      'ecologie.hebergeur',
      'pass',
      1,
      1,
      bundle.provider
        ? 'ecologie.hebergeur.pass'
        : 'ecologie.hebergeur.pass_anonyme',
      bundle.provider
        ? { params: { nom: bundle.provider }, measured }
        : { measured },
    );
  }
  return finding(
    'ecologie.hebergeur',
    'fail',
    2,
    2,
    'ecologie.hebergeur.fail',
    {
      measured,
    },
  );
}

export function judgeBudget(bundle: PsiBundle): CheckResult {
  const stopped = blocked('ecologie.rgesn_budget', bundle);
  if (stopped) return stopped;
  if (!bundle.ok) return psiError('ecologie.rgesn_budget');
  const page = labPage(bundle);
  if (!page) return psiError('ecologie.rgesn_budget');
  const { bytes, requests } = page.facts;
  const measured = { ...baseMeasured(page), criterion: '6.1' };
  if (bytes === null && requests === null) {
    return finding(
      'ecologie.rgesn_budget',
      'untested',
      1,
      1,
      'ecologie.rgesn_budget.incomplete',
      { measured },
    );
  }
  if (bytes === null && requests !== null) {
    const status = requestStatus(requests) === 'fail' ? 'fail' : 'warn';
    return finding(
      'ecologie.rgesn_budget',
      status,
      2,
      2,
      `ecologie.rgesn_budget.${status}_requetes`,
      { params: { requetes: requests }, measured: { ...measured, requests } },
    );
  }
  if (bytes !== null && requests === null) {
    const status = weightStatus(bytes) === 'fail' ? 'fail' : 'warn';
    return finding(
      'ecologie.rgesn_budget',
      status,
      2,
      2,
      `ecologie.rgesn_budget.${status}_poids`,
      {
        params: { poids: formatWeight(bytes) },
        measured: { ...measured, bytes },
      },
    );
  }
  const weight = weightStatus(bytes as number);
  const requestsStatus = requestStatus(requests as number);
  const status = worst(weight, requestsStatus);
  return finding(
    'ecologie.rgesn_budget',
    status,
    status === 'fail' ? 3 : 2,
    status === 'pass' ? 1 : 2,
    `ecologie.rgesn_budget.${status}`,
    {
      score: status === 'pass' ? 1 : status === 'warn' ? 0.5 : 0,
      params: {
        poids: formatWeight(bytes as number),
        requetes: requests as number,
      },
      measured: { ...measured, bytes, requests },
    },
  );
}

export function judgeCache(bundle: PsiBundle): CheckResult {
  return judgeLighthousePractice(
    bundle,
    'ecologie.rgesn_cache',
    'uses-long-cache-ttl',
    '6.2',
  );
}

export function judgeCompression(bundle: PsiBundle): CheckResult {
  return judgeLighthousePractice(
    bundle,
    'ecologie.rgesn_compression',
    'uses-text-compression',
    '6.3',
  );
}

export function judgeFonts(bundle: PsiBundle): CheckResult {
  const stopped = blocked('ecologie.rgesn_polices', bundle);
  if (stopped) return stopped;
  if (!bundle.ok) return psiError('ecologie.rgesn_polices');
  const page = labPage(bundle);
  const files = page?.facts.fontFiles ?? null;
  if (!page || files === null) {
    return finding(
      'ecologie.rgesn_polices',
      'untested',
      1,
      1,
      'ecologie.rgesn_polices.incomplete',
      { measured: { criterion: '4.8' } },
    );
  }
  const fontBytes = page.facts.fontBytes;
  const measured: Record<string, unknown> = {
    ...baseMeasured(page),
    criterion: '4.8',
    fontFiles: files,
  };
  if (fontBytes !== null) measured.fontBytes = fontBytes;
  if (files === 0) {
    return finding(
      'ecologie.rgesn_polices',
      'pass',
      1,
      1,
      'ecologie.rgesn_polices.pass_aucune',
      { score: 1, measured },
    );
  }
  const underBytes = fontBytes !== null && fontBytes <= FONT_BYTE_LIMIT;
  const status: Status =
    underBytes || files <= 2
      ? 'pass'
      : files <= 4 || fontBytes === null
        ? 'warn'
        : 'fail';
  const params: Record<string, string | number> = { fichiers: files };
  if (fontBytes !== null) params.poids = formatWeight(fontBytes);
  const key =
    fontBytes === null
      ? `ecologie.rgesn_polices.${status}_sans_poids`
      : `ecologie.rgesn_polices.${status}`;
  return finding(
    'ecologie.rgesn_polices',
    status,
    status === 'fail' ? 2 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 2,
    key,
    { params, measured },
  );
}

export function judgeImages(bundle: PsiBundle): CheckResult {
  const stopped = blocked('ecologie.rgesn_images', bundle);
  if (stopped) return stopped;
  if (!bundle.ok) return psiError('ecologie.rgesn_images');
  const page = labPage(bundle);
  const raster = page?.facts.rasterImages ?? null;
  const efficient = page?.facts.efficientImages ?? null;
  if (!page || raster === null || efficient === null) {
    return finding(
      'ecologie.rgesn_images',
      'untested',
      1,
      1,
      'ecologie.rgesn_images.incomplete',
      { measured: { criterion: '5.1' } },
    );
  }
  const measured: Record<string, unknown> = {
    ...baseMeasured(page),
    criterion: '5.1',
    rasterImages: raster,
    efficientImages: efficient,
  };
  if (raster === 0) {
    return finding(
      'ecologie.rgesn_images',
      'na',
      1,
      1,
      'ecologie.rgesn_images.na',
      { measured },
    );
  }
  const ratio = efficient / raster;
  const status: Status =
    ratio >= 0.75 ? 'pass' : ratio >= 0.5 ? 'warn' : 'fail';
  return finding(
    'ecologie.rgesn_images',
    status,
    status === 'fail' ? 2 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 2,
    `ecologie.rgesn_images.${status}`,
    {
      score: ratio,
      params: { part: `${Math.round(ratio * 100)} %` },
      measured: { ...measured, ratio },
    },
  );
}

function judgeLighthousePractice(
  bundle: PsiBundle,
  id: string,
  auditId: LighthouseAuditId,
  criterion: string,
): CheckResult {
  const stopped = blocked(id, bundle);
  if (stopped) return stopped;
  if (!bundle.ok) return psiError(id);
  const audit = worstAudit(bundle, auditId);
  if (!audit) {
    return finding(id, 'na', 1, 1, `${id}.na`, {
      measured: { criterion },
    });
  }
  const points = percent(audit.score);
  const status = statusFromPercent(points);
  const measured: Record<string, unknown> = {
    criterion,
    score: points / 100,
  };
  if (audit.mobile !== null) measured.mobile = percent(audit.mobile) / 100;
  if (audit.desktop !== null) measured.desktop = percent(audit.desktop) / 100;
  return finding(
    id,
    status,
    status === 'fail' ? 2 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 2,
    `${id}.${status}`,
    { score: points / 100, measured },
  );
}

function worstAudit(
  bundle: PsiOk,
  auditId: LighthouseAuditId,
): { score: number; mobile: number | null; desktop: number | null } | null {
  const mobile = bundle.mobile?.audits[auditId]?.score ?? null;
  const desktop = bundle.desktop?.audits[auditId]?.score ?? null;
  const known = [mobile, desktop].filter(
    (value): value is number => value !== null,
  );
  const score = known[0];
  if (score === undefined) return null;
  return { score: Math.min(score, ...known), mobile, desktop };
}

function weightStatus(bytes: number): 'pass' | 'warn' | 'fail' {
  if (bytes <= WEIGHT_PASS) return 'pass';
  if (bytes <= WEIGHT_WARN) return 'warn';
  return 'fail';
}

function requestStatus(count: number): 'pass' | 'warn' | 'fail' {
  if (count <= REQUEST_PASS) return 'pass';
  if (count <= REQUEST_WARN) return 'warn';
  return 'fail';
}

function worst(
  a: 'pass' | 'warn' | 'fail',
  b: 'pass' | 'warn' | 'fail',
): 'pass' | 'warn' | 'fail' {
  const rank = { pass: 0, warn: 1, fail: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function statusFromScore(score: number): 'pass' | 'warn' | 'fail' {
  if (score >= 80) return 'pass';
  if (score >= 50) return 'warn';
  return 'fail';
}

function missingLabel(facts: PsiPageFacts): string | null {
  const missing: string[] = [];
  if (facts.domElements === null) missing.push('le nombre d’éléments');
  if (facts.requests === null) missing.push('le nombre de requêtes');
  if (facts.bytes === null) missing.push('le poids');
  if (missing.length === 0) return null;
  if (missing.length === 1) return missing[0] ?? '';
  if (missing.length === 2) return `${missing[0]} et ${missing[1]}`;
  return `${missing[0]}, ${missing[1]} et ${missing[2]}`;
}

function baseMeasured(page: LabPage): Record<string, unknown> {
  const measured: Record<string, unknown> = {
    strategy: page.strategy,
    single: page.single,
  };
  const { bytes, requests, domElements } = page.facts;
  if (bytes !== null) measured.bytes = bytes;
  if (requests !== null) measured.requests = requests;
  if (domElements !== null) measured.domElements = domElements;
  return measured;
}

function blocked(id: string, bundle: PsiBundle): CheckResult | undefined {
  if (bundle.ok) return undefined;
  if (bundle.reason === 'missing_key') {
    return finding(id, 'untested', 1, 1, 'ecologie.missing_key');
  }
  if (bundle.reason === 'quota') {
    return finding(id, 'untested', 1, 1, 'ecologie.psi_quota', {
      measured: { httpStatus: bundle.status ?? 429 },
    });
  }
  return finding(
    id,
    'untested',
    1,
    1,
    'ecologie.psi_error',
    bundle.status !== undefined
      ? { measured: { httpStatus: bundle.status } }
      : {},
  );
}

function psiError(id: string): CheckResult {
  return finding(id, 'untested', 1, 1, 'ecologie.psi_error');
}

function finding(
  id: string,
  status: Status,
  severity: 1 | 2 | 3 | 4,
  impact: 1 | 2 | 3,
  messageKey: string,
  extra: {
    score?: number;
    params?: Record<string, string | number>;
    measured?: Record<string, unknown>;
  } = {},
): CheckResult {
  const result: CheckResult = { status, severity, impact, messageKey };
  if (extra.score !== undefined) result.score = extra.score;
  if (extra.params) result.params = extra.params;
  if (extra.measured) result.measured = extra.measured;
  if (status === 'warn' || status === 'fail') result.fixKey = id;
  if (status === 'untested' || status === 'na') result.reason = messageKey;
  return result;
}
