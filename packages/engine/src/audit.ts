import type { FixSheet } from './fixes.js';
import { type RunOptions, runChecks } from './runner.js';
import {
  type DomainScore,
  type GlobalScore,
  prioritize,
  scoreDomains,
  scoreGlobal,
} from './score.js';
import {
  type Check,
  type CheckOutcome,
  METHOD_VERSION,
  type RunContext,
} from './types.js';

export interface AuditReport {
  methodVersion: string;
  outcomes: CheckOutcome[];
  domains: DomainScore[];
  global: GlobalScore;
  /** Identifiants des checks à corriger, dans l'ordre de priorité. */
  priorities: string[];
}

/** Exécute les checks puis calcule scores et priorités. Résultat indépendant de l'ordre d'entrée. */
export async function runAudit(
  checks: readonly Check[],
  ctx: RunContext,
  options: RunOptions & { fixes?: ReadonlyMap<string, FixSheet> } = {},
): Promise<AuditReport> {
  const { fixes, ...runOptions } = options;
  const ordered = [...checks].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const outcomes = await runChecks(ordered, ctx, runOptions);
  const domains = scoreDomains(outcomes);
  return {
    methodVersion: METHOD_VERSION,
    outcomes,
    domains,
    global: scoreGlobal(domains),
    priorities: prioritize(
      outcomes,
      (key) => fixes?.get(key)?.effortMinutes,
    ).map((o) => o.checkId),
  };
}
