import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

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

test('le pied de page ouvre les pages légales', async ({ page }) => {
  await page.goto('/');
  await waitForIslands(page);
  const footer = page.getByRole('contentinfo');
  await expect(
    footer.getByRole('link', { name: 'Mentions légales' }),
  ).toHaveAttribute('href', '/mentions-legales');
  await expect(
    footer.getByRole('link', { name: 'Confidentialité' }),
  ).toHaveAttribute('href', '/confidentialite');
  await expect(
    footer.getByRole('link', { name: 'Conditions d’utilisation' }),
  ).toHaveAttribute('href', '/cgu');
  await expect(
    footer.getByRole('link', { name: 'Accessibilité' }),
  ).toHaveAttribute('href', '/accessibilite');
  await expect(footer.getByRole('link', { name: 'Méthode' })).toHaveAttribute(
    'href',
    '/methode',
  );

  await page.goto('/cgu');
  await waitForIslands(page);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Conditions d’utilisation' }),
  ).toBeVisible();
  await expect(page.getByText('article 323-1 du code pénal')).toBeVisible();
  await expect(page.getByText(/propriétaire du site/)).toBeVisible();
  await expectNoViolations(page);

  await page.goto('/mentions-legales?theme=dark');
  await waitForIslands(page);
  await expect(page.getByText('AudigyWeb@outlook.fr')).toBeVisible();
  await expect(page.getByText('audigyweb.fr')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hébergeur' })).toBeVisible();
  await expectNoViolations(page);

  await page.goto('/confidentialite?theme=light');
  await waitForIslands(page);
  await expectNoViolations(page);

  await page.goto('/accessibilite');
  await waitForIslands(page);
  await expect(page.getByText('audit formel non réalisé')).toBeVisible();
  await expectNoViolations(page);

  await page.goto('/methode');
  await waitForIslands(page);
  await expect(page.getByText('Méthode 2026.1.')).toBeVisible();
  await expectNoViolations(page);

  await page.goto('/compte');
  await waitForIslands(page);
  const loggedOut = page.getByText('Connectez-vous pour gérer votre compte.');
  const unconfigured = page.getByText(
    'La connexion n’est pas disponible sur cette installation.',
  );
  await expect(loggedOut.or(unconfigured)).toBeVisible();
  await expectNoViolations(page);
});

test('la connexion est une carte avec un seul envoi', async ({ page }) => {
  await page.goto('/connexion');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Recevoir un lien de connexion',
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Adresse e-mail')).toHaveAttribute(
    'type',
    'email',
  );
  await expect(
    page.getByRole('button', { name: 'Envoyer le lien' }),
  ).toBeVisible();
  const card = page.locator('.login-card');
  const box = await card.boundingBox();
  expect(Math.round(box?.width ?? 0)).toBeLessThanOrEqual(480);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
