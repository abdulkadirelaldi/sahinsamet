import { PANEL_BASLIGI, panelYolu } from '@/components/theme';
import { NextResponse, type NextRequest } from 'next/server';

import { analitikAyari } from '@/lib/analitik';
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  generateNonce,
  isHttpsRequest,
  isPanelPath,
} from '@/lib/security/headers';
import { readSession } from '@/lib/security/session';
import { requiresTwoFactorSetup, TWO_FACTOR_SETUP_PATH } from '@/lib/security/two-factor';

/**
 * Kenar (edge) ara katmanı — PROGRAM.md §8.5, §8.7, §8.12, §8.14.
 *
 * KONUM NOTU: Proje `src/` dizini kullandığı için Next.js bu dosyayı
 * `src/middleware.ts` yolunda arar — depo kökünde duran bir `middleware.ts`
 * sessizce yok sayılır. `tests/e2e/security-headers.spec.ts` bunu gerçek
 * sunucu yanıtı üzerinden doğrular.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ §8.6 — BU KATMAN BİR KOLAYLIKTIR, YETKİLENDİRME SINIRI DEĞİLDİR.      │
 * │                                                                       │
 * │ Buradaki kontrol yalnızca oturum çerezinin GEÇERLİ olduğunu söyler.   │
 * │ Söylemediği şeyler: kullanıcı hâlâ var mı, hesabı kilitli mi          │
 * │ (`lockedUntil`), 2FA'sı geçerli mi, o kayda erişim hakkı var mı.      │
 * │ JWT stratejisi (ADR-013) gereği jeton ömrü boyunca kendi başına       │
 * │ geçerli kalır — kullanıcı silinse bile. Ömür §8.3'te **24 saat**      │
 * │ (ADR-035/A; eskiden 7 gündü). Süre kısaldı ama BU KATMANIN            │
 * │ GEREKÇESİ DEĞİŞMEDİ: kısalan şey maruziyet penceresi, ara katmanın    │
 * │ bilemediği şeylerin listesi değil.                                    │
 * │                                                                       │
 * │ Bu yüzden HER Server Action ve HER Server Component kendi `auth()`    │
 * │ kontrolünü AYRICA yapar. Server Action'lar matcher'dan bağımsız birer │
 * │ HTTP ucudur; bu dosya onları hiç görmez.                              │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * §8.13 — nonce tabanlı CSP (T-060). Nonce İSTEK BAŞINA üretilir ve İKİ yere
 * yazılır: İSTEK başlığına (Next.js oradaki CSP'den nonce'u okuyup kendi
 * betiklerine basıyor; sayfalar ADR-011 gereği zaten dinamik, nonce bunu
 * şart koşuyor) ve YANIT başlığına (tarayıcının uyguladığı politika).
 */

/** Oturumsuz kullanıcının gönderileceği sayfa — `auth.ts` `pages.signIn` ile aynı. */
export const LOGIN_PATH = '/giris';

/**
 * KORUMA matcher'dan AYRI karar verilir.
 *
 * Matcher neredeyse tüm yolları kapsar çünkü §8.14 başlıkları public tarafa da
 * gerekli (T-004). Korumayı matcher'a bağlasaydık iki kötü seçenek kalırdı:
 * ya `/giris` matcher dışına çıkardı ve **giriş sayfası güvenlik başlıklarını
 * kaybederdi** — sitedeki en hassas public sayfa — ya da yönlendirme döngüsü
 * oluşurdu. Ayrımı burada yapmak ikisini de çözer.
 */
function isProtectedPath(pathname: string): boolean {
  return isPanelPath(pathname);
}

/** Panel API'si mi? Yanıt biçimi buna göre değişir (§7.2). */
function isPanelApiPath(pathname: string): boolean {
  return pathname === '/api/v1/panel' || pathname.startsWith('/api/v1/panel/');
}

/**
 * Giriş sonrası dönülecek yol.
 *
 * YALNIZCA göreli yol kabul edilir. `//kotu.site` veya `https://kotu.site`
 * gibi bir değer buraya girseydi giriş akışı bir açık yönlendirme (open
 * redirect) aracına dönerdi: kurban meşru alan adında giriş yapar, sonra
 * saldırganın sayfasına atılırdı. `//` kontrolü şart — tek eğik çizgi
 * kontrolü protokole bağlı URL'leri kaçırır.
 */
