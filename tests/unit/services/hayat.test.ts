import { describe, expect, it, vi } from 'vitest';

import * as hedefModulu from '@/server/services/goal';

import {
  createHabitSchema,
  goalFilterSchema,
  habitFilterSchema,
  journalEntryFilterSchema,
  updateGoalSchema,
  updateHabitSchema,
} from '@/lib/schemas';
import {
  GoalRuleError,
  fetchGoals,
  resolveGoalUpdate,
  updateGoal,
  type GoalClient,
} from '@/server/services/goal';
import {
  STREAK_LOOKBACK_DAYS,
  archiveHabit,
  buildHabitWhere,
  createHabit,
  dailyStreak,
  fetchHabitById,
  fetchHabitWeek,
  fetchHabits,
  updateHabit,
  isDayComplete,
  weeklyStreak,
  type HabitClient,
} from '@/server/services/habit';
import {
  HABIT_LOG_MAX_COUNT,
  HabitWriteBlockedError,
  setHabitDayCount,
  toggleHabitDay,
  type HabitLogClient,
} from '@/server/services/habit-log';
import {
  JOURNAL_EXCERPT_LENGTH,
  buildJournalEntryWhere,
  fetchJournalEntries,
  journalExcerpt,
  type JournalEntryClient,
} from '@/server/services/journal-entry';

/**
 * T-112 — `Habit`, `HabitLog`, `Goal`, `JournalEntry` servisleri.
 *
 * ⚠️ EN ÖNEMLİ ÜÇ BLOK:
 *   1. SERİ — "bugün henüz bitmedi" kuralı ve gün/hafta birimi seçimi.
 *      Yanlışı sessiz: sabah paneli açan kullanıcı 30 günlük serisini 0 görür.
 *   2. "ULAŞILDI ⇔ %100" — şemanın kısmi güncellemede göremediği iki yol.
 *   3. `count = 0` satır tutulmaz — aç/kapa satırı SİLER.
 */

const gun = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/* ===========================================================================
 * 1. SERİ — SAF ÇEKİRDEK
 * ======================================================================== */

describe('isDayComplete — "yapıldı" ≠ "tamamlandı"', () => {
  it('ikili alışkanlıkta tek işaret tamamlar', () => {
    expect(isDayComplete(1, null)).toBe(true);
    expect(isDayComplete(0, null)).toBe(false);
  });

  it('⚠️ sayılı alışkanlıkta hedefin altı TAMAMLANMAMIŞ', () => {
    // 8 bardak hedefinde 3 bardak "yapıldı" ama seriyi canlı tutmamalı.
    expect(isDayComplete(3, 8)).toBe(false);
    expect(isDayComplete(8, 8)).toBe(true);
    expect(isDayComplete(9, 8)).toBe(true);
  });
});

describe('dailyStreak', () => {
  const PENCERE = '2025-01-01';

  it('⚠️ BUGÜN HENÜZ İŞARETLENMEDİYSE seri DÜNDEN sayılır — kırılmış sayılmaz', () => {
    const tamam = new Set(['2026-10-17', '2026-10-18', '2026-10-19']);
    expect(dailyStreak(tamam, '2026-10-20', PENCERE)).toEqual({
      unit: 'day',
      value: 3,
      atLeast: false,
    });
  });

  it('bugün işaretliyse bugün de sayılır', () => {
    const tamam = new Set(['2026-10-19', '2026-10-20']);
    expect(dailyStreak(tamam, '2026-10-20', PENCERE).value).toBe(2);
  });

  it('DÜN de boşsa seri 0 — gerçekten kırılmış', () => {
    const tamam = new Set(['2026-10-17', '2026-10-18']);
    expect(dailyStreak(tamam, '2026-10-20', PENCERE).value).toBe(0);
  });

  it('bir boşluk seriyi keser', () => {
    const tamam = new Set(['2026-10-15', '2026-10-16', '2026-10-18', '2026-10-19']);
    expect(dailyStreak(tamam, '2026-10-20', PENCERE).value).toBe(2);
  });

  it('ay ve yıl sınırını geçer (gün aritmetiği, an değil)', () => {
    const tamam = new Set(['2025-12-30', '2025-12-31', '2026-01-01']);
    expect(dailyStreak(tamam, '2026-01-01', '2025-01-01').value).toBe(3);
  });

  it('⚠️ pencereye dayanan seri `atLeast` ile işaretleniyor — kesin sayı gibi görünmüyor', () => {
    const tamam = new Set(['2026-10-18', '2026-10-19', '2026-10-20']);
    expect(dailyStreak(tamam, '2026-10-20', '2026-10-19')).toEqual({
      unit: 'day',
      value: 2,
      atLeast: true,
    });
  });
});

