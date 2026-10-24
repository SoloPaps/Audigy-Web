import {
  type CruxMetrics,
  LIGHTHOUSE_AUDITS,
  type LighthouseAuditId,
  PSI_CATEGORIES,
  type PsiAudit,
  type PsiCategory,
  type PsiPageFacts,
  type PsiStrategyResult,
} from './types.js';

export interface CruxRecord {
  metrics: CruxMetrics;
  period: { first: string; last: string } | null;
}

export function parsePsiStrategy(
  text: string,
  strategy: 'mobile' | 'desktop',
): PsiStrategyResult | null {
  const root = asRecord(parseJson(text));
  const result = asRecord(root?.lighthouseResult);
  if (!result) return null;
  const categories = asRecord(result.categories);
  const audits = asRecord(result.audits);
  const parsed = {} as Record<PsiCategory, number | null>;
  for (const category of PSI_CATEGORIES) {
    parsed[category] = unitScore(asRecord(categories?.[category])?.score);
  }
  const picked = {} as Record<LighthouseAuditId, PsiAudit>;
  for (const id of LIGHTHOUSE_AUDITS) {
    const audit = asRecord(audits?.[id]);
    picked[id] = {
      score: unitScore(audit?.score),
      numericValue: nonNegative(audit?.numericValue),
    };
  }
  const version = result.lighthouseVersion;
  return {
    strategy,
    categories: parsed,
    audits: picked,
    lighthouseVersion: typeof version === 'string' ? version : null,
    page: parsePageFacts(audits),
  };
}

const EFFICIENT_EXT = new Set(['webp', 'avif', 'jxl']);
const RASTER_EXT = new Set([
  'webp',
  'avif',
  'jxl',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'tif',
  'tiff',
]);
const FONT_EXT = new Set(['woff', 'woff2', 'ttf', 'otf', 'eot']);

/** Compteurs de la page. Les adresses ne sortent pas du parseur. */
export function parsePageFacts(
  audits: Record<string, unknown> | null,
): PsiPageFacts {
  const bytes = nonNegative(
    asRecord(audits?.['total-byte-weight'])?.numericValue,
  );
  const domElements = readDom(audits?.['dom-size']);
  const items = networkItems(audits?.['network-requests']);
  if (items) {
    const fonts = sumFonts(items);
    const images = countImages(items);
    return {
      bytes,
      requests: countRequests(items),
      domElements,
      fontFiles: fonts.files,
      fontBytes: fonts.bytes,
      rasterImages: images.raster,
      efficientImages: images.efficient,
    };
  }
  const summary = readSummary(audits?.['resource-summary']);
  return {
    bytes,
    requests: summary.total,
    domElements,
    fontFiles: summary.fonts,
    fontBytes: summary.fontBytes,
    rasterImages: null,
    efficientImages: null,
  };
}

function networkItems(audit: unknown): Record<string, unknown>[] | null {
  const details = asRecord(asRecord(audit)?.details);
  if (!details || !Array.isArray(details.items)) return null;
  return details.items.filter(isRecord);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return asRecord(value) !== null;
}

function countRequests(items: readonly Record<string, unknown>[]): number {
  let count = 0;
  for (const item of items) {
    const url = typeof item.url === 'string' ? item.url : '';
    if (url.startsWith('data:') || url.startsWith('blob:')) continue;
    count += 1;
  }
  return count;
}

function sumFonts(items: readonly Record<string, unknown>[]): {
  files: number;
  bytes: number | null;
} {
  let files = 0;
  let bytes = 0;
  let complete = true;
  for (const item of items) {
    if (!isFont(item)) continue;
    files += 1;
    const size = nonNegative(item.transferSize);
    if (size === null) complete = false;
    else bytes += size;
  }
  return { files, bytes: complete ? bytes : null };
}

function countImages(items: readonly Record<string, unknown>[]): {
  raster: number;
  efficient: number;
} {
  let raster = 0;
  let efficient = 0;
  for (const item of items) {
    const kind = imageKind(item);
    if (kind === 'skip') continue;
    raster += 1;
    if (kind === 'efficient') efficient += 1;
  }
  return { raster, efficient };
}

