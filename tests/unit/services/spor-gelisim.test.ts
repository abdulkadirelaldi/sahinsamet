import { describe, expect, it, vi } from 'vitest';

import {
  fetchSporGelisim,
  gelisimHesapla,
  rekorMu,
  type GelisimSeti,
} from '@/server/services/spor-gelisim';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

const s = (o: Partial<GelisimSeti>): GelisimSeti => ({
  exerciseId: 'a',
  ad: 'Bench',
  reps: 10,
  kg: 50,
  gun: '2026-10-28',
  ...o,
});

describe('gelisimHesapla (2026-11-01)', () => {
  it('hacim haftalara ayrılır; 8 hafta, eskiden yeniye', () => {
    const g = gelisimHesapla(
      [s({}), s({ reps: 5, kg: 100 }), s({ gun: '2026-10-20', kg: 10 }), s({ gun: '2020-01-01' })],
      undefined,
      '2026-10-31',
    );
    expect(g.hacim).toHaveLength(8);
    expect(g.hacim.at(-1)).toEqual({ hafta: '2026-10-26', kg: 1000 });
    expect(g.hacim.at(-2)).toEqual({ hafta: '2026-10-19', kg: 100 });
    expect(g.hacim[0]?.hafta).toBe('2026-09-07');
  });

  it('varsayılan en çok çalışılan hareket; aynı günde en ağır set', () => {
    const g = gelisimHesapla(
      [
        s({ exerciseId: 'b', ad: 'Squat' }),
        s({ kg: 60 }),
        s({ kg: 70 }),
        s({ kg: 65, gun: '2026-10-20' }),
      ],
      undefined,
      '2026-10-31',
    );
    expect(g.secili).toBe('a');
    expect(g.seri).toEqual([
      { gun: '2026-10-20', deger: '65' },
      { gun: '2026-10-28', deger: '70' },
    ]);
  });

  it('⚠️ listede olmayan istek en çok çalışılana düşer; istek geçerliyse o seçilir', () => {
    const setler = [s({}), s({}), s({ exerciseId: 'b', ad: 'Squat' })];
    expect(gelisimHesapla(setler, 'yok', '2026-10-31').secili).toBe('a');
    expect(gelisimHesapla(setler, 'b', '2026-10-31').secili).toBe('b');
  });

  it('veri yoksa boş', () => {
    const g = gelisimHesapla([], undefined, '2026-10-31');
    expect(g).toMatchObject({ hareketler: [], secili: null, seri: [] });
  });
});

describe('rekorMu', () => {
  const gecmis = [
    { reps: 5, kg: 100 },
    { reps: 10, kg: 80 },
  ];
  it('⚠️ hareketin ilk seti rekor DEĞİL', () => {
    expect(rekorMu({ reps: 5, kg: 100 }, [])).toBe(false);
  });
  it('en ağırı geçen rekor, tekrar sayısı farklı olsa da', () => {
    expect(rekorMu({ reps: 3, kg: 105 }, gecmis)).toBe(true);
  });
  it('aynı tekrarda en iyiyi geçen rekor', () => {
    expect(rekorMu({ reps: 10, kg: 85 }, gecmis)).toBe(true);
  });
  it('⚠️ eşitlemek rekor değil; ilk kez denenen tekrar sayısı da değil', () => {
    expect(rekorMu({ reps: 10, kg: 80 }, gecmis)).toBe(false);
    expect(rekorMu({ reps: 20, kg: 40 }, gecmis)).toBe(false);
  });
  it('ağırlıksız set rekor değil', () => {
    expect(rekorMu({ reps: 20, kg: 0 }, gecmis)).toBe(false);
  });
});

describe('fetchSporGelisim', () => {
  it('Decimal sızmaz', async () => {
    const client = {
      workoutSet: {
        findMany: vi.fn().mockResolvedValue([
          {
            exerciseId: 'a',
            reps: 5,
            weightKg: decimal('100.50'),
            exercise: { name: 'Bench' },
            workout: { date: new Date('2026-10-28T00:00:00Z') },
          },
        ]),
      },
    } as never;
    const g = await fetchSporGelisim(undefined, client, '2026-10-31');
    expect(decimalKalanlar(g)).toEqual([]);
    expect(g.seri).toEqual([{ gun: '2026-10-28', deger: '100.5' }]);
    expect(g.hacim.at(-1)?.kg).toBe(503);
  });
});
