import * as z from 'zod';

import { Equipment, MuscleGroup } from '@/types';

import {
  booleanFilterSchema,
  cuidSchema,
  paginationSchema,
  partialWithoutDefaults,
  searchSchema,
  shortTextSchema,
} from './common';

/** `Exercise` — egzersiz kütüphanesi. Referans veri: silinmez, arşivlenir (ADR-017). */
const exerciseBase = z.object({
  name: shortTextSchema.min(1, { error: 'Egzersiz adı zorunludur.' }),
  muscleGroup: z.enum(MuscleGroup, { error: 'Geçersiz kas grubu.' }),
  equipment: z.enum(Equipment, { error: 'Geçersiz ekipman.' }).default('OTHER'),
});

export const createExerciseSchema = exerciseBase;
export const updateExerciseSchema = partialWithoutDefaults(exerciseBase).extend({ id: cuidSchema });

export const archiveExerciseSchema = z.object({
  id: cuidSchema,
  isArchived: z.boolean(),
});

export const exerciseFilterSchema = paginationSchema.extend({
  muscleGroup: z.enum(MuscleGroup).optional(),
  equipment: z.enum(Equipment).optional(),
  isArchived: booleanFilterSchema.optional(),
  q: searchSchema.optional(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type ArchiveExerciseInput = z.infer<typeof archiveExerciseSchema>;
export type ExerciseFilterInput = z.infer<typeof exerciseFilterSchema>;
