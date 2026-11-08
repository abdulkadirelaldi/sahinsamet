import { cachedRead, entityTag } from './_shared/content-cache';
import { fetchProfile } from './profile';

/**
 * ÖNBELLEK KATMANI — public sayfanın çağırdığı okumalar (ADR-011).
 *
 * NEDEN AYRI DOSYA (BULGU-012): `next/cache` yalnızca Next çalışma zamanında
 * çözülebilir. `services/**` altındaki her modül çalışma zamanından bağımsız —
 * TEK İSTİSNA bu dosya ve `_shared/content-cache.ts`. Seed ve cron betikleri
 * `fetchProfile`ı güvenle içe aktarır; `getProfile`ı aktarmaz.
 * Kural `tests/unit/services/runtime-bagimsizligi.test.ts` ile zorlanıyor.
 *
 * ETİKET: tek girdi, tek etiket — `content:profile`. Panelde profil
 * kaydedilince `revalidateContent('profile')` aynı etiketi düşürür.
 */
export const getProfile = cachedRead(
  () => fetchProfile(),
  () => ({
    keyParts: ['profile'],
    tags: [entityTag('profile')],
  }),
);
