import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { CAA_KNOWN, type CaaRecord, parseCaa } from './parse.js';
import { finding, lookup, runDns } from './shared.js';

const ID = 'dns_email.caa';

export async function judgeCaa(
  ctx: CheckContext,
  domain: string,
): Promise<CheckResult> {
  const answer = await lookup(ctx, domain, 'CAA');
  if (answer.status === 3) {
    return finding('warn', 2, 2, 'dns_email.caa.warn_missing', {
      fixKey: ID,
      measured: { present: false },
    });
  }
  const rows = answer.records.filter((record) => record.type === 'CAA');
  if (rows.length === 0) {
    return finding('warn', 2, 2, 'dns_email.caa.warn_missing', {
      fixKey: ID,
      measured: { present: false },
    });
  }
  const parsed: CaaRecord[] = [];
  for (const row of rows) {
    const caa = parseCaa(row.data);
    if (!caa) {
      return finding('fail', 2, 2, 'dns_email.caa.fail_syntax', {
        fixKey: ID,
      });
    }
    parsed.push(caa);
  }
  if (parsed.some((caa) => caa.flags >= 128 && !CAA_KNOWN.has(caa.tag))) {
    return finding('fail', 2, 2, 'dns_email.caa.fail_critical', {
      fixKey: ID,
    });
  }
  const issuers = parsed.filter((caa) => caa.tag === 'issue');
  if (issuers.length === 0) {
    return finding('warn', 2, 2, 'dns_email.caa.warn_missing', {
      fixKey: ID,
      measured: { present: true, issue: false },
    });
  }
  const blocked = issuers.every(
    (caa) => caa.value.trim() === '' || caa.value.trim() === ';',
  );
  if (blocked) {
    return finding('pass', 1, 1, 'dns_email.caa.pass_none', {
      measured: { issuers: 0 },
    });
  }
  return finding('pass', 1, 1, 'dns_email.caa.pass', {
    measured: {
      issuers: issuers
        .map((caa) => caa.value)
        .filter((value) => value !== '' && value !== ';'),
    },
  });
}

export const caaCheck: Check = {
  id: ID,
  domain: 'dns_email',
  mode: 'passive',
  needs: ['dns'],
  weight: 1,
  run: (ctx) => runDns(ctx, judgeCaa),
};
