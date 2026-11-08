import * as z from 'zod';

import { WorkoutType } from '@/types';

import {
  cuidSchema,
  dayDateSchema,
  mediumTextSchema,
  moodSchema,
  paginationSchema,
  partialWithoutDefaults,
} from './common';

/** `Workout` — antrenman kaydı. `feeling` 1–5 ölçek (ADR-020). */
const workoutBase = z.object({
  date: dayDateSchema,
  type: z.enum(WorkoutType, { error: 'Geçersiz antrenman türü.' }).default('GYM'),
  durationMin: z
    .number()
    .int()
    .min(1, { error: 'Süre en az 1 dakika olmalıdır.' })
    .max(1440, { error: 'Süre 24 saati aşamaz.' })
    .optional(),
  feeling: moodSchema.optional(),
  note: mediumTextSchema.optional(),
});

export const createWorkoutSchema = workoutBase;
/*
 * TEMİZLENEBİLİR ALANLAR — `null` = "boşalt", `undefined` = "dokunma" (T-031
 * kuralı). `partialWithoutDefaults` alanı yalnızca VERİLMEYEBİLİR yapıyordu;
 * veritabanında boş olabilen bir sütunu temizlemenin yolu YOKTU ve dolu bir
 * alanı formda boşaltmak eski değeri sessizce koruyordu (F5 formları bunu
 * ekranda uyarı olarak yazıyordu). Kural taban şemadan türetiliyor — tek yer.
 */
export const updateWorkoutSchema = partialWithoutDefaults(workoutBase).extend({
  id: cuidSchema,
  durationMin: workoutBase.shape.durationMin.nullable(),
  feeling: workoutBase.shape.feeling.nullable(),
  note: workoutBase.shape.note.nullable(),
});

export const workoutFilterSchema = paginationSchema.extend({
  type: z.enum(WorkoutType).optional(),
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type WorkoutFilterInput = z.infer<typeof workoutFilterSchema>;
