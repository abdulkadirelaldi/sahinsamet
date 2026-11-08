import * as z from 'zod';

import { cuidSchema, dayDateSchema, paginationSchema, partialWithoutDefaults } from './common';

/**
 * `HabitLog` (ADR-021).
 *
 * `done Boolean` YOKTUR — yerine `count`. "Yapıldı" artık `count > 0` demektir;
 * böylece günde birden çok kez yapılan alışkanlıklar (su, kitap) modellenebilir.
 * `@@unique([habitId, date])` aynı güne çift kaydı engeller — ilk taslakta bu
 * kısıt eksikti.
 */
const habitLogBase = z.object({
  habitId: cuidSchema,
  date: dayDateSchema,
  count: z
    .number()
    .int({ error: 'Sayı tam sayı olmalıdır.' })
    .min(0, { error: 'Sayı negatif olamaz.' })
    .max(1440, { error: 'Sayı geçersiz.' })
    .default(1),
});

export const createHabitLogSchema = habitLogBase;
export const updateHabitLogSchema = partialWithoutDefaults(habitLogBase).extend({ id: cuidSchema });

/** Panelde en sık kullanılan eylem: bir günü işaretle / sayacı artır. */
export const toggleHabitLogSchema = z.object({
  habitId: cuidSchema,
  date: dayDateSchema,
});

/**
 * Günlük listedeki tek dokunuş (2026-10-29): YAPTIM (sayılı alışkanlıkta
 * hedefe tamamlar), YAPMADIM (açık işaret — satır kalır), TEMİZLE (işareti
 * kaldırır).
 */
export const setHabitDayStatusSchema = z.object({
  habitId: cuidSchema,
  date: dayDateSchema,
  durum: z.enum(['YAPTIM', 'YAPMADIM', 'TEMIZLE'], { error: 'Geçersiz işaret.' }),
});

/** Süreli alışkanlığa sonradan dakika ekleme (2026-11-02). */
export const sureEkleSchema = z.object({
  habitId: cuidSchema,
  date: dayDateSchema,
  dakika: z
    .number()
    .int({ error: 'Süre tam dakika olmalıdır.' })
    .min(1, { error: 'Süre en az 1 dakika olmalıdır.' })
    .max(1440, { error: 'Süre bir günü geçemez.' }),
});

export const sayacBaslatSchema = z.object({ habitId: cuidSchema });

/** `dakika` verilirse ölçülen süre yerine o yazılır; `0` sayacı kaydetmeden kapatır. */
export const sayacDurdurSchema = z.object({
  habitId: cuidSchema,
  dakika: z
    .number()
    .int({ error: 'Süre tam dakika olmalıdır.' })
    .min(0, { error: 'Süre negatif olamaz.' })
    .max(1440, { error: 'Süre bir günü geçemez.' })
    .optional(),
});

export const habitLogFilterSchema = paginationSchema.extend({
  habitId: cuidSchema.optional(),
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
});

export type CreateHabitLogInput = z.infer<typeof createHabitLogSchema>;
export type UpdateHabitLogInput = z.infer<typeof updateHabitLogSchema>;
export type ToggleHabitLogInput = z.infer<typeof toggleHabitLogSchema>;
export type HabitLogFilterInput = z.infer<typeof habitLogFilterSchema>;
export type SetHabitDayStatusInput = z.infer<typeof setHabitDayStatusSchema>;
export type SureEkleInput = z.infer<typeof sureEkleSchema>;
export type SayacDurdurInput = z.infer<typeof sayacDurdurSchema>;
