import { createHash } from 'node:crypto';
import type { Database } from '@audigy/db';
import { createServiceClient, createUserClient, dbEnvFrom } from '@audigy/db';
import {
  loadPlaceDetails,
  PLACES_CACHE_MS,
  type PlaceCandidate,
  type PlaceFacts,
  type PlacesCache,
  type PlacesFailure,
  placesApiKey,
  pointsFromTenths,
  ratingFromTenths,
  searchPlaces,
} from '@audigy/engine';
import { createExternalApi } from '@audigy/net';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { apiError, bearerToken } from './http.js';
import { errorCode, type Logger } from './log.js';

const SEARCH_LIMIT = 30;
const HOUR_MS = 60 * 60 * 1000;

type Client = SupabaseClient<Database>;

export interface PlaceView {
  siteId: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
  score: number | null;
}

export interface PlacesDeps {
  logger: Logger;
  enabled: boolean;
  now?: () => Date;
  userFromToken(token: string): Promise<string | null>;
  ownsSite(token: string, siteId: string): Promise<boolean>;
  allow(userId: string, now: Date): Promise<boolean>;
  listPlaces(token: string): Promise<PlaceView[]>;
  search(
    query: string,
    signal: AbortSignal,
  ): Promise<PlaceCandidate[] | PlacesFailure>;
  confirm(
    siteId: string,
    placeId: string,
    signal: AbortSignal,
    now: Date,
  ): Promise<PlaceView | 'absent' | 'quota' | 'error'>;
  clear(siteId: string): Promise<void>;
}

const siteId = z.uuid();
const placeId = z.string().regex(/^[A-Za-z0-9_-]{8,255}$/);
const queryText = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine((value) => {
    for (let index = 0; index < value.length; index += 1) {
      if (value.charCodeAt(index) < 32) return false;
    }
    return true;
  });

const bodySchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('search'), siteId, query: queryText }),
  z.strictObject({ action: z.literal('confirm'), siteId, placeId }),
  z.strictObject({ action: z.literal('clear'), siteId }),
]);

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

