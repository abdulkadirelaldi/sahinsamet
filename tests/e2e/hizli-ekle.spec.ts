import { expect, test } from '@playwright/test';

import { adminCredentials, findAdminUser, hizliSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * HIZLI EKLEME (2026-10-30) — her ekrandaki "+": harcama sayfadan çıkmadan
 * eklenir ve Cüzdan'ın "Bu ayın harcamaları" bölümünde görünür.
 */
test('"+" ile harcama eklenir ve bu ayın harcamalarında görünür', async ({
  page,
  baseURL,
}, info) => {
  const onek = `e2e-hizli-${info.project.name}-${info.workerIndex}-`;
  const ad = `${onek}${Date.now()}`;
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );

  try {
    await page.goto('/panel/spor');
    await page.getByRole('button', { name: 'Hızlı kayıt' }).click();
    const sayfa = page.getByRole('dialog', { name: 'Hızlı ekle' });
    await expect(sayfa).toBeVisible();
    await sayfa.getByRole('button', { name: 'Harcama' }).click();

    const form = page.getByRole('dialog');
    await form.getByLabel('Tutar (₺)').fill('1.250,50');
    await form.getByLabel('Ne için').fill(ad);
    await form.getByRole('radio', { name: 'Yemek' }).click();
    await form.getByRole('button', { name: 'Ekle', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Harcama eklendi' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.goto('/panel/cuzdan');
    const satir = page.getByRole('link', { name: new RegExp(ad) });
    await expect(satir).toBeVisible();
    await expect(satir).toContainText('Yemek');
    await expect(satir).toContainText('1.250,50');
  } finally {
    await hizliSondaSil(onek);
  }
});

test('kısayol adresi hızlı ekleme sayfasını doğrudan açar', async ({ page, baseURL }) => {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
  await page.goto('/panel?ekle=su');
  await expect(page.getByRole('dialog', { name: 'Su içtim' })).toBeVisible();
  // Parametre silinir: yenileme sayfayı yeniden açmaz.
  await expect(page).toHaveURL(/\/panel$/);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
