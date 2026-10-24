import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';
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
      {
        domain: 'ecologie',
        checkId: 'ecologie.hebergeur',
        status: 'warn',
        severity: 2,
        impact: 1,
        score: 60,
        measured: {},
        messageKey: 'ecologie.hebergeur.pass_anonyme',
        params: {},
        fixKey: null,
        effortMinutes: 10,
        reason: null,
      },
    ],
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
    const origin = route.request().headers().origin ?? 'http://127.0.0.1:4321';
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'content-type': 'application/json',
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify(
        route.request().url().includes('/auth/v1/user')
          ? session.user
          : session,
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

test('markdown local, prompt copiable, limite repliée', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await install(page);
  const calls: string[] = [];
  await page.goto(`/rapport?id=${AUDIT_ID}`);
  await expect(page.getByRole('link', { name: 'Imprimer' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Télécharger en Markdown' }),
  ).toBeVisible();
  page.on('request', (request) => {
    calls.push(request.url());
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Télécharger en Markdown' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('audigy-exemple.fr-2026-10-23.md');
  const path = await download.path();
  expect(path).toBeTruthy();
  const markdown = await readFile(path as string, 'utf8');
  expect(markdown.trimEnd().endsWith('Ce fichier n’est pas une preuve.')).toBe(
    true,
  );
  expect(markdown).toContain('https://exemple.fr');
  expect(markdown).toContain('23 oct. 2026, 14 h 30');
  expect(markdown).not.toContain(AUDIT_ID);
  expect(calls.some((url) => url.includes('/api/audits'))).toBe(false);
  expect(calls.some((url) => /openai|anthropic|gemini/iu.test(url))).toBe(
    false,
  );

  const limit = page.locator('details.finding-limit');
  await expect(limit).toHaveCount(1);
  await expect(limit).not.toHaveJSProperty('open', true);
  await expect(
    page.getByRole('heading', {
      level: 4,
      name: 'L’annuaire indique un hébergeur à électricité renouvelable.',
    }),
  ).toBeVisible();
  await expect(
    page.locator('h4, .why', { hasText: 'Cela ne couvre pas' }),
  ).toHaveCount(0);
  await limit.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(limit).toHaveJSProperty('open', true);

  const fix = page
    .locator('details', { hasText: 'Voir comment corriger' })
    .first();
  await fix.locator('summary').click();
  const prompt = fix.getByRole('textbox', { name: 'Prompt de correction' });
  await expect(prompt).toHaveValue(/N’inventez pas de note\./);
  await expect(prompt).toHaveValue(/Ne proposez pas de test sur le site\./);
  await expect(prompt).toHaveValue(
    /Proposez des étapes que le propriétaire peut faire\./,
  );
  await fix.getByRole('button', { name: 'Copier le prompt' }).click();
  await expect(page.getByText('Prompt copié.')).toBeVisible();
  const copied = await page.evaluate(() => {
    const nav = navigator as unknown as {
      clipboard: { readText: () => Promise<string> };
    };
    return nav.clipboard.readText();
  });
  expect(copied).toBe(await prompt.inputValue());
  expect(calls.some((url) => /openai|anthropic|gemini/iu.test(url))).toBe(
    false,
  );

  await page.evaluate(() => {
    const nav = navigator as unknown as {
      clipboard: { writeText: (value: string) => Promise<void> };
    };
    nav.clipboard.writeText = () => Promise.reject(new Error('refus'));
  });
  await fix.getByRole('button', { name: 'Copier le prompt' }).click();
  await expect(
    page.getByText('La copie a échoué. Sélectionnez le texte.'),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(
    page.getByRole('link', { name: 'Télécharger en Markdown' }),
  ).toBeVisible();
  const violations = await new AxeBuilder({ page }).analyze();
  expect(violations.violations).toEqual([]);
});

test('le score public n’exporte pas les causes internes', async ({ page }) => {
  await page.goto('/score/exemple-score/?theme=light');
  await expect(
    page.getByRole('link', { name: 'Télécharger en Markdown' }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Télécharger en Markdown' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('audigy-exemple.fr-2026-10-23.md');
  const path = await download.path();
  const markdown = await readFile(path as string, 'utf8');
  expect(markdown.trimEnd().endsWith('Ce fichier n’est pas une preuve.')).toBe(
    true,
  );
  expect(markdown).toContain('Le détail de la protection n’est pas publié.');
  expect(markdown).not.toContain('fuite-hsts');
  expect(markdown).not.toContain('PageSpeed');
  expect(markdown).not.toContain('navigateur d’audit');
  const violations = await new AxeBuilder({ page }).analyze();
  expect(violations.violations).toEqual([]);
});

test('méthode, conditions, confidentialité et mentions ont un sommaire', async ({
  page,
}) => {
  await page.goto('/methode');
  const toc = page.getByRole('navigation', { name: 'Sommaire' });
  await expect(
    toc.getByRole('link', { name: 'Résultat d’un test' }),
  ).toHaveClass(/link-inline/);
  await toc.getByRole('link', { name: 'Résultat d’un test' }).click();
  await expect(page).toHaveURL(/#method-status$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Résultat d’un test' }),
  ).toBeVisible();

  await page.goto('/cgu');
  await expect(
    page.getByRole('navigation', { name: 'Sommaire' }),
  ).toBeVisible();
  await page.goto('/confidentialite');
  await expect(
    page.getByRole('navigation', { name: 'Sommaire' }),
  ).toBeVisible();
  await page.goto('/mentions-legales');
  await expect(
    page
      .getByRole('navigation', { name: 'Sommaire' })
      .getByRole('link', { name: 'Hébergeur' }),
  ).toHaveAttribute('href', '#mentions-host');
  await page.goto('/accessibilite');
  await expect(page.getByRole('navigation', { name: 'Sommaire' })).toHaveCount(
    0,
  );
});

test('captures clair et sombre', async ({ page }) => {
  const dir = process.env.AUDIGY_SHOTS;
  test.skip(!dir, 'définir AUDIGY_SHOTS pour écrire les captures');
  await install(page);
  await page.addInitScript(() => {
    const view = globalThis as unknown as { print: () => void };
    view.print = () => undefined;
  });
  const shots: {
    name: string;
    width: number;
    theme: 'light' | 'dark';
    print: boolean;
  }[] = [];
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [1280, 390]) {
      shots.push(
        { name: `rapport-${theme}-${width}`, width, theme, print: false },
        { name: `imprimer-${theme}-${width}`, width, theme, print: true },
      );
    }
  }
  for (const shot of shots) {
    await page.setViewportSize({ width: shot.width, height: 900 });
    if (shot.print) {
      await page.goto(`/rapport/${AUDIT_ID}/imprimer?theme=${shot.theme}`);
      await expect(
        page.getByText('Le navigateur peut l’enregistrer en PDF.'),
      ).toBeVisible();
    } else {
      await page.goto(`/rapport?id=${AUDIT_ID}&theme=${shot.theme}`);
      await page.getByText('Voir comment corriger').first().click();
      await expect(
        page.getByRole('button', { name: 'Copier le prompt' }),
      ).toBeVisible();
    }
    await page.addStyleTag({
      content:
        'body{padding-top:0 !important}.site-bar{position:static !important}',
    });
    await page.screenshot({
      path: `${dir}/${shot.name}.png`,
      fullPage: true,
    });
  }
});
