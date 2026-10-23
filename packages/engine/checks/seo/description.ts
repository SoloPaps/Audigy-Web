import type { Check } from '../../src/types.js';
import type { PageFacts } from './html.js';
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  finding,
  loadPage,
  pageNotHtml,
  pageStatus,
} from './shared.js';

const ID = 'seo.description';

export function judgeDescription(facts: PageFacts) {
  const descriptions = facts.descriptions
    .map((item) => item.trim())
    .filter((item) => item !== '');
  if (descriptions.length === 0) {
    return finding(ID, 'warn', 2, 2, 'seo.description.warn_missing');
  }
  const title = (facts.titles.find((item) => item.trim() !== '') ?? '').trim();
  const folded = descriptions.map((item) => item.toLocaleLowerCase('fr-FR'));
  if (new Set(folded).size > 1) {
    return finding(ID, 'warn', 2, 2, 'seo.description.warn_duplicate', {
      measured: { count: descriptions.length },
    });
  }
  const text = descriptions[0] as string;
  if (
    title !== '' &&
    text.toLocaleLowerCase('fr-FR') === title.toLocaleLowerCase('fr-FR')
  ) {
    return finding(ID, 'warn', 2, 2, 'seo.description.warn_same', {
      measured: { length: text.length },
    });
  }
  if (descriptions.length > 1) {
    return finding(ID, 'warn', 1, 1, 'seo.description.warn_repeat', {
      measured: { count: descriptions.length },
    });
  }
  const measured = { length: text.length };
  if (text.length < DESCRIPTION_MIN) {
    return finding(ID, 'warn', 2, 2, 'seo.description.warn_short', {
      params: { count: text.length },
      measured,
    });
  }
  if (text.length > DESCRIPTION_MAX) {
    return finding(ID, 'warn', 2, 2, 'seo.description.warn_long', {
      params: { count: text.length },
      measured,
    });
  }
  return finding(ID, 'pass', 1, 1, 'seo.description.pass', { measured });
}

export const descriptionCheck: Check = {
  id: ID,
  domain: 'seo',
  mode: 'passive',
  needs: ['http'],
  weight: 1,
  async run(ctx) {
    const page = await loadPage(ctx);
    if (page.kind === 'status') return pageStatus(ID, page.res);
    if (page.kind === 'other') return pageNotHtml(ID);
    return judgeDescription(page.facts);
  },
};
