import type { DomainScoreRow, FindingRow, Json } from '@audigy/db';
import {
  BROWSER_SHARED_KEY,
  type Check,
  type CheckOutcome,
  type DomainScore,
  ENGINE_VERSION,
  type FixSheet,
  type GlobalScore,
  METHOD_VERSION,
  type Need,
  prioritize,
  type RunContext,
  resultValue,
  runChecks,
  scoreDomains,
  scoreGlobal,
} from '@audigy/engine';

/** Raisons « Non testé » propres à l'orchestration (clés i18n `fr`). */
export const ORCHESTRATION_REASONS = {
  runnerPending: 'reason.runner_pending',
  runnerAbsent: 'reason.runner_absent',
  browserSkipped: 'reason.browser_skipped',
} as const;

export type BrowserReason =
  (typeof ORCHESTRATION_REASONS)[keyof typeof ORCHESTRATION_REASONS];

export function needsBrowser(check: Check): boolean {
  return check.needs.includes('browser');
}

export function splitChecks(checks: readonly Check[]): {
  server: Check[];
  browser: Check[];
} {
  return {
    server: checks.filter((c) => !needsBrowser(c)),
    browser: checks.filter(needsBrowser),
  };
}

/** Checks navigateur non exécutés : `untested` avec une raison explicite. */
export function browserPlaceholders(
  checks: readonly Check[],
  reason: BrowserReason,
): CheckOutcome[] {
  return checks.map((check) => ({
    checkId: check.id,
    domain: check.domain,
    mode: check.mode,
    weight: check.weight,
    result: {
      status: 'untested',
      severity: 1,
      impact: 1,
      messageKey: reason,
      reason,
    },
  }));
}

export interface PhaseOptions {
  available: readonly Need[];
  concurrency?: number;
}

export function runServerPhase(
  checks: readonly Check[],
  ctx: RunContext,
  options: PhaseOptions,
): Promise<CheckOutcome[]> {
  return runChecks(checks, ctx, {
    available: options.available.filter((n) => n !== 'browser'),
    ...(options.concurrency ? { concurrency: options.concurrency } : {}),
  });
}

/** Rejoue les checks navigateur avec la sortie du runner dans `ctx.shared`. */
export async function runBrowserPhase(
  checks: readonly Check[],
  ctx: RunContext,
  data: unknown,
  options: PhaseOptions,
): Promise<CheckOutcome[]> {
  await ctx.shared.get(BROWSER_SHARED_KEY, async () => data);
  return runChecks(checks, ctx, {
    available: [...new Set<Need>([...options.available, 'browser'])],
    ...(options.concurrency ? { concurrency: options.concurrency } : {}),
  });
}

export interface AuditSummary {
  methodVersion: string;
  engineVersion: string;
  /** Triés par identifiant : même rapport quel que soit l'ordre d'exécution. */
  outcomes: CheckOutcome[];
  domains: DomainScore[];
  global: GlobalScore;
  priorities: string[];
}

export function assemble(
  outcomes: readonly CheckOutcome[],
  fixes: ReadonlyMap<string, FixSheet> = new Map(),
): AuditSummary {
  const sorted = [...outcomes].sort((a, b) =>
    a.checkId < b.checkId ? -1 : a.checkId > b.checkId ? 1 : 0,
  );
  const domains = scoreDomains(sorted);
  return {
    methodVersion: METHOD_VERSION,
    engineVersion: ENGINE_VERSION,
    outcomes: sorted,
    domains,
    global: scoreGlobal(domains),
    priorities: prioritize(sorted, (key) => fixes.get(key)?.effortMinutes).map(
      (o) => o.checkId,
    ),
  };
}

export function findingRows(
  summary: AuditSummary,
  fixes: ReadonlyMap<string, FixSheet> = new Map(),
): FindingRow[] {
  return summary.outcomes.map(({ checkId, domain, result }) => ({
    domain,
    check_id: checkId,
    status: result.status,
    severity: result.severity,
    impact: result.impact,
    score: resultValue(result),
    measured: (result.measured ?? {}) as Json,
    message_key: result.messageKey,
    params: (result.params ?? {}) as Json,
    fix_key: result.fixKey ?? null,
    effort_minutes:
      result.fixKey === undefined
        ? null
        : (fixes.get(result.fixKey)?.effortMinutes ?? null),
    reason:
      result.reason === undefined
        ? null
        : REASON_RE.test(result.reason)
          ? result.reason
          : 'reason.invalid_result',
  }));
}

/** Même forme que la contrainte `findings_reason`. */
const REASON_RE = /^[a-z0-9_.]{1,120}$/;

export function domainScoreRows(summary: AuditSummary): DomainScoreRow[] {
  return summary.domains.map((d) => ({
    domain: d.domain,
    score: d.score,
    coverage: d.coverage,
    level: d.level,
  }));
}
