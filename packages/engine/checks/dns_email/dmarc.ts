import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { parseDmarc } from './parse.js';
import {
  finding,
  intendsMail,
  lookup,
  readMx,
  runDns,
  txtOf,
} from './shared.js';

const ID = 'dns_email.dmarc';

function isDmarc(data: string): boolean {
  return /^v=DMARC1(\s|;|$)/i.test(data.trim());
}

export async function judgeDmarc(
  ctx: CheckContext,
  domain: string,
): Promise<CheckResult> {
  const mail = intendsMail(await readMx(ctx, domain));
  const records = txtOf(await lookup(ctx, `_dmarc.${domain}`, 'TXT')).filter(
    isDmarc,
  );
  if (records.length === 0) {
    return finding(
      'fail',
      4,
      3,
      mail ? 'dns_email.dmarc.fail_missing' : 'dns_email.dmarc.fail_spoof',
      { fixKey: ID, measured: { mail } },
    );
  }
  if (records.length > 1) {
    return finding('fail', 4, 3, 'dns_email.dmarc.fail_multiple', {
      fixKey: ID,
      measured: { count: records.length },
    });
  }
  const record = records[0];
  const parsed = record === undefined ? null : parseDmarc(record);
  if (!parsed) {
    return finding('fail', 4, 3, 'dns_email.dmarc.fail_syntax', {
      fixKey: ID,
    });
  }
  const measured = {
    p: parsed.p,
    pct: parsed.pct,
    rua: parsed.rua.length,
    mail,
  };
  if (!mail && parsed.p !== 'reject') {
    return finding('fail', 4, 3, 'dns_email.dmarc.fail_not_reject', {
      fixKey: ID,
      measured,
    });
  }
  if (mail && parsed.p === 'none') {
    return finding('warn', 2, 3, 'dns_email.dmarc.warn_none', {
      fixKey: ID,
      measured,
    });
  }
  if (mail && parsed.p === 'quarantine') {
    return finding('warn', 2, 3, 'dns_email.dmarc.warn_quarantine', {
      fixKey: ID,
      measured,
    });
  }
  if (parsed.pct < 100) {
    return finding('warn', 2, 3, 'dns_email.dmarc.warn_pct', {
      fixKey: ID,
      params: { pct: parsed.pct },
      measured,
    });
  }
  if (mail && parsed.rua.length === 0) {
    return finding('warn', 2, 2, 'dns_email.dmarc.warn_rua', {
      fixKey: ID,
      measured,
    });
  }
  return finding(
    'pass',
    1,
    1,
    mail ? 'dns_email.dmarc.pass' : 'dns_email.dmarc.pass_reject',
    { measured },
  );
}

export const dmarcCheck: Check = {
  id: ID,
  domain: 'dns_email',
  mode: 'passive',
  needs: ['dns'],
  weight: 3,
  run: (ctx) => runDns(ctx, judgeDmarc),
};
