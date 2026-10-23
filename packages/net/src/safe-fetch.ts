import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { pipeline, type Readable } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import type { RequestBudget } from './budget.js';
import { isNetError, NetError } from './errors.js';
import {
  type Dial,
  directDial,
  pinAddress,
  type Resolve,
  systemResolve,
} from './target.js';

export const ALLOWED_PORTS: ReadonlySet<number> = new Set([80, 443]);
export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_MAX_HTML_BYTES = 5 * 1024 * 1024;
export const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
export const BOT_NAME = 'AudigyBot/1.0';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface SafeFetchOptions {
  resolve?: Resolve;
  budget?: RequestBudget;
  timeoutMs?: number;
  maxRedirects?: number;
  maxHtmlBytes?: number;
  maxBytes?: number;
  /** URL publique d'Audigy (`APP_BASE_URL`), ajoutée au User-Agent : `AudigyBot/1.0 (+<url>/robot)`. */
  botUrl?: string;
  /** Réservé aux tests. */
  dial?: Dial;
  /** Réservé aux tests : autorités de certification supplémentaires. */
  ca?: string[];
}

export interface SafeFetchInit {
  method?: 'GET' | 'HEAD';
  accept?: string;
  signal?: AbortSignal;
}

export interface SafeResponse {
  /** URL finale, après redirections. */
  url: string;
  status: number;
  headers: Headers;
  body: Uint8Array;
  /** IP effectivement contactée pour la dernière requête. */
  ip: string;
  /** URLs intermédiaires suivies (sans l'URL finale). */
  redirects: string[];
  text(): string;
}

export type SafeFetch = (
  input: string | URL,
  init?: SafeFetchInit,
) => Promise<SafeResponse>;

export function userAgent(botUrl?: string): string {
  return botUrl
    ? `${BOT_NAME} (+${botUrl.replace(/\/+$/, '')}/robot)`
    : BOT_NAME;
}

/** Valide une URL cible : schéma http/https, ports 80/443, aucun identifiant. */
export function validateTargetUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(String(input));
  } catch (error) {
    throw new NetError('INVALID_URL', 'URL invalide', { cause: error });
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new NetError('BLOCKED_SCHEME', `Schéma refusé (${url.protocol})`);
  }
  if (url.username || url.password) {
    throw new NetError(
      'BLOCKED_CREDENTIALS',
      'Identifiants dans l’URL refusés',
    );
  }
  if (!ALLOWED_PORTS.has(portOf(url))) {
    throw new NetError('BLOCKED_PORT', `Port refusé (${url.port})`);
  }
  url.hash = '';
  return url;
}

function portOf(url: URL): number {
  if (url.port) return Number(url.port);
  return url.protocol === 'https:' ? 443 : 80;
}

/**
 * Crée un `safeFetch` dont les IP épinglées vivent aussi longtemps que l'instance
 * (un audit) : un hôte est résolu une seule fois.
 */
export function createSafeFetch(options: SafeFetchOptions = {}): SafeFetch {
  const resolve = options.resolve ?? systemResolve;
  const dial = options.dial ?? directDial;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxHtmlBytes = options.maxHtmlBytes ?? DEFAULT_MAX_HTML_BYTES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const ua = userAgent(options.botUrl);
  const pins = new Map<string, string>();

  return async function safeFetch(input, init = {}) {
    const method = init.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      throw new NetError(
        'BLOCKED_METHOD',
        `Méthode refusée (${String(method)})`,
      );
    }
    const redirects: string[] = [];
    let current = validateTargetUrl(input);

    for (let hop = 0; ; hop++) {
      const timeout = new AbortController();
      const timer = setTimeout(
        () =>
          timeout.abort(
            new NetError('TIMEOUT', `Délai de ${timeoutMs} ms dépassé`),
          ),
        timeoutMs,
      );
      const signal = init.signal
        ? AbortSignal.any([timeout.signal, init.signal])
        : timeout.signal;
      try {
        const ip = await pinAddress(current.hostname, resolve, pins, signal);
        await options.budget?.acquire(current.hostname);
        const res = await send(
          current,
          ip,
          method,
          ua,
          init.accept,
          dial,
          options.ca,
          signal,
        );
        const location = res.headers.location;
        if (REDIRECT_STATUSES.has(res.statusCode ?? 0) && location) {
          res.destroy();
          if (hop >= maxRedirects) {
            throw new NetError(
              'TOO_MANY_REDIRECTS',
              `Plus de ${maxRedirects} redirections`,
            );
          }
          redirects.push(current.href);
          current = validateTargetUrl(new URL(location, current));
          continue;
        }
        const isHtml = /html/i.test(String(res.headers['content-type'] ?? ''));
        const limit = isHtml ? maxHtmlBytes : maxBytes;
        const body =
          method === 'HEAD'
            ? new Uint8Array(0)
            : await readBody(res, limit, options.budget, signal);
        return toResponse(current, res, body, ip, redirects);
      } catch (error) {
        throw toNetError(error, signal);
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

function send(
  url: URL,
  ip: string,
  method: string,
  ua: string,
  accept: string | undefined,
  dial: Dial,
  ca: string[] | undefined,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  const target = dial(ip, portOf(url));
  const secure = url.protocol === 'https:';
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const headers: Record<string, string> = {
    host: url.host,
    'user-agent': ua,
    accept: accept ?? '*/*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'fr,en;q=0.5',
    connection: 'close',
  };
  const request = (secure ? https : http).request({
    host: target.host,
    port: target.port,
    method,
    path: `${url.pathname}${url.search}`,
    headers,
    agent: false,
    signal,
    ...(secure && !isIP(hostname) ? { servername: hostname } : {}),
    ...(secure && ca ? { ca } : {}),
  });
  return new Promise((resolve, reject) => {
    request.once('response', resolve);
    request.once('error', reject);
    request.end();
  });
}

async function readBody(
  res: IncomingMessage,
  limit: number,
  budget: RequestBudget | undefined,
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
  const stream = decode(res);
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
      budget?.consumeBytes(buf.length);
      chunks.push(buf);
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    res.destroy();
    stream.destroy();
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function decode(res: IncomingMessage): Readable {
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

function toResponse(
  url: URL,
  res: IncomingMessage,
  body: Uint8Array,
  ip: string,
  redirects: string[],
): SafeResponse {
  const headers = new Headers();
  const raw = res.rawHeaders;
  for (let i = 0; i + 1 < raw.length; i += 2)
    headers.append(raw[i] as string, raw[i + 1] as string);
  const charset = /charset=([^;]+)/i
    .exec(headers.get('content-type') ?? '')?.[1]
    ?.trim()
    .replace(/"/g, '');
  return {
    url: url.href,
    status: res.statusCode ?? 0,
    headers,
    body,
    ip,
    redirects,
    text() {
      try {
        return new TextDecoder(charset ?? 'utf-8').decode(body);
      } catch {
        return new TextDecoder('utf-8').decode(body);
      }
    },
  };
}

function toNetError(error: unknown, signal: AbortSignal): NetError {
  if (signal.aborted && isNetError(signal.reason)) return signal.reason;
  if (isNetError(error)) return error;
  if (signal.aborted)
    return new NetError('NETWORK', 'Requête annulée', { cause: error });
  return new NetError('NETWORK', 'Erreur réseau', { cause: error });
}
