import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/server/services';

/**
 * sitemap.xml — §4.1. Site tek sayfa: yalnızca `/`.
 *
 * KURAL: sitemap yalnızca 200 dönen adresleri bildirir. `/giris`, `/panel` ve
 * `/api` bilerek yok (robots.txt onları kapatıyor). Yeni bir public sayfa
 * eklenirse yayına girdiği turda buraya eklenir — önceden değil.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: absoluteUrl('/'), changeFrequency: 'monthly', priority: 1 }];
}
