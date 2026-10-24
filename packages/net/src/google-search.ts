import type { ExternalApi } from './external-api.js';
import { GOOGLE_OAUTH_HOST, SEARCH_CONSOLE_HOST } from './external-api.js';

/** Portée lecture seule demandée à Google (PLAN §7). */
export const GOOGLE_WEBMASTERS_SCOPE =
  'https://www.googleapis.com/auth/webmasters.readonly';

const TOKEN_URL = `https://${GOOGLE_OAUTH_HOST}/token`;
const REVOKE_URL = `https://${GOOGLE_OAUTH_HOST}/revoke`;
const SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites';
const INSPECT_URL = `https://${SEARCH_CONSOLE_HOST}/v1/urlInspection/index:inspect`;
const CALL_TIMEOUT_MS = 15_000;

export class GoogleApiError extends Error {
  override readonly name = 'GoogleApiError';

  constructor(readonly failure: 'quota' | 'auth' | 'error') {
    super(failure);
  }
}

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken?: string;
  scope: string;
  expiresIn: number;
}

export interface GoogleAuthClient {
  exchange(input: {
    code: string;
    verifier: string;
    redirectUri: string;
  }): Promise<GoogleTokenSet>;
  refresh(refreshToken: string): Promise<GoogleTokenSet>;
  revoke(token: string): Promise<void>;
}

export interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface SearchConsoleSitemap {
  path: string;
  errors: number;
  warnings: number;
  pending: boolean;
  isIndex: boolean;
  submitted: number;
  indexed: number;
}

export interface SearchConsoleInspect {
  verdict: string;
}

export interface SearchConsoleApi {
  listSites(signal?: AbortSignal): Promise<SearchConsoleSite[]>;
  listSitemaps(
    siteUrl: string,
    signal?: AbortSignal,
  ): Promise<SearchConsoleSitemap[]>;
  inspect(
    siteUrl: string,
    inspectionUrl: string,
    signal?: AbortSignal,
  ): Promise<SearchConsoleInspect>;
}

export function createGoogleAuthClient(options: {
  api: ExternalApi;
  clientId: string;
  clientSecret: string;
}): GoogleAuthClient {
  const { api, clientId, clientSecret } = options;

  async function token(body: URLSearchParams): Promise<GoogleTokenSet> {
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    const response = await api.request({
      method: 'POST',
      url: new URL(TOKEN_URL),
      body: body.toString(),
      contentType: 'application/x-www-form-urlencoded',
      timeoutMs: CALL_TIMEOUT_MS,
    });
    if (response.status !== 200) throw fail(response.status, response.text);
    const parsed = parseToken(response.text);
    if (!parsed) throw new GoogleApiError('error');
    return parsed;
  }

  return {
    exchange(input) {
      const body = new URLSearchParams();
      body.set('code', input.code);
      body.set('code_verifier', input.verifier);
      body.set('redirect_uri', input.redirectUri);
      body.set('grant_type', 'authorization_code');
      return token(body);
    },
    refresh(refreshToken) {
      const body = new URLSearchParams();
      body.set('refresh_token', refreshToken);
      body.set('grant_type', 'refresh_token');
      return token(body);
    },
    async revoke(tokenValue) {
      const body = new URLSearchParams();
      body.set('token', tokenValue);
      const response = await api.request({
        method: 'POST',
        url: new URL(REVOKE_URL),
        body: body.toString(),
        contentType: 'application/x-www-form-urlencoded',
        timeoutMs: CALL_TIMEOUT_MS,
      });
      if (response.status === 200 || response.status === 400) return;
      throw fail(response.status, response.text);
    },
  };
}

