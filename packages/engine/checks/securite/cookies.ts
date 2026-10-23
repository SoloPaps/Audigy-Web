import type { SafeResponse } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import {
  hstsCovers,
  isAntiCsrf,
  type ParsedCookie,
  parseCookie,
  prefixViolated,
} from './parse.js';
import { cookieLines, finding, loadHome } from './shared.js';

const ID = 'securite.cookies';

type Issue =
  | 'fail_session_secure'
  | 'fail_session_httponly'
  | 'fail_secure'
  | 'fail_samesite'
  | 'fail_prefix'
  | 'warn_hsts'
  | 'pass';

const RANK: readonly Issue[] = [
  'fail_session_secure',
  'fail_session_httponly',
  'fail_secure',
  'fail_samesite',
  'fail_prefix',
  'warn_hsts',
  'pass',
];

function issuesOf(
  cookie: ParsedCookie,
  https: boolean,
  longHsts: boolean,
): Issue[] {
  const found: Issue[] = [];
  if (!https || !cookie.secure) {
    const covered = https && longHsts;
    if (cookie.session)
      found.push(covered ? 'warn_hsts' : 'fail_session_secure');
    else found.push(covered ? 'warn_hsts' : 'fail_secure');
  }
  if (cookie.session && !cookie.httpOnly) found.push('fail_session_httponly');
  if (
    cookie.sameSite === 'invalid' ||
    (cookie.sameSite === 'none' && !cookie.secure) ||
    (isAntiCsrf(cookie.name) && cookie.sameSite === null)
  ) {
    found.push('fail_samesite');
  }
  if (prefixViolated(cookie)) found.push('fail_prefix');
  if (found.length === 0) found.push('pass');
  return found;
}

function worst(issues: readonly Issue[]): Issue {
  for (const issue of RANK) if (issues.includes(issue)) return issue;
  return 'pass';
}

export function judgeCookies(home: SafeResponse): CheckResult {
  const cookies = cookieLines(home.headers)
    .map(parseCookie)
    .filter((cookie): cookie is ParsedCookie => cookie !== null);
  if (cookies.length === 0) {
    return finding(ID, 'pass', 1, 1, 'securite.cookies.pass_none', {
      measured: { count: 0 },
    });
  }
  const https = new URL(home.url).protocol === 'https:';
  const longHsts =
    https && hstsCovers(home.headers.get('strict-transport-security'));
  const issue = worst(
    cookies.flatMap((cookie) => issuesOf(cookie, https, longHsts)),
  );
  const measured = {
    count: cookies.length,
    issue,
    https,
    hsts: longHsts,
  };
  if (issue === 'pass') {
    return finding(ID, 'pass', 1, 1, 'securite.cookies.pass', { measured });
  }
  if (issue === 'warn_hsts') {
    return finding(ID, 'warn', 2, 2, 'securite.cookies.warn_hsts', {
      measured,
    });
  }
  const severity = issue === 'fail_session_secure' ? 4 : 3;
  return finding(ID, 'fail', severity, 3, `securite.cookies.${issue}`, {
    measured,
  });
}

export const cookiesCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 3,
  async run(ctx) {
    return judgeCookies(await loadHome(ctx));
  },
};
