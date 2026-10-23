import type { SafeResponse } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import { frameAncestors, judgeAncestors, judgeXfo } from './parse.js';
import { finding, loadHome } from './shared.js';

const ID = 'securite.frames';

export function judgeFrames(home: SafeResponse): CheckResult {
  const csp = home.headers.get('content-security-policy');
  const xfo = home.headers.get('x-frame-options');
  if (csp !== null && csp.trim() !== '') {
    const ancestors = frameAncestors(csp);
    if (Array.isArray(ancestors)) {
      const verdict = judgeAncestors(ancestors);
      if (verdict === 'pass') {
        return finding(ID, 'pass', 1, 1, 'securite.frames.pass', {
          measured: { via: 'frame-ancestors' },
        });
      }
      if (verdict === 'fail') {
        return finding(ID, 'fail', 3, 2, 'securite.frames.fail', {
          measured: { via: 'frame-ancestors', values: [...ancestors] },
        });
      }
    }
  }
  if (xfo === null || xfo.trim() === '') {
    return finding(ID, 'fail', 3, 2, 'securite.frames.fail', {
      measured: { via: 'absent' },
    });
  }
  const verdict = judgeXfo(xfo);
  if (verdict === 'deny' || verdict === 'same') {
    return finding(ID, 'pass', 1, 1, 'securite.frames.pass', {
      measured: { via: 'x-frame-options', value: verdict },
    });
  }
  if (verdict === 'allow-from') {
    return finding(ID, 'warn', 2, 2, 'securite.frames.warn_obsolete', {
      measured: { via: 'x-frame-options', value: verdict },
    });
  }
  return finding(ID, 'fail', 3, 2, 'securite.frames.fail', {
    measured: { via: 'x-frame-options' },
  });
}

export const framesCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 2,
  async run(ctx) {
    return judgeFrames(await loadHome(ctx));
  },
};
