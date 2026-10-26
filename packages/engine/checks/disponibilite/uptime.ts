import type {
  Check,
  CheckContext,
  CheckResult,
  Status,
} from '../../src/types.js';
import { finding } from '../securite/shared.js';

const ID = 'disponibilite.uptime';

/** Somme des lignes `uptime_daily`, déposée par l’orchestration. */
export const UPTIME_KEY = 'uptime';

export interface UptimeSample {
  checks: number;
  failures: number;
}

function isSample(value: unknown): value is UptimeSample {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.checks === 'number' &&
    Number.isInteger(row.checks) &&
    typeof row.failures === 'number' &&
    Number.isInteger(row.failures)
  );
}

/** Pourcentage de sondes réussies, ou Non testé. Hors score global. */
export function judgeUptime(sample: UptimeSample | null): CheckResult {
  if (
    !sample ||
    sample.checks <= 0 ||
    sample.failures < 0 ||
    sample.failures > sample.checks
  ) {
    return finding(ID, 'untested', 1, 1, `${ID}.untested`);
  }
  const pct = Math.round(
    (100 * (sample.checks - sample.failures)) / sample.checks,
  );
  const status: Status = pct >= 99 ? 'pass' : pct >= 95 ? 'warn' : 'fail';
  const result = finding(
    ID,
    status,
    status === 'fail' ? 3 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 2,
    `${ID}.pct`,
    {
      params: { pct },
      measured: {
        pct,
        checks: sample.checks,
        failures: sample.failures,
      },
    },
  );
  result.score = pct / 100;
  return result;
}

export function createDisponibiliteChecks(): Check[] {
  return [
    {
      id: ID,
      domain: 'disponibilite',
      mode: 'passive',
      needs: [],
      weight: 1,
      async run(ctx: CheckContext) {
        if (!ctx.shared.has(UPTIME_KEY)) return judgeUptime(null);
        const raw: unknown = await ctx.shared.get(UPTIME_KEY, async () => null);
        return judgeUptime(isSample(raw) ? raw : null);
      },
    },
  ];
}

export const DISPONIBILITE_CHECKS: readonly Check[] =
  createDisponibiliteChecks();