/** `GET` et `POST /api/places`. Places n’est jamais contacté sans clé, ni depuis le navigateur. */
export async function handlePlaces(
  req: Request,
  deps: PlacesDeps,
): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return apiError(405, 'method_not_allowed', {}, { allow: 'GET, POST' });
  }
  try {
    const token = bearerToken(req);
    if (!token) return apiError(401, 'unauthorized');
    const userId = await deps.userFromToken(token);
    if (!userId) return apiError(401, 'unauthorized');
    if (!deps.enabled) {
      if (req.method === 'GET') return json(200, { enabled: false });
      return apiError(404, 'places_disabled');
    }
    if (req.method === 'GET') {
      const places = await deps.listPlaces(token);
      return json(200, { enabled: true, places });
    }
    let body: unknown;
    try {
      const text = await req.text();
      if (Buffer.byteLength(text) > 2048) return apiError(400, 'invalid_input');
      body = JSON.parse(text);
    } catch {
      return apiError(400, 'invalid_input');
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return apiError(400, 'invalid_input');
    if (!(await deps.ownsSite(token, parsed.data.siteId))) {
      return apiError(404, 'site_not_found');
    }
    const now = deps.now?.() ?? new Date();
    if (parsed.data.action === 'clear') {
      await deps.clear(parsed.data.siteId);
      return json(200, { place: null });
    }
    if (!(await deps.allow(userId, now))) {
      return apiError(429, 'places_limit', {}, { 'retry-after': '3600' });
    }
    if (parsed.data.action === 'search') {
      const found = await deps.search(parsed.data.query, req.signal);
      if (!Array.isArray(found)) {
        return failure(found === 'absent' ? 'error' : found);
      }
      return json(200, { candidates: found });
    }
    const place = await deps.confirm(
      parsed.data.siteId,
      parsed.data.placeId,
      req.signal,
      now,
    );
    if (place === 'absent' || place === 'quota' || place === 'error') {
      return failure(place);
    }
    return json(200, { place });
  } catch (error) {
    deps.logger.error('places_failed', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}

function failure(reason: 'quota' | 'absent' | 'error'): Response {
  if (reason === 'error') return apiError(502, 'internal');
  if (reason === 'absent') return apiError(404, 'places_absent');
  return apiError(429, 'places_limit', {}, { 'retry-after': '3600' });
}

export function viewFromFacts(siteId: string, facts: PlaceFacts): PlaceView {
  const scored =
    facts.ratingTenths !== null &&
    facts.reviewCount !== null &&
    facts.reviewCount > 0;
  return {
    siteId,
    name: facts.name,
    address: facts.address,
    rating:
      facts.ratingTenths === null ? null : ratingFromTenths(facts.ratingTenths),
    reviewCount: facts.reviewCount,
    score:
      scored && facts.ratingTenths !== null
        ? pointsFromTenths(facts.ratingTenths)
        : null,
  };
}

export function supabasePlacesCache(client: Client): PlacesCache {
  return {
    async get(placeId, now) {
      const { data, error } = await client
        .from('places_cache')
        .select(
          'place_id, place_name, place_address, rating_tenths, review_count, fetched_at',
        )
        .eq('place_id', placeId)
        .maybeSingle();
      if (error || !data) return null;
      const at = Date.parse(data.fetched_at);
      if (!Number.isFinite(at) || now.getTime() - at >= PLACES_CACHE_MS) {
        return null;
      }
      return {
        placeId: data.place_id,
        name: data.place_name,
        address: data.place_address,
        ratingTenths: data.rating_tenths,
        reviewCount: data.review_count,
        fetchedAt: data.fetched_at,
      };
    },
    async set(facts) {
      const { error } = await client.from('places_cache').upsert(
        {
          place_id: facts.placeId,
          place_name: facts.name,
          place_address: facts.address,
          rating_tenths: facts.ratingTenths,
          review_count: facts.reviewCount,
          fetched_at: facts.fetchedAt,
        },
        { onConflict: 'place_id' },
      );
      if (error) throw new Error('places_cache');
    },
  };
}

export async function readConfirmedPlaceId(
  client: Client,
  siteId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('site_places')
    .select('place_id')
    .eq('site_id', siteId)
    .maybeSingle();
  if (error) throw new Error('places_read');
  return data?.place_id ?? null;
}

export async function takePlacesSlot(
  client: Client,
  userId: string,
  now: Date,
): Promise<boolean> {
  const windowStart = new Date(Math.floor(now.getTime() / HOUR_MS) * HOUR_MS);
  const key = createHash('sha256')
    .update(`places:${userId}:${windowStart.toISOString()}`)
    .digest('hex');
  const { data, error } = await client
    .from('rate_limits')
    .select('count')
    .eq('key', key)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle();
  if (error) return false;
  const count = data?.count ?? 0;
  if (count >= SEARCH_LIMIT) return false;
  const { error: writeError } = await client
    .from('rate_limits')
    .upsert(
      { key, window_start: windowStart.toISOString(), count: count + 1 },
      { onConflict: 'key,window_start' },
    );
  return !writeError;
}

export interface PlacesFromEnvOptions {
  env: NodeJS.ProcessEnv;
  logger: Logger;
}

export function placesDepsFromEnv(options: PlacesFromEnvOptions): PlacesDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  const anon = createUserClient(db);
  const userClient = (token: string) =>
    createUserClient({ ...db, accessToken: token });
  const apiKey = placesApiKey(options.env);
  const http = apiKey ? createExternalApi() : null;
  return {
    logger: options.logger,
    enabled: apiKey !== undefined,
    async userFromToken(token) {
      const { data, error } = await anon.auth.getUser(token);
      if (error || !data.user) return null;
      return data.user.id;
    },
    async ownsSite(token, siteId) {
      const { data, error } = await userClient(token)
        .from('sites')
        .select('id')
        .eq('id', siteId)
        .is('deleted_at', null)
        .maybeSingle();
      return !error && data !== null;
    },
    allow: (userId, now) => takePlacesSlot(service, userId, now),
    listPlaces: (token) => listPlaces(userClient(token), service),
    async search(query, signal) {
      if (!http || !apiKey) return 'error';
      return searchPlaces(http, apiKey, query, signal);
    },
    async confirm(siteId, id, signal, now) {
      if (!http || !apiKey) return 'error';
      const loaded = await loadPlaceDetails(http, apiKey, id, now, signal);
      if (typeof loaded === 'string') return loaded;
      const { error } = await service.from('site_places').upsert(
        {
          site_id: siteId,
          place_id: loaded.placeId,
          place_name: loaded.name,
          place_address: loaded.address,
          confirmed_at: now.toISOString(),
        },
        { onConflict: 'site_id' },
      );
      if (error) throw new Error('places_confirm');
      try {
        await supabasePlacesCache(service).set(loaded);
      } catch (caught) {
        options.logger.warn('places_cache', { code: errorCode(caught) });
      }
      return viewFromFacts(siteId, loaded);
    },
    async clear(siteId) {
      const { error } = await service
        .from('site_places')
        .delete()
        .eq('site_id', siteId);
      if (error) throw new Error('places_clear');
    },
  };
}

async function listPlaces(user: Client, service: Client): Promise<PlaceView[]> {
  const { data: sites, error } = await user
    .from('sites')
    .select('id')
    .is('deleted_at', null);
  if (error) throw new Error('places_sites');
  const ids = (sites ?? []).map((row) => row.id);
  if (ids.length === 0) return [];
  const { data: links, error: linkError } = await service
    .from('site_places')
    .select('site_id, place_id, place_name, place_address')
    .in('site_id', ids);
  if (linkError) throw new Error('places_links');
  const placeIds = [...new Set((links ?? []).map((row) => row.place_id))];
  const cached = new Map<string, PlaceFacts>();
  if (placeIds.length > 0) {
    const { data: rows, error: cacheError } = await service
      .from('places_cache')
      .select(
        'place_id, place_name, place_address, rating_tenths, review_count, fetched_at',
      )
      .in('place_id', placeIds);
    if (cacheError) throw new Error('places_cache');
    for (const row of rows ?? []) {
      cached.set(row.place_id, {
        placeId: row.place_id,
        name: row.place_name,
        address: row.place_address,
        ratingTenths: row.rating_tenths,
        reviewCount: row.review_count,
        fetchedAt: row.fetched_at,
      });
    }
  }
  return (links ?? []).map((link) => {
    const facts = cached.get(link.place_id);
    if (!facts) {
      return {
        siteId: link.site_id,
        name: link.place_name,
        address: link.place_address,
        rating: null,
        reviewCount: null,
        score: null,
      };
    }
    return viewFromFacts(link.site_id, { ...facts, name: link.place_name });
  });
}
