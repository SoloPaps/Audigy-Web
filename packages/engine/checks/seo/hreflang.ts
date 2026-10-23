import type { Check } from '../../src/types.js';
import type { PageFacts } from './html.js';
import {
  finding,
  loadPage,
  pageNotHtml,
  pageStatus,
  samePage,
} from './shared.js';

const ID = 'seo.hreflang';
const LANG = /^(x-default|[a-z]{2,3}(?:-[a-z0-9]{2,8})*)$/;

export function judgeHreflang(facts: PageFacts, pageUrl: URL) {
  if (facts.hreflangs.length === 0) {
    return finding(ID, 'na', 1, 1, 'seo.hreflang.na');
  }
  const seen = new Map<string, string>();
  let relative = false;
  let self = false;
  for (const item of facts.hreflangs) {
    const lang = item.lang.trim().toLowerCase();
    if (!LANG.test(lang)) {
      return finding(ID, 'fail', 2, 2, 'seo.hreflang.fail_lang', {
        measured: { lang },
      });
    }
    const href = item.href.trim();
    if (href === '') {
      return finding(ID, 'fail', 2, 2, 'seo.hreflang.fail_href', {
        measured: { lang },
      });
    }
    let url: URL;
    try {
      url = new URL(href, pageUrl);
    } catch {
      return finding(ID, 'fail', 2, 2, 'seo.hreflang.fail_href', {
        measured: { lang },
      });
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return finding(ID, 'fail', 2, 2, 'seo.hreflang.fail_href', {
        measured: { lang },
      });
    }
    url.hash = '';
    if (!/^https?:/i.test(href)) relative = true;
    const prev = seen.get(lang);
    if (prev !== undefined && prev !== url.href) {
      return finding(ID, 'fail', 2, 2, 'seo.hreflang.fail_conflict', {
        measured: { lang },
      });
    }
    seen.set(lang, url.href);
    if (samePage(url, pageUrl)) self = true;
  }
  if (relative) {
    return finding(ID, 'warn', 2, 2, 'seo.hreflang.warn_relative', {
      measured: { count: facts.hreflangs.length },
    });
  }
  if (!self) {
    return finding(ID, 'warn', 2, 2, 'seo.hreflang.warn_self', {
      measured: { count: facts.hreflangs.length },
    });
  }
  return finding(ID, 'pass', 1, 1, 'seo.hreflang.pass', {
    measured: { count: facts.hreflangs.length },
  });
}

export const hreflangCheck: Check = {
  id: ID,
  domain: 'seo',
  mode: 'passive',
  needs: ['http'],
  weight: 1,
  async run(ctx) {
    const page = await loadPage(ctx);
    if (page.kind === 'status') return pageStatus(ID, page.res);
    if (page.kind === 'other') return pageNotHtml(ID);
    return judgeHreflang(page.facts, new URL(page.res.url));
  },
};
