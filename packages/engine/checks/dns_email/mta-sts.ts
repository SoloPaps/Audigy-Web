import { isNetError } from '@audigy/net';
import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { parseMtaStsId, parseMtaStsPolicy } from './parse.js';
import {
  finding,
  intendsMail,
  lookup,
  readMx,
  runDns,
  txtOf,
} from './shared.js';

const ID = 'dns_email.mta_sts';

function isSts(data: string): boolean {
  return /^v=STSv1(\s|;|$)/i.test(data.trim());
}

export async function judgeMtaSts(
  ctx: CheckContext,
  domain: string,
): Promise<CheckResult> {
  const mx = await readMx(ctx, domain);
  if (!intendsMail(mx)) {
    return finding('na', 1, 1, 'dns_email.mta_sts.na_nomail', {
      measured: { mail: mx.mode },
    });
  }
  const records = txtOf(await lookup(ctx, `_mta-sts.${domain}`, 'TXT')).filter(
    isSts,
  );
  if (records.length === 0) {
    return finding('warn', 2, 2, 'dns_email.mta_sts.warn_missing', {
      fixKey: ID,
      measured: { present: false },
    });
  }
  if (records.length > 1) {
    return finding('fail', 3, 2, 'dns_email.mta_sts.fail_syntax', {
      fixKey: ID,
      measured: { count: records.length },
    });
  }
  const id = records[0] === undefined ? null : parseMtaStsId(records[0]);
  if (id === null) {
    return finding('fail', 3, 2, 'dns_email.mta_sts.fail_syntax', {
      fixKey: ID,
    });
  }
  let status: number;
  let body: string;
  try {
    const res = await ctx.net.fetch(
      `https://mta-sts.${domain}/.well-known/mta-sts.txt`,
      { accept: 'text/plain', signal: ctx.signal },
    );
    status = res.status;
    body = res.text();
  } catch (error) {
    if (isNetError(error)) {
      return finding('untested', 1, 1, 'dns_email.mta_sts.untested', {
        measured: { id },
      });
    }
    throw error;
  }
  if (status === 404 || status === 410) {
    return finding('fail', 3, 2, 'dns_email.mta_sts.fail_policy', {
      fixKey: ID,
      measured: { id, status },
    });
  }
  if (status !== 200) {
    return finding('untested', 1, 1, 'dns_email.mta_sts.untested', {
      measured: { id, status },
    });
  }
  const policy = parseMtaStsPolicy(body);
  if (!policy) {
    return finding('fail', 3, 2, 'dns_email.mta_sts.fail_syntax', {
      fixKey: ID,
      measured: { id },
    });
  }
  const measured = { id, mode: policy.mode, maxAge: policy.maxAge };
  if (policy.mode === 'testing') {
    return finding('warn', 2, 2, 'dns_email.mta_sts.warn_testing', {
      fixKey: ID,
      measured,
    });
  }
  if (policy.mode === 'none') {
    return finding('warn', 2, 2, 'dns_email.mta_sts.warn_none', {
      fixKey: ID,
      measured,
    });
  }
  return finding('pass', 1, 1, 'dns_email.mta_sts.pass', { measured });
}

export const mtaStsCheck: Check = {
  id: ID,
  domain: 'dns_email',
  mode: 'passive',
  needs: ['dns', 'http'],
  weight: 2,
  run: (ctx) => runDns(ctx, judgeMtaSts),
};
