export interface PlaceSummary {
  siteId: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
  score: number | null;
}

export interface PlaceCandidate {
  id: string;
  name: string;
  address: string;
}

export interface PlacesState {
  enabled: boolean;
  places: PlaceSummary[];
}

const ratingFormat = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** « 4,6 ». */
export function formatRating(value: number): string {
  return ratingFormat.format(value);
}

export function parsePlacesState(body: unknown): PlacesState | null {
  if (!isRecord(body) || typeof body.enabled !== 'boolean') return null;
  if (!body.enabled) return { enabled: false, places: [] };
  if (!Array.isArray(body.places)) return null;
  const places: PlaceSummary[] = [];
  for (const item of body.places) {
    const place = asSummary(item);
    if (place) places.push(place);
  }
  return { enabled: true, places };
}

export function parseCandidates(body: unknown): PlaceCandidate[] | null {
  if (!isRecord(body) || !Array.isArray(body.candidates)) return null;
  const candidates: PlaceCandidate[] = [];
  for (const item of body.candidates) {
    if (!isRecord(item)) continue;
    if (typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    candidates.push({
      id: item.id,
      name: item.name,
      address: typeof item.address === 'string' ? item.address : '',
    });
  }
  return candidates;
}

export function parseConfirmed(body: unknown): PlaceSummary | null {
  if (!isRecord(body)) return null;
  return asSummary(body.place);
}

function asSummary(value: unknown): PlaceSummary | null {
  if (!isRecord(value)) return null;
  if (typeof value.siteId !== 'string' || typeof value.name !== 'string') {
    return null;
  }
  return {
    siteId: value.siteId,
    name: value.name,
    address: typeof value.address === 'string' ? value.address : '',
    rating: asNumber(value.rating),
    reviewCount: asNumber(value.reviewCount),
    score: asNumber(value.score),
  };
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
