import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

async function settleFiniteAnimations(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const view = globalThis as unknown as {
      document: {
        getAnimations: () => Array<{
          effect: { getTiming: () => { iterations: number } } | null;
          finished: Promise<unknown>;
        }>;
      };
    };
    const pending = view.document.getAnimations().filter((item) => {
      const iterations = item.effect?.getTiming().iterations ?? 1;
      return Number.isFinite(iterations);
    });
    await Promise.all(pending.map((item) => item.finished));
  });
}

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ID = '7a2b3c4d-5e6f-4789-a012-bcdef0123456';
const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

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
  url: 'https://exemple.fr',
  label: 'exemple.fr',
  host: 'exemple.fr',
  owner_id: USER_ID,
};

async function waitForIslands(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const root = globalThis as unknown as {
      document: {
        querySelectorAll: (
          selector: string,
        ) => Iterable<{ hasAttribute: (name: string) => boolean }>;
      };
    };
    const islands = [...root.document.querySelectorAll('astro-island')];
    return (
      islands.length > 0 &&
      islands.every((island) => !island.hasAttribute('ssr'))
    );
  });
}

async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
}

test('sans clé, la section avis reste masquée', async ({ page }) => {
  const google: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('googleapis')) google.push(request.url());
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    if (new URL(request.url()).pathname.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([site]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
  await page.route('**/api/places', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false }),
    });
  });
  await signIn(page);
  await page.goto('/sites');
  await waitForIslands(page);
  await expect(page.getByText('exemple.fr').first()).toBeVisible();
  await expect(page.getByLabel('Nom du lieu')).toHaveCount(0);
  expect(google).toEqual([]);
});

test('la confirmation affiche la note et le score à part', async ({ page }) => {
  const google: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('googleapis')) google.push(request.url());
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    const url = new URL(request.url());
    if (url.pathname.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([site]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
  await page.route('**/api/places', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: true, places: [] }),
      });
      return;
    }
    const body = request.postDataJSON() as { action?: string };
    if (body.action === 'search') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              id: 'ChIJplacesTest0001',
              name: 'Cabinet des Tilleuls',
              address: 'Lyon',
            },
          ],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        place: {
          siteId: SITE_ID,
          name: 'Cabinet des Tilleuls',
          address: 'Lyon',
          rating: 4.6,
          reviewCount: 128,
          score: 92,
        },
      }),
    });
  });
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        audit: {
          id: AUDIT_ID,
          status: 'done',
          mode: 'passive',
          trigger: 'manual',
          methodVersion: '2026.1',
          engineVersion: '0.20.0',
          globalScore: 72,
          coverage: 0.5,
          createdAt: '2026-10-24T08:00:00.000Z',
          startedAt: '2026-10-24T08:00:01.000Z',
          finishedAt: '2026-10-24T08:10:00.000Z',
          error: null,
          site: {
            id: SITE_ID,
            url: 'https://exemple.fr',
            label: 'exemple.fr',
            scope: 'origin',
            hosting: 'other',
          },
        },
        domains: [
          { domain: 'securite', score: 40, coverage: 1, level: 'problem' },
          { domain: 'reputation', score: 92, coverage: 1, level: 'good' },
        ],
        findings: [
          {
            domain: 'reputation',
            checkId: 'reputation.avis',
            status: 'pass',
            severity: 1,
            impact: 2,
            score: 0.92,
            measured: {
              rating: 4.6,
              reviewCount: 128,
              placeName: 'Cabinet des Tilleuls',
            },
            messageKey: 'reputation.avis.pass',
            params: {},
            fixKey: null,
            effortMinutes: null,
            reason: null,
          },
        ],
      }),
    });
  });

  await signIn(page);
  await page.goto('/sites');
  await waitForIslands(page);
  await page.locator('details.site-actions summary').click();
  await page.getByLabel('Nom du lieu').fill('Cabinet');
  await page.getByRole('button', { name: 'Chercher le lieu' }).click();
  await expect(
    page.getByRole('paragraph').filter({ hasText: 'Cabinet des Tilleuls' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Choisir ce lieu/ }).click();
  await expect(page.getByText('Note publique : 4,6 sur 5.')).toBeVisible();
  await expect(page.getByText('Score des avis : 92 sur 100.')).toBeVisible();
  await expect(
    page.getByText('Ce score reste en dehors du score global.'),
  ).toBeVisible();
  const sitesAxe = await new AxeBuilder({ page }).analyze();
  expect(sitesAxe.violations).toEqual([]);

  await page.goto(`/rapport?id=${AUDIT_ID}`);
  await waitForIslands(page);
  await expect(page.getByRole('heading', { name: 'Avis' })).toBeVisible();
  await expect(page.getByText('Note publique : 4,6 sur 5.')).toBeVisible();
  await expect(
    page.getByRole('img', { name: /Score global : 72 sur 100/ }),
  ).toBeVisible();
  await settleFiniteAnimations(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(google).toEqual([]);
});
