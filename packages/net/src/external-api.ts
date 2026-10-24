import type { IncomingMessage } from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { pipeline, type Readable } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { isNetError, NetError } from './errors.js';
import { userAgent } from './safe-fetch.js';
import {
  type Dial,
  directDial,
  pinAddress,
  type Resolve,
  systemResolve,
} from './target.js';

/** Hôte de l’annuaire Green Web Foundation (greencheck v3). */
export const GREEN_WEB_HOST = 'api.thegreenwebfoundation.org';

/** Base de failles des bibliothèques (OSV.dev). */
export const OSV_HOST = 'api.osv.dev';
/** Base de failles du NIST (NVD API 2.0). */
export const NVD_HOST = 'services.nvd.nist.gov';
/** Catalogue CISA des failles exploitées (KEV). */
export const KEV_HOST = 'www.cisa.gov';

/** Hôtes des API tierces utilisées en passif (PSI, CrUX, Green Web, OSV, NVD, KEV). */
export const EXTERNAL_API_HOSTS = [
  'www.googleapis.com',
  'chromeuxreport.googleapis.com',
  GREEN_WEB_HOST,
  OSV_HOST,
  NVD_HOST,
  KEV_HOST,
] as const;

export const DEFAULT_EXTERNAL_TIMEOUT_MS = 120_000;
export const DEFAULT_EXTERNAL_MAX_BYTES = 8 * 1024 * 1024;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** En-têtes posés par le client, jamais remplacés par l’appelant. */
const RESERVED_HEADERS = new Set([
  'host',
  'user-agent',
  'accept',
  'accept-encoding',
  'accept-language',
  'connection',
  'content-type',
  'content-length',
  'cookie',
  'authorization',
  'transfer-encoding',
]);
const HEADER_NAME_RE = /^[A-Za-z0-9-]{1,40}$/;

