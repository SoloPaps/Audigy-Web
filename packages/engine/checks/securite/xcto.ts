import type { SafeResponse } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import { finding, loadHome } from './shared.js';

const ID = 'securite.xcto';

export function judgeXcto(home: SafeResponse): CheckResult {
  const header = home.headers.get('x-content-type-options');
  if (header === null || header.trim() === '') {
    return finding(ID, 'warn', 1, 1, 'securite.xcto.warn_missing', {
      measured: { present: false },
    });
  }
  const tokens = header
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => token === 'nosniff')) {
    return finding(ID, 'pass', 1, 1, 'securite.xcto.pass', {
      measured: { value: 'nosniff' },
    });
  }
  return finding(ID, 'fail', 2, 2, 'securite.xcto.fail', {
    measured: { value: header },
  });
}

export const xctoCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 1,
  async run(ctx) {
    return judgeXcto(await loadHome(ctx));
  },
};
