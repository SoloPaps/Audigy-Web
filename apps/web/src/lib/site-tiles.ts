export interface SiteAuditRow {
  id: string;
  site_id: string;
  status: string;
  global_score: number | null;
  finished_at: string | null;
  created_at: string;
}

export interface SiteMark {
  auditId: string;
  at: string;
  score: number | null;
}

/** Première ligne `done` ou `partial` de chaque site. L’appelant trie du plus récent au plus ancien. */
export function latestAuditBySite(
  rows: readonly SiteAuditRow[],
): Map<string, SiteMark> {
  const marks = new Map<string, SiteMark>();
  for (const row of rows) {
    if (row.status !== 'done' && row.status !== 'partial') continue;
    if (marks.has(row.site_id)) continue;
    marks.set(row.site_id, {
      auditId: row.id,
      at: row.finished_at ?? row.created_at,
      score: row.global_score,
    });
  }
  return marks;
}
