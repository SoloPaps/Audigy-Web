import {
  type CruxMetrics,
  LIGHTHOUSE_AUDITS,
  type LighthouseAuditId,
  PSI_CATEGORIES,
  type PsiAudit,
  type PsiCategory,
  type PsiStrategyResult,
} from './types.js';

export interface CruxRecord {
  metrics: CruxMetrics;
  period: { first: string; last: string } | null;
}

export function parsePsiStrategy(
  text: string,
  strategy: 'mobile' | 'desktop',
): PsiStrategyResult | null {
  const root = asRecord(parseJson(text));
  const result = asRecord(root?.lighthouseResult);
  if (!result) return null;
  const categories = asRecord(result.categories);
  const audits = asRecord(result.audits);
  const parsed = {} as Record<PsiCategory, number | null>;
  for (const category of PSI_CATEGORIES) {
    parsed[category] = unitScore(asRecord(categories?.[category])?.score);
  }
  const picked = {} as Record<LighthouseAuditId, PsiAudit>;
  for (const id of LIGHTHOUSE_AUDITS) {
    const audit = asRecord(audits?.[id]);
    picked[id] = {
      score: unitScore(audit?.score),
      numericValue: nonNegative(audit?.numericValue),
    };
  }
  const version = result.lighthouseVersion;
  return {
    strategy,
    categories: parsed,
    audits: picked,
    lighthouseVersion: typeof version === 'string' ? version : null,
  };
}

export function parseCruxRecord(text: string): CruxRecord | null {
  const root = asRecord(parseJson(text));
  const record = asRecord(root?.record);
  if (!record) return null;
  const metrics = asRecord(record.metrics);
  const period = asRecord(record.collectionPeriod);
  const first = dateOf(period?.firstDate);
  const last = dateOf(period?.lastDate);
  return {
    metrics: {
      lcpMs: percentile(metrics, 'largest_contentful_paint'),
      inpMs: percentile(metrics, 'interaction_to_next_paint'),
      cls: percentile(metrics, 'cumulative_layout_shift'),
    },
    period: first && last ? { first, last } : null,
  };
}

function percentile(
  metrics: Record<string, unknown> | null,
  name: string,
): number | null {
  const metric = asRecord(metrics?.[name]);
  const percentiles = asRecord(metric?.percentiles);
  return nonNegative(percentiles?.p75);
}

function dateOf(value: unknown): string | null {
  const date = asRecord(value);
  if (!date) return null;
  const year = date.year;
  const month = date.month;
  const day = date.day;
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  )
    return null;
  const y = year as number;
  const m = month as number;
  const d = day as number;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function unitScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return value;
}

function nonNegative(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() !== '') {
    return nonNegative(Number(value));
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    return null;
  return value;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
}
