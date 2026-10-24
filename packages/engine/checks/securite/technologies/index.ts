import { nvdApiKey } from '../../../src/external.js';
import type { Check, CheckContext } from '../../../src/types.js';
import { type DayCache, memoryDayCache } from '../../performance/cache.js';
import { loadInventory } from './inventory.js';
import {
  CVE_SCRIPTS_ID,
  CVE_SOFTWARE_ID,
  judgeScriptCves,
  judgeSoftwareCves,
  judgeTechnologies,
  needsKev,
  TECHNOLOGIES_ID,
} from './judge.js';
import {
  type Candidate,
  type LookupOptions,
  loadKev,
  lookupAll,
  type Selection,
  scriptCandidates,
  softwareCandidates,
} from './lookup.js';

/** Page et scripts liés : dix scripts au plus, 1 requête par seconde et par hôte. */
export const TECHNOLOGIES_TIMEOUT_MS = 90_000;
/** Inventaire, puis OSV ou NVD, puis le catalogue KEV. */
export const CVE_TIMEOUT_MS = 150_000;

export interface TechnologiesCheckOptions {
  cache?: DayCache;
  /** Lue à chaque audit ; facultative (quota NVD plus haut). Jamais journalisée. */
  nvdApiKey?: () => string | undefined;
}

export function createTechnologiesChecks(
  options: TechnologiesCheckOptions = {},
): Check[] {
  const cache = options.cache ?? memoryDayCache();
  const key = options.nvdApiKey ?? (() => nvdApiKey());

  async function cves(
    ctx: CheckContext,
    select: (inventory: Parameters<typeof scriptCandidates>[0]) => Selection,
    judge: typeof judgeScriptCves,
  ) {
    const inventory = await loadInventory(ctx);
    if (!inventory.ok) return judge(inventory, null, [], null);
    const selection = select(inventory);
    const api = ctx.net.api;
    if (selection.candidates.length === 0 || !api) {
      return judge(inventory, selection, [], null, !api);
    }
    const lookup: LookupOptions = { api, cache, nvdApiKey: key() };
    const checked = await lookupAll(
      ctx,
      selection.candidates as Candidate[],
      lookup,
    );
    const kev = needsKev(checked) ? await loadKev(ctx, lookup) : null;
    return judge(inventory, selection, checked, kev);
  }

  const technologies: Check = {
    id: TECHNOLOGIES_ID,
    domain: 'securite',
    mode: 'passive',
    needs: ['http'],
    weight: 1,
    timeoutMs: TECHNOLOGIES_TIMEOUT_MS,
    async run(ctx) {
      return judgeTechnologies(await loadInventory(ctx));
    },
  };
  const scripts: Check = {
    id: CVE_SCRIPTS_ID,
    domain: 'securite',
    mode: 'passive',
    needs: ['http'],
    weight: 2,
    timeoutMs: CVE_TIMEOUT_MS,
    run: (ctx) => cves(ctx, scriptCandidates, judgeScriptCves),
  };
  const software: Check = {
    id: CVE_SOFTWARE_ID,
    domain: 'securite',
    mode: 'passive',
    needs: ['http'],
    weight: 2,
    timeoutMs: CVE_TIMEOUT_MS,
    run: (ctx) => cves(ctx, softwareCandidates, judgeSoftwareCves),
  };
  return [software, scripts, technologies];
}

/** Technologies et failles connues, en passif (PART-12). Triés par identifiant. */
export const TECHNOLOGIES_CHECKS: readonly Check[] = createTechnologiesChecks();
