import { expect, test, type Page } from '@playwright/test';

// Göreli yol — gerekçe: `_helpers/db.ts` başındaki not.
import { AUTH_ERROR_MESSAGES } from '../../src/components/auth/auth-errors';
import { TWO_FACTOR_SETUP_PATH } from '../../src/lib/security/two-factor';

import {
  adminCredentials,
  clearLock,
  clearLoginAttempts,
  enableTwoFactor,
  findAdminUser,
  isAccountLocked,
  remainingBackupCodeCount,
  resetAuthState,
  TEST_BACKUP_CODES,
} from './_helpers/db';
import { applySessionCookie } from './_helpers/session';
import { generateTotp, waitForSafeTotpWindow } from './_helpers/totp';

/** `playwright.config.ts` ile aynı — oturum çerezinin alan adı buradan gelir. */
const BASE_URL = `http://127.0.0.1:${process.env.E2E_PORT ?? 3100}`;

/**
 * §9 senaryo 3 — "Yanlış şifreyle giriş başarısız, doğru şifre + 2FA ile başarılı".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU DOSYANIN ASIL DEĞERİ: `code` REGRESYON BOŞLUĞU (T-013c / T2)
 *
 * `src/server/auth.ts` Vitest'in node ortamında import EDİLEMİYOR, dolayısıyla
 * `class CredentialsError extends CredentialsSignin` davranışı birim testiyle
 * sabitlenemiyor. Biri sınıfı tekrar sade `Error`'a çevirirse:
 *   - `pnpm test` yeşil kalır
 *   - `pnpm typecheck` yeşil kalır
 *   - Auth.js hata kodunu istemciye TAŞIMAZ, `code` tanımsız olur
 *   - Arayüz her hatada genel mesaja düşer; 2FA adımına HİÇ geçilemez
 * Yani giriş akışı sessizce bozulur ve yalnızca üretimde anlaşılır.
 *
 * E2E bu boşluğu kapatan TEK katmandır: aşağıdaki testler dört kodun da
 * istemciye ulaştığını, gözlenebilir davranış üzerinden sabitler.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * VERİTABANI GEREKTİRİR. Yoksa paket atlanır — ama atlama GÖRÜNÜRDÜR
 * (`globalSetup` uyarı basar), sessizce yeşile dönmez.
 */

test.describe.configure({ mode: 'serial' });

test.skip(
  () => !process.env.E2E_DB_READY,
  'Veritabanı hazır değil — "pnpm db:up && pnpm db:seed" sonrası koşar.',
);

/**
 * Hata kutusu seçicisi — T-018b uyarısı.
 *
 * Yalnız `[role=alert]` KULLANILMAZ: Next'in `__next-route-announcer__` öğesi de
 * `role="alert"` taşır ve seçici iki öğeye birden eşleşir. Doğrulama adımında
 * kutu `<form>`'un DIŞINDA kaldığı için `main` kökü alınır.
 */
function errorAlert(page: Page) {
  return page.locator('main [role=alert]');
}

async function fillCredentials(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel('E-posta').fill(email);
  await page.getByLabel('Şifre').fill(password);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
}

/** 2FA adımına geçildiğinin işareti: kod alanı görünür olur. */
function totpField(page: Page) {
  return page.getByLabel('Doğrulama kodu');
}

/**
 * Kancalar `test.skip()` ile SUSTURULMAZ — Playwright `afterAll`'ı testler
 * atlansa bile çalıştırır ve hatasını son teste yazar.
 *
 * ÖLÇÜLDÜ: veritabanı kapalıyken 11 test "skipped", 12.'si "failed" oldu;
 * başarısız olan test değil, `afterAll` içindeki `resetAuthState()` idi. CI'da
 * (`.env` ve DB yok — §8.17) bu, atlanması gereken paketin tüm hattı
 * düşürmesi demekti. Bu yüzden her kanca koşulu KENDİSİ kontrol eder.
 */
const dbHazir = (): boolean => Boolean(process.env.E2E_DB_READY);

test.beforeEach(async () => {
  if (!dbHazir()) return;
  // Her test kendi sayacıyla başlar; §8.4 penceresi testler arasında taşmasın.
  await clearLoginAttempts();
  await clearLock();
});

test.afterAll(async () => {
  if (!dbHazir()) return;
  await resetAuthState();
});

// ---------------------------------------------------------------------------
// §9/3 — birinci yarı: 2FA KAPALIYKEN
// ---------------------------------------------------------------------------

