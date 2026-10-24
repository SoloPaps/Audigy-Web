import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';
const HASH = 'ab'.repeat(32);
const USER_ID = '11111111-1111-4111-8111-111111111111';

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

function auditBody(): unknown {
  return {
    audit: {
      id: AUDIT_ID,
      status: 'done',
      mode: 'passive',
      trigger: 'manual',
      methodVersion: '2026.1',
      engineVersion: '0.15.0',
      globalScore: 72,
      coverage: 0.5,
      createdAt: '2026-10-23T12:00:00.000Z',
      startedAt: '2026-10-23T12:00:01.000Z',
      finishedAt: '2026-10-23T12:30:00.000Z',
      error: null,
      site: {
        id: '7a2b3c4d-5e6f-4789-a012-bcdef0123456',
        url: 'https://exemple.fr',
        label: 'exemple.fr',
        scope: 'origin',
        hosting: 'other',
      },
    },
    domains: [{ domain: 'securite', score: 40, coverage: 1, level: 'problem' }],
    findings: [
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
    ],
    proof: {
      resultsSha256: HASH,
      captures: [
        { viewport: 'desktop', capturedAt: '2026-10-23T12:30:00.000Z' },
        { viewport: 'mobile', capturedAt: '2026-10-23T12:30:02.000Z' },
      ],
    },
  };
}

async function install(page: Page): Promise<void> {
  await page.addInitScript((value) => {
    const storage = (
      globalThis as unknown as {
        localStorage: { setItem: (key: string, item: string) => void };
      }
    ).localStorage;
    storage.setItem('audigy-auth', JSON.stringify(value));
  }, session);
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const origin = request.headers().origin ?? 'http://127.0.0.1:4321';
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'content-type': 'application/json',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify(
        request.url().includes('/auth/v1/user') ? session.user : session,
      ),
    });
  });
  await page.route('**/api/audits/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(auditBody()),
    });
  });
}

test('impression : mentions, PDF gris, polices, plafond', async ({ page }) => {
  await install(page);
  await page.goto(`/rapport/${AUDIT_ID}/imprimer`);
  await expect(page).toHaveURL(new RegExp(`/rapport/${AUDIT_ID}/imprimer`));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Rapport à imprimer' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Ce rapport n’est pas un constat de commissaire de justice et n’en a pas la valeur.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Horodatage RFC 3161 non qualifié au sens d’eIDAS.'),
  ).toBeVisible();
  await expect(page.getByText(HASH)).toBeVisible();
  await expect(page.getByText(`Identifiant du rapport`)).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Code de la page de vérification' }),
  ).toBeVisible();
  await expect(page.getByText(/Ordinateur,/)).toBeVisible();
  await expect(page.getByText(/Téléphone,/)).toBeVisible();
  await expect(
    page.getByText('Problème', { exact: true }).first(),
  ).toBeVisible();
  const violations = await new AxeBuilder({ page }).analyze();
  expect(violations.violations).toEqual([]);

  await page.emulateMedia({ media: 'print' });
  const paint = await page.evaluate(() => {
    const view = globalThis as unknown as {
      document: { body: unknown };
      getComputedStyle: (node: unknown) => {
        color: string;
        backgroundColor: string;
      };
    };
    const body = view.getComputedStyle(view.document.body);
    return { color: body.color, background: body.backgroundColor };
  });
  expect(paint.background).toBe('rgb(255, 255, 255)');
  expect(paint.color).toBe('rgb(27, 31, 36)');
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,
  });
  expect(pdf.length).toBeLessThanOrEqual(1_000_000);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.toString('latin1')).toMatch(/\/FontFile2|\/FontFile3/);
  const own = createHash('sha256').update(pdf).digest('hex');
  expect(pdf.toString('latin1').toLowerCase()).not.toContain(own);
});

test('impression sans identifiant', async ({ page }) => {
  await page.goto('/rapport/imprimer');
  await expect(page.getByText('Ce rapport est introuvable.')).toBeVisible();
  await expect(
    page.getByText('Horodatage RFC 3161 non qualifié au sens d’eIDAS.'),
  ).toBeVisible();
});
