import type { ExternalApi, ExternalResponse } from '@audigy/net';
import type { CheckContext } from '../../src/types.js';
import { cacheKey, type DayCache, readCache, utcDay } from './cache.js';
import { parseCruxRecord, parsePsiStrategy } from './parse.js';
import {
  CRUX_ATTEMPT_TIMEOUT_MS,
  CRUX_FORM_FACTOR,
  CRUX_SHARED_KEY,
  type CruxBundle,
  type CruxOk,
  PSI_ATTEMPT_TIMEOUT_MS,
  PSI_CATEGORIES,
  PSI_SHARED_KEY,
  type PsiBundle,
  type PsiOk,
  type PsiStrategyResult,
} from './types.js';

const PSI_ENDPOINT =
  'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CRUX_ENDPOINT =
  'https://chromeuxreport.googleapis.com/v1/records:queryRecord';

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

type Step<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'quota' }
  | { kind: 'no_data' }
  | { kind: 'fail'; status?: number };

export function loadPsi(
  ctx: CheckContext,
  api: ExternalApi,
  apiKey: string,
  cache: DayCache,
): Promise<PsiBundle> {
  const target = ctx.target.url.href;
  const day = utcDay(ctx.now());
  return ctx.shared.get(PSI_SHARED_KEY, () =>
    loadCached(cache, cacheKey('psi', target, day), isPsi, () =>
      fetchPsi(api, apiKey, target, day),
    ),
  );
}

export function loadCrux(
  ctx: CheckContext,
  api: ExternalApi,
  apiKey: string,
  cache: DayCache,
): Promise<CruxBundle> {
  const target = ctx.target.url;
  const day = utcDay(ctx.now());
  return ctx.shared.get(CRUX_SHARED_KEY, () =>
    loadCached(cache, cacheKey('crux', target.href, day), isCrux, () =>
      fetchCrux(api, apiKey, target, day),
    ),
  );
}

export function buildPsiUrl(
  target: string,
  strategy: 'mobile' | 'desktop',
  apiKey: string,
): URL {
  const url = new URL(PSI_ENDPOINT);
  url.searchParams.set('url', target);
  url.searchParams.set('strategy', strategy);
  for (const category of PSI_CATEGORIES) {
    url.searchParams.append('category', category);
  }
  url.searchParams.set('key', apiKey);
  return url;
}

export function buildCruxUrl(apiKey: string): URL {
  const url = new URL(CRUX_ENDPOINT);
  url.searchParams.set('key', apiKey);
  return url;
}

async function loadCached<T extends PsiBundle | CruxBundle>(
  cache: DayCache,
  key: string,
  guard: (value: unknown) => value is T,
  load: () => Promise<T>,
): Promise<T> {
  const hit = readCache(cache, key);
  if (guard(hit)) return hit;
  const bundle = await load();
  if (storeable(bundle)) cache.set(key, JSON.stringify(bundle));
  return bundle;
}

function storeable(bundle: { ok: boolean; reason?: string }): boolean {
  if (bundle.ok) return true;
  return bundle.reason === 'quota' || bundle.reason === 'no_data';
}

async function fetchPsi(
  api: ExternalApi,
  apiKey: string,
  target: string,
  day: string,
): Promise<PsiBundle> {
  const out: {
    mobile: PsiStrategyResult | null;
    desktop: PsiStrategyResult | null;
  } = { mobile: null, desktop: null };
  let errorStatus: number | undefined;
  for (const strategy of ['mobile', 'desktop'] as const) {
    const step = await fetchStrategy(api, apiKey, target, strategy);
    if (step.kind === 'quota')
      return { ok: false, reason: 'quota', status: 429 };
    if (step.kind === 'ok') out[strategy] = step.value;
    else if (step.kind === 'fail' && step.status !== undefined) {
      errorStatus = step.status;
    }
  }
  if (!out.mobile && !out.desktop) {
    return errorStatus === undefined
      ? { ok: false, reason: 'error' }
      : { ok: false, reason: 'error', status: errorStatus };
  }
  const bundle: PsiOk = { ok: true, ...out, fetchedOn: day };
  return bundle;
}

