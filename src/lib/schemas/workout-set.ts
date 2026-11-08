import * as z from 'zod';

import {
  cuidSchema,
  decimalSchema,
  paginationSchema,
  partialWithoutDefaults,
  rpeSchema,
} from './common';

/**
 * `WorkoutSet` — antrenman seti.
 * `@@unique([workoutId, exerciseId, setNo])`.
 *
 * Bu modeldeki her mutasyon `PersonalRecord` yeniden hesaplamasını TETİKLER
 * (ADR-021) — ekleme, düzeltme ve silme dahil. Hesaplayıcı T-015'te.
 */
const workoutSetBase = z.object({
  workoutId: cuidSchema,
  exerciseId: cuidSchema,
  setNo: z
    .number()
    .int()
    .min(1, { error: 'Set numarası 1 veya daha büyük olmalıdır.' })
    .max(50, { error: 'Set numarası geçersiz.' }),
  reps: z
    .number()
    .int()
    .min(1, { error: 'Tekrar sayısı en az 1 olmalıdır.' })
    .max(1000, { error: 'Tekrar sayısı geçersiz.' }),
  weightKg: decimalSchema(4, 2).optional(),
  rpe: rpeSchema.optional(),
});

export const createWorkoutSetSchema = workoutSetBase;
/*
 * TEMİZLENEBİLİR ALANLAR — `null` = "boşalt", `undefined` = "dokunma" (T-031
 * kuralı). `partialWithoutDefaults` alanı yalnızca VERİLMEYEBİLİR yapıyordu;
 * veritabanında boş olabilen bir sütunu temizlemenin yolu YOKTU ve dolu bir
 * alanı formda boşaltmak eski değeri sessizce koruyordu (F5 formları bunu
 * ekranda uyarı olarak yazıyordu). Kural taban şemadan türetiliyor — tek yer.
 */
export const updateWorkoutSetSchema = partialWithoutDefaults(workoutSetBase).extend({
  id: cuidSchema,
  weightKg: workoutSetBase.shape.weightKg.nullable(),
  rpe: workoutSetBase.shape.rpe.nullable(),
});

export const workoutSetFilterSchema = paginationSchema.extend({
  workoutId: cuidSchema.optional(),
  exerciseId: cuidSchema.optional(),
});

export type CreateWorkoutSetInput = z.infer<typeof createWorkoutSetSchema>;
export type UpdateWorkoutSetInput = z.infer<typeof updateWorkoutSetSchema>;
export type WorkoutSetFilterInput = z.infer<typeof workoutSetFilterSchema>;
