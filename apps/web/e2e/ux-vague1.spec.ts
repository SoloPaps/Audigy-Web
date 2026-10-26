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

test('la barre étroite ne coupe pas la marque, le menu ni le thème', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/compte?theme=dark');
  const plate = page.locator('.bar-plate');
  const labels = [
    page.getByRole('link', { name: 'Audigy', exact: true }),
    page.getByRole('button', { name: 'Menu' }),
    page.locator('.theme span', { hasText: 'Thème' }),
  ];
  const plateBox = await plate.boundingBox();
  expect(plateBox).not.toBeNull();
  const inside = [...labels, page.getByRole('combobox', { name: 'Langue' })];
  for (const label of labels) {
    const lines = await label.evaluate((node) => {
      const view = globalThis as unknown as {
        document: {
          createRange: () => {
            selectNodeContents: (target: unknown) => void;
            getClientRects: () => { length: number };
          };
        };
      };
      const range = view.document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects().length;
    });
    expect(lines).toBe(1);
  }
  for (const label of inside) {
    const box = await label.boundingBox();
    expect(box).not.toBeNull();
    if (box && plateBox) {
      expect(box.x).toBeGreaterThanOrEqual(plateBox.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(
        plateBox.x + plateBox.width + 1,
      );
    }
  }
});

test('la barre et le pied ne sont pas soulignés au repos', async ({ page }) => {
  await page.goto('/methode');
  const bar = page.getByRole('navigation', { name: 'Pages' });
  const method = bar.getByRole('link', { name: 'Méthode' });
  await expect(method).toHaveClass(/link-nav/);
  await expect(method).toHaveAttribute('aria-current', 'page');
  await expect(method).toHaveCSS('text-decoration-line', /underline/);
  const login = bar.getByRole('link', { name: 'Connexion' });
  await expect(login).toHaveClass(/link-nav/);
  await expect(login).toHaveCSS('text-decoration-line', 'none');

  const footer = page
    .getByRole('contentinfo')
    .getByRole('link', { name: 'Conditions d’utilisation' });
  await expect(footer).toHaveClass(/link-footer/);
  await expect(footer).toHaveCSS('text-decoration-line', 'none');

  const prose = page.getByRole('link', {
    name: 'Voir les conditions d’utilisation.',
  });
  await expect(prose).toHaveClass(/link-inline/);
  await expect(prose).toHaveCSS('font-weight', '600');
  await expect(prose).toHaveCSS('text-decoration-line', /underline/);

  await page.goto('/compte');
  const action = page.getByRole('link', { name: 'Aller à la connexion' });
  await expect(action).toHaveCSS('font-weight', '600');
  await expect(action).toHaveCSS('border-top-width', '1px');
  await expect(action).toHaveCSS('min-height', '44px');
  await expect(footer).toHaveCSS('font-weight', '400');
});
