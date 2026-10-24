import { googleApiKey } from '../../src/google-api.js';
import type { Check, CheckContext } from '../../src/types.js';
import { type DayCache, memoryDayCache } from '../performance/cache.js';
import { loadPsi } from '../performance/load.js';
import {
  PERFORMANCE_CHECK_TIMEOUT_MS,
  PSI_SHARED_KEY,
  type PsiBundle,
} from '../performance/types.js';
import {
  GREEN_CHECK_TIMEOUT_MS,
  type GreenBundle,
  loadGreen,
} from './green.js';
import {
  judgeBudget,
  judgeCache,
  judgeCo2,
  judgeCompression,
  judgeEcoIndex,
  judgeFonts,
  judgeHost,
  judgeImages,
} from './judge.js';

export interface EcologieCheckOptions {
  /** Lue à chaque audit. Absente : les tests qui lisent la page restent « Non testé ». */
  apiKey: () => string | undefined;
  cache?: DayCache;
}

export function createEcologieChecks(options: EcologieCheckOptions): Check[] {
  const cache = options.cache ?? memoryDayCache();

  function getPsi(ctx: CheckContext): Promise<PsiBundle> {
    const apiKey = options.apiKey();
    const api = ctx.net.api;
    if (!api || !apiKey) {
      if (ctx.shared.has(PSI_SHARED_KEY)) {
        return ctx.shared.get(PSI_SHARED_KEY, async () => {
          throw new Error('psi');
        });
      }
      return Promise.resolve({ ok: false, reason: 'missing_key' });
    }
    return loadPsi(ctx, api, apiKey, cache);
  }

  function getGreen(ctx: CheckContext): Promise<GreenBundle> {
    return loadGreen(ctx, cache);
  }

  const co2: Check = {
    id: 'ecologie.co2',
    domain: 'ecologie',
    mode: 'passive',
    needs: ['psi'],
    weight: 2,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeCo2(await getPsi(ctx), await getGreen(ctx));
    },
  };
  const ecoindex: Check = {
    id: 'ecologie.ecoindex',
    domain: 'ecologie',
    mode: 'passive',
    needs: ['psi'],
    weight: 3,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeEcoIndex(await getPsi(ctx));
    },
  };
  const hebergeur: Check = {
    id: 'ecologie.hebergeur',
    domain: 'ecologie',
    mode: 'passive',
    needs: [],
    weight: 2,
    timeoutMs: GREEN_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeHost(await getGreen(ctx));
    },
  };
  const budget: Check = {
    id: 'ecologie.rgesn_budget',
    domain: 'ecologie',
    mode: 'passive',
    needs: ['psi'],
    weight: 2,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeBudget(await getPsi(ctx));
    },
  };
  const cacheCheck: Check = {
    id: 'ecologie.rgesn_cache',
    domain: 'ecologie',
    mode: 'passive',
    needs: ['psi'],
    weight: 1,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeCache(await getPsi(ctx));
    },
  };
  const compression: Check = {
    id: 'ecologie.rgesn_compression',
    domain: 'ecologie',
    mode: 'passive',
    needs: ['psi'],
    weight: 1,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeCompression(await getPsi(ctx));
    },
  };
  const images: Check = {
    id: 'ecologie.rgesn_images',
    domain: 'ecologie',
    mode: 'passive',
    needs: ['psi'],
    weight: 1,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeImages(await getPsi(ctx));
    },
  };
  const polices: Check = {
    id: 'ecologie.rgesn_polices',
    domain: 'ecologie',
    mode: 'passive',
    needs: ['psi'],
    weight: 1,
    timeoutMs: PERFORMANCE_CHECK_TIMEOUT_MS,
    async run(ctx) {
      return judgeFonts(await getPsi(ctx));
    },
  };

  return [
    co2,
    ecoindex,
    hebergeur,
    budget,
    cacheCheck,
    compression,
    images,
    polices,
  ];
}

/** Checks passifs du domaine Écologie (PART-10). */
export const ECOLOGIE_CHECKS: readonly Check[] = createEcologieChecks({
  apiKey: () => googleApiKey(),
});
