import { expect, test, type Page } from '@playwright/test';

import {
  adminCredentials,
  findAdminUser,
  profilAnlik,
  profilGeriYukle,
  type ProfilAnlik,
} from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * PUBLIC TEK SAYFA ↔ PANEL PROFİLİ — uçtan uca.
 *
 * Panelde kaydedilen profil (tanıtım, konum, kısa tanıtım, sosyal bağlantılar)
 * ana sayfaya ANINDA yansıyor mu (ADR-011 önbellek + ADR-029 tam etiket)?
 * Bağlantı eklemek, yanlış platform adresini reddetmek, kaldırmak ve boş
 * profilde bağlantı bölümünün hiç çizilmemesi burada ölçülüyor.
 *
 * Profil TEKİL bir kayıt: test başında anlık görüntü alınıyor, sonunda geri
 * yükleniyor. Masaüstü ve mobil projeler aynı kaydı değiştirdiği için paket
 * seri koşuyor (`--workers=1` ile zaten sıralı).
 */
test.describe.configure({ mode: 'serial' });

let anlik: ProfilAnlik | null = null;

test.beforeAll(async () => {
  anlik = await profilAnlik();
});

test.afterAll(async () => {
  await profilGeriYukle(anlik);
});

async function panelOturumu(page: Page, baseURL: string | undefined): Promise<void> {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

/** Formdaki bütün bağlantı satırlarını kaldırır — temiz başlangıç. */
async function baglantilariTemizle(page: Page): Promise<void> {
  const kaldir = page.getByRole('button', { name: /bağlantısını kaldır$/ });
  while ((await kaldir.count()) > 0) await kaldir.first().click();
}

async function kaydet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Kaydedildi.', { exact: false })).toBeVisible();
}

test('panelde kaydedilen profil ana sayfada görünür; bağlantı ekle/doğrula/kaldır', async ({
  page,
  baseURL,
}, info) => {
  const iz = `E2E ${info.project.name}`;
  await panelOturumu(page, baseURL);
  await page.goto('/panel/icerik/profil');

  await page.getByLabel('Tanıtım satırı').fill(`${iz} — fotoğrafçı`);
  await page.getByLabel('Konum').fill('İstanbul');
  await page.getByLabel('Kısa tanıtım').fill('Kısa bir tanıtım metni.');
  await baglantilariTemizle(page);

  // Yanlış platform: Instagram alanına X adresi — alan altında reddedilir.
  await page
    .getByRole('group', { name: 'Bağlantı ekle' })
    .getByRole('button', { name: 'Instagram' })
    .click();
  await page.getByLabel('Instagram', { exact: true }).fill('https://x.com/ornek');
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Bu bir Instagram adresi değil', { exact: false })).toBeVisible();

  await page.getByLabel('Instagram', { exact: true }).fill('https://www.instagram.com/samet.ornek');
  await page
    .getByRole('group', { name: 'Bağlantı ekle' })
    .getByRole('button', { name: 'E-posta' })
    .click();
  await page.getByLabel('E-posta', { exact: true }).fill('mailto:Samet@Ornek.com');
  await kaydet(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Samet Şahin');
  await expect(page.getByText(`${iz} — fotoğrafçı`)).toBeVisible();
  await expect(page.getByText('İstanbul')).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Sosyal bağlantılar' });
  await expect(nav.getByRole('link')).toHaveCount(2);
  await expect(nav.getByRole('link', { name: /Instagram/ })).toHaveAttribute(
    'href',
    'https://www.instagram.com/samet.ornek',
  );
  await expect(nav.getByRole('link', { name: /E-posta/ })).toHaveAttribute(
    'href',
    'mailto:samet@ornek.com',
  );

  const tasma = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(tasma, 'ana sayfa yatay taşıyor').toBeLessThanOrEqual(0);

  // Kaldır → kaydet → bölüm hiç çizilmiyor.
  await page.goto('/panel/icerik/profil');
  await baglantilariTemizle(page);
  await page.getByLabel('Konum').fill('');
  await kaydet(page);

  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Sosyal bağlantılar' })).toHaveCount(0);
  await expect(page.getByText('İstanbul')).toHaveCount(0);
});
