import type { SafeResponse } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import { parseHsts } from './parse.js';
import { finding, HSTS_SIX_MONTHS_SECONDS, loadHome } from './shared.js';

const ID = 'securite.hsts';

export function judgeHsts(home: SafeResponse): CheckResult {
  const final = new URL(home.url);
  if (final.protocol !== 'https:') {
    return finding(ID, 'fail', 3, 3, 'securite.hsts.fail_no_https', {
      measured: { finalUrl: home.url },
    });
  }
  const header = home.headers.get('strict-transport-security');
  if (header === null || header.trim() === '') {
    return finding(ID, 'fail', 3, 3, 'securite.hsts.fail_missing', {
      measured: { present: false },
    });
  }
  const policy = parseHsts(header);
  if (!policy) {
    return finding(ID, 'fail', 3, 3, 'securite.hsts.fail_invalid', {
      measured: { present: true },
    });
  }
  if (policy.maxAge === 0) {
    return finding(ID, 'fail', 3, 3, 'securite.hsts.fail_missing', {
      measured: { present: true, maxAge: 0 },
    });
  }
  const measured = {
    maxAge: policy.maxAge,
    includeSubDomains: policy.includeSubDomains,
    preload: policy.preload,
  };
  if (policy.maxAge < HSTS_SIX_MONTHS_SECONDS) {
    return finding(ID, 'warn', 2, 2, 'securite.hsts.warn_short', { measured });
  }
  return finding(ID, 'pass', 1, 1, 'securite.hsts.pass', { measured });
}

export const hstsCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 3,
  async run(ctx) {
    return judgeHsts(await loadHome(ctx));
  },
};
