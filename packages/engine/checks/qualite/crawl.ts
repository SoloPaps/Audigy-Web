import { isNetError, type SafeResponse } from '@audigy/net';
import type { CheckContext } from '../../src/types.js';
import { loadHome } from '../securite/shared.js';
import { crawlerAllowed, parseRobots } from '../seo/robots-parse.js';
import { isPageHtml, loadRobots, looksLikeHtml } from '../seo/shared.js';
import { extractDocument, type ImageFact } from './extract.js';
import type { CrawlData, LinkHit, LinkOutcome, QualityFacts } from './facts.js';
import {
  AUDIGY_AGENT,
  EXTERNAL_LIMIT,
  PAGE_LIMIT,
  QUALITY_KEY,
} from './limits.js';
import { inScope, looksLikePage } from './scope.js';

const TEMP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const UNCERTAIN_STATUS = new Set([401, 403, 405, 501]);

type Pull =
  | { kind: 'ok'; res: SafeResponse }
  | { kind: 'budget' }
  | { kind: 'abort' }
  | { kind: 'error'; code: string };

/** Parcours borné, partagé entre les checks qualité. */
export function loadQuality(ctx: CheckContext): Promise<QualityFacts> {
  return ctx.shared.get(QUALITY_KEY, () => collect(ctx));
}

async function collect(ctx: CheckContext): Promise<QualityFacts> {
  const robots = await readRobots(ctx);
  if (robots.kind !== 'rules') return robots.facts;
  const target = stripHash(ctx.target.url);
  if (!robots.allow(target)) return { kind: 'robots' };

  const start = await readStart(ctx);
  if (start.kind !== 'html') return start.facts;

  const seen = new Set<string>([target.href, start.final.href]);
  const pageQueue: URL[] = [];
  const fileQueue: URL[] = [];
  const externalQueue: URL[] = [];
  const images: ImageFact[] = [];
  let horsPortee = 0;
  let robotsBlocked = 0;
  const horsSeen = new Set<string>();

  const takeLinks = (html: string, pageUrl: URL): void => {
    const extracted = extractDocument(html, pageUrl);
    images.push(...extracted.images);
    for (const link of extracted.links) {
      if (link.origin === target.origin) {
        if (!inScope(target, ctx.target.scope, link)) {
          if (!horsSeen.has(link.href)) {
            horsSeen.add(link.href);
            horsPortee += 1;
          }
          continue;
        }
        if (seen.has(link.href)) continue;
        seen.add(link.href);
        if (!robots.allow(link)) {
          robotsBlocked += 1;
          continue;
        }
        if (looksLikePage(link)) pageQueue.push(link);
        else fileQueue.push(link);
        continue;
      }
      if (seen.has(link.href)) continue;
      seen.add(link.href);
      externalQueue.push(link);
    }
  };

  takeLinks(start.html, start.final);
  const pages = [{ url: start.final.href, html: start.html }];
  const internal: LinkHit[] = [];
  let pageFetches = 1;
  let budgetStopped = false;
  let aborted = false;

  const noteStop = (pull: Pull): boolean => {
    if (pull.kind === 'budget') budgetStopped = true;
    if (pull.kind === 'abort') aborted = true;
    return pull.kind === 'budget' || pull.kind === 'abort';
  };

  while (pageQueue.length > 0 && pageFetches < PAGE_LIMIT && !budgetStopped) {
    const next = pageQueue.shift();
    if (!next) break;
    pageFetches += 1;
    const pull = await pullUrl(ctx, next, 'GET');
    if (noteStop(pull)) break;
    const outcome = classify('internal', pull);
    if (outcome !== 'ok') {
      internal.push({ url: next.href, outcome });
      continue;
    }
    if (pull.kind !== 'ok') continue;
    const final = new URL(pull.res.url);
    if (!inScope(target, ctx.target.scope, final) || !robots.allow(final)) {
      continue;
    }
    if (
      !isPageHtml(pull.res) ||
      pull.res.status < 200 ||
      pull.res.status >= 300
    ) {
      continue;
    }
    const html = pull.res.text();
    pages.push({ url: final.href, html });
    seen.add(final.href);
    takeLinks(html, final);
  }

  if (!budgetStopped && !aborted) {
    for (const file of fileQueue) {
      const pull = await pullUrl(ctx, file, 'GET');
      if (noteStop(pull)) break;
      const outcome = classify('internal', pull);
      if (outcome !== 'ok') internal.push({ url: file.href, outcome });
    }
  }

  const planned = externalQueue.slice(0, EXTERNAL_LIMIT);
  let externalUnchecked = externalQueue.length - planned.length;
  const external: LinkHit[] = [];
  if (!budgetStopped && !aborted) {
    let probed = 0;
    for (const link of planned) {
      const pull = await pullUrl(ctx, link, 'HEAD');
      if (noteStop(pull)) {
        externalUnchecked += planned.length - probed;
        break;
      }
      probed += 1;
      const outcome = classify('external', pull);
      if (outcome !== 'ok') external.push({ url: link.href, outcome });
    }
  } else {
    externalUnchecked += planned.length;
  }

  const sizes: CrawlData['sizes'] = [];
  if (!budgetStopped && !aborted) {
    const seenImages = new Set<string>();
    for (const image of images) {
      for (const href of image.urls) {
        if (seenImages.has(href)) continue;
        seenImages.add(href);
        const pull = await pullUrl(ctx, new URL(href), 'HEAD');
        if (noteStop(pull)) break;
        if (pull.kind !== 'ok') {
          sizes.push({ url: href, bytes: null, type: null });
          continue;
        }
        sizes.push({
          url: href,
          bytes: contentLength(pull.res),
          type: mediaType(pull.res),
        });
      }
    }
  }

  return {
    kind: 'ok',
    data: {
      pages,
      truncated: pageQueue.length > 0 || budgetStopped || aborted,
      budgetStopped: budgetStopped || aborted,
      robotsBlocked,
      horsPortee,
      internal,
      external,
      externalUnchecked,
      images,
      sizes,
    },
  };
}

