import {
  parseRgesnResponses,
  RGESN_QUESTIONS,
  type RgesnAnswer,
  type RgesnResponse,
  rgesnProgress,
} from '@audigy/engine/questionnaire';

const ANSWERS = new Set<RgesnAnswer>(['oui', 'partiel', 'non', 'na']);

/** Ne garde que les questions cochées. Une case vide n’est pas un échec. */
export function collectRgesn(
  values: Readonly<Record<string, string>>,
): RgesnResponse[] {
  const rows: RgesnResponse[] = [];
  for (const question of RGESN_QUESTIONS) {
    const answer = values[question.id];
    if (!answer || !ANSWERS.has(answer as RgesnAnswer)) continue;
    rows.push({ id: question.id, answer: answer as RgesnAnswer });
  }
  return parseRgesnResponses(rows);
}

export function rgesnSummary(values: Readonly<Record<string, string>>): {
  answered: number;
  total: number;
} {
  return rgesnProgress(collectRgesn(values));
}
