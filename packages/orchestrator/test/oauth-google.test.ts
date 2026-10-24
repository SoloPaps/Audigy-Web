import { createHash } from 'node:crypto';
import { GOOGLE_WEBMASTERS_SCOPE } from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { loadSearchConsole } from '../src/gsc-port.js';
import { createLogger } from '../src/log.js';
import {
  handleOauthCallback,
  handleOauthRevoke,
  handleOauthStart,
  type OauthDeps,
  type OauthTokenRows,
} from '../src/oauth-google.js';
import {
  bufferToBytea,
  byteaToBuffer,
  createOauthCrypto,
  parseTokenKey,
} from '../src/token-box.js';

const USER = '11111111-1111-4111-8111-111111111111';
const REFRESH = 'refresh-token-sentinel-value';
const ACCESS = 'access-token-sentinel-value';
const SECRET = 'client-secret-sentinel-value';
const KEY = Buffer.alloc(32, 9).toString('base64');

function memoryRows(): OauthTokenRows & {
  blobs: Map<string, Buffer>;
} {
  const blobs = new Map<string, Buffer>();
  return {
    blobs,
    async save(userId, blob) {
      blobs.set(userId, blob);
    },
    async read(userId) {
      return blobs.get(userId) ?? null;
    },
    async remove(userId) {
      blobs.delete(userId);
    },
  };
}

function sequenced(): (size: number) => Buffer {
  let n = 1;
  return (size) => {
    const buf = Buffer.alloc(size, n);
    n += 1;
    return buf;
  };
}

function harness(
  patch: Partial<OauthDeps> = {},
): OauthDeps & { rows: ReturnType<typeof memoryRows>; lines: string[] } {
  const lines: string[] = [];
  const crypto = createOauthCrypto(parseTokenKey(KEY) as Buffer);
  const rows = memoryRows();
  return {
    logger: createLogger({
      sink: (line) => lines.push(line),
      secrets: [SECRET, REFRESH, ACCESS],
    }),
    userFromToken: async () => USER,
    config: {
      clientId: 'client-id.apps.googleusercontent.com',
      origin: 'https://audigy.example/',
      redirectUri: 'https://audigy.example/api/oauth/google/callback',
      secureCookie: true,
    },
    crypto,
    google: {
      async exchange() {
        return {
          accessToken: ACCESS,
          refreshToken: REFRESH,
          scope: GOOGLE_WEBMASTERS_SCOPE,
          expiresIn: 3600,
        };
      },
      async refresh() {
        return {
          accessToken: ACCESS,
          scope: GOOGLE_WEBMASTERS_SCOPE,
          expiresIn: 3600,
        };
      },
      async revoke() {},
    },
    now: () => 1_000_000,
    random: sequenced(),
    ...patch,
    rows,
    lines,
  };
}

function startRequest(): Request {
  return new Request('https://audigy.example/api/oauth/google/start', {
    method: 'POST',
    headers: { authorization: 'Bearer header.payload.signature' },
  });
}

function setCookies(response: Response): string[] {
  return response.headers.getSetCookie();
}

function liveCookie(response: Response): string {
  const live = setCookies(response).find(
    (item) => item.startsWith('audigy_gsc=') && !item.includes('Max-Age=0'),
  );
  return live ?? '';
}

function cookieValue(header: string): string {
  const raw = header.split(';')[0] ?? '';
  return raw.slice('audigy_gsc='.length);
}

