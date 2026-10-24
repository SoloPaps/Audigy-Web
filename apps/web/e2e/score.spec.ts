import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const TRAP = 'fuite-hsts-mesure-secrete';
const SHARE = 'ab'.repeat(16);
const REVOKED = '00'.repeat(16);

async function fits(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const root = (
      globalThis as unknown as {
        document: {
          documentElement: { scrollWidth: number; clientWidth: number };
        };
      }
    ).document.documentElement;
    return root.scrollWidth <= root.clientWidth + 1;
  });
}

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

test('la page publique montre les notes sans le détail sécurité', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/score/exemple-score/?theme=light');
  await expect(page.getByText('Les notes sont publiques.')).toBeVisible();
  await expect(
    page.getByText('Le détail de la protection n’est pas publié.'),
  ).toBeVisible();
  await expect(page.getByText('Méthode 2026.1')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Vérifier ce rapport' }),
  ).toHaveAttribute('href', '/verifier/00000000-0000-4000-8000-000000000019');
  await expect(page.locator('time')).toHaveAttribute(
    'datetime',
    '2026-10-23T08:00:00.000Z',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  const html = await page.content();
  expect(html).not.toContain(TRAP);
  expect(html).not.toContain('securite.hsts');
  expect(await fits(page)).toBe(true);
  await expectNoViolations(page);

  await page.setViewportSize({ width: 320, height: 720 });
  expect(await fits(page)).toBe(true);
});

test('le lien partagé est en noindex et la révocation est immédiate', async ({
  page,
}) => {
  await page.goto(`/partage/${SHARE}/?theme=dark`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  );
  await expect(page.getByText('72')).toBeVisible();
  const open = await page.content();
  expect(open).not.toContain(TRAP);
  await expectNoViolations(page);

  await page.goto(`/partage/${REVOKED}/`);
  await expect(page.getByText('Ce lien ne fonctionne plus.')).toBeVisible();
  await expect(page.getByText('72')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  );
});
