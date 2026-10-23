import type { SafeResponse } from '@audigy/net';
import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { publicHttpUrl, sitemapLinks } from './robots-parse.js';
import {
  finding,
  loadRobots,
  looksLikeHtml,
  outOfPath,
  SITEMAP_FILE_LIMIT,
  SITEMAP_TIMEOUT_MS,
  SITEMAP_URL_LIMIT,
  samePage,
} from './shared.js';
import type { SitemapDocument } from './sitemap-parse.js';
import { parseSitemap } from './sitemap-parse.js';

const ID = 'seo.sitemap';

interface Gathered {
  pages: URL[];
  totalPages: number;
  external: number;
  truncated: boolean;
}

type GatheredResult =
  | { kind: 'absent' }
  | { kind: 'untested'; status: number }
  | { kind: 'fail_file' }
  | { kind: 'fail_xml' }
  | { kind: 'empty' }
  | { kind: 'ok'; data: Gathered };

export const sitemapCheck: Check = {
  id: ID,
  domain: 'seo',
  mode: 'passive',
  needs: ['http'],
  weight: 2,
  timeoutMs: SITEMAP_TIMEOUT_MS,
  async run(ctx) {
    if (ctx.target.scope === 'path') {
      return outOfPath(ID, 'seo.sitemap.na_scope');
    }
    const robots = await loadRobots(ctx);
    const declared =
      robots.status === 200 &&
      !looksLikeHtml(robots.text(), robots.headers.get('content-type'))
        ? sitemapLinks(robots.text(), new URL(robots.url))
        : [];
    const optional = declared.length === 0;
    const seeds = optional
      ? [new URL('/sitemap.xml', ctx.target.url.origin)]
      : declared;
    const gathered = await gather(ctx, seeds, optional);
    if (gathered.kind === 'absent') {
      return finding(ID, 'warn', 2, 2, 'seo.sitemap.warn_missing', {
        measured: { status: 404 },
      });
    }
    if (gathered.kind === 'untested') {
      return finding(ID, 'untested', 1, 1, 'seo.sitemap.untested_status', {
        params: { status: gathered.status },
        measured: { status: gathered.status },
      });
    }
    if (gathered.kind === 'fail_file') {
      return finding(ID, 'fail', 2, 2, 'seo.sitemap.fail_file');
    }
    if (gathered.kind === 'fail_xml') {
      return finding(ID, 'fail', 2, 2, 'seo.sitemap.fail_xml');
    }
    if (gathered.kind === 'empty') {
      return finding(ID, 'fail', 2, 2, 'seo.sitemap.fail_empty');
    }
    return verify(ctx, gathered.data);
  },
};

async function gather(
  ctx: CheckContext,
  seeds: readonly URL[],
  optional: boolean,
): Promise<GatheredResult> {
  const queue = [...seeds];
  const seenDocs = new Set<string>();
  const seenPages = new Set<string>();
  const pages: URL[] = [];
  let totalPages = 0;
  let external = 0;
  let truncated = false;
  let files = 0;
  const host = ctx.target.url.hostname;

  while (queue.length > 0 && files < SITEMAP_FILE_LIMIT) {
    const next = queue.shift();
    if (!next || seenDocs.has(next.href)) continue;
    seenDocs.add(next.href);
    if (next.hostname !== host) {
      external += 1;
      continue;
    }
    const res = await ctx.net.fetch(next, { signal: ctx.signal });
    const first = files === 0;
    files += 1;
    if (res.status === 404 || res.status === 410) {
      if (optional && first) return { kind: 'absent' };
      return { kind: 'fail_file' };
    }
    if (res.status !== 200) return { kind: 'untested', status: res.status };
    const read = readDocument(res);
    if (read === null) return { kind: 'fail_xml' };
    if (read.kind === 'sitemapindex') {
      const pushed = pushIndex(read, next, host, queue);
      if (pushed === 'xml') return { kind: 'fail_xml' };
      external += pushed.external;
      if (read.total > read.locs.length) truncated = true;
      continue;
    }
    const added = addPages(read, next, host, pages, seenPages);
    if (added === 'xml') return { kind: 'fail_xml' };
    external += added.external;
    totalPages += added.total;
    if (added.truncated || read.total > read.locs.length) truncated = true;
    if (read.total > read.locs.length) {
      totalPages += read.total - read.locs.length;
    }
    if (pages.length >= SITEMAP_URL_LIMIT) {
      if (queue.length > 0) truncated = true;
      break;
    }
  }
  if (queue.length > 0) truncated = true;
  if (pages.length === 0 && external === 0) return { kind: 'empty' };
  return {
    kind: 'ok',
    data: { pages, totalPages, external, truncated },
  };
}

