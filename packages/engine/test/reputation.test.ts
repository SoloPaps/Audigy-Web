import type { ExternalApi } from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { createReputationChecks } from '../checks/reputation/index.js';
import {
  loadPlaceDetails,
  memoryPlacesCache,
  PLACES_CACHE_MS,
  type PlaceFacts,
  parseCandidates,
  placesApiKey,
  pointsFromTenths,
  searchPlaces,
} from '../checks/reputation/places.js';
import { createRegistry } from '../src/registry.js';
import { runChecks } from '../src/runner.js';
import { scoreDomain, scoreGlobal } from '../src/score.js';
import type { CheckOutcome } from '../src/types.js';
import { makeContext } from './helpers.js';

const KEY = 'AIzaSyTESTKEY0123456789abcd';
const PLACE = 'ChIJplacesTest0001';
const NOW = new Date('2026-10-24T08:00:00.000Z');

const DETAILS = {
  id: PLACE,
  displayName: { text: 'Cabinet des Tilleuls', languageCode: 'fr' },
  formattedAddress: '12 rue des Tilleuls, Lyon',
  rating: 4.6,
  userRatingCount: 128,
};

function api(handler: ExternalApi['request']): ExternalApi {
  return { request: handler };
}

function ctx(client: ExternalApi, placeId: string | null = PLACE) {
  const base = makeContext();
  return {
    ...base,
    now: () => NOW,
    confirmedPlaceId: placeId,
    net: { ...base.net, api: client },
  };
}

