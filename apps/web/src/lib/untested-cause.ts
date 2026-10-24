import { t } from '../i18n/index.js';
import type { ApiFinding } from './audit-api.js';
import type { CauseLine, UntestedCauses } from './categories.js';
import { asParams, translate } from './translate.js';

/** Seuil déjà fixé : sous 50 %, le domaine n’a pas de note. */
const COVERAGE_MIN = 0.5;

const STORED_REASON = new Set([
  'reason.timeout',
  'reason.error',
  'reason.invalid_result',
  'reason.active_unverified',
]);

export interface CauseHit {
  text: string;
  searchConsole: boolean;
}

type FindingCause = Pick<
  ApiFinding,
  'status' | 'reason' | 'messageKey' | 'params'
>;

function sourceOf(params: Record<string, string | number> | null): string {
  const value = params?.source;
  return typeof value === 'string' ? value : '';
}

function blocked(text: string): boolean {
  return /clé|quota|secret/iu.test(text);
}

/** Phrase française d’une cause déjà connue. `null` si la donnée ne la porte pas. */
export function causeOfFinding(row: {
  reason: string | null;
  messageKey?: string | null;
  params: unknown;
}): CauseHit | null {
  const params = asParams(row.params);
  const reason = row.reason;
  const message = row.messageKey ?? null;
  const source = sourceOf(params);

  if (
    reason === 'reason.runner_absent' ||
    reason === 'reason.browser_skipped' ||
    (reason === 'reason.missing_source' && source === 'browser')
  ) {
    return { text: t('domain.cause.browser'), searchConsole: false };
  }
  if (reason === 'reason.runner_pending') {
    return { text: t('domain.cause.pending'), searchConsole: false };
  }
  if (reason === 'reason.missing_source') {
    if (source === 'psi') {
      return { text: t('domain.cause.psi'), searchConsole: false };
    }
    if (source === 'crux') {
      return { text: t('domain.cause.crux'), searchConsole: false };
    }
    if (source === 'gsc') {
      return { text: t('domain.cause.gsc'), searchConsole: true };
    }
    if (source === 'dns') {
      return { text: t('domain.cause.dns'), searchConsole: false };
    }
    return { text: t('domain.cause.external'), searchConsole: false };
  }
  if (
    reason === 'seo.gsc.untested_connect' ||
    message === 'seo.gsc.untested_connect'
  ) {
    return { text: t('domain.cause.gsc'), searchConsole: true };
  }
  if (
    reason === 'seo.gsc.untested_auth' ||
    message === 'seo.gsc.untested_auth'
  ) {
    const text = translate('seo.gsc.untested_auth');
    if (!text || blocked(text)) return null;
    return { text, searchConsole: true };
  }
  if (reason && STORED_REASON.has(reason)) {
    const text = translate(reason, params);
    if (!text || blocked(text)) return null;
    return { text, searchConsole: false };
  }
  return null;
}

export function explainUntested(input: {
  coverage: number | null;
  findings: readonly FindingCause[];
}): { coverageNote: string | null; causes: UntestedCauses } {
  const coverageNote =
    typeof input.coverage === 'number' &&
    Number.isFinite(input.coverage) &&
    input.coverage < COVERAGE_MIN
      ? t('domain.cause.coverage')
      : null;

  const buckets = new Map<string, { count: number; searchConsole: boolean }>();
  const order: string[] = [];
  for (const row of input.findings) {
    if (row.status !== 'untested') continue;
    const hit = causeOfFinding(row);
    if (!hit) continue;
    const prev = buckets.get(hit.text);
    if (!prev) {
      order.push(hit.text);
      buckets.set(hit.text, { count: 1, searchConsole: hit.searchConsole });
      continue;
    }
    prev.count += 1;
    if (hit.searchConsole) prev.searchConsole = true;
  }
  const ranked = [...order].sort(
    (a, b) => (buckets.get(b)?.count ?? 0) - (buckets.get(a)?.count ?? 0),
  );
  const toLine = (text: string): CauseLine => ({
    text,
    searchConsole: buckets.get(text)?.searchConsole === true,
  });
  return {
    coverageNote,
    causes: {
      primary: ranked[0] ? toLine(ranked[0]) : null,
      others: ranked.slice(1).map(toLine),
      closing: t('domain.cause.closing'),
    },
  };
}

/** Score public : la phrase de couverture seulement, jamais une cause interne. */
export function publicCoverageNote(
  coverage: number | null | undefined,
): string | null {
  if (typeof coverage !== 'number' || !Number.isFinite(coverage)) return null;
  if (coverage >= COVERAGE_MIN) return null;
  return t('domain.cause.coverage');
}
