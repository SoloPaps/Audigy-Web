import type { SafeResponse } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import {
  allowsHttp,
  classifyObject,
  classifyScript,
  fallback,
  parseCsp,
  styleIsLoose,
} from './parse.js';
import { finding, loadHome } from './shared.js';

const ID = 'securite.csp';

export function judgeCsp(home: SafeResponse): CheckResult {
  const header = home.headers.get('content-security-policy');
  if (header === null || header.trim() === '') {
    return finding(ID, 'fail', 3, 3, 'securite.csp.fail_missing', {
      measured: { present: false },
    });
  }
  const policy = parseCsp(header);
  if (!policy) {
    return finding(ID, 'fail', 3, 3, 'securite.csp.fail_invalid', {
      measured: { present: true },
    });
  }
  const element = classifyScript(
    fallback(policy, ['script-src-elem', 'script-src', 'default-src']),
  );
  const attr = policy.has('script-src-attr')
    ? classifyScript(policy.get('script-src-attr') ?? [])
    : classifyScript(fallback(policy, ['script-src', 'default-src']));
  const object = classifyObject(
    fallback(policy, ['object-src', 'default-src']),
  );
  const looseStyle = styleIsLoose(
    fallback(policy, ['style-src', 'default-src']),
  );
  const passive =
    allowsHttp(fallback(policy, ['img-src', 'default-src'])) ||
    allowsHttp(fallback(policy, ['media-src', 'default-src']));
  const measured = {
    directives: [...policy.keys()],
    styleLoose: looseStyle,
    passiveHttp: passive,
  };
  const scriptBad = element === 'bad' || attr === 'bad';
  if (scriptBad || object === 'bad') {
    return finding(ID, 'fail', 3, 3, 'securite.csp.fail_unsafe', { measured });
  }
  if (element === 'eval' || attr === 'eval' || passive) {
    return finding(ID, 'warn', 2, 2, 'securite.csp.warn_loose', { measured });
  }
  return finding(ID, 'pass', 1, 1, 'securite.csp.pass', { measured });
}

export const cspCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 3,
  async run(ctx) {
    return judgeCsp(await loadHome(ctx));
  },
};
