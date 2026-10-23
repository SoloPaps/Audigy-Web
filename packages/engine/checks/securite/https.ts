import { isNetError, type SafeResponse } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import { finding, loadHome, sameHost } from './shared.js';

const ID = 'securite.https';

export type RedirectVerdict =
  | 'direct'
  | 'off-host'
  | 'delayed'
  | 'missing'
  | 'stay';

/** Chaîne observée après suivi des redirections (comme un visiteur). */
export function classifyRedirect(
  requested: URL,
  res: SafeResponse,
): RedirectVerdict {
  const final = new URL(res.url);
  if (final.protocol !== 'https:') return 'missing';
  const hops = [...res.redirects.map((item) => new URL(item)), final];
  const first = hops[1];
  if (!first) {
    return requested.protocol === 'https:' && sameHost(requested, final)
      ? 'stay'
      : 'missing';
  }
  if (first.protocol !== 'https:') return 'delayed';
  if (!sameHost(requested, first)) return 'off-host';
  return 'direct';
}

function fromRedirect(
  verdict: RedirectVerdict,
  res: SafeResponse,
): CheckResult {
  const measured = {
    finalUrl: res.url,
    redirects: res.redirects.length,
    verdict,
  };
  if (verdict === 'direct' || verdict === 'stay') {
    return finding(ID, 'pass', 1, 1, 'securite.https.pass_redirect', {
      measured,
    });
  }
  if (verdict === 'off-host') {
    return finding(ID, 'warn', 2, 2, 'securite.https.warn_off_host', {
      measured,
    });
  }
  if (verdict === 'delayed') {
    return finding(ID, 'warn', 2, 2, 'securite.https.warn_delayed', {
      measured,
    });
  }
  return finding(ID, 'fail', 4, 3, 'securite.https.fail', { measured });
}

export const httpsCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 3,
  async run(ctx) {
    const target = ctx.target.url;
    const home = await loadHome(ctx);
    const homeHttps = new URL(home.url).protocol === 'https:';
    if (target.protocol === 'http:' || !homeHttps) {
      return fromRedirect(classifyRedirect(target, home), home);
    }

    const httpUrl = new URL(target.href);
    httpUrl.protocol = 'http:';
    httpUrl.port = '';
    try {
      const httpRes = await ctx.net.fetch(httpUrl, { signal: ctx.signal });
      return fromRedirect(classifyRedirect(httpUrl, httpRes), httpRes);
    } catch (error) {
      if (!isNetError(error)) throw error;
      if (
        error.code === 'NETWORK' ||
        error.code === 'TIMEOUT' ||
        error.code === 'TLS_HANDSHAKE_FAILED'
      ) {
        return finding(ID, 'pass', 1, 1, 'securite.https.pass_no_http', {
          measured: { http: 'unreachable', errorCode: error.code },
        });
      }
      if (error.code === 'TOO_MANY_REDIRECTS') {
        return finding(ID, 'fail', 4, 3, 'securite.https.fail', {
          measured: { errorCode: error.code },
        });
      }
      throw error;
    }
  },
};
