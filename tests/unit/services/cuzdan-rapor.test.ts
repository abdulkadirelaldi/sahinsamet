import { describe, expect, it, vi } from 'vitest';

import {
  ayOzeti,
  degisimYuzdesi,
  fetchAylikRapor,
  netVarlikKaydet,
  oncekiAy,
  type RaporAkisi,
} from '@/server/services/cuzdan-rapor';
import type { KurDurumu } from '@/server/services/kur';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

const a = (o: Partial<RaporAkisi>): RaporAkisi => ({
  id: 'k1',
  ad: 'Kalem',
  bitis: null,
  kind: 'EXPENSE',
  frequency: 'ONCE',
  unit: 'TRY',
  amount: '100.00',
  date: '2026-10-10',
  category: 'Market',
  olusturma: '2026-01-01',
  ...o,
});
const kurlar: KurDurumu['kurlar'] = { USD: { buying: '40.0000', selling: '41.0000' } };

describe('ayOzeti (2026-11-01)', () => {
  it('yalnızca o ayın tek seferlikleri; kategori yüzdeleri', () => {
    const s = ayOzeti(
      '2026-10',
      [
        a({ amount: '300.00' }),
        a({ amount: '100.00', category: 'Yemek' }),
        a({ date: '2026-09-30', amount: '999.00' }),
      ],
      [],
      {},
    );
    expect(s.harcamaTl).toBe('400.00');
    expect(s.kategoriler).toEqual([
      { kategori: 'Market', tl: '300.00', yuzde: 75 },
      { kategori: 'Yemek', tl: '100.00', yuzde: 25 },
    ]);
  });

  it('⚠️ düzenli kalem eklenmeden önceki aya yazılmaz', () => {
    const maas = a({
      kind: 'INCOME',
      frequency: 'MONTHLY',
      amount: '30000.00',
      olusturma: '2026-10-15',
    });
    expect(ayOzeti('2026-09', [maas], [], {}).gelirTl).toBe('0.00');
    expect(ayOzeti('2026-10', [maas], [], {}).gelirTl).toBe('30000.00');
  });

  it('kalan = gelir − harcama − düzenli gider − borç ödemesi', () => {
    const s = ayOzeti(
      '2026-10',
      [
        a({ kind: 'INCOME', frequency: 'MONTHLY', amount: '1000.00' }),
        a({ frequency: 'MONTHLY', amount: '300.00' }),
        a({ amount: '200.00' }),
      ],
      [
        { date: '2026-10-05', amount: '100.00', unit: 'TRY' },
        { date: '2026-09-05', amount: '999.00', unit: 'TRY' },
      ],
      {},
    );
    expect(s).toMatchObject({ duzenliGiderTl: '300.00', borcOdemeTl: '100.00', kalanTl: '400.00' });
  });

  it('dövizli gider satış, gelir alış kuruyla; kursuz kalem girmez', () => {
    const s = ayOzeti(
      '2026-10',
      [
        a({ unit: 'USD', amount: '10.00' }),
        a({ kind: 'INCOME', unit: 'USD', amount: '10.00' }),
        a({ unit: 'EUR', amount: '10.00' }),
      ],
      [],
      kurlar,
    );
    expect(s.harcamaTl).toBe('410.00');
    expect(s.gelirTl).toBe('400.00');
  });
});

