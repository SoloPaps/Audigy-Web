import { ARTIFACT_LIMITS, assertArtifactSize } from '@audigy/evidence';
import { WARCRecord, WARCSerializer } from 'warcio';

/** Réponse déjà reçue par `safeFetch`, rejouée dans l’archive. */
export interface WarcExchange {
  url: string;
  status: number;
  headers: Headers;
  body: Uint8Array;
}

const WARC_VERSION = 'WARC/1.1';
const SOFTWARE = 'audigy-browser';
const SKIP_HEADERS = new Set([
  'set-cookie',
  'cookie',
  'authorization',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

export const HOMEPAGE_WARC = 'accueil.warc';

/**
 * WARC 1.1 de la page d’accueil et de ses ressources de même origine.
 * Les tiers et les valeurs de traces sont exclus. Les ressources les plus
 * lourdes sont retirées pour rester sous le plafond ; la page d’accueil reste.
 */
export async function buildHomepageWarc(input: {
  homepageUrl: string;
  date: Date;
  exchanges: readonly WarcExchange[];
}): Promise<Uint8Array> {
  const homepage = input.exchanges.find(
    (exchange) => exchange.url === input.homepageUrl,
  );
  if (!homepage) throw new Error('WARC_HOMEPAGE_MISSING');
  const extras = input.exchanges
    .filter(
      (exchange) =>
        exchange !== homepage &&
        exchange.status === 200 &&
        exchange.body.byteLength > 0 &&
        sameOrigin(exchange.url, input.homepageUrl),
    )
    .sort((a, b) => a.body.byteLength - b.body.byteLength);
  const kept = [...extras];
  let bytes = await serialize(input.date, [homepage, ...kept]);
  while (bytes.byteLength > ARTIFACT_LIMITS.warcBytes && kept.length > 0) {
    kept.pop();
    bytes = await serialize(input.date, [homepage, ...kept]);
  }
  assertArtifactSize('warc', bytes.byteLength);
  return bytes;
}

function sameOrigin(left: string, right: string): boolean {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

async function serialize(
  date: Date,
  exchanges: readonly WarcExchange[],
): Promise<Uint8Array> {
  const stamp = warcDate(date);
  const parts: Uint8Array[] = [];
  const info = await WARCRecord.createWARCInfo(
    { filename: HOMEPAGE_WARC, warcVersion: WARC_VERSION },
    { software: SOFTWARE, format: 'WARC File Format 1.1' },
  );
  parts.push(await WARCSerializer.serialize(info, { gzip: false }));
  const home = exchanges[0];
  if (home) parts.push(await requestRecord(home.url, stamp));
  for (const exchange of exchanges) {
    parts.push(await responseRecord(exchange, stamp));
  }
  return concat(parts);
}

async function requestRecord(url: string, date: string): Promise<Uint8Array> {
  const parsed = new URL(url);
  const record = await WARCRecord.create(
    {
      url,
      date,
      type: 'request',
      warcVersion: WARC_VERSION,
      statusline: `GET ${parsed.pathname}${parsed.search} HTTP/1.1`,
      httpHeaders: { Host: parsed.host, Accept: '*/*' },
    },
    [new Uint8Array()],
  );
  return WARCSerializer.serialize(record, { gzip: false });
}

async function responseRecord(
  exchange: WarcExchange,
  date: string,
): Promise<Uint8Array> {
  const headers: Record<string, string> = {};
  exchange.headers.forEach((value, name) => {
    if (!SKIP_HEADERS.has(name.toLowerCase())) {
      headers[name.toLowerCase()] = value;
    }
  });
  if (!headers['content-type']) headers['content-type'] = sniff(exchange.body);
  const record = await WARCRecord.create(
    {
      url: exchange.url,
      date,
      type: 'response',
      warcVersion: WARC_VERSION,
      statusline: `HTTP/1.1 ${exchange.status} ${reason(exchange.status)}`,
      httpHeaders: headers,
    },
    [exchange.body],
  );
  return WARCSerializer.serialize(record, { gzip: false });
}

function sniff(body: Uint8Array): string {
  const start = new TextDecoder().decode(body.subarray(0, 32)).trimStart();
  if (start.startsWith('<')) return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}

function reason(status: number): string {
  if (status === 200) return 'OK';
  if (status === 301) return 'Moved Permanently';
  if (status === 302) return 'Found';
  if (status === 304) return 'Not Modified';
  if (status === 404) return 'Not Found';
  return 'OK';
}

export function warcDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/u, 'Z');
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
