import { readFileSync } from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';
const SITE_ID = '7a2b3c4d-5e6f-4789-a012-bcdef0123456';

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

function cors(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers':
      'authorization, apikey, content-type, prefer, accept, x-client-info, x-supabase-api-version',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-credentials': 'true',
  };
}

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

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

function auditBody(status: 'queued' | 'running' | 'done'): unknown {
  const done = status === 'done';
  return {
    audit: {
      id: AUDIT_ID,
      status,
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: done ? 72 : null,
      coverage: done ? 0.5 : null,
      createdAt: '2026-10-23T12:00:00.000Z',
      startedAt: status === 'queued' ? null : '2026-10-23T12:00:01.000Z',
      finishedAt: done ? '2026-10-23T12:30:00.000Z' : null,
      error: null,
      site: {
        id: SITE_ID,
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: done
      ? [
          { domain: 'performance', score: 86, coverage: 1, level: 'good' },
          { domain: 'seo', score: 90, coverage: 1, level: 'good' },
          { domain: 'securite', score: 40, coverage: 1, level: 'problem' },
        ]
      : [],
    findings: done
      ? [
          {
            domain: 'securite',
            checkId: 'securite.https',
            status: 'fail',
            severity: 4,
            impact: 3,
            score: 0,
            measured: {},
            messageKey: 'securite.https.fail',
            params: {},
            fixKey: 'securite.https',
            effortMinutes: 15,
            reason: null,
          },
          {
            domain: 'securite',
            checkId: 'securite.hsts',
            status: 'warn',
            severity: 2,
            impact: 2,
            score: 0.5,
            measured: {},
            messageKey: 'securite.hsts.warn_short',
            params: {},
            fixKey: 'securite.hsts',
            effortMinutes: 10,
            reason: null,
          },
          {
            domain: 'vie_privee',
            checkId: 'vie_privee.traceurs',
            status: 'untested',
            severity: 1,
            impact: 1,
            score: null,
            measured: {},
            messageKey: 'finding.untested',
            params: {},
            fixKey: null,
            effortMinutes: null,
            reason: 'reason.runner_absent',
          },
          {
            domain: 'seo',
            checkId: 'seo.title',
            status: 'pass',
            severity: 1,
            impact: 1,
            score: 1,
            measured: {},
            messageKey: 'vie_privee.traceurs.pass',
            params: {},
            fixKey: null,
            effortMinutes: null,
            reason: null,
          },
        ]
      : [],
  };
}

async function installMocks(
  page: Page,
  options: { immediate?: boolean } = {},
): Promise<void> {
  const sites: Record<string, unknown>[] = [];
  let reads = 0;
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
    if (url.pathname.endsWith('/auth/v1/otp')) {
      await route.fulfill({ status: 200, headers, body: '{}' });
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
    if (url.pathname.endsWith('/auth/v1/token')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(session),
      });
      return;
    }
    if (
      url.pathname.endsWith('/rest/v1/sites') &&
      request.method() === 'POST'
    ) {
      const body = request.postDataJSON() as Record<string, unknown>;
      const row = {
        id: '22222222-2222-4222-8222-222222222222',
        ...body,
      };
      sites.push(row);
      const accept = request.headers().accept ?? '';
      await route.fulfill({
        status: 201,
        headers,
        body: JSON.stringify(accept.includes('vnd.pgrst.object') ? row : [row]),
      });
      return;
    }
    if (url.pathname.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(sites),
      });
      return;
    }
    await route.fulfill({ status: 200, headers, body: '{}' });
  });

  await page.route('**/api/audits**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          auditId: AUDIT_ID,
          status: 'queued',
          existing: false,
        }),
      });
      return;
    }
    reads += 1;
    const status = options.immediate
      ? 'done'
      : reads === 1
        ? 'queued'
        : reads === 2
          ? 'running'
          : 'done';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody(status)),
    });
  });
}

