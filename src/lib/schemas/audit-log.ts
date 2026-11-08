import * as z from 'zod';

import { AuditAction } from '@/types';

import {
  cuidSchema,
  dayDateSchema,
  paginationSchema,
  shortTextSchema,
  sortDirectionSchema,
} from './common';

/**
 * `AuditLog` (§8.19, ADR-020) — tüm panel mutasyonları buraya yazılır.
 *
 * `diff` alanı ALAN ADI BAZLI REDAKSİYONDAN geçmiş olmalıdır (§8.20).
 * Redaksiyon T-015'teki yardımcının işidir; bu şema `diff`'i doğrulayamaz
 * (şekli varlığa göre değişir) ama redakte edilecek alan adlarını
 * SÖZLEŞME OLARAK burada yayınlar — tek liste, iki yerde tutulmaz.
 */

/** §8.20 — bu adları taşıyan her alan `diff` içinde maskelenir. */
export const REDACTED_FIELD_NAMES = [
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'totpSecret',
  'totpBackupCodes',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'email',
] as const;

export type RedactedFieldName = (typeof REDACTED_FIELD_NAMES)[number];

/**
 * `diff` serbest şekillidir çünkü her varlık için farklıdır.
 * `z.unknown()` GEREKÇESİ: burada şekli bilmek mümkün değil ve `any` yasak (§2).
 * Güvenlik, şekil doğrulamasıyla değil REDAKSİYONLA sağlanır.
 */
export const auditDiffSchema = z.record(z.string(), z.unknown());

export const createAuditLogSchema = z.object({
  actorId: cuidSchema.optional(),
  actorEmailHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  action: z.enum(AuditAction, { error: 'Geçersiz denetim eylemi.' }),
  entity: shortTextSchema.min(1, { error: 'Varlık adı zorunludur.' }),
  entityId: cuidSchema.optional(),
  diff: auditDiffSchema.optional(),
  ip: z.string().trim().max(64).optional(),
  userAgent: z.string().trim().max(512).optional(),
});

/** Denetim kaydı değiştirilemez. Güncelleme şeması bilerek boştur. */
export const updateAuditLogSchema = z.object({});

/**
 * Denetim kaydı listesi filtresi — §4.2 denetim ekranı (T-052).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TARİH ARALIĞI GÜN CİNSİNDEN; ANA ÇEVİRME SUNUCUDA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `from`/`to` `YYYY-MM-DD` alır, `instantSchema` DEĞİL. İki sebep:
 *
 *  1. Filtreyi kullanan insan gün seçer, an seçmez. Arayüzden ISO damga
 *     istemek, tarayıcının zaman dilimine göre değişen bir değer üretirdi —
 *     Europe/Istanbul'da olmayan bir makineden bakıldığında filtre sessizce
 *     kayardı (ADR-016'nın kapattığı sınıf).
 *  2. Gün → an dönüşümü TEK YERDE yaşıyor: `appDayRangeToInstantFilter`.
 *     `createdAt` bir `DateTime` ve UTC gece yarısını sınır almak o günün ilk
 *     üç saatini sessizce düşürüyor — ölçüldü, gerekçe `_shared/app-date.ts`te.
 *     Dönüşümü istemciye bırakmak o tuzağı arayüze taşımak olurdu.
 *
 * `to` DAHİL semantiği taşır; dışlayıcı üst sınıra çeviren servis.
 *
 * ⚠️ ADR-033 (`booleanFilterSchema`) BURADA UYGULANMIYOR, ÇÜNKÜ BOOLE YOK.
 * Denetim kaydı değiştirilemez (`updateAuditLogSchema` boş) ve okunmuş/
 * arşivlenmiş gibi bir durum alanı taşımıyor; süzülecek her alan ya enum, ya
 * kimlik, ya gün. Konvansiyona uymanın yolu burada BİR BOOLE UYDURMAMAK —
 * `hasDiff` gibi bir bayrak eklemek, ADR-033'ü anmak için var olmayan bir
 * ihtiyaç icat etmek olurdu. Bir gün boole eklenirse `booleanFilterSchema`
 * zorunludur (`z.coerce.boolean()` "false" → `true` veriyor, T-038 ölçümü).
 */
export const auditLogFilterSchema = paginationSchema
  .extend({
    action: z.enum(AuditAction).optional(),
    entity: shortTextSchema.optional(),
    entityId: cuidSchema.optional(),
    actorId: cuidSchema.optional(),
    /** Dahil — o günün Istanbul'daki ilk anından itibaren. */
    from: dayDateSchema.optional(),
    /** DAHİL — o günün Istanbul'daki son anına kadar. */
    to: dayDateSchema.optional(),
    sort: sortDirectionSchema,
  })
  /*
   * Ters aralık SESSİZCE boş liste döndürmesin. `from > to` yazan biri
   * "kayıt yok" sanır ve filtresini değil verisini sorgulamaya başlar;
   * `dateRangeSchema` aynı kuralı aynı mesajla koyuyor (tek kural, iki yerde
   * yazılmıyor — kontrol `tests/unit/schemas` tarafında sabit).
   */
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    error: 'Bitiş tarihi, başlangıç tarihinden önce olamaz.',
    path: ['to'],
  });

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
export type UpdateAuditLogInput = z.infer<typeof updateAuditLogSchema>;
export type AuditLogFilterInput = z.infer<typeof auditLogFilterSchema>;
