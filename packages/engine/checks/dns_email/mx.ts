import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { finding, readMx, runDns } from './shared.js';

const ID = 'dns_email.mx';

export async function judgeMx(
  ctx: CheckContext,
  domain: string,
): Promise<CheckResult> {
  const mx = await readMx(ctx, domain);
  if (mx.mode === 'hosts') {
    return finding('pass', 1, 1, 'dns_email.mx.pass', {
      measured: { hosts: mx.hosts, count: mx.hosts.length },
    });
  }
  if (mx.mode === 'null') {
    return finding('pass', 1, 1, 'dns_email.mx.pass_null', {
      measured: { nullMx: true },
    });
  }
  if (mx.mode === 'absent') {
    return finding('warn', 2, 2, 'dns_email.mx.warn_absent', {
      fixKey: ID,
      measured: { present: false },
    });
  }
  return finding(
    'fail',
    3,
    2,
    mx.mix ? 'dns_email.mx.fail_mix' : 'dns_email.mx.fail_syntax',
    { fixKey: ID, measured: { mix: mx.mix } },
  );
}

export const mxCheck: Check = {
  id: ID,
  domain: 'dns_email',
  mode: 'passive',
  needs: ['dns'],
  weight: 2,
  run: (ctx) => runDns(ctx, judgeMx),
};
