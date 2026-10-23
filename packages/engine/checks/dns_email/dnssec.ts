import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { finding, lookup, runDns } from './shared.js';

const ID = 'dns_email.dnssec';

export async function judgeDnssec(
  ctx: CheckContext,
  domain: string,
): Promise<CheckResult> {
  const answer = await lookup(ctx, domain, 'SOA');
  if (answer.authenticated) {
    return finding('pass', 1, 1, 'dns_email.dnssec.pass', {
      measured: { authenticated: true, status: answer.status },
    });
  }
  return finding('fail', 3, 2, 'dns_email.dnssec.fail', {
    fixKey: ID,
    measured: { authenticated: false, status: answer.status },
  });
}

export const dnssecCheck: Check = {
  id: ID,
  domain: 'dns_email',
  mode: 'passive',
  needs: ['dns'],
  weight: 2,
  run: (ctx) => runDns(ctx, judgeDnssec),
};
