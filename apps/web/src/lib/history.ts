import { formatDate, formatNumber, t } from '../i18n/index.js';
import { domainPlain, REPORT_DOMAINS } from './domains.js';
import type { FindingStatus } from './findings.js';
import { type Level, levelForScore } from './score.js';

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;
export const SCORE_THRESHOLDS = [50, 80] as const;
export const MAX_SERIES = 3;
export const GLOBAL_SERIES = 'global';

export const SERIES_STROKES = ['solid', 'dashed', 'dotted'] as const;
export type SeriesStroke = (typeof SERIES_STROKES)[number];

const DASH: Record<SeriesStroke, readonly number[]> = {
  solid: [],
  dashed: [9, 6],
  dotted: [2, 4],
};

const OPEN = new Set<FindingStatus>(['fail', 'warn']);
const READY = new Set(['done', 'partial', 'failed']);
const STATUS_RANK: Record<string, number> = {
  fail: 4,
  warn: 3,
  untested: 2,
  pass: 1,
  na: 0,
};

export function yRange(
  _low: number,
  _high: number,
): readonly [typeof SCORE_MIN, typeof SCORE_MAX] {
  return [SCORE_MIN, SCORE_MAX];
}

export function clampSeries(ids: readonly string[]): string[] {
  const chosen: string[] = [];
  for (const id of ids) {
    if (id === '' || chosen.includes(id)) continue;
    chosen.push(id);
    if (chosen.length === MAX_SERIES) break;
  }
  return chosen;
}

export function seriesStyle(index: number): {
  stroke: SeriesStroke;
  dash: readonly number[];
} {
  const stroke = SERIES_STROKES[index];
  if (!stroke) throw new Error('trois séries au plus');
  return { stroke, dash: DASH[stroke] };
}

export interface HistoryPoint {
  id: string;
  at: string;
  href: string;
  scores: Readonly<Record<string, number | null>>;
}

export interface HistorySeries {
  id: string;
  label: string;
}

export interface ComparedIssue {
  id: string;
  title: string;
  status: FindingStatus;
  href: string;
}

export interface AuditSnapshot {
  id: string;
  at: string;
  label: string;
  findings: readonly ComparedIssue[];
}

export interface AuditComparison {
  added: ComparedIssue[];
  fixed: ComparedIssue[];
}

export interface HistoryCell {
  text: string;
  level?: Level;
  numeric?: boolean;
}

export interface HistoryColumn {
  key: string;
  label: string;
}

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Paris',
});

const axisFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Paris',
});

export function historyDay(iso: string): string {
  return dayFormat.format(new Date(iso));
}

export function axisDay(unixSeconds: number): string {
  return axisFormat.format(new Date(unixSeconds * 1000));
}

