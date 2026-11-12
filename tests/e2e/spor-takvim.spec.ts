import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser, sporSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * SPOR + TAKVİM (2026-11-12) — sahibinin bildirdiği iki sorun:
 *   1. "Sporda yeni hareket ekleyemiyorum": seçicilerde listede olmayan hareketi açma yolu
 *      yoktu; arşivdeki hareketin adı "zaten var" deyip hareketi göstermiyordu; hareketsiz
 *      bir günün oturumu ne hareket ekletiyor ne kapatılıyordu.
 *   2. "Spor programımı takvime ekleyemiyorum": program günü → haftalık takvim planı →
 *      takvimden "Antrenmana başla".
 *
 * İzler AD önekiyle silinir (`sporSondaSil`); tarih uzak bir haftada (2031), sahibinin
 * etkinlikleriyle karışmasın.
 *
 * ⚠️ OTURUM AÇAN adımlar YALNIZCA MASAÜSTÜNDE: "açık oturum" tek ve paylaşılan bir durum
 * (bugünün oturumu). İki proje paralel koşunca biri ötekinin boş oturumunu kapatırdı —
 * `auth.spec.ts`'in mobilde koşmamasıyla aynı gerekçe. Program, kütüphane ve takvim adımları
 * iki görünümde de koşuyor.
 */

const HAFTA = '2031-03-03'; // pazartesi

