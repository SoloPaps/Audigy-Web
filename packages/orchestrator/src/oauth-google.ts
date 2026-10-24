import { createHash, randomBytes } from 'node:crypto';
import {
  createServiceClient,
  createUserClient,
  type Database,
  dbEnvFrom,
} from '@audigy/db';
import {
  createExternalApi,
  createGoogleAuthClient,
  GOOGLE_WEBMASTERS_SCOPE,
  type GoogleAuthClient,
} from '@audigy/net';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { apiError, bearerToken } from './http.js';
import { errorCode, type Logger } from './log.js';
import {
  bufferToBytea,
  byteaToBuffer,
  createOauthCrypto,
  type OauthCrypto,
  parseTokenKey,
  sameSecret,
} from './token-box.js';

const COOKIE = 'audigy_gsc';
const COOKIE_PATH = '/';
/** Ancien chemin : à effacer pour qu’il ne masque pas le cookie `Path=/`. */
const LEGACY_COOKIE_PATH = '/api/oauth/google';
const MAX_AGE = 600;
/**
 * Les codes Google actuels ont la forme `4/0A…` (slash).
 * RFC 6749 n’autorise que les caractères non réservés : ce filtre les rejetait
 * avant l’échange, sans journal.
 */
const AUTH_CODE = /^[A-Za-z0-9\-._~+/=]{16,512}$/;
const USER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pendingSchema = z.object({
  state: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  userId: z.string().regex(USER_ID),
  exp: z.number().int(),
});

export interface OauthConfig {
  clientId: string;
  origin: string;
  redirectUri: string;
  secureCookie: boolean;
}

export interface OauthTokenRows {
  save(userId: string, blob: Buffer): Promise<void>;
  read(userId: string): Promise<Buffer | null>;
  remove(userId: string): Promise<void>;
}

export interface OauthDeps {
  logger: Logger;
  userFromToken(token: string): Promise<string | null>;
  rows: OauthTokenRows;
  config: OauthConfig | null;
  crypto: OauthCrypto | null;
  google: GoogleAuthClient | null;
  now(): number;
  random(size: number): Buffer;
}

export function readOauthConfig(
  env: NodeJS.ProcessEnv,
): { config: OauthConfig; key: Buffer; clientSecret: string } | null {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? '';
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? '';
  const key = parseTokenKey(env.TOKEN_ENC_KEY);
  const origin = appOrigin(env.APP_BASE_URL);
  if (!clientId || !clientSecret || !key || !origin) return null;
  return {
    key,
    clientSecret,
    config: {
      clientId,
      origin: origin.href,
      redirectUri: new URL('/api/oauth/google/callback', origin).href,
      secureCookie: origin.protocol === 'https:',
    },
  };
}

export function oauthDepsFromEnv(options: {
  env: NodeJS.ProcessEnv;
  logger: Logger;
}): OauthDeps {
  const { env, logger } = options;
  const db = dbEnvFrom(env);
  const anon = createUserClient(db);
  const service = createServiceClient(db);
  const read = readOauthConfig(env);
  const api = createExternalApi();
  return {
    logger,
    userFromToken: (token) => userIdOf(anon, token),
    rows: supabaseOauthRows(service),
    config: read?.config ?? null,
    crypto: read ? createOauthCrypto(read.key) : null,
    google: read
      ? createGoogleAuthClient({
          api,
          clientId: read.config.clientId,
          clientSecret: read.clientSecret,
        })
      : null,
    now: () => Date.now(),
    random: (size) => randomBytes(size),
  };
}

