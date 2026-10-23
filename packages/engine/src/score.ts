import {
  type CheckOutcome,
  type CheckResult,
  DOMAINS,
  type Domain,
  MAIN_DOMAINS,
} from './types.js';

export type Level = 'good' | 'improve' | 'problem' | 'untested';

/** Couverture minimale pour noter un domaine. */
export const MIN_COVERAGE = 0.5;

const DEFAULT_SCORES = { pass: 1, warn: 0.5, fail: 0 } as const;

export interface DomainScore {
  domain: Domain;
  /** 0..100, ou `null` si le domaine est « Non testé ». */
  score: number | null;
  /** Poids testé / poids total (hors `na`). */
  coverage: number;
  testedWeight: number;
  totalWeight: number;
  level: Level;
}

export interface GlobalScore {
  score: number | null;
  /** Domaines principaux notés / 8. */
  coverage: number;
  scoredDomains: Domain[];
  level: Level;
}

export function levelFor(score: number | null): Level {
  if (score === null) return 'untested';
  if (score >= 80) return 'good';
  if (score >= 50) return 'improve';
  return 'problem';
}

/** Valeur 0..1 d'un résultat noté, `null` pour `untested` et `na`. */
export function resultValue(result: CheckResult): number | null {
  if (
    result.status === 'pass' ||
    result.status === 'warn' ||
    result.status === 'fail'
  )
    return result.score ?? DEFAULT_SCORES[result.status];
  return null;
}

export function scoreDomain(
  domain: Domain,
  outcomes: readonly CheckOutcome[],
): DomainScore {
  let totalWeight = 0;
  let testedWeight = 0;
  let weighted = 0;
  for (const outcome of outcomes) {
    if (outcome.domain !== domain || outcome.result.status === 'na') continue;
    totalWeight += outcome.weight;
    const value = resultValue(outcome.result);
    if (value === null) continue;
    testedWeight += outcome.weight;
    weighted += outcome.weight * value;
  }
  const coverage = totalWeight === 0 ? 0 : testedWeight / totalWeight;
  const score =
    testedWeight === 0 || coverage < MIN_COVERAGE
      ? null
      : Math.round((100 * weighted) / testedWeight);
  return {
    domain,
    score,
    coverage,
    testedWeight,
    totalWeight,
    level: levelFor(score),
  };
}

export function scoreDomains(outcomes: readonly CheckOutcome[]): DomainScore[] {
  return DOMAINS.map((domain) => scoreDomain(domain, outcomes));
}

/** Moyenne à poids égaux des domaines principaux notés (Q21). */
export function scoreGlobal(domains: readonly DomainScore[]): GlobalScore {
  const scored = domains.filter(
    (d): d is DomainScore & { score: number } =>
      MAIN_DOMAINS.includes(d.domain) && d.score !== null,
  );
  const score =
    scored.length === 0
      ? null
      : Math.round(scored.reduce((sum, d) => sum + d.score, 0) / scored.length);
  return {
    score,
    coverage: scored.length / MAIN_DOMAINS.length,
    scoredDomains: scored.map((d) => d.domain),
    level: levelFor(score),
  };
}

/**
 * Corrections à faire (`fail` puis `warn` confondus) : sévérité décroissante,
 * impact décroissant, effort croissant (inconnu en dernier), puis identifiant.
 */
export function prioritize(
  outcomes: readonly CheckOutcome[],
  effortMinutes: (fixKey: string) => number | undefined = () => undefined,
): CheckOutcome[] {
  const effort = (o: CheckOutcome) =>
    (o.result.fixKey === undefined
      ? undefined
      : effortMinutes(o.result.fixKey)) ?? Number.POSITIVE_INFINITY;
  return outcomes
    .filter((o) => o.result.status === 'fail' || o.result.status === 'warn')
    .sort(
      (a, b) =>
        b.result.severity - a.result.severity ||
        b.result.impact - a.result.impact ||
        effort(a) - effort(b) ||
        (a.checkId < b.checkId ? -1 : a.checkId > b.checkId ? 1 : 0),
    );
}