describe('avis Google', () => {
  it('lit seulement le nom de variable PLACES_API_KEY', () => {
    expect(placesApiKey({ PLACES_API_KEY: '  abc  ' })).toBe('abc');
    expect(placesApiKey({})).toBeUndefined();
    expect(placesApiKey({ PLACES_API_KEY: '   ' })).toBeUndefined();
    expect(placesApiKey({ GOOGLE_API_KEY: KEY })).toBeUndefined();
  });

  it('convertit la note en score sur 100, hors du global', () => {
    expect(pointsFromTenths(50)).toBe(100);
    expect(pointsFromTenths(40)).toBe(80);
    expect(pointsFromTenths(25)).toBe(50);
    expect(pointsFromTenths(24)).toBe(48);
  });

  it('garde le cache sept jours, puis le laisse expirer', async () => {
    const cache = memoryPlacesCache();
    const facts: PlaceFacts = {
      placeId: PLACE,
      name: 'Cabinet des Tilleuls',
      address: 'Lyon',
      ratingTenths: 46,
      reviewCount: 128,
      fetchedAt: NOW.toISOString(),
    };
    await cache.set(facts);
    const edge = new Date(NOW.getTime() + PLACES_CACHE_MS - 1);
    expect(await cache.get(PLACE, edge)).toEqual(facts);
    expect(
      await cache.get(PLACE, new Date(NOW.getTime() + PLACES_CACHE_MS)),
    ).toBeNull();
  });

  it('note le lieu confirmé et n’appelle plus Places dans le cache', async () => {
    let calls = 0;
    const client = api(async (input) => {
      calls += 1;
      expect(input.url.hostname).toBe('places.googleapis.com');
      expect(input.url.search).toBe('');
      expect(input.headers?.['X-Goog-Api-Key']).toBe(KEY);
      expect(input.headers?.['X-Goog-FieldMask']).not.toContain('reviews');
      return { status: 200, text: JSON.stringify(DETAILS) };
    });
    const cache = memoryPlacesCache();
    const checks = createReputationChecks({
      apiKey: () => KEY,
      cache,
    });
    createRegistry(checks);
    const first = await runChecks(checks, ctx(client), {
      available: ['places'],
    });
    const second = await runChecks(checks, ctx(client), {
      available: ['places'],
    });
    expect(calls).toBe(1);
    expect(first[0]?.result).toMatchObject({
      status: 'pass',
      score: 0.92,
      messageKey: 'reputation.avis.pass',
      measured: {
        rating: 4.6,
        reviewCount: 128,
        placeName: 'Cabinet des Tilleuls',
      },
    });
    expect(JSON.stringify(first)).not.toContain(KEY);
    expect(second[0]?.result.score).toBe(0.92);
    const outcome = first[0] as CheckOutcome;
    const domains = [
      scoreDomain('reputation', [outcome]),
      scoreDomain('performance', [
        {
          ...outcome,
          checkId: 'performance.lighthouse',
          domain: 'performance',
          result: { ...outcome.result, score: 0.5, status: 'warn' },
        },
      ]),
    ];
    expect(domains[0]?.score).toBe(92);
    expect(scoreGlobal(domains).score).toBe(50);
    expect(scoreGlobal(domains).scoredDomains).toEqual(['performance']);
  });

  it('sans lieu confirmé, n’appelle pas Places', async () => {
    let calls = 0;
    const client = api(async () => {
      calls += 1;
      return { status: 200, text: '{}' };
    });
    const checks = createReputationChecks({ apiKey: () => KEY });
    const [outcome] = await runChecks(checks, ctx(client, null), {
      available: ['places'],
    });
    expect(calls).toBe(0);
    expect(outcome?.result).toMatchObject({
      status: 'untested',
      messageKey: 'reputation.avis.unconfirmed',
    });
  });

  it('sans clé, n’appelle pas Places', async () => {
    let calls = 0;
    const client = api(async () => {
      calls += 1;
      return { status: 200, text: JSON.stringify(DETAILS) };
    });
    const checks = createReputationChecks({ apiKey: () => undefined });
    const [outcome] = await runChecks(checks, ctx(client), {
      available: ['places'],
    });
    expect(calls).toBe(0);
    expect(outcome?.result.messageKey).toBe('reputation.avis.missing');
  });

  it('classe une note faible et un lieu sans avis', async () => {
    const weak = api(async () => ({
      status: 200,
      text: JSON.stringify({ ...DETAILS, rating: 2.4, userRatingCount: 3 }),
    }));
    const empty = api(async () => ({
      status: 200,
      text: JSON.stringify({ ...DETAILS, rating: 5, userRatingCount: 0 }),
    }));
    const quota = api(async () => ({ status: 429, text: '' }));
    const checks = createReputationChecks({ apiKey: () => KEY });
    const [low] = await runChecks(checks, ctx(weak), { available: ['places'] });
    const [none] = await runChecks(
      createReputationChecks({ apiKey: () => KEY }),
      ctx(empty),
      { available: ['places'] },
    );
    const [limited] = await runChecks(
      createReputationChecks({ apiKey: () => KEY }),
      ctx(quota),
      { available: ['places'] },
    );
    expect(low?.result).toMatchObject({
      status: 'fail',
      score: 0.48,
      messageKey: 'reputation.avis.fail',
    });
    expect(none?.result).toMatchObject({
      status: 'untested',
      messageKey: 'reputation.avis.none',
    });
    expect(limited?.result.messageKey).toBe('reputation.avis.quota');
    expect(JSON.stringify([low, none, limited])).not.toContain(KEY);
  });

  it('cherche des lieux sans demander le texte des avis', async () => {
    const client = api(async (input) => {
      expect(input.method).toBe('POST');
      expect(input.url.pathname).toBe('/v1/places:searchText');
      expect(input.headers?.['X-Goog-FieldMask']).not.toContain('rating');
      expect(input.body).not.toContain(KEY);
      return {
        status: 200,
        text: JSON.stringify({
          places: [
            {
              id: PLACE,
              displayName: { text: 'Cabinet des Tilleuls' },
              formattedAddress: 'Lyon',
            },
            { id: 'court', displayName: { text: 'ignoré' } },
          ],
        }),
      };
    });
    const found = await searchPlaces(client, KEY, 'Cabinet des Tilleuls');
    expect(found).toEqual([
      { id: PLACE, name: 'Cabinet des Tilleuls', address: 'Lyon' },
    ]);
    expect(parseCandidates('{}')).toEqual([]);
    const missing = await loadPlaceDetails(
      api(async () => ({ status: 404, text: '' })),
      KEY,
      PLACE,
      NOW,
    );
    expect(missing).toBe('absent');
    expect(await loadPlaceDetails(client, KEY, '../etc', NOW)).toBe('absent');
  });
});
