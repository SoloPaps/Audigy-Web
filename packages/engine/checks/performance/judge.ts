import type { CheckResult, Status } from '../../src/types.js';
import type {
  CruxBundle,
  CruxOk,
  LighthouseAuditId,
  PsiBundle,
  PsiOk,
} from './types.js';

export function percent(score: number): number {
  return Math.round(score * 100);
}

export function statusFromPercent(value: number): 'pass' | 'warn' | 'fail' {
  if (value >= 80) return 'pass';
  if (value >= 50) return 'warn';
  return 'fail';
}

export function gradeLcp(ms: number): 'pass' | 'warn' | 'fail' {
  if (ms <= 2500) return 'pass';
  if (ms <= 4000) return 'warn';
  return 'fail';
}

export function gradeInp(ms: number): 'pass' | 'warn' | 'fail' {
  if (ms <= 200) return 'pass';
  if (ms <= 500) return 'warn';
  return 'fail';
}

export function gradeCls(value: number): 'pass' | 'warn' | 'fail' {
  if (value <= 0.1) return 'pass';
  if (value <= 0.25) return 'warn';
  return 'fail';
}

export function formatSeconds(ms: number): string {
  return (ms / 1000).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatCls(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatWeight(bytes: number): string {
  const ko = bytes / 1024;
  if (ko < 1024) return `${Math.round(ko)} ko`;
  const mo = ko / 1024;
  const digits = mo >= 10 ? 0 : 1;
  return `${mo.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} Mo`;
}

export function judgeLighthouse(bundle: PsiBundle): CheckResult {
  const stopped = blocked('performance.lighthouse', bundle);
  if (stopped) return stopped;
  if (!bundle.ok) return errorResult('performance.lighthouse');
  const mobile = bundle.mobile?.categories.performance ?? null;
  const desktop = bundle.desktop?.categories.performance ?? null;
  if (mobile === null && desktop === null) {
    return errorResult('performance.lighthouse');
  }
  const partial = mobile === null || desktop === null;
  const raw = Math.min(
    ...[mobile, desktop].filter((value): value is number => value !== null),
  );
  const points = percent(raw);
  const base = statusFromPercent(points);
  const status: Status = partial && base === 'pass' ? 'warn' : base;
  const measured: Record<string, unknown> = { score: points / 100 };
  if (mobile !== null) measured.mobile = percent(mobile) / 100;
  if (desktop !== null) measured.desktop = percent(desktop) / 100;
  const version =
    bundle.mobile?.lighthouseVersion ?? bundle.desktop?.lighthouseVersion;
  if (version) measured.lighthouseVersion = version;
  return finding(
    'performance.lighthouse',
    status,
    status === 'fail' ? 3 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 3,
    partial
      ? 'performance.lighthouse.partial'
      : `performance.lighthouse.${status}`,
    {
      score: points / 100,
      params: partial
        ? { score: points }
        : {
            mobile: percent(mobile as number),
            desktop: percent(desktop as number),
          },
      measured,
    },
  );
}

export function judgeLcp(bundle: CruxBundle): CheckResult {
  return judgeField(bundle, 'performance.lcp', 'lcpMs', gradeLcp, (value) => ({
    secondes: formatSeconds(value),
  }));
}

export function judgeInp(bundle: CruxBundle): CheckResult {
  return judgeField(bundle, 'performance.inp', 'inpMs', gradeInp, (value) => ({
    millisecondes: Math.round(value),
  }));
}

export function judgeCls(bundle: CruxBundle): CheckResult {
  return judgeField(bundle, 'performance.cls', 'cls', gradeCls, (value) => ({
    valeur: formatCls(value),
  }));
}

export function judgeWeight(bundle: PsiBundle): CheckResult {
  return judgeAudit(bundle, 'performance.poids', 'total-byte-weight', true);
}

export function judgeCache(bundle: PsiBundle): CheckResult {
  return judgeAudit(bundle, 'performance.cache', 'uses-long-cache-ttl', false);
}

export function judgeCompression(bundle: PsiBundle): CheckResult {
  return judgeAudit(
    bundle,
    'performance.compression',
    'uses-text-compression',
    false,
  );
}

function judgeField(
  bundle: CruxBundle,
  id: string,
  metric: keyof CruxOk['metrics'],
  grade: (value: number) => 'pass' | 'warn' | 'fail',
  params: (value: number) => Record<string, string | number>,
): CheckResult {
  const stopped = blocked(id, bundle);
  if (stopped) return stopped;
  if (!bundle.ok) return errorResult(id);
  const value = bundle.metrics[metric];
  const measured = fieldMeasured(bundle);
  if (value === null) {
    return finding(id, 'untested', 1, 1, 'performance.field.metric_absent', {
      measured,
    });
  }
  const status = grade(value);
  measured[metric] = value;
  return finding(
    id,
    status,
    status === 'fail' ? 3 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 3,
    `${id}.${status}`,
    {
      score: status === 'pass' ? 1 : status === 'warn' ? 0.5 : 0,
      params: params(value),
      measured,
    },
  );
}

function judgeAudit(
  bundle: PsiBundle,
  id: string,
  auditId: LighthouseAuditId,
  withWeight: boolean,
): CheckResult {
  const stopped = blocked(id, bundle);
  if (stopped) return stopped;
  if (!bundle.ok) return errorResult(id);
  if (!bundle.mobile && !bundle.desktop) return errorResult(id);
  const mobile = bundle.mobile?.audits[auditId]?.score ?? null;
  const desktop = bundle.desktop?.audits[auditId]?.score ?? null;
  if (mobile === null && desktop === null) {
    return finding(id, 'na', 1, 1, 'performance.audit.na');
  }
  const raw = Math.min(
    ...[mobile, desktop].filter((value): value is number => value !== null),
  );
  const points = percent(raw);
  const status = statusFromPercent(points);
  const bytes = bytesOf(bundle, auditId, mobile, desktop);
  const measured: Record<string, unknown> = { score: points / 100 };
  if (mobile !== null) measured.mobile = percent(mobile) / 100;
  if (desktop !== null) measured.desktop = percent(desktop) / 100;
  if (bytes !== null) measured.bytes = bytes;
  const poids = bytes === null ? null : formatWeight(bytes);
  const key =
    withWeight && poids === null
      ? `${id}.${status}_sans_valeur`
      : `${id}.${status}`;
  return finding(
    id,
    status,
    status === 'fail' ? 2 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 2,
    key,
    {
      score: points / 100,
      ...(poids !== null && withWeight ? { params: { poids } } : {}),
      measured,
    },
  );
}

function bytesOf(
  bundle: PsiOk,
  auditId: LighthouseAuditId,
  mobile: number | null,
  desktop: number | null,
): number | null {
  const mobileBytes = bundle.mobile?.audits[auditId]?.numericValue ?? null;
  const desktopBytes = bundle.desktop?.audits[auditId]?.numericValue ?? null;
  if (mobile !== null && (desktop === null || mobile <= desktop)) {
    return mobileBytes ?? desktopBytes;
  }
  return desktopBytes ?? mobileBytes;
}

function fieldMeasured(bundle: CruxOk): Record<string, unknown> {
  const measured: Record<string, unknown> = {
    scope: bundle.scope,
    formFactor: bundle.formFactor,
  };
  if (bundle.period) {
    measured.periodStart = bundle.period.first;
    measured.periodEnd = bundle.period.last;
  }
  return measured;
}

function blocked(
  id: string,
  bundle: PsiBundle | CruxBundle,
): CheckResult | undefined {
  if (bundle.ok) return undefined;
  if (bundle.reason === 'missing_key') {
    return finding(id, 'untested', 1, 1, 'performance.missing_key');
  }
  if (bundle.reason === 'quota') {
    return finding(id, 'untested', 1, 1, 'performance.quota', {
      measured: { httpStatus: bundle.status ?? 429 },
    });
  }
  if (bundle.reason === 'no_data') {
    return finding(id, 'na', 1, 1, 'performance.field.absent');
  }
  return finding(
    id,
    'untested',
    1,
    1,
    'performance.error',
    bundle.status !== undefined
      ? { measured: { httpStatus: bundle.status } }
      : {},
  );
}

function errorResult(id: string): CheckResult {
  return finding(id, 'untested', 1, 1, 'performance.error');
}

function finding(
  id: string,
  status: Status,
  severity: 1 | 2 | 3 | 4,
  impact: 1 | 2 | 3,
  messageKey: string,
  extra: {
    score?: number;
    params?: Record<string, string | number>;
    measured?: Record<string, unknown>;
  } = {},
): CheckResult {
  const result: CheckResult = { status, severity, impact, messageKey };
  if (extra.score !== undefined) result.score = extra.score;
  if (extra.params) result.params = extra.params;
  if (extra.measured) result.measured = extra.measured;
  if (status === 'warn' || status === 'fail') result.fixKey = id;
  if (status === 'untested' || status === 'na') result.reason = messageKey;
  return result;
}