describe('ayOzeti · sonlandırma ve atlama (2026-11-01)', () => {
  const abonelik = a({ frequency: 'MONTHLY', amount: '100.00', bitis: '2026-10-15' });

  it('⚠️ sonlandırılan kalem geçmiş aylarda kalır, bitiş ayından itibaren girmez', () => {
    expect(ayOzeti('2026-09', [abonelik], [], {}).duzenliGiderTl).toBe('100.00');
    expect(ayOzeti('2026-10', [abonelik], [], {}).duzenliGiderTl).toBe('0.00');
    expect(ayOzeti('2026-11', [abonelik], [], {}).duzenliGiderTl).toBe('0.00');
  });

  it('atlanan kalem yalnızca o aydan düşer', () => {
    const k = a({ id: 'x', frequency: 'MONTHLY', amount: '100.00' });
    const atlanan = new Set(['x:2026-10']);
    expect(ayOzeti('2026-10', [k], [], {}, { atlanan }).duzenliGiderTl).toBe('0.00');
    expect(ayOzeti('2026-09', [k], [], {}, { atlanan }).duzenliGiderTl).toBe('100.00');
  });

  it('kalan taksit kalandan düşer; kalemler yeniden eskiye', () => {
    const s = ayOzeti(
      '2026-10',
      [
        a({ id: 'e', kind: 'INCOME', frequency: 'MONTHLY', amount: '1000.00' }),
        a({ id: 'u1', date: '2026-10-03', amount: '10.00' }),
        a({ id: 'u2', date: '2026-10-20', amount: '20.00' }),
      ],
      [],
      {},
      { kalanTaksitTl: '300.00' },
    );
    expect(s.kalanTl).toBe('670.00');
    expect(s.kalemler.map((k) => k.id)).toEqual(['u2', 'u1']);
  });
});

describe('yardımcılar', () => {
  it('önceki ay, yıl geçişi', () => {
    expect(oncekiAy('2026-01')).toBe('2025-12');
    expect(oncekiAy('2026-11')).toBe('2026-10');
  });
  it('değişim; önceki 0 ise yok', () => {
    expect(degisimYuzdesi('150.00', '100.00')).toBe(50);
    expect(degisimYuzdesi('50.00', '100.00')).toBe(-50);
    expect(degisimYuzdesi('50.00', '0.00')).toBeNull();
  });
});

describe('netVarlikKaydet', () => {
  const istemci = () => {
    const upsert = vi.fn();
    return { upsert, client: { netVarlikKaydi: { upsert } } as never };
  };
  const cuzdan = (kursuzKalem: number, hesap = 1) =>
    vi.fn().mockResolvedValue({
      hesaplar: Array(hesap).fill({}),
      borclar: [],
      ozet: { varlikTl: '100.00', borcTl: '40.00', netTl: '60.00', kursuzKalem },
    }) as never;

  it('günün satırına yazar', async () => {
    const { upsert, client } = istemci();
    expect(await netVarlikKaydet(client, '2026-11-01', cuzdan(0))).toBe(true);
    expect(upsert.mock.calls[0]?.[0].update).toEqual({
      varlikTl: '100.00',
      borcTl: '40.00',
      netTl: '60.00',
    });
  });

  it('⚠️ kursuz kalem varken ya da cüzdan boşken YAZMAZ', async () => {
    const { upsert, client } = istemci();
    expect(await netVarlikKaydet(client, '2026-11-01', cuzdan(1))).toBe(false);
    expect(await netVarlikKaydet(client, '2026-11-01', cuzdan(0, 0))).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('fetchAylikRapor', () => {
  it('Decimal sızmaz; 6 ay eskiden yeniye', async () => {
    const client = {
      walletFlow: {
        findMany: vi.fn().mockResolvedValue([
          {
            kind: 'EXPENSE',
            frequency: 'ONCE',
            unit: 'TRY',
            amount: decimal('50.00'),
            date: new Date('2026-10-05T00:00:00Z'),
            category: null,
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]),
      },
      walletDebtPayment: {
        findMany: vi.fn().mockResolvedValue([
          {
            date: new Date('2026-10-02T00:00:00Z'),
            amount: decimal('10.00'),
            debt: { unit: 'TRY' },
          },
        ]),
      },
      walletOdeme: { findMany: vi.fn().mockResolvedValue([]) },
      walletDebt: { findMany: vi.fn().mockResolvedValue([]) },
      netVarlikKaydi: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ gun: new Date('2026-10-02T00:00:00Z'), netTl: decimal('5.00') }]),
      },
    } as never;
    const r = await fetchAylikRapor(
      '2026-10',
      client,
      { kurlar: {}, guncellendi: null, bayat: false },
      '2026-10-31',
    );
    expect(decimalKalanlar(r)).toEqual([]);
    expect(r.alti.map((x) => x.ay)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(r.ozet.kategoriler[0]).toMatchObject({ kategori: 'Diğer', yuzde: 100 });
    expect(r.netGecmis).toEqual([{ gun: '2026-10-02', netTl: '5.00' }]);
  });
});
