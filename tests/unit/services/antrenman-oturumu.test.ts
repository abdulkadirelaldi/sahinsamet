import { describe, expect, it, vi } from 'vitest';

import {
  abandonSession,
  createSuggestedProgram,
  fetchProgram,
  fetchRecentSessions,
  fetchSession,
  finishSession,
  kaloriHesapla,
  MET,
  ONERILEN_PROGRAM,
  OturumHatasi,
  startSession,
  VARSAYILAN_KILO,
  ilerlemeOnerisi,
  tekrarAraligi,
} from '@/server/services/antrenman-oturumu';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

describe('kaloriHesapla — MET × kg × saat', () => {
  it('60 dk ağırlık, 80 kg → 400 kcal', () => {
    expect(kaloriHesapla({ dakika: 60, kiloKg: 80, met: MET.GYM })).toBe(400);
  });
  it('süre ya da kilo yoksa 0 — eksi değer üretmez', () => {
    expect(kaloriHesapla({ dakika: 0, kiloKg: 80, met: 5 })).toBe(0);
    expect(kaloriHesapla({ dakika: -5, kiloKg: 80, met: 5 })).toBe(0);
  });
});

describe('ONERILEN_PROGRAM — sahibinin PDF programı', () => {
  it('5 ağırlık günü + cumartesi kardiyo; pazar dinlenme (gün yok)', () => {
    expect(ONERILEN_PROGRAM.map((g) => g.haftaGunu)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ONERILEN_PROGRAM[0]!.hareketler).toHaveLength(6);
    // Kol önceliği: Gün 4'te sekiz hareket, çoğu kol.
    expect(ONERILEN_PROGRAM[3]!.hareketler).toHaveLength(8);
  });
});

describe('startSession · başka günden açık kalan (2026-11-01)', () => {
  const kurulum = (sonSet: { createdAt: Date } | null) => {
    const create = vi.fn().mockResolvedValue({ id: 'yeni' });
    const update = vi.fn();
    const del = vi.fn();
    const baslangic = new Date('2026-10-30T15:00:00Z');
    return {
      create,
      update,
      del,
      client: {
        workout: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'eski',
            date: new Date('2026-10-30T00:00:00Z'),
            startedAt: baslangic,
            programDay: null,
          }),
          findUnique: vi.fn().mockResolvedValue({
            startedAt: baslangic,
            finishedAt: null,
            type: 'GYM',
            date: new Date('2026-10-30T00:00:00Z'),
          }),
          create,
          update,
          delete: del,
        },
        workoutSet: { findFirst: vi.fn().mockResolvedValue(sonSet) },
        programDay: {
          findUnique: vi.fn().mockResolvedValue({ id: 'g', exercises: [] }),
        },
        healthLog: { findFirst: vi.fn().mockResolvedValue(null) },
      } as never,
    };
  };

  it('⚠️ süre son sete kadar sayılır, bugünün programı başlar', async () => {
    const k = kurulum({ createdAt: new Date('2026-10-30T15:45:00Z') });
    expect(await startSession('g', k.client, '2026-10-31')).toEqual({ id: 'yeni', yeni: true });
    expect(k.update.mock.calls[0]?.[0].data.durationMin).toBe(45);
    expect(k.del).not.toHaveBeenCalled();
  });

  it('hiç set yoksa boş kayıt silinir', async () => {
    const k = kurulum(null);
    await startSession('g', k.client, '2026-10-31');
    expect(k.del).toHaveBeenCalledWith({ where: { id: 'eski' } });
    expect(k.update).not.toHaveBeenCalled();
  });
});

