import { type ExternalApi, PLACES_HOST } from '@audigy/net';

/** Sept jours. Les audits suivants relisent le cache, sans nouvel appel. */
export const PLACES_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

export const PLACE_ID_RE = /^[A-Za-z0-9_-]{8,255}$/;

const DETAILS_MASK = 'id,displayName,formattedAddress,rating,userRatingCount';
const SEARCH_MASK = 'places.id,places.displayName,places.formattedAddress';
const DETAILS_TIMEOUT_MS = 20_000;

export type PlacesFailure = 'quota' | 'absent' | 'error';

/** Note et volume seulement. Jamais le texte des avis. */
export interface PlaceFacts {
  placeId: string;
  name: string;
  address: string;
  /** Dixièmes, de 10 (1,0) à 50 (5,0). `null` si Google n’a pas de note. */
  ratingTenths: number | null;
  reviewCount: number | null;
  fetchedAt: string;
}

export interface PlaceCandidate {
  id: string;
  name: string;
  address: string;
}

export interface PlacesCache {
  get(placeId: string, now: Date): Promise<PlaceFacts | null>;
  set(facts: PlaceFacts): Promise<void>;
}

export function placesApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const value = env.PLACES_API_KEY;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function memoryPlacesCache(): PlacesCache {
  const rows = new Map<string, PlaceFacts>();
  return {
    async get(placeId, now) {
      const row = rows.get(placeId);
      if (!row) return null;
      const at = Date.parse(row.fetchedAt);
      if (!Number.isFinite(at)) return null;
      if (now.getTime() - at >= PLACES_CACHE_MS) return null;
      return row;
    },
    async set(facts) {
      rows.set(facts.placeId, facts);
    },
  };
}

/** 4,6 / 5 → 92. Le score affiché et le score du domaine sont le même entier. */
export function pointsFromTenths(tenths: number): number {
  return tenths * 2;
}

export function ratingFromTenths(tenths: number): number {
  return tenths / 10;
}

export function reputationStatus(points: number): 'pass' | 'warn' | 'fail' {
  if (points >= 80) return 'pass';
  if (points >= 50) return 'warn';
  return 'fail';
}

export async function searchPlaces(
  api: ExternalApi,
  apiKey: string,
  query: string,
  signal?: AbortSignal,
): Promise<PlaceCandidate[] | PlacesFailure> {
  let response: { status: number; text: string };
  try {
    response = await api.request({
      method: 'POST',
      url: new URL(`https://${PLACES_HOST}/v1/places:searchText`),
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'fr',
        pageSize: 5,
      }),
      headers: placesHeaders(apiKey, SEARCH_MASK),
      timeoutMs: DETAILS_TIMEOUT_MS,
      ...(signal ? { signal } : {}),
    });
  } catch {
    return 'error';
  }
  const failure = failureOf(response.status);
  if (failure) return failure;
  return parseCandidates(response.text);
}

export async function loadPlaceDetails(
  api: ExternalApi,
  apiKey: string,
  placeId: string,
  now: Date,
  signal?: AbortSignal,
): Promise<PlaceFacts | PlacesFailure> {
  if (!PLACE_ID_RE.test(placeId)) return 'absent';
  let response: { status: number; text: string };
  try {
    response = await api.request({
      method: 'GET',
      url: new URL(
        `https://${PLACES_HOST}/v1/places/${encodeURIComponent(placeId)}`,
      ),
      headers: placesHeaders(apiKey, DETAILS_MASK),
      timeoutMs: DETAILS_TIMEOUT_MS,
      ...(signal ? { signal } : {}),
    });
  } catch {
    return 'error';
  }
  const failure = failureOf(response.status);
  if (failure) return failure;
  const facts = parseDetails(response.text, now);
  if (!facts || facts.placeId !== placeId) return 'error';
  return facts;
}

export function parseCandidates(
  text: string,
): PlaceCandidate[] | PlacesFailure {
  const body = readJson(text);
  if (!body) return 'error';
  const places = body.places;
  if (places === undefined) return [];
  if (!Array.isArray(places)) return 'error';
  const out: PlaceCandidate[] = [];
  for (const item of places) {
    if (out.length >= 5) break;
    const candidate = asCandidate(item);
    if (candidate) out.push(candidate);
  }
  return out;
}

export function parseDetails(text: string, now: Date): PlaceFacts | null {
  const body = readJson(text);
  if (!body) return null;
  const placeId = asPlaceId(body.id);
  const name = asName(body.displayName);
  if (!placeId || !name) return null;
  return {
    placeId,
    name,
    address: asAddress(body.formattedAddress),
    ratingTenths: asTenths(body.rating),
    reviewCount: asCount(body.userRatingCount),
    fetchedAt: now.toISOString(),
  };
}

function placesHeaders(
  apiKey: string,
  fieldMask: string,
): Record<string, string> {
  return {
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': fieldMask,
  };
}

function failureOf(status: number): PlacesFailure | null {
  if (status === 200) return null;
  if (status === 404) return 'absent';
  if (status === 429) return 'quota';
  return 'error';
}

function readJson(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asCandidate(value: unknown): PlaceCandidate | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  const id = asPlaceId(row.id);
  const name = asName(row.displayName);
  if (!id || !name) return null;
  return { id, name, address: asAddress(row.formattedAddress) };
}

function asPlaceId(value: unknown): string | null {
  return typeof value === 'string' && PLACE_ID_RE.test(value) ? value : null;
}

function asName(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const text = (value as { text?: unknown }).text;
  if (typeof text !== 'string') return null;
  const name = text.trim().slice(0, 200);
  return name === '' ? null : name;
}

function asAddress(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 300);
}

function asTenths(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const tenths = Math.round(value * 10);
  if (tenths < 10 || tenths > 50) return null;
  return tenths;
}

function asCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 0 || value > 2_000_000_000) return null;
  return value;
}
