/** Échec d’un appel Search Console, sans détail technique. */
export type GscFailure = 'quota' | 'auth' | 'error';

export interface GscSitemapEntry {
  path: string;
  errors: number;
  warnings: number;
  pending: boolean;
  isIndex: boolean;
  submitted: number;
  indexed: number;
}

export type GscVerdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL';

export type GscListResult =
  | { ok: true; entries: GscSitemapEntry[] }
  | { ok: false; failure: GscFailure };

export type GscInspectResult =
  | { ok: true; verdict: GscVerdict }
  | { ok: false; failure: GscFailure };

/**
 * Photo d’un audit. `sites` décrit la liste des propriétés.
 * `property` est nulle si aucune ne couvre la page.
 */
export interface GscSnapshot {
  sites: 'ok' | GscFailure;
  property: string | null;
  sitemaps: GscListResult;
  inspection: GscInspectResult;
}

/** Adaptateur mockable. Absent de `ctx.net` : pas de jeton OAuth. */
export interface SearchConsolePort {
  snapshot(pageUrl: string, signal: AbortSignal): Promise<GscSnapshot>;
}
