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

test('les réussites restent repliées', async ({ page }) => {
  await page.goto('/dev/composants?theme=light');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Votre site est en bonne santé.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'À corriger en priorité' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Le site accepte encore une adresse non chiffrée',
    }),
  ).toBeVisible();
  await expect(page.getByText('Pourquoi c’est important')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Le titre de la page est clair' }),
  ).toBeHidden();
  await page.locator('summary').filter({ hasText: 'Ce qui va bien' }).click();
  await expect(
    page.getByRole('heading', { name: 'Le titre de la page est clair' }),
  ).toBeVisible();
});

async function expectScoreInside(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.evaluate(async () => {
    const view = globalThis as unknown as {
      document: { fonts: { ready: Promise<unknown> } };
    };
    await view.document.fonts.ready;
  });
  const failures = await page.evaluate(() => {
    const view = globalThis as unknown as {
      document: {
        querySelectorAll: (selector: string) => ArrayLike<{
          getAttribute: (name: string) => string | null;
          scrollIntoView: (options: { block: string }) => void;
          querySelector: (selector: string) => NodeBox | null;
          querySelectorAll: (selector: string) => ArrayLike<NodeBox>;
        }>;
        elementFromPoint: (
          x: number,
          y: number,
        ) => {
          tagName: string;
        } | null;
      };
      getComputedStyle: (node: unknown) => { strokeWidth: string };
    };

    interface NodeBox {
      getBoundingClientRect: () => {
        left: number;
        top: number;
        right: number;
        bottom: number;
        width: number;
        height: number;
      };
      getAttribute: (name: string) => string | null;
      viewBox?: { baseVal: { width: number; height: number } };
      contains: (node: unknown) => boolean;
      tagName?: string;
    }

    interface ArrayLike<T> {
      length: number;
      [index: number]: T;
    }

    const found = new Set<string>();
    const problems: string[] = [];
    const gauges = view.document.querySelectorAll('.gauge');
    for (let index = 0; index < gauges.length; index += 1) {
      const gauge = gauges[index];
      if (!gauge) continue;
      const score = gauge.getAttribute('data-score') ?? '';
      found.add(score);
      gauge.scrollIntoView({ block: 'center' });
      const svg = gauge.querySelector('svg');
      const hole = gauge.querySelector('.gauge-hole');
      const track = gauge.querySelector('.gauge-track');
      if (!svg || !hole || !track || !svg.viewBox) {
        problems.push(`${score} structure`);
        continue;
      }
      const box = svg.getBoundingClientRect();
      const cx = Number(svg.getAttribute('data-cx'));
      const cy = Number(svg.getAttribute('data-cy'));
      const radius = Number(svg.getAttribute('data-r'));
      const stroke = Number.parseFloat(
        view.getComputedStyle(track).strokeWidth,
      );
      const scaleX = box.width / svg.viewBox.baseVal.width;
      const scaleY = box.height / svg.viewBox.baseVal.height;
      const inner = radius - stroke / ((scaleX + scaleY) / 2) / 2;
      const centerX = box.left + (cx / svg.viewBox.baseVal.width) * box.width;
      const centerY = box.top + (cy / svg.viewBox.baseVal.height) * box.height;
      const slack = 1 / scaleX;
      const texts = gauge.querySelectorAll('.score-num, .score-denom');
      for (let textIndex = 0; textIndex < texts.length; textIndex += 1) {
        const text = texts[textIndex];
        if (!text) continue;
        const rect = text.getBoundingClientRect();
        const corners = [
          [rect.left, rect.top],
          [rect.right, rect.top],
          [rect.left, rect.bottom],
          [rect.right, rect.bottom],
        ];
        for (const [x, y] of corners) {
          if (x === undefined || y === undefined) continue;
          const dx = (x - centerX) / scaleX;
          const dy = (y - centerY) / scaleY;
          if (Math.hypot(dx, dy) > inner + slack) {
            problems.push(`${score} hors cercle`);
          }
          const hit = view.document.elementFromPoint(
            Math.min(rect.right - 1, Math.max(rect.left + 1, x)),
            Math.min(rect.bottom - 1, Math.max(rect.top + 1, y)),
          );
          if (!hit || !hole.contains(hit)) {
            problems.push(`${score} sous le trait ${hit?.tagName ?? 'vide'}`);
          }
        }
      }
    }
    for (const score of ['0', '100', 'none']) {
      if (!found.has(score)) problems.push(`manque ${score}`);
    }
    return problems;
  });
  expect(failures).toEqual([]);
  await expect(page.locator('[data-score="0"] .score-num')).toHaveText('0');
  await expect(page.locator('[data-score="100"] .score-num')).toHaveText('100');
  await expect(page.locator('[data-score="none"] .score-num')).toHaveText('—');
}

test('le chiffre reste dans le cercle', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dev/composants?theme=light');
  await expectScoreInside(page);
});

test('le chiffre reste dans le cercle à 390 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/composants?theme=light');
  await expectScoreInside(page);
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
