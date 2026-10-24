import { isNetError, type SafeFetch, type SafeResponse } from '@audigy/net';
import type { RequestOutcome, RequestRecord } from './schema.js';
import { isThirdParty } from './site.js';

/** Sous-ensemble de `playwright.Route` utilisé : permet des tests sans navigateur. */
export interface RouteLike {
  request(): {
    url(): string;
    method(): string;
    resourceType(): string;
    headers(): Record<string, string>;
  };
  fulfill(response: {
    status: number;
    headers: Record<string, string>;
    body?: Buffer;
  }): Promise<void>;
  abort(errorCode?: string): Promise<void>;
}

interface CacheEntry {
  response: SafeResponse;
  /** Déjà livré au navigateur une fois : les livraisons suivantes ne coûtent rien au site. */
  served: boolean;
}

/** Réponses reçues pendant un audit, partagées entre les chargements (ordinateur puis téléphone). */
export type ResponseCache = Map<string, CacheEntry>;

export function createResponseCache(): ResponseCache {
  return new Map();
}

export interface InterceptorOptions {
  fetch: SafeFetch;
  firstPartyHost: string;
  cache: ResponseCache;
}

export interface Interceptor {
  handle(route: RouteLike): Promise<void>;
  /** Enregistre une connexion WebSocket refusée (jamais ouverte). */
  recordWebSocket(url: string): void;
  readonly records: RequestRecord[];
  /** Noms des traces posées par un en-tête `Set-Cookie`, par hôte. */
  readonly headerCookies: ReadonlyMap<string, ReadonlySet<string>>;
  /** URL refusées par le runner (anti-SSRF, budget, schéma, envoi). */
  readonly refused: ReadonlySet<string>;
  readonly budgetExhausted: boolean;
  /** Requêtes en cours de traitement. */
  readonly inflight: number;
  /** Requêtes vues, y compris au-delà de `MAX_RECORDS`. */
  readonly total: number;
  /** Octets reçus sur le réseau (ou rejoués du cache), y compris au-delà de `MAX_RECORDS`. */
  readonly transferBytes: number;
}

const ALLOWED_METHODS = new Set(['GET', 'HEAD']);
const HOP_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'set-cookie',
]);
const BLOCKED_CODES = new Set([
  'BLOCKED_ADDRESS',
  'BLOCKED_PORT',
  'BLOCKED_SCHEME',
  'BLOCKED_CREDENTIALS',
  'BLOCKED_METHOD',
  'INVALID_URL',
  'BUDGET_EXCEEDED',
  'RESPONSE_TOO_LARGE',
  'TOO_MANY_REDIRECTS',
]);
const MAX_URL = 2048;
export const MAX_RECORDS = 1000;

/**
 * Toute requête du navigateur passe par ici : rien ne sort sans `safeFetch` (anti-SSRF,
 * IP épinglée, budget). Seuls GET et HEAD partent. Un envoi (POST, balise…) reçoit une
 * réponse vide locale et n'atteint jamais le site : on observe, on ne soumet rien.
 */
