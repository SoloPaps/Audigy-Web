import type { Check } from '../../src/types.js';
import { googlebotAllowed, parseRobots } from './robots-parse.js';
import { finding, loadRobots, looksLikeHtml, outOfPath } from './shared.js';

const ID = 'seo.robots';

export const robotsCheck: Check = {
  id: ID,
  domain: 'seo',
  mode: 'passive',
  needs: ['http'],
  weight: 2,
  async run(ctx) {
    if (ctx.target.scope === 'path')
      return outOfPath(ID, 'seo.robots.na_scope');
    const res = await loadRobots(ctx);
    const measured = { status: res.status, url: res.url };
    if (res.status === 404 || res.status === 410) {
      return finding(ID, 'pass', 1, 1, 'seo.robots.pass_absent', { measured });
    }
    if (res.status !== 200) {
      return finding(ID, 'untested', 1, 1, 'seo.robots.untested_status', {
        params: { status: res.status },
        measured,
      });
    }
    if (looksLikeHtml(res.text(), res.headers.get('content-type'))) {
      return finding(ID, 'fail', 3, 2, 'seo.robots.fail_html', { measured });
    }
    const file = parseRobots(res.text());
    const allowed = googlebotAllowed(file, ctx.target.url);
    if (!allowed) {
      return finding(ID, 'fail', 4, 3, 'seo.robots.fail_block', {
        measured: {
          ...measured,
          allowed: false,
          sitemaps: file.sitemaps.length,
        },
      });
    }
    return finding(ID, 'pass', 1, 1, 'seo.robots.pass', {
      measured: { ...measured, allowed: true, sitemaps: file.sitemaps.length },
    });
  },
};
