import {
  BROWSER_SHARED_KEY,
  BrowserAuditResultSchema,
} from '@audigy/browser-runner';
import { isNetError, type SafeResponse } from '@audigy/net';
import type { CheckContext } from '../../src/types.js';
import { AUDIGY_AGENT } from '../qualite/limits.js';
import { inScope } from '../qualite/scope.js';
import { loadHome } from '../securite/shared.js';
import { crawlerAllowed, parseRobots } from '../seo/robots-parse.js';
import { isPageHtml, loadRobots, looksLikeHtml } from '../seo/shared.js';
import { type PrivacyAudit, privacyAudit } from './hits.js';
import {
  classifyLink,
  type ElementFlags,
  findLegalLinks,
  type LegalLink,
  legalElements,
  MIN_LEGAL_TEXT,
  visibleText,
} from './links.js';

/** Rapport brut déposé par l’orchestration avant les checks. */
export const BROWSER_KEY = BROWSER_SHARED_KEY;
const BROWSER_PARSED_KEY = 'browser.parsed';
export const PAGES_KEY = 'vie_privee.pages';

export type BrowserFacts =
  | { kind: 'absent' }
  | { kind: 'invalid' }
  | { kind: 'interacted' }
  | { kind: 'ok'; audit: PrivacyAudit };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type PageState =
  | { kind: 'missing' }
  | { kind: 'empty'; url: string }
  | {
      kind: 'ready';
      url: string;
      text: string;
      html: string;
      elements: ElementFlags;
    }
  | { kind: 'blocked' }
  | { kind: 'down' }
  | { kind: 'status'; status: number }
  | { kind: 'other'; url: string }
  | { kind: 'budget' };

export type LegalFacts =
  | { kind: 'home_down' }
  | { kind: 'home_status'; status: number }
  | { kind: 'not_html' }
  | { kind: 'robots_down' }
  | { kind: 'robots_status'; status: number }
  | { kind: 'budget' }
  | { kind: 'ok'; mentions: PageState; privacy: PageState };

export function loadBrowser(ctx: CheckContext): Promise<BrowserFacts> {
  return ctx.shared.get(BROWSER_PARSED_KEY, async () => {
    if (!ctx.shared.has(BROWSER_KEY)) return { kind: 'absent' };
    const raw: unknown = await ctx.shared.get(
      BROWSER_KEY,
      async (): Promise<unknown> => null,
    );
    if (isRecord(raw) && raw.interacted === true) return { kind: 'interacted' };
    const parsed = BrowserAuditResultSchema.safeParse(raw);
    if (!parsed.success) return { kind: 'invalid' };
    return { kind: 'ok', audit: privacyAudit(parsed.data) };
  });
}

export function loadLegal(ctx: CheckContext): Promise<LegalFacts> {
  return ctx.shared.get(PAGES_KEY, () => collect(ctx));
}

async function collect(ctx: CheckContext): Promise<LegalFacts> {
  const robots = await readRobots(ctx);
  if (robots.kind === 'stop') return robots.facts;
  let home: SafeResponse;
  try {
    home = await loadHome(ctx);
  } catch (error) {
    if (isNetError(error, 'BUDGET_EXCEEDED') || ctx.signal.aborted) {
      return { kind: 'budget' };
    }
    return { kind: 'home_down' };
  }
  if (home.status < 200 || home.status >= 300) {
    return { kind: 'home_status', status: home.status };
  }
  if (!isPageHtml(home)) return { kind: 'not_html' };
  const finalUrl = new URL(home.url);
  const html = home.text();
  const links = findLegalLinks(html, finalUrl);
  const self = classifyLink('', finalUrl);
  return {
    kind: 'ok',
    mentions: await resolvePage(
      ctx,
      robots.allow,
      finalUrl,
      html,
      links,
      self,
      'mentions',
    ),
    privacy: await resolvePage(
      ctx,
      robots.allow,
      finalUrl,
      html,
      links,
      self,
      'privacy',
    ),
  };
}

async function resolvePage(
  ctx: CheckContext,
  allow: (url: URL) => boolean,
  pageUrl: URL,
  homeHtml: string,
  links: readonly LegalLink[],
  self: LegalLink['kind'] | null,
  kind: 'mentions' | 'privacy',
): Promise<PageState> {
  const covers = (value: LegalLink['kind'] | null): boolean =>
    value === kind || value === 'both';
  if (covers(self)) return readyState(pageUrl.href, homeHtml, 'text/html');
  const link = links.find((item) => covers(item.kind));
  if (!link) return { kind: 'missing' };
  if (!inScope(ctx.target.url, ctx.target.scope, link.url)) {
    return { kind: 'missing' };
  }
  if (!allow(link.url)) return { kind: 'blocked' };
  try {
    const res = await ctx.net.fetch(link.url, { signal: ctx.signal });
    if (res.status === 404 || res.status === 410) return { kind: 'missing' };
    if (res.status < 200 || res.status >= 300) {
      return { kind: 'status', status: res.status };
    }
    return readyState(res.url, res.text(), res.headers.get('content-type'));
  } catch (error) {
    if (isNetError(error, 'BUDGET_EXCEEDED') || ctx.signal.aborted) {
      return { kind: 'budget' };
    }
    return { kind: 'down' };
  }
}

function readyState(
  url: string,
  body: string,
  contentType: string | null,
): PageState {
  const type = contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
  const html = type.includes('html') || looksLikeHtml(body, contentType);
  const plain = type === 'text/plain' || type === '';
  if (!html && !plain) return { kind: 'other', url };
  const text = html ? visibleText(body) : body.replace(/\s+/g, ' ').trim();
  if (text.length < MIN_LEGAL_TEXT) return { kind: 'empty', url };
  return {
    kind: 'ready',
    url,
    text,
    html: body,
    elements: legalElements(body, text),
  };
}

async function readRobots(
  ctx: CheckContext,
): Promise<
  | { kind: 'rules'; allow: (url: URL) => boolean }
  | { kind: 'stop'; facts: LegalFacts }
> {
  try {
    const res = await loadRobots(ctx);
    if (res.status === 404 || res.status === 410) {
      return { kind: 'rules', allow: () => true };
    }
    if (res.status !== 200) {
      return {
        kind: 'stop',
        facts: { kind: 'robots_status', status: res.status },
      };
    }
    if (looksLikeHtml(res.text(), res.headers.get('content-type'))) {
      return { kind: 'rules', allow: () => true };
    }
    const file = parseRobots(res.text());
    return {
      kind: 'rules',
      allow: (url) => crawlerAllowed(file, url, AUDIGY_AGENT),
    };
  } catch (error) {
    if (isNetError(error, 'BUDGET_EXCEEDED') || ctx.signal.aborted) {
      return { kind: 'stop', facts: { kind: 'budget' } };
    }
    return { kind: 'stop', facts: { kind: 'robots_down' } };
  }
}
