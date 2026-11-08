import { describe, expect, it, vi } from 'vitest';

import {
  createSuggestedHabits,
  fetchHabitDay,
  fetchHabitReport,
  gunDurumu,
  isiHaritasi,
  moveHabit,
  ONERILEN_ALISKANLIKLAR,
} from '@/server/services/habit-gun';
import { gunOranlari } from '@/server/services/habit';
import { setHabitDayStatus } from '@/server/services/habit-log';

/* Sahte istemci — yalnızca kullanılan yöntemler. Tarihler UTC gece yarısı (`@db.Date`). */
const gunTarihi = (g: string) => new Date(`${g}T00:00:00.000Z`);

function istemci(habits: unknown[], logs: unknown[] = []) {
  const habitFindMany = vi.fn().mockResolvedValue(habits);
  const logFindMany = vi.fn().mockResolvedValue(logs);
  return {
    client: {
      habit: { findMany: habitFindMany, count: vi.fn(), createMany: vi.fn(), update: vi.fn() },
      habitLog: { findMany: logFindMany },
    } as never,
    habitFindMany,
    logFindMany,
  };
}

describe('gunDurumu — dört durum karıştırılmıyor', () => {
  it('açık "yapmadım" sayaçtan önce gelir', () => {
    expect(gunDurumu(0, true, null)).toBe('YAPILMADI');
    expect(gunDurumu(3, true, 8)).toBe('YAPILMADI');
  });

  it('sayısız: 0 işaretsiz, ≥1 yapıldı; sayılı: altı eksik', () => {
    expect(gunDurumu(0, false, null)).toBe('ISARETSIZ');
    expect(gunDurumu(1, false, null)).toBe('YAPILDI');
    expect(gunDurumu(5, false, 7)).toBe('EKSIK');
    expect(gunDurumu(7, false, 7)).toBe('YAPILDI');
  });
});

