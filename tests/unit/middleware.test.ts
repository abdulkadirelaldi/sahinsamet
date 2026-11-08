import { readFileSync } from 'node:fs';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TWO_FACTOR_SETUP_PATH } from '@/lib/security/two-factor';
import { LOGIN_PATH, config, middleware, safeCallbackPath } from '@/middleware';

/**
 * PROGRAM.md §8.5 (panel koruması), §8.7, §8.14.
 *
 * `readSession` taklit ediliyor: gerçek jeton üretmek `AUTH_SECRET` ve
 * `next-auth` çalışma zamanı gerektirir; burada test edilen şey jetonun nasıl
 * ÇÖZÜLDÜĞÜ değil (o `session.test.ts`'in işi), oturumun VARLIĞINA göre
 * ara katmanın ne yaptığı.
 */
const readSessionMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/security/session', () => ({ readSession: readSessionMock }));

afterEach(() => {
  readSessionMock.mockReset();
  vi.restoreAllMocks();
});

function istek(pathname: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'), { headers });
}

/** 2FA kurulu, tam yetkili oturum. */
function oturumVar(): void {
  readSessionMock.mockResolvedValue({ userId: 'kullanici-1', twoFactorEnabled: true });
}

/** Oturum var ama 2FA KURULU DEĞİL — §8.1 kapısına takılmalı. */
function oturumVarIkiAdimYok(): void {
  readSessionMock.mockResolvedValue({ userId: 'kullanici-1', twoFactorEnabled: false });
}

/** Jeton `tfa` alanını hiç taşımıyor — beklenmedik durum, kapı kapanmalı. */
function oturumVarAlanYok(): void {
  readSessionMock.mockResolvedValue({ userId: 'kullanici-1', twoFactorEnabled: null });
}

function oturumYok(): void {
  readSessionMock.mockResolvedValue(null);
}

// ---------------------------------------------------------------------------
// §8.5 — panel koruması
// ---------------------------------------------------------------------------

