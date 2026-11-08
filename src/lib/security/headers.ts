/**
 * Güvenlik başlıkları — TEK NOKTA.
 *
 * PROGRAM.md §8.7 (panel `noindex`), §8.12 (HSTS), §8.14 (çerçeveleme, MIME,
 * yönlendiren, izinler). Başka hiçbir dosyada güvenlik başlığı yazılmaz;
 * `middleware.ts` yalnızca burayı okur ve uygular.
 *
 * §8.13 — nonce tabanlı CSP T-060'ta geldi (`buildContentSecurityPolicy`).
 * F0'da bilerek ertelenmişti: React Bits (§5) kurulmadan yazılacak bir CSP
 * ya F2'de çökerdi ya da `unsafe-inline` tavizi verdirirdi (STATUS.md R1).
 * T-060'ta envanter çıkarıldı: uygulama kodunda satır içi `<script>` YOK,
 * `dangerouslySetInnerHTML` §2 gereği yasak, fontlar yerel, dış köken yok.
 *
 * Bu modül saf (pure) tutulur: `next/server` dahil hiçbir çalışma zamanına
 * bağımlı değildir, bu yüzden DB'siz ve `.env`'siz test edilebilir.
 */

/**
 * Panel kökleri. Bir yol bunlardan biriyle *segment sınırında* eşleşiyorsa
 * panel sayılır (§8.5).
 */
export const PANEL_PATH_PREFIXES = ['/panel', '/api/v1/panel'] as const;

/**
 * Yolun panele ait olup olmadığı.
 *
 * Düz `startsWith` KULLANILMAZ: `/paneller` veya `/panel-demo` gibi bir public
 * rota `/panel` ile başlar ama panel değildir. Böyle bir yol yanlışlıkla
 * `noindex` alırsa sessizce arama sonuçlarından düşer. Eşleşme yalnızca yolun
 * tam kendisi ya da ardından `/` gelen hâli için geçerlidir.
 */
export function isPanelPath(pathname: string): boolean {
  return PANEL_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * §8.14 — her yanıtta bulunan taban başlıklar.
 *
 * Yalnızca panele değil public tarafa da uygulanır: tıklama hırsızlığı
 * (clickjacking) ve MIME koklama (sniffing) public sayfalar için de geçerli
 * risklerdir, panelle sınırlı değildir.
 */
export const BASELINE_SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  // Sayfa hiçbir yerde çerçevelenemez — panelde tıklama hırsızlığına karşı.
  'X-Frame-Options': 'DENY',
  // Tarayıcı `Content-Type`'ı tahmin etmeye çalışmasın (yüklenen dosyalar için kritik).
  'X-Content-Type-Options': 'nosniff',
  // Dış siteye yalnızca köken gider; panel yolları yönlendirende sızmaz.
  'Referrer-Policy': 'strict-origin-when-cross-origin',
});

/**
 * §8.14 — kısıtlı `Permissions-Policy`.
 *
 * Politika reddetme (deny-by-default) mantığıyla yazıldı: v1'de bu
 * yeteneklerin hiçbirine ihtiyaç yok (§1.2 kapsam dışı listesi), bu yüzden
 * hepsi kapatılır. Bir özellik gerektiğinde buraya açıkça eklenir — tek istisna
 * `publickey-credentials-get=(self)` (Face ID ile giriş).
 * `screen-wake-lock=(self)` (antrenmanda ekran açık kalsın).
 */
export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=()',
  // 2026-10-30: Face ID ile giriş (passkey) — YALNIZCA aynı köken; başka
  // sitenin çerçevesi bu siteye ait passkey'i isteyemez. `()` iken giriş
  // sayfasında WebAuthn tarayıcıda kapalıydı (e2e ile ölçüldü).
  'publickey-credentials-get=(self)',
  'screen-wake-lock=(self)',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

/**
 * Panelde mikrofon AYNI KÖKENE açık (2026-11-06): İngilizce konuşma alıştırması tarayıcının
 * konuşma tanımasını kullanıyor. Yol başına değil panelin tamamına: panel istemci tarafında
 * gezindiği için politika ilk açılan sayfanın belgesinden gelir, `/panel`den gelinen
 * İngilizce sayfasında mikrofon kapalı kalırdı. Herkese açık site kapalı kalır.
 */
