import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const ID = '00000000-0000-4000-8000-000000000019';
const fixtures = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/evidence/fixtures',
);

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

async function ouvrir(page: Page): Promise<void> {
  await page.goto(`/verifier/${ID}/?theme=light`);
  await expect(page.getByText('La signature correspond.')).toBeVisible();
}

function retourner(octets: Uint8Array): Buffer {
  const copie = Buffer.from(octets);
  const index = copie.length - 1;
  copie[index] = (copie[index] ?? 0) ^ 0xff;
  return copie;
}

test('mentions, horodatage, signature et code', async ({ page }) => {
  await ouvrir(page);
  await page.locator('details.preuve-mentions summary').click();
  await expect(
    page.getByText(
      'Ce rapport n’est pas un constat de commissaire de justice.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Horodatage RFC 3161 non qualifié au sens d’eIDAS.'),
  ).toBeVisible();
  await expect(
    page.getByText('Un horodatage non qualifié reste recevable comme preuve.'),
  ).toBeVisible();
  await expect(
    page.getByText('C’est l’article 41.1 du règlement eIDAS.'),
  ).toBeVisible();
  await expect(
    page.getByText('Il n’a pas de présomption d’exactitude (article 41.2).'),
  ).toBeVisible();
  await expect(
    page.getByText('Horodatage A', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText('Horodatage B', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText('24 oct. 2026, 10 h 00').first()).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Code du lien de vérification' }),
  ).toBeVisible();
  await page.getByText('Vérification experte').click();
  await expect(page.getByText(/openssl ts -verify/)).toBeVisible();
});

test('un octet modifié dans le PDF ou le JSON ne correspond pas', async ({
  page,
}) => {
  const pdf = new Uint8Array(
    await readFile(path.join(fixtures, 'rapport.pdf')),
  );
  const json = new Uint8Array(
    await readFile(path.join(fixtures, 'results.json')),
  );
  await ouvrir(page);
  const apres: string[] = [];
  page.on('request', (request) => {
    apres.push(request.url());
  });
  await page.getByLabel('Fichier du rapport').setInputFiles({
    name: 'rapport.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf),
  });
  await expect(page.getByText('Ce fichier correspond.')).toBeVisible();
  await page.getByLabel('Fichier du rapport').setInputFiles({
    name: 'rapport.pdf',
    mimeType: 'application/pdf',
    buffer: retourner(pdf),
  });
  await expect(page.getByText('Ce fichier ne correspond pas.')).toBeVisible();
  await page.getByLabel('Fichier du rapport').setInputFiles({
    name: 'results.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect(page.getByText('Ce fichier correspond.')).toBeVisible();
  await page.getByLabel('Fichier du rapport').setInputFiles({
    name: 'results.json',
    mimeType: 'application/json',
    buffer: retourner(json),
  });
  await expect(page.getByText('Ce fichier ne correspond pas.')).toBeVisible();
  expect(apres).toEqual([]);
});

test('vérification claire et sombre sans violation', async ({ page }) => {
  await page.goto(`/verifier/${ID}/?theme=light`);
  await expect(page.getByText('La signature correspond.')).toBeVisible();
  await expectNoViolations(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`/verifier/${ID}/?theme=dark`);
  await expect(page.getByLabel('Thème')).toHaveValue('dark');
  await expect(page.getByText('La signature correspond.')).toBeVisible();
  await expectNoViolations(page);
});

test('reflow à 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await ouvrir(page);
  const widths = await page.evaluate(() => {
    const root = globalThis as unknown as {
      document: {
        documentElement: { scrollWidth: number; clientWidth: number };
      };
    };
    return {
      scrollWidth: root.document.documentElement.scrollWidth,
      clientWidth: root.document.documentElement.clientWidth,
    };
  });
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);
});

test('mentions aussi sur la page des composants', async ({ page }) => {
  await page.goto('/dev/composants?theme=light');
  await page.locator('details.preuve-mentions summary').click();
  await expect(
    page.getByText('Horodatage RFC 3161 non qualifié au sens d’eIDAS.'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Vérifier ce rapport' }),
  ).toHaveAttribute('href', `/verifier/${ID}`);
});

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