export function createSearchConsoleApi(options: {
  api: ExternalApi;
  accessToken: string;
}): SearchConsoleApi {
  const authorization = `Bearer ${options.accessToken}`;

  async function get(url: URL, signal?: AbortSignal): Promise<string> {
    const response = await options.api.request({
      method: 'GET',
      url,
      authorization,
      timeoutMs: CALL_TIMEOUT_MS,
      ...(signal ? { signal } : {}),
    });
    if (response.status !== 200) throw fail(response.status, response.text);
    return response.text;
  }

  return {
    async listSites(signal) {
      const text = await get(new URL(SITES_URL), signal);
      return parseSites(text);
    },
    async listSitemaps(siteUrl, signal) {
      const url = new URL(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
      );
      const text = await get(url, signal);
      return parseSitemaps(text);
    },
    async inspect(siteUrl, inspectionUrl, signal) {
      const response = await options.api.request({
        method: 'POST',
        url: new URL(INSPECT_URL),
        authorization,
        body: JSON.stringify({
          inspectionUrl,
          siteUrl,
          languageCode: 'fr-FR',
        }),
        timeoutMs: CALL_TIMEOUT_MS,
        ...(signal ? { signal } : {}),
      });
      if (response.status !== 200) throw fail(response.status, response.text);
      return parseInspect(response.text);
    },
  };
}

function fail(status: number, text: string): GoogleApiError {
  return new GoogleApiError(classify(status, text));
}

function classify(status: number, text: string): 'quota' | 'auth' | 'error' {
  if (status === 401) return 'auth';
  if (status === 429) return 'quota';
  const quota =
    text.includes('quotaExceeded') ||
    text.includes('rateLimitExceeded') ||
    text.includes('dailyLimitExceeded') ||
    text.includes('userRateLimitExceeded');
  if (quota) return 'quota';
  if (status === 403 || text.includes('invalid_grant')) return 'auth';
  return 'error';
}

function parseToken(text: string): GoogleTokenSet | null {
  const value = json(text);
  if (!value) return null;
  const accessToken = value.access_token;
  const scope = value.scope;
  const expiresIn = value.expires_in;
  if (typeof accessToken !== 'string' || accessToken === '') return null;
  if (typeof scope !== 'string') return null;
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn)) return null;
  const set: GoogleTokenSet = { accessToken, scope, expiresIn };
  if (typeof value.refresh_token === 'string' && value.refresh_token !== '') {
    set.refreshToken = value.refresh_token;
  }
  return set;
}

function parseSites(text: string): SearchConsoleSite[] {
  const value = json(text);
  const rows = value?.siteEntry;
  if (rows === undefined) return [];
  if (!Array.isArray(rows)) throw new GoogleApiError('error');
  const sites: SearchConsoleSite[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const siteUrl = (row as { siteUrl?: unknown }).siteUrl;
    const permissionLevel = (row as { permissionLevel?: unknown })
      .permissionLevel;
    if (typeof siteUrl !== 'string' || typeof permissionLevel !== 'string') {
      continue;
    }
    sites.push({ siteUrl, permissionLevel });
  }
  return sites;
}

function parseSitemaps(text: string): SearchConsoleSitemap[] {
  const value = json(text);
  const rows = value?.sitemap;
  if (rows === undefined) return [];
  if (!Array.isArray(rows)) throw new GoogleApiError('error');
  const sitemaps: SearchConsoleSitemap[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    if (typeof record.path !== 'string') continue;
    const contents = Array.isArray(record.contents) ? record.contents : [];
    let submitted = 0;
    let indexed = 0;
    for (const content of contents) {
      if (!content || typeof content !== 'object') continue;
      const item = content as Record<string, unknown>;
      submitted += count(item.submitted);
      indexed += count(item.indexed);
    }
    sitemaps.push({
      path: record.path,
      errors: count(record.errors),
      warnings: count(record.warnings),
      pending: record.isPending === true,
      isIndex: record.isSitemapsIndex === true,
      submitted,
      indexed,
    });
  }
  return sitemaps;
}

function parseInspect(text: string): SearchConsoleInspect {
  const value = json(text);
  const result = value?.inspectionResult;
  if (!result || typeof result !== 'object') throw new GoogleApiError('error');
  const index = (result as { indexStatusResult?: unknown }).indexStatusResult;
  if (!index || typeof index !== 'object') throw new GoogleApiError('error');
  const verdict = (index as { verdict?: unknown }).verdict;
  if (typeof verdict !== 'string' || verdict === '') {
    throw new GoogleApiError('error');
  }
  return { verdict };
}

function json(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function count(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d{1,9}$/.test(value))
    return Number(value);
  return 0;
}
