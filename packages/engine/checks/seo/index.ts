import { googleApiKey } from '../../src/google-api.js';
import type { Check } from '../../src/types.js';
import { type DayCache, memoryDayCache } from '../performance/cache.js';
import { PERFORMANCE_CHECK_TIMEOUT_MS } from '../performance/types.js';
import { canonicalCheck } from './canonical.js';
import { descriptionCheck } from './description.js';
import { GSC_CHECKS } from './gsc.js';
import { hreflangCheck } from './hreflang.js';
import { jsonldCheck } from './jsonld.js';
import { createLighthouseCheck } from './lighthouse.js';
import { noindexCheck } from './noindex.js';
import { robotsCheck } from './robots.js';
import { sitemapCheck } from './sitemap.js';
import { titleCheck } from './title.js';

export interface SeoCheckOptions {
  /** Lue à chaque audit. Absente : Lighthouse reste « Non testé », sans appel. */
  apiKey?: () => string | undefined;
  cache?: DayCache;
}

export function createSeoChecks(options: SeoCheckOptions = {}): Check[] {
  const cache = options.cache ?? memoryDayCache();
  const apiKey = options.apiKey ?? (() => googleApiKey());
  return [
    canonicalCheck,
    descriptionCheck,
    ...GSC_CHECKS,
    hreflangCheck,
    jsonldCheck,
    createLighthouseCheck(apiKey, cache, PERFORMANCE_CHECK_TIMEOUT_MS),
    noindexCheck,
    robotsCheck,
    sitemapCheck,
    titleCheck,
  ];
}

/** Checks passifs du domaine SEO (PART-08). */
export const SEO_CHECKS: readonly Check[] = createSeoChecks();
