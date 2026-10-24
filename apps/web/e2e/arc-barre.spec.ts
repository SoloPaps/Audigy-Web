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

test('la barre flottante indique la page et le menu se ferme avec Échap', async ({
  page,
}) => {
  await page.goto('/methode');
  const bar = page.getByRole('navigation', { name: 'Pages' });
  await expect(bar.getByRole('link', { name: 'Méthode' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(bar.getByRole('link', { name: 'Connexion' })).toBeVisible();
  await expect(bar.getByRole('link', { name: 'Sites' })).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Aller au contenu' }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 800 });
  await waitForIslands(page);
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('le pied nomme les conditions et reste sur une navigation', async ({
  page,
}) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(
    footer.getByRole('link', { name: 'Conditions d’utilisation' }),
  ).toHaveAttribute('href', '/cgu');
  await expect(footer.getByRole('link', { name: 'Méthode' })).toHaveAttribute(
    'href',
    '/methode',
  );
});