export const PANEL_PERMISSIONS_POLICY = PERMISSIONS_POLICY.replace(
  'microphone=()',
  'microphone=(self)',
);

/**
 * §8.7 — panel yanıtları arama motorlarına kapalı.
 * `robots.txt`'teki `Disallow` yalnızca bir ricadır; başlık bağlayıcıdır.
 */
export const PANEL_ROBOTS_HEADER = 'noindex, nofollow';

/**
 * §8.12 — HSTS.
 *
 * `preload` BİLEREK YOK. Preload listesine girmek pratikte geri alınamaz
 * (çıkış aylar sürer) ve tüm alt alan adlarının kalıcı HTTPS olmasını şart
 * koşar. `panel.` alt alan adı kararı (STATUS.md Q1) henüz verilmedi.
 * `preload` F7'de, domain ve SSL kesinleştikten sonra eklenir (T-072).
 */
export const HSTS_VALUE = 'max-age=63072000; includeSubDomains';

export interface SecurityHeaderContext {
  /** İstek yolu — `request.nextUrl.pathname`. */
  pathname: string;
  /** `NODE_ENV === 'production'` mı? */
  isProduction: boolean;
  /** İstek HTTPS üzerinden mi geldi? */
  isHttps: boolean;
}

/**
 * Bir istek için uygulanacak başlık kümesi.
 *
 * HSTS yalnızca üretimde VE HTTPS'te eklenir: yerelde `http://localhost`
 * üzerinde gönderilirse tarayıcı alan adını kalıcı olarak HTTPS'e sabitler ve
 * geliştirme ortamı erişilemez hâle gelir — temizlemesi elle tarayıcı ayarı
 * gerektirir.
 */
export function buildSecurityHeaders(context: SecurityHeaderContext): Record<string, string> {
  const headers: Record<string, string> = {
    ...BASELINE_SECURITY_HEADERS,
    'Permissions-Policy': PERMISSIONS_POLICY,
  };

  if (context.isProduction && context.isHttps) {
    headers['Strict-Transport-Security'] = HSTS_VALUE;
  }

  if (isPanelPath(context.pathname)) {
    headers['X-Robots-Tag'] = PANEL_ROBOTS_HEADER;
    headers['Permissions-Policy'] = PANEL_PERMISSIONS_POLICY;
  }

  return headers;
}

/**
 * İsteğin HTTPS olup olmadığı.
 *
 * Coolify (§13.3) ters vekil sunucu olarak TLS'i sonlandırır; uygulamaya istek
 * düz HTTP olarak ulaşır ve gerçek şema `x-forwarded-proto` ile taşınır.
 *
 * Bu başlık istemci tarafından uydurulabilir — ancak buradaki tek etkisi HSTS
 * başlığının EKLENMESİdir. Sahte `https` değeri korumayı zayıflatmaz (düz HTTP
 * üzerinden gelen HSTS'i tarayıcı zaten yok sayar), sahte `http` değeri ise
 * yalnızca kendi isteğinden HSTS'i düşürür. Yani burada güven sınırı yoktur.
 *
 * NOT: Hız sınırlama ve giriş kilidi için istemci IP'si okunurken durum
 * TAMAMEN farklıdır — orada `x-forwarded-for` gerçek bir güven sınırıdır ve
 * doğrudan okunması §8.4/§8.15/§8.16'yı delerdi. O yardımcı T-014'te,
 * güvenilir vekil sayısı bilinerek yazılacak.
 */
export function isHttpsRequest(forwardedProto: string | null, urlProtocol: string): boolean {
  if (forwardedProto) {
    // Vekil zinciri virgülle ayrılmış liste bırakabilir; ilki istemciye en yakın olandır.
    const first = forwardedProto.split(',')[0]?.trim().toLowerCase();
    return first === 'https';
  }

  return urlProtocol === 'https:';
}

/* ===========================================================================
 * §8.13 — CONTENT-SECURITY-POLICY (T-060)
 * ======================================================================== */

