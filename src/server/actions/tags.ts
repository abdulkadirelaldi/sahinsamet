import { revalidateTag } from 'next/cache';

import { entityTag, type ContentEntity } from '@/server/services/_shared/content-cache';

/**
 * ADR-029 önbellek geçersizleştirme — T-031.
 *
 * NEDEN `_shared.ts`'TEN AYRI DOSYA: `_shared.ts` `auth()` çağırdığı için
 * `next-auth` içe aktarır ve o Vitest'in `node` ortamında yüklenemiyor. Etiket
 * hesabı burada saf kalıyor ve tek başına sınanabiliyor.
 *
 * ⚠️ ADR-029: `revalidateTag` TAM DİZE eşleşir, ÖNEK DEĞİL. Bu yüzden okuma
 * (`cached.ts`) ve düşürme AYNI `entityTag` çağrısından türüyor; ikisi ayrı
 * yazılsaydı bir gün ayrışır ve kaydedilen profil sayfada görünmezdi.
 */

/** Varlığın düşürülecek etiketleri. */
export function contentTagsToDrop(entity: ContentEntity): string[] {
  return [entityTag(entity)];
}

/** Etiketleri düşürür ve düşürdüklerini döndürür (testler için). */
export function revalidateContent(entity: ContentEntity): string[] {
  const tags = contentTagsToDrop(entity);
  for (const tag of tags) revalidateTag(tag);
  return tags;
}
