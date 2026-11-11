import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * ANDROID (2026-11-11) — sahibinin telefonu Poco X7 Pro (Android 15, HyperOS 2, Chrome, ~393 px).
 *
 * 1. Geri jesti: alt sayfa / pencere / çekmece açıkken Android'in geri hareketi onu KAPATIR,
 *    panelden önceki ekrana gitmez. `page.goBack()` aynı geçmiş geri adımı. Arayüzden kapatınca
 *    eklenen kayıt geri alınır: sonraki geri gerçekten önceki ekrana gider (geçmiş birikmez).
 * 2. Kısayol adresi `?yeni=1` takvimde "Yeni etkinlik" penceresini açar.
 * 3. Bildirim ayarları Android'de HyperOS yönergesini gösterir, iPhone'da göstermez.
 * 4. Chrome'un yükleme olayı gelince "Uygulamayı yükle" düğmesi çıkar, yüklenince kaybolur.
 * 5. 393 px'lik ekranda takvim yatay taşmaz.
 */
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';

async function oturumAc(page: Page, baseURL: string | undefined) {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

/** Kanca kaydı bir sonraki görevde ekler; geri adımından önce eklenmiş olmalı. */
async function kayitEklendi(page: Page) {
  await page.waitForFunction(
    () => (window.history.state as Record<string, unknown> | null)?.__sayfaAcik === true,
  );
}

/** Arayüzden kapatınca kanca kaydı geri alır; o adım bitmeden sonraki geri atılmasın. */
async function kayitSokuldu(page: Page) {
  await page.waitForFunction(
    () => (window.history.state as Record<string, unknown> | null)?.__sayfaAcik !== true,
  );
}

test.describe('Android geri hareketi', () => {
  test('hızlı ekleme: geri kapatır; arayüzden kapatınca geçmiş birikmez', async ({
    page,
    baseURL,
  }) => {
    await oturumAc(page, baseURL);
    await page.goto('/panel/ayarlar');
    await page.goto('/panel');

    await page.getByRole('button', { name: 'Hızlı kayıt' }).click();
    const sayfa = page.getByRole('dialog', { name: 'Hızlı ekle' });
    await expect(sayfa).toBeVisible();
    await kayitEklendi(page);
    await page.goBack();
    await expect(sayfa).toBeHidden();
    await expect(page).toHaveURL(/\/panel$/);

    // Yeniden aç, "Kapat" ile kapat: sonraki geri ayarlara döner (eklenen kayıt geri alındı).
    await page.getByRole('button', { name: 'Hızlı kayıt' }).click();
    await expect(sayfa).toBeVisible();
    await kayitEklendi(page);
    await sayfa.getByRole('button', { name: 'Kapat' }).click();
    await expect(sayfa).toBeHidden();
    await kayitSokuldu(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/ayarlar$/);
  });

  test('takvim: ?yeni=1 pencereyi açar, geri kapatır ve takvimde kalır', async ({
    page,
    baseURL,
  }) => {
    await oturumAc(page, baseURL);
    await page.goto('/panel');
    await page.goto('/panel/takvim?yeni=1');

    const pencere = page.getByRole('dialog', { name: 'Yeni etkinlik' });
    await expect(pencere).toBeVisible();
    // Parametre silinir: yenileme pencereyi yeniden açmaz.
    await expect(page).toHaveURL(/\/panel\/takvim$/);
    await kayitEklendi(page);
    await page.goBack();
    await expect(pencere).toBeHidden();
    await expect(page).toHaveURL(/\/panel\/takvim$/);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Takvim' }).first()).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('telefonda çekmece, masaüstünde takvim penceresi geri ile kapanır', async ({
    page,
    baseURL,
  }) => {
    await oturumAc(page, baseURL);
    await page.goto('/panel');
    await page.goto('/panel/takvim');
    const mobil = (page.viewportSize()?.width ?? 0) < 1024;

    const katman = mobil
      ? page.getByRole('dialog', { name: 'Panel menüsü' })
      : page.getByRole('dialog', { name: 'Yeni etkinlik' });
    await page
      .getByRole('button', mobil ? { name: 'Daha', exact: true } : { name: 'Yeni', exact: true })
      .click();
    await expect(katman).toBeVisible();
    await kayitEklendi(page);
    await page.goBack();
    await expect(katman).toBeHidden();
    await expect(page).toHaveURL(/\/panel\/takvim$/);
  });

  test('çekmece / kenar çubuğu bağlantısı geçmişe fazladan kayıt bırakmaz', async ({
    page,
    baseURL,
  }) => {
    await oturumAc(page, baseURL);
    await page.goto('/panel/takvim');
    await page.goto('/panel');
    const mobil = (page.viewportSize()?.width ?? 0) < 1024;

    if (mobil) {
      await page.getByRole('button', { name: 'Daha', exact: true }).click();
      await kayitEklendi(page);
    }
    await page
      .getByRole('navigation', { name: 'Panel menüsü' })
      .getByRole('link', { name: 'Ayarlar', exact: true })
      .click();
    await expect(page).toHaveURL(/\/panel\/ayarlar$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/panel$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/takvim$/);
  });
});

test.describe('bildirim ayarları · Android', () => {
  test.use({ userAgent: ANDROID_UA });

  test('HyperOS yönergesi görünür; yükleme olayı gelince düğme çıkar', async ({
    page,
    baseURL,
  }) => {
    await oturumAc(page, baseURL);
    await page.goto('/panel/ayarlar/bildirimler');
    await expect(page.getByRole('heading', { name: 'Android’de bildirim' })).toBeVisible();
    await expect(page.getByText('Kısıtlama yok')).toBeVisible();
    await expect(page.getByText('ana ekrana ekle')).toHaveCount(0);

    const dugme = page.getByRole('button', { name: 'Uygulamayı yükle' });
    await expect(dugme).toHaveCount(0);
    // Chrome'un `beforeinstallprompt`u: kabul edilen sahte istem.
    await expect(async () => {
      await page.evaluate(() => {
        const olay = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
          prompt: () => {
            (window as unknown as { istendi: boolean }).istendi = true;
            return Promise.resolve();
          },
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        });
        window.dispatchEvent(olay);
      });
      await expect(dugme).toBeVisible({ timeout: 500 });
    }).toPass();
    await dugme.click();
    await expect(dugme).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { istendi?: boolean }).istendi)).toBe(
      true,
    );
  });
});

test.describe('bildirim ayarları · iPhone', () => {
  test.use({ userAgent: IPHONE_UA });

  test('Android yönergesi gösterilmez', async ({ page, baseURL }) => {
    await oturumAc(page, baseURL);
    await page.goto('/panel/ayarlar/bildirimler');
    await expect(page.getByRole('switch', { name: /Takvim/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Android’de bildirim' })).toHaveCount(0);
  });
});

test.describe('393 px (Poco X7 Pro)', () => {
  test.use({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true });

  for (const gorunum of ['ay', 'hafta', 'gun', 'ajanda'] as const) {
    test(`takvim ${gorunum} görünümü yatay taşmaz`, async ({ page, baseURL }) => {
      await oturumAc(page, baseURL);
      await page.goto(`/panel/takvim?gorunum=${gorunum}&tarih=2031-03-12`);
      await expect(page.getByRole('navigation', { name: 'Görünüm' })).toBeVisible();
      const { kaydirma, genislik } = await page.evaluate(() => ({
        kaydirma: document.documentElement.scrollWidth,
        genislik: window.innerWidth,
      }));
      expect(kaydirma).toBeLessThanOrEqual(genislik);
    });
  }
});
