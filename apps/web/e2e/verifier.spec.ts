import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ID = '7a2b3c4d-5e6f-4789-a012-bcdef0123456';
const VER_ID = '8b3c4d5e-6f70-4891-a123-cdef01234567';
const TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const session = {
  access_token: 'header.payload.signature',
  refresh_token: 'refresh-token-placeholder-value',
  expires_in: 3600,
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@exemple.fr',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-10-23T00:00:00.000Z',
  },
};

const site = {
  id: SITE_ID,
  owner_id: USER_ID,
  url: 'https://solopaps.github.io/Projet-Site-Artiste/',
  label: 'Projet artiste',
  host: 'solopaps.github.io',
  scope: 'path',
  path_prefix: '/Projet-Site-Artiste/',
  deleted_at: null,
};

function cors(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers':
      'authorization, apikey, content-type, prefer, accept, x-client-info, x-supabase-api-version',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-credentials': 'true',
  };
}

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

async function installMocks(page: Page): Promise<void> {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const origin = request.headers().origin ?? 'http://127.0.0.1:4321';
    const headers = {
      ...cors(origin),
      'content-type': 'application/json',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors(origin) });
      return;
    }
    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(session.user),
      });
      return;
    }
    if (url.pathname.endsWith('/rest/v1/sites')) {
      const object = (request.headers().accept ?? '').includes(
        'vnd.pgrst.object',
      );
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(object ? site : [site]),
      });
      return;
    }
    if (url.pathname.endsWith('/rest/v1/site_verifications')) {
      await route.fulfill({ status: 200, headers, body: '[]' });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '{}' });
  });

  await page.route('**/api/verifications**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/check')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: VER_ID,
          status: 'verified',
          method: 'file',
          token: TOKEN,
          found: true,
          inconclusive: false,
          dnsName: '_audigy-challenge.solopaps.github.io',
          dnsValue: `audigy-site-verification=${TOKEN}`,
          fileUrl:
            'https://solopaps.github.io/Projet-Site-Artiste/audigy-verification.txt',
          pageUrl: 'https://solopaps.github.io/Projet-Site-Artiste/',
          metaTag: `<meta name="audigy-verification" content="${TOKEN}">`,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: VER_ID,
        status: 'pending',
        method: 'file',
        token: TOKEN,
        dnsName: '_audigy-challenge.solopaps.github.io',
        dnsValue: `audigy-site-verification=${TOKEN}`,
        fileUrl:
          'https://solopaps.github.io/Projet-Site-Artiste/audigy-verification.txt',
        pageUrl: 'https://solopaps.github.io/Projet-Site-Artiste/',
        metaTag: `<meta name="audigy-verification" content="${TOKEN}">`,
      }),
    });
  });
}

test('preuve de propriété : guides, création, vérification', async ({
  page,
}) => {
  await installMocks(page);
  await page.goto('/verifier?theme=light');
  await expect(
    page.getByText('Sans votre accord, ces tests peuvent être interdits.'),
  ).toBeVisible();
  await expect(
    page.getByText('Connectez-vous pour vérifier un site.'),
  ).toBeVisible();
  await expectNoViolations(page);

  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.goto(`/verifier?site=${SITE_ID}`);
  await expect(page.getByText('Projet artiste')).toBeVisible();
  await expect(
    page.getByText('Un nom github.io ne se règle pas ici.'),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Chez Netlify, dans le DNS' }),
  ).toBeVisible();
  await page.getByLabel('Fichier sur le site').check();
  await expect(page.getByText('.nojekyll')).toBeVisible();
  await page.getByRole('button', { name: 'Créer le code' }).click();
  await expect(page.getByText(TOKEN)).toBeVisible();
  await expect(
    page.getByText(
      'https://solopaps.github.io/Projet-Site-Artiste/audigy-verification.txt',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Vérifier le site' }).click();
  await expect(
    page.getByText('Le site est vérifié. Les tests approfondis sont ouverts.'),
  ).toBeVisible();
  await expectNoViolations(page);

  await page.goto(`/verifier?site=${SITE_ID}&theme=dark`);
  await expect(page.getByLabel('Thème')).toHaveValue('dark');
  await expectNoViolations(page);
});