function readDocument(res: SafeResponse): SitemapDocument | null {
  if (looksLikeHtml(res.text(), res.headers.get('content-type'))) return null;
  return parseSitemap(res.text());
}

function pushIndex(
  doc: SitemapDocument,
  base: URL,
  host: string,
  queue: URL[],
): { external: number } | 'xml' {
  let external = 0;
  for (const loc of doc.locs) {
    const url = publicHttpUrl(loc, base);
    if (!url) return 'xml';
    if (url.hostname !== host) external += 1;
    else queue.push(url);
  }
  return { external };
}

function addPages(
  doc: SitemapDocument,
  base: URL,
  host: string,
  pages: URL[],
  seenPages: Set<string>,
): { external: number; total: number; truncated: boolean } | 'xml' {
  let external = 0;
  let total = 0;
  let truncated = false;
  for (const loc of doc.locs) {
    const url = publicHttpUrl(loc, base);
    if (!url) return 'xml';
    if (url.hostname !== host) {
      external += 1;
      continue;
    }
    if (seenPages.has(url.href)) continue;
    seenPages.add(url.href);
    total += 1;
    if (pages.length >= SITEMAP_URL_LIMIT) {
      truncated = true;
      continue;
    }
    pages.push(url);
  }
  return { external, total, truncated };
}

async function verify(ctx: CheckContext, data: Gathered): Promise<CheckResult> {
  if (data.pages.length === 0 && data.external > 0) {
    return finding(ID, 'warn', 2, 2, 'seo.sitemap.warn_external', {
      measured: measuredOf(data, 0, 0),
    });
  }
  let failed = 0;
  let redirects = 0;
  for (const url of data.pages) {
    const res = await ctx.net.fetch(url, { signal: ctx.signal });
    if (res.status !== 200) failed += 1;
    else if (!samePage(url, new URL(res.url))) redirects += 1;
  }
  const measured = measuredOf(data, failed, redirects);
  if (failed === 1) {
    return finding(ID, 'fail', 2, 2, 'seo.sitemap.fail_status_one', {
      measured,
    });
  }
  if (failed > 1) {
    return finding(ID, 'fail', 2, 2, 'seo.sitemap.fail_status_many', {
      params: { count: failed },
      measured,
    });
  }
  if (data.external > 0) {
    return finding(ID, 'warn', 2, 2, 'seo.sitemap.warn_external', { measured });
  }
  if (redirects > 0) {
    return finding(ID, 'warn', 2, 1, 'seo.sitemap.warn_redirect', { measured });
  }
  if (data.truncated || data.totalPages > data.pages.length) {
    return finding(ID, 'pass', 1, 1, 'seo.sitemap.pass_sample', {
      params: { count: data.pages.length, total: data.totalPages },
      measured,
    });
  }
  return finding(ID, 'pass', 1, 1, 'seo.sitemap.pass', { measured });
}

function measuredOf(
  data: Gathered,
  failed: number,
  redirects: number,
): Record<string, unknown> {
  return {
    checked: data.pages.length,
    total: data.totalPages,
    failed,
    redirects,
    external: data.external,
    truncated: data.truncated,
  };
}
