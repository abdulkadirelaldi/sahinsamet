import * as z from 'zod';

import {
  cuidSchema,
  dayDateSchema,
  decimalSchema,
  mediumTextSchema,
  moodSchema,
  paginationSchema,
  partialWithoutDefaults,
} from './common';

/**
 * `HealthLog` — günlük ölçüm (§4.2 /panel/saglik).
 * `date` günde TEK kayıt (@unique) ve `@db.Date` (ADR-016).
 */
const healthLogBase = z.object({
  date: dayDateSchema,
  weightKg: decimalSchema(3, 2).optional(),
  bodyFatPct: decimalSchema(3, 1).optional(),
  sleepHours: decimalSchema(2, 2).optional(),
  waterMl: z.number().int().min(0).max(20000, { error: 'Su miktarı geçersiz.' }).optional(),
  restingHr: z.number().int().min(20).max(250, { error: 'Nabız geçersiz.' }).optional(),
  steps: z.number().int().min(0).max(200000, { error: 'Adım sayısı geçersiz.' }).optional(),
  mood: moodSchema.optional(),
  note: mediumTextSchema.optional(),
  // Akıllı tartı (2026-10-30)
  bmi: decimalSchema(3, 1).optional(),
  waterPct: decimalSchema(3, 1).optional(),
  muscleKg: decimalSchema(3, 2).optional(),
  boneKg: decimalSchema(2, 2).optional(),
  proteinPct: decimalSchema(3, 1).optional(),
  visceralFat: decimalSchema(3, 1).optional(),
  subcutaneousFatPct: decimalSchema(3, 1).optional(),
  skeletalMusclePct: decimalSchema(3, 1).optional(),
  bmrKcal: z.number().int().min(500).max(6000, { error: 'Bazal metabolizma geçersiz.' }).optional(),
  metabolicAge: z.number().int().min(5).max(120, { error: 'Metabolik yaş geçersiz.' }).optional(),
});

/** Akıllı tartı alanları — tek liste (şema, servis, form, yapay zekâ okuması). */
export const TARTI_ALANLARI = [
  'bmi',
  'waterPct',
  'muscleKg',
  'boneKg',
  'proteinPct',
  'visceralFat',
  'subcutaneousFatPct',
  'skeletalMusclePct',
  'bmrKcal',
  'metabolicAge',
] as const;
export type TartiAlani = (typeof TARTI_ALANLARI)[number];

export const createHealthLogSchema = healthLogBase;
/*
 * TEMİZLENEBİLİR ALANLAR — `null` = "boşalt", `undefined` = "dokunma" (T-031
 * kuralı). `partialWithoutDefaults` alanı yalnızca VERİLMEYEBİLİR yapıyordu;
 * veritabanında boş olabilen bir sütunu temizlemenin yolu YOKTU ve dolu bir
 * alanı formda boşaltmak eski değeri sessizce koruyordu (F5 formları bunu
 * ekranda uyarı olarak yazıyordu). Kural taban şemadan türetiliyor — tek yer.
 */
export const updateHealthLogSchema = partialWithoutDefaults(healthLogBase).extend({
  id: cuidSchema,
  weightKg: healthLogBase.shape.weightKg.nullable(),
  bodyFatPct: healthLogBase.shape.bodyFatPct.nullable(),
  sleepHours: healthLogBase.shape.sleepHours.nullable(),
  waterMl: healthLogBase.shape.waterMl.nullable(),
  restingHr: healthLogBase.shape.restingHr.nullable(),
  steps: healthLogBase.shape.steps.nullable(),
  mood: healthLogBase.shape.mood.nullable(),
  note: healthLogBase.shape.note.nullable(),
  bmi: healthLogBase.shape.bmi.nullable(),
  waterPct: healthLogBase.shape.waterPct.nullable(),
  muscleKg: healthLogBase.shape.muscleKg.nullable(),
  boneKg: healthLogBase.shape.boneKg.nullable(),
  proteinPct: healthLogBase.shape.proteinPct.nullable(),
  visceralFat: healthLogBase.shape.visceralFat.nullable(),
  subcutaneousFatPct: healthLogBase.shape.subcutaneousFatPct.nullable(),
  skeletalMusclePct: healthLogBase.shape.skeletalMusclePct.nullable(),
  bmrKcal: healthLogBase.shape.bmrKcal.nullable(),
  metabolicAge: healthLogBase.shape.metabolicAge.nullable(),
});

export const healthLogFilterSchema = paginationSchema.extend({
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
});

export type CreateHealthLogInput = z.infer<typeof createHealthLogSchema>;
export type UpdateHealthLogInput = z.infer<typeof updateHealthLogSchema>;
export type HealthLogFilterInput = z.infer<typeof healthLogFilterSchema>;

/**
 * Tartı ekran görüntüsü (2026-10-30) — tarayıcıda ≤1568 px JPEG'e küçültülmüş,
 * base64. Tavan ~1 MB: Server Action gövde sınırının (1 MB) altında kalır.
 */
export const tartiGorseliSchema = z.object({
  data: z
    .string()
    .min(100, { error: 'Görsel okunamadı.' })
    .max(1_000_000, { error: 'Görsel çok büyük.' })
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, { error: 'Görsel okunamadı.' }),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
export type TartiGorseliInput = z.infer<typeof tartiGorseliSchema>;
