import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('le brief se génère au clavier, sans requête', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (request) => {
    urls.push(request.url());
  });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/dev/composants');
  await expect(page.getByText('Non testé — pas de brief')).toBeVisible();
  const fail = page.getByRole('checkbox', {
    name: 'Inclure Le site accepte encore une adresse non chiffrée',
  });
  await fail.focus();
  await page.keyboard.press('Space');
  await expect(fail).toBeChecked();
  const generate = page.getByRole('button', { name: 'Générer le brief' });
  await generate.click();
  const zone = page.getByRole('textbox', { name: 'Texte du brief' });
  await expect(zone).toBeVisible();
  await expect(zone).toHaveValue(/Test : securite\.https\./);
  await expect(zone).toHaveValue(/Réussi veut dire :/);
  await expect(zone).not.toHaveValue(/\nTerminal\n/);
  await expect(page.getByText('Brief généré, 1 constats')).toBeVisible();
  const failRow = page.locator('article.finding', {
    has: page.getByRole('checkbox', {
      name: 'Inclure Le site accepte encore une adresse non chiffrée',
    }),
  });
  await failRow.getByRole('radio', { name: 'Vérifier, sans écrire' }).check();
  await page.getByRole('button', { name: 'Régénérer' }).click();
  await expect(zone).toHaveValue(/Terminal/);
  await expect(zone).toHaveValue(/N’écrivez rien/);
  await expect(zone).not.toHaveValue(/rm\s+-/);
  await expect(fail).toBeChecked();
  await page.getByRole('button', { name: 'Copier' }).click();
  await expect(page.getByText('Brief copié')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Terminal');
  expect(
    urls.some((url) => /openai|anthropic|cursor\.com\/api/u.test(url)),
  ).toBe(false);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('la voie rapide ignore les cases et le terminal', async ({ page }) => {
  await page.goto('/dev/composants');
  const warn = page.getByRole('checkbox', {
    name: 'Inclure La page peut être affichée dans un cadre trompeur',
  });
  await warn.check();
  await expect(page.getByText('1 sélectionné')).toBeVisible();
  await page.getByRole('button', { name: 'Tous les échecs' }).click();
  const zone = page.getByRole('textbox', { name: 'Texte du brief' });
  await expect(zone).toHaveValue(/adresse non chiffrée/);
  await expect(zone).not.toHaveValue(/cadre trompeur/);
  await expect(zone).not.toHaveValue(/\nTerminal\n/);
  await expect(warn).toBeChecked();
});

test('réduire garde le texte et une case ne régénère pas', async ({ page }) => {
  await page.goto('/dev/composants');
  await page
    .getByRole('checkbox', {
      name: 'Inclure Le site accepte encore une adresse non chiffrée',
    })
    .check();
  await page.getByRole('button', { name: 'Générer le brief' }).click();
  const zone = page.getByRole('textbox', { name: 'Texte du brief' });
  const before = await zone.inputValue();
  await page.getByRole('button', { name: 'Réduire' }).click();
  await expect(zone).toHaveCount(0);
  await page.getByRole('button', { name: 'Afficher le brief' }).click();
  await expect(zone).toHaveValue(before);
  await page
    .getByRole('checkbox', {
      name: 'Inclure La description de la page est trop courte',
    })
    .check();
  await expect(zone).toHaveValue(before);
});

test('à 320 px le panneau ne déborde pas', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/dev/composants');
  await page
    .getByRole('checkbox', {
      name: 'Inclure Le site accepte encore une adresse non chiffrée',
    })
    .check();
  await page.getByRole('button', { name: 'Générer le brief' }).click();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});
