import { formatDate, type MessageKey, t } from '../i18n/index.js';
import { type CategoryItem, globalScore } from '../lib/categories.js';
import type { Finding, FindingStatus } from '../lib/findings.js';
import type {
  AuditSnapshot,
  ComparedIssue,
  HistoryPoint,
  HistorySeries,
} from '../lib/history.js';

const CATEGORIES: readonly {
  id: string;
  label: MessageKey;
  technical: MessageKey;
  detail: MessageKey;
  score: number | null;
}[] = [
  {
    id: 'performance',
    label: 'domain.performance.plain',
    technical: 'domain.performance.tech',
    detail: 'domain.performance.detail',
    score: 86,
  },
  {
    id: 'seo',
    label: 'domain.seo.plain',
    technical: 'domain.seo.tech',
    detail: 'domain.seo.detail',
    score: 100,
  },
  {
    id: 'securite',
    label: 'domain.securite.plain',
    technical: 'domain.securite.tech',
    detail: 'domain.securite.detail',
    score: 41,
  },
  {
    id: 'ecologie',
    label: 'domain.ecologie.plain',
    technical: 'domain.ecologie.tech',
    detail: 'domain.ecologie.detail',
    score: 84,
  },
  {
    id: 'accessibilite',
    label: 'domain.accessibilite.plain',
    technical: 'domain.accessibilite.tech',
    detail: 'domain.accessibilite.detail',
    score: 90,
  },
  {
    id: 'qualite',
    label: 'domain.qualite.plain',
    technical: 'domain.qualite.tech',
    detail: 'domain.qualite.detail',
    score: 94,
  },
  {
    id: 'vie_privee',
    label: 'domain.vie_privee.plain',
    technical: 'domain.vie_privee.tech',
    detail: 'domain.vie_privee.detail',
    score: 88,
  },
  {
    id: 'dns_email',
    label: 'domain.dns_email.plain',
    technical: 'domain.dns_email.tech',
    detail: 'domain.dns_email.detail',
    score: null,
  },
];

interface RawFinding {
  id: string;
  status: FindingStatus;
  severity: 1 | 2 | 3 | 4;
  impact: 1 | 2 | 3;
  title: MessageKey;
  why: MessageKey;
  effort: string;
  steps: MessageKey[];
  code?: MessageKey;
  sourceLabel?: MessageKey;
  sourceHref?: string;
}

const FINDINGS: readonly RawFinding[] = [
  {
    id: 'https',
    status: 'fail',
    severity: 4,
    impact: 3,
    title: 'demo.https.title',
    why: 'demo.https.why',
    effort: t('finding.effort', { minutes: 20 }),
    steps: ['demo.https.s1', 'demo.https.s2', 'demo.https.s3'],
    code: 'demo.https.code',
    sourceLabel: 'demo.https.source',
    sourceHref:
      'https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security',
  },
  {
    id: 'frame',
    status: 'warn',
    severity: 3,
    impact: 2,
    title: 'demo.frame.title',
    why: 'demo.frame.why',
    effort: t('finding.effort', { minutes: 15 }),
    steps: ['demo.frame.s1', 'demo.frame.s2'],
    sourceLabel: 'demo.frame.source',
    sourceHref:
      'https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers/X-Frame-Options',
  },
  {
    id: 'images',
    status: 'warn',
    severity: 2,
    impact: 2,
    title: 'demo.image.title',
    why: 'demo.image.why',
    effort: t('finding.effort', { minutes: 30 }),
    steps: ['demo.image.s1', 'demo.image.s2'],
  },
  {
    id: 'description',
    status: 'warn',
    severity: 2,
    impact: 1,
    title: 'demo.desc.title',
    why: 'demo.desc.why',
    effort: t('finding.effort', { minutes: 10 }),
    steps: ['demo.desc.s1', 'demo.desc.s2'],
  },
  {
    id: 'cookies',
    status: 'untested',
    severity: 1,
    impact: 2,
    title: 'demo.cookie.title',
    why: 'demo.cookie.why',
    effort: t('finding.unknown'),
    steps: ['demo.cookie.s1'],
  },
  {
    id: 'title',
    status: 'pass',
    severity: 1,
    impact: 1,
    title: 'demo.title.title',
    why: 'demo.title.why',
    effort: t('finding.done'),
    steps: ['demo.title.s1'],
  },
  {
    id: 'lang',
    status: 'pass',
    severity: 1,
    impact: 1,
    title: 'demo.lang.title',
    why: 'demo.lang.why',
    effort: t('finding.done'),
    steps: ['demo.lang.s1'],
  },
];

