/** Nombres, durées et dates affichés en français (Europe/Paris). */

const numberFormat = new Intl.NumberFormat('fr-FR');

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

/** « 1 234 » — espace fine insécable, convention fr-FR. */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** « 3,5 s ». */
export function formatDuration(seconds: number): string {
  return `${formatNumber(seconds)} s`;
}

/** « 23 oct. 2026 », fuseau Europe/Paris. */
export function formatDate(date: Date): string {
  return dateFormat.format(date);
}