async function readRobots(
  ctx: CheckContext,
): Promise<
  | { kind: 'rules'; allow: (url: URL) => boolean }
  | { kind: 'stop'; facts: QualityFacts }
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

async function readStart(
  ctx: CheckContext,
): Promise<
  | { kind: 'html'; html: string; final: URL }
  | { kind: 'stop'; facts: QualityFacts }
> {
  try {
    const res = await loadHome(ctx);
    if (res.status < 200 || res.status >= 300) {
      return { kind: 'stop', facts: { kind: 'status', status: res.status } };
    }
    if (!isPageHtml(res)) return { kind: 'stop', facts: { kind: 'not_html' } };
    const final = new URL(res.url);
    if (!inScope(stripHash(ctx.target.url), ctx.target.scope, final)) {
      return { kind: 'stop', facts: { kind: 'left' } };
    }
    return { kind: 'html', html: res.text(), final };
  } catch (error) {
    if (isNetError(error, 'BUDGET_EXCEEDED') || ctx.signal.aborted) {
      return { kind: 'stop', facts: { kind: 'budget' } };
    }
    return { kind: 'stop', facts: { kind: 'down' } };
  }
}

async function pullUrl(
  ctx: CheckContext,
  url: URL,
  method: 'GET' | 'HEAD',
): Promise<Pull> {
  if (ctx.signal.aborted) return { kind: 'abort' };
  try {
    const res = await ctx.net.fetch(url, { method, signal: ctx.signal });
    return { kind: 'ok', res };
  } catch (error) {
    if (ctx.signal.aborted) return { kind: 'abort' };
    if (isNetError(error, 'BUDGET_EXCEEDED')) return { kind: 'budget' };
    if (isNetError(error)) return { kind: 'error', code: error.code };
    return { kind: 'error', code: 'NETWORK' };
  }
}

function classify(side: 'internal' | 'external', pull: Pull): LinkOutcome {
  if (pull.kind === 'budget' || pull.kind === 'abort') return 'ok';
  if (pull.kind === 'error') {
    if (pull.code === 'RESPONSE_TOO_LARGE') {
      return side === 'external' ? 'uncertain' : 'ok';
    }
    if (side === 'external') {
      if (pull.code === 'TLS_HANDSHAKE_FAILED') return 'uncertain';
      if (
        pull.code === 'TIMEOUT' ||
        pull.code === 'NETWORK' ||
        pull.code === 'DNS_FAILURE'
      ) {
        return 'temp';
      }
    }
    return 'broken';
  }
  const status = pull.res.status;
  if (status >= 200 && status < 300) return 'ok';
  if (side === 'internal') return 'broken';
  if (TEMP_STATUS.has(status)) return 'temp';
  if (UNCERTAIN_STATUS.has(status)) return 'uncertain';
  return 'broken';
}

function contentLength(res: SafeResponse): number | null {
  const raw = res.headers.get('content-length');
  if (raw === null || !/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function mediaType(res: SafeResponse): string | null {
  const raw = res.headers.get('content-type');
  if (raw === null) return null;
  const base = raw.split(';')[0]?.trim().toLowerCase() ?? '';
  return base === '' ? null : base;
}

function stripHash(url: URL): URL {
  const copy = new URL(url.href);
  copy.hash = '';
  return copy;
}
