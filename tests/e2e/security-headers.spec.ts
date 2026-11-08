import { expect, test } from '@playwright/test';

/**
 * PROGRAM.md §8.7, §8.12, §8.14 — güvenlik başlıklarının GERÇEK sunucu
 * yanıtları üzerinde doğrulanması.
 *
 * Bu dosya birim testlerinin tekrarı değildir. Birim testi
 * `buildSecurityHeaders()` fonksiyonunun doğru nesneyi ürettiğini gösterir;
 * burada ise ara katmanın Next tarafından GERÇEKTEN ÇALIŞTIRILDIĞI doğrulanır.
 * Aradaki fark F0'da somut bir tuzaktı: proje `src/` dizini kullandığı için
 * ara katman `src/middleware.ts` yolunda olmak zorunda — depo kökündeki bir
 * `middleware.ts` hata vermeden yok sayılır, birim testleri yeşil kalır ve
 * üretimde HİÇBİR başlık uygulanmaz. Yalnızca bu test o durumu yakalar.
 */

/** §8.14 — her yanıtta bulunması gereken taban başlıklar. */
const BASELINE = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
} as const;

test.describe('§8.14 — taban güvenlik başlıkları', () => {
  // `/panel` artık korumalı ve yönlendiriyor (T-014); `maxRedirects: 0` ile
  // YÖNLENDİRME YANITININ KENDİSİ denetlenir — ara yanıt başlıksız kalmamalı.
  for (const path of ['/', '/giris', '/panel']) {
    test(`${path} taban başlıkları taşır`, async ({ request }) => {
      const headers = (await request.get(path, { maxRedirects: 0 })).headers();

      for (const [name, value] of Object.entries(BASELINE)) {
        expect(headers[name], `${path} → ${name}`).toBe(value);
      }

      expect(headers['permissions-policy']).toContain('camera=()');
      expect(headers['permissions-policy']).toContain('geolocation=()');
      // Panelde konuşma alıştırması için yalnızca aynı köken (2026-11-06).
      expect(headers['permissions-policy']).toContain(
        path === '/panel' ? 'microphone=(self)' : 'microphone=()',
      );
    });
  }

  test('§8.14 — X-Powered-By sızmaz', async ({ request }) => {
    const headers = (await request.get('/')).headers();

    expect(headers['x-powered-by']).toBeUndefined();
  });
});