describe('§8.5 — oturumsuz erişim', () => {
  it('/panel giriş sayfasına yönlendirilir', async () => {
    oturumYok();
    const yanit = await middleware(istek('/panel'));

    expect(yanit.status).toBe(307);
    const konum = new URL(yanit.headers.get('location') ?? '');
    expect(konum.pathname).toBe(LOGIN_PATH);
  });

  it('/panel alt yolları da yönlendirilir', async () => {
    oturumYok();

    for (const yol of ['/panel/muhasebe', '/panel/saglik', '/panel/ayarlar']) {
      const yanit = await middleware(istek(yol));
      expect(yanit.status, yol).toBe(307);
    }
  });

  it('nereden gelindiği callbackUrl ile taşınır', async () => {
    oturumYok();
    const yanit = await middleware(istek('/panel/muhasebe/raporlar'));

    const konum = new URL(yanit.headers.get('location') ?? '');
    expect(konum.searchParams.get('callbackUrl')).toBe('/panel/muhasebe/raporlar');
  });

  /**
   * §7.2 — panel API'si HTML giriş sayfasına yönlendirilmez. `fetch` bir
   * yönlendirmeyi sessizce izler ve çağıran taraf HTML'i veri sanar; hatanın
   * gerçek nedeni kaybolur.
   */
  it('/api/v1/panel/* 401 JSON döner, yönlendirilmez', async () => {
    oturumYok();
    const yanit = await middleware(istek('/api/v1/panel/islem'));

    expect(yanit.status).toBe(401);
    expect(yanit.headers.get('location')).toBeNull();

    const govde = await yanit.json();
    expect(govde).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('401 gövdesi altyapı ayrıntısı sızdırmaz (§8.20)', async () => {
    oturumYok();
    const govde = JSON.stringify(await (await middleware(istek('/api/v1/panel/x'))).json());

    for (const yasak of ['AUTH_SECRET', 'authjs', 'token', 'stack', 'prisma']) {
      expect(govde.toLowerCase()).not.toContain(yasak.toLowerCase());
    }
  });
});

describe('§8.5 — oturumlu erişim', () => {
  it('/panel geçer, yönlendirme yok', async () => {
    oturumVar();
    const yanit = await middleware(istek('/panel'));

    expect(yanit.status).toBe(200);
    expect(yanit.headers.get('location')).toBeNull();
  });

  it('/api/v1/panel/* geçer', async () => {
    oturumVar();
    const yanit = await middleware(istek('/api/v1/panel/islem'));

    expect(yanit.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// §8.1 — 2FA kurulumu ilk girişte zorunlu (T-019)
// ---------------------------------------------------------------------------

describe('§8.1 — 2FA kurulmamışsa panel kullanılamaz', () => {
  it('2FA yokken /panel kurulum ekranına yönlendirilir', async () => {
    oturumVarIkiAdimYok();
    const yanit = await middleware(istek('/panel'));

    expect(yanit.status).toBe(307);
    expect(new URL(yanit.headers.get('location') ?? '').pathname).toBe(TWO_FACTOR_SETUP_PATH);
  });

  it('panelin diğer bölümleri de yönlendirilir — hiçbiri kullanılamaz', async () => {
    oturumVarIkiAdimYok();

    for (const yol of ['/panel/muhasebe', '/panel/saglik', '/panel/ayarlar']) {
      const yanit = await middleware(istek(yol));
      expect(yanit.status, yol).toBe(307);
      expect(new URL(yanit.headers.get('location') ?? '').pathname, yol).toBe(
        TWO_FACTOR_SETUP_PATH,
      );
    }
  });

  /** Döngü koruması — kullanıcı kuruluma ulaşamazsa kurulum yapamaz. */
  it('kurulum ekranının KENDİSİ yönlendirilmez — döngü yok', async () => {
    oturumVarIkiAdimYok();
    const yanit = await middleware(istek(TWO_FACTOR_SETUP_PATH));

    expect(yanit.status).toBe(200);
    expect(yanit.headers.get('location')).toBeNull();
  });

  /**
   * §7.2 — kimlik KANITLANDI ama yetki yok: `401` değil `403`.
   * Yönlendirme yok; `fetch` yönlendirmeyi sessizce izler ve çağıran HTML'i
   * veri sanardı (T-014/K4 ile aynı gerekçe).
   */
  it('/api/v1/panel/* 403 FORBIDDEN JSON döner, yönlendirilmez', async () => {
    oturumVarIkiAdimYok();
    const yanit = await middleware(istek('/api/v1/panel/islem'));

    expect(yanit.status).toBe(403);
    expect(yanit.headers.get('location')).toBeNull();
    expect(await yanit.json()).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('403 ile 401 karışmıyor — oturumsuz hâlâ 401', async () => {
    oturumYok();
    expect((await middleware(istek('/api/v1/panel/x'))).status).toBe(401);

    oturumVarIkiAdimYok();
    expect((await middleware(istek('/api/v1/panel/x'))).status).toBe(403);
  });

  it('2FA kuruluysa panel normal çalışır', async () => {
    oturumVar();
    const yanit = await middleware(istek('/panel/muhasebe'));

    expect(yanit.status).toBe(200);
    expect(yanit.headers.get('location')).toBeNull();
  });

  /**
   * ÇIKIŞ YOLU AÇIK KALMALI: kurulum zorunlu, ama kullanıcı hapsedilmiş değil.
   * `/api/auth/*` korumalı değil, dolayısıyla `signOut` her koşulda erişilebilir.
   */
  it('signOut yolu 2FA kurulmamışken de erişilebilir', async () => {
    oturumVarIkiAdimYok();

    for (const yol of ['/api/auth/signout', '/api/auth/csrf', '/api/auth/session']) {
      const yanit = await middleware(istek(yol));
      expect(yanit.status, yol).toBe(200);
      expect(yanit.headers.get('location'), yol).toBeNull();
    }
  });

  it('public rotalar 2FA kapısından etkilenmez', async () => {
    oturumVarIkiAdimYok();

    for (const yol of ['/', '/projeler', '/iletisim', LOGIN_PATH]) {
      expect((await middleware(istek(yol))).status, yol).toBe(200);
    }
  });

  it('yönlendirme yanıtı güvenlik başlıklarını taşır (T-014 korunuyor)', async () => {
    oturumVarIkiAdimYok();
    const yanit = await middleware(istek('/panel'));

    expect(yanit.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(yanit.headers.get('x-frame-options')).toBe('DENY');
  });

  /**
   * BEKLENTİ T-019b'DE TERSİNE ÇEVRİLDİ.
   *
   * T-019'da alanı olmayan jeton GEÇİYORDU — Backend alanı henüz yazmadığı
   * için (BULGU-008) ve `null`'ı reddetmek 2FA'lı kullanıcıyı da kilitlerdi.
   * Backend T-013e'de alanı yazdı; artık `null` "beklenmedik durum" demektir
   * ve kapı kapalı yönde başarısız olmalı — besleyen veri kaybolursa korumanın
   * da sessizce kaybolmaması için.
   */
  it('jeton `tfa` taşımıyorsa kuruluma yönlendirir (T-019b)', async () => {
    oturumVarAlanYok();
    const yanit = await middleware(istek('/panel'));

    expect(yanit.status).toBe(307);
    expect(new URL(yanit.headers.get('location') ?? '').pathname).toBe(TWO_FACTOR_SETUP_PATH);
  });

  it('alan yokken panel API"si de 403 döner', async () => {
    oturumVarAlanYok();

    expect((await middleware(istek('/api/v1/panel/x'))).status).toBe(403);
  });
});

/**
 * Bu grup, görev kartının "döngü oluşur" uyarısının karşılığıdır.
 * Koruma matcher'a değil `isProtectedPath()`'e bağlı olduğu için `/giris` ve
 * `/api/auth/*` matcher İÇİNDE kalabiliyor — böylece §8.14 başlıklarını da
 * kaybetmiyorlar.
 */
describe('yönlendirme döngüsü ve kimlik uçları', () => {
  it('/giris korumalı DEĞİL — döngü oluşmaz', async () => {
    oturumYok();
    const yanit = await middleware(istek(LOGIN_PATH));

    expect(yanit.status).toBe(200);
    expect(yanit.headers.get('location')).toBeNull();
  });

  it('/giris oturumsuzken bile oturum sorgusu YAPILMAZ', async () => {
    oturumYok();
    await middleware(istek(LOGIN_PATH));

    expect(readSessionMock).not.toHaveBeenCalled();
  });

  it('/api/auth/* kimliksiz erişilebilir — giriş uçları çalışmalı', async () => {
    oturumYok();

    for (const yol of [
      '/api/auth/signin',
      '/api/auth/callback/credentials',
      '/api/auth/session',
      '/api/auth/csrf',
    ]) {
      const yanit = await middleware(istek(yol));
      expect(yanit.status, yol).toBe(200);
      expect(yanit.headers.get('location'), yol).toBeNull();
    }
  });

  it('public sayfalar korunmaz', async () => {
    oturumYok();

    for (const yol of ['/', '/projeler', '/blog/ilk-yazi', '/iletisim']) {
      expect((await middleware(istek(yol))).status, yol).toBe(200);
    }
  });
});

/**
 * Açık yönlendirme (open redirect): `callbackUrl` doğrulanmazsa giriş akışı
 * oltalama aracına dönüşür — kurban meşru alan adında giriş yapar, sonra
 * saldırganın sayfasına atılır.
 */
describe('safeCallbackPath — açık yönlendirme koruması', () => {
  it('göreli yolları kabul eder', () => {
    expect(safeCallbackPath('/panel', '')).toBe('/panel');
    expect(safeCallbackPath('/panel/muhasebe', '?ay=8')).toBe('/panel/muhasebe?ay=8');
  });

  it('protokole bağlı ve mutlak URL"leri REDDEDER', () => {
    expect(safeCallbackPath('//kotu.site', '')).toBeNull();
    expect(safeCallbackPath('//kotu.site/panel', '')).toBeNull();
    expect(safeCallbackPath('https://kotu.site', '')).toBeNull();
    expect(safeCallbackPath('http://kotu.site', '')).toBeNull();
  });

  it('eğik çizgiyle başlamayan değeri reddeder', () => {
    expect(safeCallbackPath('kotu.site', '')).toBeNull();
    expect(safeCallbackPath('', '')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T-004 kazanımları — bozulmamalı
// ---------------------------------------------------------------------------

describe('§8.7 / §8.14 — T-004 başlıkları korunuyor', () => {
  it('/panel yanıtı X-Robots-Tag taşır (oturumlu)', async () => {
    oturumVar();
    expect((await middleware(istek('/panel'))).headers.get('x-robots-tag')).toBe(
      'noindex, nofollow',
    );
  });

  /** Yönlendirme yanıtı da başlıkları taşımalı — ara yanıt boşluk bırakmaz. */
  it('/panel YÖNLENDİRMESİ de güvenlik başlıklarını taşır', async () => {
    oturumYok();
    const yanit = await middleware(istek('/panel'));

    expect(yanit.status).toBe(307);
    expect(yanit.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(yanit.headers.get('x-frame-options')).toBe('DENY');
    expect(yanit.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('401 JSON yanıtı da güvenlik başlıklarını taşır', async () => {
    oturumYok();
    const yanit = await middleware(istek('/api/v1/panel/x'));

    expect(yanit.headers.get('x-frame-options')).toBe('DENY');
    expect(yanit.headers.get('x-content-type-options')).toBe('nosniff');
  });

  /**
   * Giriş sayfası sitedeki en hassas public sayfa. Matcher dışına atsaydık
   * çerçeveleme ve yönlendiren koruması olmadan servis edilirdi.
   */
  it('/giris §8.14 başlıklarını TAŞIR', async () => {
    oturumYok();
    const yanit = await middleware(istek(LOGIN_PATH));

    expect(yanit.headers.get('x-frame-options')).toBe('DENY');
    expect(yanit.headers.get('x-content-type-options')).toBe('nosniff');
    expect(yanit.headers.get('permissions-policy')).toContain('camera=()');
  });

  it('/giris noindex ALMAZ — public bir sayfadır', async () => {
    oturumYok();
    expect((await middleware(istek(LOGIN_PATH))).headers.get('x-robots-tag')).toBeNull();
  });

  it('§8.12 — test ortamında HSTS eklenmez', async () => {
    oturumYok();
    const yanit = await middleware(istek('/', { 'x-forwarded-proto': 'https' }));

    expect(yanit.headers.get('strict-transport-security')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Matcher deseni
// ---------------------------------------------------------------------------

describe('middleware — matcher deseni', () => {
  const matcher = config.matcher[config.matcher.length - 1] as string;

  it('tek bir desen olarak dışa aktarılır', () => {
    // Korunan yollar ayrıca: genel desen uzantılı yolları atlıyor.
    expect(config.matcher.slice(0, -1)).toEqual(['/panel/:path*', '/api/v1/panel/:path*']);
    expect(typeof matcher).toBe('string');
  });

  it('kaynak dosyada değişmez dize sabiti olarak yazılmıştır', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'src/middleware.ts'), 'utf8');
    const sourceLiteral = JSON.stringify(matcher).slice(1, -1);

    expect(source).toContain('matcher: [');
    expect(source).toContain(sourceLiteral);
  });

  describe('kapsam', () => {
    const pattern = new RegExp(`^${matcher}$`);

    it('§8.5 — /panel ve /api/v1/panel KAPSAR', () => {
      expect(pattern.test('/panel')).toBe(true);
      expect(pattern.test('/panel/muhasebe')).toBe(true);
      expect(pattern.test('/api/v1/panel')).toBe(true);
      expect(pattern.test('/api/v1/panel/islem')).toBe(true);
    });

    it('/giris ve /api/auth/* KAPSAR — başlıkları alsınlar diye', () => {
      expect(pattern.test('/giris')).toBe(true);
      expect(pattern.test('/api/auth/signin')).toBe(true);
    });

    it('public sayfaları KAPSAR', () => {
      expect(pattern.test('/')).toBe(true);
      expect(pattern.test('/projeler')).toBe(true);
    });

    /** T-004 kazanımı — Coolify ve Uptime Kuma kimliksiz yoklar. */
    it('/api/v1/health KAPSAMAZ', () => {
      expect(pattern.test('/api/v1/health')).toBe(false);
      expect(pattern.test('/api/v1/health/')).toBe(false);
    });

    it('istisna dardır — /api/v1/healthcheck KAPSANIR', () => {
      expect(pattern.test('/api/v1/healthcheck')).toBe(true);
    });

    it('derleme çıktısını ve statik dosyaları KAPSAMAZ', () => {
      expect(pattern.test('/_next/static/chunks/main.js')).toBe(false);
      expect(pattern.test('/_next/image')).toBe(false);
      expect(pattern.test('/favicon.ico')).toBe(false);
      expect(pattern.test('/robots.txt')).toBe(false);
      expect(pattern.test('/og-kapak.png')).toBe(false);
    });
  });
});
