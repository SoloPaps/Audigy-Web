import { t } from '../i18n/index.js';
import { levelForScore, levelLabel } from './score.js';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Seuils alignés sur les niveaux : 80 = bien, 50 = à améliorer. */
export function gradeForScore(score: number | null): Grade | null {
  if (score === null || !Number.isFinite(score)) return null;
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  if (score >= 35) return 'E';
  return 'F';
}

export interface GradeCopy {
  grade: Grade;
  letter: string;
  label: string;
}

/** Note en lettre, libellé et /100. `null` quand le site n’a pas de note. */
export function gradeCopy(score: number | null): GradeCopy | null {
  const grade = gradeForScore(score);
  if (grade === null || score === null) return null;
  return {
    grade,
    letter: t('report.grade.letter', { grade }),
    label: t('report.grade.label', {
      label: levelLabel(levelForScore(score)),
      score: Math.round(score),
    }),
  };
}
