import { t } from '../i18n/index.js';
import type { ApiDomain, ApiFinding, AuditPayload } from './audit-api.js';
import type { BriefSource } from './brief.js';
import type { CategoryItem } from './categories.js';
import {
  domainPlain,
  domainSentence,
  domainTech,
  REPORT_DOMAINS,
} from './domains.js';
import type { Finding, FindingStatus } from './findings.js';
import { presentFinding } from './report-export.js';
import { type Level, levelForScore } from './score.js';
import { asParams, translate } from './translate.js';
import { causeOfFinding, explainUntested } from './untested-cause.js';

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
  const cause = causeOfFinding(row)?.text ?? null;
  const reasonIsStatement =
    reason !== null &&
    why.replace(/\s+/g, ' ').trim() === reason.replace(/\s+/g, ' ').trim();
  const copy = presentFinding(
    why,
    reasonIsStatement ? null : (cause ?? reason),
    observed,
  );
  const minutes = row.effortMinutes ?? fix?.effortMinutes ?? null;
  let shownTitle = title;
  if (copy.limit && shownTitle.includes(copy.limit)) {
    shownTitle = copy.statement;
  }
  const finding: Finding = {
    id: row.checkId,
    status,
    severity: rank(row.severity, 4),
    impact: rank(row.impact, 3) as 1 | 2 | 3,
    title: shownTitle,
    why: copy.statement,
    limit: copy.limit,
    effort: effortLabel(status, minutes),
    steps: fix?.steps?.length ? fix.steps : [t('finding.done')],
  };
  if (fix?.code) finding.code = fix.code;
  if (fix?.sourceHref && fix.sourceLabel) {
    finding.sourceHref = fix.sourceHref;
    finding.sourceLabel = fix.sourceLabel;
  }
  if (needsSearchConsole(row)) {
    finding.actionHref = '/search-console';
    finding.actionLabel = t('gsc.connect');
  }
  return finding;
}

function needsSearchConsole(row: ApiFinding): boolean {
  if (
    row.messageKey === 'seo.gsc.untested_connect' ||
    row.reason === 'seo.gsc.untested_connect' ||
    row.messageKey === 'seo.gsc.untested_auth' ||
    row.reason === 'seo.gsc.untested_auth'
  ) {
    return true;
  }
  const params = asParams(row.params);
  return row.reason === 'reason.missing_source' && params?.source === 'gsc';
}

export function domainLevel(row: ApiDomain | undefined): Level {
  if (!row || row.score === null) return 'untested';
  return levelForScore(row.score);
}

/** Réputation et disponibilité restent hors des 8 domaines du score global. */
const ASIDE_DOMAINS = new Set(['reputation', 'disponibilite']);

export function categoryItems(
  domains: readonly ApiDomain[],
  auditId: string,
  findings?: readonly ApiFinding[],
): CategoryItem[] {
  const byId = new Map(domains.map((row) => [row.domain, row]));
  const ids = [...REPORT_DOMAINS] as string[];
  for (const row of domains) {
    if (!ids.includes(row.domain) && !ASIDE_DOMAINS.has(row.domain)) {
      ids.push(row.domain);
    }
  }
  return ids.map((id) => {
    const row = byId.get(id);
    const score = row?.score ?? null;
    const level = domainLevel(row);
    const item: CategoryItem = {
      id,
      label: domainPlain(id),
      technical: domainTech(id),
      detail: domainSentence(id, level),
      score: row ? score : null,
      href: `/domaine?id=${encodeURIComponent(auditId)}&domaine=${encodeURIComponent(id)}`,
    };
    if (findings && item.score === null) {
      const explained = explainUntested({
        coverage: row?.coverage ?? null,
        findings: findings.filter((finding) => finding.domain === id),
      });
      item.coverageNote = explained.coverageNote;
      item.causes = explained.causes;
    }
    return item;
  });
}

export function scoredDomainCount(items: readonly CategoryItem[]): number {
  return items.filter(
    (item) =>
      (REPORT_DOMAINS as readonly string[]).includes(item.id) &&
      item.score !== null,
  ).length;
}

export interface ReputationAside {
  score: number | null;
  rating: number | null;
  reviewCount: number | null;
  name: string | null;
  level: Level;
}

/** `null` quand l’audit n’a pas de domaine avis : la section reste masquée. */
export function reputationAside(payload: AuditPayload): ReputationAside | null {
  const row = payload.domains.find((item) => item.domain === 'reputation');
  if (!row) return null;
  const finding = payload.findings.find(
    (item) => item.checkId === 'reputation.avis',
  );
  const measured = asRecord(finding?.measured);
  return {
    score: row.score,
    rating: asFinite(measured?.rating),
    reviewCount: asCount(measured?.reviewCount),
    name: asName(measured?.placeName),
    level: domainLevel(row),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asCount(value: unknown): number | null {
  const number = asFinite(value);
  if (number === null || number < 0) return null;
  return Math.round(number);
}

function asName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name === '' ? null : name.slice(0, 200);
}

/**
 * Identifiant stable d’un constat : le test lui-même, pas sa position.
 * Un suffixe n’apparaît que si le même test revient plusieurs fois.
 * Ainsi les cases cochées survivent quand la liste change (partiel → terminé).
 */
function stableIds(rows: readonly ApiFinding[]): string[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const count = seen.get(row.checkId) ?? 0;
    seen.set(row.checkId, count + 1);
    return count === 0 ? row.checkId : `${row.checkId}-${count}`;
  });
}

export function reportFindings(
  payload: AuditPayload,
  fixes: ReadonlyMap<string, FixView>,
  domain?: string,
): Finding[] {
  const ids = stableIds(payload.findings);
  return payload.findings.flatMap((row, index) => {
    if (row.status === 'na') return [];
    if (domain === undefined && row.domain === 'reputation') return [];
    if (domain !== undefined && row.domain !== domain) return [];
    const fix = row.fixKey ? fixes.get(row.fixKey) : undefined;
    const finding = toFinding(row, fix);
    finding.id = ids[index] ?? row.checkId;
    return [finding];
  });
}

export type CatalogStatus = 'pass' | 'warn' | 'fail' | 'untested' | 'na';

export interface ReportRow extends Finding {
  checkId: string;
  catalogStatus: CatalogStatus;
  proof: string;
  impactText: string | null;
  sources: BriefSource[];
}

function catalogStatusOf(
  raw: string,
  status: Finding['status'],
): CatalogStatus {
  if (raw === 'na') return 'na';
  if (
    raw === 'pass' ||
    raw === 'warn' ||
    raw === 'fail' ||
    raw === 'untested'
  ) {
    return raw;
  }
  return status;
}

export function reportRows(
  payload: AuditPayload,
  fixes: ReadonlyMap<string, FixView>,
  domain?: string,
): ReportRow[] {
  const ids = stableIds(payload.findings);
  return payload.findings.flatMap((row, index) => {
    if (domain === undefined && row.domain === 'reputation') return [];
    if (domain !== undefined && row.domain !== domain) return [];
    const fix = row.fixKey ? fixes.get(row.fixKey) : undefined;
    const finding = toFinding(row, fix);
    finding.id = ids[index] ?? row.checkId;
    const sources: BriefSource[] = [];
    if (fix?.sourceHref && fix.sourceLabel) {
      sources.push({ label: fix.sourceLabel, url: fix.sourceHref });
    }
    return [
      {
        ...finding,
        checkId: row.checkId,
        catalogStatus: catalogStatusOf(row.status, finding.status),
        proof: finding.why,
        impactText: finding.limit?.trim() ? finding.limit : null,
        sources,
      },
    ];
  });
}
