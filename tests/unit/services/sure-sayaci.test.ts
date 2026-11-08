import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => {
  const dbMock = {
    habit: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    habitLog: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { dbMock };
});
vi.mock('@/server/db', () => ({ db: dbMock }));

import { sureBicim } from '@/components/panel/hayat-bicim';
import { createHabitSchema } from '@/lib/schemas/habit';
import { archiveHabit } from '@/server/services/habit';
import {
  sayaciBaslat,
  sayaciDurdur,
  setHabitDayCount,
  setHabitDayStatus,
  sureEkle,
  toggleHabitDay,
} from '@/server/services/habit-log';

const HABIT = 'cmhabit000000000000000001';
const simdi = new Date('2026-11-02T12:00:00Z');
const dakikaOnce = (dk: number) => new Date(simdi.getTime() - dk * 60_000);

beforeEach(() => {
  vi.resetAllMocks();
  dbMock.$transaction.mockImplementation((f: (tx: typeof dbMock) => unknown) => f(dbMock));
  dbMock.habit.updateMany.mockResolvedValue({ count: 1 });
  dbMock.habitLog.upsert.mockImplementation(
    (a: { create: { count: number; missed: boolean } }) => ({
      count: a.create.count,
      missed: false,
    }),
  );
});

const yazilabilir = (over: Record<string, unknown> = {}) =>
  dbMock.habit.findUnique.mockResolvedValue({
    targetPerDay: 30,
    isArchived: false,
    sureli: true,
    sayacBaslangic: null,
    ...over,
  });

describe('sayaciDurdur', () => {
  it('geçen dakikayı mevcut toplama ekler', async () => {
    yazilabilir({ sayacBaslangic: dakikaOnce(20) });
    dbMock.habitLog.findUnique.mockResolvedValue({ count: 15 });
    const r = await sayaciDurdur({ habitId: HABIT }, simdi);
    expect(r).toMatchObject({ durum: 'KAYDEDILDI', eklenen: 20, sonuc: { count: 35 } });
    expect(dbMock.habit.updateMany.mock.calls[0]?.[0].data).toEqual({ sayacBaslangic: null });
  });

  it('⚠️ gece yarısını geçen süre başladığı güne yazılır', async () => {
    const baslangic = new Date('2026-11-02T20:50:00Z'); // İstanbul 23:50
    yazilabilir({ sayacBaslangic: baslangic });
    dbMock.habitLog.findUnique.mockResolvedValue(null);
    const r = await sayaciDurdur({ habitId: HABIT }, new Date('2026-11-02T21:20:00Z'));
    expect(r).toMatchObject({ sonuc: { date: '2026-11-02', count: 30 } });
  });

  it('⚠️ unutulan sayaç süre yazmadan sorar ve çalışmaya devam eder', async () => {
    yazilabilir({ sayacBaslangic: dakikaOnce(600) });
    expect(await sayaciDurdur({ habitId: HABIT }, simdi)).toEqual({ durum: 'UZUN', gecenDk: 600 });
    expect(dbMock.habit.updateMany).not.toHaveBeenCalled();
    expect(dbMock.habitLog.upsert).not.toHaveBeenCalled();
  });

  it('sorulan süre yazılır; 0 kaydetmeden kapatır', async () => {
    yazilabilir({ sayacBaslangic: dakikaOnce(600) });
    dbMock.habitLog.findUnique.mockResolvedValue(null);
    expect(await sayaciDurdur({ habitId: HABIT, dakika: 45 }, simdi)).toMatchObject({
      sonuc: { count: 45 },
    });
    dbMock.habitLog.upsert.mockClear();
    expect(await sayaciDurdur({ habitId: HABIT, dakika: 0 }, simdi)).toMatchObject({ eklenen: 0 });
    expect(dbMock.habitLog.upsert).not.toHaveBeenCalled();
  });

  it('⚠️ eşzamanlı ikinci durdurma süreyi iki kez eklemez', async () => {
    yazilabilir({ sayacBaslangic: dakikaOnce(20) });
    dbMock.habit.updateMany.mockResolvedValue({ count: 0 });
    expect(await sayaciDurdur({ habitId: HABIT }, simdi)).toEqual({ durum: 'YOK' });
    expect(dbMock.habitLog.upsert).not.toHaveBeenCalled();
    // Kapatma okunan başlangıca bağlı: gecikmiş istek yeni sayacı kapatamaz.
    expect(dbMock.habit.updateMany.mock.calls[0]?.[0].where).toEqual({
      id: HABIT,
      sayacBaslangic: dakikaOnce(20),
    });
  });

  it('yarım dakikadan kısa sayaç kapanır, süre yazmaz', async () => {
    yazilabilir({ sayacBaslangic: new Date(simdi.getTime() - 10_000) });
    dbMock.habitLog.findUnique.mockResolvedValue(null);
    expect(await sayaciDurdur({ habitId: HABIT }, simdi)).toMatchObject({
      durum: 'KAYDEDILDI',
      eklenen: 0,
    });
    expect(dbMock.habitLog.upsert).not.toHaveBeenCalled();
  });

  it('çalışan sayaç yoksa bir şey yazmaz', async () => {
    yazilabilir();
    expect(await sayaciDurdur({ habitId: HABIT }, simdi)).toEqual({ durum: 'YOK' });
  });
});

