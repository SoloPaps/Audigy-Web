import type { Check } from '../../src/types.js';
import type { PageFacts } from './html.js';
import {
  finding,
  loadPage,
  pageNotHtml,
  pageStatus,
  TITLE_MAX,
  TITLE_MIN,
} from './shared.js';

const ID = 'seo.title';

export function judgeTitle(facts: PageFacts) {
  const titles = facts.titles
    .map((item) => item.trim())
    .filter((item) => item !== '');
  if (titles.length === 0) {
    return finding(ID, 'fail', 3, 3, 'seo.title.fail_missing');
  }
  const unique = new Set(titles);
  if (unique.size > 1) {
    return finding(ID, 'fail', 3, 2, 'seo.title.fail_duplicate', {
      measured: { count: titles.length },
    });
  }
  if (titles.length > 1) {
    return finding(ID, 'warn', 1, 1, 'seo.title.warn_repeat', {
      measured: { count: titles.length },
    });
  }
  const length = (titles[0] as string).length;
  const measured = { length };
  if (length < TITLE_MIN) {
    return finding(ID, 'warn', 2, 2, 'seo.title.warn_short', {
      params: { count: length },
      measured,
    });
  }
  if (length > TITLE_MAX) {
    return finding(ID, 'warn', 2, 2, 'seo.title.warn_long', {
      params: { count: length },
      measured,
    });
  }
  return finding(ID, 'pass', 1, 1, 'seo.title.pass', { measured });
}

export const titleCheck: Check = {
  id: ID,
  domain: 'seo',
  mode: 'passive',
  needs: ['http'],
  weight: 2,
  async run(ctx) {
    const page = await loadPage(ctx);
    if (page.kind === 'status') return pageStatus(ID, page.res);
    if (page.kind === 'other') return pageNotHtml(ID);
    return judgeTitle(page.facts);
  },
};
