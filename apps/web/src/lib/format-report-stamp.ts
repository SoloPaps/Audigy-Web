import { formatDateTime } from '../i18n/format.js';

/** Date et heure du pied de rapport, une seule mise en forme. */
export function formatReportStamp(date: Date): string {
  return formatDateTime(date);
}
