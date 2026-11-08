import process from 'node:process';

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright yapılandırması — PROGRAM.md §9 (E2E senaryoları).
 *
 * SUNUCU SEÇİMİ: `next dev` değil `next build && next start`.
 * Ara katman (`src/middleware.ts`) ve güvenlik başlıkları geliştirme ve üretim
 * derlemelerinde farklı davranabilir; başlıkları doğrulayan bir test paketinin
 * üretime benzeyen çıktı üzerinde koşması şart.
 *
 * VERİTABANI: `smoke` ve `security-headers` DB GEREKTİRMEZ. `auth.spec.ts`
 * (T-016, §9 senaryo 3) gerektirir — giriş akışı gerçek kullanıcı kaydına
 * bakar. Ayrıntı: `tests/e2e/_helpers/db.ts`.
 */

/**
 * `.env` bu SÜRECE de yüklenir.
 *
 * Next kendi `.env`'ini kendisi okur, ama test süreci okumaz: `AUTH_SECRET`
 * (oturum çerezi üretimi), `TOTP_ENCRYPTION_KEY` (2FA kurulumu) ve
 * `ADMIN_EMAIL`/`ADMIN_PASSWORD` (giriş) yardımcılarda gerekli. Node 20.12+
 * yerleşiği kullanılıyor — `dotenv` eklemek yeni bağımlılık olurdu (§8.25).
 *
 * Dosya yoksa sessizce geçilir: CI'da `.env` YOKTUR (§8.17) ve DB gerektirmeyen
 * paketler orada da koşmalı.
 */
try {
  process.loadEnvFile();
} catch {
  // `.env` yok — CI'da beklenen durum.
}

/** 3000 değil: geliştiricinin açık `pnpm dev` sunucusuyla çakışmasın. */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  /**
   * `@/...` içe aktarmalarının çözülebilmesi için — gerekçe dosyanın içinde.
   * Bu olmadan `tests/e2e/**` uygulamanın hiçbir modülünü yükleyemiyor.
   */
  tsconfig: './tsconfig.e2e.json',

  // Veritabanı hazırlığı ve — asıl önemlisi — koşum sonrası seed durumuna
  // dönüş. Ayrıntı: `_helpers/global-teardown.ts`.
  globalSetup: './tests/e2e/_helpers/global-setup.ts',
  globalTeardown: './tests/e2e/_helpers/global-teardown.ts',

  fullyParallel: true,

  // CI'da `test.only` unutulmuş olamaz — sessizce daralan bir paket, yeşil
  // görünen ama hiçbir şey doğrulamayan bir CI demektir.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  /**
   * CI'da JSON raporu da üretilir.
   *
   * Playwright ATLANAN testler için sıfır olmayan çıkış kodu vermez; "19
   * skipped" ile geçen bir koşum yeşil görünür (T-005b'nin çözdüğü sorun).
   * `ci.yml` → "Atlanan test yok" adımı bu dosyayı okuyup atlama sayısını
   * kontrol ediyor, yani sessiz gerileme gürültülü hataya dönüşüyor.
   */
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['json', { outputFile: 'playwright-sonuc.json' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Arayüz Türkçe (§1, v1 sadece TR); tarayıcı da öyle olsun ki tarih ve
    // sayı biçimlendirmesi üretimdekiyle aynı yoldan geçsin.
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    // Panel service worker'ı gezinmelere girer; Playwright'ın yanıt/yol kesme
    // ölçümleri bozulmasın. Çevrimdışı e2e'si (`cevrimdisi.spec.ts`) kendisi açar.
    serviceWorkers: 'block',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      /**
       * §9 senaryo 7 — "Mobil görünümde ana sayfa ve panel kullanılabilir".
       * Senaryonun kendisi T-029'da yazılacak; mobil projesi şimdiden burada
       * duruyor ki her E2E testi baştan itibaren iki görünümde de koşsun ve
       * mobil kırılma F6'ya birikmesin.
       */
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },

      /**
       * `auth.spec.ts` MOBİLDE KOŞMAZ — bilinçli.
       *
       * O paket TEK bir veritabanı satırını (seed'in tek yönetici hesabı)
       * değiştirerek çalışıyor: 2FA'yı açıyor, kilitliyor, sıfırlıyor. İki
       * proje paralel koşunca ikisi aynı satırı çekiştiriyor — birinin
       * `resetAuthState()` çağrısı ötekinin az önce açtığı 2FA'yı kapatıyor
       * ve öteki test 2FA adımını hiç göremiyor.
       *
       * ÖLÇÜLDÜ: tam koşumda `mobile-chrome › yanlış TOTP kodu reddedilir`
       * bu yüzden düştü. Yeniden deneme (retry) ile örtmek YANLIŞ olurdu —
       * sorun kararsızlık değil, paylaşılan durum.
       *
       * Giriş akışı görünüme bağlı değil; mobil kapsama §9/7'nin işi (T-029)
       * ve orada ölçülecek şey düzen/kullanılabilirlik, paylaşılan auth durumu
       * değil. Diğer paketler (smoke, security-headers) iki projede de koşmaya
       * devam ediyor — onlar durum değiştirmiyor.
       */
      testIgnore: /auth\.spec\.ts$/,
    },
  ],

  webServer: {
    /**
     * CI'da derleme AYRI BİR ADIM olarak zaten koştu (`.github/workflows/ci.yml`
     * → "build"), bu yüzden burada yalnızca sunucu başlatılır. Yeniden derleseydik
     * hem her koşuda bir derleme boşa gider hem de CI'ın `build → test:e2e`
     * sıralaması anlamsızlaşırdı: E2E kendi derlemesini yapsaydı, önceki adımın
     * başarısı E2E için bir ön koşul olmaktan çıkardı.
     *
     * Yerelde tek komutla çalışsın diye derleme dahil edilir.
     */
    command: isCI ? 'node tests/olcum-sunucusu.mjs' : 'pnpm build && node tests/olcum-sunucusu.mjs',
    url: `${BASE_URL}/panel`,
    // `HOSTNAME` GEÇİLMİYOR — gerekçe `tests/olcum-sunucusu.mjs` içinde
    // (belirli bir geri döngü adresi yönlendirmeleri mutlaklaştırıyor).
    env: {
      PORT: String(PORT),
    },
    // Yerelde ayakta bir sunucu varsa yeniden kullan; CI'da her zaman temiz derleme.
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
