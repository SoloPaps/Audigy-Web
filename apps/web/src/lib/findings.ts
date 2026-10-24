import type { Level } from './score.js';

export type FindingStatus = 'pass' | 'warn' | 'fail' | 'untested';
export type FilterId = 'all' | 'fail' | 'warn' | 'pass';

export interface Finding {
  id: string;
  status: FindingStatus;
  severity: 1 | 2 | 3 | 4;
  impact: 1 | 2 | 3;
  title: string;
  why: string;
  /** Absente quand elle répète le constat. */
  limit?: string | null;
  effort: string;
  steps: string[];
  code?: string;
  sourceLabel?: string;
  sourceHref?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function levelForStatus(status: FindingStatus): Level {
  if (status === 'pass') return 'good';
  if (status === 'warn') return 'improve';
  if (status === 'fail') return 'problem';
  return 'untested';
}

export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      b.severity - a.severity ||
      b.impact - a.impact ||
      a.title.localeCompare(b.title, 'fr'),
  );
}

export function filterFindings(
  findings: readonly Finding[],
  filter: FilterId,
): Finding[] {
  const sorted = sortFindings(findings);
  if (filter === 'all') return sorted;
  return sorted.filter((item) => item.status === filter);
}

export function countByFilter(
  findings: readonly Finding[],
): Record<FilterId, number> {
  return {
    all: findings.length,
    fail: findings.filter((item) => item.status === 'fail').length,
    warn: findings.filter((item) => item.status === 'warn').length,
    pass: findings.filter((item) => item.status === 'pass').length,
  };
}

export interface FindingGroups {
  priority: Finding[];
  next: Finding[];
  good: Finding[];
}

/** Échecs d’abord, puis avertissements et non testés, réussites à part. */
export function groupFindings(findings: readonly Finding[]): FindingGroups {
  const sorted = sortFindings(findings);
  return {
    priority: sorted.filter((item) => item.status === 'fail'),
    next: sorted.filter(
      (item) => item.status === 'warn' || item.status === 'untested',
    ),
    good: sorted.filter((item) => item.status === 'pass'),
  };
}

export function topActions(findings: readonly Finding[], limit = 3): Finding[] {
  return sortFindings(
    findings.filter((item) => item.status === 'fail' || item.status === 'warn'),
  ).slice(0, limit);
}
