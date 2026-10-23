import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { parseTlsRpt } from './parse.js';
import {
  finding,
  intendsMail,
  lookup,
  readMx,
  runDns,
  txtOf,
} from './shared.js';

const ID = 'dns_email.tls_rpt';

function isRpt(data: string): boolean {
  return /^v=TLSRPTv1(\s|;|$)/i.test(data.trim());
}

export async function judgeTlsRpt(
  ctx: CheckContext,
  domain: string,
): Promise<CheckResult> {
  const mx = await readMx(ctx, domain);
  if (!intendsMail(mx)) {
    return finding('na', 1, 1, 'dns_email.tls_rpt.na_nomail', {
      measured: { mail: mx.mode },
    });
  }
  const records = txtOf(
    await lookup(ctx, `_smtp._tls.${domain}`, 'TXT'),
  ).filter(isRpt);
  if (records.length === 0) {
    return finding('warn', 2, 1, 'dns_email.tls_rpt.warn_missing', {
      fixKey: ID,
      measured: { present: false },
    });
  }
  if (records.length > 1) {
    return finding('fail', 2, 2, 'dns_email.tls_rpt.fail_syntax', {
      fixKey: ID,
      measured: { count: records.length },
    });
  }
  const parsed = records[0] === undefined ? null : parseTlsRpt(records[0]);
  if (!parsed) {
    return finding('fail', 2, 2, 'dns_email.tls_rpt.fail_syntax', {
      fixKey: ID,
    });
  }
  return finding('pass', 1, 1, 'dns_email.tls_rpt.pass', {
    measured: { rua: parsed.rua.length },
  });
}

export const tlsRptCheck: Check = {
  id: ID,
  domain: 'dns_email',
  mode: 'passive',
  needs: ['dns'],
  weight: 1,
  run: (ctx) => runDns(ctx, judgeTlsRpt),
};
