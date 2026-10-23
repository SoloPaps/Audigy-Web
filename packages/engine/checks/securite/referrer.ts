import type { SafeResponse } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import { judgeReferrer } from './parse.js';
import { finding, loadHome } from './shared.js';

const ID = 'securite.referrer';

export function judgeReferrerHeader(home: SafeResponse): CheckResult {
  const header = home.headers.get('referrer-policy');
  if (header === null) {
    return finding(ID, 'pass', 1, 1, 'securite.referrer.pass_absent', {
      measured: { policy: 'absent' },
    });
  }
  const kind = judgeReferrer(header);
  const measured = { policy: kind };
  if (kind === 'private') {
    return finding(ID, 'pass', 1, 1, 'securite.referrer.pass', { measured });
  }
  if (kind === 'legacy') {
    return finding(ID, 'warn', 2, 2, 'securite.referrer.warn_legacy', {
      measured,
    });
  }
  if (kind === 'unsafe') {
    return finding(ID, 'warn', 2, 2, 'securite.referrer.warn_unsafe', {
      measured,
    });
  }
  return finding(ID, 'fail', 2, 2, 'securite.referrer.fail_invalid', {
    measured,
  });
}

export const referrerCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 1,
  async run(ctx) {
    return judgeReferrerHeader(await loadHome(ctx));
  },
};