async function fetchStrategy(
  api: ExternalApi,
  apiKey: string,
  target: string,
  strategy: 'mobile' | 'desktop',
): Promise<Step<PsiStrategyResult>> {
  const url = buildPsiUrl(target, strategy, apiKey);
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await call(api, {
      method: 'GET',
      url,
      timeoutMs: PSI_ATTEMPT_TIMEOUT_MS,
    });
    if (!res) continue;
    if (res.status === 429) {
      if (attempt === 0) continue;
      return { kind: 'quota' };
    }
    if (res.status !== 200) {
      if (RETRYABLE.has(res.status) && attempt === 0) continue;
      return { kind: 'fail', status: res.status };
    }
    const parsed = parsePsiStrategy(res.text, strategy);
    if (parsed) return { kind: 'ok', value: parsed };
    if (attempt === 0) continue;
  }
  return { kind: 'fail' };
}

async function fetchCrux(
  api: ExternalApi,
  apiKey: string,
  target: URL,
  day: string,
): Promise<CruxBundle> {
  const byUrl = await queryCrux(api, apiKey, {
    url: target.href,
    formFactor: CRUX_FORM_FACTOR,
  });
  if (byUrl.kind === 'quota')
    return { ok: false, reason: 'quota', status: 429 };
  if (byUrl.kind === 'ok') return cruxOk(byUrl.value, 'url', day);
  if (byUrl.kind === 'fail') {
    return byUrl.status === undefined
      ? { ok: false, reason: 'error' }
      : { ok: false, reason: 'error', status: byUrl.status };
  }
  const byOrigin = await queryCrux(api, apiKey, {
    origin: target.origin,
    formFactor: CRUX_FORM_FACTOR,
  });
  if (byOrigin.kind === 'quota')
    return { ok: false, reason: 'quota', status: 429 };
  if (byOrigin.kind === 'no_data') return { ok: false, reason: 'no_data' };
  if (byOrigin.kind === 'fail') {
    return byOrigin.status === undefined
      ? { ok: false, reason: 'error' }
      : { ok: false, reason: 'error', status: byOrigin.status };
  }
  return cruxOk(byOrigin.value, 'origin', day);
}

function cruxOk(
  record: { metrics: CruxOk['metrics']; period: CruxOk['period'] },
  scope: 'url' | 'origin',
  day: string,
): CruxOk {
  return {
    ok: true,
    scope,
    formFactor: CRUX_FORM_FACTOR,
    metrics: record.metrics,
    period: record.period,
    fetchedOn: day,
  };
}

async function queryCrux(
  api: ExternalApi,
  apiKey: string,
  body: { formFactor: typeof CRUX_FORM_FACTOR } & (
    | { url: string }
    | { origin: string }
  ),
): Promise<Step<{ metrics: CruxOk['metrics']; period: CruxOk['period'] }>> {
  const url = buildCruxUrl(apiKey);
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await call(api, {
      method: 'POST',
      url,
      body: JSON.stringify(body),
      timeoutMs: CRUX_ATTEMPT_TIMEOUT_MS,
    });
    if (!res) continue;
    if (res.status === 404) return { kind: 'no_data' };
    if (res.status === 429) {
      if (attempt === 0) continue;
      return { kind: 'quota' };
    }
    if (res.status !== 200) {
      if (RETRYABLE.has(res.status) && attempt === 0) continue;
      return { kind: 'fail', status: res.status };
    }
    const parsed = parseCruxRecord(res.text);
    if (parsed) return { kind: 'ok', value: parsed };
    if (attempt === 0) continue;
  }
  return { kind: 'fail' };
}

async function call(
  api: ExternalApi,
  input: {
    method: 'GET' | 'POST';
    url: URL;
    body?: string;
    timeoutMs: number;
  },
): Promise<ExternalResponse | undefined> {
  try {
    return await api.request(input);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPsi(value: unknown): value is PsiBundle {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return false;
  if (value.ok === false) {
    return value.reason === 'quota' || value.reason === 'error';
  }
  if (typeof value.fetchedOn !== 'string') return false;
  const side = (item: unknown) => item === null || isRecord(item);
  return (
    side(value.mobile) &&
    side(value.desktop) &&
    (value.mobile !== null || value.desktop !== null)
  );
}

function isCrux(value: unknown): value is CruxBundle {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return false;
  if (value.ok === false) {
    return (
      value.reason === 'quota' ||
      value.reason === 'error' ||
      value.reason === 'no_data'
    );
  }
  return value.scope === 'url' || value.scope === 'origin';
}
