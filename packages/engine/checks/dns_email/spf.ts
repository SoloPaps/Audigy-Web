import type { DnsAnswer } from '@audigy/net';
import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { isSpf } from './parse.js';
import {
  finding,
  intendsMail,
  lookup,
  readMx,
  runDns,
  txtOf,
} from './shared.js';
import { assessSpf, type SpfDns } from './spf-eval.js';

const ID = 'dns_email.spf';

function adapter(ctx: CheckContext): SpfDns {
  return {
    async txt(name) {
      return txtOf(await lookup(ctx, name, 'TXT'));
    },
    async mx(name) {
      const view = await readMx(ctx, name);
      if (view.mode === 'broken') return 'bad';
      if (view.mode === 'absent') return 'none';
      if (view.mode === 'null') return [];
      return view.hosts;
    },
    async hasAddress(name) {
      const [a, aaaa] = await Promise.all([
        lookup(ctx, name, 'A'),
        lookup(ctx, name, 'AAAA'),
      ]);
      const present = (answer: DnsAnswer, type: 'A' | 'AAAA') =>
        answer.status === 0 &&
        answer.records.some((record) => record.type === type);
      return present(a, 'A') || present(aaaa, 'AAAA');
    },
  };
}

export async function judgeSpf(
  ctx: CheckContext,
  domain: string,
): Promise<CheckResult> {
  const mail = intendsMail(await readMx(ctx, domain));
  const records = txtOf(await lookup(ctx, domain, 'TXT')).filter(isSpf);
  if (records.length === 0) {
    return finding(
      'fail',
      4,
      3,
      mail ? 'dns_email.spf.fail_missing' : 'dns_email.spf.fail_open',
      { fixKey: ID, measured: { mail } },
    );
  }
  if (records.length > 1) {
    return finding('fail', 4, 3, 'dns_email.spf.fail_multiple', {
      fixKey: ID,
      measured: { count: records.length },
    });
  }
  const record = records[0];
  if (record === undefined) {
    return finding('fail', 4, 3, 'dns_email.spf.fail_syntax', { fixKey: ID });
  }
  const assessed = await assessSpf(domain, record, adapter(ctx));
  const measured = { lookups: assessed.lookups, mail };
  if (!assessed.ok) {
    if (assessed.error === 'lookups') {
      return finding('fail', 4, 3, 'dns_email.spf.fail_lookups', {
        fixKey: ID,
        params: { lookups: assessed.lookups },
        measured,
      });
    }
    const key =
      assessed.error === 'void'
        ? 'dns_email.spf.fail_void'
        : assessed.error === 'loop'
          ? 'dns_email.spf.fail_loop'
          : assessed.error === 'multiple'
            ? 'dns_email.spf.fail_multiple'
            : 'dns_email.spf.fail_syntax';
    return finding('fail', 4, 3, key, { fixKey: ID, measured });
  }
  const all = assessed.all ?? 'neutral';
  const detail = { ...measured, all, sending: assessed.sending };
  if (assessed.all === '+') {
    return finding('fail', 4, 3, 'dns_email.spf.fail_plus', {
      fixKey: ID,
      measured: detail,
    });
  }
  if (!mail && (assessed.all === null || assessed.all === '?')) {
    return finding('fail', 4, 3, 'dns_email.spf.fail_open', {
      fixKey: ID,
      measured: detail,
    });
  }
  if (assessed.ptr) {
    return finding('warn', 2, 2, 'dns_email.spf.warn_ptr', {
      fixKey: ID,
      measured: detail,
    });
  }
  if (assessed.macro) {
    return finding('warn', 2, 2, 'dns_email.spf.warn_macro', {
      fixKey: ID,
      measured: detail,
    });
  }
  if (assessed.all === '~') {
    return finding('warn', 2, 2, 'dns_email.spf.warn_soft', {
      fixKey: ID,
      measured: detail,
    });
  }
  if (assessed.all === null || assessed.all === '?') {
    return finding('warn', 2, 2, 'dns_email.spf.warn_neutral', {
      fixKey: ID,
      measured: detail,
    });
  }
  return finding(
    'pass',
    1,
    1,
    assessed.sending ? 'dns_email.spf.pass' : 'dns_email.spf.pass_refuse',
    { measured: detail },
  );
}

export const spfCheck: Check = {
  id: ID,
  domain: 'dns_email',
  mode: 'passive',
  needs: ['dns'],
  weight: 3,
  run: (ctx) => runDns(ctx, judgeSpf),
};
