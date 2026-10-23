export const PSI_CATEGORIES = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
] as const;
export type PsiCategory = (typeof PSI_CATEGORIES)[number];

export const LIGHTHOUSE_AUDITS = [
  'total-byte-weight',
  'uses-long-cache-ttl',
  'uses-text-compression',
] as const;
export type LighthouseAuditId = (typeof LIGHTHOUSE_AUDITS)[number];

export const PSI_SHARED_KEY = 'psi';
export const CRUX_SHARED_KEY = 'crux';

/** Un essai PSI. Le plan impose 120 s, puis un seul réessai. */
export const PSI_ATTEMPT_TIMEOUT_MS = 120_000;
/** Deux stratégies × deux essais, plus une marge. */
export const PERFORMANCE_CHECK_TIMEOUT_MS =
  PSI_ATTEMPT_TIMEOUT_MS * 2 * 2 + 20_000;

export const CRUX_ATTEMPT_TIMEOUT_MS = 20_000;
/** Adresse puis origine, chacune avec un réessai. */
export const CRUX_CHECK_TIMEOUT_MS = CRUX_ATTEMPT_TIMEOUT_MS * 2 * 2 + 10_000;

export const CRUX_FORM_FACTOR = 'PHONE';

export interface PsiAudit {
  score: number | null;
  numericValue: number | null;
}

export interface PsiStrategyResult {
  strategy: 'mobile' | 'desktop';
  categories: Record<PsiCategory, number | null>;
  audits: Record<LighthouseAuditId, PsiAudit>;
  lighthouseVersion: string | null;
}

export interface PsiOk {
  ok: true;
  mobile: PsiStrategyResult | null;
  desktop: PsiStrategyResult | null;
  fetchedOn: string;
}

export interface SourceFailure {
  ok: false;
  reason: 'missing_key' | 'quota' | 'error';
  status?: number;
}

export type PsiBundle = PsiOk | SourceFailure;

export interface CruxMetrics {
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
}

export interface CruxOk {
  ok: true;
  scope: 'url' | 'origin';
  formFactor: typeof CRUX_FORM_FACTOR;
  metrics: CruxMetrics;
  period: { first: string; last: string } | null;
  fetchedOn: string;
}

export interface CruxFailure {
  ok: false;
  reason: 'missing_key' | 'quota' | 'no_data' | 'error';
  status?: number;
}

export type CruxBundle = CruxOk | CruxFailure;