describe('weeklyStreak', () => {
  const PENCERE = '2025-01-01';
  // 2026-10-19 pazartesi, 2026-10-20 salı.
  const gunler = (pazartesi: string, adet: number): string[] => {
    const bas = gun(pazartesi);
    return Array.from({ length: adet }, (_, i) =>
      new Date(bas.getTime() + i * 86_400_000).toISOString().slice(0, 10),
    );
  };

  it('⚠️ İÇİNDE BULUNULAN hafta hedefi henüz tutturmadıysa seri GEÇEN haftadan sayılır', () => {
    const tamam = new Set([...gunler('2026-10-05', 3), ...gunler('2026-10-12', 3), '2026-10-19']);
    expect(weeklyStreak(tamam, '2026-10-20', 3, PENCERE)).toEqual({
      unit: 'week',
      value: 2,
      atLeast: false,
    });
  });

  it('bu hafta tutturulduysa bu hafta da sayılır', () => {
    const tamam = new Set([...gunler('2026-10-12', 3), ...gunler('2026-10-19', 3)]);
    expect(weeklyStreak(tamam, '2026-10-21', 3, PENCERE).value).toBe(2);
  });

  it('hedefin altında kalan hafta seriyi keser', () => {
    const tamam = new Set([
      ...gunler('2026-09-28', 3),
      ...gunler('2026-10-05', 2),
      ...gunler('2026-10-12', 3),
    ]);
    expect(weeklyStreak(tamam, '2026-10-20', 3, PENCERE).value).toBe(1);
  });

  it('⚠️ pencerenin başındaki KISMİ hafta sayılmaz — okunmayan veriden hüküm yok', () => {
    const tamam = new Set([...gunler('2026-10-05', 7), ...gunler('2026-10-12', 7)]);
    // Pencere 2026-10-07 (çarşamba): 05 Ekim haftası kısmen okunmuş.
    expect(weeklyStreak(tamam, '2026-10-20', 3, '2026-10-07')).toEqual({
      unit: 'week',
      value: 1,
      atLeast: true,
    });
  });
});

/* ===========================================================================
 * HABIT — okuma
 * ======================================================================== */

function habitSatiri(ek: Record<string, unknown> = {}) {
  return {
    id: 'h_1',
    name: 'Kitap oku',
    targetPerWeek: 7,
    targetPerDay: null,
    color: null,
    icon: null,
    isActive: true,
    isArchived: false,
    createdAt: new Date('2026-10-01T08:00:00.000Z'),
    updatedAt: new Date('2026-10-01T08:00:00.000Z'),
    ...ek,
  };
}

