import type { Check } from '../../src/types.js';
import { loadQuality } from './crawl.js';
import {
  judgeHtml,
  judgeImageDimensions,
  judgeImageFormat,
  judgeImageWeight,
  judgeLinks,
} from './judge.js';
import { QUALITE_TIMEOUT_MS } from './limits.js';

function check(id: string, weight: 1 | 2 | 3, run: Check['run']): Check {
  return {
    id,
    domain: 'qualite',
    mode: 'passive',
    needs: ['http'],
    weight,
    timeoutMs: QUALITE_TIMEOUT_MS,
    run,
  };
}

/** Checks passifs du domaine Qualité technique (PART-11). */
export const QUALITE_CHECKS: readonly Check[] = [
  check('qualite.html', 2, async (ctx) => judgeHtml(await loadQuality(ctx))),
  check('qualite.images_dimensions', 1, async (ctx) =>
    judgeImageDimensions(await loadQuality(ctx)),
  ),
  check('qualite.images_format', 1, async (ctx) =>
    judgeImageFormat(await loadQuality(ctx)),
  ),
  check('qualite.images_poids', 2, async (ctx) =>
    judgeImageWeight(await loadQuality(ctx)),
  ),
  check('qualite.liens', 3, async (ctx) => judgeLinks(await loadQuality(ctx))),
];