describe('fetchHabitDay', () => {
  it('liste sahibinin sırasıyla, o gün henüz yokken eklenenler hariç', async () => {
    const { client, habitFindMany } = istemci(
      [
        {
          id: 'a',
          name: 'Diş',
          icon: '🪥',
          color: null,
          targetPerDay: 2,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'b',
          name: 'Kitap',
          icon: '📖',
          color: null,
          targetPerDay: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        // 30 Ekim 01:00 İstanbul = 29 Ekim 22:00 UTC: 29 Ekim listesine girmez.
        {
          id: 'c',
          name: 'Gece açılan',
          icon: null,
          color: null,
          targetPerDay: null,
          createdAt: new Date('2026-10-29T22:00:00Z'),
        },
      ],
      [
        { habitId: 'a', count: 1, missed: false },
        { habitId: 'b', count: 0, missed: true },
      ],
    );
    const sonuc = await fetchHabitDay('2026-10-29', client, '2026-10-29');

    const arg = habitFindMany.mock.calls[0]?.[0];
    expect(arg.orderBy[0]).toEqual({ order: 'asc' });
    // Sorgu geniş, kesin eleme İstanbul gününe göre: `c` ertesi gün açıldı.
    expect(arg.where.createdAt).toEqual({ lt: gunTarihi('2026-10-31') });
    expect(sonuc.items.map((i) => i.id)).toEqual(['a', 'b']);

    expect(sonuc.items.map((i) => i.durum)).toEqual(['EKSIK', 'YAPILMADI']);
    expect(sonuc.ozet).toMatchObject({ toplam: 2, eksik: 1, yapilmadi: 1, yapildi: 0 });
  });
});

describe('fetchHabitReport', () => {
  it('⚠️ alışkanlık EKLENDİĞİ GÜNDEN ÖNCE sayılmıyor — oranı haksız düşmesin', async () => {
    const { client } = istemci(
      [
        // Pencere 2026-10-23…29 (7 gün). Bu alışkanlık 27'sinde eklendi → 3 gün sayılır.
        {
          id: 'a',
          name: 'Kod',
          icon: null,
          targetPerDay: null,
          createdAt: new Date('2026-10-27T08:00:00Z'),
        },
      ],
      [
        { habitId: 'a', date: gunTarihi('2026-10-27'), count: 1, missed: false },
        { habitId: 'a', date: gunTarihi('2026-10-28'), count: 0, missed: true },
      ],
    );
    const rapor = await fetchHabitReport('2026-10-29', 7, client);
    const satir = rapor.satirlar[0]!;

    expect(rapor.gunler[0]).toBe('2026-10-23');
    expect(satir.gunler.slice(0, 4)).toEqual([null, null, null, null]);
    expect(satir.gunSayisi).toBe(3);
    expect(satir).toMatchObject({ yapildi: 1, yapilmadi: 1, isaretsiz: 1, oran: 33 });
    expect(rapor.genelOran).toBe(33);
  });
});

describe('createSuggestedHabits', () => {
  it('liste varsa DOKUNMAZ', async () => {
    const createMany = vi.fn();
    const client = { habit: { count: vi.fn().mockResolvedValue(2), createMany } } as never;
    expect(await createSuggestedHabits(client)).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('boşsa sahibinin listesini SIRASIYLA ekler', async () => {
    const createMany = vi.fn();
    const client = { habit: { count: vi.fn().mockResolvedValue(0), createMany } } as never;
    expect(await createSuggestedHabits(client)).toBe(ONERILEN_ALISKANLIKLAR.length);
    const data = createMany.mock.calls[0]?.[0].data as { name: string; order: number }[];
    expect(data.map((d) => d.order)).toEqual([...data.map((d) => d.order)].sort((a, b) => a - b));
    expect(data.find((d) => d.name.startsWith('Su'))).toMatchObject({ targetPerDay: 7 });
  });
});

describe('moveHabit', () => {
  it('komşusuyla yer değiştirir ve listeyi 10 aralıkla numaralar', async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = {
      habit: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'a', order: 0 },
          { id: 'b', order: 0 },
          { id: 'c', order: 0 },
        ]),
        update,
      },
    } as never;
    await moveHabit({ id: 'c', yon: 'yukari' }, client);
    const yeni = update.mock.calls.map((c) => [c[0].where.id, c[0].data.order]);
    expect(yeni).toEqual([
      ['a', 10],
      ['c', 20],
      ['b', 30],
    ]);
  });

  it('listenin başında yukarı taşımak hiçbir şey yazmaz', async () => {
    const update = vi.fn();
    const client = {
      habit: { findMany: vi.fn().mockResolvedValue([{ id: 'a', order: 10 }]), update },
    } as never;
    await moveHabit({ id: 'a', yon: 'yukari' }, client);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('setHabitDayStatus', () => {
  const istemciLog = (targetPerDay: number | null) => {
    const upsert = vi
      .fn()
      .mockImplementation(async (a: { update: { count: number; missed: boolean } }) => a.update);
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    return {
      client: {
        habit: { findUnique: vi.fn().mockResolvedValue({ targetPerDay, isArchived: false }) },
        habitLog: { upsert, deleteMany, findUnique: vi.fn() },
      } as never,
      upsert,
      deleteMany,
    };
  };
  const G = { habitId: 'ckabcdefghijklmnopqrstuv', date: '2026-10-29' };

  it('YAPTIM sayılı alışkanlıkta hedefe tamamlar', async () => {
    const { client, upsert } = istemciLog(7);
    const s = await setHabitDayStatus({ ...G, durum: 'YAPTIM' }, client);
    expect(s).toMatchObject({ count: 7, missed: false });
    expect(upsert.mock.calls[0]?.[0].update).toEqual({ count: 7, missed: false });
  });

  it('YAPMADIM satırı KORUR (count 0, missed true)', async () => {
    const { client, upsert, deleteMany } = istemciLog(null);
    const s = await setHabitDayStatus({ ...G, durum: 'YAPMADIM' }, client);
    expect(s).toMatchObject({ count: 0, missed: true });
    expect(upsert.mock.calls[0]?.[0].update).toEqual({ count: 0, missed: true });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('TEMIZLE satırı siler', async () => {
    const { client, deleteMany } = istemciLog(null);
    const s = await setHabitDayStatus({ ...G, durum: 'TEMIZLE' }, client);
    expect(s).toMatchObject({ count: 0, missed: false });
    expect(deleteMany).toHaveBeenCalled();
  });
});

describe('isiHaritasi — yıllık ısı haritası (2026-10-30)', () => {
  const bugun = '2026-10-30'; // cuma

  it('53 hafta, pazartesiden başlar, bugünde biter', () => {
    const h = isiHaritasi([], [], bugun);
    expect(h[0]?.gun).toBe('2025-10-27'); // bu haftanın pazartesisinden 52 hafta önce
    expect(h.at(-1)?.gun).toBe(bugun);
    expect(h.length).toBe(52 * 7 + 5);
    expect(h.every((x) => x.oran === null)).toBe(true);
  });

  it('oran: o gün TAMAMLANAN / o gün VAR OLAN alışkanlık', () => {
    const a = [
      { id: 'kitap', olusturma: '2026-01-01', targetPerDay: null },
      { id: 'su', olusturma: '2026-10-29', targetPerDay: 8 },
    ];
    const isaret = [
      { habitId: 'kitap', gun: '2026-10-28', count: 1 },
      { habitId: 'kitap', gun: '2026-10-30', count: 1 },
      { habitId: 'su', gun: '2026-10-30', count: 5 }, // 5/8 — tamamlanmadı
    ];
    const h = new Map(isiHaritasi(a, isaret, bugun).map((x) => [x.gun, x.oran]));
    expect(h.get('2025-12-31')).toBeNull(); // henüz alışkanlık yok
    expect(h.get('2026-10-28')).toBe(1); // yalnız kitap vardı
    expect(h.get('2026-10-30')).toBe(0.5); // kitap ✓, su eksik
  });
});

describe('gunOranlari — hafta görünümleri (2026-10-31)', () => {
  const satir = (counts: number[], targetPerDay: number | null) =>
    ({ counts, targetPerDay }) as never;

  it('gün başına tamamlanan oranı; hedefin altı sayılmaz', () => {
    expect(
      gunOranlari({
        days: ['2026-10-26', '2026-10-27'],
        habits: [satir([1, 0], null), satir([8, 5], 8)],
      }),
    ).toEqual([1, 0]);
    expect(
      gunOranlari({ days: ['2026-10-26'], habits: [satir([1], null), satir([0], null)] }),
    ).toEqual([0.5]);
  });

  it('alışkanlık yoksa 0', () => {
    expect(gunOranlari({ days: ['2026-10-26'], habits: [] })).toEqual([0]);
  });
});
