import * as z from 'zod';

import { AttachmentEntity } from '@/types';

import { cuidSchema, orderSchema, paginationSchema } from './common';

/**
 * `Attachment` (ADR-018) — R2 nesnesi.
 *
 * `url` ALANI YOKTUR ve şemaya da EKLENMEZ. §8.11 private bucket + 15 dk imzalı
 * URL istiyor; kalıcı URL ya bayat olurdu ya da bucket'ın public olduğu anlamına
 * gelirdi. İmzalı URL istek anında `key`den üretilir.
 */

/**
 * §8.11 — yalnızca izin verilen tipler. Tespit UZANTIDAN DEĞİL İÇERİKTEN
 * (`_shared/file-type.ts`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `image/svg+xml` LİSTEDEN ÇIKARILDI — ADR-043
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-037'de riski ölçüp karara bıraktım; karar ÇIKARMAK oldu ve üç gerekçesi var:
 *
 * 1. SEZGİSEL TESPİT BU PROJENİN KENDİ DOSYASINDA KIRILDI. SVG'nin sihirli
 *    baytı yok; metin biçimi olduğu için yorum/bildirim/DOCTYPE ile
 *    başlayabiliyor. `src/app/icon.svg`in `<svg` etiketi 514. bayttaydı ve ilk
 *    uygulamam o dosyayı tanımıyordu. Diğer beş tip sabit imzayla KESİN
 *    tanınıyor; SVG tahmine dayanıyordu.
 * 2. BETİK ÇALIŞTIRABİLEN TEK TİP. İmzalı adresle doğrudan açıldığında tarayıcı
 *    SVG içindeki `<script>`i çalıştırır.
 * 3. İHTİYAÇ ÖLÇÜLMEDİ. Frontend T-109h'te ölçtü: eksik olan şey görsel yükleme
 *    değil, logo verisinin MODELİ.
 *
 * ⚠️ GÜVEN SINIRI "KİM YAZDI", "HANGİ TİP" DEĞİL: depodaki SVG'ler (ikonlar,
 * `icon.svg`) etkilenmiyor — onlar bizim yazdığımız, derlemeye giren
 * dosyalar. Çıkarılan şey YÜKLENEN SVG.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
] as const;

/** §8.11 — 10 MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const createAttachmentSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, { error: 'Dosya anahtarı zorunludur.' })
    .max(512, { error: 'Dosya anahtarı çok uzun.' }),
  mime: z.enum(ALLOWED_MIME_TYPES, {
    error: 'Bu dosya tipi kabul edilmiyor (JPEG, PNG, WebP, AVIF, PDF).',
  }),
  size: z
    .number()
    .int({ error: 'Dosya boyutu geçersiz.' })
    .positive({ error: 'Dosya boş olamaz.' })
    .max(MAX_UPLOAD_BYTES, { error: 'Dosya en fazla 10 MB olabilir.' }),
  checksum: z.string().regex(/^[a-f0-9]{64}$/, { error: 'Sağlama toplamı geçersiz.' }),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  entity: z.enum(AttachmentEntity, { error: 'Geçersiz bağlantı türü.' }),
  entityId: cuidSchema,
  order: orderSchema,
});

/**
 * YÜKLEME — `POST /api/v1/panel/eklenti` formunun METİN alanları (ADR-044).
 *
 * ⚠️ `key`, `mime`, `size`, `checksum`, `width`, `height` BURADA YOK ve bu
 * kararın kalbi: anahtarı SUNUCU üretiyor (istemcinin dosya adı anahtara hiç
 * girmiyor — yol kaçışı ve `.html` uzantısı sınıfı böyle kapanıyor), geri
 * kalan her şeyi baytlardan SUNUCU belirliyor. İstemcinin beyanını kabul
 * etmek, `mime: 'image/png'` diyen bir yürütülebilir dosyayı kaydetmek olurdu.
 *
 * T-037'nin iki adımlı şemaları (`uploadRequestSchema`, `confirmUploadSchema`)
 * ADR-044 ile kalktı: tarayıcıdan doğrudan R2'ye PUT, CORS tanımlı olmadığı
 * için hiçbir tarayıcıdan çalışmıyordu (ölçüldü: ön uçuş 403).
 */
export const uploadFormSchema = z.object({
  entity: z.enum(AttachmentEntity, { error: 'Geçersiz bağlantı türü.' }),
  entityId: cuidSchema,
  order: orderSchema,
});

export const updateAttachmentSchema = z.object({
  id: cuidSchema,
  order: orderSchema.optional(),
  entityId: cuidSchema.optional(),
});

export const attachmentFilterSchema = paginationSchema.extend({
  entity: z.enum(AttachmentEntity).optional(),
  entityId: cuidSchema.optional(),
  mime: z.enum(ALLOWED_MIME_TYPES).optional(),
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
export type UploadFormInput = z.infer<typeof uploadFormSchema>;
export type UpdateAttachmentInput = z.infer<typeof updateAttachmentSchema>;
export type AttachmentFilterInput = z.infer<typeof attachmentFilterSchema>;
