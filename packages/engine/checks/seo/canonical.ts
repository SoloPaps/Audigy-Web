import type { Check } from '../../src/types.js';
import type { PageFacts } from './html.js';
import {
  finding,
  loadPage,
  pageNotHtml,
  pageStatus,
  samePage,
} from './shared.js';

const ID = 'seo.canonical';

export function judgeCanonical(facts: PageFacts, pageUrl: URL) {
  if (facts.canonicals.length === 0) {
    return finding(ID, 'warn', 2, 2, 'seo.canonical.warn_missing');
  }
  const resolved: URL[] = [];
  for (const href of facts.canonicals) {
    const url = resolveCanonical(href, pageUrl);
    if (url === null) {
      return finding(ID, 'fail', 2, 2, 'seo.canonical.fail_invalid', {
        measured: { href },
      });
    }
    resolved.push(url);
  }
  const keys = resolved.map((url) => pageKey(url));
  if (new Set(keys).size > 1) {
    return finding(ID, 'fail', 2, 2, 'seo.canonical.fail_conflict', {
      measured: { urls: keys },
    });
  }
  const target = resolved[0] as URL;
  if (target.host !== pageUrl.host) {
    return finding(ID, 'fail', 3, 3, 'seo.canonical.fail_other_host', {
      measured: { url: target.href },
    });
  }
  if (!samePage(target, pageUrl)) {
    return finding(ID, 'warn', 2, 2, 'seo.canonical.warn_other', {
      measured: { url: target.href },
    });
  }
  if (resolved.length > 1) {
    return finding(ID, 'warn', 1, 1, 'seo.canonical.warn_repeat', {
      measured: { count: resolved.length },
    });
  }
  return finding(ID, 'pass', 1, 1, 'seo.canonical.pass', {
    measured: { url: target.href },
  });
}

export const canonicalCheck: Check = {
  id: ID,
  domain: 'seo',
  mode: 'passive',
  needs: ['http'],
  weight: 2,
  async run(ctx) {
    const page = await loadPage(ctx);
    if (page.kind === 'status') return pageStatus(ID, page.res);
    if (page.kind === 'other') return pageNotHtml(ID);
    return judgeCanonical(page.facts, new URL(page.res.url));
  },
};

function resolveCanonical(href: string, pageUrl: URL): URL | null {
  const trimmed = href.trim();
  if (trimmed === '') return null;
  try {
    const url = new URL(trimmed, pageUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function pageKey(url: URL): string {
  const path =
    url.pathname.length > 1 && url.pathname.endsWith('/')
      ? url.pathname.slice(0, -1)
      : url.pathname;
  return `${url.protocol}//${url.host}${path}${url.search}`;
}
