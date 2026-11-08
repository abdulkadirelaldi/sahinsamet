import * as z from 'zod';

import {
  cuidSchema,
  dayDateSchema,
  decimalSchema,
  paginationSchema,
  partialWithoutDefaults,
} from './common';

/**
 * `PersonalRecord` — TEKRAR BAZINDA rekor (ADR-021).
 * `@@unique([exerciseId, reps])`; 1RM, 3RM, 5RM ayrı ayrı izlenir.
 * Tahmini 1RM formülü KULLANILMAZ — karşılaştırma gerçek performansa dayanır.
 *
 * TÜRETİLMİŞ veridir: normalde elle girilmez, `WorkoutSet` mutasyonlarında
 * servis tarafından yeniden hesaplanır. Şema, o hesaplamanın çıktısını bağlar.
 */
const personalRecordBase = z.object({
  exerciseId: cuidSchema,
  reps: z
    .number()
    .int()
    .min(1, { error: 'Tekrar sayısı en az 1 olmalıdır.' })
    .max(1000, { error: 'Tekrar sayısı geçersiz.' }),
  weightKg: decimalSchema(4, 2),
  date: dayDateSchema,
  workoutSetId: cuidSchema.optional(),
});

export const createPersonalRecordSchema = personalRecordBase;
export const updatePersonalRecordSchema = partialWithoutDefaults(personalRecordBase).extend({
  id: cuidSchema,
});

export const personalRecordFilterSchema = paginationSchema.extend({
  exerciseId: cuidSchema.optional(),
  reps: z.coerce.number().int().min(1).max(1000).optional(),
});

export type CreatePersonalRecordInput = z.infer<typeof createPersonalRecordSchema>;
export type UpdatePersonalRecordInput = z.infer<typeof updatePersonalRecordSchema>;
export type PersonalRecordFilterInput = z.infer<typeof personalRecordFilterSchema>;
