import { expect, test } from '@playwright/test';

test('preuve et vérification s’ouvrent au clavier et s’impriment', async ({
  page,
}) => {
  await page.goto('/dev/composants');
  const how = page.locator('details', {
    hasText: 'Comment vérifier ce rapport',
  });
  await expect(how).not.toHaveJSProperty('open', true);
  await how.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(how).toHaveJSProperty('open', true);

  const proof = page.locator('details.preuve-mentions');
  await expect(proof).not.toHaveJSProperty('open', true);
  await proof.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(proof).toHaveJSProperty('open', true);
  await proof.locator('summary').click();
  await expect(proof).not.toHaveJSProperty('open', true);

  await page.emulateMedia({ media: 'print' });
  await expect(
    proof.getByText(
      'Ce rapport n’est pas un constat de commissaire de justice.',
    ),
  ).toBeVisible();
});

test('connexion et compte n’ont qu’un titre, avec leur accroche', async ({
  page,
}) => {
  await page.goto('/connexion');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Recevoir un lien de connexion',
  );
  await expect(
    page.getByText(
      'Indiquez votre e-mail. Nous vous envoyons un lien, sans mot de passe.',
    ),
  ).toBeVisible();

  await page.goto('/compte');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Votre compte',
  );
  await expect(
    page.getByText(
      'Gérez l’export de vos données et la suppression du compte.',
    ),
  ).toBeVisible();
});

test('la barre et le pied ne sont pas soulignés au repos', async ({ page }) => {
  await page.goto('/methode');
  const bar = page.getByRole('navigation', { name: 'Pages' });
  const method = bar.getByRole('link', { name: 'Méthode' });
  await expect(method).toHaveClass(/link-nav/);
  await expect(method).toHaveAttribute('aria-current', 'page');
  expect(
    await method.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toContain('underline');
  const login = bar.getByRole('link', { name: 'Connexion' });
  await expect(login).toHaveClass(/link-nav/);
  expect(
    await login.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toBe('none');

  const footer = page
    .getByRole('contentinfo')
    .getByRole('link', { name: 'Conditions d’utilisation' });
  await expect(footer).toHaveClass(/link-footer/);
  expect(
    await footer.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toBe('none');

  const prose = page.getByRole('link', {
    name: 'Voir les conditions d’utilisation.',
  });
  await expect(prose).toHaveClass(/link-inline/);
  expect(
    await prose.evaluate((node) => getComputedStyle(node).textDecorationLine),
  ).toContain('underline');
});
