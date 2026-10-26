import { t } from '../i18n/index.js';
import type { ReportRow } from './report-model.js';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Actor = 'owner' | 'developer' | 'sysadmin';

export interface Priority {
  id: string;
  checkId: string;
  title: string;
  why: string;
  minutes: number | null;
  difficulty: Difficulty;
  actor: Actor;
  fixKey: string | null;
}

/** Durée inconnue : une demi-heure, pour ne favoriser ni le court ni le long. */
const DEFAULT_MINUTES = 30;
/** Un deuxième constat du même domaine passe après les autres, sans disparaître. */
const SAME_DOMAIN = 0.7;

export function difficultyOf(minutes: number | null): Difficulty {
  if (minutes === null) return 'medium';
  if (minutes <= 15) return 'easy';
  if (minutes <= 60) return 'medium';
  return 'hard';
}

export function actorOf(domain: string): Actor {
  if (domain === 'dns_email') return 'sysadmin';
  if (domain === 'seo') return 'owner';
  return 'developer';
}

/** Impact sur la note × facilité. Les échecs pèsent plus que les avertissements. */
export function priorityValue(row: ReportRow): number {
  const minutes = row.minutes ?? DEFAULT_MINUTES;
  const ease = 1 / (1 + minutes / DEFAULT_MINUTES);
  const status = row.catalogStatus === 'fail' ? 2 : 1;
  return row.severity * row.impact * status * ease;
}

export function whyOf(checkId: string): string {
  if (checkId === 'dns_email.dmarc') return t('priorities.why.dmarc');
  if (checkId === 'dns_email.spf') return t('priorities.why.spf');
  if (checkId === 'dns_email.dkim') return t('priorities.why.dkim');
  if (checkId === 'securite.hsts') return t('priorities.why.hsts');
  if (checkId === 'securite.https') return t('priorities.why.https');
  if (checkId === 'securite.xcto') return t('priorities.why.xcto');
  if (checkId === 'securite.frames') return t('priorities.why.frames');
  if (checkId === 'securite.csp') return t('priorities.why.csp');
  if (checkId === 'qualite.images_poids' || checkId === 'performance.poids') {
    return t('priorities.why.images_poids');
  }
  if (checkId === 'qualite.images_dimensions') {
    return t('priorities.why.images_dimensions');
  }
  if (checkId.startsWith('accessibilite.')) {
    return t('priorities.why.accessibilite');
  }
  if (checkId === 'seo.title') return t('priorities.why.seo_title');
  if (checkId === 'seo.description') return t('priorities.why.seo_description');
  if (checkId === 'vie_privee.traceurs') return t('priorities.why.traceurs');
  if (
    checkId === 'performance.compression' ||
    checkId === 'ecologie.rgesn_compression'
  ) {
    return t('priorities.why.compression');
  }
  return t('priorities.why.default');
}

/**
 * Les trois actions qui paient le plus pour le moins d’effort, tous domaines.
 * Seuls les échecs et les avertissements comptent : jamais un « non testé ».
 */
export function pickPriorities(
  rows: readonly ReportRow[],
  limit = 3,
): Priority[] {
  const pool = rows.filter(
    (row) => row.catalogStatus === 'fail' || row.catalogStatus === 'warn',
  );
  const chosen: ReportRow[] = [];
  const seen = new Map<string, number>();
  while (chosen.length < limit && chosen.length < pool.length) {
    let best: ReportRow | null = null;
    let bestValue = -1;
    for (const row of pool) {
      if (chosen.includes(row)) continue;
      const repeats = seen.get(row.domain ?? '') ?? 0;
      const value = priorityValue(row) * SAME_DOMAIN ** repeats;
      if (
        value > bestValue ||
        (value === bestValue && best !== null && row.checkId < best.checkId)
      ) {
        best = row;
        bestValue = value;
      }
    }
    if (best === null) break;
    chosen.push(best);
    seen.set(best.domain ?? '', (seen.get(best.domain ?? '') ?? 0) + 1);
  }
  return chosen.map((row) => ({
    id: row.id,
    checkId: row.checkId,
    title: row.title,
    why: whyOf(row.checkId),
    minutes: row.minutes ?? null,
    difficulty: difficultyOf(row.minutes ?? null),
    actor: actorOf(row.domain ?? ''),
    fixKey: row.fixKey ?? null,
  }));
}
