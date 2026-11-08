import { expect, test, type Page } from '@playwright/test';

import { gunAyYil } from '../../src/components/panel/hayat-bicim';

import { adminCredentials, findAdminUser, kisiselSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * F5 — KİŞİSEL MODÜLLER (§4.2 sağlık, spor, hayat) UÇTAN UCA · T-116.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ÖLÇÜLÜYOR — ARAYÜZE ÖZGÜ MEKANİZMALAR, SERVİS KURALLARI DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Servis kuralları (seri, PR, "ulaşıldı ⇔ %100") birim testlerinde. Burada
 * yalnızca ARAYÜZÜN kendi ürettiği ve birim testinin göremediği şeyler:
 *
 *   1. Virgüllü ondalık (`82,5`) sunucuya NOKTALI gidiyor ve geri okunuyor
 *      (`ONDALIK_YA_DA_YOK`) — çevrilmeseydi biçim hatası.
 *   2. Günde tek kayıt CONFLICT'i formda "o günün kaydını düzenle"
 *      BAĞLANTISINA dönüşüyor (`fields.existingId` kabuğun basmadığı alan).
 *   3. Antrenman silmek, ona dayanan rekoru REKOR LİSTESİNDEN düşürüyor —
 *      cascade + yeniden hesap zinciri GERÇEK veritabanıyla (birim testleri
 *      sahte istemciyle koşuyor; BULGU-025 tam bu boşluktan çıkmıştı).
 *   4. Alışkanlık hücresi `aria-pressed` ile işaretleniyor ve YENİLEMEDEN
 *      SONRA da işaretli (iyimser güncelleme değil, kalıcı yazma).
 *   5. Sayfalar yatay taşmıyor.
 *
 * ⚠️ PAYLAŞILAN DB: kayıtlar GEÇMİŞ ve sabit bir güne (2001) yazılıyor ve
 * testin SONUNDA arayüzden siliniyor. Egzersiz ve alışkanlık SİLİNEMEZ
 * (tasarım gereği) — benzersiz adla açılıp sonda ARŞİVLENİYOR.
 */

/*
 * ⚠️ PROJE BAŞINA AYRI GÜN VE ÖNEK. Masaüstü ve mobil projeler paralel
 * koşabiliyor; ortak bir gün, birinin `afterAll`unun ötekinin kaydını
 * test ortasında silmesi demekti. Dosya içinde de SERİ (aşağıda): yerelde
 * `fullyParallel` açık ve her işçinin kendi `afterAll`u var.
 */
const PROJE_GUNU: Record<string, string> = {
  'chromium-desktop': '2001-02-03',
  'mobile-chrome': '2001-02-04',
};
const testGunu = (projeAdi: string): string => PROJE_GUNU[projeAdi] ?? '2001-02-05';

test.describe.configure({ mode: 'serial' });

/** Egzersiz/alışkanlık adlarının öneki — `e2eKalintisi` sözleşmesi (`e2e`/`E2E`). */
const onek = (projeAdi: string): string => `E2E ${projeAdi} `;

/*
 * Arayüzden SİLİNEMEYEN izler (egzersiz, alışkanlık) burada gerçekten
 * siliniyor; test gövdesindeki arşivleme adımları arayüzü sınamak için.
 * `afterAll`: bir test yarıda düşse de iz kalmaz.
 */
test.afterAll(async ({}, testInfo) => {
  await kisiselSondaSil(onek(testInfo.project.name), testGunu(testInfo.project.name));
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

async function yatayTasmaYok(page: Page): Promise<void> {
  const tasma = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(tasma, 'sayfa yatayda taşıyor').toBeLessThanOrEqual(0);
}

test.describe('F5 · sağlık', () => {
  test('virgüllü ölçü kaydediliyor, aynı gün çakışması düzenlemeye götürüyor', async ({
    page,
    baseURL,
  }, testInfo) => {
    await panelOturumu(page, baseURL);

    /* ---- Önkoşul: önceki yarım kalmış koşudan kalan kayıt varsa temizle -- */
    await page.goto('/panel/saglik/yeni');
    await page.getByLabel('Gün').fill(testGunu(testInfo.project.name));
    await page.getByLabel('Kilo (kg)').fill('82,5');
    await page.getByLabel('Uyku (saat)').fill('7,5');
    await page.getByRole('button', { name: 'Ekle' }).click();

    const cakisma = page.getByRole('link', { name: 'O günün kaydını düzenle' });
    const liste = page.waitForURL(/\/panel\/saglik$/);

    if (await cakisma.isVisible().catch(() => false)) {
      // Önceki koşudan kalmış — doğrudan o kaydı aç.
      await cakisma.click();
    } else {
      await liste;
      /* ---- (2) aynı güne ikinci kayıt → bağlantı -------------------- */
      await page.goto('/panel/saglik/yeni');
      await page.getByLabel('Gün').fill(testGunu(testInfo.project.name));
      await page.getByLabel('Kilo (kg)').fill('80');
      await page.getByRole('button', { name: 'Ekle' }).click();
      await expect(cakisma, 'CONFLICT bağlantıya dönüşmeli').toBeVisible();
      await cakisma.click();
    }

    /* ---- (1) değer NOKTALI kaydedilip VİRGÜLLÜ geri okunuyor ---------- */
    await expect(page).toHaveURL(/\/panel\/saglik\/[a-z0-9]+$/);
    await expect(
      page.getByRole('heading', { name: `${gunAyYil(testGunu(testInfo.project.name))} kaydı` }),
    ).toBeVisible();
    await expect(page.getByLabel('Kilo (kg)')).toHaveValue('82,50');
    await expect(page.getByLabel('Uyku (saat)')).toHaveValue('7,50');

    /*
     * BOŞALTMAK SİLİYOR — kısmi şema "temizle" diyemiyordu ve boşaltılan
     * değer sessizce kalıyordu. Kilo boşaltılıp kaydediliyor; yenilemeden
     * sonra BOŞ, dokunulmayan uyku YERİNDE olmalı.
     */
    await page.getByLabel('Kilo (kg)').fill('');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Kaydedildi' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Kilo (kg)')).toHaveValue('');
    await expect(page.getByLabel('Uyku (saat)')).toHaveValue('7,50');

    /* ---- Temizlik: arayüzden sil ------------------------------------ */
    await page.getByRole('button', { name: 'Sil' }).click();
    await page.getByRole('button', { name: 'Evet, sil' }).click();
    await page.waitForURL(/\/panel\/saglik$/);
  });

  test('sağlık sayfası dört trend grafiği çiziyor ve taşmıyor', async ({ page, baseURL }) => {
    await panelOturumu(page, baseURL);
    await page.goto('/panel/saglik');

    for (const ad of ['Kilo', 'Uyku', 'Dinlenik nabız', 'Adım']) {
      await expect(page.locator('figcaption', { hasText: ad }).first()).toBeVisible();
    }
    await yatayTasmaYok(page);
  });
});

/** Koşu başına benzersiz ad — paralel projeler (masaüstü/mobil) çakışmasın. */
const benzersiz = (tur: string, testInfo: { project: { name: string } }): string =>
  `${onek(testInfo.project.name)}${tur} ${Date.now()}`;

test.describe('F5 · spor', () => {
  test('set rekor üretiyor, antrenmanı silmek rekoru düşürüyor', async ({
    page,
    baseURL,
  }, testInfo) => {
    await panelOturumu(page, baseURL);
    const hareket = benzersiz('Hareket', testInfo);

    /* ---- Egzersiz aç ------------------------------------------------- */
    await page.goto('/panel/spor/egzersizler/yeni');
    await page.getByLabel('Ad').fill(hareket);
    await page.getByLabel('Kas grubu').selectOption({ label: 'Göğüs' });
    await page.getByRole('button', { name: 'Ekle' }).click();
    await page.waitForURL(/\/panel\/spor\/egzersizler$/);

    /* ---- Antrenman aç → detaya düşmeli ------------------------------- */
    await page.goto('/panel/spor/yeni');
    await page.getByLabel('Gün').fill(testGunu(testInfo.project.name));
    await page.getByRole('button', { name: 'Antrenmanı aç' }).click();
    await page.waitForURL(/\/panel\/spor\/[a-z0-9]{20,}$/);
    const antrenmanAdresi = page.url();

    /* ---- Set ekle: virgüllü ağırlık + rekor bildirimi ---------------- */
    const secenek = page.locator('#exerciseId option', { hasText: hareket });
    await page.locator('#exerciseId').selectOption((await secenek.getAttribute('value')) ?? '');
    await page.getByLabel('Tekrar').fill('5');
    await page.getByLabel('Ağırlık (kg)').fill('100,5');
    await page.getByRole('button', { name: 'Seti ekle' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Set eklendi' })).toContainText(
      '1 rekor yazıldı',
    );

    /* ---- (3) rekor listede ------------------------------------------- */
    await page.goto('/panel/spor/rekorlar');
    const rekorSatiri = page.getByRole('row').filter({ hasText: hareket });
    await expect(rekorSatiri).toContainText('100,5');

    /* ---- Antrenmanı sil → rekor düşmeli ------------------------------ */
    await page.goto(antrenmanAdresi);
    await page.getByRole('button', { name: 'Sil', exact: true }).click();
    await page.getByRole('button', { name: 'Evet, sil' }).click();
    // 2026-10-30: silme sonrası eski liste `/panel/spor/gecmis`te.
    await page.waitForURL(/\/panel\/spor\/gecmis$/);

    await page.goto('/panel/spor/rekorlar');
    await expect(page.getByRole('row').filter({ hasText: hareket })).toHaveCount(0);

    /* ---- Temizlik: egzersizi arşivle (silinemez — Restrict FK) ------- */
    await page.goto(`/panel/spor/egzersizler?q=${encodeURIComponent(hareket)}`);
    await page.getByRole('button', { name: 'Arşivle' }).click();
    await page.getByRole('button', { name: 'Evet, arşivle' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'arşiv' }).first()).toBeVisible();

    await yatayTasmaYok(page);
  });
});

test.describe('F5 · hayat', () => {
  test('alışkanlık hücresi işaretleniyor ve yenilemeden sonra kalıcı', async ({
    page,
    baseURL,
  }, testInfo) => {
    await panelOturumu(page, baseURL);
    const ad = benzersiz('Alışkanlık', testInfo);

    await page.goto('/panel/hayat/aliskanliklar/yeni');
    await page.getByLabel('Ad').fill(ad);
    await page.getByRole('button', { name: 'Ekle' }).click();
    await page.waitForURL(/\/panel\/hayat\/aliskanliklar$/);

    /*
     * 2026-10-29 — günlük liste: her alışkanlıkta "yaptım" (✓) ve "yapmadım"
     * (✗) düğmeleri, `aria-pressed` ile. Önce "yaptım" kalıcı mı, sonra
     * "yapmadım" ona geçiyor mu (ikisi aynı anda doğru olamaz), sonra temizle.
     */
    await page.goto('/panel/hayat');
    const yaptim = page.getByRole('button', { name: `${ad}: yaptım`, exact: true });
    const yapmadim = page.getByRole('button', { name: `${ad}: yapmadım`, exact: true });

    /* Tık + yazmanın BİTMESİ (düğme yeniden etkin) — iyimser hâl yetmez. */
    const dokun = async (dugme: typeof yaptim) => {
      await dugme.click();
      await expect(dugme).toBeEnabled();
    };

    await expect(yaptim).toHaveAttribute('aria-pressed', 'false');
    await dokun(yaptim);
    await expect(yaptim).toHaveAttribute('aria-pressed', 'true');

    /* (4) iyimser değil, KALICI */
    await page.reload();
    await expect(yaptim).toHaveAttribute('aria-pressed', 'true');

    /* "Yapmadım" "yaptım"ı KALDIRIR ve o da kalıcı */
    await dokun(yapmadim);
    await page.reload();
    await expect(yapmadim).toHaveAttribute('aria-pressed', 'true');
    await expect(yaptim).toHaveAttribute('aria-pressed', 'false');

    /* Yeniden dokunmak işareti temizler */
    await dokun(yapmadim);
    await page.reload();
    await expect(yapmadim).toHaveAttribute('aria-pressed', 'false');
    await yatayTasmaYok(page);

    /* Temizlik: arşivle (silinemez — `HabitLog` cascade geçmişi götürürdü) */
    await page.goto('/panel/hayat/aliskanliklar');
    await page.getByRole('link', { name: ad }).first().click();
    await page.waitForURL(/\/panel\/hayat\/aliskanliklar\/[a-z0-9]{20,}$/);
    await page.getByRole('button', { name: 'Arşivle' }).click();
    await page.getByRole('button', { name: 'Evet, arşivle' }).click();
    await expect(page.getByRole('button', { name: 'Arşivle' })).toHaveCount(0);
  });
});