export function safeCallbackPath(pathname: string, search: string): string | null {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return null;
  return `${pathname}${search}`;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = isHttpsRequest(
    request.headers.get('x-forwarded-proto'),
    request.nextUrl.protocol,
  );
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    isProduction,
    isHttps,
    analitikKoken: analitikAyari()?.koken,
  });

  const headers = buildSecurityHeaders({ pathname, isProduction, isHttps });
  headers['Content-Security-Policy'] = csp;

  /*
   * İSTEK başlıkları — Next.js nonce'u `Content-Security-Policy` İSTEK
   * başlığından okuyor; `x-nonce` ise bir Sunucu Bileşeni kendi satır içi
   * betiğini yazmak zorunda kalırsa diye (bugün yok). İstemcinin gönderdiği
   * aynı adlı başlıklar EZİLİYOR — uydurulmuş bir nonce'a güvenilmez.
   */
  const istekBasliklari = new Headers(request.headers);
  istekBasliklari.set('x-nonce', nonce);
  // Başlık dışarıdan da gelebilir: yalnızca gerçek panel yolunda bulunur.
  istekBasliklari.delete(PANEL_BASLIGI);
  if (panelYolu(request.nextUrl.pathname)) istekBasliklari.set(PANEL_BASLIGI, '1');
  istekBasliklari.set('Content-Security-Policy', csp);
  const devam = (): NextResponse => NextResponse.next({ request: { headers: istekBasliklari } });

  const withHeaders = (response: NextResponse): NextResponse => {
    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value);
    }
    return response;
  };

  if (!isProtectedPath(pathname)) {
    return withHeaders(devam());
  }

  const session = await readSession(request, {
    isProduction: process.env.NODE_ENV === 'production',
    secret: process.env.AUTH_SECRET,
  });

  if (session) {
    /**
     * §8.1 — 2FA kurulmamışsa panelin hiçbir bölümü kullanılamaz.
     *
     * Kurulum ekranının kendisi muaftır (`requiresTwoFactorSetup` içinde) —
     * aksi hâlde kullanıcı kuruluma gidemeden sonsuz döngüye girer.
     *
     * ÇIKIŞ YOLU AÇIK KALIR: `/api/auth/*` korumalı değil (matcher içinde ama
     * `isProtectedPath` dışında), dolayısıyla `signOut` her zaman erişilebilir.
     * Kurulum ZORUNLU, ama kullanıcı hapsedilmiş değil — istemiyorsa çıkabilir.
     */
    if (requiresTwoFactorSetup({ pathname, twoFactorEnabled: session.twoFactorEnabled })) {
      /**
       * Panel API'si yönlendirilmez — T-014/K4 ile aynı gerekçe: `fetch`
       * yönlendirmeyi sessizce izler, çağıran HTML'i veri sanar ve gerçek
       * neden kaybolur.
       *
       * `401` DEĞİL `403`: kullanıcı kimliğini KANITLADI (geçerli oturumu var),
       * ama bu kaynağa erişme yetkisi henüz yok. §7.2 ayrımı tam olarak budur.
       */
      if (isPanelApiPath(pathname)) {
        return withHeaders(
          NextResponse.json(
            {
              ok: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Devam etmek için iki adımlı doğrulamayı kurmalısın.',
              },
            },
            { status: 403 },
          ),
        );
      }

      const setupUrl = request.nextUrl.clone();
      setupUrl.pathname = TWO_FACTOR_SETUP_PATH;
      setupUrl.search = '';

      return withHeaders(NextResponse.redirect(setupUrl));
    }

    return withHeaders(devam());
  }

  /**
   * Panel API'si HTML giriş sayfasına YÖNLENDİRİLMEZ.
   *
   * `fetch('/api/v1/panel/...')` bir yönlendirmeyi sessizce izler ve istemciye
   * 200 + HTML döner; çağıran taraf bunu veri sanıp ayrıştırmaya çalışır ve
   * hatanın gerçek nedeni ("oturum yok") kaybolur. §7.2 bu durum için zaten
   * `UNAUTHORIZED` kodunu ve uygun HTTP durumunu tanımlıyor.
   */
  if (isPanelApiPath(pathname)) {
    return withHeaders(
      NextResponse.json(
        {
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'Bu işlem için giriş yapmalısın.' },
        },
        { status: 401 },
      ),
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.search = '';

  const callback = safeCallbackPath(pathname, search);
  if (callback) {
    loginUrl.searchParams.set('callbackUrl', callback);
  }

  return withHeaders(NextResponse.redirect(loginUrl));
}

/**
 * Matcher — kapsayıcı, birkaç açık istisnayla.
 *
 * NEDEN YALNIZCA `/panel/*` DEĞİL: §8.14 başlıkları public tarafta da
 * gereklidir ve `next.config.ts` ortak dosya olduğu için oradan verilemez.
 * `X-Robots-Tag` yine YALNIZCA panel yollarına eklenir; ayrımı `isPanelPath()`
 * yapar. KORUMA ise `isProtectedPath()` ile ayrıca kararlaştırılır.
 *
 * `/giris` ve `/api/auth/*` MATCHER İÇİNDEDİR ama KORUMALI DEĞİLDİR:
 *   - Döngü riski yok — koruma `isProtectedPath()`'e bağlı, matcher'a değil.
 *   - Böylece giriş sayfası ve kimlik uçları §8.14 başlıklarını KAYBETMEZ.
 *     Matcher dışına atsaydık sitedeki en hassas public sayfa
 *     `X-Frame-Options` ve `Referrer-Policy` olmadan servis edilirdi.
 *
 * DIŞARIDA KALANLAR:
 *   - `/api/v1/health` — Coolify ve Uptime Kuma (§13.6–13.7) kimliksiz ve çok
 *     sık yoklar; uç kendi `Cache-Control` ve `X-Robots-Tag` başlıklarını
 *     zaten kendisi yazıyor (T-004 / BULGU-001)
 *   - `_next/static`, `_next/image` — derleme çıktısı
 *   - Statik ve SEO dosyaları — her istekte ara katman çalıştırmak LCP'ye (K1)
 *     bedel yazar, güvenlik kazancı yok
 *
 * Desen `tests/unit/middleware.test.ts` içinde dosyadan okunup doğrulanır.
 */
export const config = {
  matcher: [
    // Korunan yollar ayrıca: aşağıdaki desen dosya uzantısını atlıyor, `/panel/x/a.png` ara
    // katmandan geçmeden sayfaya ulaşıyordu.
    '/panel/:path*',
    '/api/v1/panel/:path*',
    '/((?!api/v1/health(?:/|$)|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|rss\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|map)$).*)',
  ],
};
