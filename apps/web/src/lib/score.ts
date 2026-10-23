import { type MessageKey, t } from '../i18n/index.js';

export const LEVELS = ['good', 'improve', 'problem', 'untested'] as const;
export type Level = (typeof LEVELS)[number];

export const GAUGE = {
  cx: 80,
  cy: 68,
  r: 54,
  viewBox: '0 0 160 120',
} as const;

const SENTENCE: Record<Level, MessageKey> = {
  good: 'level.good.sentence',
  improve: 'level.improve.sentence',
  problem: 'level.problem.sentence',
  untested: 'level.untested.sentence',
};

const LABEL: Record<Level, MessageKey> = {
  good: 'level.good',
  improve: 'level.improve',
  problem: 'level.problem',
  untested: 'level.untested',
};

export function levelForScore(score: number | null): Level {
  if (score === null) return 'untested';
  if (score >= 80) return 'good';
  if (score >= 50) return 'improve';
  return 'problem';
}

export function levelLabel(level: Level): string {
  return t(LABEL[level]);
}

export function gaugeLabel(domain: string, score: number | null): string {
  const level = levelForScore(score);
  if (score === null) {
    return t('gauge.untested', { domain, level: t(SENTENCE[level]) });
  }
  return t('gauge.score', { domain, score, level: t(SENTENCE[level]) });
}

function point(
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Arc de 270°, ouverture en bas. Pas un donut fermé. */
export function gaugeArc(cx: number, cy: number, r: number): string {
  const start = 135;
  const end = start + 270;
  const a = point(cx, cy, r, start);
  const b = point(cx, cy, r, end);
  return `M ${round(a.x)} ${round(a.y)} A ${r} ${r} 0 1 1 ${round(b.x)} ${round(b.y)}`;
}
