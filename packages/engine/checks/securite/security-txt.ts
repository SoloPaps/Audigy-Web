import type { SafeResponse } from '@audigy/net';
import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { securityFields } from './parse.js';
import {
  daysBetween,
  finding,
  SECURITY_TXT_SOON_DAYS,
  sameResource,
} from './shared.js';

const ID = 'securite.security_txt';

function httpsUrl(target: URL, path: string): URL {
  const origin = new URL(target.origin);
  origin.protocol = 'https:';
  origin.port = '';
  return new URL(path, origin);
}

async function fetchFile(
  ctx: CheckContext,
  url: URL,
): Promise<SafeResponse | 'missing'> {
  const res = await ctx.net.fetch(url, { signal: ctx.signal });
  if (res.status === 404 || res.status === 410) return 'missing';
  return res;
}

function judgeBody(res: SafeResponse, legacy: boolean, now: Date): CheckResult {
  if (res.status !== 200) {
    return finding(
      ID,
      'untested',
      1,
      1,
      'securite.security_txt.untested_status',
      {
        params: { status: res.status },
        measured: { status: res.status, url: res.url },
      },
    );
  }
  const final = new URL(res.url);
  const fields = securityFields(res.text());
  const expired =
    fields.expires !== null && fields.expires.getTime() <= now.getTime();
  const measured = {
    url: res.url,
    legacy,
    contacts: fields.contacts.length,
    expires: fields.expires?.toISOString() ?? null,
  };
  if (
    final.protocol !== 'https:' ||
    fields.contacts.length === 0 ||
    expired ||
    !fields.expires
  ) {
    return finding(ID, 'fail', 2, 1, 'securite.security_txt.fail_invalid', {
      measured,
    });
  }
  const left = daysBetween(now, fields.expires);
  if (left === 0) {
    return finding(ID, 'warn', 1, 1, 'securite.security_txt.warn_today', {
      measured,
    });
  }
  if (left < SECURITY_TXT_SOON_DAYS) {
    return finding(ID, 'warn', 1, 1, 'securite.security_txt.warn_soon', {
      measured,
      params: { jours: left },
    });
  }
  if (legacy || !final.pathname.endsWith('/.well-known/security.txt')) {
    return finding(ID, 'warn', 1, 1, 'securite.security_txt.warn_legacy', {
      measured,
    });
  }
  const type = res.headers.get('content-type');
  if (type === null || !/^text\/plain\b/i.test(type.trim())) {
    return finding(ID, 'warn', 1, 1, 'securite.security_txt.warn_type', {
      measured,
    });
  }
  const canonical = fields.canonical[0];
  if (canonical) {
    try {
      if (!sameResource(new URL(canonical), final)) {
        return finding(
          ID,
          'warn',
          1,
          1,
          'securite.security_txt.warn_canonical',
          {
            measured,
          },
        );
      }
    } catch {
      return finding(ID, 'warn', 1, 1, 'securite.security_txt.warn_canonical', {
        measured,
      });
    }
  }
  return finding(ID, 'pass', 1, 1, 'securite.security_txt.pass', { measured });
}

export const securityTxtCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 1,
  async run(ctx) {
    const primary = httpsUrl(ctx.target.url, '/.well-known/security.txt');
    const first = await fetchFile(ctx, primary);
    if (first !== 'missing') return judgeBody(first, false, ctx.now());

    const legacy = httpsUrl(ctx.target.url, '/security.txt');
    const second = await fetchFile(ctx, legacy);
    if (second === 'missing') {
      return finding(ID, 'fail', 2, 1, 'securite.security_txt.fail_missing', {
        measured: { https: true },
      });
    }
    return judgeBody(second, true, ctx.now());
  },
};
