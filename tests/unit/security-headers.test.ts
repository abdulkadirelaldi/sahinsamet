import { describe, expect, it } from 'vitest';

import {
  BASELINE_SECURITY_HEADERS,
  HSTS_VALUE,
  PANEL_ROBOTS_HEADER,
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  generateNonce,
  isHttpsRequest,
  isPanelPath,
} from '@/lib/security/headers';

/**
 * PROGRAM.md §8.7, §8.12, §8.14 — başlık mantığının saf birim testi.
 *
 * Bu dosya bilinçli olarak `@/server/db` veya Prisma zincirinden hiçbir şey
 * içe aktarmaz; veritabanı ve `.env` olmadan geçer (T-004 kabul kriteri).
 */

describe('isPanelPath', () => {
  it('panel köklerini ve alt yollarını tanır', () => {
    expect(isPanelPath('/panel')).toBe(true);
    expect(isPanelPath('/panel/')).toBe(true);
    expect(isPanelPath('/panel/muhasebe')).toBe(true);
    expect(isPanelPath('/panel/muhasebe/raporlar')).toBe(true);
    expect(isPanelPath('/api/v1/panel')).toBe(true);
    expect(isPanelPath('/api/v1/panel/islem')).toBe(true);
  });

  it('public yolları panel saymaz', () => {
    expect(isPanelPath('/')).toBe(false);
    expect(isPanelPath('/projeler')).toBe(false);
    expect(isPanelPath('/api/v1/health')).toBe(false);
    expect(isPanelPath('/api/v1/iletisim')).toBe(false);
  });

  /**
   * Gerileme (regression) testi: düz `startsWith('/panel')` kullanılsaydı
   * bunların hepsi panel sayılırdı. `/paneller` gibi bir public rota
   * `noindex` alsaydı arama sonuçlarından sessizce düşerdi — hata vermeyen,
   * aylar sonra fark edilen türden bir kayıp.
   */
  it('segment sınırında olmayan benzer yolları panel SAYMAZ', () => {
    expect(isPanelPath('/paneller')).toBe(false);
    expect(isPanelPath('/panel-demo')).toBe(false);
    expect(isPanelPath('/panelist')).toBe(false);
    expect(isPanelPath('/api/v1/paneller')).toBe(false);
  });
});

describe('buildSecurityHeaders', () => {
  const publicContext = { pathname: '/', isProduction: false, isHttps: false };
  const panelContext = { pathname: '/panel/muhasebe', isProduction: false, isHttps: false };

  it('§8.14 taban başlıklarını her yola uygular', () => {
    for (const context of [publicContext, panelContext]) {
      const headers = buildSecurityHeaders(context);

      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Permissions-Policy']).toBeTruthy();
    }
  });

  it('§8.14 — Permissions-Policy kısıtlıdır, hassas yetenekler kapalı', () => {
    const policy = buildSecurityHeaders(publicContext)['Permissions-Policy'] ?? '';

    for (const capability of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
      expect(policy).toContain(`${capability}=()`);
    }
    // Antrenmanda ekran açık kalsın: yalnızca aynı köken.
    expect(policy).toContain('screen-wake-lock=(self)');
  });

  it('mikrofon YALNIZCA panelde ve yalnızca aynı kökene açık (İngilizce konuşma)', () => {
    const panel = buildSecurityHeaders(panelContext)['Permissions-Policy'] ?? '';
    expect(panel).toContain('microphone=(self)');
    expect(panel).not.toContain('microphone=()');
    expect(panel).toContain('camera=()');
    expect(buildSecurityHeaders(publicContext)['Permissions-Policy']).toContain('microphone=()');
  });

  it('§8.7 — X-Robots-Tag YALNIZCA panel yollarına eklenir', () => {
    expect(buildSecurityHeaders(panelContext)['X-Robots-Tag']).toBe(PANEL_ROBOTS_HEADER);
    expect(buildSecurityHeaders(panelContext)['X-Robots-Tag']).toBe('noindex, nofollow');

    // Public sayfaların indekslenmesi gerekiyor (K4) — başlık burada olmamalı.
    expect(buildSecurityHeaders(publicContext)['X-Robots-Tag']).toBeUndefined();
  });

  describe('§8.12 — HSTS', () => {
    it('üretim + HTTPS ise eklenir', () => {
      const headers = buildSecurityHeaders({
        pathname: '/',
        isProduction: true,
        isHttps: true,
      });

      expect(headers['Strict-Transport-Security']).toBe(HSTS_VALUE);
      expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
    });

    /**
     * Yerelde HSTS gönderilirse tarayıcı `localhost`'u kalıcı olarak HTTPS'e
     * sabitler; geliştirme ortamı erişilemez hâle gelir ve temizlenmesi elle
     * tarayıcı ayarı gerektirir.
     */
    it('geliştirme ortamında ASLA eklenmez', () => {
      expect(
        buildSecurityHeaders({ pathname: '/', isProduction: false, isHttps: false })[
          'Strict-Transport-Security'
        ],
      ).toBeUndefined();

      expect(
        buildSecurityHeaders({ pathname: '/', isProduction: false, isHttps: true })[
          'Strict-Transport-Security'
        ],
      ).toBeUndefined();
    });

    it('üretimde bile düz HTTP isteğine eklenmez', () => {
      expect(
        buildSecurityHeaders({ pathname: '/', isProduction: true, isHttps: false })[
          'Strict-Transport-Security'
        ],
      ).toBeUndefined();
    });

    /**
     * `preload` geri alınamaz (çıkış aylar sürer) ve tüm alt alan adlarının
     * kalıcı HTTPS olmasını şart koşar. `panel.` alt alan adı kararı
     * (STATUS.md Q1) henüz verilmedi — F7'ye kadar eklenmemeli.
     */
    it('F0 boyunca `preload` TAŞIMAZ', () => {
      expect(HSTS_VALUE).not.toContain('preload');
    });
  });

  it('taban başlık nesnesi dondurulmuş — çağrı arasında sızma olmaz', () => {
    const first = buildSecurityHeaders(publicContext);
    first['X-Frame-Options'] = 'SAMEORIGIN';

    expect(buildSecurityHeaders(publicContext)['X-Frame-Options']).toBe('DENY');
    expect(BASELINE_SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });
});

describe('isHttpsRequest', () => {
  it('ters vekilin x-forwarded-proto başlığını dikkate alır', () => {
    expect(isHttpsRequest('https', 'http:')).toBe(true);
    expect(isHttpsRequest('http', 'http:')).toBe(false);
  });

  it('vekil zinciri listesinde ilk değeri kullanır', () => {
    expect(isHttpsRequest('https, http', 'http:')).toBe(true);
    expect(isHttpsRequest('http, https', 'http:')).toBe(false);
  });

  it('başlık büyük/küçük harf ve boşluğa duyarsızdır', () => {
    expect(isHttpsRequest(' HTTPS ', 'http:')).toBe(true);
  });

  it('başlık yoksa isteğin kendi şemasına düşer', () => {
    expect(isHttpsRequest(null, 'https:')).toBe(true);
    expect(isHttpsRequest(null, 'http:')).toBe(false);
  });
});

/* ===========================================================================
 * §8.13 — CSP (T-060)
 * ======================================================================== */

/** Politikayı `{ direktif: [değerler] }` sözlüğüne ayırır. */
function ayristir(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp.split(';').map((parca) => {
      const [ad = '', ...degerler] = parca.trim().split(/\s+/);
      return [ad, degerler];
    }),
  );
}

