import { describe, expect, it, vi } from 'vitest';
import { createAuditContext, defaultChecks } from '../src/context.js';
import { handlePlaces, type PlacesDeps } from '../src/index.js';
import { captureLogger } from './helpers.js';

const TOKEN = 'jeton-utilisateur-0123456789abcdef';
const USER = '11111111-1111-4111-8111-111111111111';
const SITE = '7a2b3c4d-5e6f-4789-a012-bcdef0123456';
const PLACE = 'ChIJplacesTest0001';
const KEY = 'AIzaSyTESTKEY0123456789abcd';

function deps(enabled: boolean): PlacesDeps & {
  search: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
} {
  const { logger } = captureLogger([TOKEN, KEY]);
  const search = vi.fn(async () => [
    { id: PLACE, name: 'Cabinet des Tilleuls', address: 'Lyon' },
  ]);
  const confirm = vi.fn(async () => ({
    siteId: SITE,
    name: 'Cabinet des Tilleuls',
    address: 'Lyon',
    rating: 4.6,
    reviewCount: 128,
    score: 92,
  }));
  return {
    logger,
    enabled,
    userFromToken: async (token) => (token === TOKEN ? USER : null),
    ownsSite: async () => true,
    allow: async () => true,
    listPlaces: async () => [],
    search,
    confirm,
    clear: async () => {},
  };
}

function call(
  method: string,
  body?: unknown,
  token: string | null = TOKEN,
): Request {
  return new Request('http://localhost:8888/api/places', {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('places', () => {
  it('masque la section et n’appelle pas Places sans clé', async () => {
    const env = {};
    expect(defaultChecks(env).map((item) => item.id)).not.toContain(
      'reputation.avis',
    );
    expect(
      createAuditContext({
        target: {
          url: new URL('https://exemple.fr/'),
          scope: 'origin',
          hosting: 'other',
        },
        verified: false,
        env,
      }).available,
    ).not.toContain('places');

    const gateway = deps(false);
    const hidden = await handlePlaces(call('GET'), gateway);
    expect(await hidden.json()).toEqual({ enabled: false });
    const refused = await handlePlaces(
      call('POST', { action: 'search', siteId: SITE, query: 'Cabinet' }),
      gateway,
    );
    expect(refused.status).toBe(404);
    expect(gateway.search).not.toHaveBeenCalled();
    expect(gateway.confirm).not.toHaveBeenCalled();
    expect(JSON.stringify(await refused.clone().json())).not.toContain(KEY);
  });

  it('cherche puis confirme sans exposer la clé', async () => {
    const env = { PLACES_API_KEY: KEY };
    expect(
      defaultChecks(env).some((item) => item.id === 'reputation.avis'),
    ).toBe(true);
    const gateway = deps(true);
    const found = await handlePlaces(
      call('POST', { action: 'search', siteId: SITE, query: 'Cabinet' }),
      gateway,
    );
    expect(found.status).toBe(200);
    expect(await found.json()).toEqual({
      candidates: [
        { id: PLACE, name: 'Cabinet des Tilleuls', address: 'Lyon' },
      ],
    });
    const saved = await handlePlaces(
      call('POST', { action: 'confirm', siteId: SITE, placeId: PLACE }),
      gateway,
    );
    const body = await saved.json();
    expect(body).toMatchObject({
      place: { score: 92, rating: 4.6, reviewCount: 128 },
    });
    expect(JSON.stringify(body)).not.toContain(KEY);
    expect(gateway.search).toHaveBeenCalledOnce();
    expect(gateway.confirm).toHaveBeenCalledOnce();
  });
});
