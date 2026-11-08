import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toDiffSummary } from '@/server/services/audit-log';

/**
 * T-112 SERVER ACTION'LARI — §8.20, ADR-034.
 *
 * ⚠️ EN ÖNEMLİ BLOK "GÜNLÜK İÇERİĞİ DENETİM KAYDINA GİRMİYOR": `HealthLog`
 * kararının aynı ölçütle yeniden türetilmiş hâli. Günlük, sistemdeki en
 * kişisel serbest metin; denetim kaydı §8.21 yedeğine giriyor ve ekrana
 * basılıyor.
 */

const { authMock, writesRevokedMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  writesRevokedMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));

const ID = 'ckabcdefghijklmnopqrstuv';

const { dbMock, satirlar } = vi.hoisted(() => {
  const zaman = new Date('2026-10-20T19:00:00.000Z');
  const satirlar = {
    journal: {
      id: 'j_1',
      date: new Date('2026-10-20T00:00:00.000Z'),
      title: 'Gizli başlık',
      content: 'Çok özel günlük metni',
      mood: 2,
      tags: ['terapi'],
      createdAt: zaman,
      updatedAt: zaman,
    },
    goal: {
      id: 'g_1',
      title: 'Yarı maraton',
      description: 'Gizli hedef açıklaması',
      category: 'HEALTH',
      targetDate: null,
      progress: 40,
      status: 'ACTIVE',
      createdAt: zaman,
      updatedAt: zaman,
    },
    habit: {
      id: 'h_1',
      name: 'Kitap oku',
      targetPerWeek: 5,
      targetPerDay: null,
      color: null,
      icon: null,
      isActive: true,
      isArchived: false,
      createdAt: zaman,
      updatedAt: zaman,
    },
  };

  return {
    satirlar,
    dbMock: {
      journalEntry: {
        create: vi.fn().mockResolvedValue(satirlar.journal),
        update: vi.fn().mockResolvedValue(satirlar.journal),
        delete: vi.fn().mockResolvedValue(satirlar.journal),
      },
      goal: {
        create: vi.fn().mockResolvedValue(satirlar.goal),
        findUnique: vi.fn().mockResolvedValue(satirlar.goal),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue(satirlar.goal),
      },
      habit: {
        create: vi.fn().mockResolvedValue(satirlar.habit),
        update: vi.fn().mockResolvedValue(satirlar.habit),
        findUnique: vi.fn(),
      },
      habitLog: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    },
  };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

const { createJournalEntryAction, updateJournalEntryAction, deleteJournalEntryAction } =
  await import('@/server/actions/journal-entry');
const { createGoalAction, updateGoalAction, deleteGoalAction } =
  await import('@/server/actions/goal');
const {
  archiveHabitAction,
  createHabitAction,
  setHabitDayCountAction,
  toggleHabitDayAction,
  updateHabitAction,
} = await import('@/server/actions/habit');

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: 'usr_1' }, tokenIssuedAt: 1_800_000_000 });
  writesRevokedMock.mockResolvedValue(false);
  dbMock.goal.findUnique.mockResolvedValue(satirlar.goal);
  dbMock.goal.update.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    ...satirlar.goal,
    ...args.data,
  }));
  dbMock.habit.findUnique.mockResolvedValue({ targetPerDay: null, isArchived: false });
  dbMock.habitLog.findUnique.mockResolvedValue(null);
});

function yazilanKayit(): { entity: string; entityId: string; diff: unknown } {
  const cagri = dbMock.auditLog.create.mock.calls.at(-1);
  return (cagri?.[0] as { data: { entity: string; entityId: string; diff: unknown } }).data;
}

/* ===========================================================================
 * YETKİ
 * ======================================================================== */

describe('yetki kapısı — dokuz eylemin hepsi', () => {
  const eylemler = [
    ['journal:create', () => createJournalEntryAction({ date: '2026-10-20', content: 'x' })],
    ['journal:update', () => updateJournalEntryAction({ id: ID, content: 'y' })],
    ['journal:delete', () => deleteJournalEntryAction({ id: ID })],
    ['goal:create', () => createGoalAction({ title: 'Hedef' })],
    ['goal:update', () => updateGoalAction({ id: ID, progress: 50 })],
    ['goal:delete', () => deleteGoalAction({ id: ID })],
    ['habit:create', () => createHabitAction({ name: 'Su' })],
    ['habit:toggle', () => toggleHabitDayAction({ habitId: ID, date: '2026-10-20' })],
    ['habit:set', () => setHabitDayCountAction({ habitId: ID, date: '2026-10-20', count: 3 })],
  ] as const;

  it.each(eylemler)('%s — oturum YOKSA yazma yok', async (_ad, cagir) => {
    authMock.mockResolvedValue(null);
    expect((await cagir()).ok).toBe(false);
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
    expect(dbMock.journalEntry.create).not.toHaveBeenCalled();
    expect(dbMock.habitLog.upsert).not.toHaveBeenCalled();
  });

  it.each(eylemler)('%s — yazma yetkisi İPTALLİYSE reddediliyor', async (_ad, cagir) => {
    writesRevokedMock.mockResolvedValue(true);
    expect((await cagir()).ok).toBe(false);
  });
});

/* ===========================================================================
 * ⚠️⚠️ GÜNLÜK ↔ DENETİM KAYDI
 * ======================================================================== */

