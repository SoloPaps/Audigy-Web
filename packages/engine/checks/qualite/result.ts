import type { CheckResult, Status } from '../../src/types.js';

export function finding(
  id: string,
  status: Status,
  severity: 1 | 2 | 3 | 4,
  impact: 1 | 2 | 3,
  messageKey: string,
  extra: {
    params?: Record<string, string | number>;
    measured?: Record<string, unknown>;
  } = {},
): CheckResult {
  const result: CheckResult = { status, severity, impact, messageKey };
  if (extra.params) result.params = extra.params;
  if (extra.measured) result.measured = extra.measured;
  if (status === 'warn' || status === 'fail') result.fixKey = id;
  if (status === 'untested' || status === 'na') result.reason = messageKey;
  return result;
}
