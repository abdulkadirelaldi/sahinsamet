import { describe, expect, it, vi } from 'vitest';

import { fetchAylikOzet, aylikMetni, ayMetni, type AylikOzet } from '@/server/services/aylik-ozet';
import { planla, type PlanGirdisi } from '@/server/services/bildirim';
import { gunSayilari } from '@/server/services/habit';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

const tarih = (g: string) => new Date(`${g}T00:00:00Z`);
const gunler = (pazartesi: string) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = tarih(pazartesi);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
const hafta = (pazartesi: string, counts: number[], ad = 'Kitap', id = 'h1') =>
  ({
    days: gunler(pazartesi),
    today: '2026-11-05',
    habits: [{ id, name: ad, counts, targetPerDay: null, targetPerWeek: 7 }],
  }) as never;

describe('gunSayilari · ay kenarı (2026-11-05)', () => {
  // 26 Ekim–1 Kasım haftası: 26–31 Ekim ve 1 Kasım.
  const kenar = hafta('2026-10-26', [1, 1, 0, 1, 1, 1, 1]);
  it('⚠️ aralık dışındaki günler sayılmaz', () => {
    expect(gunSayilari(kenar, '2026-11-05', { bas: '2026-11-01', son: '2026-11-30' })).toEqual({
      gerekli: 1,
      tamam: 1,
    });
    expect(gunSayilari(kenar, '2026-11-05', { bas: '2026-10-01', son: '2026-10-31' })).toEqual({
      gerekli: 6,
      tamam: 5,
    });
  });
  it('gelecek günler sayılmaz', () => {
    expect(gunSayilari(kenar, '2026-10-27')).toEqual({ gerekli: 2, tamam: 2 });
  });
});

describe('ayMetni', () => {
  it('ay adı ve yıl', () => {
    expect(ayMetni('2026-10')).toBe('Ekim 2026');
    expect(ayMetni('2027-01')).toBe('Ocak 2027');
  });
});

describe('fetchAylikOzet', () => {
  const client = {
    workout: {
      findMany: vi.fn().mockResolvedValue([
        { date: tarih('2026-10-05'), sets: [{ reps: 10, weightKg: decimal('50.00') }] },
        { date: tarih('2026-10-20'), sets: [{ reps: 5, weightKg: decimal('100.00') }] },
        { date: tarih('2026-09-15'), sets: [{ reps: 10, weightKg: decimal('40.00') }] },
      ]),
    },
    healthLog: {
      findMany: vi.fn().mockResolvedValue([
        {
          date: tarih('2026-10-02'),
          weightKg: decimal('82.00'),
          sleepHours: decimal('7.00'),
          steps: 8000,
          waterMl: 2000,
        },
        { date: tarih('2026-10-10'), weightKg: null, sleepHours: null, steps: null, waterMl: 3000 },
        {
          date: tarih('2026-10-30'),
          weightKg: decimal('80.50'),
          sleepHours: decimal('8.00'),
          steps: 10000,
          waterMl: null,
        },
      ]),
    },
  } as never;
  const ay = (harcamaTl: string) => ({
    ay: '2026-10',
    gelirTl: '50000.00',
    harcamaTl,
    duzenliGiderTl: '10000.00',
    borcOdemeTl: '5000.00',
    kalanTaksitTl: '0.00',
    kalanTl: '23000.00',
    kategoriler: [{ kategori: 'Market', tl: harcamaTl, yuzde: 100 }],
    kalemler: [],
  });
  const rapor = vi.fn().mockResolvedValue({
    ozet: ay('12000.00'),
    onceki: ay('10000.00'),
    alti: [],
    netGecmis: [],
    kurBayat: false,
  });
  const aliskanlik = vi.fn((pazartesi: string) =>
    Promise.resolve(hafta(pazartesi, [1, 0, 1, 0, 1, 0, 1])),
  );

  it('ayı ayırır, ortalamalar yalnızca kayıtlı günlerden, Decimal sızmaz', async () => {
    const o = await fetchAylikOzet('2026-10', client, '2026-11-05', rapor, aliskanlik as never);
    expect(decimalKalanlar(o)).toEqual([]);
    expect(o).toMatchObject({
      ay: '2026-10',
      para: { harcamaTl: '12000.00', oncekiHarcamaTl: '10000.00', kalanTl: '23000.00' },
      spor: { antrenman: 2, oncekiAntrenman: 1, hacimKg: 1000, oncekiHacimKg: 400 },
      saglik: {
        kiloBas: '82.00',
        kiloSon: '80.50',
        kiloFark: '-1.50',
        ortUyku: 7.5,
        ortAdim: 9000,
        ortSuMl: 2500,
      },
    });
    expect(o.aliskanlik.yuzde).not.toBeNull();
    expect(o.aliskanlik.enCok).toEqual([{ ad: 'Kitap', gun: expect.any(Number) as number }]);
    // Ekim'i kesen haftalar: 28 Eylül'den 26 Ekim'e beş pazartesi; Eylül için de ayrıca okunur.
    expect(aliskanlik.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['2026-09-28', '2026-10-05', '2026-10-26', '2026-08-31']),
    );
    expect(rapor).toHaveBeenCalledWith('2026-10');
  });

  it('tek tartıda kilo değişimi yok', async () => {
    const tekTarti = {
      ...(client as object),
      healthLog: {
        findMany: vi.fn().mockResolvedValue([
          {
            date: tarih('2026-10-02'),
            weightKg: decimal('82.00'),
            sleepHours: null,
            steps: null,
            waterMl: null,
          },
        ]),
      },
    } as never;
    const o = await fetchAylikOzet('2026-10', tekTarti, '2026-11-05', rapor, aliskanlik as never);
    expect(o.saglik).toMatchObject({ kiloSon: '82.00', kiloFark: null, ortUyku: null });
  });
});

