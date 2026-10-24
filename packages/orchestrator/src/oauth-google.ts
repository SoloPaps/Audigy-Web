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
const MAX_AGE = 600;
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
  const cookie = seal(ready.crypto, pending, ready.config);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', ready.config.clientId);
  url.searchParams.set('redirect_uri', ready.config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_WEBMASTERS_SCOPE);
  url.searchParams.set('code_challenge', challengeOf(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return json(200, { authorizeUrl: url.href }, { 'set-cookie': cookie });
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
  const url = new URL(req.url);
  if (url.searchParams.get('error')) return back(ready.config, 'erreur');
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  if (!/^[\w\-._~]{16,512}$/.test(code)) return back(ready.config, 'erreur');
  const pending = open(
    ready.crypto,
    readCookie(req.headers.get('cookie'), COOKIE),
  );
  if (
    !pending ||
    pending.exp < deps.now() ||
    !sameSecret(pending.state, state)
  ) {
    return back(ready.config, 'erreur');
  }
  try {
    const tokens = await ready.google.exchange({
      code,
      verifier: pending.verifier,
      redirectUri: ready.config.redirectUri,
    });
    if (!tokens.refreshToken) return back(ready.config, 'erreur');
    if (!tokens.scope.split(/[\s,]+/).includes(GOOGLE_WEBMASTERS_SCOPE)) {
      return back(ready.config, 'erreur');
    }
    await deps.rows.save(
      pending.userId,
      ready.crypto.encrypt(tokens.refreshToken),
    );
    deps.logger.info('oauth_google_saved', { provider: 'google' });
    return back(ready.config, 'ok');
  } catch (error) {
    deps.logger.warn('oauth_google_callback_failed', {
      code: errorCode(error),
    });
    return back(ready.config, 'erreur');
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
  const parts = [
    `${COOKIE}=${blob}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/oauth/google',
    `Max-Age=${MAX_AGE}`,
  ];
  if (config.secureCookie) parts.push('Secure');
  return parts.join('; ');
}

function clearCookie(config: OauthConfig): string {
  const parts = [
    `${COOKIE}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/oauth/google',
    'Max-Age=0',
  ];
  if (config.secureCookie) parts.push('Secure');
  return parts.join('; ');
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

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    return part.slice(eq + 1).trim();
  }
  return null;
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
  return new Response(null, {
    status: 302,
    headers: {
      location: url.href,
      'cache-control': 'no-store',
      'set-cookie': clearCookie(config),
    },
  });
}

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

async function userIdOf(
  anon: ReturnType<typeof createUserClient>,
  token: string,
): Promise<string | null> {
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
