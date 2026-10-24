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

/** « 23 oct. 2026 », fuseau Europe/Paris. Jour civil seulement. */
export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

const clockFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * « 23 oct. 2026, 14 h 30 », fuseau Europe/Paris.
 * Heure sur 24 h, minutes toujours présentes.
 */
export function formatDateTime(date: Date): string {
  const parts = clockFormat.formatToParts(date);
  const hourRaw = parts.find((part) => part.type === 'hour')?.value ?? '0';
  const minuteRaw = parts.find((part) => part.type === 'minute')?.value ?? '00';
  let hour = Number(hourRaw);
  if (!Number.isFinite(hour) || hour === 24) hour = 0;
  const minute = minuteRaw.replace(/\D/gu, '').padStart(2, '0').slice(-2);
  return `${formatDate(date)}, ${hour} h ${minute}`;
}
