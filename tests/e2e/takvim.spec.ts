import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser, takvimSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * TAKVİM BAŞTAN SONA (2026-11-10): gerçek veritabanı ve tarayıcıda oluştur → ay ve hafta
 * görünümünde gör → düzenle → sil; tekrarlayan etkinlikte "yalnızca bu" düzenlemesi ve "tüm
 * etkinlikler" silmesi. Tarih uzak aylarda (2031): sahibinin gerçek etkinlikleriyle
 * karışmasın. İzler başlık önekiyle silinir; masaüstü ve mobil projeler ayrı önek kullanır.
 */
const GUN = '2031-03-12'; // çarşamba
/** Tekrarlayan test başka ayda: her gün tekrarı ilk testin ay hücresini doldurmasın (paralel koşu). */
const SERI_GUNU = '2031-05-14'; // çarşamba
const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const etkinlik = (page: Page, baslik: string) =>
  page.getByRole('button', { name: new RegExp(`^${kacis(baslik)},`) });

async function oturumAc(page: Page, baseURL: string | undefined) {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

async function kaydetVeKapat(page: Page) {
  const pencere = page.getByRole('dialog');
  await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(pencere).toBeHidden();
}

test('takvim: etkinlik oluşturulur, ay ve haftada görünür, düzenlenir ve silinir', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(90_000);
  const onek = `e2e-takvim-${info.project.name}-${Date.now()}`;
  const baslik = `${onek} Diş hekimi`;
  await oturumAc(page, baseURL);

  try {
    await page.goto(`/panel/takvim?gorunum=ay&tarih=${GUN}`);
    await expect(page.getByRole('heading', { name: 'Mart 2031' })).toBeVisible();

    await page.getByRole('button', { name: 'Yeni', exact: true }).click();
    const pencere = page.getByRole('dialog', { name: 'Yeni etkinlik' });
    await expect(pencere).toBeVisible();
    await expect(pencere.getByRole('textbox', { name: 'Başlık', exact: true })).toBeFocused();
    await pencere.getByRole('textbox', { name: 'Başlık', exact: true }).fill(baslik);
    await pencere.getByLabel('Başlangıç saati').fill('14:30');
    // Süre korunur: bitiş bir saat sonra.
    await expect(pencere.getByLabel('Bitiş saati')).toHaveValue('15:30');
    await pencere.getByRole('radio', { name: 'Sağlık / Doktor' }).click();
    await pencere.getByLabel('Konum').fill('Kadıköy');
    await expect(pencere.getByText('30 dk önce')).toBeVisible();
    await kaydetVeKapat(page);

    // Ay görünümünde o günün hücresinde.
    await expect(
      page.locator(`[data-gun="${GUN}"]`).getByRole('button', { name: new RegExp(kacis(baslik)) }),
    ).toBeVisible();

    // Hafta görünümünde saatiyle.
    await page.getByRole('link', { name: 'Hafta', exact: true }).click();
    await expect(page.getByRole('heading', { name: '10 – 16 Mart 2031' })).toBeVisible();
    await expect(page.getByRole('button', { name: `${baslik}, 14:30 – 15:30` })).toBeVisible();

    // Düzenle: başlık ve saat.
    await etkinlik(page, baslik).click();
    const detay = page.getByRole('dialog', { name: 'Etkinlik' });
    await expect(detay.getByText('Kadıköy')).toBeVisible();
    await detay.getByRole('button', { name: 'Düzenle' }).click();
    const duzenle = page.getByRole('dialog', { name: 'Etkinliği düzenle' });
    await duzenle
      .getByRole('textbox', { name: 'Başlık', exact: true })
      .fill(`${baslik} (ertelendi)`);
    await duzenle.getByLabel('Başlangıç saati').fill('16:00');
    await kaydetVeKapat(page);
    await expect(
      page.getByRole('button', { name: `${baslik} (ertelendi), 16:00 – 17:00` }),
    ).toBeVisible();

    // Sil — tarayıcı onayı değil, pencerenin içinde.
    await etkinlik(page, `${baslik} (ertelendi)`).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sil', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Evet, sil' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(etkinlik(page, `${baslik} (ertelendi)`)).toHaveCount(0);
  } finally {
    await takvimSondaSil(onek);
  }
});

test('takvim: tekrarlayan etkinlikte yalnızca bu oluşum düzenlenir, sonra seri silinir', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(90_000);
  const onek = `e2e-takvimt-${info.project.name}-${Date.now()}`;
  const baslik = `${onek} Koşu`;
  await oturumAc(page, baseURL);

  try {
    await page.goto(`/panel/takvim?gorunum=hafta&tarih=${SERI_GUNU}`);
    await page.getByRole('button', { name: 'Yeni', exact: true }).click();
    const pencere = page.getByRole('dialog', { name: 'Yeni etkinlik' });
    await pencere.getByRole('textbox', { name: 'Başlık', exact: true }).fill(baslik);
    await pencere.getByLabel('Başlangıç saati').fill('07:00');
    await pencere.getByLabel('Tekrar', { exact: true }).selectOption('GUNLUK');
    await pencere.getByRole('radio', { name: 'Spor' }).click();
    await kaydetVeKapat(page);

    // Çarşambadan pazara beş oluşum.
    await expect(etkinlik(page, baslik)).toHaveCount(5);

    // Perşembe — yalnızca bu.
    await page.goto(`/panel/takvim?gorunum=gun&tarih=2031-05-15`);
    await etkinlik(page, baslik).click();
    await expect(page.getByRole('dialog').getByText('Her gün')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Düzenle' }).click();
    const duzenle = page.getByRole('dialog', { name: 'Etkinliği düzenle' });
    await duzenle.getByRole('textbox', { name: 'Başlık', exact: true }).fill(`${onek} Uzun koşu`);
    await duzenle.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(duzenle.getByRole('radio', { name: 'Yalnızca bu etkinlik' })).toBeChecked();
    await kaydetVeKapat(page);
    await expect(etkinlik(page, `${onek} Uzun koşu`)).toHaveCount(1);
    await expect(etkinlik(page, baslik)).toHaveCount(0);

    await page.goto(`/panel/takvim?gorunum=hafta&tarih=${SERI_GUNU}`);
    await expect(etkinlik(page, baslik)).toHaveCount(4);
    await expect(etkinlik(page, `${onek} Uzun koşu`)).toHaveCount(1);

    // Ajanda da aynı şeyi söyler.
    await page.goto(`/panel/takvim?gorunum=ajanda&tarih=${SERI_GUNU}`);
    await expect(page.getByRole('heading', { name: 'Perşembe, 15 Mayıs' })).toBeVisible();

    // Tüm etkinlikler: seri ve "yalnızca bu" kopyası birlikte gider.
    await page.goto(`/panel/takvim?gorunum=hafta&tarih=${SERI_GUNU}`);
    await etkinlik(page, baslik).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sil', exact: true }).click();
    await page.getByRole('dialog').getByRole('radio', { name: 'Tüm etkinlikler' }).check();
    await page.getByRole('dialog').getByRole('button', { name: 'Sil', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(etkinlik(page, baslik)).toHaveCount(0);
    await expect(etkinlik(page, `${onek} Uzun koşu`)).toHaveCount(0);
  } finally {
    await takvimSondaSil(onek);
  }
});