/**
 * İstek başına nonce — 128 bit rastgelelik, base64.
 *
 * `crypto.getRandomValues` Edge ve Node'da ortak; `node:crypto` ara katmanda
 * (Edge) yok. Nonce TAHMİN EDİLEMEZ olmalı ve HER YANITTA farklı olmalı —
 * sabit ya da yeniden kullanılan bir nonce, `unsafe-inline`dan farksızdır.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let ikili = '';
  for (const b of bytes) ikili += String.fromCharCode(b);
  return btoa(ikili);
}

export interface CspContext {
  nonce: string;
  isProduction: boolean;
  isHttps: boolean;
  /**
   * Analitik (Umami) kökeni — yalnızca `analitikAyari()` doğrulanmış bir köken
   * döndürdüyse. `connect-src`e eklenir: betik ölçümü bu kökene gönderiyor.
   * `script-src`e EKLENMEZ: `'strict-dynamic'` altında köken izinleri yok
   * sayılıyor, betik nonce'la yükleniyor.
   */
  analitikKoken?: string;
}

/**
 * CSP başlık değeri — SAF.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KARARLAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `script-src 'nonce-…' 'strict-dynamic'` — `unsafe-inline` YOK (§8.13'ün
 *   asıl şartı). Next.js, istek başlığındaki CSP'den nonce'u okuyup kendi
 *   betiklerine basıyor; `strict-dynamic` o betiklerin yüklediği parçaları
 *   (chunk) zincirleme güvenilir sayıyor. `'self'` yalnızca `strict-dynamic`i
 *   tanımayan eski tarayıcılar için geri dönüş — destekleyenler onu yok sayar.
 *
 * `style-src 'unsafe-inline'` — BİLİNÇLİ TAVİZ, ve §8.13 ile ÇELİŞMİYOR:
 *   madde yalnızca SCRIPT için yasaklıyor. React'in `style={{…}}` öznitelikleri
 *   (grafik geometrisi, alışkanlık rengi, iskelet yüksekliği) nonce ALAMAZ —
 *   CSP öznitelik stillerine nonce uygulamıyor. Stil enjeksiyonu betik
 *   çalıştıramaz; kalan risk (CSS ile veri sızdırma) `connect-src`/`img-src`
 *   'self' olduğu için dışarı çıkış yolu bulamıyor.
 *
 * `img-src 'self' data: blob:` — `next/image` ve iskeletler. R2 imzalı
 *   adresleri bugün HİÇBİR ekran çizmiyor (T-037f bekliyor); o arayüz
 *   geldiğinde R2 kökeni BURAYA ve `connect-src`e (doğrudan PUT) eklenmeli.
 *   Kullanılmayan bir izni şimdiden açmak, gereksiz açık bir kapı olurdu.
 *
 * `frame-ancestors 'none'` — `X-Frame-Options: DENY`in CSP karşılığı; ikisi
 *   birlikte, çünkü eski tarayıcı yalnızca birini tanıyor.
 *
 * GELİŞTİRME: React'in geliştirme yapısı `eval` kullanıyor ve HMR `ws:`
 *   üzerinden bağlanıyor. İkisi YALNIZCA `isProduction === false` iken; üretim
 *   politikasında bulunmaları testle kilitli.
 */
export function buildContentSecurityPolicy(context: CspContext): string {
  const { nonce, isProduction, isHttps, analitikKoken } = context;

  const direktifler: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...(isProduction ? [] : ["'unsafe-eval'"]),
      ],
    ],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:']],
    ['font-src', ["'self'"]],
    [
      'connect-src',
      ["'self'", ...(analitikKoken ? [analitikKoken] : []), ...(isProduction ? [] : ['ws:'])],
    ],
    ['worker-src', ["'self'", 'blob:']],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];

  const satirlar = direktifler.map(([ad, degerler]) => `${ad} ${degerler.join(' ')}`);

  /*
   * Yalnızca üretim + HTTPS: yerelde `http://localhost`ta alt kaynakları
   * HTTPS'e yükseltmek geliştirme sunucusunu kırar (HSTS ile aynı gerekçe).
   */
  if (isProduction && isHttps) satirlar.push('upgrade-insecure-requests');

  return satirlar.join('; ');
}