function habitIstemci(habits: unknown[], weekLogs: unknown[], streakLogs: unknown[] = weekLogs) {
  const habitFindMany = vi.fn().mockResolvedValue(habits);
  const logFindMany = vi.fn().mockResolvedValueOnce(weekLogs).mockResolvedValueOnce(streakLogs);

  const client = {
    habit: {
      findMany: habitFindMany,
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    habitLog: { findMany: logFindMany },
  } as unknown as HabitClient;

  return { client, habitFindMany, logFindMany };
}

describe('buildHabitWhere — varsayılan YOK (ADR-033)', () => {
  it('filtre verilmezse TÜMÜ', () => {
    expect(buildHabitWhere(habitFilterSchema.parse({}))).toEqual({});
  });

  it('`false` da bir filtre — "verilmedi" ile karışmıyor', () => {
    expect(buildHabitWhere(habitFilterSchema.parse({ isArchived: 'false' }))).toEqual({
      isArchived: false,
    });
  });
});

describe('alışkanlık yönetimi', () => {
  function yonetimIstemci() {
    const findMany = vi.fn().mockResolvedValue([habitSatiri()]);
    const update = vi.fn().mockResolvedValue(habitSatiri());
    const create = vi.fn().mockResolvedValue(habitSatiri());
    const client = {
      habit: {
        findMany,
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn().mockResolvedValue(null),
        create,
        update,
      },
      habitLog: { findMany: vi.fn() },
    } as unknown as HabitClient;
    return { client, findMany, update, create };
  }

  it('⚠️ liste sırası order + ad + id — `name` @unique DEĞİL, sayfalama tekrar etmesin', async () => {
    const { client, findMany } = yonetimIstemci();
    await fetchHabits(habitFilterSchema.parse({}), client);
    // 2026-10-29: önce sahibinin sırası (`order`), sonra ad + id.
    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { order: 'asc' },
      { name: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('olmayan kayıt `null`', async () => {
    const { client } = yonetimIstemci();
    expect(await fetchHabitById('h_x', client)).toBeNull();
  });

  it('oluşturma: verilmeyen opsiyoneller `null`, boş ikon `null`', async () => {
    const { client, create } = yonetimIstemci();
    await createHabit(createHabitSchema.parse({ name: 'Su', targetPerDay: 8, icon: '  ' }), client);
    expect(create.mock.calls[0]?.[0].data).toEqual({
      name: 'Su',
      targetPerWeek: 7,
      targetPerDay: 8,
      sureli: false,
      color: null,
      icon: null,
      order: 0,
      isActive: true,
      otoKaynak: null,
    });
  });

  it('güncelleme KISMİ — verilmeyen alan yazılmıyor', async () => {
    const { client, update } = yonetimIstemci();
    await updateHabit(
      updateHabitSchema.parse({ id: 'ckabcdefghijklmnopqrstuv', targetPerWeek: 3 }),
      client,
    );
    expect(update.mock.calls[0]?.[0].data).toEqual({ targetPerWeek: 3 });
  });

  it('arşiv yalnızca bayrağı ve açık sayacı değiştiriyor — silme yolu yok', async () => {
    const { client, update } = yonetimIstemci();
    await archiveHabit({ id: 'ckabcdefghijklmnopqrstuv', isArchived: true }, client);
    expect(update.mock.calls[0]?.[0].data).toEqual({ isArchived: true, sayacBaslangic: null });
  });
});

describe('fetchHabitWeek — haftalık pano', () => {
  it('hafta PAZARTESİ başlıyor ve 7 gün (ADR-016)', async () => {
    const { client } = habitIstemci([], []);
    const pano = await fetchHabitWeek('2026-10-22', client, '2026-10-22');

    expect(pano.days).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });

  it('alışkanlık yoksa işaret sorgusu HİÇ atılmıyor', async () => {
    const { client, logFindMany } = habitIstemci([], []);
    expect((await fetchHabitWeek('2026-10-22', client, '2026-10-22')).habits).toEqual([]);
    expect(logFindMany).not.toHaveBeenCalled();
  });

  it('yalnızca AKTİF ve ARŞİVLENMEMİŞ alışkanlıklar okunuyor', async () => {
    const { client, habitFindMany } = habitIstemci([], []);
    await fetchHabitWeek('2026-10-22', client, '2026-10-22');
    expect(habitFindMany.mock.calls[0]?.[0].where).toEqual({ isActive: true, isArchived: false });
  });

  it('sayaçlar gün sırasına yerleşiyor, işaretsiz gün 0', async () => {
    const loglar = [
      { habitId: 'h_1', date: gun('2026-10-19'), count: 1 },
      { habitId: 'h_1', date: gun('2026-10-21'), count: 1 },
    ];
    const { client } = habitIstemci([habitSatiri()], loglar);
    const satir = (await fetchHabitWeek('2026-10-21', client, '2026-10-21')).habits[0];

    expect(satir?.counts).toEqual([1, 0, 1, 0, 0, 0, 0]);
    expect(satir?.completedDays).toBe(2);
  });

  it('⚠️ sayılı alışkanlıkta hedefin altındaki gün TAMAMLANMIŞ sayılmıyor', async () => {
    const loglar = [
      { habitId: 'h_1', date: gun('2026-10-19'), count: 8 },
      { habitId: 'h_1', date: gun('2026-10-20'), count: 3 },
    ];
    const { client } = habitIstemci([habitSatiri({ targetPerDay: 8, targetPerWeek: 2 })], loglar);
    const satir = (await fetchHabitWeek('2026-10-20', client, '2026-10-20')).habits[0];

    expect(satir?.counts).toEqual([8, 3, 0, 0, 0, 0, 0]);
    expect(satir?.completedDays).toBe(1);
    expect(satir?.weekTargetMet).toBe(false);
  });

  it('seri birimi hedefe göre: haftada 7 → gün, daha az → hafta', async () => {
    const { client } = habitIstemci(
      [habitSatiri(), habitSatiri({ id: 'h_2', name: 'Koşu', targetPerWeek: 3 })],
      [],
      [],
    );
    const pano = await fetchHabitWeek('2026-10-20', client, '2026-10-20');

    expect(pano.habits.map((h) => h.streak.unit)).toEqual(['day', 'week']);
  });

  it('⚠️ geçmiş bir haftaya bakılsa da seri BUGÜNE göre ve iki ayrı pencere okunuyor', async () => {
    const { client, logFindMany } = habitIstemci([habitSatiri()], [], []);
    await fetchHabitWeek('2026-07-01', client, '2026-10-20');

    const [hafta, seri] = logFindMany.mock.calls.map((c) => c[0].where.date);
    expect(hafta).toEqual({ gte: gun('2026-06-29'), lte: gun('2026-07-05') });
    expect(seri.lte).toEqual(gun('2026-10-20'));
    // Pencere bugünü de içeriyor, yani başlangıç (N - 1) gün geride.
    const pencereGun = (seri.lte.getTime() - seri.gte.getTime()) / 86_400_000 + 1;
    expect(pencereGun).toBe(STREAK_LOOKBACK_DAYS);
  });
});

/* ===========================================================================
 * 3. HABIT LOG — `count = 0` satır tutulmaz
 * ======================================================================== */

function logIstemci(habit: unknown, mevcut: { count: number } | null) {
  const upsert = vi.fn().mockImplementation(async (args: { create: { count: number } }) => ({
    count: args.create.count,
  }));
  const deleteMany = vi.fn().mockResolvedValue({ count: 1 });

  const client = {
    habit: { findUnique: vi.fn().mockResolvedValue(habit) },
    habitLog: {
      findUnique: vi.fn().mockResolvedValue(mevcut),
      upsert,
      deleteMany,
    },
  } as unknown as HabitLogClient;

  return { client, upsert, deleteMany };
}

const GIRDI = { habitId: 'ckabcdefghijklmnopqrstuv', date: '2026-10-20' };

describe('toggleHabitDay', () => {
  it('ikili alışkanlık: işaretsiz gün → 1', async () => {
    const { client, upsert } = logIstemci({ targetPerDay: null, isArchived: false }, null);
    expect((await toggleHabitDay(GIRDI, client)).count).toBe(1);
    expect(upsert.mock.calls[0]?.[0].create.date).toEqual(gun('2026-10-20'));
  });

  it('⚠️ ikili alışkanlık: işaretli gün → SATIR SİLİNİYOR, 0 sayaçlı satır yazılmıyor', async () => {
    const { client, upsert, deleteMany } = logIstemci(
      { targetPerDay: null, isArchived: false },
      { count: 1 },
    );
    expect((await toggleHabitDay(GIRDI, client)).count).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledWith({
      where: { habitId: GIRDI.habitId, date: gun('2026-10-20') },
    });
  });

  it('⚠️ sayılı alışkanlık: ARTIRIR — ikinci bardak ilk bardağı silmez', async () => {
    const { client, deleteMany } = logIstemci({ targetPerDay: 8, isArchived: false }, { count: 3 });
    expect((await toggleHabitDay(GIRDI, client)).count).toBe(4);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('sayılı alışkanlık üst sınırda DURUR, taşmaz', async () => {
    const { client } = logIstemci(
      { targetPerDay: 8, isArchived: false },
      { count: HABIT_LOG_MAX_COUNT },
    );
    expect((await toggleHabitDay(GIRDI, client)).count).toBe(HABIT_LOG_MAX_COUNT);
  });

  it('⚠️ ARŞİVLENMİŞ alışkanlığa işaret konmuyor', async () => {
    const { client, upsert } = logIstemci({ targetPerDay: null, isArchived: true }, null);
    await expect(toggleHabitDay(GIRDI, client)).rejects.toMatchObject({ reason: 'ARCHIVED' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('olmayan alışkanlık NOT_FOUND', async () => {
    const { client } = logIstemci(null, null);
    await expect(toggleHabitDay(GIRDI, client)).rejects.toBeInstanceOf(HabitWriteBlockedError);
  });
});

describe('setHabitDayCount', () => {
  it('`0` → satır siliniyor (idempotent `deleteMany`)', async () => {
    const { client, upsert, deleteMany } = logIstemci({ targetPerDay: 8, isArchived: false }, null);
    expect((await setHabitDayCount({ ...GIRDI, count: 0 }, client)).count).toBe(0);
    expect(deleteMany).toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('pozitif sayı `upsert` ile yazılıyor — yarışta P2002 yok', async () => {
    const { client, upsert } = logIstemci({ targetPerDay: 8, isArchived: false }, null);
    expect((await setHabitDayCount({ ...GIRDI, count: 6 }, client)).count).toBe(6);
    // Sayı yazmak açık "yapmadım" işaretini kaldırır (2026-10-29).
    expect(upsert.mock.calls[0]?.[0].update).toEqual({ count: 6, missed: false });
  });
});

/* ===========================================================================
 * 2. GOAL — "ulaşıldı ⇔ %100"
 * ======================================================================== */

describe('resolveGoalUpdate — şemanın kısmi güncellemede göremediği iki yol', () => {
  it('(a) `%40` hedefe yalnızca ACHIEVED → ilerleme 100`e çekiliyor (niyet açık)', () => {
    expect(resolveGoalUpdate({ status: 'ACTIVE', progress: 40 }, { status: 'ACHIEVED' })).toEqual({
      ok: true,
      progress: 100,
    });
  });

  it('(b) ULAŞILMIŞ hedefe yalnızca `progress: 60` → REDDEDİLİYOR (niyet belirsiz)', () => {
    const sonuc = resolveGoalUpdate({ status: 'ACHIEVED', progress: 100 }, { progress: 60 });
    expect(sonuc.ok).toBe(false);
  });

  it('ön koşul — ŞEMA (a) ve (b)`yi GEÇİRİYOR, yani kural servise ait', () => {
    const id = 'ckabcdefghijklmnopqrstuv';
    expect(updateGoalSchema.safeParse({ id, status: 'ACHIEVED' }).success).toBe(true);
    expect(updateGoalSchema.safeParse({ id, progress: 60 }).success).toBe(true);
  });

  it('ulaşılmış hedefin durumunu değiştirip ilerlemeyi düşürmek SERBEST', () => {
    expect(
      resolveGoalUpdate({ status: 'ACHIEVED', progress: 100 }, { status: 'ACTIVE', progress: 60 }),
    ).toEqual({ ok: true, progress: 60 });
  });

  it('kurala dokunmayan güncelleme ilerlemeyi değiştirmiyor', () => {
    expect(resolveGoalUpdate({ status: 'ACTIVE', progress: 40 }, {})).toEqual({
      ok: true,
      progress: undefined,
    });
  });
});

function goalSatiri(ek: Record<string, unknown> = {}) {
  return {
    id: 'g_1',
    title: 'Yarı maraton',
    description: null,
    category: 'HEALTH',
    targetDate: gun('2026-11-01'),
    progress: 40,
    status: 'ACTIVE',
    createdAt: new Date('2026-09-01T08:00:00.000Z'),
    updatedAt: new Date('2026-09-01T08:00:00.000Z'),
    ...ek,
  };
}

function goalIstemci(mevcut: unknown = goalSatiri()) {
  const findUnique = vi.fn().mockResolvedValue(mevcut);
  const update = vi
    .fn()
    .mockImplementation(async (args: { data: Record<string, unknown> }) => goalSatiri(args.data));
  const findMany = vi
    .fn()
    .mockResolvedValue([
      goalSatiri(),
      goalSatiri({ id: 'g_2', targetDate: gun('2026-10-01') }),
      goalSatiri({ id: 'g_3', targetDate: null }),
    ]);

  const client = {
    goal: {
      findMany,
      count: vi.fn().mockResolvedValue(3),
      findUnique,
      create: vi.fn(),
      update,
      delete: vi.fn(),
    },
  } as unknown as GoalClient;

  return { client, findUnique, update, findMany };
}

describe('updateGoal — kural BİRLEŞİK hâlde uygulanıyor', () => {
  it('(a) ACHIEVED → yazılan `progress` 100', async () => {
    const { client, update } = goalIstemci();
    const dto = await updateGoal(
      updateGoalSchema.parse({ id: 'ckabcdefghijklmnopqrstuv', status: 'ACHIEVED' }),
      client,
    );
    expect(update.mock.calls[0]?.[0].data).toMatchObject({ status: 'ACHIEVED', progress: 100 });
    expect(dto.progress).toBe(100);
  });

  it('(b) ulaşılmış hedefin ilerlemesini düşürmek GoalRuleError, YAZILMIYOR', async () => {
    const { client, update } = goalIstemci(goalSatiri({ status: 'ACHIEVED', progress: 100 }));
    await expect(
      updateGoal(updateGoalSchema.parse({ id: 'ckabcdefghijklmnopqrstuv', progress: 60 }), client),
    ).rejects.toBeInstanceOf(GoalRuleError);
    expect(update).not.toHaveBeenCalled();
  });

  it('durum/ilerleme dokunulmadıysa mevcut kayıt OKUNMUYOR', async () => {
    const { client, findUnique } = goalIstemci();
    await updateGoal(
      updateGoalSchema.parse({ id: 'ckabcdefghijklmnopqrstuv', title: 'Maraton' }),
      client,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('fetchGoals', () => {
  it('`daysLeft` GÜN farkı — geçmiş tarih NEGATİF, tarihsiz `null`', async () => {
    const { client } = goalIstemci();
    const items = (await fetchGoals(goalFilterSchema.parse({}), client, '2026-10-20')).items;
    expect(items.map((g) => g.daysLeft)).toEqual([12, -19, null]);
  });

  it('sıra: durum → en yakın tarih (tarihsiz SONDA, açıkça) → id', async () => {
    const { client, findMany } = goalIstemci();
    await fetchGoals(goalFilterSchema.parse({}), client, '2026-10-20');
    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { status: 'asc' },
      { targetDate: { sort: 'asc', nulls: 'last' } },
      { id: 'asc' },
    ]);
  });
});

/* ===========================================================================
 * JOURNAL — özet
 * ======================================================================== */

describe('journalExcerpt', () => {
  it('kısa metin olduğu gibi, boşluklar tekleşmiş', () => {
    expect(journalExcerpt('Bugün\n\n  güzeldi.')).toEqual({
      excerpt: 'Bugün güzeldi.',
      truncated: false,
    });
  });

  it('uzun metin KELİME sınırında kesiliyor', () => {
    const metin = 'kelime '.repeat(100);
    const { excerpt, truncated } = journalExcerpt(metin, 20);
    expect(truncated).toBe(true);
    expect(excerpt).toBe('kelime kelime…');
  });

  it('⚠️ emoji ortasından BÖLÜNMÜYOR (kod noktası, UTF-16 birimi değil)', () => {
    const metin = '😀'.repeat(JOURNAL_EXCERPT_LENGTH + 10);
    const { excerpt } = journalExcerpt(metin);
    // Yalnız vekil (surrogate) yarım karakter kalmamalı.
    expect(excerpt).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
    expect(Array.from(excerpt.replace('…', ''))).toHaveLength(JOURNAL_EXCERPT_LENGTH);
  });
});

describe('fetchJournalEntries', () => {
  const satir = {
    id: 'j_1',
    date: gun('2026-10-20'),
    title: null,
    content: 'Uzun ve özel bir günlük metni. '.repeat(30),
    mood: 4,
    tags: ['iş'],
    createdAt: new Date('2026-10-20T19:00:00.000Z'),
    updatedAt: new Date('2026-10-20T19:00:00.000Z'),
  };

  function istemci() {
    const findMany = vi.fn().mockResolvedValue([satir]);
    const client = {
      journalEntry: { findMany, count: vi.fn().mockResolvedValue(1) },
    } as unknown as JournalEntryClient;
    return { client, findMany };
  }

  it('⚠️ liste TAM METİN taşımıyor — özet + `truncated`', async () => {
    const { client } = istemci();
    const item = (await fetchJournalEntries(journalEntryFilterSchema.parse({}), client)).items[0];
    expect(item).not.toHaveProperty('content');
    expect(item?.truncated).toBe(true);
    expect(item?.date).toBe('2026-10-20');
  });

  it('⚠️ aynı günde birden çok kayıt — ikincil anahtarlar ZORUNLU', async () => {
    const { client, findMany } = istemci();
    await fetchJournalEntries(journalEntryFilterSchema.parse({}), client);
    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { date: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('filtre: gün aralığı `@db.Date` sınırıyla, etiket `has`, arama başlık+içerik', () => {
    expect(
      buildJournalEntryWhere(
        journalEntryFilterSchema.parse({
          from: '2026-10-01',
          to: '2026-10-31',
          tag: 'iş',
          q: 'deniz',
        }),
      ),
    ).toEqual({
      date: { gte: gun('2026-10-01'), lte: gun('2026-10-31') },
      tags: { has: 'iş' },
      OR: [
        { title: { contains: 'deniz', mode: 'insensitive' } },
        { content: { contains: 'deniz', mode: 'insensitive' } },
      ],
    });
  });
});

describe('guncelHedefMi (2026-11-01)', () => {
  it('⚠️ dönemi geçen hedef güncel değil; uzun vadeli her zaman güncel', () => {
    const { guncelHedefMi: g } = hedefModulu;
    expect(g({ period: null, periodKey: null }, '2026-10-31')).toBe(true);
    expect(g({ period: 'MONTHLY', periodKey: '2026-10' }, '2026-10-31')).toBe(true);
    expect(g({ period: 'MONTHLY', periodKey: '2026-09' }, '2026-10-31')).toBe(false);
    expect(g({ period: 'YEARLY', periodKey: '2025' }, '2026-10-31')).toBe(false);
  });
});

describe('hedefiTasi (2026-11-01)', () => {
  it('bugünün dönemine taşır', async () => {
    const update = vi.fn();
    const client = {
      goal: { findUnique: vi.fn().mockResolvedValue({ period: 'MONTHLY' }), update },
    } as never;
    await hedefModulu.hedefiTasi('g', client, '2026-11-01');
    expect(update.mock.calls[0]?.[0].data).toEqual({ periodKey: '2026-11' });
  });

  it('⚠️ uzun vadeli taşınmaz', async () => {
    const client = { goal: { findUnique: vi.fn().mockResolvedValue({ period: null }) } } as never;
    await expect(hedefModulu.hedefiTasi('g', client, '2026-11-01')).rejects.toThrow('dönemli');
  });
});