test('parcours accueil, connexion, progression, rapport et sites', async ({
  page,
}) => {
  await installMocks(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Vérifiez la santé de votre site, gratuitement.',
    }),
  ).toBeVisible();
  await page.getByLabel('Adresse du site').fill('https://exemple.fr');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expect(page).toHaveURL(/\/connexion/);
  await waitForIslands(page);
  await page.getByLabel('Adresse e-mail').fill('ada@exemple.fr');
  await page.getByRole('button', { name: 'Recevoir le lien' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Consultez votre messagerie',
  );

  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.goto('/compte/retour');
  await expect(page).toHaveURL(/\/progression/, { timeout: 15_000 });

  const status = page.getByRole('status');
  await expect(status).toContainText(/file|lit/);
  await expect(status).toContainText('terminé', { timeout: 15_000 });
  await page.getByRole('link', { name: 'Voir le rapport' }).click();
  await expect(page).toHaveURL(/\/rapport/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Votre site peut mieux faire.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: /Score global : 72 sur 100/ }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Protection' })).toBeVisible();
  await page.getByRole('button', { name: /Problèmes/ }).click();
  await expect(
    page.getByRole('heading', { name: "Forcer l'adresse chiffrée" }),
  ).toBeVisible();
  await expect(page.getByText('Aucun traceur connu')).toBeHidden();
  await page.getByText('Voir comment corriger').click();
  await expect(
    page.getByText('Activez le certificat de votre hébergeur.'),
  ).toBeVisible();
  await expect(page.getByText(/Méthode 2026\.1/)).toBeVisible();
  await expect(page.getByText(`Identifiant ${AUDIT_ID}`)).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Vérifier ce rapport' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Ce rapport n’est pas un constat de commissaire de justice.',
    ),
  ).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole('link', { name: 'Protection' }).click();
  await expect(page).toHaveURL(/domaine=securite/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Protection' }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: /Protection : 40 sur 100/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Retour au rapport' }),
  ).toBeVisible();
  await expectNoViolations(page);

  await page.goto('/sites');
  await waitForIslands(page);
  await expect(page.getByText('Aucun site pour le moment.')).toBeVisible();
  await page.getByLabel('Adresse du site').fill('notes.exemple.fr');
  await page.getByRole('button', { name: 'Ajouter le site' }).click();
  await expect(page.getByText('Le site a été ajouté.')).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Lancer l’audit notes\.exemple\.fr/ }),
  ).toBeVisible();
  await expectNoViolations(page);
});

test('connexion et sites vides sans violation, clair et sombre', async ({
  page,
}) => {
  await installMocks(page);
  await page.goto('/connexion?theme=light');
  await waitForIslands(page);
  await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
  await expectNoViolations(page);
  await page.goto('/connexion?theme=dark');
  await waitForIslands(page);
  await expect(page.getByLabel('Thème')).toHaveValue('dark');
  await expectNoViolations(page);
  await page.goto('/sites?theme=light');
  await waitForIslands(page);
  await expect(
    page.getByText('Connectez-vous pour voir vos sites.'),
  ).toBeVisible();
  await expectNoViolations(page);
});

test('rapport sombre sans violation', async ({ page }) => {
  await installMocks(page, { immediate: true });
  await page.goto('/');
  await page.evaluate((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.goto(`/rapport?id=${AUDIT_ID}&theme=dark`);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Votre site peut mieux faire.',
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Thème')).toHaveValue('dark');
  await expectNoViolations(page);
});

function builtHomeBytes(): number {
  const dist = path.resolve('dist');
  const seen = new Set<string>();
  const queue = ['index.html'];
  let bytes = 0;
  while (queue.length > 0) {
    const rel = queue.pop();
    if (!rel || seen.has(rel)) continue;
    seen.add(rel);
    const file = path.join(dist, rel);
    const data = readFileSync(file);
    bytes += data.length;
    if (!/\.(css|js)$/i.test(rel) && rel !== 'index.html') continue;
    const text = data.toString('utf8');
    const refs = [
      ...text.matchAll(/(?:src|href)="([^"]+)"/g),
      ...text.matchAll(/url\(([^)]+)\)/g),
      ...text.matchAll(/["']([^"']+\.(?:js|css|woff2))["']/g),
    ];
    for (const match of refs) {
      const raw = (match[1] ?? '').replace(/['"]/g, '').split('?')[0] ?? '';
      if (raw === '' || raw.startsWith('data:') || raw.startsWith('http'))
        continue;
      const next = raw.startsWith('/')
        ? decodeURIComponent(raw.slice(1))
        : path.posix.normalize(path.posix.join(path.posix.dirname(rel), raw));
      if (!/\.(css|js|woff2|svg|png|webp|ico)$/i.test(next)) continue;
      if (!seen.has(next)) queue.push(next);
    }
  }
  return bytes;
}

test('accueil sous 500 Ko, sans tiers, et sans défilement à 320 px', async ({
  page,
}) => {
  expect(builtHomeBytes()).toBeLessThan(500 * 1024);
  const hosts = new Set<string>();
  page.on('response', (response) => {
    hosts.add(new URL(response.url()).host);
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect([...hosts].filter((host) => host !== '127.0.0.1:4321')).toEqual([]);
  for (const width of [320, 640, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
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
  }
});
