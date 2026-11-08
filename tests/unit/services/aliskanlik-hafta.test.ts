import { describe, expect, it, vi } from 'vitest';

import { fetchHabitDay, otomatikIsaretle } from '@/server/services/habit-gun';
import { gunGerekliMi, gunOranlari, haftaYuzdesi } from '@/server/services/habit';

const GUNLER = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
];
const hafta = (counts: number[], targetPerWeek = 7) =>
  ({ days: GUNLER, habits: [{ counts, targetPerDay: null, targetPerWeek }] }) as never;

describe('gunGerekliMi (2026-11-01)', () => {
  it('her gün olan hep gereklidir', () => {
    expect(gunGerekliMi(7, 0, 0)).toBe(true);
    expect(gunGerekliMi(7, 3, 3)).toBe(true);
  });
  it('⚠️ haftada 3: hedef kalan günlere sığıyorsa gerekli değil', () => {
    expect(gunGerekliMi(3, 0, 0)).toBe(false);
    expect(gunGerekliMi(3, 0, 3)).toBe(false);
    expect(gunGerekliMi(3, 0, 4)).toBe(true);
    expect(gunGerekliMi(3, 3, 5)).toBe(false);
  });
});

describe('haftalık hedefli oranlar', () => {
  it('⚠️ hedefini tutan %100 görür: pzt-çar-cum, boş günler eksik sayılmaz', () => {
    expect(haftaYuzdesi(hafta([1, 0, 1, 0, 1, 0, 0], 3), '2026-11-01')).toBe(100);
    const oranlar = gunOranlari(hafta([1, 0, 1, 0, 1, 0, 0], 3));
    expect(oranlar).toEqual([1, 0, 1, 0, 1, 0, 0]);
  });
  it('hedef kaçarsa eksik görünür', () => {
    expect(haftaYuzdesi(hafta([0, 0, 0, 0, 0, 0, 0], 3), '2026-11-01')).toBe(0);
  });
  it('her gün olanın hesabı değişmedi', () => {
    expect(haftaYuzdesi(hafta([1, 0, 1, 0, 0, 0, 0]), '2026-10-28')).toBe(67);
  });
});

describe('fetchHabitDay · haftalık alan', () => {
  const istemci = (onceki: unknown[]) => ({
    habit: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'h',
          name: 'Koşu',
          icon: null,
          color: null,
          targetPerDay: null,
          targetPerWeek: 3,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ]),
    },
    habitLog: { findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(onceki) },
  });

  it('salı, hedefe yer var: gerekli değil, sayaç doğru', async () => {
    const d = await fetchHabitDay(
      '2026-10-27',
      istemci([{ habitId: 'h', count: 1, missed: false }]) as never,
      '2026-10-27',
    );
    expect(d.items[0]).toMatchObject({ gerekli: false, hafta: { tamam: 1, hedef: 3 } });
  });

  it('cuma, hiç yapılmadı: gerekli', async () => {
    const d = await fetchHabitDay('2026-10-30', istemci([]) as never, '2026-10-30');
    expect(d.items[0]).toMatchObject({ gerekli: true, hafta: { tamam: 0, hedef: 3 } });
  });
});

describe('otomatikIsaretle (2026-11-01)', () => {
  const istemci = (mevcut: number | null, hedef: number | null) => ({
    habit: { findMany: vi.fn().mockResolvedValue([{ id: 'h', targetPerDay: hedef }]) },
    habitLog: {
      findUnique: vi.fn().mockResolvedValue(mevcut === null ? null : { count: mevcut }),
      upsert: vi.fn(),
    },
  });

  it('spor tam işaretlenir', async () => {
    const c = istemci(null, null);
    await otomatikIsaretle('SPOR', '2026-10-30', null, false, c as never);
    expect(c.habitLog.upsert.mock.calls[0]?.[0].create).toMatchObject({ count: 1, missed: false });
  });

  it('su içilen orana göre: 1,5 L, 7 bardaklık hedefte 3', async () => {
    const c = istemci(null, 7);
    await otomatikIsaretle('SU', '2026-10-30', 1500, false, c as never);
    expect(c.habitLog.upsert.mock.calls[0]?.[0].create.count).toBe(3);
  });

  it('kişisel su hedefi: 2 L hedefte 1 L, 7 bardağın 3ü', async () => {
    const c = istemci(null, 7);
    await otomatikIsaretle('SU', '2026-10-30', 1000, false, c as never, 2000);
    expect(c.habitLog.upsert.mock.calls[0]?.[0].create.count).toBe(3);
  });

  it('hedef aşılmaz', async () => {
    const c = istemci(null, 7);
    await otomatikIsaretle('SU', '2026-10-30', 9000, false, c as never);
    expect(c.habitLog.upsert.mock.calls[0]?.[0].create.count).toBe(7);
  });

  it('⚠️ elle girilenin altına inmez; geri almada (`kesin`) iner', async () => {
    const c = istemci(5, 7);
    await otomatikIsaretle('SU', '2026-10-30', 1000, false, c as never);
    expect(c.habitLog.upsert).not.toHaveBeenCalled();
    await otomatikIsaretle('SU', '2026-10-30', 1000, true, c as never);
    expect(c.habitLog.upsert.mock.calls[0]?.[0].update.count).toBe(2);
  });
});
