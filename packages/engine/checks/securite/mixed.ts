import type { SafeResponse } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import { scanMixed } from './parse.js';
import { finding, isHtml, loadHome } from './shared.js';

const ID = 'securite.mixed';

export function judgeMixed(home: SafeResponse): CheckResult {
  const final = new URL(home.url);
  if (final.protocol !== 'https:') {
    return finding(ID, 'na', 1, 1, 'securite.mixed.na_http', {
      measured: { finalUrl: home.url },
    });
  }
  if (!isHtml(home.headers)) {
    return finding(ID, 'na', 1, 1, 'securite.mixed.na_not_html', {
      measured: { contentType: home.headers.get('content-type') },
    });
  }
  const hits = scanMixed(home.text());
  const measured = {
    active: hits.active.slice(0, 10),
    passive: hits.passive.slice(0, 10),
    activeCount: hits.active.length,
    passiveCount: hits.passive.length,
  };
  if (hits.active.length > 0) {
    return finding(ID, 'fail', 3, 3, 'securite.mixed.fail', { measured });
  }
  if (hits.passive.length > 0) {
    return finding(ID, 'warn', 2, 2, 'securite.mixed.warn', { measured });
  }
  return finding(ID, 'pass', 1, 1, 'securite.mixed.pass', { measured });
}

export const mixedCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 2,
  async run(ctx) {
    return judgeMixed(await loadHome(ctx));
  },
};
