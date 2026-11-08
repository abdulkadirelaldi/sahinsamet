import { describe, expect, it, vi } from 'vitest';

import { planla, type PlanGirdisi } from '@/server/services/bildirim';
import { haftaYuzdesi } from '@/server/services/habit';
import { fetchHaftalikOzet, ozetMetni, type HaftalikOzet } from '@/server/services/haftalik-ozet';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

const GUNLER = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
];
const hafta = (counts: number[]) =>
  ({ days: GUNLER, today: '2026-10-28', habits: [{ counts, targetPerDay: null }] }) as never;

describe('haftaYuzdesi (2026-11-01)', () => {
  it('⚠️ gelecek günler oranı düşürmez', () => {
    expect(haftaYuzdesi(hafta([1, 0, 1, 0, 0, 0, 0]), '2026-10-28')).toBe(67);
    expect(haftaYuzdesi(hafta([1, 0, 1, 0, 0, 0, 0]), '2026-11-01')).toBe(29);
  });
  it('alışkanlık yoksa ya da hafta gelmediyse yok', () => {
    expect(haftaYuzdesi({ days: GUNLER, habits: [] }, '2026-10-28')).toBeNull();
    expect(haftaYuzdesi(hafta([0, 0, 0, 0, 0, 0, 0]), '2026-10-01')).toBeNull();
  });
});

describe('fetchHaftalikOzet', () => {
  const tarih = (g: string) => new Date(`${g}T00:00:00Z`);
  const client = {
    workout: {
      findMany: vi.fn().mockResolvedValue([
        {
          date: tarih('2026-10-27'),
          sets: [
            { reps: 10, weightKg: decimal('50.00') },
            { reps: 10, weightKg: null },
          ],
        },
        { date: tarih('2026-10-20'), sets: [{ reps: 5, weightKg: decimal('100.00') }] },
      ]),
    },
    walletFlow: {
      findMany: vi.fn().mockResolvedValue([
        { date: tarih('2026-10-28'), amount: decimal('100.00'), unit: 'TRY' },
        { date: tarih('2026-10-28'), amount: decimal('10.00'), unit: 'USD' },
        { date: tarih('2026-10-28'), amount: decimal('10.00'), unit: 'EUR' },
        { date: tarih('2026-10-21'), amount: decimal('50.00'), unit: 'TRY' },
      ]),
    },
    healthLog: {
      findMany: vi.fn().mockResolvedValue([
        { date: tarih('2026-10-22'), weightKg: decimal('82.00') },
        { date: tarih('2026-10-27'), weightKg: decimal('81.50') },
        { date: tarih('2026-10-29'), weightKg: decimal('81.00') },
      ]),
    },
  } as never;
  const aliskanlik = vi.fn().mockResolvedValue(hafta([1, 1, 0, 0, 0, 0, 0]));

  it('haftaları ayırır, kursuz kalem girmez, Decimal sızmaz', async () => {
    const o = await fetchHaftalikOzet(
      '2026-10-29',
      client,
      '2026-10-29',
      {
        kurlar: { USD: { buying: '40.0000', selling: '41.0000' } },
        guncellendi: null,
        bayat: false,
      },
      aliskanlik,
    );
    expect(decimalKalanlar(o)).toEqual([]);
    expect(o).toMatchObject({
      bas: '2026-10-26',
      son: '2026-11-01',
      spor: { antrenman: 1, hacimKg: 500, oncekiHacimKg: 500 },
      harcama: { tl: '510.00', oncekiTl: '50.00' },
      kilo: { son: '81.00', fark: '-1.00' },
    });
    expect(aliskanlik.mock.calls.map((c) => c[0])).toEqual(['2026-10-26', '2026-10-19']);
  });
});

const ozet = (o: Partial<HaftalikOzet>): HaftalikOzet => ({
  bas: '2026-10-26',
  son: '2026-11-01',
  aliskanlik: { yuzde: null, oncekiYuzde: null, gunler: [], adet: 0 },
  spor: { antrenman: 0, hacimKg: 0, oncekiHacimKg: 0 },
  harcama: { tl: '0.00', oncekiTl: '0.00' },
  kilo: { son: null, fark: null },
  ...o,
});

describe('ozetMetni', () => {
  it('olanları birleştirir', () => {
    expect(
      ozetMetni(
        ozet({
          aliskanlik: { yuzde: 72, oncekiYuzde: null, gunler: [], adet: 3 },
          spor: { antrenman: 3, hacimKg: 1, oncekiHacimKg: 0 },
          harcama: { tl: '4200.40', oncekiTl: '0.00' },
          kilo: { son: '81.50', fark: null },
        }),
      ),
    ).toBe('Alışkanlık %72 · 3 antrenman · 4.200 ₺ harcama · 81,5 kg');
  });
  it('⚠️ veri yoksa boş bildirim üretmez', () => {
    expect(ozetMetni(ozet({}))).toBeNull();
  });
});

describe('planla · haftalık', () => {
  const temel: PlanGirdisi = {
    gun: '2026-11-01',
    saat: 20,
    tercih: { borc: false, aliskanlik: false, su: false },
    borclar: [],
    kalanAliskanliklar: [],
    suMl: 4000,
    haftalikGovde: 'Alışkanlık %72',
  };
  it('pazar 20–23 arası gider', () => {
    expect(planla(temel)).toEqual([
      expect.objectContaining({ tur: 'haftalik', url: '/panel/haftalik', govde: 'Alışkanlık %72' }),
    ]);
    expect(planla({ ...temel, saat: 19 })).toEqual([]);
    expect(planla({ ...temel, saat: 23 })).toEqual([]);
  });
  it('pazar dışı, tercih kapalı ya da gövde yoksa gitmez', () => {
    expect(planla({ ...temel, gun: '2026-10-31' })).toEqual([]);
    expect(planla({ ...temel, tercih: { ...temel.tercih, haftalik: false } })).toEqual([]);
    expect(planla({ ...temel, haftalikGovde: null })).toEqual([]);
  });
});
