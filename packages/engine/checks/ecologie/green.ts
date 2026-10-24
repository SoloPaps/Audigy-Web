import { isIP } from 'node:net';
import {
  type ExternalApi,
  type ExternalResponse,
  GREEN_WEB_HOST,
} from '@audigy/net';
import type { CheckContext } from '../../src/types.js';
import {
  cacheKey,
  type DayCache,
  readCache,
  utcDay,
} from '../performance/cache.js';

export const GREEN_SHARED_KEY = 'greencheck';
export const GREEN_ATTEMPT_TIMEOUT_MS = 8_000;
export const GREEN_CHECK_TIMEOUT_MS = GREEN_ATTEMPT_TIMEOUT_MS * 2 + 4_000;

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

export interface GreenOk {
  ok: true;
  green: boolean;
  host: string;
  provider: string | null;
  fetchedOn: string;
}

export interface GreenFailure {
  ok: false;
  reason: 'missing_api' | 'quota' | 'error' | 'ip';
  status?: number;
}

export type GreenBundle = GreenOk | GreenFailure;

export function greenCheckUrl(hostname: string): URL {
  return new URL(
    `https://${GREEN_WEB_HOST}/api/v3/greencheck/${encodeURIComponent(hostname)}`,
  );
}

export function loadGreen(
  ctx: CheckContext,
  cache: DayCache,
): Promise<GreenBundle> {
  const host = auditedHost(ctx.target.url);
  if (host.kind === 'ip') return Promise.resolve({ ok: false, reason: 'ip' });
  if (host.kind !== 'name')
    return Promise.resolve({ ok: false, reason: 'error' });
  const api = ctx.net.api;
  if (!api) return Promise.resolve({ ok: false, reason: 'missing_api' });
  const name = host.host;
  const day = utcDay(ctx.now());
  return ctx.shared.get(GREEN_SHARED_KEY, () =>
    loadCached(cache, cacheKey('greencheck', name, day), () =>
      fetchGreen(api, name, day, ctx.signal),
    ),
  );
}

export function parseGreenCheck(
  text: string,
): { green: boolean; provider: string | null } | null {
  const root = asRecord(parseJson(text));
  if (!root || typeof root.green !== 'boolean') return null;
  return {
    green: root.green,
    provider: root.green ? providerOf(root.hosted_by) : null,
  };
}

function auditedHost(
  url: URL,
): { kind: 'name'; host: string } | { kind: 'ip' } | { kind: 'empty' } {
  const host = url.hostname
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^\[|\]$/g, '');
  if (host === '') return { kind: 'empty' };
  if (isIP(host) !== 0) return { kind: 'ip' };
  return { kind: 'name', host };
}

async function loadCached(
  cache: DayCache,
  key: string,
  load: () => Promise<GreenBundle>,
): Promise<GreenBundle> {
  const hit = readCache(cache, key);
  if (isGreenOk(hit)) return hit;
  const bundle = await load();
  if (bundle.ok) cache.set(key, JSON.stringify(bundle));
  return bundle;
}

async function fetchGreen(
  api: ExternalApi,
  host: string,
  day: string,
  signal: AbortSignal,
): Promise<GreenBundle> {
  const url = greenCheckUrl(host);
  let status: number | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (signal.aborted) return { ok: false, reason: 'error' };
    const res = await call(api, url, signal);
    if (!res) continue;
    if (res.status === 429) {
      if (attempt === 0) continue;
      return { ok: false, reason: 'quota', status: 429 };
    }
    if (res.status !== 200) {
      status = res.status;
      if (RETRYABLE.has(res.status) && attempt === 0) continue;
      return { ok: false, reason: 'error', status: res.status };
    }
    const parsed = parseGreenCheck(res.text);
    if (parsed) {
      return {
        ok: true,
        green: parsed.green,
        host,
        provider: parsed.provider,
        fetchedOn: day,
      };
    }
    if (attempt === 0) continue;
  }
  return status === undefined
    ? { ok: false, reason: 'error' }
    : { ok: false, reason: 'error', status };
}

async function call(
  api: ExternalApi,
  url: URL,
  signal: AbortSignal,
): Promise<ExternalResponse | undefined> {
  try {
    return await api.request({
      method: 'GET',
      url,
      timeoutMs: GREEN_ATTEMPT_TIMEOUT_MS,
      signal,
    });
  } catch {
    return undefined;
  }
}

function providerOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let clean = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    clean += code <= 31 || code === 127 ? ' ' : ch;
  }
  const collapsed = clean.replace(/\s+/g, ' ').trim();
  if (collapsed === '') return null;
  return collapsed.slice(0, 80);
}

function isGreenOk(value: unknown): value is GreenOk {
  const record = asRecord(value);
  return (
    record?.ok === true &&
    typeof record.green === 'boolean' &&
    typeof record.host === 'string' &&
    typeof record.fetchedOn === 'string'
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
}
