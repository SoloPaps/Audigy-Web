import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const ID = '00000000-0000-4000-8000-000000000019';
const fixtures = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/evidence/fixtures',
);

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

async function ouvrir(page: Page): Promise<void> {
  await page.goto(`/verifier/${ID}/?theme=light`);
  await expect(page.getByText('La signature correspond.')).toBeVisible();
}

function retourner(octets: Uint8Array): Buffer {
  const copie = Buffer.from(octets);
  const index = copie.length - 1;
  copie[index] = (copie[index] ?? 0) ^ 0xff;
  return copie;
}

test('mentions, horodatage, signature et code', async ({ page }) => {
  await ouvrir(page);
  await expect(
    page.getByText(
      'Ce rapport n’est pas un constat de commissaire de justice.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Horodatage RFC 3161 non qualifié au sens d’eIDAS.'),
  ).toBeVisible();
  await expect(
    page.getByText('Un horodatage non qualifié reste recevable comme preuve.'),
  ).toBeVisible();
  await expect(
    page.getByText('C’est l’article 41.1 du règlement eIDAS.'),
  ).toBeVisible();
  await expect(
    page.getByText('Il n’a pas de présomption d’exactitude (article 41.2).'),
  ).toBeVisible();
  await expect(
    page.getByText('Horodatage A', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText('Horodatage B', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText('24 oct. 2026, 10:00').first()).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Code du lien de vérification' }),
  ).toBeVisible();
  await page.getByText('Vérification experte').click();
  await expect(page.getByText(/openssl ts -verify/)).toBeVisible();
});

test('un octet modifié dans le PDF ou le JSON ne correspond pas', async ({
  page,
}) => {
  const pdf = new Uint8Array(
    await readFile(path.join(fixtures, 'rapport.pdf')),
  );
  const json = new Uint8Array(
    await readFile(path.join(fixtures, 'results.json')),
  );
  await ouvrir(page);
  const apres: string[] = [];
  page.on('request', (request) => {
    apres.push(request.url());
  });
  await page.getByLabel('Fichier du rapport').setInputFiles({
    name: 'rapport.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf),
  });
  await expect(page.getByText('Ce fichier correspond.')).toBeVisible();
  await page.getByLabel('Fichier du rapport').setInputFiles({
    name: 'rapport.pdf',
    mimeType: 'application/pdf',
    buffer: retourner(pdf),
  });
  await expect(page.getByText('Ce fichier ne correspond pas.')).toBeVisible();
  await page.getByLabel('Fichier du rapport').setInputFiles({
    name: 'results.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect(page.getByText('Ce fichier correspond.')).toBeVisible();
  await page.getByLabel('Fichier du rapport').setInputFiles({
    name: 'results.json',
    mimeType: 'application/json',
    buffer: retourner(json),
  });
  await expect(page.getByText('Ce fichier ne correspond pas.')).toBeVisible();
  expect(apres).toEqual([]);
});

test('vérification claire et sombre sans violation', async ({ page }) => {
  await page.goto(`/verifier/${ID}/?theme=light`);
  await expect(page.getByText('La signature correspond.')).toBeVisible();
  await expectNoViolations(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`/verifier/${ID}/?theme=dark`);
  await expect(page.getByLabel('Thème')).toHaveValue('dark');
  await expect(page.getByText('La signature correspond.')).toBeVisible();
  await expectNoViolations(page);
});

test('reflow à 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await ouvrir(page);
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

test('mentions aussi sur la page des composants', async ({ page }) => {
  await page.goto('/dev/composants?theme=light');
  await expect(
    page.getByText('Horodatage RFC 3161 non qualifié au sens d’eIDAS.'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Vérifier ce rapport' }),
  ).toHaveAttribute('href', `/verifier/${ID}`);
});
