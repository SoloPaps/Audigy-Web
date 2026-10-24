export interface CauseLine {
  text: string;
  searchConsole: boolean;
}

/** Causes internes d’un domaine sans note. Rapport du propriétaire seulement. */
export interface UntestedCauses {
  primary: CauseLine | null;
  others: CauseLine[];
  closing: string;
}

export interface CategoryItem {
  id: string;
  label: string;
  technical: string;
  detail: string;
  score: number | null;
  href?: string;
  /** Phrase déjà fournie quand la couverture est sous 50 %. */
  coverageNote?: string | null;
  /** Absent du score public : pas de cause interne. */
  causes?: UntestedCauses;
}

/** Moyenne des domaines notés. Les domaines sans score sont exclus. */
export function globalScore(items: readonly CategoryItem[]): number | null {
  const scored = items.filter((item) => item.score !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((total, item) => total + (item.score ?? 0), 0);
  return Math.round(sum / scored.length);
}
