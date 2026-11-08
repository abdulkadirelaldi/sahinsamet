import path from 'node:path';

import type { NextConfig } from 'next';

/**
 * PROGRAM.md §13.1 — Docker imajı için `standalone` çıktı zorunlu.
 *
 * NOT (T-001 kapsam sınırı): güvenlik başlıkları (§8.12–8.14, HSTS/CSP/X-Frame-Options)
 * ve `middleware.ts` Güvenlik ajanının mülkiyetindedir (T-004). Buraya `headers()`
 * eklenmemiştir — bilinçli boşluktur.
 */
const nextConfig: NextConfig = {
  // Coolify + Docker dağıtımı için (§13.1)
  output: 'standalone',

  /**
   * Next, çalışma alanı kökünü yukarı doğru lock dosyası arayarak tahmin eder.
   * Depo dışında (örn. ev dizininde) bir `package-lock.json` varsa kökü yanlış
   * seçer ve `standalone` çıktısı eksik/şişkin dosya izlemesiyle üretilir —
   * Docker imajı bozulur. Kökü açıkça bu depoya sabitliyoruz.
   */
  outputFileTracingRoot: path.resolve(__dirname),

  // Derleme sırasında tip ve lint hatalarını asla yutma (§10.6 DoD)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // `next build` kendi lint'ini çalıştırmasın; lint ayrı script (§10.5)
    ignoreDuringBuilds: true,
  },

  // Kaynak haritaları üretimde kapalı — sunucu kodu sızmasın (§8)
  productionBrowserSourceMaps: false,

  // `X-Powered-By: Next.js` başlığı kapalı — gereksiz parmak izi (§8.14)
  poweredByHeader: false,

  reactStrictMode: true,

  /*
   * METADATA <head>'E, HER İSTEMCİDE — ÖLÇÜLDÜ (ADR-045 Lighthouse koşusu).
   * Next 15.5 dinamik sayfalarda metadata'yı AKIŞLA gövdeye basıyor ve yalnızca
   * `htmlLimitedBots` listesindeki botlara <head>'de veriyor. Ana sayfa 5 koşunun
   * 4'ünde `meta-description` denetimini kaybetti (SEO 0.92 < 0.95); T-025'in
   * detay sayfalarındaki SEO 91'i de aynı sebepti. JS çalıştırmayan her tarayıcı
   * ve önizleme botu açısından doğru olan, metadata'nın <head>'de olması.
   * Bedel: sayfa kabuğu metadata çözülene kadar bekler — public metadata ya
   * statik ya da tek önbellekli okuma, ölçülebilir bir gecikme yok.
   */
  htmlLimitedBots: /.*/,

  /*
   * `public/` GÖRSELLERİ ÖNBELLEKTE — ÖLÇÜLDÜ (canlı, 2026-10-22): Next bu
   * dosyaları `max-age=0` ile sunuyor, 3B portre (hero'nun LCP öğesi, 43–88 KB)
   * HER ZİYARETTE yeniden iniyordu. 7 gün taze + 1 gün bayat-sunarken-yenile.
   * Adlar içerik hash'i taşımadığı için `immutable` DEĞİL: görsel değişirse en
   * geç bir hafta içinde yenisi görünür (hemen görünsün isteniyorsa ad değişir).
   * Bu bir GÜVENLİK başlığı değil — o başlıklar yukarıdaki not gereği
   * middleware'de; burada yalnızca önbellek.
   */
  async headers() {
    return [
      {
        // Yalnızca KÖK düzeydeki dosyalar (`public/` düz); `_next/static` iç içe
        // olduğu için eşleşmez ve Next'in kendi `immutable` başlığı korunur.
        source: '/:dosya.:uzanti(webp|png|jpg|jpeg|avif|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
