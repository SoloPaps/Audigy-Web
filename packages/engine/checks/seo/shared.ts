import type { SafeResponse } from '@audigy/net';
import type { CheckContext, CheckResult, Status } from '../../src/types.js';
import { isHtml, loadHome } from '../securite/shared.js';
import type { PageFacts } from './html.js';
import { parseHtml } from './html.js';

export const ROBOTS_KEY = 'robots';
export const TITLE_MIN = 15;
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_MAX = 160;
export const SITEMAP_URL_LIMIT = 20;
export const SITEMAP_FILE_LIMIT = 5;
export const SITEMAP_TIMEOUT_MS = 60_000;

export function finding(
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

export type PageLoad =
  | { kind: 'html'; res: SafeResponse; facts: PageFacts }
  | { kind: 'status'; res: SafeResponse }
  | { kind: 'other'; res: SafeResponse };

export async function loadPage(ctx: CheckContext): Promise<PageLoad> {
  const res = await loadHome(ctx);
  if (res.status !== 200) return { kind: 'status', res };
  if (!isPageHtml(res)) return { kind: 'other', res };
  return { kind: 'html', res, facts: parseHtml(res.text()) };
}

export function isPageHtml(res: SafeResponse): boolean {
  const type = res.headers.get('content-type');
  if (type !== null) return isHtml(res.headers);
  return /^\s*(?:<!doctype\s+html|<html[\s>])/i.test(res.text());
}

export function looksLikeHtml(
  text: string,
  contentType: string | null,
): boolean {
  if (contentType !== null && /html/i.test(contentType)) return true;
  const body = text.replace(/^\uFEFF/, '').trimStart();
  return /^<!doctype\s+html/i.test(body) || /^<html[\s>]/i.test(body);
}

export function pageStatus(id: string, res: SafeResponse): CheckResult {
  return finding(id, 'untested', 1, 1, 'seo.page.untested_status', {
    params: { status: res.status },
    measured: { status: res.status, url: res.url },
  });
}

export function pageNotHtml(id: string): CheckResult {
  return finding(id, 'na', 1, 1, 'seo.page.na_not_html');
}

export function loadRobots(ctx: CheckContext): Promise<SafeResponse> {
  const url = new URL('/robots.txt', ctx.target.url.origin);
  return ctx.shared.get(ROBOTS_KEY, () =>
    ctx.net.fetch(url, { signal: ctx.signal }),
  );
}

export function samePage(a: URL, b: URL): boolean {
  const path = (value: string) =>
    value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
  return (
    a.protocol === b.protocol &&
    a.host === b.host &&
    path(a.pathname) === path(b.pathname) &&
    a.search === b.search
  );
}

export function outOfPath(id: string, messageKey: string): CheckResult {
  return finding(id, 'na', 1, 1, messageKey, { measured: { scope: 'path' } });
}