describe('startSession', () => {
  it('⚠️ açık oturum varsa YENİSİNİ AÇMAZ, onu döndürür', async () => {
    const create = vi.fn();
    const client = {
      workout: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'acik',
          startedAt: new Date(),
          programDay: { name: 'İtiş' },
        }),
        create,
      },
    } as never;
    expect(await startSession('gun', client)).toEqual({ id: 'acik', yeni: false });
    expect(create).not.toHaveBeenCalled();
  });

  it('yalnızca kardiyo hareketleri olan gün CARDIO türünde açılır', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'yeni' });
    const client = {
      workout: { findFirst: vi.fn().mockResolvedValue(null), create },
      programDay: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'g',
          exercises: [{ exercise: { muscleGroup: 'CARDIO' } }],
        }),
      },
    } as never;
    const simdi = new Date('2026-10-30T07:00:00Z');
    expect(await startSession('g', client, '2026-10-30', simdi)).toEqual({
      id: 'yeni',
      yeni: true,
    });
    expect(create.mock.calls[0]?.[0].data).toMatchObject({ type: 'CARDIO', startedAt: simdi });
  });

  it('program günü yoksa GUN_YOK', async () => {
    const client = {
      workout: { findFirst: vi.fn().mockResolvedValue(null) },
      programDay: { findUnique: vi.fn().mockResolvedValue(null) },
    } as never;
    await expect(startSession('x', client)).rejects.toBeInstanceOf(OturumHatasi);
  });
});

describe('startSession · BOŞ OTURUM TUZAĞI (2026-11-12)', () => {
  const acikOturum = (e: Record<string, unknown>) => ({
    id: 'bos',
    date: new Date('2026-11-12T00:00:00Z'),
    startedAt: new Date('2026-11-12T08:00:00Z'),
    programDayId: 'bosGun',
    programDay: { name: 'Hareketsiz gün' },
    _count: { sets: 0 },
    ...e,
  });
  const kurulum = (acik: Record<string, unknown>) => {
    const create = vi.fn().mockResolvedValue({ id: 'yeni' });
    const del = vi.fn();
    return {
      create,
      del,
      client: {
        workout: { findFirst: vi.fn().mockResolvedValue(acik), create, delete: del },
        programDay: { findUnique: vi.fn().mockResolvedValue({ id: 'itis', exercises: [] }) },
      } as never,
    };
  };

  it('⚠️ bugün BAŞKA günden açılmış, set girilmemiş oturum silinir ve istenen gün başlar', async () => {
    const k = kurulum(acikOturum({}));
    expect(await startSession('itis', k.client, '2026-11-12')).toEqual({ id: 'yeni', yeni: true });
    expect(k.del).toHaveBeenCalledWith({ where: { id: 'bos' } });
  });

  it('aynı günün boş oturumu korunur (ikinci oturum açılmaz)', async () => {
    const k = kurulum(acikOturum({ programDayId: 'itis' }));
    expect(await startSession('itis', k.client, '2026-11-12')).toEqual({ id: 'bos', yeni: false });
    expect(k.del).not.toHaveBeenCalled();
  });

  it('set girilmiş oturum SİLİNMEZ — yapılan iş kaybolmaz', async () => {
    const k = kurulum(acikOturum({ _count: { sets: 2 } }));
    expect(await startSession('itis', k.client, '2026-11-12')).toEqual({ id: 'bos', yeni: false });
    expect(k.del).not.toHaveBeenCalled();
  });
});

describe('abandonSession — boş oturumdan vazgeç (2026-11-12)', () => {
  const istemci = (w: unknown) => {
    const del = vi.fn();
    return {
      del,
      client: { workout: { findUnique: vi.fn().mockResolvedValue(w), delete: del } } as never,
    };
  };

  it('set yoksa kayıt silinir', async () => {
    const k = istemci({ startedAt: new Date(), finishedAt: null, _count: { sets: 0 } });
    await abandonSession('w1', k.client);
    expect(k.del).toHaveBeenCalledWith({ where: { id: 'w1' } });
  });

  it.each([
    ['set varsa', { startedAt: new Date(), finishedAt: null, _count: { sets: 1 } }, 'SETLI'],
    ['bitmişse', { startedAt: new Date(), finishedAt: new Date(), _count: { sets: 0 } }, 'BITMIS'],
    ['yoksa', null, 'OTURUM_YOK'],
  ])('%s silinmez', async (_ad, w, sebep) => {
    const k = istemci(w);
    await expect(abandonSession('w1', k.client)).rejects.toMatchObject({ sebep });
    expect(k.del).not.toHaveBeenCalled();
  });
});

