import { t } from '../i18n/index.js';
import type { BriefFinding } from './brief.js';

export type TerminalKind = 'headers' | 'cert' | 'dns' | 'lighthouse' | 'none';

const LIGHTHOUSE = new Set([
  'performance.lighthouse',
  'performance.lcp',
  'performance.inp',
  'performance.cls',
  'performance.poids',
  'performance.cache',
  'performance.compression',
  'seo.lighthouse',
  'accessibilite.lighthouse',
  'ecologie.rgesn_cache',
  'ecologie.rgesn_compression',
]);

export function terminalKind(checkId: string): TerminalKind {
  if (checkId === 'securite.certificate' || checkId === 'securite.tls') {
    return 'cert';
  }
  if (checkId.startsWith('dns_email.')) return 'dns';
  if (LIGHTHOUSE.has(checkId)) return 'lighthouse';
  if (
    checkId.startsWith('securite.') &&
    checkId !== 'securite.fichiers' &&
    checkId !== 'securite.listing' &&
    checkId !== 'securite.cve_scripts' &&
    checkId !== 'securite.cve_logiciels' &&
    checkId !== 'securite.technologies'
  ) {
    return 'headers';
  }
  return 'none';
}

const BANNED: readonly RegExp[] = [
  /\brm\s+-/u,
  /\bgit\s+push\s+--force\b/u,
  /\bgit\s+push\s+-f\b/u,
  /\bdrop\s+database\b/iu,
  /\bdrop\s+table\b/iu,
  /NVD_API_KEY/u,
  /service_role/u,
  /cookie\s*=/iu,
  /OWASP/u,
];

export function briefViolations(text: string): string[] {
  return BANNED.filter((pattern) => pattern.test(text)).map(
    (pattern) => pattern.source,
  );
}

function suggestion(kind: TerminalKind): string {
  if (kind === 'headers') return t('brief.terminal.headers');
  if (kind === 'cert') return t('brief.terminal.cert');
  if (kind === 'dns') return t('brief.terminal.dns');
  if (kind === 'lighthouse') return t('brief.terminal.lh');
  return t('brief.terminal.active');
}

export function renderTerminal(findings: readonly BriefFinding[]): string {
  const chosen = findings.filter(
    (item) => item.terminal === 'verif' || item.terminal === 'fix',
  );
  if (chosen.length === 0) return '';
  const lines = [
    t('brief.h.terminal'),
    `- ${t('brief.terminal.origin')}`,
    `- ${t('brief.terminal.ban')}`,
    `- ${t('brief.terminal.active')}`,
  ];
  for (const item of chosen) {
    const label =
      item.terminal === 'verif'
        ? t('brief.terminal.verif')
        : t('brief.terminal.fix');
    lines.push(`- ${item.title} — ${label}`);
    if (item.terminal === 'verif') {
      lines.push(`  - ${suggestion(terminalKind(item.checkId))}`);
    } else {
      lines.push(`  - ${t('brief.terminal.fixSuggest')}`);
      lines.push(`  - ${t('brief.terminal.guess')}`);
      lines.push(`  - ${t('brief.terminal.fixWrite')}`);
    }
    lines.push(`  - ${t('brief.terminal.absent')}`);
  }
  return `${lines.join('\n')}\n`;
}
