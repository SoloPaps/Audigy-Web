import { t } from '../i18n/index.js';
import type { ApiDomain, ApiFinding, AuditPayload } from './audit-api.js';
import type { CategoryItem } from './categories.js';
import {
  domainPlain,
  domainSentence,
  domainTech,
  REPORT_DOMAINS,
} from './domains.js';
import type { Finding, FindingStatus } from './findings.js';
import { type Level, levelForScore } from './score.js';
import { asParams, translate } from './translate.js';

export interface FixView {
  title: string;
  why: string;
  effortMinutes: number;
  steps: string[];
  code?: string;
  sourceLabel?: string;
  sourceHref?: string;
}

const STATUSES = new Set<FindingStatus>(['pass', 'warn', 'fail', 'untested']);

function asStatus(value: string): FindingStatus {
  if (value === 'na') return 'untested';
  if (STATUSES.has(value as FindingStatus)) return value as FindingStatus;
  return 'untested';
}

function rank(value: number, max: 3 | 4): 1 | 2 | 3 | 4 {
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded >= max) return max;
  if (rounded === 2) return 2;
  return 3;
}

function effortLabel(status: FindingStatus, minutes: number | null): string {
  if (minutes !== null && minutes > 0) return t('finding.effort', { minutes });
  if (status === 'pass') return t('finding.done');
  return t('finding.unknown');
}

export function toFinding(row: ApiFinding, fix: FixView | undefined): Finding {
  const status = asStatus(row.status);
  const params = asParams(row.params);
  const observed = translate(row.messageKey, params);
  const reason = row.reason ? translate(row.reason, params) : null;
  const title = fix?.title ?? observed ?? t('finding.untested');
  let why = fix?.why ?? reason ?? observed ?? t('finding.untested');
  if (why === title) why = reason ?? observed ?? t('finding.untested');
  if (status === 'pass' && !fix) why = t('finding.done');
  const minutes = row.effortMinutes ?? fix?.effortMinutes ?? null;
  const finding: Finding = {
    id: row.checkId,
    status,
    severity: rank(row.severity, 4),
    impact: rank(row.impact, 3) as 1 | 2 | 3,
    title,
    why,
    effort: effortLabel(status, minutes),
    steps: fix?.steps?.length ? fix.steps : [t('finding.done')],
  };
  if (fix?.code) finding.code = fix.code;
  if (fix?.sourceHref && fix.sourceLabel) {
    finding.sourceHref = fix.sourceHref;
    finding.sourceLabel = fix.sourceLabel;
  }
  return finding;
}

export function domainLevel(row: ApiDomain | undefined): Level {
  if (!row || row.score === null) return 'untested';
  return levelForScore(row.score);
}

export function categoryItems(
  domains: readonly ApiDomain[],
  auditId: string,
): CategoryItem[] {
  const byId = new Map(domains.map((row) => [row.domain, row]));
  const ids = [...REPORT_DOMAINS] as string[];
  for (const row of domains) {
    if (!ids.includes(row.domain)) ids.push(row.domain);
  }
  return ids.map((id) => {
    const row = byId.get(id);
    const score = row?.score ?? null;
    const level = domainLevel(row);
    return {
      id,
      label: domainPlain(id),
      technical: domainTech(id),
      detail: domainSentence(id, level),
      score: row ? score : null,
      href: `/domaine?id=${encodeURIComponent(auditId)}&domaine=${encodeURIComponent(id)}`,
    };
  });
}

export function scoredDomainCount(items: readonly CategoryItem[]): number {
  return items.filter(
    (item) =>
      (REPORT_DOMAINS as readonly string[]).includes(item.id) &&
      item.score !== null,
  ).length;
}

export function reportFindings(
  payload: AuditPayload,
  fixes: ReadonlyMap<string, FixView>,
  domain?: string,
): Finding[] {
  return payload.findings.flatMap((row, index) => {
    if (row.status === 'na') return [];
    if (domain !== undefined && row.domain !== domain) return [];
    const fix = row.fixKey ? fixes.get(row.fixKey) : undefined;
    const finding = toFinding(row, fix);
    finding.id = `${row.checkId}-${index}`;
    return [finding];
  });
}
