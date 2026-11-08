import { describe, expect, it } from 'vitest';

import {
  archiveExerciseSchema,
  createExerciseSchema,
  createHealthLogSchema,
  createPersonalRecordSchema,
  createWorkoutSchema,
  createWorkoutSetSchema,
  exerciseFilterSchema,
  healthLogFilterSchema,
  personalRecordFilterSchema,
  updateExerciseSchema,
  updateHealthLogSchema,
  updatePersonalRecordSchema,
  updateWorkoutSchema,
  updateWorkoutSetSchema,
  workoutFilterSchema,
  workoutSetFilterSchema,
} from '@/lib/schemas';

const ID = 'clx0000000000000000000001';

describe('HealthLog', () => {
  it('geçerli kayıt', () => {
    expect(
      createHealthLogSchema.safeParse({ date: '2026-08-05', weightKg: '82.50', mood: 4 }).success,
    ).toBe(true);
  });

  it('mood 6 reddeder (1–5 ölçek)', () => {
    expect(createHealthLogSchema.safeParse({ date: '2026-08-05', mood: 6 }).success).toBe(false);
  });

  it('saatli tarih reddeder (ADR-016)', () => {
    expect(createHealthLogSchema.safeParse({ date: '2026-08-05T00:00:00Z' }).success).toBe(false);
  });

  it('aşırı nabız reddeder', () => {
    expect(createHealthLogSchema.safeParse({ date: '2026-08-05', restingHr: 400 }).success).toBe(
      false,
    );
  });

  it('kısmi güncelleme ve filtre', () => {
    expect(updateHealthLogSchema.safeParse({ id: ID, steps: 9000 }).success).toBe(true);
    expect(healthLogFilterSchema.safeParse({ from: '2026-01-01', to: '2026-12-31' }).success).toBe(
      true,
    );
  });
});

describe('Exercise', () => {
  const valid = { name: 'Bench Press', muscleGroup: 'CHEST' };

  it('geçerli egzersiz, ekipman varsayılanı OTHER', () => {
    expect(createExerciseSchema.parse(valid).equipment).toBe('OTHER');
  });

  it('geçersiz kas grubu reddeder', () => {
    expect(createExerciseSchema.safeParse({ ...valid, muscleGroup: 'GOGUS' }).success).toBe(false);
  });

  it('kısmi güncelleme, arşivleme, filtre', () => {
    expect(updateExerciseSchema.safeParse({ id: ID, equipment: 'BARBELL' }).success).toBe(true);
    expect(archiveExerciseSchema.safeParse({ id: ID, isArchived: true }).success).toBe(true);
    expect(exerciseFilterSchema.safeParse({ muscleGroup: 'BACK' }).success).toBe(true);
  });
});

describe('Workout', () => {
  it('geçerli antrenman, tür varsayılanı GYM', () => {
    expect(createWorkoutSchema.parse({ date: '2026-08-05' }).type).toBe('GYM');
  });

  it('24 saati aşan süre reddeder', () => {
    expect(createWorkoutSchema.safeParse({ date: '2026-08-05', durationMin: 2000 }).success).toBe(
      false,
    );
  });

  it('feeling 1–5 sınırı', () => {
    expect(createWorkoutSchema.safeParse({ date: '2026-08-05', feeling: 0 }).success).toBe(false);
    expect(createWorkoutSchema.safeParse({ date: '2026-08-05', feeling: 5 }).success).toBe(true);
  });

  it('kısmi güncelleme ve filtre', () => {
    expect(updateWorkoutSchema.safeParse({ id: ID, type: 'KAYAK' }).success).toBe(true);
    expect(workoutFilterSchema.safeParse({ type: 'CARDIO' }).success).toBe(true);
  });
});

describe('WorkoutSet', () => {
  const valid = { workoutId: ID, exerciseId: ID, setNo: 1, reps: 8, weightKg: '100.00' };

  it('geçerli set', () => {
    expect(createWorkoutSetSchema.safeParse(valid).success).toBe(true);
  });

  it('sıfır tekrar reddeder', () => {
    expect(createWorkoutSetSchema.safeParse({ ...valid, reps: 0 }).success).toBe(false);
  });

  it('rpe 11 reddeder (1–10 ölçek)', () => {
    expect(createWorkoutSetSchema.safeParse({ ...valid, rpe: 11 }).success).toBe(false);
    expect(createWorkoutSetSchema.safeParse({ ...valid, rpe: 10 }).success).toBe(true);
  });

  it('kısmi güncelleme ve filtre', () => {
    expect(updateWorkoutSetSchema.safeParse({ id: ID, reps: 10 }).success).toBe(true);
    expect(workoutSetFilterSchema.safeParse({ exerciseId: ID }).success).toBe(true);
  });
});

describe('PersonalRecord — ADR-021 tekrar bazında', () => {
  const valid = { exerciseId: ID, reps: 5, weightKg: '120.00', date: '2026-08-05' };

  it('geçerli rekor', () => {
    expect(createPersonalRecordSchema.safeParse(valid).success).toBe(true);
  });

  it('kaynağa bağlanabilir (workoutSetId)', () => {
    expect(createPersonalRecordSchema.safeParse({ ...valid, workoutSetId: ID }).success).toBe(true);
  });

  it('ağırlık zorunlu', () => {
    const { weightKg: _omit, ...withoutWeight } = valid;
    expect(createPersonalRecordSchema.safeParse(withoutWeight).success).toBe(false);
  });

  it('tahmini 1RM alanı YOKTUR — kabul edilmez', () => {
    const parsed = createPersonalRecordSchema.parse({ ...valid, estimated1RM: '140.00' });
    expect(parsed).not.toHaveProperty('estimated1RM');
  });

  it('kısmi güncelleme ve filtre', () => {
    expect(updatePersonalRecordSchema.safeParse({ id: ID, weightKg: '125.00' }).success).toBe(true);
    expect(personalRecordFilterSchema.parse({ reps: '5' }).reps).toBe(5);
  });
});
