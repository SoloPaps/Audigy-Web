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

test('propose de relier Search Console', async ({ page }) => {
  await page.goto('/search-console');
  await waitForIslands(page);
  const link = page.getByRole('link', { name: 'Connecter Search Console' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', /\/connexion\?next=/);
  await expectNoViolations(page);

  await page.goto('/search-console?theme=dark');
  await waitForIslands(page);
  await expect(
    page.getByRole('link', { name: 'Connecter Search Console' }),
  ).toBeVisible();
  await expectNoViolations(page);
});