test.describe('§8.7 — panel arama motorlarına kapalı', () => {
  test('/panel yanıtı X-Robots-Tag: noindex, nofollow taşır', async ({ request }) => {
    // Yönlendirme İZLENMEZ: aksi hâlde `/giris`'in başlıkları ölçülürdü ve
    // panelin kendi yanıtı hiç denetlenmemiş olurdu.
    const headers = (await request.get('/panel', { maxRedirects: 0 })).headers();

    expect(headers['x-robots-tag']).toBe('noindex, nofollow');
  });

  /** §8.5 — T-014. Panel oturumsuzken içerik SIZDIRMADAN yönlendirmeli. */
  test("/panel oturumsuzken /giris'e yönlendirir", async ({ request }) => {
    const response = await request.get('/panel', { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/giris');
  });

  test('/api/v1/panel/* oturumsuzken 401 JSON döner (§7.2)', async ({ request }) => {
    const response = await request.get('/api/v1/panel/islem', { maxRedirects: 0 });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  /** Giriş sayfası public — indekslenebilir kalmalı, noindex almamalı. */
  test('/giris X-Robots-Tag TAŞIMAZ', async ({ request }) => {
    const headers = (await request.get('/giris')).headers();

    expect(headers['x-robots-tag']).toBeUndefined();
  });

  /**
   * Public taraf indekslenebilir kalmalı (§1.1 K4 — site ticari dönüşüm
   * hedefi taşıyor). Matcher genişletilirken buranın sessizce `noindex`
   * alması, aylar sonra fark edilecek türden bir SEO kaybı olurdu.
   */
  test('ana sayfa X-Robots-Tag TAŞIMAZ', async ({ request }) => {
    const headers = (await request.get('/')).headers();

    expect(headers['x-robots-tag']).toBeUndefined();
  });
});

/**
 * §13.6–13.7 — Coolify sağlık kontrolü ve Uptime Kuma bu ucu kimliksiz ve çok
 * sık yoklar (Backend T-003b notu T2), bu yüzden matcher DIŞINDA kalmalı.
 *
 * KANIT OLARAK `X-Robots-Tag` KULLANILAMAZ: uç bu başlığı kendi elleriyle
 * yazıyor (`src/app/api/v1/health/route.ts`). "Health'te X-Robots-Tag yok"
 * beklentisi bu yüzden yanlış olurdu — ayrıntı için `docs/security/README.md`
 * BULGU-001. Ayırt edici işaret `X-Frame-Options`: bu başlığı YALNIZCA ara
 * katman yazar, uç yazmaz.
 */
test.describe('matcher sınırı — /api/v1/health dışarıda', () => {
  test('health ucu ara katman başlıklarını TAŞIMAZ', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    const headers = response.headers();

    // Durum kodu bilinçli olarak doğrulanmıyor: DB kapalıyken 503 döner ve
    // bu DOĞRU davranıştır (T-003b). Burada yalnızca başlıklar denetlenir.
    expect(headers['x-frame-options']).toBeUndefined();
    expect(headers['permissions-policy']).toBeUndefined();
    expect(headers['referrer-policy']).toBeUndefined();
  });

  test('health ucu kendi başlıklarını yazmayı sürdürüyor', async ({ request }) => {
    const headers = (await request.get('/api/v1/health')).headers();

    // Bu uç matcher dışında olduğu için kendi korumasını kendi yazmak
    // zorunda. Backend bu başlıkları kaldırırsa uç savunmasız kalır — bu
    // test o gerilemeyi (regression) yakalar.
    expect(headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(headers['cache-control']).toContain('no-store');
  });
});

/**
 * §8.12 — HSTS yalnızca üretim + HTTPS.
 *
 * `pnpm build && pnpm start` NODE_ENV=production ile koşar, ancak istek düz
 * HTTP üzerinden gelir; bu yüzden HSTS eklenmemeli. Eklenseydi tarayıcı
 * `127.0.0.1`'i kalıcı olarak HTTPS'e sabitler ve yerel geliştirmeyi kırardı.
 */
test.describe('§8.12 — HSTS', () => {
  test('düz HTTP isteğine HSTS eklenmez', async ({ request }) => {
    for (const path of ['/', '/giris', '/panel']) {
      const headers = (await request.get(path, { maxRedirects: 0 })).headers();
      expect(headers['strict-transport-security'], path).toBeUndefined();
    }
  });
});

/**
 * §8.13 — CSP VAR (T-060).
 *
 * ⚠️ BURADA F0'DA "CSP henüz yok" İDDİASI VARDI ve tasarlandığı gibi T-060'ta
 * ATEŞLENDİ — kendi metni "T-060 bu beklentiyi tersine çevirecek" diyordu.
 * CSP'nin tarayıcıdaki davranışı (ihlal yok, nonce basılmış, hidrasyon)
 * `csp.spec.ts`te; burası yalnızca başlığın VARLIĞINI ve asıl şartı tutuyor.
 */
test('§8.13 — CSP var, nonce tabanlı, betikte `unsafe-inline` yok', async ({ request }) => {
  const birinci = (await request.get('/')).headers()['content-security-policy'] ?? '';
  const ikinci = (await request.get('/')).headers()['content-security-policy'] ?? '';

  expect(birinci).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'/);
  expect(birinci).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  // Nonce İSTEK BAŞINA — iki yanıtta aynı nonce, `unsafe-inline`dan farksız olurdu.
  expect(birinci).not.toBe(ikinci);
});
