import { expect, test, type Page } from '@playwright/test';

import { alistirmaBul, dersBul, PARKURLAR } from '../../src/lib/ingilizce/mufredat';
import type { Alistirma } from '../../src/lib/ingilizce/tipler';

import { adminCredentials, findAdminUser, icerikHatasiSil, ingilizceSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * İNGİLİZCE DERSİ BAŞTAN SONA (2026-11-06): ilk ders gerçek tarayıcıda oynanır — her alıştırma
 * türü doğru cevaplanır, konuşma atlanır (tarayıcıda mikrofon yok), bitişte XP sunucudan gelir.
 * Cevaplar müfredattan okunur: içerik değişse de test aynı kalır.
 */
const DERS = 'gunluk-u1-d1';
const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function cevapla(page: Page, a: Alistirma): Promise<void> {
  switch (a.tur) {
    case 'bosluk':
    case 'secmeli':
      await page
        .getByRole('radio', { name: new RegExp(`(^|\\) )${kacis(a.secenekler[a.dogru]!)}$`) })
        .click();
      await page.getByRole('button', { name: 'Kontrol et' }).click();
      return;
    case 'dinle': {
      const { kelimeler } = await import('../../src/lib/ingilizce/degerlendir');
      const kutular = page.getByRole('group', { name: 'Kelimeler' });
      for (const k of kelimeler(a.cumle)) {
        await kutular
          .getByRole('button', { name: k, exact: true })
          .and(page.locator(':enabled'))
          .first()
          .click();
      }
      await page.getByRole('button', { name: 'Kontrol et' }).click();
      return;
    }
    case 'yaz':
      await page.getByLabel('İngilizce çeviri').fill(a.cevaplar[0]!);
      await page.getByRole('button', { name: 'Kontrol et' }).click();
      return;
    case 'eslestir':
      for (const [en, tr] of a.ciftler) {
        await page
          .getByRole('group', { name: 'İngilizce' })
          .getByRole('button', { name: en, exact: true })
          .click();
        await page
          .getByRole('group', { name: 'Türkçe' })
          .getByRole('button', { name: tr, exact: true })
          .click();
      }
      return;
    case 'konus':
      await page.getByRole('button', { name: 'Şu an konuşamıyorum' }).click();
      return;
  }
}

test('ilk ders oynanır, XP kaydedilir', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const baslangic = new Date();
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
  const ders = dersBul(DERS)!.ders;

  try {
    await page.goto('/panel/ingilizce');
    // Ders yolu: ilk ders açık; sırada değilse (önceden oynandıysa) yine bağlantı olarak görünür.
    await expect(
      page.getByRole('link', { name: new RegExp(kacis(dersBul(DERS)!.ders.baslik)) }),
    ).toBeVisible();
    await page.goto(`/panel/ingilizce/ders/${DERS}`);
    await page.getByRole('button', { name: /Derse başla/ }).click();

    let bildirildi = false;
    for (let tur = 0; tur < ders.alistirmalar.length * 2; tur += 1) {
      if (await page.getByRole('heading', { name: 'Ders bitti!' }).isVisible()) break;
      const id = await page.locator('[data-alistirma]').getAttribute('data-alistirma');
      const a = ders.alistirmalar.find((x) => x.id === id)!;
      await cevapla(page, a);
      if (a.tur === 'konus') continue;
      const devam = page.getByRole('button', { name: 'Devam' });
      await expect(devam).toBeVisible();
      if (a.tur !== 'eslestir')
        await expect(page.getByRole('status')).toContainText(/Harika|Neredeyse/);
      if (!bildirildi) {
        bildirildi = true;
        // İlk geri bildirimde içerik hatası bildirimi: not yazılır, gönderilir, ders sürer.
        await page.getByRole('button', { name: 'Bu soruda hata var' }).click();
        await page.getByLabel('Hata notu').fill('e2e deneme bildirimi');
        await page.getByRole('button', { name: 'Gönder' }).click();
        await expect(page.getByText('Teşekkürler, bildirim kaydedildi.')).toBeVisible();
      }
      await devam.click();
    }

    await expect(page.getByRole('heading', { name: 'Ders bitti!' })).toBeVisible();
    await expect(page.getByText(/^\+\d+$/)).toBeVisible();
    await expect(page.getByText('Günlük hedef')).toBeVisible();
  } finally {
    await ingilizceSondaSil(DERS, baslangic);
    await icerikHatasiSil(DERS, baslangic);
  }
});

test('atlama sınavı: 2. ünite geçilince ilk iki ünitenin dersleri açılır', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const baslangic = new Date();
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
  const [u1, u2] = PARKURLAR[0]!.uniteler;
  const kimlikler = [`atla-${u2!.id}`, ...[u1!, u2!].flatMap((u) => u.dersler.map((d) => d.id))];

  try {
    await page.goto(`/panel/ingilizce/ders/atla-${u2!.id}`);
    await page.getByRole('button', { name: /Derse başla/ }).click();
    for (let tur = 0; tur < 20; tur += 1) {
      if (
        await page
          .getByRole('heading', { name: /Sınavı geçtin|Bu sefer olmadı|Sınav bitti/ })
          .isVisible()
      )
        break;
      const id = await page.locator('[data-alistirma]').getAttribute('data-alistirma');
      await cevapla(page, alistirmaBul(id!)!);
      await page.getByRole('button', { name: 'Devam' }).click();
    }
    await expect(page.getByRole('heading', { name: 'Sınavı geçtin!' })).toBeVisible();
    await expect(page.getByText(/ders açıldı/)).toBeVisible();

    // 2. ünitenin son dersi artık açık: bağlantı olarak görünür.
    await page.goto('/panel/ingilizce?parkur=gunluk');
    await expect(
      page.getByRole('link', { name: new RegExp(kacis(u2!.dersler.at(-1)!.baslik)) }),
    ).toBeVisible();
  } finally {
    await ingilizceSondaSil(kimlikler, baslangic);
  }
});
