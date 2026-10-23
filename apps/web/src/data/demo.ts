import { type MessageKey, t } from '../i18n/index.js';
import { type CategoryItem, globalScore } from '../lib/categories.js';
import type { Finding, FindingStatus } from '../lib/findings.js';
import type { Level } from '../lib/score.js';

const CATEGORIES: readonly {
  id: string;
  label: MessageKey;
  score: number | null;
}[] = [
  { id: 'performance', label: 'domain.performance', score: 64 },
  { id: 'seo', label: 'domain.seo', score: 88 },
  { id: 'securite', label: 'domain.securite', score: 41 },
  { id: 'ecologie', label: 'domain.ecologie', score: 70 },
  { id: 'accessibilite', label: 'domain.accessibilite', score: 76 },
  { id: 'qualite', label: 'domain.qualite', score: 91 },
  { id: 'vie_privee', label: 'domain.vie_privee', score: 74 },
  { id: 'dns_email', label: 'domain.dns_email', score: null },
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
    status: 'fail',
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

export interface DemoCell {
  text: string;
  level?: Level;
  numeric?: boolean;
}

export function demoTable(): {
  columns: { key: string; label: string }[];
  rows: DemoCell[][];
} {
  return {
    columns: [
      { key: 'date', label: t('table.date') },
      { key: 'score', label: t('table.score') },
      { key: 'level', label: t('table.level') },
    ],
    rows: [
      [
        { text: t('table.row1.date') },
        { text: '60', numeric: true },
        { text: '', level: 'improve' },
      ],
      [
        { text: t('table.row2.date') },
        { text: '72', numeric: true },
        { text: '', level: 'improve' },
      ],
    ],
  };
}
