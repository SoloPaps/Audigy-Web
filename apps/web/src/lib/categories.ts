export interface CategoryItem {
  id: string;
  label: string;
  technical: string;
  detail: string;
  score: number | null;
}

/** Moyenne des domaines notés. Les domaines sans score sont exclus. */
export function globalScore(items: readonly CategoryItem[]): number | null {
  const scored = items.filter((item) => item.score !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((total, item) => total + (item.score ?? 0), 0);
  return Math.round(sum / scored.length);
}