describe('⚠️ günlük İÇERİĞİ denetim kaydına GİRMİYOR', () => {
  const GIRDI = {
    date: '2026-10-20',
    title: 'Gizli başlık',
    content: 'Çok özel günlük metni',
    mood: 2,
    tags: ['terapi'],
  };

  it.each([
    ['create', () => createJournalEntryAction(GIRDI)],
    ['update', () => updateJournalEntryAction({ id: ID, ...GIRDI })],
    ['delete', () => deleteJournalEntryAction({ id: ID })],
  ] as const)('%s — içerik, başlık, etiket, ruh hâli YOK', async (_ad, cagir) => {
    expect((await cagir()).ok).toBe(true);
    const diff = JSON.stringify(yazilanKayit().diff);

    for (const deger of ['Çok özel günlük metni', 'Gizli başlık', 'terapi']) {
      expect(diff, `"${deger}" denetim kaydına girdi`).not.toContain(deger);
    }
    expect(diff).not.toContain('"mood":2');
  });

  it('GÜN ve DOKUNULAN ALAN ADLARI yazılıyor — ekranda okunabilir', async () => {
    await updateJournalEntryAction({ id: ID, content: 'yeni', mood: 3 });
    const ozet = toDiffSummary(yazilanKayit().diff);

    expect(ozet.fields.sort()).toEqual(['changed', 'day']);
    expect(ozet.values.changed).toBe('content, mood');
  });
});

/* ===========================================================================
 * GOAL
 * ======================================================================== */

describe('hedef — denetim kaydı ve çapraz kural', () => {
  it('⚠️ `description` DEĞERİ yazılmıyor, değiştiği bilgisi `changed` ile kalıyor', async () => {
    await createGoalAction({ title: 'Yarı maraton', description: 'Gizli hedef açıklaması' });
    const { diff } = yazilanKayit();

    expect(JSON.stringify(diff)).not.toContain('Gizli hedef açıklaması');
    expect(toDiffSummary(diff).values.changed).toBe('description');
  });

  it('⚠️ "ulaştım" → denetim kaydı YAZILAN ilerlemeyi (100) taşıyor, girdiyi değil', async () => {
    const sonuc = await updateGoalAction({ id: ID, status: 'ACHIEVED' });

    expect(sonuc.ok).toBe(true);
    expect(yazilanKayit().diff).toMatchObject({ progress: { after: 100 } });
  });

  it('ulaşılmış hedefin ilerlemesini düşürmek VALIDATION_ERROR — `progress` alanında', async () => {
    dbMock.goal.findUnique.mockResolvedValue({
      ...satirlar.goal,
      status: 'ACHIEVED',
      progress: 100,
    });
    const sonuc = await updateGoalAction({ id: ID, progress: 60 });

    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) {
      expect(sonuc.error.code).toBe('VALIDATION_ERROR');
      expect(sonuc.error.fields).toHaveProperty('progress');
    }
    expect(dbMock.goal.update).not.toHaveBeenCalled();
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('silmede satırın TAMAMI değil sayılı alanlar (BULGU-019)', async () => {
    await deleteGoalAction({ id: ID });
    expect(JSON.stringify(yazilanKayit().diff)).not.toContain('Gizli hedef açıklaması');
  });
});

/* ===========================================================================
 * HABIT
 * ======================================================================== */

describe('alışkanlık tanımı — referans veri, değerleriyle', () => {
  it('güncelleme diff`i `id` taşımıyor, alanları taşıyor', async () => {
    await updateHabitAction({ id: ID, targetPerWeek: 3 });
    const kayit = yazilanKayit();
    expect(kayit.entity).toBe('Habit');
    expect(kayit.diff).toEqual({ targetPerWeek: { before: null, after: 3 } });
  });

  it('arşiv denetim eylemi `UPDATE` — kayıt ve geçmişi YERİNDE', async () => {
    await archiveHabitAction({ id: ID, isArchived: true });
    const cagri = dbMock.auditLog.create.mock.calls.at(-1)?.[0] as {
      data: { action: string; diff: unknown };
    };
    expect(cagri.data.action).toBe('UPDATE');
    expect(cagri.data.diff).toEqual({ isArchived: true });
  });

  it('servis hatası zarfa çevriliyor — P2025 → NOT_FOUND', async () => {
    dbMock.habit.update.mockRejectedValueOnce({ code: 'P2025' });
    const sonuc = await archiveHabitAction({ id: ID, isArchived: true });
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.error.code).toBe('NOT_FOUND');
  });
});

describe('alışkanlık işaretleri', () => {
  it('⚠️ denetim `entityId`si ALIŞKANLIK — aç/kapa satırı silebiliyor', async () => {
    await toggleHabitDayAction({ habitId: ID, date: '2026-10-20' });
    const kayit = yazilanKayit();

    expect(kayit.entity).toBe('HabitLog');
    expect(kayit.entityId).toBe(ID);
    expect(kayit.diff).toEqual({ day: '2026-10-20', count: 1 });
  });

  it('⚠️ arşivlenmiş alışkanlık → VALIDATION_ERROR, ne yapılacağını söylüyor', async () => {
    dbMock.habit.findUnique.mockResolvedValue({ targetPerDay: null, isArchived: true });
    const sonuc = await toggleHabitDayAction({ habitId: ID, date: '2026-10-20' });

    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) {
      expect(sonuc.error.code).toBe('VALIDATION_ERROR');
      expect(sonuc.error.message).toContain('arşivden çıkarın');
    }
    expect(dbMock.habitLog.upsert).not.toHaveBeenCalled();
  });

  it('olmayan alışkanlık → NOT_FOUND', async () => {
    dbMock.habit.findUnique.mockResolvedValue(null);
    const sonuc = await setHabitDayCountAction({ habitId: ID, date: '2026-10-20', count: 2 });
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.error.code).toBe('NOT_FOUND');
  });

  it('negatif sayaç şemada reddediliyor', async () => {
    const sonuc = await setHabitDayCountAction({ habitId: ID, date: '2026-10-20', count: -1 });
    expect(sonuc.ok).toBe(false);
    expect(dbMock.habit.findUnique).not.toHaveBeenCalled();
  });
});