test.describe('§9/3 — kimlik doğrulama (2FA kapalı)', () => {
  test.beforeEach(async () => {
    await resetAuthState();
  });

  test('yanlış şifre reddedilir — INVALID_CREDENTIALS istemciye ulaşıyor', async ({ page }) => {
    const { email } = adminCredentials();
    await page.goto('/giris');

    await fillCredentials(page, email, 'kesinlikle-yanlis-sifre');

    // Metin ELLE YAZILMIYOR: Frontend'in sözleşme sabiti import ediliyor.
    await expect(errorAlert(page)).toHaveText(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    await expect(page).toHaveURL(/\/giris/);
  });

  /**
   * §8 kullanıcı numaralandırma koruması: var olmayan e-posta ile yanlış şifre
   * AYNI mesajı vermeli. Farklı olsaydı hangi adreslerin kayıtlı olduğu
   * öğrenilebilirdi.
   */
  test('var olmayan e-posta aynı mesajı verir — numaralandırma sızmıyor', async ({ page }) => {
    await page.goto('/giris');

    await fillCredentials(page, 'bulunmayan@ornek.test', 'herhangi-bir-sifre');

    await expect(errorAlert(page)).toHaveText(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
  });

  /**
   * BEKLENTİ T-019b'DE DEĞİŞTİ — §8.1 kapısı artık üretimde tetikleniyor.
   *
   * T-019'a kadar bu test `/panel`'e varmayı bekliyordu ve doğruydu: 2FA
   * zorunluluğu henüz uygulanmıyordu. Artık `tfa: false` taşıyan jeton panele
   * giremiyor, kuruluma düşüyor.
   *
   * `/\/panel/` yerine TAM YOL karşılaştırılıyor: kurulum ekranı da
   * `/panel/ayarlar/guvenlik` olduğu için gevşek desen İKİSİNE DE uyar ve test
   * yanlış yere varsa bile yeşil kalırdı.
   */
  test('doğru şifre — 2FA kurulu değilken kuruluma düşer', async ({ page }) => {
    const { email, password } = adminCredentials();
    await page.goto('/giris');

    await fillCredentials(page, email, password);

    await expect(page).toHaveURL(new RegExp(`${TWO_FACTOR_SETUP_PATH}$`));
  });
});

// ---------------------------------------------------------------------------
// §9/3 — ikinci yarı: 2FA AÇIKKEN
// ---------------------------------------------------------------------------

test.describe('§9/3 — iki adımlı doğrulama', () => {
  let secret: string;

  test.beforeEach(async () => {
    await resetAuthState();
    ({ secret } = await enableTwoFactor());
  });

  /**
   * REGRESYON KİLİDİ — `TOTP_REQUIRED`.
   *
   * Bu kod istemciye ulaşmazsa arayüz ikinci adıma GEÇEMEZ: doğru şifreyi giren
   * kullanıcı genel bir hata görür ve panele hiçbir zaman giremez.
   * `extends CredentialsSignin` kaldırılırsa BU TEST KIRILIR.
   */
  test('doğru şifre → 2FA adımı (TOTP_REQUIRED istemciye ulaşıyor)', async ({ page }) => {
    const { email, password } = adminCredentials();
    await page.goto('/giris');

    await fillCredentials(page, email, password);

    await expect(totpField(page)).toBeVisible();
    // `TOTP_REQUIRED` bir hata DEĞİL, adım sinyalidir — kutu görünmemeli.
    await expect(errorAlert(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/giris/);
  });

  test('doğru TOTP kodu → /panel', async ({ page }) => {
    const { email, password } = adminCredentials();
    await page.goto('/giris');
    await fillCredentials(page, email, password);
    await expect(totpField(page)).toBeVisible();

    // Kod periyot sonuna denk gelirse gönderilene kadar geçersizleşebilir.
    await waitForSafeTotpWindow();
    await totpField(page).fill(generateTotp(secret));
    await page.getByRole('button', { name: 'Doğrula ve gir' }).click();

    // TAM YOL: kurulum ekranı da `/panel/...` altında; gevşek desen ikisine
    // de uyar ve test yanlış yere varsa bile yeşil kalırdı (T-019b).
    await expect(page).toHaveURL(/\/panel$/);
  });

  /** REGRESYON KİLİDİ — `INVALID_TOTP`. */
  test('yanlış TOTP kodu reddedilir (INVALID_TOTP istemciye ulaşıyor)', async ({ page }) => {
    const { email, password } = adminCredentials();
    await page.goto('/giris');
    await fillCredentials(page, email, password);
    await expect(totpField(page)).toBeVisible();

    await totpField(page).fill('000000');
    await page.getByRole('button', { name: 'Doğrula ve gir' }).click();

    await expect(errorAlert(page)).toHaveText(AUTH_ERROR_MESSAGES.INVALID_TOTP);
    await expect(page).toHaveURL(/\/giris/);
  });
});

// ---------------------------------------------------------------------------
// Kurtarma kodu — ADR-013
// ---------------------------------------------------------------------------

test.describe('kurtarma kodu (ADR-013)', () => {
  test.beforeEach(async () => {
    await resetAuthState();
    await enableTwoFactor();
  });

  /**
   * Kurtarma kodu, telefonunu kaybeden site sahibinin TEK çıkış yolu (R3).
   * Ayrıca kod TÜKETİLMELİ — kalıcı bir arka kapıya dönüşmemeli.
   */
  test('kurtarma koduyla giriş yapılır ve kod tüketilir', async ({ page }) => {
    const { email, password } = adminCredentials();
    const kod = TEST_BACKUP_CODES[0];

    expect(await remainingBackupCodeCount()).toBe(TEST_BACKUP_CODES.length);

    await page.goto('/giris');
    await fillCredentials(page, email, password);
    await expect(totpField(page)).toBeVisible();

    await totpField(page).fill(kod);
    await page.getByRole('button', { name: 'Doğrula ve gir' }).click();

    await expect(page).toHaveURL(/\/panel$/);
    expect(await remainingBackupCodeCount()).toBe(TEST_BACKUP_CODES.length - 1);
  });

  test('tüketilen kod İKİNCİ kez kabul edilmez', async ({ page, context }) => {
    const { email, password } = adminCredentials();
    const kod = TEST_BACKUP_CODES[0];

    // 1. kullanım — başarılı.
    await page.goto('/giris');
    await fillCredentials(page, email, password);
    await totpField(page).fill(kod);
    await page.getByRole('button', { name: 'Doğrula ve gir' }).click();
    await expect(page).toHaveURL(/\/panel$/);

    // Oturumu bırak; ikinci deneme temiz bir tarayıcıdan gelsin.
    await context.clearCookies();

    await page.goto('/giris');
    await fillCredentials(page, email, password);
    await expect(totpField(page)).toBeVisible();
    await totpField(page).fill(kod);
    await page.getByRole('button', { name: 'Doğrula ve gir' }).click();

    await expect(errorAlert(page)).toHaveText(AUTH_ERROR_MESSAGES.INVALID_TOTP);
    await expect(page).toHaveURL(/\/giris/);
  });
});

// ---------------------------------------------------------------------------
// §8.4 — hesap kilidi
// ---------------------------------------------------------------------------

test.describe('§8.4 — 5. başarısız denemede kilit', () => {
  test.beforeEach(async () => {
    await resetAuthState();
  });

  /**
   * REGRESYON KİLİDİ — `ACCOUNT_LOCKED`.
   *
   * Ayrıca T-014'te yazılan ama T-013c'ye kadar BAĞLANMAMIŞ olan politikanın
   * (BULGU-005) gerçekten devrede olduğunu uçtan uca kanıtlar: politika yalnız
   * birim testinde çalışıp üretimde hiç çağrılmıyor olsaydı bu test kırılırdı.
   */
  test('beş yanlış şifre → IP engeli → ACCOUNT_LOCKED istemciye ulaşıyor', async ({ page }) => {
    const { email, password } = adminCredentials();
    await page.goto('/giris');

    for (let deneme = 1; deneme <= 5; deneme += 1) {
      await fillCredentials(page, email, `yanlis-sifre-${deneme}`);
      await expect(errorAlert(page)).toBeVisible();
    }

    // Hesaba kilit YAZILMAZ: tek IP'den deneyen sahibini kilitleyemez, yalnızca kendini engeller.
    expect(await isAccountLocked()).toBe(false);

    // DOĞRU şifreyle bile girilemez — engel şifreden bağımsızdır.
    await fillCredentials(page, email, password);

    await expect(errorAlert(page)).toHaveText(AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED);
    await expect(page).toHaveURL(/\/giris/);
  });

  /**
   * Kilit eşiğin ALTINDA uygulanmamalı — dürüst kullanıcı iki kez yanlış
   * yazdığında hesabından olmamalı.
   */
  test('dört yanlış deneme kilitlemez', async ({ page }) => {
    const { email, password } = adminCredentials();
    await page.goto('/giris');

    for (let deneme = 1; deneme <= 4; deneme += 1) {
      await fillCredentials(page, email, `yanlis-sifre-${deneme}`);
      await expect(errorAlert(page)).toBeVisible();
    }

    expect(await isAccountLocked()).toBe(false);

    /*
     * Doğru şifre KABUL EDİLMELİ. Bu kullanıcının 2FA'sı kurulu olmadığı için
     * varış noktası panel değil kurulum ekranıdır (§8.1, T-019b) — önemli olan
     * `/giris`'te KALMAMASI: kalsaydı kilit yanlışlıkla uygulanmış olurdu.
     */
    await fillCredentials(page, email, password);
    await expect(page).toHaveURL(new RegExp(`${TWO_FACTOR_SETUP_PATH}$`));
  });
});

// ---------------------------------------------------------------------------
// §8.1 — 2FA kurulumu ilk girişte zorunlu (T-019)
// ---------------------------------------------------------------------------

/**
 * Oturum çerezi ELDE ÜRETİLİYOR, giriş formundan geçilmiyor — bilinçli.
 *
 * Ölçülen şey giriş akışı değil, ARA KATMANIN JETONDAKİ `tfa` alanına verdiği
 * tepki. Jetonu doğrudan üretmek iki dalı da (kurulu / kurulu değil) kesin
 * olarak kurmayı sağlıyor ve §8.1 kapısı, Backend'in giriş akışına alanı
 * eklemesini BEKLEMEDEN gerçek tarayıcıyla doğrulanabiliyor (T-019/T1).
 */
test.describe('§8.1 — 2FA kurulmamışsa panel kullanılamaz', () => {
  test.beforeEach(async () => {
    await resetAuthState();
  });

  async function oturumAc(
    context: Parameters<typeof applySessionCookie>[0],
    twoFactorEnabled: boolean | undefined,
  ): Promise<void> {
    const { id, email } = await findAdminUser();
    await applySessionCookie(context, { userId: id, email, twoFactorEnabled }, BASE_URL);
  }

  test('2FA kurulu değilken /panel → kurulum ekranı', async ({ context, page }) => {
    await oturumAc(context, false);

    await page.goto('/panel');

    await expect(page).toHaveURL(new RegExp(`${TWO_FACTOR_SETUP_PATH}$`));
  });

  test('panelin diğer bölümleri de kuruluma düşer', async ({ context, page }) => {
    await oturumAc(context, false);

    await page.goto('/panel/ayarlar');

    await expect(page).toHaveURL(new RegExp(`${TWO_FACTOR_SETUP_PATH}$`));
  });

  /** Döngü koruması — kullanıcı kuruluma ulaşamazsa kurulumu hiç yapamaz. */
  test('kurulum ekranının kendisi açılıyor — döngü yok', async ({ context, page }) => {
    await oturumAc(context, false);

    const response = await page.goto(TWO_FACTOR_SETUP_PATH);

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`${TWO_FACTOR_SETUP_PATH}$`));
    await expect(page.locator('main')).toBeVisible();
  });

  test('2FA kuruluyken panel normal açılıyor', async ({ context, page }) => {
    await oturumAc(context, true);

    await page.goto('/panel');

    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.locator('main')).toBeVisible();
  });

  /** §7.2 — kimlik kanıtlandı, yetki yok: 401 değil 403; yönlendirme yok. */
  test('/api/v1/panel/* 403 FORBIDDEN döner', async ({ context, request }) => {
    await oturumAc(context, false);
    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get('/api/v1/panel/islem', {
      headers: { cookie: cookieHeader },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  /**
   * Kurulum ZORUNLU ama HAPİS DEĞİL: kullanıcı kurmak istemiyorsa çıkabilmeli.
   * `/api/auth/*` korumalı olmadığı için `signOut` her koşulda erişilebilir.
   */
  test('çıkış yolu 2FA kurulmamışken de erişilebilir', async ({ context, request }) => {
    await oturumAc(context, false);
    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get('/api/auth/csrf', {
      headers: { cookie: cookieHeader },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(200);
  });

  test("oturumsuz kullanıcı hâlâ /giris'e gider — kuruluma değil", async ({ page }) => {
    await page.goto('/panel');

    await expect(page).toHaveURL(/\/giris(\?|$)/);
  });
});

// ---------------------------------------------------------------------------
// §9/4 — T-014 kazanımı bozulmadı
// ---------------------------------------------------------------------------

test.describe('§9/4 — panel koruması (T-014 gerilemesi)', () => {
  test('oturumsuz /panel → /giris', async ({ page }) => {
    await page.goto('/panel');

    await expect(page).toHaveURL(/\/giris(\?|$)/);
  });

  /**
   * Koruma dürüst kullanıcıyı engellememeli — ama bunu göstermek için kullanıcı
   * §8.1'i de geçmiş olmalı. T-019b'den beri 2FA'sız bir giriş kurulum ekranına
   * düşüyor; o hâliyle bu test "panele girilebiliyor" demiş OLMAZDI.
   * Bu yüzden 2FA açılıp TOTP ile tam akış koşuluyor ve varış TAM YOL ile
   * doğrulanıyor.
   */
  test('2FA kurulu kullanıcı giriş sonrası panele ulaşıyor', async ({ page }) => {
    await resetAuthState();
    const { secret } = await enableTwoFactor();
    const { email, password } = adminCredentials();

    await page.goto('/giris');
    await fillCredentials(page, email, password);
    await expect(totpField(page)).toBeVisible();

    await waitForSafeTotpWindow();
    await totpField(page).fill(generateTotp(secret));
    await page.getByRole('button', { name: 'Doğrula ve gir' }).click();

    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.locator('main')).toBeVisible();
  });
});
