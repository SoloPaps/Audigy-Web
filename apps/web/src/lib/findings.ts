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
  effort: string;
  steps: string[];
  code?: string;
  sourceLabel?: string;
  sourceHref?: string;
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
