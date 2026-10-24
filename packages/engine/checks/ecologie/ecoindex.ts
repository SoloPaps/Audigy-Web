/**
 * EcoIndex, formule publique (quantiles HTTP Archive, table EcoIndex 5.10.0).
 * Score arrondi à l’entier. GES et eau sont calculés sur cet entier.
 * Ce sont des estimations, pas une mesure physique.
 */
export const ECOINDEX_QUANTILE_TABLE = 'ecoindex-5.10.0';
/** L’unité publiée de la formule est le kilooctet décimal. */
export const ECOINDEX_BYTES_PER_KB = 1000;

const QUANTILES_DOM = [
  0, 47, 75, 159, 233, 298, 358, 417, 476, 537, 603, 674, 753, 843, 949, 1076,
  1237, 1459, 1801, 2479, 594601,
];
const QUANTILES_REQ = [
  0, 2, 15, 25, 34, 42, 49, 56, 63, 70, 78, 86, 95, 105, 117, 130, 147, 170,
  205, 281, 3920,
];
const QUANTILES_SIZE = [
  0, 1.37, 144.7, 319.53, 479.46, 631.97, 783.38, 937.91, 1098.62, 1265.47,
  1448.32, 1648.27, 1876.08, 2142.06, 2465.37, 2866.31, 3401.59, 4155.73,
  5400.08, 8037.54, 223212.26,
];

const GRADE_FLOOR = { A: 80, B: 70, C: 55, D: 40, E: 25, F: 10 } as const;
export const ECOINDEX_GRADES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type EcoGrade = (typeof ECOINDEX_GRADES)[number];

export interface EcoIndexInput {
  dom: number;
  requests: number;
  /** Poids transféré, en kilooctets décimaux (1 Ko = 1 000 octets). */
  sizeKb: number;
}

export interface EcoIndexValue {
  score: number;
  grade: EcoGrade;
  /** Grammes équivalent CO2 de la formule EcoIndex, pas le modèle SWD. */
  ges: number;
  /** Centilitres, formule EcoIndex. */
  water: number;
}

export function sizeKbFromBytes(bytes: number): number {
  return bytes / ECOINDEX_BYTES_PER_KB;
}

/** Arrondi moitié-pair, comme l’arrondi publié de la formule. */
export function roundHalfEven(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const floor = Math.floor(abs);
  const fraction = abs - floor;
  if (Math.abs(fraction - 0.5) < 1e-8) {
    return sign * (floor % 2 === 0 ? floor : floor + 1);
  }
  return sign * Math.round(abs);
}

export function computeEcoIndex(input: EcoIndexInput): EcoIndexValue | null {
  if (
    !whole(input.dom) ||
    !whole(input.requests) ||
    !Number.isFinite(input.sizeKb) ||
    input.sizeKb < 0
  ) {
    return null;
  }
  const raw =
    100 -
    (5 *
      (3 * quantile(QUANTILES_DOM, input.dom) +
        2 * quantile(QUANTILES_REQ, input.requests) +
        quantile(QUANTILES_SIZE, input.sizeKb))) /
      6;
  const score = Math.min(100, Math.max(0, roundHalfEven(raw)));
  return {
    score,
    grade: gradeOf(score),
    ges: greenhouseGases(score),
    water: waterCl(score),
  };
}

export function gradeOf(score: number): EcoGrade {
  for (const grade of ['A', 'B', 'C', 'D', 'E', 'F'] as const) {
    if (score > GRADE_FLOOR[grade]) return grade;
  }
  return 'G';
}

export function greenhouseGases(score: number): number {
  return roundHalfEven(100 * (2 + (2 * (50 - score)) / 100)) / 100;
}

export function waterCl(score: number): number {
  return roundHalfEven(100 * (3 + (3 * (50 - score)) / 100)) / 100;
}

function whole(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function quantile(bounds: readonly number[], value: number): number {
  for (let i = 1; i < bounds.length; i += 1) {
    const upper = bounds[i] as number;
    const lower = bounds[i - 1] as number;
    if (value < upper) return i - 1 + (value - lower) / (upper - lower);
  }
  return bounds.length - 1;
}