const ozet = (o: Partial<AylikOzet>): AylikOzet => ({
  ay: '2026-10',
  para: {
    gelirTl: '0.00',
    harcamaTl: '0.00',
    duzenliGiderTl: '0.00',
    borcOdemeTl: '0.00',
    kalanTl: '0.00',
    kategoriler: [],
    oncekiHarcamaTl: '0.00',
    kurBayat: false,
  },
  aliskanlik: { yuzde: null, oncekiYuzde: null, enCok: [] },
  spor: { antrenman: 0, oncekiAntrenman: 0, hacimKg: 0, oncekiHacimKg: 0 },
  saglik: {
    kiloBas: null,
    kiloSon: null,
    kiloFark: null,
    ortUyku: null,
    ortAdim: null,
    ortSuMl: null,
  },
  ...o,
});

describe('aylikMetni', () => {
  it('olanları birleştirir', () => {
    const o = ozet({
      aliskanlik: { yuzde: 72, oncekiYuzde: null, enCok: [] },
      spor: { antrenman: 14, oncekiAntrenman: 0, hacimKg: 1, oncekiHacimKg: 0 },
      saglik: { ...ozet({}).saglik, kiloFark: '-1.50' },
    });
    o.para.harcamaTl = '12400.40';
    expect(aylikMetni(o)).toBe('12.400 ₺ harcama · Alışkanlık %72 · 14 antrenman · -1,5 kg');
  });
  it('⚠️ veri yoksa boş bildirim üretmez', () => {
    expect(aylikMetni(ozet({}))).toBeNull();
  });
});

describe('planla · aylık', () => {
  const temel: PlanGirdisi = {
    gun: '2026-11-01',
    saat: 10,
    tercih: { borc: false, aliskanlik: false, su: false, haftalik: false },
    borclar: [],
    kalanAliskanliklar: [],
    suMl: 4000,
    aylikGovde: '12.400 ₺ harcama',
  };
  it("ayın 1'i 10–21 arası önceki ayı gönderir", () => {
    expect(planla(temel)).toEqual([
      {
        tur: 'aylik',
        anahtar: '2026-10',
        baslik: 'Ekim 2026 raporun hazır 📅',
        govde: '12.400 ₺ harcama',
        url: '/panel/aylik?ay=2026-10',
      },
    ]);
    expect(planla({ ...temel, saat: 9 })).toEqual([]);
    expect(planla({ ...temel, saat: 21 })).toEqual([]);
  });
  it('ocakta önceki yılın aralığı', () => {
    expect(planla({ ...temel, gun: '2027-01-01' })).toEqual([
      expect.objectContaining({ anahtar: '2026-12', url: '/panel/aylik?ay=2026-12' }),
    ]);
  });
  it("1'i dışında, tercih kapalı ya da gövde yoksa gitmez", () => {
    expect(planla({ ...temel, gun: '2026-11-02' })).toEqual([]);
    expect(planla({ ...temel, tercih: { ...temel.tercih, aylik: false } })).toEqual([]);
    expect(planla({ ...temel, aylikGovde: null })).toEqual([]);
  });
});
