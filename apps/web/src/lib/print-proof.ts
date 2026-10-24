const AUDIT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Identifiant lu dans `/rapport/<id>/imprimer`, sinon dans `?id=`. */
export function printAuditId(pathname: string, search: string): string | null {
  const fromPath = /^\/rapport\/([^/]+)\/imprimer\/?$/u.exec(pathname)?.[1];
  const raw = fromPath ?? new URLSearchParams(search).get('id') ?? '';
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return AUDIT_ID.test(id) ? id.toLowerCase() : null;
}

export interface PrintCapture {
  viewport: 'desktop' | 'mobile';
  capturedAt: string;
}

export interface PrintProof {
  resultsSha256: string | null;
  captures: PrintCapture[];
}

/** Champs facultatifs du GET d’audit. Absents tant que le manifeste n’est pas là. */
export function proofFromPayload(payload: unknown): PrintProof {
  const empty: PrintProof = { resultsSha256: null, captures: [] };
  if (!payload || typeof payload !== 'object') return empty;
  const proof = (payload as { proof?: unknown }).proof;
  if (!proof || typeof proof !== 'object') return empty;
  const record = proof as { resultsSha256?: unknown; captures?: unknown };
  const hash =
    typeof record.resultsSha256 === 'string' &&
    /^[0-9a-f]{64}$/u.test(record.resultsSha256)
      ? record.resultsSha256
      : null;
  const captures = Array.isArray(record.captures)
    ? record.captures.flatMap((item): PrintCapture[] => {
        if (!item || typeof item !== 'object') return [];
        const row = item as { viewport?: unknown; capturedAt?: unknown };
        if (row.viewport !== 'desktop' && row.viewport !== 'mobile') return [];
        if (typeof row.capturedAt !== 'string' || row.capturedAt === '')
          return [];
        const date = new Date(row.capturedAt);
        if (Number.isNaN(date.getTime())) return [];
        return [{ viewport: row.viewport, capturedAt: date.toISOString() }];
      })
    : [];
  return { resultsSha256: hash, captures };
}
