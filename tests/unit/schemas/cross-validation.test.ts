import { describe, expect, it } from 'vitest';

import * as z from 'zod';

import { partialWithoutDefaults, tagsSchema, updateGoalSchema } from '@/lib/schemas';

/**
 * Çapraz kurallar GÜNCELLEME yolunda da işlemeli.
 *
 * Bu ayrı bir dosya çünkü en olası regresyon burada: `.partial()` uygulanınca
 * alanlar `undefined` olabilir ve dikkatsiz yazılmış bir refine ya sessizce
 * atlanır ya da geçerli kısmi güncellemeyi yanlışlıkla reddeder. İki yönü de
 * ayrı ayrı doğrulanıyor.
 */

const ID = 'clx0000000000000000000001';

describe('updateGoalSchema — ACHIEVED ↔ progress', () => {
  it('ACHIEVED + progress 40 reddedilir', () => {
    expect(updateGoalSchema.safeParse({ id: ID, status: 'ACHIEVED', progress: 40 }).success).toBe(
      false,
    );
  });

  it('ACHIEVED + progress 100 geçerli', () => {
    expect(updateGoalSchema.safeParse({ id: ID, status: 'ACHIEVED', progress: 100 }).success).toBe(
      true,
    );
  });

  it('ACHIEVED tek başına geçerli — progress dokunulmamış sayılır', () => {
    // Kısmi güncellemede `progress` gönderilmediyse mevcut değer korunur;
    // şema burada karar veremez, servis katmanı bütünlüğü sağlar.
    expect(updateGoalSchema.safeParse({ id: ID, status: 'ACHIEVED' }).success).toBe(true);
  });

  it('progress tek başına geçerli', () => {
    expect(updateGoalSchema.safeParse({ id: ID, progress: 55 }).success).toBe(true);
  });
});

describe('REGRESYON: kısmi güncelleme varsayılan ENJEKTE ETMEZ', () => {
  it('updateGoalSchema yalnızca gönderilen alanları döndürür', () => {
    const parsed = updateGoalSchema.parse({ id: ID, title: 'Yeni hedef' });
    expect(parsed).toEqual({ id: ID, title: 'Yeni hedef' });
  });

  it('create şemalarında varsayılanlar HÂLÂ uygulanır, kısmi şemada uygulanmaz', () => {
    const taban = z.object({
      title: z.string(),
      status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
      tags: tagsSchema,
    });
    expect(taban.parse({ title: 'X' })).toEqual({ title: 'X', status: 'DRAFT', tags: [] });
    // Düzeltmeden önce `.partial()` `status: 'DRAFT'` ve `tags: []` enjekte ediyordu:
    // yalnızca başlık düzenlemek yayındaki kaydı taslağa düşürürdü.
    expect(partialWithoutDefaults(taban).parse({ title: 'Y' })).toEqual({ title: 'Y' });
  });
});