describe('§8.13 — buildContentSecurityPolicy', () => {
  const URETIM = { nonce: 'QUJDREVGR0hJSktMTU5PUA==', isProduction: true, isHttps: true };
  const GELISTIRME = { ...URETIM, isProduction: false, isHttps: false };

  it('⚠️ script-src `unsafe-inline` TAŞIMIYOR — maddenin asıl şartı', () => {
    for (const ctx of [URETIM, GELISTIRME]) {
      expect(ayristir(buildContentSecurityPolicy(ctx))['script-src']).not.toContain(
        "'unsafe-inline'",
      );
    }
  });

  it('script-src nonce + strict-dynamic taşıyor', () => {
    const script = ayristir(buildContentSecurityPolicy(URETIM))['script-src'];
    expect(script).toContain(`'nonce-${URETIM.nonce}'`);
    expect(script).toContain("'strict-dynamic'");
  });

  it('⚠️ ÜRETİMDE `unsafe-eval` ve `ws:` YOK — yalnızca geliştirmede', () => {
    const uretim = ayristir(buildContentSecurityPolicy(URETIM));
    expect(uretim['script-src']).not.toContain("'unsafe-eval'");
    expect(uretim['connect-src']).not.toContain('ws:');

    const gelistirme = ayristir(buildContentSecurityPolicy(GELISTIRME));
    expect(gelistirme['script-src']).toContain("'unsafe-eval'");
    expect(gelistirme['connect-src']).toContain('ws:');
  });

  it('çerçeveleme, eklenti, base ve form kapalı/kendinden', () => {
    const p = ayristir(buildContentSecurityPolicy(URETIM));
    expect(p['frame-ancestors']).toEqual(["'none'"]);
    expect(p['object-src']).toEqual(["'none'"]);
    expect(p['base-uri']).toEqual(["'self'"]);
    expect(p['form-action']).toEqual(["'self'"]);
    expect(p['default-src']).toEqual(["'self'"]);
  });

  it('dış köken YOK — connect/img/font yalnızca kendinden (R2 arayüzü gelince açılacak)', () => {
    const p = ayristir(buildContentSecurityPolicy(URETIM));
    for (const ad of ['connect-src', 'img-src', 'font-src']) {
      for (const deger of p[ad] ?? []) expect(deger, `${ad}: ${deger}`).not.toMatch(/^https?:/);
    }
  });

  it('`upgrade-insecure-requests` yalnızca üretim + HTTPS', () => {
    expect(buildContentSecurityPolicy(URETIM)).toContain('upgrade-insecure-requests');
    expect(buildContentSecurityPolicy({ ...URETIM, isHttps: false })).not.toContain(
      'upgrade-insecure-requests',
    );
    expect(buildContentSecurityPolicy(GELISTIRME)).not.toContain('upgrade-insecure-requests');
  });
});

describe('§8.13 — generateNonce', () => {
  it('128 bit base64 ve HER ÇAĞRIDA farklı', () => {
    const nonceler = new Set(Array.from({ length: 200 }, () => generateNonce()));
    expect(nonceler.size).toBe(200);
    for (const n of nonceler) expect(n).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});