export function demoCategories(): CategoryItem[] {
  return CATEGORIES.map((item) => ({
    id: item.id,
    label: t(item.label),
    technical: t(item.technical),
    detail: t(item.detail),
    score: item.score,
  }));
}

export function demoGlobalScore(): number | null {
  return globalScore(demoCategories());
}

export function demoFindings(): Finding[] {
  return FINDINGS.map((item) => {
    const finding: Finding = {
      id: item.id,
      status: item.status,
      severity: item.severity,
      impact: item.impact,
      title: t(item.title),
      why: t(item.why),
      effort: item.effort,
      steps: item.steps.map((step) => t(step)),
    };
    if (item.code) finding.code = t(item.code);
    if (item.sourceLabel) finding.sourceLabel = t(item.sourceLabel);
    if (item.sourceHref) finding.sourceHref = item.sourceHref;
    return finding;
  });
}

const HISTORY_AT = {
  mars: '2026-03-03T08:00:00.000Z',
  juin: '2026-06-02T08:00:00.000Z',
  oct: '2026-10-23T12:30:00.000Z',
} as const;

export function demoHistorySeries(): HistorySeries[] {
  return [
    { id: 'global', label: t('domain.global') },
    { id: 'performance', label: t('domain.performance.plain') },
    { id: 'securite', label: t('domain.securite.plain') },
    { id: 'seo', label: t('domain.seo.plain') },
  ];
}

export function demoHistoryInitial(): string[] {
  return ['global', 'performance', 'securite'];
}

export function demoHistoryPoints(): HistoryPoint[] {
  const rows: {
    id: keyof typeof HISTORY_AT;
    global: number;
    performance: number;
    securite: number;
    seo: number;
  }[] = [
    { id: 'mars', global: 71, performance: 64, securite: 55, seo: 90 },
    { id: 'juin', global: 76, performance: 70, securite: 48, seo: 92 },
    { id: 'oct', global: 83, performance: 86, securite: 41, seo: 100 },
  ];
  return rows.map((row) => ({
    id: row.id,
    at: HISTORY_AT[row.id],
    href: `#audit-${row.id}`,
    scores: {
      global: row.global,
      performance: row.performance,
      securite: row.securite,
      seo: row.seo,
    },
  }));
}

function issue(
  id: string,
  title: MessageKey,
  status: FindingStatus,
): ComparedIssue {
  return { id, title: t(title), status, href: `#finding-${id}` };
}

export function demoAuditSnapshots(): AuditSnapshot[] {
  return (Object.keys(HISTORY_AT) as (keyof typeof HISTORY_AT)[]).map((id) => {
    const at = HISTORY_AT[id];
    const findings: ComparedIssue[] = [
      issue('https', 'demo.https.title', 'fail'),
      issue('title', 'demo.title.title', 'pass'),
    ];
    if (id === 'mars')
      findings.push(issue('frame', 'demo.frame.title', 'warn'));
    if (id === 'juin') {
      findings.push(
        issue('frame', 'demo.frame.title', 'warn'),
        issue('images', 'demo.image.title', 'warn'),
      );
    }
    if (id === 'oct') {
      findings.push(
        issue('frame', 'demo.frame.title', 'pass'),
        issue('images', 'demo.image.title', 'warn'),
        issue('cookies', 'demo.cookie.title', 'untested'),
      );
    }
    return { id, at, label: formatDate(new Date(at)), findings };
  });
}
