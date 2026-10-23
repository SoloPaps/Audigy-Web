import { type MessageKey, t } from '../i18n/index.js';
import type { FindingStatus } from './findings.js';
import { type Level, levelForScore } from './score.js';

const HEADLINE: Record<Level, MessageKey> = {
  good: 'verdict.good',
  improve: 'verdict.improve',
  problem: 'verdict.problem',
  untested: 'verdict.untested',
};

export interface VerdictCopy {
  level: Level;
  headline: string;
  detail: string;
}

function fixesSentence(fixes: number, urgent: number): string {
  if (fixes === 0) return t('verdict.fixes.none');
  if (fixes === 1) {
    return urgent === 1
      ? t('verdict.fixes.one.urgent')
      : t('verdict.fixes.one.calm');
  }
  if (urgent === 0) return t('verdict.fixes.many.calm', { count: fixes });
  if (urgent === 1) return t('verdict.fixes.many.one', { count: fixes });
  return t('verdict.fixes.many.many', { count: fixes, urgent });
}

function skippedSentence(count: number): string | null {
  if (count === 0) return null;
  if (count === 1) return t('verdict.skipped.one');
  return t('verdict.skipped.many', { count });
}

/** Phrase du haut de rapport, calculée à partir du score et des constats. */
export function verdictCopy(
  score: number | null,
  findings: readonly { status: FindingStatus }[],
): VerdictCopy {
  const level = levelForScore(score);
  const urgent = findings.filter((item) => item.status === 'fail').length;
  const fixes = findings.filter(
    (item) => item.status === 'fail' || item.status === 'warn',
  ).length;
  const skipped = findings.filter((item) => item.status === 'untested').length;
  const extra = skippedSentence(skipped);
  const fixesText = fixesSentence(fixes, urgent);
  return {
    level,
    headline: t(HEADLINE[level]),
    detail: extra ? `${fixesText} ${extra}` : fixesText,
  };
}
