import { expect, test } from '@playwright/test';

import { adminCredentials, findAdminUser } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * PANEL KOYU BAŞLAR (2026-11-02): cihaz açık temada ve seçim yokken panel koyu; site sistem
 * tercihine uyar. Düğme panelde açık ve koyu arasında tek dokunuşla geçer, seçim kalıcıdır.
 */
test.use({ colorScheme: 'light' });

test('seçim yokken panel koyu, site sistemde; düğme tek dokunuşla geçer', async ({
  page,
  baseURL,
}, info) => {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
  const sinif = () => page.locator('html').getAttribute('class');
  const zemin = () =>
    page.locator('.panel-modern').evaluate((el) => getComputedStyle(el).backgroundColor);

  await page.goto('/panel');
  expect(await sinif()).toContain('dark');
  expect(await zemin()).toBe('rgb(8, 8, 13)');

  // Sayfa yenilenmeden siteye geçince sistem temasına döner (yalnızca masaüstünde düğme var).
  if (info.project.name === 'chromium-desktop') {
    await page.getByRole('link', { name: 'Siteye dön' }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/panel'));
    await expect.poll(sinif).not.toContain('dark');
    await page.goto('/panel');
  }

  const dugme = page.getByRole('button', { name: /Koyu tema açık/ });
  await dugme.click();
  await expect(page.getByRole('button', { name: /Aydınlık tema açık/ })).toBeVisible();
  expect(await sinif()).toContain('light');
  expect(await zemin()).not.toBe('rgb(8, 8, 13)');

  // Seçim kalıcı: yenileyince açık kalır, tek dokunuşla koyuya döner.
  await page.reload();
  expect(await sinif()).toContain('light');
  await page.getByRole('button', { name: /Aydınlık tema açık/ }).click();
  await expect(page.getByRole('button', { name: /Koyu tema açık/ })).toBeVisible();
  expect(await sinif()).toContain('dark');
});

test('açılan site sistem temasında kalır', async ({ page }) => {
  await page.goto('/');
  expect((await page.locator('html').getAttribute('class')) ?? '').not.toContain('dark');
});
