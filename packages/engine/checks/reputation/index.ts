import type { Check, CheckResult } from '../../src/types.js';
import {
  loadPlaceDetails,
  memoryPlacesCache,
  type PlaceFacts,
  type PlacesCache,
  pointsFromTenths,
  reputationStatus,
} from './places.js';

export interface ReputationCheckOptions {
  /** Relue à chaque audit. Vide : pas d’appel. */
  apiKey: () => string | undefined;
  cache?: PlacesCache;
}

const CHECK_ID = 'reputation.avis';

/**
 * Un seul test. Sans lieu confirmé, sans note ou sans avis : Non testé.
 * La note sur 5 devient un score sur 100, tenu hors du score global.
 */
export function createReputationChecks(
  options: ReputationCheckOptions,
): Check[] {
  const cache = options.cache ?? memoryPlacesCache();
  const check: Check = {
    id: CHECK_ID,
    domain: 'reputation',
    mode: 'passive',
    needs: ['places'],
    weight: 3,
    timeoutMs: 25_000,
    async run(ctx) {
      const apiKey = options.apiKey();
      const placeId = ctx.confirmedPlaceId;
      if (!apiKey || !ctx.net.api) return untested('reputation.avis.missing');
      if (!placeId) return untested('reputation.avis.unconfirmed');
      const known = await readCache(cache, placeId, ctx.now());
      if (known) return judge(known);
      const loaded = await loadPlaceDetails(
        ctx.net.api,
        apiKey,
        placeId,
        ctx.now(),
        ctx.signal,
      );
      if (typeof loaded === 'string') return untested(messageFor(loaded));
      await writeCache(cache, loaded);
      return judge(loaded);
    },
  };
  return [check];
}

async function readCache(
  cache: PlacesCache,
  placeId: string,
  now: Date,
): Promise<PlaceFacts | null> {
  try {
    return await cache.get(placeId, now);
  } catch {
    return null;
  }
}

async function writeCache(
  cache: PlacesCache,
  facts: PlaceFacts,
): Promise<void> {
  try {
    await cache.set(facts);
  } catch {
    // Le score de cet audit reste valable. Le suivant refera l’appel.
  }
}

function judge(facts: PlaceFacts): CheckResult {
  const measured = measuredOf(facts);
  if (
    facts.ratingTenths === null ||
    facts.reviewCount === null ||
    facts.reviewCount < 1
  ) {
    return untested('reputation.avis.none', measured);
  }
  const points = pointsFromTenths(facts.ratingTenths);
  const status = reputationStatus(points);
  const result: CheckResult = {
    status,
    score: points / 100,
    severity: status === 'fail' ? 3 : status === 'warn' ? 2 : 1,
    impact: 2,
    messageKey: `reputation.avis.${status}`,
    measured,
  };
  return result;
}

function measuredOf(facts: PlaceFacts): Record<string, unknown> {
  const measured: Record<string, unknown> = { placeName: facts.name };
  if (facts.ratingTenths !== null) measured.rating = facts.ratingTenths / 10;
  if (facts.reviewCount !== null) measured.reviewCount = facts.reviewCount;
  return measured;
}

function messageFor(failure: 'quota' | 'absent' | 'error'): string {
  if (failure === 'quota') return 'reputation.avis.quota';
  if (failure === 'absent') return 'reputation.avis.absent';
  return 'reputation.avis.error';
}

function untested(
  messageKey: string,
  measured?: Record<string, unknown>,
): CheckResult {
  const result: CheckResult = {
    status: 'untested',
    severity: 1,
    impact: 1,
    messageKey,
    reason: messageKey,
  };
  if (measured) result.measured = measured;
  return result;
}