describe('finishSession', () => {
  const istemci = (kilo: unknown, bitmis = false) => {
    const update = vi.fn();
    return {
      client: {
        workout: {
          findUnique: vi.fn().mockResolvedValue({
            startedAt: new Date('2026-10-30T07:00:00Z'),
            date: new Date('2026-10-30T00:00:00Z'),
            finishedAt: bitmis ? new Date() : null,
            type: 'GYM',
          }),
          update,
        },
        healthLog: { findFirst: vi.fn().mockResolvedValue(kilo ? { weightKg: kilo } : null) },
      } as never,
      update,
    };
  };

  it('süre dakikaya yuvarlanır, kalori SON TARTI kilosuyla', async () => {
    const { client, update } = istemci(decimal('90.00'));
    const s = await finishSession('w', client, new Date('2026-10-30T08:00:30Z'));
    expect(s).toEqual({
      gun: '2026-10-30',
      durationMin: 61,
      kcal: kaloriHesapla({ dakika: 61, kiloKg: 90, met: 5 }),
      kiloKg: 90,
      varsayilanKilo: false,
    });
    expect(update.mock.calls[0]?.[0].data).toMatchObject({ durationMin: 61, kcal: s.kcal });
  });

  it('tartı yoksa varsayılan kilo ve bunu SÖYLER', async () => {
    const { client } = istemci(null);
    const s = await finishSession('w', client, new Date('2026-10-30T08:00:00Z'));
    expect(s).toMatchObject({ kiloKg: VARSAYILAN_KILO, varsayilanKilo: true });
  });

  it('bitmiş oturum ikinci kez bitirilmez', async () => {
    const { client } = istemci(null, true);
    await expect(finishSession('w', client)).rejects.toMatchObject({ sebep: 'BITMIS' });
  });
});

describe('createSuggestedProgram', () => {
  it('program varsa DOKUNMAZ', async () => {
    const tx = vi.fn();
    const client = {
      programDay: { count: vi.fn().mockResolvedValue(3) },
      $transaction: tx,
    } as never;
    expect(await createSuggestedProgram(client)).toBe(0);
    expect(tx).not.toHaveBeenCalled();
  });
});

describe('⚠️ hiçbir DTO yüzeyi `Decimal` sızdırmıyor', () => {
  const hareket = {
    id: 'pe1',
    exerciseId: 'ex1',
    sets: 4,
    reps: '6-10',
    restSec: 105,
    exercise: { name: 'Bench', tip: null, muscleGroup: 'CHEST' },
  };

  it('fetchSession — yapılan ve önceki setlerin ağırlığı metin', async () => {
    const client = {
      workout: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'w',
          startedAt: new Date('2026-10-30T07:00:00Z'),
          finishedAt: null,
          date: new Date('2026-10-30T00:00:00Z'),
          durationMin: null,
          kcal: null,
          programDay: { name: 'İtiş', focus: null, exercises: [hareket] },
          sets: [{ id: 's1', exerciseId: 'ex1', setNo: 1, reps: 8, weightKg: decimal('60.50') }],
        }),
      },
      workoutSet: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ exerciseId: 'ex1', reps: 8, weightKg: decimal('57.50') }]),
      },
    } as never;
    const oturum = await fetchSession('w', client);
    expect(decimalKalanlar(oturum)).toEqual([]);
    expect(oturum?.hareketler[0]?.yapilanSetler[0]?.weightKg).toBe('60.50');
    expect(oturum?.hareketler[0]?.oncekiSet).toEqual({ reps: 8, weightKg: '57.50' });
  });

  it('fetchProgram ve fetchRecentSessions', async () => {
    const client = {
      programDay: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 'g', name: 'İtiş', focus: null, weekday: 1, exercises: [hareket] },
          ]),
      },
      workout: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'w',
            date: new Date('2026-10-30T00:00:00Z'),
            durationMin: 60,
            kcal: 400,
            startedAt: new Date(),
            finishedAt: null,
            programDay: { name: 'İtiş' },
            _count: { sets: 3 },
          },
        ]),
      },
    } as never;
    expect(decimalKalanlar(await fetchProgram(client))).toEqual([]);
    const sonlar = await fetchRecentSessions(5, client);
    expect(decimalKalanlar(sonlar)).toEqual([]);
    expect(sonlar[0]).toMatchObject({ date: '2026-10-30', suruyor: true, setSayisi: 3 });
  });
});