export function supabaseOauthRows(
  service: SupabaseClient<Database>,
): OauthTokenRows {
  return {
    async save(userId, blob) {
      const { error } = await service.from('oauth_tokens').upsert({
        user_id: userId,
        provider: 'google',
        scope: 'webmasters.readonly',
        refresh_token_enc: bufferToBytea(blob),
      });
      if (error) throw new Error('oauth_save_failed');
    },
    async read(userId) {
      const { data, error } = await service
        .from('oauth_tokens')
        .select('refresh_token_enc')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle();
      if (error) throw new Error('oauth_read_failed');
      if (!data?.refresh_token_enc) return null;
      return byteaToBuffer(data.refresh_token_enc);
    },
    async remove(userId) {
      const { error } = await service
        .from('oauth_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'google');
      if (error) throw new Error('oauth_delete_failed');
    },
  };
}

/** Démarre OAuth : PKCE, `state`, accès hors ligne. Jamais de jeton dans la réponse. */
export async function handleOauthStart(
  req: Request,
  deps: OauthDeps,
): Promise<Response> {
  if (req.method !== 'POST') {
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  }
  const ready = readyDeps(deps);
  if (!ready) return apiError(503, 'oauth_unconfigured');
  const token = bearerToken(req);
  if (!token) return apiError(401, 'unauthorized');
  const userId = await deps.userFromToken(token);
  if (!userId || !USER_ID.test(userId)) return apiError(401, 'unauthorized');

  const state = deps.random(32).toString('base64url');
  const verifier = deps.random(32).toString('base64url');
  const pending = {
    state,
    verifier,
    userId,
    exp: deps.now() + MAX_AGE * 1000,
  };
  const config = configForRequest(ready.config, req);
  const cookies = [
    seal(ready.crypto, pending, config),
    clearCookie(config, LEGACY_COOKIE_PATH),
  ];
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_WEBMASTERS_SCOPE);
  url.searchParams.set('code_challenge', challengeOf(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return json(200, { authorizeUrl: url.href }, cookies);
}

/** Échange le code, chiffre le jeton de rafraîchissement, redirige sans le renvoyer. */
export async function handleOauthCallback(
  req: Request,
  deps: OauthDeps,
): Promise<Response> {
  if (req.method !== 'GET') {
    return apiError(405, 'method_not_allowed', {}, { allow: 'GET' });
  }
  const ready = readyDeps(deps);
  if (!ready) return apiError(503, 'oauth_unconfigured');
  const config = configForRequest(ready.config, req);
  const url = new URL(req.url);
  if (url.searchParams.get('error')) return back(config, 'erreur');
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  if (!AUTH_CODE.test(code)) {
    deps.logger.warn('oauth_google_callback_rejected', {
      reason: 'invalid_code',
    });
    return back(config, 'erreur');
  }
  const matched = matchPending(
    ready.crypto,
    readCookies(req.headers.get('cookie'), COOKIE),
    state,
    deps.now(),
  );
  if (!matched.pending) {
    deps.logger.warn('oauth_google_state_rejected', {
      hasCookie: matched.hasCookie,
      hasPending: matched.hasPending,
      expired: matched.expired,
      stateMismatch: matched.stateMismatch,
    });
    return back(config, 'erreur');
  }
  const pending = matched.pending;
  try {
    const tokens = await ready.google.exchange({
      code,
      verifier: pending.verifier,
      redirectUri: config.redirectUri,
    });
    if (!tokens.refreshToken) {
      deps.logger.warn('oauth_google_callback_failed', {
        code: 'no_refresh_token',
      });
      return back(config, 'erreur');
    }
    if (!tokens.scope.split(/[\s,]+/).includes(GOOGLE_WEBMASTERS_SCOPE)) {
      deps.logger.warn('oauth_google_callback_failed', {
        code: 'scope_missing',
      });
      return back(config, 'erreur');
    }
    await deps.rows.save(
      pending.userId,
      ready.crypto.encrypt(tokens.refreshToken),
    );
    deps.logger.info('oauth_google_saved', { provider: 'google' });
    return back(config, 'ok');
  } catch (error) {
    deps.logger.warn('oauth_google_callback_failed', {
      code: errorCode(error),
    });
    return back(config, 'erreur');
  }
}

/** Révoque chez Google puis supprime la ligne. La réponse ne contient pas le jeton. */
export async function handleOauthRevoke(
  req: Request,
  deps: OauthDeps,
): Promise<Response> {
  if (req.method !== 'POST') {
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  }
  const ready = readyDeps(deps);
  if (!ready) return apiError(503, 'oauth_unconfigured');
  const token = bearerToken(req);
  if (!token) return apiError(401, 'unauthorized');
  const userId = await deps.userFromToken(token);
  if (!userId || !USER_ID.test(userId)) return apiError(401, 'unauthorized');

  let refresh: string | null = null;
  try {
    const blob = await deps.rows.read(userId);
    if (blob) refresh = ready.crypto.decrypt(blob);
  } catch (error) {
    deps.logger.warn('oauth_token_unreadable', { code: errorCode(error) });
  }
  if (refresh) {
    try {
      await ready.google.revoke(refresh);
    } catch (error) {
      deps.logger.warn('oauth_revoke_failed', { code: errorCode(error) });
    }
  }
  await deps.rows.remove(userId);
  deps.logger.info('oauth_google_revoked', { provider: 'google' });
  return json(200, { ok: true });
}

function readyDeps(deps: OauthDeps): {
  config: OauthConfig;
  crypto: OauthCrypto;
  google: GoogleAuthClient;
} | null {
  if (!deps.config || !deps.crypto || !deps.google) return null;
  return { config: deps.config, crypto: deps.crypto, google: deps.google };
}

function challengeOf(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

function seal(
  crypto: OauthCrypto,
  pending: z.infer<typeof pendingSchema>,
  config: OauthConfig,
): string {
  const blob = crypto.encrypt(JSON.stringify(pending)).toString('base64url');
  return cookieHeader(blob, config, COOKIE_PATH, MAX_AGE);
}

function clearCookie(config: OauthConfig, path: string): string {
  return cookieHeader('', config, path, 0);
}

function cookieHeader(
  value: string,
  config: OauthConfig,
  path: string,
  maxAge: number,
): string {
  const parts = [
    `${COOKIE}=${value}`,
    'HttpOnly',
    'SameSite=Lax',
    `Path=${path}`,
    `Max-Age=${maxAge}`,
  ];
  if (config.secureCookie) parts.push('Secure');
  return parts.join('; ');
}

/** Accepte le cookie dont le state correspond, même si un ancien chemin est encore envoyé. */
function matchPending(
  crypto: OauthCrypto,
  raws: readonly string[],
  state: string,
  now: number,
): {
  pending: z.infer<typeof pendingSchema> | null;
  hasCookie: boolean;
  hasPending: boolean;
  expired: boolean;
  stateMismatch: boolean;
} {
  let hasPending = false;
  let expired = false;
  let stateMismatch = false;
  for (const raw of raws) {
    const pending = open(crypto, raw);
    if (!pending) continue;
    hasPending = true;
    if (pending.exp < now) {
      expired = true;
      continue;
    }
    if (!sameSecret(pending.state, state)) {
      stateMismatch = true;
      continue;
    }
    return {
      pending,
      hasCookie: true,
      hasPending: true,
      expired: false,
      stateMismatch: false,
    };
  }
  return {
    pending: null,
    hasCookie: raws.length > 0,
    hasPending,
    expired,
    stateMismatch,
  };
}

function open(
  crypto: OauthCrypto,
  raw: string | null,
): z.infer<typeof pendingSchema> | null {
  if (!raw) return null;
  try {
    const plain = crypto.decrypt(Buffer.from(raw, 'base64url'));
    const parsed = pendingSchema.safeParse(JSON.parse(plain));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function readCookies(header: string | null, name: string): string[] {
  if (!header) return [];
  const values: string[] = [];
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
    if (value) values.push(value);
  }
  return values;
}

/**
 * En http local, `redirect_uri` et le retour suivent l'en-tête Host
 * (`localhost` ou `127.0.0.1`, même port que `APP_BASE_URL`).
 * Le cookie `audigy_gsc` est limité à cet hôte : un aller sur 127.0.0.1
 * et un retour sur localhost perd la session Supabase (`audigy-auth`)
 * et le state. En https, `APP_BASE_URL` seul — Host est ignoré.
 * Le client Google doit lister les deux URI de redirection locales.
 */
function configForRequest(config: OauthConfig, req: Request): OauthConfig {
  const configured = appOrigin(config.origin);
  if (!configured || !isLocalHttp(configured)) return config;
  const local =
    localOriginFromHost(req.headers.get('host'), configured) ??
    localOriginFromRequestUrl(req.url, configured);
  if (!local || local.href === configured.href) return config;
  return {
    ...config,
    origin: local.href,
    redirectUri: new URL('/api/oauth/google/callback', local).href,
    secureCookie: false,
  };
}

function isLocalHttp(url: URL): boolean {
  return (
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  );
}

function httpPort(url: URL): string {
  return url.port || '80';
}

function localOriginFromHost(host: string | null, configured: URL): URL | null {
  if (!host) return null;
  const trimmed = host.trim();
  if (
    !trimmed ||
    trimmed.includes('/') ||
    trimmed.includes('@') ||
    /[\s,\\]/.test(trimmed)
  ) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(`http://${trimmed}`);
  } catch {
    return null;
  }
  if (!isLocalHttp(url) || httpPort(url) !== httpPort(configured)) return null;
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
}

function localOriginFromRequestUrl(raw: string, configured: URL): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!isLocalHttp(url) || httpPort(url) !== httpPort(configured)) return null;
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
}

function appOrigin(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  const local =
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.protocol !== 'https:' && !local) return null;
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
}

function back(config: OauthConfig, etat: 'ok' | 'erreur'): Response {
  const url = new URL('/search-console', config.origin);
  url.searchParams.set('etat', etat);
  const headers = new Headers({
    location: url.href,
    'cache-control': 'no-store',
  });
  headers.append('set-cookie', clearCookie(config, COOKIE_PATH));
  headers.append('set-cookie', clearCookie(config, LEGACY_COOKIE_PATH));
  return new Response(null, { status: 302, headers });
}

function json(status: number, body: unknown, cookies: string[] = []): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

async function userIdOf(
  anon: ReturnType<typeof createUserClient>,
  token: string,
): Promise<string | null> {
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
