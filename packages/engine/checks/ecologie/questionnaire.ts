/**
 * Schéma du questionnaire RGESN 2024. Pas d’interface : les réponses
 * seront saisies plus tard. Les critères observés automatiquement restent
 * posés, parce que la mesure ne couvre qu’une page.
 */
export const RGESN_VERSION = '2024';

export const RGESN_THEMES = [
  'strategie',
  'specifications',
  'architecture',
  'ux',
  'contenus',
  'frontend',
  'backend',
  'hebergement',
  'algorithmie',
] as const;
export type RgesnTheme = (typeof RGESN_THEMES)[number];

export const RGESN_ANSWERS = ['oui', 'partiel', 'non', 'na'] as const;
export type RgesnAnswer = (typeof RGESN_ANSWERS)[number];

export interface RgesnQuestion {
  /** Numéro officiel, par exemple `4.8`. */
  id: string;
  theme: RgesnTheme;
  /** Clé i18n du libellé court. */
  promptKey: string;
  /** Check qui observe déjà une partie du critère. */
  observedBy?: string;
}

export interface RgesnResponse {
  id: string;
  answer: RgesnAnswer;
}

export interface RgesnProgress {
  answered: number;
  total: number;
}

export class RgesnSchemaError extends Error {
  override readonly name = 'RgesnSchemaError';
}

const ANSWERS = new Set<string>(RGESN_ANSWERS);

const OBSERVED = new Map<string, string>([
  ['4.8', 'ecologie.rgesn_polices'],
  ['5.1', 'ecologie.rgesn_images'],
  ['6.1', 'ecologie.rgesn_budget'],
  ['6.2', 'ecologie.rgesn_cache'],
  ['6.3', 'ecologie.rgesn_compression'],
]);

export const RGESN_QUESTIONS: readonly RgesnQuestion[] = [
  ...range('strategie', 1, 10),
  ...range('specifications', 2, 10),
  ...range('architecture', 3, 7),
  ...range('ux', 4, 15),
  ...range('contenus', 5, 8),
  ...range('frontend', 6, 7),
  ...range('backend', 7, 4),
  ...range('hebergement', 8, 10),
  ...range('algorithmie', 9, 7),
].map(markObserved);

const BY_ID = new Map(
  RGESN_QUESTIONS.map((question) => [question.id, question]),
);

export function rgesnQuestion(id: string): RgesnQuestion | undefined {
  return BY_ID.get(id);
}

export function parseRgesnResponses(input: unknown): RgesnResponse[] {
  if (!Array.isArray(input)) fail('la réponse doit être une liste');
  const seen = new Set<string>();
  const responses: RgesnResponse[] = [];
  for (const item of input) {
    const record = asRecord(item);
    if (!record) fail('chaque réponse doit être un objet');
    const keys = Object.keys(record).sort();
    if (keys.length !== 2 || keys[0] !== 'answer' || keys[1] !== 'id') {
      fail('champs attendus : id et answer');
    }
    const id = record.id;
    const answer = record.answer;
    if (typeof id !== 'string' || !BY_ID.has(id)) {
      fail(`critère inconnu : ${shown(id)}`);
    }
    if (seen.has(id)) fail(`critère en double : ${id}`);
    if (typeof answer !== 'string' || !ANSWERS.has(answer)) {
      fail(`réponse invalide pour ${id}`);
    }
    seen.add(id);
    responses.push({ id, answer: answer as RgesnAnswer });
  }
  return responses;
}

export function rgesnProgress(
  responses: readonly RgesnResponse[],
): RgesnProgress {
  return { answered: responses.length, total: RGESN_QUESTIONS.length };
}

function range(
  theme: RgesnTheme,
  major: number,
  count: number,
): RgesnQuestion[] {
  return Array.from({ length: count }, (_item, index) => {
    const id = `${major}.${index + 1}`;
    return { id, theme, promptKey: `rgesn.${id}` };
  });
}

function markObserved(question: RgesnQuestion): RgesnQuestion {
  const observed = OBSERVED.get(question.id);
  if (!observed) return question;
  return { ...question, observedBy: observed };
}

function fail(message: string): never {
  throw new RgesnSchemaError(message);
}

function shown(value: unknown): string {
  return typeof value === 'string' ? value : 'valeur illisible';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
}
