interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function storage(): WebStorage {
  return (globalThis as unknown as { localStorage: WebStorage }).localStorage;
}

/** N’accepte qu’un chemin du site, pour éviter une redirection ouverte. */
export function safeNext(
  raw: string | null | undefined,
  fallback = '/sites',
): string {
  if (!raw) return fallback;
  if (raw.length > 512) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.includes('\\')) return fallback;
  if (raw.includes('://')) return fallback;
  if (raw.includes('\n') || raw.includes('\r')) return fallback;
  return raw;
}

export const NEXT_STORAGE_KEY = 'audigy-next';

export function rememberNext(next: string): void {
  storage().setItem(NEXT_STORAGE_KEY, safeNext(next));
}

export function takeNext(fallback = '/sites'): string {
  const stored = storage().getItem(NEXT_STORAGE_KEY);
  storage().removeItem(NEXT_STORAGE_KEY);
  return safeNext(stored, fallback);
}

export function loginHref(next: string): string {
  return `/connexion?next=${encodeURIComponent(safeNext(next, '/sites'))}`;
}
