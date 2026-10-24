import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('l’accueil montre l’exemple avant de demander l’adresse', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Vérifiez la santé de votre site, gratuitement.',
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Un score, ce qu’il veut dire, et quoi corriger. Rien n’est publié sans vous.',
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Adresse du site')).toHaveAttribute(
    'type',
    'url',
  );
  await expect(
    page.getByRole('button', { name: "Lancer l'audit" }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Comment le score est calculé' }),
  ).toHaveAttribute('href', '/methode');
  await expect(page.getByText('Exemple', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('img', { name: /Score global : 72 sur 100, à améliorer/ }),
  ).toBeVisible();
  const preview = page.getByRole('complementary');
  await expect(preview.getByText('Visibilité sur Google')).toBeVisible();
  await expect(preview.getByText('Connexion chiffrée')).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Ce que vous obtenez' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Gratuit pour les particuliers',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Comment lire le score' }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('une adresse incomplète reste sur l’accueil', async ({ page }) => {
  await page.goto('/');
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
  await page.getByLabel('Adresse du site').fill('exemple.fr');
  await page.getByRole('button', { name: "Lancer l'audit" }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText(/Indiquez une adresse complète/)).toBeVisible();
});

test('l’accueil ne défile pas en large à 320, 768 et 1280', async ({
  page,
}) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const overflow = await page.evaluate(() => {
      const root = globalThis as unknown as {
        document: {
          documentElement: { scrollWidth: number; clientWidth: number };
        };
      };
      return (
        root.document.documentElement.scrollWidth >
        root.document.documentElement.clientWidth + 1
      );
    });
    expect(overflow).toBe(false);
  }
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await expect(page.locator('.blob-lilac')).toBeHidden();
});