describe('chiffrement des jetons', () => {
  it('chiffre en AES-256-GCM et refuse une clé ou un sceau falsifié', () => {
    expect(parseTokenKey(undefined)).toBeNull();
    expect(parseTokenKey('trop-court')).toBeNull();
    const key = parseTokenKey(KEY);
    expect(key?.length).toBe(32);
    const crypto = createOauthCrypto(key as Buffer);
    const blob = crypto.encrypt(REFRESH);
    expect(blob.includes(Buffer.from(REFRESH))).toBe(false);
    expect(crypto.decrypt(blob)).toBe(REFRESH);
    expect(crypto.decrypt(crypto.encrypt(REFRESH)).length).toBe(REFRESH.length);
    const tampered = Buffer.from(blob);
    const last = tampered.length - 1;
    tampered.writeUInt8((tampered.readUInt8(last) ^ 1) & 0xff, last);
    expect(() => crypto.decrypt(tampered)).toThrow(/token_invalid/);
    const other = createOauthCrypto(Buffer.alloc(32, 3));
    expect(() => other.decrypt(blob)).toThrow(/token_invalid/);
    const bytea = bufferToBytea(blob);
    expect(bytea.startsWith('\\x')).toBe(true);
    expect(byteaToBuffer(bytea).equals(blob)).toBe(true);
  });
});