describe('sayaciBaslat', () => {
  it('⚠️ çalışan sayacı sıfırlamaz', async () => {
    const baslangic = dakikaOnce(5);
    yazilabilir({ sayacBaslangic: baslangic });
    expect(await sayaciBaslat(HABIT, simdi)).toBe(baslangic.toISOString());
    // Yazma yalnızca kapalı sayaca: iki cihaz yarışında ilk başlangıç kalır.
    expect(dbMock.habit.updateMany.mock.calls[0]?.[0].where).toEqual({
      id: HABIT,
      sayacBaslangic: null,
    });
  });

  it('kapalıysa başlatır', async () => {
    yazilabilir();
    expect(await sayaciBaslat(HABIT, simdi)).toBe(simdi.toISOString());
    expect(dbMock.habit.updateMany.mock.calls[0]?.[0].data).toEqual({ sayacBaslangic: simdi });
  });

  it('süreli olmayan alışkanlıkta başlamaz', async () => {
    yazilabilir({ sureli: false });
    await expect(sayaciBaslat(HABIT, simdi)).rejects.toMatchObject({ reason: 'SURELI_DEGIL' });
  });
});

describe('sonradan ekleme ve sınırlar', () => {
  it('hedefin üstüne de eklenir', async () => {
    yazilabilir();
    dbMock.habitLog.findUnique.mockResolvedValue({ count: 40 });
    const r = await sureEkle({ habitId: HABIT, date: '2026-11-02', dakika: 30 });
    expect(r.count).toBe(70);
  });

  it('süreli olmayan alışkanlığa süre eklenmez', async () => {
    yazilabilir({ sureli: false });
    await expect(
      sureEkle({ habitId: HABIT, date: '2026-11-02', dakika: 30 }),
    ).rejects.toMatchObject({
      reason: 'SURELI_DEGIL',
    });
  });

  it('⚠️ elle işaretleme açık sayacı kapatır: süre iki kez sayılmaz', async () => {
    yazilabilir({ sayacBaslangic: dakikaOnce(30) });
    await setHabitDayStatus({ habitId: HABIT, date: '2026-11-02', durum: 'YAPTIM' });
    expect(dbMock.habit.updateMany.mock.calls[0]?.[0].data).toEqual({ sayacBaslangic: null });
  });

  it('bir günü geçmez', async () => {
    yazilabilir();
    dbMock.habitLog.findUnique.mockResolvedValue({ count: 1430 });
    const r = await sureEkle({ habitId: HABIT, date: '2026-11-02', dakika: 30 });
    expect(r.count).toBe(1440);
  });

  it('süreli hedefte toplam 100 dakikayı geçebilir, sayılı hedefte geçemez', async () => {
    yazilabilir();
    const sureli = await setHabitDayCount({ habitId: HABIT, date: '2026-11-02', count: 120 });
    expect(sureli.count).toBe(120);
    yazilabilir({ sureli: false });
    const sayili = await setHabitDayCount({ habitId: HABIT, date: '2026-11-02', count: 120 });
    expect(sayili.count).toBe(100);
  });

  it('süreli hedefte hücre tıkı bir dakika eklemez, hedefe tamamlar', async () => {
    yazilabilir();
    dbMock.habitLog.findUnique.mockResolvedValue(null);
    const r = await toggleHabitDay({ habitId: HABIT, date: '2026-11-02' });
    expect(r.count).toBe(30);
  });
});

describe('arşiv', () => {
  it('⚠️ arşivlemek açık sayacı kapatır', async () => {
    const update = vi.fn().mockResolvedValue({
      id: HABIT,
      createdAt: simdi,
      updatedAt: simdi,
    });
    await archiveHabit({ id: HABIT, isArchived: true }, { habit: { update } } as never);
    expect(update.mock.calls[0]?.[0].data).toEqual({ isArchived: true, sayacBaslangic: null });
    update.mockClear();
    await archiveHabit({ id: HABIT, isArchived: false }, { habit: { update } } as never);
    expect(update.mock.calls[0]?.[0].data).toEqual({ isArchived: false });
  });
});

describe('biçim ve şema', () => {
  it('sureBicim', () => {
    expect(sureBicim(30)).toBe('30 dk');
    expect(sureBicim(60)).toBe('1 sa');
    expect(sureBicim(90)).toBe('1 sa 30 dk');
    expect(sureBicim(0)).toBe('0 dk');
  });

  it('süreli hedef dakika ister', () => {
    expect(createHabitSchema.safeParse({ name: 'Kitap', sureli: true }).success).toBe(false);
    expect(
      createHabitSchema.safeParse({ name: 'Kitap', sureli: true, targetPerDay: 90 }).success,
    ).toBe(true);
    expect(createHabitSchema.safeParse({ name: 'Kitap' }).success).toBe(true);
  });
});
