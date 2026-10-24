import { googleApiKey } from '../../src/google-api.js';
import type { Check } from '../../src/types.js';
import { type DayCache, memoryDayCache } from '../performance/cache.js';
import { PERFORMANCE_CHECK_TIMEOUT_MS } from '../performance/types.js';
import { createAccessibiliteLighthouseCheck } from './lighthouse.js';

export interface AccessibiliteCheckOptions {
  /** Lue à chaque audit. Absente : le test reste « Non testé », sans appel. */
  apiKey?: () => string | undefined;
  cache?: DayCache;
}

export function createAccessibiliteChecks(
  options: AccessibiliteCheckOptions = {},
): Check[] {
  const cache = options.cache ?? memoryDayCache();
  const apiKey = options.apiKey ?? (() => googleApiKey());
  return [
    createAccessibiliteLighthouseCheck(
      apiKey,
      cache,
      PERFORMANCE_CHECK_TIMEOUT_MS,
    ),
  ];
}

/** Check passif du domaine Accès (note Lighthouse `accessibility`). */
export const ACCESSIBILITE_CHECKS: readonly Check[] =
  createAccessibiliteChecks();
