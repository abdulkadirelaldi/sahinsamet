import { expect, test } from '@playwright/test';

import { adminCredentials, cuzdanSondaKur, cuzdanSondaSil, findAdminUser } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * PARA AKIŞI (2026-11-02): ekrandan ödeme ve transfer, bakiye gerçekten değişir, silince tam
 * olarak geri gelir. Kuralların ayrıntısı `tests/integration`; burada formun servise bağı.
 */
test('borç ödemesi hesabı düşürür, silinince tam geri gelir; transfer iki hesabı değiştirir', async ({
  page,
  baseURL,
}, info) => {
  const onek = `e2e-para-${info.project.name}-${info.workerIndex}-`;
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
  const k = await cuzdanSondaKur(onek);
  const yazma = () => page.waitForResponse((r) => r.request().method() === 'POST');

  try {
    await page.goto(`/panel/cuzdan/borc/${k.borcId}`);
    const hesapSecimi = page.getByLabel('Düşülecek hesap');
    await hesapSecimi.selectOption(k.hesapA);
    await expect(hesapSecimi.locator(`option[value="${k.hesapA}"]`)).toContainText('3.000,00');

    await page.getByLabel('Tutar (₺)').fill('1.000,00');
    let bitti = yazma();
    await page.getByRole('button', { name: 'Ödemeyi kaydet' }).click();
    await bitti;

    await page.reload();
    await expect(hesapSecimi.locator(`option[value="${k.hesapA}"]`)).toContainText('2.000,00');
    const kalan = page.locator('section').filter({ hasText: 'Kalan' }).first();
    await expect(kalan).toContainText('4.000,00');

    // İki adımlı silme: hesap ve kalan eski hâline döner.
    const sil = page.getByRole('button', { name: 'Sil', exact: true }).first();
    await sil.click();
    bitti = yazma();
    await page
      .getByRole('button', { name: /emin misin/i })
      .first()
      .click();
    await bitti;
    await page.reload();
    await expect(hesapSecimi.locator(`option[value="${k.hesapA}"]`)).toContainText('3.000,00');
    await expect(kalan).toContainText('5.000,00');

    await page.goto('/panel/cuzdan/transfer');
    await page.getByLabel('Nereden').selectOption(k.hesapA);
    await page.getByLabel('Nereye').selectOption(k.hesapB);
    await page.getByLabel('Tutar').fill('250,50');
    bitti = yazma();
    await page.getByRole('button', { name: 'Aktar' }).click();
    await bitti;
    await page.reload();
    await expect(page.getByLabel('Nereden').locator(`option[value="${k.hesapA}"]`)).toContainText(
      '2.749,50',
    );
    await expect(page.getByLabel('Nereden').locator(`option[value="${k.hesapB}"]`)).toContainText(
      '750,50',
    );
  } finally {
    await cuzdanSondaSil(onek);
  }
});
