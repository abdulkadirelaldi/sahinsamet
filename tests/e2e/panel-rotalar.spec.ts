import { expect, test } from '@playwright/test';

import { adminCredentials, findAdminUser, rotaSondaKur, rotaSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * BÜTÜN PANEL ROTALARI AÇILIYOR MU (2026-11-02). Birim testleri veritabanını taklit eder: seçilmemiş
 * sütun, yanlış sorgu, render sırasında fırlayan hata orada görünmez, canlıda 500 olur. Burada her
 * rota gerçek veritabanıyla açılır: durum, başlık, hata ekranı, tarayıcı hatası, yatay taşma.
 * Davranış testi değil; akışlar kendi spec'lerinde. Kaçınılan şey "sayfa hiç açılmıyor" hatası.
 */
test('her panel rotası hatasız açılır ve yatay taşmaz', async ({ page, baseURL }, info) => {
  test.setTimeout(300_000);
  const onek = `e2e-rota-${info.project.name}-`;
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
  const k = await rotaSondaKur(onek);

  const rotalar = [
    '/panel/ayarlar/bildirimler',
    '/panel/ayarlar/hatalar',
    '/panel/ayarlar/saglik-baglantisi',
    '/panel/ayarlar/sifre',
    `/panel/saglik/${k.saglik}`,
    `/panel/spor/oturum/${k.oturum}`,
    '/panel/cuzdan/ara',
    '/panel/cuzdan/arsiv',
    '/panel/cuzdan/rapor',
    '/panel/cuzdan/yeni',
    `/panel/cuzdan/hesap/${k.hesap}`,
    `/panel/cuzdan/akis/${k.akis}`,
    `/panel/spor/${k.antrenman}`,
    `/panel/spor/egzersizler/${k.egzersiz}`,
    '/panel/haftalik',
    '/panel/aylik',
    '/panel/ingilizce',
    '/panel/ingilizce/ders/gunluk-u1-d1',
    '/panel/spor/program',
    `/panel/spor/program/${k.programGunu}`,
    '/panel/spor/gelisim',
    `/panel/hayat/aliskanliklar/${k.aliskanlik}`,
    '/panel/hayat/hedefler',
    '/panel/hayat/hedefler/yeni',
    `/panel/hayat/hedefler/${k.hedef}`,
    '/panel/hayat/gunluk',
    '/panel/hayat/gunluk/yeni',
    `/panel/hayat/gunluk/${k.gunluk}`,
    '/panel/desenler',
    '/panel/icerik/profil',
  ];

  const hatalar: string[] = [];
  page.on('pageerror', (e) => hatalar.push(`${page.url()} → ${e.message}`));

  try {
    for (const rota of rotalar) {
      const yanit = await page.goto(rota, { waitUntil: 'domcontentloaded' });
      expect.soft(yanit?.status(), `${rota} durum`).toBeLessThan(400);
      await expect.soft(page.locator('h1').first(), `${rota} başlık`).toBeVisible();
      expect.soft(new URL(page.url()).pathname, `${rota} yönlendirme`).toMatch(/^\/panel/);
      await expect
        .soft(page.getByText('Bu ekran yüklenemedi'), `${rota} hata ekranı`)
        .toHaveCount(0);
      const tasma = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect.soft(tasma, `${rota} yatay taşma`).toBeLessThanOrEqual(0);
    }
    expect(hatalar).toEqual([]);
  } finally {
    await rotaSondaSil(onek);
  }
});

test('API uçları oturumsuz ve anahtarsız reddeder', async ({ request }) => {
  const olcum = await request.post('/api/v1/saglik/olcum', { data: {} });
  expect(olcum.status()).toBe(401);
  const disaAktar = await request.get('/api/v1/panel/disa-aktar?tur=cuzdan', { maxRedirects: 0 });
  expect(disaAktar.status()).toBe(401);
  const eklenti = await request.post('/api/v1/panel/eklenti', { data: {}, maxRedirects: 0 });
  expect(eklenti.status()).toBe(401);
  const dosya = await request.get('/api/v1/dosya/ckyokboylebirdosya000000001');
  expect(dosya.status()).toBe(404);
});
