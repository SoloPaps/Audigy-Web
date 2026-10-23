import type { SafeResponse } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import {
  featureIsOpen,
  parsePermissions,
  SENSITIVE_FEATURES,
} from './parse.js';
import { finding, loadHome } from './shared.js';

const ID = 'securite.permissions';

export function judgePermissions(home: SafeResponse): CheckResult {
  const header = home.headers.get('permissions-policy');
  if (header === null || header.trim() === '') {
    return finding(ID, 'warn', 1, 1, 'securite.permissions.warn_missing', {
      measured: { present: false },
    });
  }
  const policy = parsePermissions(header);
  if (!policy) {
    return finding(ID, 'fail', 2, 2, 'securite.permissions.fail_invalid', {
      measured: { present: true },
    });
  }
  const open = SENSITIVE_FEATURES.filter((name) =>
    featureIsOpen(policy.get(name)),
  );
  if (open.length > 0) {
    return finding(ID, 'fail', 2, 2, 'securite.permissions.fail_open', {
      measured: { open },
    });
  }
  const missing = SENSITIVE_FEATURES.filter((name) => !policy.has(name));
  if (missing.length > 0) {
    return finding(ID, 'warn', 1, 1, 'securite.permissions.warn_missing', {
      measured: { present: true, missing },
    });
  }
  return finding(ID, 'pass', 1, 1, 'securite.permissions.pass', {
    measured: { restricted: [...SENSITIVE_FEATURES] },
  });
}

export const permissionsCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 1,
  async run(ctx) {
    return judgePermissions(await loadHome(ctx));
  },
};
