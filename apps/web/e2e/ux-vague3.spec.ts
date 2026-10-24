import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

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
  is_public: false,
  public_slug: null,
  expose_security: false,
  owner_id: USER_ID,
};

const audit = {
  id: AUDIT_ID,
  site_id: SITE_ID,
  status: 'done',
  global_score: 72,
  finished_at: '2026-10-23T12:00:00.000Z',
  created_at: '2026-10-23T11:00:00.000Z',
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

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
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

async function mockSites(
  page: Page,
  rows: readonly Record<string, unknown>[],
  audits: readonly Record<string, unknown>[] | 'error',
): Promise<void> {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/rest/v1/sites') && audits === 'error') {
      await route.fulfill({ status: 500, body: '{}' });
      return;
    }
    if (path.endsWith('/rest/v1/sites')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      });
      return;
    }
    if (path.endsWith('/rest/v1/audits')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(audits === 'error' ? [] : audits),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
  await page.route('**/api/places', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false }),
    });
  });
}

test('historique, filtres et lien hors Audigy', async ({ page }) => {
  await page.goto('/dev/composants?theme=light');
  await waitForIslands(page);
  const others = page.locator('details', { hasText: 'Autres mesures' });
  await expect(others).not.toHaveJSProperty('open', true);
  await expect(page.locator('.swatch')).toHaveCount(1);
  const compare = page.locator('details', { hasText: 'Comparer deux audits' });
  await expect(compare).not.toHaveJSProperty('open', true);
  await expect(page.locator('table')).toBeHidden();

  const filters = page.getByRole('group', { name: 'Filtrer les corrections' });
  const active = filters.getByRole('button', { name: /Tout/ });
  const idle = filters.getByRole('button', { name: /Problèmes/ });
  await expect(active).toHaveAttribute('aria-pressed', 'true');
  await expect(active).toHaveCSS('border-radius', '999px');
  await expect(active).toHaveCSS('font-weight', '600');
  await expect(idle).toHaveAttribute('aria-pressed', 'false');
  await expect(idle).toHaveCSS('border-radius', '4px');
  await expect(idle).toHaveCSS('font-weight', '400');

  const finding = page.locator('#finding-https');
  await finding.getByText('Voir comment corriger').click();
  const source = finding.getByRole('link', { name: /Guide MDN sur HSTS/ });
  await expect(source).toHaveClass(/link-inline/);
  await expect(source).toHaveAttribute('href', /developer\.mozilla\.org/);
  await expect(source).not.toHaveAttribute('target', '_blank');
  await expect(source).toContainText('hors d’Audigy');
  await expectNoViolations(page);
});

test('lancement et progression sont dans une plaque', async ({ page }) => {
  await page.goto('/lancer');
  await waitForIslands(page);
  const launch = page.locator('.glass-plate', {
    has: page.getByRole('heading', { level: 1, name: 'Lancement de l’audit' }),
  });
  await expect(launch.getByRole('status')).toContainText(
    'Indiquez l’adresse du site sur l’accueil.',
  );
  await expectNoViolations(page);

  await page.goto('/progression');
  await waitForIslands(page);
  const progress = page.locator('.glass-plate', {
    has: page.getByRole('heading', { level: 1, name: 'Avancement de l’audit' }),
  });
  await expect(progress.getByRole('status')).toBeVisible();
  await expect(
    progress.getByRole('link', { name: 'Revenir à l’accueil' }),
  ).toHaveCount(0);
  await expectNoViolations(page);
});

test('le score public absent est une plaque, sans détail de sécurité', async ({
  page,
}) => {
  await page.goto('/score/exemple-score/?theme=light');
  await expect(page.locator('.reading .glass').first()).toBeVisible();
  await expect(
    page.getByText('Le détail de la protection n’est pas publié.'),
  ).toBeVisible();
  await expect(
    page.getByText('Le navigateur d’audit n’a pas tourné.'),
  ).toHaveCount(0);
  const html = await page.content();
  expect(html).not.toContain('securite.hsts');
  await expectNoViolations(page);

  await page.goto(`/partage/${'00'.repeat(16)}/`);
  const missing = page.locator('.empty');
  await expect(missing).toContainText('Ce lien ne fonctionne plus.');
  await expect(missing.getByRole('status')).toHaveCount(0);
  await expectNoViolations(page);
});

test('la note de pied est sous les liens et absente à l’impression du rapport', async ({
  page,
}) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  const note = footer.getByText(
    'Outil gratuit. Aucun traceur. Polices hébergées ici.',
  );
  await expect(note).toBeVisible();
  const links = footer.getByRole('navigation');
  const noteBox = await note.boundingBox();
  const linksBox = await links.boundingBox();
  expect(noteBox && linksBox ? noteBox.y : 0).toBeGreaterThan(linksBox?.y ?? 0);

  await page.goto('/rapport/imprimer/');
  await expect(note).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(note).toBeHidden();
});

test('la liste des sites garde une tuile et replie les actions', async ({
  page,
}) => {
  await mockSites(page, [site], [audit]);
  await signIn(page);
  await page.goto('/sites');
  await waitForIslands(page);
  const gsc = page.getByRole('link', { name: 'Connecter Search Console' });
  await expect(gsc).toHaveCount(1);
  await expect(gsc).toHaveClass(/link-action/);
  await expect(page.locator('.button-primary')).toHaveCount(1);
  const tile = page.getByRole('link', { name: /exemple\.fr/ });
  await expect(tile).toHaveAttribute('href', `/rapport?id=${AUDIT_ID}`);
  await expect(tile.locator('.kicker')).toHaveCSS(
    'font-family',
    /JetBrains Mono/,
  );
  await expect(tile).toContainText('23 oct. 2026');
  await expect(tile).toContainText('72');
  const actions = page.locator('details.site-actions');
  await expect(actions).not.toHaveJSProperty('open', true);
  await expect(
    page.getByRole('link', { name: /Prouver que le site est à vous/ }),
  ).toBeHidden();
  await actions.locator('summary').click();
  await expect(
    page.getByRole('link', { name: /Prouver que le site est à vous/ }),
  ).toBeVisible();
  await expectNoViolations(page);
});

test('aucun site utilise la plaque vide, pas l’erreur réseau', async ({
  page,
}) => {
  await mockSites(page, [], []);
  await signIn(page);
  await page.goto('/sites');
  await waitForIslands(page);
  const empty = page.locator('.empty');
  await expect(empty).toContainText('Aucun site pour le moment.');
  await expect(empty.locator('.button-primary')).toHaveCount(1);
  await expect(empty.getByRole('status')).toHaveCount(0);

  await page.unroute('http://127.0.0.1:54321/**');
  await mockSites(page, [], 'error');
  await page.goto('/sites');
  await waitForIslands(page);
  await expect(page.getByRole('status')).toContainText(
    'La liste des sites ne s’affiche pas. Réessayez.',
  );
  await expect(page.locator('.empty')).toHaveCount(0);
});

test('un ancrage reste sous la barre étroite', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/methode');
  await page.locator('a[href="#method-repro"]').click();
  const target = page.locator('#method-repro');
  const bar = page.locator('.site-bar');
  const targetBox = await target.boundingBox();
  const barBox = await bar.boundingBox();
  expect(targetBox).not.toBeNull();
  expect(barBox).not.toBeNull();
  if (targetBox && barBox) {
    expect(targetBox.y).toBeGreaterThanOrEqual(barBox.y + barBox.height - 1);
  }
});