describe('OAuth Google', () => {
  it('démarre en PKCE, state et accès hors ligne, sans jeton', async () => {
    const deps = harness();
    const response = await handleOauthStart(startRequest(), deps);
    const body = (await response.json()) as { authorizeUrl: string };
    const url = new URL(body.authorizeUrl);
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe(GOOGLE_WEBMASTERS_SCOPE);
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://audigy.example/api/oauth/google/callback',
    );
    const cookie = liveCookie(response);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toMatch(/(?:^|; )Path=\/;/);
    expect(cookie).not.toContain('Path=/api/oauth/google');
    const pending = JSON.parse(
      deps.crypto?.decrypt(Buffer.from(cookieValue(cookie), 'base64url')) ?? '',
    ) as { state: string; verifier: string };
    expect(url.searchParams.get('state')).toBe(pending.state);
    expect(url.searchParams.get('code_challenge')).toBe(
      createHash('sha256').update(pending.verifier).digest('base64url'),
    );
    const packed = JSON.stringify(body) + cookie;
    expect(packed).not.toContain(pending.verifier);
    expect(packed).not.toContain(SECRET);
    expect(packed).not.toContain(REFRESH);
    expect(packed).not.toContain(ACCESS);
  });

  it('enregistre le jeton chiffré et ne le renvoie pas', async () => {
    const deps = harness();
    const started = await handleOauthStart(startRequest(), deps);
    const cookie = liveCookie(started);
    const pending = JSON.parse(
      deps.crypto?.decrypt(Buffer.from(cookieValue(cookie), 'base64url')) ?? '',
    ) as { state: string; verifier: string };
    const response = await handleOauthCallback(
      new Request(
        `https://audigy.example/api/oauth/google/callback?code=4/0Acode-value-0123456789&state=${pending.state}`,
        { headers: { cookie: `audigy_gsc=${cookieValue(cookie)}` } },
      ),
      deps,
    );
    expect(response.status).toBe(302);
    const location = response.headers.get('location') ?? '';
    expect(location).toBe('https://audigy.example/search-console?etat=ok');
    const packed =
      location +
      (await response.text()) +
      (response.headers.get('set-cookie') ?? '');
    expect(packed).not.toContain(REFRESH);
    expect(packed).not.toContain(ACCESS);
    expect(packed).not.toContain(SECRET);
    expect(
      setCookies(response).some((item) => /(?:^|; )Path=\/;/.test(item)),
    ).toBe(true);
    const blob = deps.rows.blobs.get(USER);
    expect(blob).toBeTruthy();
    expect(blob?.includes(Buffer.from(REFRESH))).toBe(false);
    expect(deps.crypto?.decrypt(blob as Buffer)).toBe(REFRESH);
    expect(deps.lines.join('\n')).not.toContain(REFRESH);
  });

  it('refuse un state différent et n’enregistre rien', async () => {
    const deps = harness();
    let exchanged = false;
    deps.google = {
      async exchange() {
        exchanged = true;
        return {
          accessToken: ACCESS,
          refreshToken: REFRESH,
          scope: GOOGLE_WEBMASTERS_SCOPE,
          expiresIn: 1,
        };
      },
      async refresh() {
        throw new Error('unused');
      },
      async revoke() {},
    };
    const started = await handleOauthStart(startRequest(), deps);
    const response = await handleOauthCallback(
      new Request(
        'https://audigy.example/api/oauth/google/callback?code=4/0Acode-value-0123456789&state=autre-state-qui-ne-correspond-pas-du-tout',
        {
          headers: {
            cookie: `audigy_gsc=${cookieValue(liveCookie(started))}`,
          },
        },
      ),
      deps,
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('etat=erreur');
    expect(exchanged).toBe(false);
    expect(deps.rows.blobs.size).toBe(0);
    const line = deps.lines.find((item) =>
      item.includes('oauth_google_state_rejected'),
    );
    expect(line).toBeTruthy();
    expect(JSON.parse(line ?? '')).toMatchObject({
      hasCookie: true,
      hasPending: true,
      expired: false,
      stateMismatch: true,
    });
  });

  it('journalise un cookie absent et n’échange pas', async () => {
    const deps = harness();
    let exchanged = false;
    deps.google = {
      async exchange() {
        exchanged = true;
        return {
          accessToken: ACCESS,
          refreshToken: REFRESH,
          scope: GOOGLE_WEBMASTERS_SCOPE,
          expiresIn: 1,
        };
      },
      async refresh() {
        throw new Error('unused');
      },
      async revoke() {},
    };
    const response = await handleOauthCallback(
      new Request(
        'https://audigy.example/api/oauth/google/callback?code=4/0Acode-value-0123456789&state=state-qui-ne-sera-pas-compare-sans-cookie',
      ),
      deps,
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('etat=erreur');
    expect(exchanged).toBe(false);
    expect(JSON.parse(deps.lines[0] ?? '')).toMatchObject({
      event: 'oauth_google_state_rejected',
      hasCookie: false,
      hasPending: false,
    });
  });

  it('journalise un code refusé avant l’échange', async () => {
    const deps = harness();
    const response = await handleOauthCallback(
      new Request(
        'https://audigy.example/api/oauth/google/callback?code=court&state=state-inutile-pour-ce-cas-de-refus',
      ),
      deps,
    );
    expect(response.headers.get('location')).toContain('etat=erreur');
    expect(JSON.parse(deps.lines[0] ?? '')).toMatchObject({
      event: 'oauth_google_callback_rejected',
      reason: 'invalid_code',
    });
    expect(deps.lines.join('\n')).not.toContain('court');
  });

  it('journalise l’absence de jeton de rafraîchissement', async () => {
    const deps = harness();
    deps.google = {
      async exchange() {
        return {
          accessToken: ACCESS,
          scope: GOOGLE_WEBMASTERS_SCOPE,
          expiresIn: 3600,
        };
      },
      async refresh() {
        throw new Error('unused');
      },
      async revoke() {},
    };
    const started = await handleOauthStart(startRequest(), deps);
    const pending = JSON.parse(
      deps.crypto?.decrypt(
        Buffer.from(cookieValue(liveCookie(started)), 'base64url'),
      ) ?? '',
    ) as { state: string };
    const response = await handleOauthCallback(
      new Request(
        `https://audigy.example/api/oauth/google/callback?code=4/0Acode-value-0123456789&state=${pending.state}`,
        {
          headers: { cookie: `audigy_gsc=${cookieValue(liveCookie(started))}` },
        },
      ),
      deps,
    );
    expect(response.headers.get('location')).toContain('etat=erreur');
    expect(deps.rows.blobs.size).toBe(0);
    expect(JSON.parse(deps.lines.at(-1) ?? '')).toMatchObject({
      event: 'oauth_google_callback_failed',
      code: 'no_refresh_token',
    });
  });

  it('supprime le jeton à la révocation, même si Google échoue', async () => {
    const deps = harness();
    const blob = deps.crypto?.encrypt(REFRESH) as Buffer;
    await deps.rows.save(USER, blob);
    let revoked = '';
    deps.google = {
      async exchange() {
        throw new Error('unused');
      },
      async refresh() {
        throw new Error('unused');
      },
      async revoke(token) {
        revoked = token;
        throw new Error('google_down');
      },
    };
    const response = await handleOauthRevoke(startRequest(), deps);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('{"ok":true}');
    expect(text).not.toContain(REFRESH);
    expect(revoked).toBe(REFRESH);
    expect(deps.rows.blobs.has(USER)).toBe(false);
    expect(deps.lines.join('\n')).not.toContain(REFRESH);
  });

  it('aligne redirect_uri, cookie et retour sur le Host local', async () => {
    let exchangedUri = '';
    const deps = harness({
      config: {
        clientId: 'client-id.apps.googleusercontent.com',
        origin: 'http://localhost:8888/',
        redirectUri: 'http://localhost:8888/api/oauth/google/callback',
        secureCookie: false,
      },
      google: {
        async exchange(input) {
          exchangedUri = input.redirectUri;
          return {
            accessToken: ACCESS,
            refreshToken: REFRESH,
            scope: GOOGLE_WEBMASTERS_SCOPE,
            expiresIn: 3600,
          };
        },
        async refresh() {
          throw new Error('unused');
        },
        async revoke() {},
      },
    });
    const started = await handleOauthStart(
      new Request('http://localhost:8888/api/oauth/google/start', {
        method: 'POST',
        headers: {
          authorization: 'Bearer header.payload.signature',
          host: '127.0.0.1:8888',
        },
      }),
      deps,
    );
    const body = (await started.json()) as { authorizeUrl: string };
    expect(new URL(body.authorizeUrl).searchParams.get('redirect_uri')).toBe(
      'http://127.0.0.1:8888/api/oauth/google/callback',
    );
    const cookie = liveCookie(started);
    expect(cookie).toMatch(/(?:^|; )Path=\/;/);
    expect(cookie).not.toContain('Path=/api/oauth/google');
    expect(
      setCookies(started).some(
        (item) =>
          item.includes('Path=/api/oauth/google') && item.includes('Max-Age=0'),
      ),
    ).toBe(true);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
    const pending = JSON.parse(
      deps.crypto?.decrypt(Buffer.from(cookieValue(cookie), 'base64url')) ?? '',
    ) as { state: string };
    const response = await handleOauthCallback(
      new Request(
        `http://localhost:8888/api/oauth/google/callback?code=code-value-0123456789&state=${pending.state}`,
        {
          headers: {
            host: '127.0.0.1:8888',
            cookie: `audigy_gsc=${cookieValue(cookie)}`,
          },
        },
      ),
      deps,
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'http://127.0.0.1:8888/search-console?etat=ok',
    );
    expect(exchangedUri).toBe(
      'http://127.0.0.1:8888/api/oauth/google/callback',
    );
  });

  it('ignore un Host qui n’est pas l’alias local du même port', async () => {
    const local = {
      clientId: 'client-id.apps.googleusercontent.com',
      origin: 'http://localhost:8888/',
      redirectUri: 'http://localhost:8888/api/oauth/google/callback',
      secureCookie: false,
    };
    const httpsDeps = harness();
    const spoofed = await handleOauthStart(
      new Request('https://audigy.example/api/oauth/google/start', {
        method: 'POST',
        headers: {
          authorization: 'Bearer header.payload.signature',
          host: '127.0.0.1:8888',
        },
      }),
      httpsDeps,
    );
    const spoofedBody = (await spoofed.json()) as { authorizeUrl: string };
    expect(
      new URL(spoofedBody.authorizeUrl).searchParams.get('redirect_uri'),
    ).toBe('https://audigy.example/api/oauth/google/callback');

    const otherPort = harness({ config: local });
    const shifted = await handleOauthStart(
      new Request('http://localhost:8888/api/oauth/google/start', {
        method: 'POST',
        headers: {
          authorization: 'Bearer header.payload.signature',
          host: 'evil.example:8888',
        },
      }),
      otherPort,
    );
    const shiftedBody = (await shifted.json()) as { authorizeUrl: string };
    expect(
      new URL(shiftedBody.authorizeUrl).searchParams.get('redirect_uri'),
    ).toBe('http://localhost:8888/api/oauth/google/callback');

    const wrongPort = harness({ config: local });
    const port = await handleOauthStart(
      new Request('http://127.0.0.1:9999/api/oauth/google/start', {
        method: 'POST',
        headers: {
          authorization: 'Bearer header.payload.signature',
          host: '127.0.0.1:9999',
        },
      }),
      wrongPort,
    );
    const portBody = (await port.json()) as { authorizeUrl: string };
    expect(
      new URL(portBody.authorizeUrl).searchParams.get('redirect_uri'),
    ).toBe('http://localhost:8888/api/oauth/google/callback');
  });

  it('reprend l’origine de l’URL si Host est absent', async () => {
    const deps = harness({
      config: {
        clientId: 'client-id.apps.googleusercontent.com',
        origin: 'http://localhost:8888/',
        redirectUri: 'http://localhost:8888/api/oauth/google/callback',
        secureCookie: false,
      },
    });
    const response = await handleOauthStart(
      new Request('http://127.0.0.1:8888/api/oauth/google/start', {
        method: 'POST',
        headers: { authorization: 'Bearer header.payload.signature' },
      }),
      deps,
    );
    const body = (await response.json()) as { authorizeUrl: string };
    expect(new URL(body.authorizeUrl).searchParams.get('redirect_uri')).toBe(
      'http://127.0.0.1:8888/api/oauth/google/callback',
    );
  });

  it('répond 503 si la configuration OAuth manque', async () => {
    const deps = harness({ config: null, crypto: null, google: null });
    const response = await handleOauthStart(startRequest(), deps);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      messageKey: 'api.error.oauth_unconfigured',
    });
  });
});

