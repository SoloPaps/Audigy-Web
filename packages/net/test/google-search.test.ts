import { describe, expect, it } from 'vitest';
import {
  createGoogleAuthClient,
  createSearchConsoleApi,
  type ExternalApi,
  type ExternalRequest,
  GOOGLE_WEBMASTERS_SCOPE,
  GoogleApiError,
} from '../src/index.js';

const REFRESH = 'refresh-token-sentinel-value';
const ACCESS = 'access-token-sentinel-value';
const SECRET = 'client-secret-sentinel-value';

function apiOf(
  handler: (input: ExternalRequest) => { status: number; text: string },
): { api: ExternalApi; calls: ExternalRequest[] } {
  const calls: ExternalRequest[] = [];
  return {
    calls,
    api: {
      async request(input) {
        calls.push(input);
        return handler(input);
      },
    },
  };
}

describe('OAuth Google', () => {
  it('échange le code en PKCE sans recopier les jetons dans l’erreur', async () => {
    const { api, calls } = apiOf(() => ({
      status: 200,
      text: JSON.stringify({
        access_token: ACCESS,
        refresh_token: REFRESH,
        scope: GOOGLE_WEBMASTERS_SCOPE,
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    }));
    const client = createGoogleAuthClient({
      api,
      clientId: 'client-id',
      clientSecret: SECRET,
    });
    const tokens = await client.exchange({
      code: 'code-value',
      verifier: 'verifier-value',
      redirectUri: 'https://audigy.example/api/oauth/google/callback',
    });
    expect(tokens.refreshToken).toBe(REFRESH);
    expect(calls[0]?.url.hostname).toBe('oauth2.googleapis.com');
    expect(calls[0]?.contentType).toBe('application/x-www-form-urlencoded');
    expect(calls[0]?.body).toContain('grant_type=authorization_code');
    expect(calls[0]?.body).toContain(`client_secret=${SECRET}`);
    expect(calls[0]?.authorization).toBeUndefined();

    const denied = apiOf(() => ({
      status: 400,
      text: `{"error":"invalid_grant","refresh":"${REFRESH}"}`,
    }));
    const failing = createGoogleAuthClient({
      api: denied.api,
      clientId: 'client-id',
      clientSecret: SECRET,
    });
    const error = await failing
      .refresh(REFRESH)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GoogleApiError);
    expect((error as GoogleApiError).failure).toBe('auth');
    expect(String(error)).not.toContain(REFRESH);
    expect(String(error)).not.toContain(SECRET);
  });

  it('révoque sans traiter un jeton déjà invalide comme une panne', async () => {
    const { api, calls } = apiOf(() => ({ status: 400, text: '' }));
    const client = createGoogleAuthClient({
      api,
      clientId: 'client-id',
      clientSecret: SECRET,
    });
    await client.revoke(REFRESH);
    expect(calls[0]?.url.pathname).toBe('/revoke');
    expect(calls[0]?.body).toContain(`token=${encodeURIComponent(REFRESH)}`);
  });
});

describe('API Search Console', () => {
  it('liste les propriétés, les plans et inspecte la page', async () => {
    const { api, calls } = apiOf((input) => {
      if (input.url.pathname.endsWith('/sites')) {
        return {
          status: 200,
          text: JSON.stringify({
            siteEntry: [
              {
                siteUrl: 'sc-domain:exemple.fr',
                permissionLevel: 'siteOwner',
              },
            ],
          }),
        };
      }
      if (input.url.pathname.includes('/sitemaps')) {
        return {
          status: 200,
          text: JSON.stringify({
            sitemap: [
              {
                path: 'https://exemple.fr/sitemap.xml',
                isPending: false,
                isSitemapsIndex: false,
                warnings: '1',
                errors: '0',
                contents: [{ type: 'web', submitted: '10', indexed: '8' }],
              },
            ],
          }),
        };
      }
      return {
        status: 200,
        text: JSON.stringify({
          inspectionResult: { indexStatusResult: { verdict: 'PASS' } },
        }),
      };
    });
    const gsc = createSearchConsoleApi({ api, accessToken: ACCESS });
    const sites = await gsc.listSites();
    expect(sites).toEqual([
      { siteUrl: 'sc-domain:exemple.fr', permissionLevel: 'siteOwner' },
    ]);
    const sitemaps = await gsc.listSitemaps('sc-domain:exemple.fr');
    expect(sitemaps[0]).toMatchObject({
      errors: 0,
      warnings: 1,
      submitted: 10,
      indexed: 8,
    });
    expect(calls[1]?.url.pathname).toContain(
      encodeURIComponent('sc-domain:exemple.fr'),
    );
    const inspected = await gsc.inspect(
      'sc-domain:exemple.fr',
      'https://exemple.fr/',
    );
    expect(inspected.verdict).toBe('PASS');
    expect(
      calls.every((call) => call.authorization === `Bearer ${ACCESS}`),
    ).toBe(true);
    expect(calls[2]?.body).toContain('https://exemple.fr/');

    const quota = apiOf(() => ({
      status: 429,
      text: `{"error":"quotaExceeded","token":"${ACCESS}"}`,
    }));
    const limited = createSearchConsoleApi({
      api: quota.api,
      accessToken: ACCESS,
    });
    const error = await limited.listSites().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GoogleApiError);
    expect((error as GoogleApiError).failure).toBe('quota');
    expect(String(error)).not.toContain(ACCESS);
  });
});