async function oturumAc(page: Page, baseURL: string | undefined) {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

/** İstemci formları hidrasyondan önce doldurulursa yazılan kaybolur: ağ dinginliği beklenir. */
async function git(page: Page, adres: string) {
  await page.goto(adres);
  await page.waitForLoadState('networkidle');
}

async function programGunuAc(page: Page, ad: string): Promise<string> {
  await git(page, '/panel/spor/program');
  await page.getByRole('textbox', { name: 'Gün adı' }).fill(ad);
  await page.getByRole('button', { name: 'Günü oluştur' }).click();
  await page.waitForURL(/\/panel\/spor\/program\/[a-z0-9]{20,}$/);
  await page.waitForLoadState('networkidle');
  return page.url();
}

async function yeniHareket(page: Page, ad: string) {
  await page.getByRole('button', { name: 'Listede yok mu? Yeni hareket ekle' }).click();
  const grup = page.getByRole('group', { name: 'Yeni hareket' });
  await grup.getByRole('textbox', { name: 'Yeni hareketin adı' }).fill(ad);
  await grup.getByRole('combobox', { name: 'Kas grubu' }).selectOption({ label: 'Göğüs' });
  await grup.getByRole('button', { name: 'Hareketi oluştur ve seç' }).click();
}

test('spor: listede olmayan hareket seçiciden açılır; arşivdeki ad geri alınır', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(120_000);
  const onek = `e2e-spor-${info.project.name}-${Date.now()}`;
  const hareket = `${onek} İncline Press`;
  await oturumAc(page, baseURL);

  try {
    await programGunuAc(page, `${onek} İtiş`);

    // Program gününe YENİ hareket: oluşturulur ve seçicide seçili gelir.
    await yeniHareket(page, hareket);
    await expect(page.getByRole('status').filter({ hasText: 'eklendi' })).toBeVisible();
    const secici = page.getByRole('combobox', { name: 'Hareket ekle' });
    await expect(secici.locator('option:checked')).toHaveText(hareket);
    await page.getByRole('button', { name: 'Programa ekle' }).click();
    await expect(page.getByText(hareket, { exact: true })).toBeVisible();

    // Kütüphanede arşivle.
    await git(page, `/panel/spor/egzersizler?q=${encodeURIComponent(onek)}`);
    await page.getByRole('button', { name: 'Arşivle' }).click();
    await page.getByRole('button', { name: 'Evet, arşivle' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'arşiv' }).first()).toBeVisible();

    // Aynı adı (BÜYÜK harfle) yeniden eklemek: "arşivde" der ve geri almayı önerir.
    await git(page, '/panel/spor/egzersizler/yeni');
    await page.getByRole('textbox', { name: 'Ad' }).fill(hareket.toLocaleUpperCase('tr'));
    await page.getByRole('button', { name: 'Ekle', exact: true }).click();
    await expect(page.getByText('arşivde', { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Arşivden çıkar ve aç' }).click();
    await page.waitForURL(/\/panel\/spor\/egzersizler\/[a-z0-9]{20,}$/);
    await expect(page.getByRole('heading', { name: hareket }).first()).toBeVisible();
    await expect(page.getByText('Bu hareket arşivde')).toHaveCount(0);
  } finally {
    await sporSondaSil(onek);
  }
});

/** Elle antrenman günü — proje başına ayrı, sahibinin günleriyle karışmasın. */
const ELLE_GUN: Record<string, string> = {
  'chromium-desktop': '2001-03-05',
  'mobile-chrome': '2001-03-06',
};

test('spor: elle antrenmanın set formundan yeni hareket açılır ve set girilir', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(120_000);
  const onek = `e2e-spor-elle-${info.project.name}-${Date.now()}`;
  const hareket = `${onek} Şınav`;
  await oturumAc(page, baseURL);

  try {
    await git(page, '/panel/spor/yeni');
    await page.getByLabel('Gün').fill(ELLE_GUN[info.project.name] ?? '2001-03-07');
    await page.getByRole('button', { name: 'Antrenmanı aç' }).click();
    await page.waitForURL(/\/panel\/spor\/[a-z0-9]{20,}$/);
    await page.waitForLoadState('networkidle');

    await yeniHareket(page, hareket);
    await expect(page.locator('#exerciseId option:checked')).toHaveText(hareket);
    await page.getByLabel('Tekrar').fill('12');
    await page.getByRole('button', { name: 'Seti ekle' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Set eklendi' })).toBeVisible();
    await expect(page.getByRole('heading', { name: hareket, level: 3 })).toBeVisible();
  } finally {
    await sporSondaSil(onek);
  }
});

test('spor → takvim: program günü haftalık plana döner, çiftlenmez, haftada görünür', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(150_000);
  const onek = `e2e-spor-${info.project.name}-${Date.now()}`;
  const gunAdi = `${onek} Push`;
  await oturumAc(page, baseURL);

  try {
    const gunAdresi = await programGunuAc(page, gunAdi);
    const bolum = page.locator('#takvim');

    await bolum.getByRole('button', { name: 'Takvime ekle' }).click();
    let form = page.getByRole('form', { name: 'Takvime ekle' });
    await form.getByRole('button', { name: 'Pazartesi' }).click();
    await form.getByRole('button', { name: 'Perşembe' }).click();
    await form.getByLabel('Başlangıç saati').fill('18:30');
    await form.getByLabel('Başlangıç tarihi').fill(HAFTA);
    await form.getByRole('button', { name: 'Takvime ekle' }).click();
    await expect(bolum.getByText('Pzt, Per · 18:30 · 1 saat 15 dk')).toBeVisible();

    // İkinci kez eklemek sessizce çiftlemez: mevcut planı düzenlemeyi önerir.
    await bolum.getByRole('button', { name: 'Takvime ekle' }).click();
    form = page.getByRole('form', { name: 'Takvime ekle' });
    await form.getByRole('button', { name: 'Salı' }).click();
    await form.getByRole('button', { name: 'Takvime ekle' }).click();
    await expect(form.getByRole('alert')).toContainText('zaten takvimde');
    await form.getByRole('button', { name: 'Mevcut planı düzenle' }).click();
    const duzenle = page.getByRole('form', { name: 'Takvim planını düzenle' });
    await duzenle.getByLabel('Başlangıç saati').fill('07:00');
    await duzenle.getByRole('button', { name: 'Planı kaydet' }).click();
    await expect(bolum.getByText('Pzt, Per · 07:00 · 1 saat 15 dk')).toBeVisible();
    await expect(bolum.getByRole('listitem')).toHaveCount(1);

    // Takvimin hafta görünümünde, Spor etkinliği olarak.
    await git(page, `/panel/takvim?gorunum=hafta&tarih=${HAFTA}`);
    const etkinlik = page.getByRole('button', { name: `${gunAdi}, 07:00 – 08:15` }).first();
    await expect(etkinlik).toBeVisible();
    await etkinlik.click();
    const detay = page.getByRole('dialog', { name: 'Etkinlik' });
    await expect(detay.getByText('Her hafta Pazartesi, Perşembe')).toBeVisible();
    await expect(detay.getByRole('button', { name: 'Antrenmana başla' })).toBeVisible();

    if (info.project.name === 'chromium-desktop') {
      // Hareketsiz gün: oturum çıkmaz değil — vazgeçilebilir…
      await detay.getByRole('button', { name: 'Antrenmana başla' }).click();
      await page.waitForURL(/\/panel\/spor\/oturum\/[a-z0-9]{20,}$/);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Bu günde henüz hareket yok' })).toBeVisible();
      await page.getByRole('button', { name: 'Antrenmandan vazgeç' }).click();
      await page.waitForURL(/\/panel\/spor$/);

      // …ya da antrenmanın içinden yeni hareket eklenir.
      await git(page, `/panel/takvim?gorunum=hafta&tarih=${HAFTA}`);
      await page
        .getByRole('button', { name: `${gunAdi}, 07:00 – 08:15` })
        .first()
        .click();
      await page
        .getByRole('dialog', { name: 'Etkinlik' })
        .getByRole('button', { name: 'Antrenmana başla' })
        .click();
      await page.waitForURL(/\/panel\/spor\/oturum\/[a-z0-9]{20,}$/);
      await page.waitForLoadState('networkidle');
      await yeniHareket(page, `${onek} Cable Fly`);
      await expect(page.getByText(`${onek} Cable Fly`, { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Antrenmanı bitir' })).toBeVisible();
    }

    // Plan program ekranından kaldırılır.
    await git(page, gunAdresi);
    await bolum.getByRole('button', { name: 'Takvimden kaldır' }).click();
    await bolum.getByRole('button', { name: 'Kaldırmak için tekrar dokun' }).click();
    await expect(bolum.getByText(/henüz takvimde değil/)).toBeVisible();
  } finally {
    await sporSondaSil(onek);
  }
});
