import type { MetadataRoute } from 'next';

import { absoluteUrl, getSiteUrl } from '@/server/services';

/**
 * robots.txt — §8.7'nin ikinci yarısı.
 *
 * T-004 `X-Robots-Tag` BAŞLIĞINI kurdu; o, sayfa ÇEKİLDİĞİNDE indekslemeyi
 * engeller. robots.txt ise taramayı en baştan engeller. İkisi farklı katman ve
 * ikisi de gerekli: başlık tek başına, botun sayfayı çekmesini önlemez;
 * robots.txt tek başına, kuralı yok sayan botları durdurmaz.
 *
 * `/panel` ve `/api` KAPALI. `/giris` de kapalı: Frontend `robots: noindex`
 * meta'sı koydu, ama giriş sayfasının arama sonuçlarında görünmesi hem
 * gereksiz hem de saldırgana hedef gösterir.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/panel', '/api', '/giris'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: getSiteUrl(),
  };
}
