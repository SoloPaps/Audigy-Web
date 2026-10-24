import { co2 } from '@tgwf/co2';

/** CO2.js, modèle Sustainable Web Design, version 4. Estimation, pas une mesure. */
export const CO2_LIBRARY = '0.19.0';
export const CO2_MODEL = 'swd';
export const CO2_VERSION = 4;

const RATINGS = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'] as const;
export type Co2Rating = (typeof RATINGS)[number];

const estimator = new co2({ model: 'swd', version: 4, rating: true });

export interface VisitEstimate {
  grams: number;
  rating: Co2Rating;
}

/**
 * Grammes de CO2e pour une visite, avec les hypothèses de cache du modèle SWD.
 * `green` réduit la part du centre de données quand l’annuaire liste l’hôte.
 */
export function estimateVisit(
  bytes: number,
  green: boolean,
): VisitEstimate | null {
  if (!Number.isFinite(bytes) || bytes < 0) return null;
  const raw = estimator.perVisit(bytes, green);
  const grams = typeof raw === 'number' ? raw : raw.total;
  const rating = typeof raw === 'number' ? '' : raw.rating;
  if (!Number.isFinite(grams) || grams < 0) return null;
  if (!isRating(rating)) return null;
  return { grams, rating };
}

export function statusFromRating(rating: Co2Rating): 'pass' | 'warn' | 'fail' {
  if (rating === 'A+' || rating === 'A' || rating === 'B') return 'pass';
  if (rating === 'C' || rating === 'D') return 'warn';
  return 'fail';
}

export function formatGrams(grams: number): string {
  if (grams < 0.005) return 'moins de 0,01';
  return grams.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isRating(value: string): value is Co2Rating {
  return (RATINGS as readonly string[]).includes(value);
}
