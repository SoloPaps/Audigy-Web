import { createExternalApi, type ExternalApi } from '@audigy/net';
import type { RunContext } from './types.js';

/** Lit `GOOGLE_API_KEY`. Vide ou absente : pas de source PSI/CrUX. Jamais journalisée. */
export function googleApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const value = env.GOOGLE_API_KEY;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Branche le client `@audigy/net` si la clé est présente.
 * Un client déjà injecté (test, cache) est conservé.
 */
export function withGoogleApi<T extends RunContext>(
  ctx: T,
  env: NodeJS.ProcessEnv = process.env,
): T {
  if (!googleApiKey(env) || ctx.net.api) return ctx;
  const api: ExternalApi = createExternalApi();
  return { ...ctx, net: { ...ctx.net, api } };
}
