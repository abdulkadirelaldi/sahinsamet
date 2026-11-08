import { describe, expect, it } from 'vitest';

import {
  archiveHabitSchema,
  createGoalSchema,
  createHabitLogSchema,
  createHabitSchema,
  createJournalEntrySchema,
  goalFilterSchema,
  habitFilterSchema,
  habitLogFilterSchema,
  journalEntryFilterSchema,
  toggleHabitLogSchema,
  updateGoalSchema,
  updateHabitLogSchema,
  updateHabitSchema,
  updateJournalEntrySchema,
} from '@/lib/schemas';

const ID = 'clx0000000000000000000001';

describe('Habit — ADR-021', () => {
  it('geçerli alışkanlık, varsayılan haftalık hedef 7', () => {
    expect(createHabitSchema.parse({ name: 'Su içmek' }).targetPerWeek).toBe(7);
  });

  it('haftada 8 gün reddeder', () => {
    expect(createHabitSchema.safeParse({ name: 'X', targetPerWeek: 8 }).success).toBe(false);
  });

  it('targetPerDay opsiyonel ama pozitif olmalı', () => {
    expect(createHabitSchema.safeParse({ name: 'Su', targetPerDay: 8 }).success).toBe(true);
    expect(createHabitSchema.safeParse({ name: 'Su', targetPerDay: 0 }).success).toBe(false);
  });

  it('kısmi güncelleme, arşivleme, filtre', () => {
    expect(updateHabitSchema.safeParse({ id: ID, isActive: false }).success).toBe(true);
    expect(archiveHabitSchema.safeParse({ id: ID, isArchived: true }).success).toBe(true);
    expect(habitFilterSchema.parse({ isActive: 'true' }).isActive).toBe(true);
  });
});

describe('HabitLog — ADR-021 count tabanlı', () => {
  it('geçerli kayıt, varsayılan count 1', () => {
    expect(createHabitLogSchema.parse({ habitId: ID, date: '2026-08-05' }).count).toBe(1);
  });

  it('done alanı YOKTUR — gönderilse de kabul edilmez', () => {
    const parsed = createHabitLogSchema.parse({ habitId: ID, date: '2026-08-05', done: true });
    expect(parsed).not.toHaveProperty('done');
  });

  it('negatif sayaç reddeder', () => {
    expect(
      createHabitLogSchema.safeParse({ habitId: ID, date: '2026-08-05', count: -1 }).success,
    ).toBe(false);
  });

  it('saatli tarih reddeder', () => {
    expect(
      createHabitLogSchema.safeParse({ habitId: ID, date: '2026-08-05T01:00:00Z' }).success,
    ).toBe(false);
  });

  it('toggle, kısmi güncelleme ve filtre', () => {
    expect(toggleHabitLogSchema.safeParse({ habitId: ID, date: '2026-08-05' }).success).toBe(true);
    expect(updateHabitLogSchema.safeParse({ id: ID, count: 3 }).success).toBe(true);
    expect(habitLogFilterSchema.safeParse({ habitId: ID }).success).toBe(true);
  });
});

describe('Goal', () => {
  const valid = { title: 'Sertifika al' };

  it('geçerli hedef, varsayılanlar', () => {
    const parsed = createGoalSchema.parse(valid);
    expect(parsed.status).toBe('ACTIVE');
    expect(parsed.category).toBe('PERSONAL');
    expect(parsed.progress).toBe(0);
  });

  it('progress 101 reddeder', () => {
    expect(createGoalSchema.safeParse({ ...valid, progress: 101 }).success).toBe(false);
  });

  it('ÇAPRAZ KURAL: ACHIEVED ise progress 100 olmalı', () => {
    const r = createGoalSchema.safeParse({ ...valid, status: 'ACHIEVED', progress: 40 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['progress']);

    expect(
      createGoalSchema.safeParse({ ...valid, status: 'ACHIEVED', progress: 100 }).success,
    ).toBe(true);
  });

  it('geçersiz kategori/durum reddeder', () => {
    expect(createGoalSchema.safeParse({ ...valid, category: 'ISLER' }).success).toBe(false);
    expect(createGoalSchema.safeParse({ ...valid, status: 'BITTI' }).success).toBe(false);
  });

  it('kısmi güncelleme ve filtre', () => {
    expect(updateGoalSchema.safeParse({ id: ID, progress: 60 }).success).toBe(true);
    expect(goalFilterSchema.safeParse({ status: 'PAUSED' }).success).toBe(true);
  });
});

describe('JournalEntry', () => {
  const valid = { date: '2026-08-05', content: 'Bugün iyi geçti.' };

  it('geçerli günlük', () => {
    expect(createJournalEntrySchema.safeParse(valid).success).toBe(true);
  });

  it('boş içerik reddeder', () => {
    expect(createJournalEntrySchema.safeParse({ ...valid, content: '' }).success).toBe(false);
  });

  it('mood 1–5 sınırı', () => {
    expect(createJournalEntrySchema.safeParse({ ...valid, mood: 5 }).success).toBe(true);
    expect(createJournalEntrySchema.safeParse({ ...valid, mood: 0 }).success).toBe(false);
  });

  it('kısmi güncelleme ve filtre', () => {
    expect(updateJournalEntrySchema.safeParse({ id: ID, title: 'Başlık' }).success).toBe(true);
    expect(journalEntryFilterSchema.safeParse({ tag: 'spor' }).success).toBe(true);
  });
});
