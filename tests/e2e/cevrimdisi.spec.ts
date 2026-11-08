import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser, hizliSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * ÇEVRİMDIŞI (2026-10-31): gezinme "Bağlantı yok" ekranına düşer; hızlı kayıt
 * kuyrukta bekler ve bağlantı gelince GERÇEKTEN kaydedilir. Service worker
 * yalnızca üretim derlemesinde kurulur — CI'daki gibi.
 */
test.use({ serviceWorkers: 'allow' });

async function oturum(page: Page, baseURL: string | undefined) {
  const { email } = adminCredentials();
  const y = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: y.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

test('bağlantı yokken panel gezinmesi "Bağlantı yok" ekranına düşer', async ({ page, baseURL }) => {
  await oturum(page, baseURL);
  await page.goto('/panel');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await page.context().setOffline(true);
  try {
    await page.goto('/panel/spor');
    await expect(page.getByRole('heading', { name: 'Bağlantı yok' })).toBeVisible();
  } finally {
    await page.context().setOffline(false);
  }
});

test('hızlı harcama bağlantı yokken kuyruğa girer, gelince kaydedilir', async ({
  page,
  baseURL,
}, info) => {
  // `workerIndex`: paralel tekrarlar aynı adı üretip birbirinin satırını bulmasın.
  const onek = `e2e-kuyruk-${info.project.name}-${info.workerIndex}-`;
  const ad = `${onek}${Date.now()}`;
  await oturum(page, baseURL);
  try {
    await page.goto('/panel/spor');
    await page.getByRole('button', { name: 'Hızlı kayıt' }).click();
    const form = page.getByRole('dialog');
    await form.getByRole('button', { name: 'Harcama' }).click();
    await form.getByLabel('Tutar (₺)').fill('125,50');
    await form.getByLabel('Ne için').fill(ad);

    await page.context().setOffline(true);
    await form.getByRole('button', { name: 'Ekle', exact: true }).click();
    await expect(page.getByText('gelince kaydedilecek')).toBeVisible();
    await expect(page.getByText('Bağlantı yok · 1 kayıt bekliyor')).toBeVisible();

    await page.context().setOffline(false);
    await expect(page.getByText('kayıt bekliyor')).toHaveCount(0, { timeout: 15_000 });

    await page.goto('/panel/cuzdan');
    await expect(page.getByRole('link', { name: new RegExp(ad) })).toBeVisible();
  } finally {
    await page.context().setOffline(false);
    await hizliSondaSil(onek);
  }
});