export function sortPoints(points: readonly HistoryPoint[]): HistoryPoint[] {
  return [...points].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

function scored(
  points: readonly HistoryPoint[],
  seriesId: string,
): HistoryPoint[] {
  return sortPoints(points).filter(
    (point) => typeof point.scores[seriesId] === 'number',
  );
}

export function historySummary(
  points: readonly HistoryPoint[],
  seriesId: string,
): string {
  const rows = scored(points, seriesId);
  const first = rows[0];
  if (!first) return t('history.summary.empty');
  const date = historyDay(first.at);
  const last = rows[rows.length - 1];
  if (!last || rows.length < 2) return t('history.summary.single', { date });
  const start = first.scores[seriesId];
  const end = last.scores[seriesId];
  if (typeof start !== 'number' || typeof end !== 'number') {
    return t('history.summary.single', { date });
  }
  const delta = end - start;
  if (delta === 0) return t('history.summary.same', { date });
  if (delta === 1) return t('history.summary.up.one', { date });
  if (delta === -1) return t('history.summary.down.one', { date });
  const amount = formatNumber(Math.abs(delta));
  if (delta > 0) return t('history.summary.up', { points: amount, date });
  return t('history.summary.down', { points: amount, date });
}

function scoreCell(score: number | null): HistoryCell {
  if (score === null) return { text: t('score.empty') };
  return { text: String(score), numeric: true, level: levelForScore(score) };
}

export function historyTable(
  points: readonly HistoryPoint[],
  series: readonly HistorySeries[],
): { caption: string; columns: HistoryColumn[]; rows: HistoryCell[][] } {
  const ordered = sortPoints(points);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  let caption = t('history.summary.empty');
  if (first && last && ordered.length >= 2) {
    caption = t('history.caption', {
      start: formatDate(new Date(first.at)),
      end: formatDate(new Date(last.at)),
    });
  } else if (first) {
    caption = t('history.caption.one', {
      date: formatDate(new Date(first.at)),
    });
  }
  return {
    caption,
    columns: [
      { key: 'date', label: t('table.date') },
      ...series.map((item) => ({ key: item.id, label: item.label })),
    ],
    rows: ordered.map((point) => [
      { text: formatDate(new Date(point.at)) },
      ...series.map((item) => scoreCell(point.scores[item.id] ?? null)),
    ]),
  };
}

export function compareAudits(
  older: AuditSnapshot,
  newer: AuditSnapshot,
): AuditComparison {
  const before = new Map(older.findings.map((item) => [item.id, item]));
  const after = new Map(newer.findings.map((item) => [item.id, item]));
  const added: ComparedIssue[] = [];
  const fixed: ComparedIssue[] = [];
  for (const item of newer.findings) {
    const prev = before.get(item.id);
    if (
      OPEN.has(item.status) &&
      (prev === undefined || !OPEN.has(prev.status))
    ) {
      added.push(item);
    }
  }
  for (const item of older.findings) {
    const next = after.get(item.id);
    if (OPEN.has(item.status) && next?.status === 'pass') fixed.push(next);
    if (OPEN.has(item.status) && next === undefined) fixed.push(item);
  }
  return { added, fixed };
}

export interface StoredAudit {
  id: string;
  status: string;
  created_at: string;
  finished_at: string | null;
  global_score: number | null;
}

export interface StoredDomain {
  audit_id: string;
  domain: string;
  score: number | null;
}

export interface StoredFinding {
  audit_id: string;
  check_id: string;
  status: string;
  title: string;
}

function asStatus(value: string): FindingStatus {
  if (value === 'pass' || value === 'warn' || value === 'fail') return value;
  return 'untested';
}

function seriesLabels(ids: readonly string[]): HistorySeries[] {
  return ids.map((id) => ({
    id,
    label: id === GLOBAL_SERIES ? t('domain.global') : domainPlain(id),
  }));
}

export interface HistoryView {
  series: HistorySeries[];
  points: HistoryPoint[];
  snapshots: AuditSnapshot[];
}

export function rowsToHistory(input: {
  audits: readonly StoredAudit[];
  domains: readonly StoredDomain[];
  findings: readonly StoredFinding[];
}): HistoryView {
  const ready = input.audits.filter((row) => READY.has(row.status));
  const byDomain = new Map<string, Map<string, number | null>>();
  for (const row of input.domains) {
    const bucket =
      byDomain.get(row.audit_id) ?? new Map<string, number | null>();
    bucket.set(row.domain, row.score);
    byDomain.set(row.audit_id, bucket);
  }
  const points = sortPoints(
    ready.map((row) => {
      const scores: Record<string, number | null> = {
        [GLOBAL_SERIES]: row.global_score,
      };
      const domains = byDomain.get(row.id);
      if (domains) {
        for (const [domain, score] of domains) scores[domain] = score;
      }
      const at = row.finished_at ?? row.created_at;
      return {
        id: row.id,
        at,
        href: `/rapport?id=${encodeURIComponent(row.id)}`,
        scores,
      };
    }),
  );
  const present = new Set<string>();
  for (const point of points) {
    for (const [key, value] of Object.entries(point.scores)) {
      if (typeof value === 'number') present.add(key);
    }
  }
  const order = [GLOBAL_SERIES, ...REPORT_DOMAINS];
  const seriesIds = order.filter(
    (id) => id === GLOBAL_SERIES || present.has(id),
  );
  for (const id of present) {
    if (!seriesIds.includes(id)) seriesIds.push(id);
  }
  const findings = new Map<string, Map<string, StoredFinding>>();
  for (const row of input.findings) {
    if (row.check_id === '') continue;
    const bucket =
      findings.get(row.audit_id) ?? new Map<string, StoredFinding>();
    const prev = bucket.get(row.check_id);
    const rank = STATUS_RANK[row.status] ?? 0;
    const prevRank = prev ? (STATUS_RANK[prev.status] ?? 0) : -1;
    if (!prev || rank > prevRank) bucket.set(row.check_id, row);
    findings.set(row.audit_id, bucket);
  }
  const snapshots: AuditSnapshot[] = points.map((point) => ({
    id: point.id,
    at: point.at,
    label: formatDate(new Date(point.at)),
    findings: [...(findings.get(point.id)?.values() ?? [])].map((row) => ({
      id: row.check_id,
      title: row.title,
      status: asStatus(row.status),
      href: `${point.href}#finding-${encodeURIComponent(row.check_id)}`,
    })),
  }));
  return { series: seriesLabels(seriesIds), points, snapshots };
}
