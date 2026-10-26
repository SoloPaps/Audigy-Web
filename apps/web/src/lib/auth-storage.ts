import { authConfigured } from './public-config.js';

/** Même clé que la session Supabase. Jamais un secret dans le code. */
export const AUTH_STORAGE_KEY = 'audigy-auth';

/** Vrai si le navigateur a déjà une session utilisable, sans client Supabase. */
export function storedSessionPresent(): boolean {
  if (!authConfigured()) return false;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      access_token?: unknown;
      expires_at?: unknown;
    };
    if (typeof parsed.access_token !== 'string' || parsed.access_token === '') {
      return false;
    }
    if (
      typeof parsed.expires_at === 'number' &&
      parsed.expires_at * 1000 <= Date.now()
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