export function createInterceptor(options: InterceptorOptions): Interceptor {
  const records: RequestRecord[] = [];
  const headerCookies = new Map<string, Set<string>>();
  const refused = new Set<string>();
  let budgetExhausted = false;
  let inflight = 0;
  let total = 0;
  let transferBytes = 0;

  const record = (
    url: string,
    method: string,
    resourceType: string,
    outcome: RequestOutcome,
    extra: Partial<
      Pick<RequestRecord, 'status' | 'mimeType' | 'transferBytes' | 'reason'>
    > = {},
  ): void => {
    total += 1;
    transferBytes += extra.transferBytes ?? 0;
    if (outcome === 'blocked' || outcome === 'stubbed') refused.add(url);
    if (records.length >= MAX_RECORDS) return;
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      host = '';
    }
    records.push({
      url: url.slice(0, MAX_URL),
      method: method.slice(0, 16),
      resourceType: resourceType.slice(0, 32),
      host,
      thirdParty: host !== '' && isThirdParty(host, options.firstPartyHost),
      outcome,
      status: extra.status ?? null,
      mimeType: extra.mimeType ?? null,
      transferBytes: extra.transferBytes ?? 0,
      reason: extra.reason ?? null,
    });
  };

  const rememberCookies = (response: SafeResponse): void => {
    const names = response.headers
      .getSetCookie()
      .map((line) => line.split('=')[0]?.trim() ?? '')
      .filter((name) => name !== '');
    if (names.length === 0) return;
    const host = new URL(response.url).hostname;
    const known = headerCookies.get(host) ?? new Set<string>();
    for (const name of names) known.add(name);
    headerCookies.set(host, known);
  };

  async function handle(route: RouteLike): Promise<void> {
    inflight += 1;
    try {
      await handleOne(route);
    } finally {
      inflight -= 1;
    }
  }

  async function handleOne(route: RouteLike): Promise<void> {
    const request = route.request();
    const url = request.url();
    const method = request.method().toUpperCase();
    const type = request.resourceType();

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      record(url, method, type, 'blocked', { reason: 'INVALID_URL' });
      await route.abort('blockedbyclient');
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      record(url, method, type, 'blocked', { reason: 'BLOCKED_SCHEME' });
      await route.abort('blockedbyclient');
      return;
    }
    if (!ALLOWED_METHODS.has(method)) {
      record(url, method, type, 'stubbed', { status: 204, reason: 'METHOD' });
      const origin = request.headers().origin;
      await route.fulfill({
        status: 204,
        headers: origin
          ? {
              'access-control-allow-origin': origin,
              'access-control-allow-credentials': 'true',
            }
          : {},
      });
      return;
    }

    const key = `${method} ${parsed.href}`;
    const cached = options.cache.get(key);
    if (cached) {
      const outcome = cached.served ? 'cache' : 'network';
      cached.served = true;
      await deliver(route, cached.response, url, method, type, outcome);
      return;
    }

    let response: SafeResponse;
    try {
      response = await options.fetch(parsed, {
        method: method as 'GET' | 'HEAD',
      });
    } catch (error) {
      const code = isNetError(error) ? error.code : 'NETWORK';
      const blocked = BLOCKED_CODES.has(code);
      if (code === 'BUDGET_EXCEEDED' || code === 'RESPONSE_TOO_LARGE')
        budgetExhausted = true;
      record(url, method, type, blocked ? 'blocked' : 'error', {
        reason: code.slice(0, 64),
      });
      await route.abort(blocked ? 'blockedbyclient' : 'failed');
      return;
    }
    rememberCookies(response);

    if (response.url !== parsed.href) {
      // Redirection déjà suivie (et revalidée) par safeFetch : le navigateur la rejoue
      // sur l'URL finale, servie depuis le cache, pour résoudre les chemins relatifs.
      options.cache.set(`${method} ${response.url}`, {
        response,
        served: false,
      });
      record(url, method, type, 'network', { status: 302 });
      await route.fulfill({ status: 302, headers: { location: response.url } });
      return;
    }
    options.cache.set(key, { response, served: true });
    await deliver(route, response, url, method, type, 'network');
  }

  async function deliver(
    route: RouteLike,
    response: SafeResponse,
    url: string,
    method: string,
    type: string,
    outcome: RequestOutcome,
  ): Promise<void> {
    const contentType = response.headers.get('content-type');
    record(url, method, type, outcome, {
      status: response.status,
      mimeType: contentType?.split(';')[0]?.trim().slice(0, 128) || null,
      transferBytes: response.transferBytes,
    });
    await route.fulfill({
      status: response.status,
      headers: fulfillHeaders(response.headers),
      body: Buffer.from(response.body),
    });
  }

  return {
    handle,
    recordWebSocket(url) {
      record(url, 'GET', 'websocket', 'blocked', { reason: 'WEBSOCKET' });
    },
    records,
    headerCookies,
    refused,
    get budgetExhausted() {
      return budgetExhausted;
    },
    get inflight() {
      return inflight;
    },
    get total() {
      return total;
    },
    get transferBytes() {
      return transferBytes;
    },
  };
}

/** En-têtes rejoués au navigateur : le corps est déjà décompressé, la longueur recalculée. */
export function fulfillHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, name) => {
    if (!HOP_HEADERS.has(name.toLowerCase())) out[name.toLowerCase()] = value;
  });
  const cookies = headers.getSetCookie();
  if (cookies.length > 0) out['set-cookie'] = cookies.join('\n');
  return out;
}