export interface ExternalRequest {
  method: 'GET' | 'POST';
  url: URL;
  body?: string;
  /** En-têtes en plus (ex. `apiKey` de NVD). Jamais recopiés dans une erreur. */
  headers?: Readonly<Record<string, string>>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ExternalResponse {
  status: number;
  text: string;
}

export interface ExternalApi {
  request(input: ExternalRequest): Promise<ExternalResponse>;
}

export interface ExternalApiOptions {
  resolve?: Resolve;
  /** Réservé aux tests : redirige la connexion après contrôle de l’IP. */
  dial?: Dial;
  /** Réservé aux tests : autorités supplémentaires. */
  ca?: string[];
  /** Hôtes autorisés. Défaut : PSI, CrUX et Green Web. */
  allow?: readonly string[];
  maxBytes?: number;
  botUrl?: string;
}

/**
 * Client HTTPS des API tierces allowlistées. Pas le site audité : `safeFetch`
 * reste le seul accès vers celui-ci. Ici, POST est permis (CrUX), le délai
 * peut atteindre 120 s (PSI), les redirections ne sont pas suivies, l’IP est
 * épinglée et aucune adresse non publique n’est contactée. La clé d’API, si
 * elle est dans l’URL, n’est pas recopiée dans les erreurs.
 */
export function createExternalApi(
  options: ExternalApiOptions = {},
): ExternalApi {
  const resolve = options.resolve ?? systemResolve;
  const dial = options.dial ?? directDial;
  const allow = new Set(
    (options.allow ?? EXTERNAL_API_HOSTS).map((host) => host.toLowerCase()),
  );
  const maxBytes = options.maxBytes ?? DEFAULT_EXTERNAL_MAX_BYTES;
  const ua = userAgent(options.botUrl);
  const pins = new Map<string, string>();

  return {
    async request(input) {
      const url = input.url;
      if (url.protocol !== 'https:') {
        throw new NetError('BLOCKED_SCHEME', 'Schéma refusé');
      }
      if (url.username || url.password) {
        throw new NetError('BLOCKED_CREDENTIALS', 'Identifiants refusés');
      }
      if (url.port && url.port !== '443') {
        throw new NetError('BLOCKED_PORT', 'Port refusé');
      }
      const host = url.hostname.toLowerCase().replace(/\.$/, '');
      if (!allow.has(host)) {
        throw new NetError('BLOCKED_ADDRESS', 'Hôte non autorisé');
      }
      if (input.method !== 'GET' && input.method !== 'POST') {
        throw new NetError('BLOCKED_METHOD', 'Méthode refusée');
      }
      const extra = extraHeaders(input.headers);
      const timeoutMs = input.timeoutMs ?? DEFAULT_EXTERNAL_TIMEOUT_MS;
      if (!(Number.isFinite(timeoutMs) && timeoutMs > 0)) {
        throw new NetError('TIMEOUT', 'Délai invalide');
      }

      const timeout = new AbortController();
      const timer = setTimeout(() => {
        timeout.abort(
          new NetError('TIMEOUT', `Délai de ${timeoutMs} ms dépassé`),
        );
      }, timeoutMs);
      const signal = input.signal
        ? AbortSignal.any([timeout.signal, input.signal])
        : timeout.signal;

      try {
        const ip = await pinAddress(host, resolve, pins, signal);
        const res = await send(
          url,
          ip,
          input.method,
          input.body,
          extra,
          ua,
          dial,
          options.ca,
          signal,
        );
        const status = res.statusCode ?? 0;
        if (REDIRECT_STATUSES.has(status)) {
          res.destroy();
          return { status, text: '' };
        }
        const contentType = String(res.headers['content-type'] ?? '');
        const body = await readBody(res, maxBytes, signal);
        return { status, text: decodeText(body, contentType) };
      } catch (error) {
        throw toNetError(error, signal);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function send(
  url: URL,
  ip: string,
  method: 'GET' | 'POST',
  body: string | undefined,
  extra: Record<string, string>,
  ua: string,
  dial: Dial,
  ca: string[] | undefined,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  const target = dial(ip, 443);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const headers: Record<string, string> = {
    ...extra,
    host: url.host,
    'user-agent': ua,
    accept: 'application/json',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'fr,en;q=0.5',
    connection: 'close',
  };
  if (body !== undefined) {
    headers['content-type'] = 'application/json; charset=utf-8';
    headers['content-length'] = String(Buffer.byteLength(body));
  }
  const request = https.request({
    host: target.host,
    port: target.port,
    method,
    path: `${url.pathname}${url.search}`,
    headers,
    agent: false,
    signal,
    ...(isIP(hostname) ? {} : { servername: hostname }),
    ...(ca ? { ca } : {}),
  });
  return new Promise((resolve, reject) => {
    request.once('response', resolve);
    request.once('error', reject);
    if (body === undefined) request.end();
    else request.end(body);
  });
}

async function readBody(
  res: IncomingMessage,
  limit: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const declared = Number(res.headers['content-length']);
  if (Number.isFinite(declared) && declared > limit) {
    res.destroy();
    throw new NetError(
      'RESPONSE_TOO_LARGE',
      `Réponse de ${declared} octets (max ${limit})`,
    );
  }
  const onAbort = () =>
    res.destroy(signal.reason instanceof Error ? signal.reason : undefined);
  signal.addEventListener('abort', onAbort, { once: true });
  const stream = decodeStream(res);
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for await (const chunk of stream) {
      const buf = chunk as Buffer;
      total += buf.length;
      if (total > limit) {
        throw new NetError(
          'RESPONSE_TOO_LARGE',
          `Réponse au-delà de ${limit} octets`,
        );
      }
      chunks.push(buf);
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    res.destroy();
    stream.destroy();
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function decodeStream(res: IncomingMessage): Readable {
  const encoding = String(res.headers['content-encoding'] ?? '')
    .trim()
    .toLowerCase();
  const noop = () => {};
  if (encoding === 'gzip' || encoding === 'x-gzip')
    return pipeline(res, createGunzip(), noop);
  if (encoding === 'deflate') return pipeline(res, createInflate(), noop);
  if (encoding === 'br') return pipeline(res, createBrotliDecompress(), noop);
  return res;
}

function decodeText(body: Uint8Array, contentType: string): string {
  const charset = /charset=([^;]+)/i
    .exec(contentType)?.[1]
    ?.trim()
    .replace(/"/g, '');
  try {
    return new TextDecoder(charset ?? 'utf-8').decode(body);
  } catch {
    return new TextDecoder('utf-8').decode(body);
  }
}

function extraHeaders(
  input: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) return out;
  for (const [name, value] of Object.entries(input)) {
    const key = name.toLowerCase();
    if (
      !HEADER_NAME_RE.test(name) ||
      RESERVED_HEADERS.has(key) ||
      Object.hasOwn(out, key) ||
      typeof value !== 'string' ||
      !/^[\x20-\x7e]{0,512}$/.test(value)
    ) {
      throw new NetError('BLOCKED_HEADER', 'En-tête refusé');
    }
    out[key] = value;
  }
  return out;
}

function redactSecrets(value: string): string {
  return value.replace(/([?&]key=)[^&\s"'<>]*/gi, '$1REDACTED');
}

function toNetError(error: unknown, signal: AbortSignal): NetError {
  if (signal.aborted && isNetError(signal.reason)) return signal.reason;
  if (isNetError(error)) return error;
  const cause =
    error instanceof Error
      ? new Error(redactSecrets(error.message))
      : undefined;
  if (signal.aborted) {
    return new NetError('NETWORK', 'Requête annulée', cause ? { cause } : {});
  }
  return new NetError('NETWORK', 'Erreur réseau', cause ? { cause } : {});
}
