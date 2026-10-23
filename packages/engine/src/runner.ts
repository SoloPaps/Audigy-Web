import { isNetError } from '@audigy/net';
import {
  type Check,
  type CheckOutcome,
  type CheckResult,
  type Need,
  type RunContext,
  STATUSES,
} from './types.js';

/** Clés i18n (`fr`) des raisons « Non testé » posées par le runner. */
export const REASONS = {
  activeUnverified: 'reason.active_unverified',
  missingSource: 'reason.missing_source',
  timeout: 'reason.timeout',
  error: 'reason.error',
  invalidResult: 'reason.invalid_result',
} as const;

export const DEFAULT_CONCURRENCY = 4;
export const DEFAULT_CHECK_TIMEOUT_MS = 30_000;
/** Sources toujours présentes : elles passent par `ctx.net`. */
export const DEFAULT_AVAILABLE: readonly Need[] = ['http', 'dns', 'tls'];

export interface RunOptions {
  concurrency?: number;
  timeoutMs?: number;
  /** Sources disponibles pour cet audit (clé PSI, runner navigateur…). */
  available?: readonly Need[];
}

function untested(
  reason: string,
  extra: Pick<CheckResult, 'params' | 'measured'> = {},
): CheckResult {
  return {
    status: 'untested',
    severity: 1,
    impact: 1,
    messageKey: reason,
    reason,
    ...extra,
  };
}

function inRange(value: unknown, values: readonly number[]): boolean {
  return typeof value === 'number' && values.includes(value);
}

function isValidResult(value: unknown): value is CheckResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  if (!STATUSES.includes(r.status as CheckResult['status'])) return false;
  if (typeof r.messageKey !== 'string' || r.messageKey === '') return false;
  if (!inRange(r.severity, [1, 2, 3, 4]) || !inRange(r.impact, [1, 2, 3]))
    return false;
  if (
    r.score !== undefined &&
    !(
      typeof r.score === 'number' &&
      Number.isFinite(r.score) &&
      r.score >= 0 &&
      r.score <= 1
    )
  )
    return false;
  if (
    (r.status === 'untested' || r.status === 'na') &&
    (typeof r.reason !== 'string' || r.reason === '')
  )
    return false;
  return true;
}

const TIMED_OUT = Symbol('timeout');

async function runOne(
  check: Check,
  ctx: RunContext,
  available: ReadonlySet<Need>,
  defaultTimeoutMs: number,
): Promise<CheckResult> {
  if (check.mode === 'active' && ctx.verified !== true)
    return untested(REASONS.activeUnverified);

  const missing = check.needs.find((need) => !available.has(need));
  if (missing !== undefined)
    return untested(REASONS.missingSource, { params: { source: missing } });

  const timeoutMs = check.timeoutMs ?? defaultTimeoutMs;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
  });

  try {
    const outcome = await Promise.race([
      Promise.resolve().then(() =>
        check.run(Object.freeze({ ...ctx, signal: controller.signal })),
      ),
      deadline,
    ]);
    if (outcome === TIMED_OUT) {
      controller.abort();
      return untested(REASONS.timeout, {
        params: { seconds: Math.ceil(timeoutMs / 1000) },
      });
    }
    return isValidResult(outcome) ? outcome : untested(REASONS.invalidResult);
  } catch (error) {
    controller.abort();
    return untested(
      REASONS.error,
      isNetError(error) ? { measured: { errorCode: error.code } } : {},
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Exécute les checks avec une concurrence bornée. Ne lève jamais : toute erreur,
 * tout délai dépassé ou tout résultat invalide devient `untested` avec une raison.
 * Un check `active` n'est jamais appelé si `ctx.verified !== true`.
 * Les résultats suivent l'ordre de `checks`.
 */
export async function runChecks(
  checks: readonly Check[],
  ctx: RunContext,
  options: RunOptions = {},
): Promise<CheckOutcome[]> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new Error('La concurrence doit être un entier ≥ 1');
  const timeoutMs = options.timeoutMs ?? DEFAULT_CHECK_TIMEOUT_MS;
  if (!(Number.isFinite(timeoutMs) && timeoutMs > 0))
    throw new Error('Le délai doit être positif');
  const available = new Set(options.available ?? DEFAULT_AVAILABLE);

  const outcomes = new Array<CheckOutcome>(checks.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < checks.length) {
      const index = next++;
      const check = checks[index] as Check;
      outcomes[index] = {
        checkId: check.id,
        domain: check.domain,
        mode: check.mode,
        weight: check.weight,
        result: await runOne(check, ctx, available, timeoutMs),
      };
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, checks.length) }, worker),
  );
  return outcomes;
}
