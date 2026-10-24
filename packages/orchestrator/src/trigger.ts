import { createHmac, timingSafeEqual } from 'node:crypto';

/** En-tête signé par `api-audits-create` pour réveiller `audit-run-background`. */
export const TRIGGER_HEADER = 'x-audigy-trigger';
export const TRIGGER_MAX_AGE_MS = 5 * 60_000;
/** Chemin par défaut de la fonction (pas de `config.path` pour un background). */
export const RUN_FUNCTION_PATH = '/.netlify/functions/audit-run-background';

function mac(key: string, timestamp: number): string {
  return createHmac('sha256', key)
    .update(`audigy-trigger:${timestamp}`)
    .digest('hex');
}

/** Valeur d'en-tête `<ms>.<hmac>`, clé = `SUPABASE_SERVICE_ROLE_KEY` (déjà côté fonctions). */
export function signTrigger(key: string, now: number = Date.now()): string {
  return `${now}.${mac(key, now)}`;
}

export function verifyTrigger(
  key: string,
  header: string | null,
  now: number = Date.now(),
): boolean {
  if (!key || !header) return false;
  const match = /^(\d{1,16})\.([0-9a-f]{64})$/.exec(header);
  if (!match) return false;
  const timestamp = Number(match[1]);
  if (Math.abs(now - timestamp) > TRIGGER_MAX_AGE_MS) return false;
  const expected = Buffer.from(mac(key, timestamp), 'hex');
  const given = Buffer.from(match[2] as string, 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function createTrigger(options: {
  origin: string;
  key: string;
  fetch?: typeof globalThis.fetch;
}): () => Promise<void> {
  const doFetch = options.fetch ?? globalThis.fetch;
  return async () => {
    const res = await doFetch(new URL(RUN_FUNCTION_PATH, options.origin), {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: { [TRIGGER_HEADER]: signTrigger(options.key) },
    });
    await res.body?.cancel();
    if (res.status >= 400) throw new Error('trigger_rejected');
  };
}
