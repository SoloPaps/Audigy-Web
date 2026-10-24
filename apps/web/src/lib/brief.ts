import { formatDateTime } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { renderTerminal } from './brief-terminal.js';
import type { MethodeEntry } from './methode-catalog.js';
import { asParams } from './translate.js';

export interface BriefSource {
  label: string;
  url: string;
}

export type TerminalMode = 'rien' | 'verif' | 'fix';

export interface BriefFinding {
  id: string;
  checkId: string;
  title: string;
  statusLabel: string;
  proof: string;
  impact: string | null;
  terminal: TerminalMode;
}

export interface BriefDocument {
  url: string;
  at: Date | null;
  stack: string | null;
  findings: readonly BriefFinding[];
  catalog: ReadonlyMap<string, MethodeEntry>;
  sources: ReadonlyMap<string, readonly BriefSource[]>;
  includeTerminal: boolean;
}

export function sameSentence(a: string, b: string): boolean {
  const fold = (value: string): string =>
    value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr-FR');
  return fold(a) !== '' && fold(a) === fold(b);
}

export function recognizedStack(
  findings: readonly {
    checkId: string;
    messageKey: string;
    params: unknown;
  }[],
): string | null {
  const row = findings.find((item) => item.checkId === 'securite.technologies');
  if (!row) return null;
  if (
    row.messageKey !== 'securite.technologies.pass' &&
    row.messageKey !== 'securite.technologies.warn'
  ) {
    return null;
  }
  const list = asParams(row.params)?.liste;
  if (typeof list !== 'string') return null;
  const stack = list.trim();
  return stack === '' ? null : stack;
}

export function referenceOf(
  sources: readonly BriefSource[],
  citation: string | null,
): string | null {
  const parts = sources
    .filter((source) => source.label.trim() !== '' && source.url.trim() !== '')
    .map((source) => `${source.label.trim()} — ${source.url.trim()}`);
  if (parts.length > 0) return parts.join(' ; ');
  if (citation === null || citation.trim() === '') return null;
  return citation.trim();
}

function bullet(line: string, indent = ''): string {
  return `${indent}- ${line}`;
}

/** Le fragment ajoute déjà le point final. */
function spoken(value: string): string {
  return value.replace(/[.…]+$/u, '').trim();
}

function findingBlock(item: BriefFinding): string[] {
  const lines = [
    bullet(`${item.title} — ${item.statusLabel}`),
    bullet(
      t('brief.finding.status', { label: spoken(item.statusLabel) }),
      '  ',
    ),
  ];
  lines.push(
    bullet(t('brief.finding.proof', { proof: spoken(item.proof) }), '  '),
  );
  if (item.impact && !sameSentence(item.proof, item.impact)) {
    lines.push(
      bullet(t('brief.finding.impact', { impact: spoken(item.impact) }), '  '),
    );
  }
  return lines;
}

function catalogBlock(
  item: BriefFinding,
  catalog: ReadonlyMap<string, MethodeEntry>,
  sources: ReadonlyMap<string, readonly BriefSource[]>,
): string[] {
  const entry = catalog.get(item.checkId);
  const lines = [
    bullet(item.title),
    bullet(t('brief.ref.id', { id: item.checkId }), '  '),
  ];
  if (entry?.criterion) {
    lines.push(
      bullet(
        t('brief.ref.criterion', { criterion: spoken(entry.criterion) }),
        '  ',
      ),
    );
  }
  if (entry?.pass) {
    lines.push(bullet(t('brief.ref.pass', { pass: spoken(entry.pass) }), '  '));
  }
  const citation = referenceOf(
    sources.get(item.checkId) ?? [],
    entry?.citation ?? null,
  );
  if (citation) {
    lines.push(
      bullet(t('brief.ref.source', { citation: spoken(citation) }), '  '),
    );
  }
  return lines;
}

export function renderBriefBody(input: BriefDocument): string {
  const lines: string[] = [
    t('brief.h.role'),
    bullet(t('brief.role.fix', { url: input.url })),
    bullet(t('brief.role.dev')),
    '',
    t('brief.h.context'),
    bullet(t('brief.context.url', { url: input.url })),
  ];
  if (input.stack) {
    lines.push(bullet(t('brief.context.stack', { stack: input.stack })));
  }
  if (input.at) {
    lines.push(
      bullet(t('brief.context.date', { date: formatDateTime(input.at) })),
    );
  }
  lines.push('', t('brief.h.findings'));
  for (const item of input.findings) lines.push(...findingBlock(item));
  lines.push('', t('brief.h.catalog'));
  for (const item of input.findings) {
    lines.push(...catalogBlock(item, input.catalog, input.sources));
  }
  lines.push(
    '',
    t('brief.h.expected'),
    bullet(t('brief.expected.diff')),
    bullet(t('brief.expected.stack')),
    bullet(t('brief.expected.score')),
    '',
    t('brief.h.guards'),
    bullet(t('brief.guard.secret')),
    bullet(t('brief.guard.prod')),
    bullet(t('brief.guard.scope')),
    bullet(t('brief.guard.ask')),
    bullet(t('brief.guard.attack')),
  );
  return `${lines.join('\n')}\n`;
}

export function renderBrief(input: BriefDocument): string {
  const body = renderBriefBody(input);
  if (!input.includeTerminal) return body;
  const terminal = renderTerminal(input.findings);
  if (terminal === '') return body;
  return `${body}\n${terminal}`;
}
