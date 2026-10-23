import { googleApiKey } from '../../src/google-api.js';
import type { Check, CheckContext } from '../../src/types.js';
import { type DayCache, memoryDayCache } from './cache.js';
import {
  judgeCache,
  judgeCls,
  judgeCompression,
  judgeInp,
  judgeLcp,
  judgeLighthouse,
  judgeWeight,
} from './judge.js';
import { loadCrux, loadPsi } from './load.js';
import {
  CRUX_CHECK_TIMEOUT_MS,
  CRUX_SHARED_KEY,
  type CruxBundle,
  PERFORMANCE_CHECK_TIMEOUT_MS,
  PSI_SHARED_KEY,
  type PsiBundle,
} from './types.js';

export type { CruxBundle, PsiBundle } from './types.js';
export {
  CRUX_ATTEMPT_TIMEOUT_MS,
  CRUX_SHARED_KEY,
  PSI_ATTEMPT_TIMEOUT_MS,
  PSI_SHARED_KEY,
} from './types.js';

export interface PerformanceCheckOptions {
  /** Lue à chaque audit. Absente : les tests restent « Non testé », sans appel. */
  apiKey: () => string | undefined;
  cache?: DayCache;
}

export function createPerformanceChecks(
  options: PerformanceCheckOptions,
): Check[] {
  const cache = options.cache ?? memoryDayCache();

  function getPsi(ctx: CheckContext): Promise<PsiBundle> {
    const apiKey = options.apiKey();
    const api = ctx.net.api;
    if (!api || !apiKey) {
      return ctx.shared.get(PSI_SHARED_KEY, async () => ({
        ok: false as const,
        reason: 'missing_key' as const,
      }));
    }
    return loadPsi(ctx, api, apiKey, cache);
  }

  function getCrux(ctx: CheckContext): Promise<CruxBundle> {
    const apiKey = options.apiKey();
    const api = ctx.net.api;
    if (!api || !apiKey) {
      return ctx.shared.get(CRUX_SHARED_KEY, async () => ({
        ok: false as const,
        reason: 'missing_key' as const,
      }));
    }
    return loadCrux(ctx, api, apiKey, cache);
  }

  const lighthouse: Check = {
    id: 'performance.lighthouse',
    domain: 'performance',
    mode: 'passive',
    needs: ['psi'],
    weight: 3,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeLighthouse(await getPsi(ctx));
    },
  };
  const lcp: Check = {
    id: 'performance.lcp',
    domain: 'performance',
    mode: 'passive',
    needs: ['crux'],
    weight: 2,
    timeoutMs: CRUX_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeLcp(await getCrux(ctx));
    },
  };
  const inp: Check = {
    id: 'performance.inp',
    domain: 'performance',
    mode: 'passive',
    needs: ['crux'],
    weight: 2,
    timeoutMs: CRUX_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeInp(await getCrux(ctx));
    },
  };
  const cls: Check = {
    id: 'performance.cls',
    domain: 'performance',
    mode: 'passive',
    needs: ['crux'],
    weight: 2,
    timeoutMs: CRUX_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeCls(await getCrux(ctx));
    },
  };
  const poids: Check = {
    id: 'performance.poids',
    domain: 'performance',
    mode: 'passive',
    needs: ['psi'],
    weight: 1,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeWeight(await getPsi(ctx));
    },
  };
  const cacheCheck: Check = {
    id: 'performance.cache',
    domain: 'performance',
    mode: 'passive',
    needs: ['psi'],
    weight: 1,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeCache(await getPsi(ctx));
    },
  };
  const compression: Check = {
    id: 'performance.compression',
    domain: 'performance',
    mode: 'passive',
    needs: ['psi'],
    weight: 1,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeCompression(await getPsi(ctx));
    },
  };

  return [cacheCheck, cls, compression, inp, lcp, lighthouse, poids];
}

/** Checks passifs du domaine Performance (PART-07). */
export const PERFORMANCE_CHECKS: readonly Check[] = createPerformanceChecks({
  apiKey: () => googleApiKey(),
});
