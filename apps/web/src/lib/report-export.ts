import { formatDateTime } from '../i18n/format.js';
import { t } from '../i18n/index.js';

/** Phrase déjà écrite qui dit ce que le test ne couvre pas. */
const LIMIT_SENTENCE =
  /Cela ne couvre pas|Cela ne prouve pas|n’a pas été mesuré|n’ont pas été mesur|n’est pas visible|n’est pas jugé|pas sur une mesure exacte|pas une mesure exacte|serait trompeuse|invisible ici/u;

export interface ExportCause {
  primary: string | null;
  others: readonly string[];
  closing: string;
}

export interface ExportDomain {
  label: string;
  score: number | null;
  detail: string;
  coverageNote?: string | null;
  /** Rapport du propriétaire seulement. Ignoré si `publicView`. */
  causes?: ExportCause | null;
}

export interface ExportFinding {
  title: string;
  statusLabel: string;
  statement: string;
  limit: string | null;
}

export interface ExportReport {
  url: string;
  at: Date | null;
  methodVersion: string | null;
  globalScore: number | null;
  /** Même retenue que l’écran public : pas de cause interne. */
  publicView: boolean;
  domains: readonly ExportDomain[];
  findings: readonly ExportFinding[];
  securityHeading?: string | null;
  securityLines?: readonly string[] | null;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr-FR');
}

function same(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

function redundant(statement: string, limit: string): boolean {
  const left = normalize(statement);
  const right = normalize(limit);
  if (left === '' || right === '') return true;
  return left === right || left.includes(right) || right.includes(left);
}

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=\.)\s+(?=\p{Lu})/u)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

function isLimitSentence(sentence: string): boolean {
  return LIMIT_SENTENCE.test(sentence);
}

function peel(text: string): { statement: string; limits: string[] } {
  const trimmed = text.trim();
  const sentences = sentencesOf(trimmed);
  if (sentences.length < 2) return { statement: trimmed, limits: [] };
  const limits = sentences.filter((sentence) => isLimitSentence(sentence));
  const rest = sentences.filter((sentence) => !isLimitSentence(sentence));
  if (limits.length === 0 || rest.length === 0) {
    return { statement: trimmed, limits: [] };
  }
  return { statement: rest.join(' '), limits };
}

function pushUnique(target: string[], statement: string, value: string): void {
  const next = value.trim();
  if (next === '' || redundant(statement, next)) return;
  if (target.some((item) => same(item, next))) return;
  target.push(next);
}

/**
 * Constat visible, et limite seulement si la phrase est autre.
 * La raison déjà reprise dans le constat n’est pas répétée.
 */
export function presentFinding(
  why: string,
  reason: string | null,
  observed: string | null,
): { statement: string; limit: string | null } {
  const peeled = peel(why);
  const limits: string[] = [];
  for (const sentence of peeled.limits) {
    pushUnique(limits, peeled.statement, sentence);
  }
  collect(limits, peeled.statement, reason, true);
  collect(limits, peeled.statement, observed, false);
  return {
    statement: peeled.statement,
    limit: limits.length > 0 ? limits.join(' ') : null,
  };
}

function collect(
  limits: string[],
  statement: string,
  text: string | null,
  whole: boolean,
): void {
  if (!text) return;
  const peeled = peel(text);
  if (peeled.limits.length > 0) {
    for (const sentence of peeled.limits) {
      pushUnique(limits, statement, sentence);
    }
    return;
  }
  if (whole) pushUnique(limits, statement, text);
}

/** Hôte du fichier, sans port ni identifiant. */
export function exportHost(url: string): string {
  try {
    const host = new URL(url).hostname.toLocaleLowerCase('fr-FR');
    if (/^[a-z0-9.-]+$/u.test(host) && !host.startsWith('.')) return host;
  } catch {
    // adresse illisible : nom neutre
  }
  return 'site';
}

/** Jour civil Europe/Paris, `2026-10-24`. */
export function parisCivilDay(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function markdownFilename(url: string, at: Date): string {
  return `audigy-${exportHost(url)}-${parisCivilDay(at)}.md`;
}

function scoreLine(score: number | null): string {
  if (score === null) return t('export.score.untested');
  return t('export.score', { score });
}

function domainBlock(report: ExportReport, domain: ExportDomain): string[] {
  const score =
    domain.score === null ? t('level.untested') : String(domain.score);
  const lines = [
    `- ${t('export.domain', { label: domain.label, score })}`,
    `  ${domain.detail}`,
  ];
  if (domain.coverageNote) lines.push(`  ${domain.coverageNote}`);
  if (!report.publicView && domain.causes) {
    if (domain.causes.primary) lines.push(`  ${domain.causes.primary}`);
    for (const other of domain.causes.others) lines.push(`  ${other}`);
    lines.push(`  ${domain.causes.closing}`);
  }
  return lines;
}

function findingBlock(finding: ExportFinding): string[] {
  const lines = [
    `### ${finding.title}`,
    '',
    finding.statusLabel,
    '',
    finding.statement,
  ];
  if (finding.limit) lines.push('', t('export.limit', { text: finding.limit }));
  return lines;
}

/** Markdown construit en mémoire. Dernière ligne : ce n’est pas une preuve. */
export function renderMarkdown(report: ExportReport): string {
  const lines: string[] = [report.url, ''];
  if (report.at) lines.push(formatDateTime(report.at), '');
  if (report.methodVersion) {
    lines.push(t('footer.method', { version: report.methodVersion }), '');
  }
  lines.push(
    scoreLine(report.globalScore),
    '',
    `## ${t('section.categories')}`,
    '',
  );
  for (const domain of report.domains) {
    lines.push(...domainBlock(report, domain), '');
  }
  if (report.findings.length > 0) {
    lines.push(`## ${t('section.findings')}`, '');
    for (const finding of report.findings) {
      lines.push(...findingBlock(finding), '');
    }
  }
  if (report.securityHeading && report.securityLines) {
    lines.push(`## ${report.securityHeading}`, '');
    for (const line of report.securityLines) lines.push(`- ${line}`);
    lines.push('');
  }
  lines.push(t('export.notProof'));
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
}

/** Téléchargement local. N’appelle pas le réseau. */
export function saveTextFile(filename: string, body: string): void {
  const view = globalThis as unknown as {
    document: {
      createElement: (tag: 'a') => {
        href: string;
        download: string;
        click: () => void;
        remove: () => void;
      };
      body: { append: (node: unknown) => void };
    };
  };
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = view.document.createElement('a');
  link.href = href;
  link.download = filename;
  view.document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
