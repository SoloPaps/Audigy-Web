import { createExternalApi, type ExternalApi } from '@audigy/net';
import type { RunContext } from './types.js';

/**
 * Branche le client des API tierces (PSI, CrUX, Green Web) s’il manque.
 * Green Web n’a pas besoin de `GOOGLE_API_KEY`. Un client déjà injecté est conservé.
 */
export function withExternalApi<T extends RunContext>(ctx: T): T {
  if (ctx.net.api) return ctx;
  const api: ExternalApi = createExternalApi();
  return { ...ctx, net: { ...ctx.net, api } };
}