describe('ilerlemeOnerisi — çift ilerleme (2026-10-30)', () => {
  const set = (reps: number, weightKg: string | null) => ({ reps, weightKg });

  it('⚠️ kardiyoda birim dakika, hedef aralığı aşılmaz', () => {
    const o = ilerlemeOnerisi([set(30, null)], '20-30', 1, true);
    expect(o).toMatchObject({ weightKg: null, reps: 30 });
    expect(o?.neden).toContain('dakika');
    expect(ilerlemeOnerisi([set(45, null)], '20-30', 1, true)?.reps).toBe(30);
    expect(ilerlemeOnerisi([set(10, null)], '20-30', 1, true)?.reps).toBe(20);
  });

  it('tekrar aralığı', () => {
    expect(tekrarAraligi('8-12')).toEqual([8, 12]);
    expect(tekrarAraligi('10')).toEqual([10, 10]);
    expect(tekrarAraligi('12–8')).toEqual([8, 12]);
    expect(tekrarAraligi('tükenene kadar')).toBeNull();
  });

  it('tüm setler üst sınırda → ağırlık artar, tekrar alttan', () => {
    const o = ilerlemeOnerisi([set(12, '40'), set(12, '40'), set(12, '40')], '8-12', 3);
    expect(o).toMatchObject({ weightKg: '42.5', reps: 8 });
    expect(o?.neden).toContain('2,5 kg artır');
  });

  it("küçük ağırlıkta +1 kg (2,5 kg %10'u aşardı)", () => {
    expect(
      ilerlemeOnerisi([set(12, '10'), set(12, '10'), set(12, '10')], '10-12', 3),
    ).toMatchObject({
      weightKg: '11',
      reps: 10,
    });
  });

  it('üst sınıra ulaşmadıysa aynı ağırlık, +1 tekrar (üst sınırı aşmaz)', () => {
    expect(ilerlemeOnerisi([set(10, '40'), set(9, '40'), set(8, '40')], '8-12', 3)).toMatchObject({
      weightKg: '40',
      reps: 11,
    });
    // set sayısı eksik → üstte olsa da artmaz
    expect(ilerlemeOnerisi([set(12, '40'), set(12, '40')], '8-12', 3)).toMatchObject({
      weightKg: '40',
      reps: 12,
    });
  });

  it('en ağır ağırlığın setlerine bakar (ısınma setleri sayılmaz)', () => {
    expect(
      ilerlemeOnerisi([set(15, '20'), set(12, '40'), set(12, '40'), set(12, '40')], '8-12', 3),
    ).toMatchObject({ weightKg: '42.5' });
  });

  it('ağırlıksız hareket: yalnızca tekrar; geçmiş yoksa öneri yok', () => {
    expect(ilerlemeOnerisi([set(15, null), set(12, null)], '10-15', 3)).toMatchObject({
      weightKg: null,
      reps: 16,
    });
    expect(ilerlemeOnerisi([], '8-12', 3)).toBeNull();
  });
});
