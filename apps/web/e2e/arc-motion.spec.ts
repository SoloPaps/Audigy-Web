import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/dev/composants',
  '/compte',
  '/sites',
  '/methode',
] as const;

test('le mouvement réduit fige les blobs et la jauge', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of pages) {
    await page.goto(path);
    const name = await page.locator('.blob-petrol').evaluate((element) => {
      const view = globalThis as unknown as {
        getComputedStyle: (node: unknown) => { animationName: string };
      };
      return view.getComputedStyle(element).animationName;
    });
    expect(name).toBe('none');
  }
  await page.goto('/');
  const gauge = await page
    .locator('.gauge-fill')
    .first()
    .evaluate((element) => {
      const view = globalThis as unknown as {
        getComputedStyle: (node: unknown) => { animationName: string };
      };
      return view.getComputedStyle(element).animationName;
    });
  expect(gauge).toBe('none');
  await page.goto('/methode');
  await expect(page.locator('h1')).toHaveCSS(
    'font-family',
    /Atkinson Hyperlegible Next/,
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('la méthode fige les blobs même si le mouvement est permis', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/methode');
  const name = await page.locator('.blob-petrol').evaluate((element) => {
    const view = globalThis as unknown as {
      getComputedStyle: (node: unknown) => { animationName: string };
    };
    return view.getComputedStyle(element).animationName;
  });
  expect(name).toBe('none');
  await expect(page.locator('.hero')).toHaveCount(0);
  await expect(page.locator('.gauge')).toHaveCount(0);
});
