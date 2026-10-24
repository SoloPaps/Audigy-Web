import { createExternalApi, type ExternalApi } from '@audigy/net';
import type { RunContext } from './types.js';

/**
 * Branche le client des API tierces (PSI, CrUX, Green Web, OSV, NVD, KEV) s’il manque.
 * Green Web, OSV, NVD et KEV n’ont pas besoin de `GOOGLE_API_KEY`. Un client déjà
 * injecté est conservé.
 */
export function withExternalApi<T extends RunContext>(ctx: T): T {
  if (ctx.net.api) return ctx;
  const api: ExternalApi = createExternalApi();
  return { ...ctx, net: { ...ctx.net, api } };
}

/** Lit `NVD_API_KEY` (facultative). Vide ou absente : quota NVD sans clé. Jamais journalisée. */
export function nvdApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const value = env.NVD_API_KEY;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