describe('port Search Console', () => {
  it('sans jeton, ne fournit pas de port', async () => {
    const port = await loadSearchConsole(
      {
        ownerOf: async () => USER,
        readBlob: async () => null,
        decrypt: () => {
          throw new Error('unused');
        },
        refresh: async () => ({ ok: false, failure: 'auth' }),
        api: () => {
          throw new Error('unused');
        },
      },
      'site',
    );
    expect(port).toBeNull();
  });

  it('rafraîchit le jeton et ne le place pas dans le constat', async () => {
    const crypto = createOauthCrypto(parseTokenKey(KEY) as Buffer);
    const port = await loadSearchConsole(
      {
        ownerOf: async () => USER,
        readBlob: async () => crypto.encrypt(REFRESH),
        decrypt: (blob) => crypto.decrypt(blob),
        refresh: async (token) => {
          expect(token).toBe(REFRESH);
          return { ok: true, accessToken: ACCESS };
        },
        api: (accessToken) => {
          expect(accessToken).toBe(ACCESS);
          return {
            async listSites() {
              return [
                {
                  siteUrl: 'https://exemple.fr/blog/',
                  permissionLevel: 'siteFullUser',
                },
                {
                  siteUrl: 'sc-domain:exemple.fr',
                  permissionLevel: 'siteOwner',
                },
              ];
            },
            async listSitemaps(siteUrl) {
              expect(siteUrl).toBe('https://exemple.fr/blog/');
              return [
                {
                  path: 'https://exemple.fr/blog/sitemap.xml',
                  errors: 0,
                  warnings: 0,
                  pending: false,
                  isIndex: false,
                  submitted: 4,
                  indexed: 4,
                },
              ];
            },
            async inspect() {
              return { verdict: 'PASS' };
            },
          };
        },
      },
      'site',
    );
    const snapshot = await port?.snapshot(
      'https://exemple.fr/blog/article',
      new AbortController().signal,
    );
    expect(snapshot?.property).toBe('https://exemple.fr/blog/');
    expect(JSON.stringify(snapshot)).not.toContain(REFRESH);
    expect(JSON.stringify(snapshot)).not.toContain(ACCESS);
  });
});
