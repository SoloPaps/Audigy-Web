import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function expectNoViolations(
  page: import('@playwright/test').Page,
): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

test('accueil clair et sombre sans violation', async ({ page }) => {
  await page.goto('/?theme=light');
  await expectNoViolations(page);
  await page.goto('/?theme=dark');
  await expectNoViolations(page);
});

test('composants clair sans violation', async ({ page }) => {
  await page.goto('/dev/composants?theme=light');
  await expectNoViolations(page);
});

test('composants sombre sans violation', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/dev/composants?theme=dark');
  await page.waitForFunction(() => {
    const root = globalThis as unknown as {
      document: {
        querySelector: (
          selector: string,
        ) => { hasAttribute: (name: string) => boolean } | null;
      };
    };
    const island = root.document.querySelector('astro-island');
    return Boolean(island && !island.hasAttribute('ssr'));
  });
  await expect(page.getByLabel('Thème')).toHaveValue('dark');
  await expectNoViolations(page);
});

test('reflow à 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/dev/composants?theme=light');
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
});

test('mouvement réduit : jauge immobile sur le score', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dev/composants?theme=light');
  const style = await page
    .locator('.gauge-fill')
    .first()
    .evaluate((element) => {
      const view = globalThis as unknown as {
        getComputedStyle: (node: unknown) => {
          animationDuration: string;
          animationName: string;
          strokeDasharray: string;
        };
      };
      const computed = view.getComputedStyle(element);
      return {
        duration: computed.animationDuration,
        name: computed.animationName,
        dash: computed.strokeDasharray,
      };
    });
  expect(style.duration === '0s' || style.name === 'none').toBe(true);
});

test('jauge animée au plus 400 ms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/dev/composants?theme=light');
  const duration = await page
    .locator('.gauge-fill')
    .first()
    .evaluate((element) => {
      const view = globalThis as unknown as {
        getComputedStyle: (node: unknown) => { animationDuration: string };
      };
      return view.getComputedStyle(element).animationDuration;
    });
  expect(duration).toBe('0.4s');
});

test('aucune requête tierce', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (request) => {
    urls.push(request.url());
  });
  await page.goto('/dev/composants?theme=light');
  await page.waitForLoadState('networkidle');
  const third = urls.filter((url) => {
    const host = new URL(url).host;
    return host !== '127.0.0.1:4321' && host !== 'localhost:4321';
  });
  expect(third).toEqual([]);
});

test('thème sombre mémorisé', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  await page.goto('/dev/composants');
  await page.waitForFunction(() => {
    const root = globalThis as unknown as {
      document: {
        querySelector: (
          selector: string,
        ) => { hasAttribute: (name: string) => boolean } | null;
      };
    };
    const island = root.document.querySelector('astro-island');
    return Boolean(island && !island.hasAttribute('ssr'));
  });
  await page.getByLabel('Thème').selectOption('dark');
  expect(errors).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('lien d’évitement', async ({ page }) => {
  await page.goto('/dev/composants?theme=light');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Aller au contenu' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#contenu')).toBeFocused();
});

test('filtre des problèmes', async ({ page }) => {
  await page.goto('/dev/composants?theme=light');
  await page.getByRole('button', { name: /Problèmes/ }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Le site accepte encore une adresse non chiffrée',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Le titre de la page est clair' }),
  ).toHaveCount(0);
});