function isFont(item: Record<string, unknown>): boolean {
  const type = text(item.resourceType).toLowerCase();
  const mime = text(item.mimeType).toLowerCase();
  const ext = extension(text(item.url));
  return (
    type === 'font' ||
    mime.startsWith('font/') ||
    mime === 'application/font-woff' ||
    FONT_EXT.has(ext)
  );
}

function imageKind(
  item: Record<string, unknown>,
): 'skip' | 'efficient' | 'other' {
  const type = text(item.resourceType).toLowerCase();
  const mime = text(item.mimeType).toLowerCase();
  const ext = extension(text(item.url));
  const svg = mime === 'image/svg+xml' || ext === 'svg';
  const image =
    type === 'image' || mime.startsWith('image/') || RASTER_EXT.has(ext) || svg;
  if (!image || svg) return 'skip';
  const efficient =
    mime === 'image/webp' ||
    mime === 'image/avif' ||
    mime === 'image/jxl' ||
    EFFICIENT_EXT.has(ext);
  return efficient ? 'efficient' : 'other';
}

function readDom(audit: unknown): number | null {
  const record = asRecord(audit);
  if (!record) return null;
  const details = asRecord(record.details);
  const items = Array.isArray(details?.items) ? details.items : [];
  for (const item of items) {
    const row = asRecord(item);
    if (!row) continue;
    const statistic = text(row.statistic);
    if (!/total/i.test(statistic) || !/element/i.test(statistic)) continue;
    const wrapped = asRecord(row.value);
    const raw = wrapped && 'value' in wrapped ? wrapped.value : row.value;
    const count = nonNegative(raw);
    if (count !== null) return Math.round(count);
  }
  const numeric = nonNegative(record.numericValue);
  return numeric === null ? null : Math.round(numeric);
}

function readSummary(audit: unknown): {
  total: number | null;
  fonts: number | null;
  fontBytes: number | null;
} {
  const details = asRecord(asRecord(audit)?.details);
  const items = Array.isArray(details?.items) ? details.items : null;
  if (!items) return { total: null, fonts: null, fontBytes: null };
  let total: number | null = null;
  let fonts: number | null = null;
  let fontBytes: number | null = null;
  for (const item of items) {
    const row = asRecord(item);
    if (!row) continue;
    const type = text(row.resourceType).toLowerCase();
    const count = nonNegative(row.requestCount);
    const bytes = nonNegative(row.transferSize);
    if (type === 'total' && count !== null) total = Math.round(count);
    if (type === 'font' && count !== null) {
      fonts = Math.round(count);
      fontBytes = bytes;
    }
  }
  return { total, fonts, fontBytes };
}

function extension(url: string): string {
  const path = url.split(/[?#]/, 1)[0] ?? '';
  const slash = path.lastIndexOf('/');
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot + 1).toLowerCase();
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function parseCruxRecord(text: string): CruxRecord | null {
  const root = asRecord(parseJson(text));
  const record = asRecord(root?.record);
  if (!record) return null;
  const metrics = asRecord(record.metrics);
  const period = asRecord(record.collectionPeriod);
  const first = dateOf(period?.firstDate);
  const last = dateOf(period?.lastDate);
  return {
    metrics: {
      lcpMs: percentile(metrics, 'largest_contentful_paint'),
      inpMs: percentile(metrics, 'interaction_to_next_paint'),
      cls: percentile(metrics, 'cumulative_layout_shift'),
    },
    period: first && last ? { first, last } : null,
  };
}

function percentile(
  metrics: Record<string, unknown> | null,
  name: string,
): number | null {
  const metric = asRecord(metrics?.[name]);
  const percentiles = asRecord(metric?.percentiles);
  return nonNegative(percentiles?.p75);
}

function dateOf(value: unknown): string | null {
  const date = asRecord(value);
  if (!date) return null;
  const year = date.year;
  const month = date.month;
  const day = date.day;
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  )
    return null;
  const y = year as number;
  const m = month as number;
  const d = day as number;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function unitScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return value;
}

function nonNegative(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() !== '') {
    return nonNegative(Number(value));
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    return null;
  return value;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
}
