import { describe, expect, it, vi } from 'vitest';

import { planla } from '@/server/services/bildirim';
import {
  bekleyenleriSec,
  fetchBekleyenOdemeler,
  odemeGeriAl,
  odemeIsle,
  OdemeHatasi,
} from '@/server/services/odeme-onay';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

const CID = 'ckabcdefghijklmnopqrstuv';
const k = (gun: number, kaynakId = 'b1') => ({
  kaynakTur: 'BORC' as const,
  kaynakId,
  ad: 'Kredi',
  tutar: '1000.00',
  unit: 'TRY' as const,
  gun,
});

describe('bekleyenleriSec (2026-11-01)', () => {
  const bugun = '2026-10-30';

  it('bu ay geciken ve ay geçişi; en acil önce', () => {
    const s = bekleyenleriSec([k(25, 'gecikti'), k(29, 'dun')], new Set(), bugun);
    expect(s.map((x) => [x.kaynakId, x.donem, x.kala])).toEqual([
      ['gecikti', '2026-10', -5],
      ['dun', '2026-10', -1],
    ]);
  });

  it('⚠️ işlenmiş dönem listelenmez, gelecek ayınki ayrı', () => {
    const s = bekleyenleriSec([k(1)], new Set(['BORC:b1:2026-10']), bugun);
    expect(s).toEqual([expect.objectContaining({ donem: '2026-11', kala: 2 })]);
  });

  it("31'i kısa ayda son güne düşer", () => {
    const s = bekleyenleriSec([k(31)], new Set(), '2027-02-27').filter(
      (x) => x.donem === '2027-02',
    );
    expect(s[0]).toMatchObject({ donem: '2027-02', kala: 1 });
  });

  it('eklenmeden önceki vade gecikmiş sayılmaz', () => {
    expect(bekleyenleriSec([{ ...k(1), olusturma: '2026-10-29' }], new Set(), bugun)).toEqual([
      expect.objectContaining({ donem: '2026-11' }),
    ]);
  });

  it('⚠️ geçen aydan kalan gecikme kaybolmaz; özellikten önceki aylar sayılmaz', () => {
    const s = bekleyenleriSec([k(28)], new Set(), '2026-12-02');
    expect(s[0]).toMatchObject({ donem: '2026-11', kala: -4 });
    expect(bekleyenleriSec([k(28)], new Set(), '2026-11-02').map((x) => x.donem)).toEqual([]);
  });

  it('pencere dışı listelenmez', () => {
    expect(bekleyenleriSec([k(20)], new Set(), '2026-10-05')).toEqual([]);
  });
});

function sahte(s: { borc?: Record<string, unknown>; hesap?: unknown; cakisma?: boolean } = {}) {
  const tx = {
    walletDebt: {
      findUnique: vi.fn().mockResolvedValue({
        unit: 'TRY',
        monthlyPayment: decimal('1000.00'),
        remainingAmount: decimal('5000.00'),
        isClosed: false,
        ...s.borc,
      }),
      update: vi.fn(),
    },
    walletFlow: { findUnique: vi.fn() },
    walletDebtPayment: { create: vi.fn() },
    $queryRaw: vi.fn(),
    walletAccount: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          s.hesap ?? { unit: 'TRY', balance: decimal('3000.00'), isArchived: false },
        ),
      update: vi.fn(),
    },
    walletOdeme: {
      create: s.cakisma
        ? vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code: 'P2002' }))
        : vi.fn(),
    },
  };
  return { tx, client: { $transaction: (f: (t: typeof tx) => unknown) => f(tx) } as never };
}
const girdi = {
  kaynakTur: 'BORC' as const,
  kaynakId: CID,
  donem: '2026-10',
  durum: 'ODENDI' as const,
  hesapId: CID,
};

describe('odemeIsle', () => {
  it('ödendi: hesaptan ve borçtan KAYNAĞIN tutarı düşer', async () => {
    const { tx, client } = sahte();
    expect(await odemeIsle(girdi, client, '2026-10-30')).toEqual({ yeni: true });
    expect(tx.walletAccount.update.mock.calls[0]?.[0].data).toEqual({ balance: '2000.00' });
    expect(tx.walletDebt.update.mock.calls[0]?.[0].data).toEqual({
      remainingAmount: '4000.00',
      isClosed: false,
    });
  });

  it('⚠️ ikinci dokunuş (P2002) hiçbir şeyi düşmez', async () => {
    const { tx, client } = sahte({ cakisma: true });
    expect(await odemeIsle(girdi, client, '2026-10-30')).toEqual({ yeni: false });
    expect(tx.walletAccount.update).not.toHaveBeenCalled();
    expect(tx.walletDebt.update).not.toHaveBeenCalled();
  });

  it('⚠️ yetersiz bakiye ve farklı birim reddedilir', async () => {
    const az = sahte({ hesap: { unit: 'TRY', balance: decimal('500.00'), isArchived: false } });
    await expect(odemeIsle(girdi, az.client, '2026-10-30')).rejects.toBeInstanceOf(OdemeHatasi);
    expect(az.tx.walletDebt.update).not.toHaveBeenCalled();
    const birim = sahte({ hesap: { unit: 'USD', balance: decimal('9000.00'), isArchived: false } });
    await expect(odemeIsle(girdi, birim.client, '2026-10-30')).rejects.toBeInstanceOf(OdemeHatasi);
  });

  it('atla: yalnızca kayıt, para hareketi yok', async () => {
    const { tx, client } = sahte();
    await odemeIsle({ ...girdi, durum: 'ATLANDI' }, client, '2026-10-30');
    expect(tx.walletOdeme.create).toHaveBeenCalled();
    expect(tx.walletAccount.update).not.toHaveBeenCalled();
    expect(tx.walletDebt.update).not.toHaveBeenCalled();
  });

  it('hesapsız ödendi: borç düşer, hesap dokunulmaz', async () => {
    const { tx, client } = sahte();
    await odemeIsle({ ...girdi, hesapId: undefined }, client, '2026-10-30');
    expect(tx.walletAccount.update).not.toHaveBeenCalled();
    expect(tx.walletDebt.update).toHaveBeenCalled();
  });
});

describe('odemeIsle · son taksit (2026-11-01)', () => {
  it('⚠️ kalan borçtan fazlası düşülmez, borç kapanır', async () => {
    const { tx, client } = sahte({
      borc: { remainingAmount: decimal('300.00') },
    });
    await odemeIsle(girdi, client, '2026-10-30');
    expect(tx.walletAccount.update.mock.calls[0]?.[0].data).toEqual({ balance: '2700.00' });
    expect(tx.walletDebtPayment.create.mock.calls[0]?.[0].data.amount).toBe('300.00');
    expect(tx.walletDebt.update.mock.calls[0]?.[0].data).toEqual({
      remainingAmount: '0.00',
      isClosed: true,
    });
  });

  it('kapanmış borç işlenmez', async () => {
    const { client } = sahte({ borc: { isClosed: true } });
    await expect(odemeIsle(girdi, client, '2026-10-30')).rejects.toThrow('kapanmış');
  });
});

describe('odemeGeriAl', () => {
  const kurulum = (kayit: Record<string, unknown> | null, kalan = '4000.00') => {
    const tx = {
      walletOdeme: { findUnique: vi.fn().mockResolvedValue(kayit), delete: vi.fn() },
      $queryRaw: vi.fn(),
      walletAccount: {
        findUnique: vi.fn().mockResolvedValue({ balance: decimal('2000.00') }),
        update: vi.fn(),
      },
      walletDebtPayment: {
        findFirst: vi.fn().mockResolvedValue({ id: 'o1' }),
        delete: vi.fn(),
      },
      walletDebt: {
        findUnique: vi.fn().mockResolvedValue({
          remainingAmount: decimal(kalan),
          totalAmount: decimal('5000.00'),
        }),
        update: vi.fn(),
      },
    };
    return { tx, client: { $transaction: (f: (t: typeof tx) => unknown) => f(tx) } as never };
  };
  const anahtar = { kaynakTur: 'BORC' as const, kaynakId: CID, donem: '2026-10' };
  const odendi = {
    durum: 'ODENDI',
    kaynakTur: 'BORC',
    kaynakId: CID,
    hesapId: CID,
    tutar: decimal('1000.00'),
    gun: new Date('2026-10-30T00:00:00Z'),
  };

  it('hesap, borç ve ödeme eski hâline döner; kapanan borç açılır', async () => {
    const { tx, client } = kurulum(odendi);
    expect(await odemeGeriAl(anahtar, client)).toEqual({ geriAlindi: true });
    expect(tx.walletAccount.update.mock.calls[0]?.[0].data).toEqual({ balance: '3000.00' });
    expect(tx.walletDebtPayment.delete).toHaveBeenCalledWith({ where: { id: 'o1' } });
    expect(tx.walletDebt.update.mock.calls[0]?.[0].data).toEqual({
      remainingAmount: '5000.00',
      isClosed: false,
    });
    expect(tx.walletOdeme.delete).toHaveBeenCalled();
  });

  it('⚠️ kalan borç toplamı geçmez', async () => {
    const { tx, client } = kurulum(odendi, '4500.00');
    await odemeGeriAl(anahtar, client);
    expect(tx.walletDebt.update.mock.calls[0]?.[0].data.remainingAmount).toBe('5000.00');
  });

  it('atlanan ayda para hareketi yok, yalnızca kayıt silinir', async () => {
    const { tx, client } = kurulum({ ...odendi, durum: 'ATLANDI', tutar: null, hesapId: null });
    await odemeGeriAl(anahtar, client);
    expect(tx.walletAccount.update).not.toHaveBeenCalled();
    expect(tx.walletDebt.update).not.toHaveBeenCalled();
    expect(tx.walletOdeme.delete).toHaveBeenCalled();
  });

  it('kayıt yoksa etkisiz', async () => {
    const { tx, client } = kurulum(null);
    expect(await odemeGeriAl(anahtar, client)).toEqual({ geriAlindi: false });
    expect(tx.walletOdeme.delete).not.toHaveBeenCalled();
  });
});

describe('fetchBekleyenOdemeler', () => {
  it('Decimal sızmaz; elle girilen ödeme de o ayı kapatır', async () => {
    const client = {
      walletDebt: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'a',
            name: 'A',
            unit: 'TRY',
            monthlyPayment: decimal('10.00'),
            remainingAmount: decimal('500.00'),
            paymentDay: 30,
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
          {
            id: 'b',
            name: 'B',
            unit: 'TRY',
            monthlyPayment: decimal('20.00'),
            remainingAmount: decimal('15.00'),
            paymentDay: 30,
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]),
      },
      walletFlow: { findMany: vi.fn().mockResolvedValue([]) },
      walletOdeme: { findMany: vi.fn().mockResolvedValue([]) },
      walletDebtPayment: {
        findMany: vi.fn().mockResolvedValue([
          {
            debtId: 'a',
            date: new Date('2026-10-12T00:00:00Z'),
            amount: decimal('10.00'),
            debt: { monthlyPayment: decimal('10.00') },
          },
          {
            debtId: 'b',
            date: new Date('2026-10-12T00:00:00Z'),
            amount: decimal('5.00'),
            debt: { monthlyPayment: decimal('20.00') },
          },
        ]),
      },
    } as never;
    const s = await fetchBekleyenOdemeler(client, '2026-10-30');
    expect(decimalKalanlar(s)).toEqual([]);
    const buAy = s.filter((x) => x.donem === '2026-10');
    expect(buAy.map((x) => x.kaynakId)).toEqual(['b']);
    expect(buAy[0]?.tutar).toBe('15.00');
  });
});

describe('elle ödeme dönemi (2026-11-01)', () => {
  const istemci = (gun: string, tutar: string, odemeGunu: number) =>
    ({
      walletDebt: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'a',
            name: 'A',
            unit: 'TRY',
            monthlyPayment: decimal('100.00'),
            remainingAmount: decimal('900.00'),
            paymentDay: odemeGunu,
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]),
      },
      walletFlow: { findMany: vi.fn().mockResolvedValue([]) },
      walletOdeme: { findMany: vi.fn().mockResolvedValue([]) },
      walletDebtPayment: {
        findMany: vi.fn().mockResolvedValue([
          {
            debtId: 'a',
            date: new Date(`${gun}T00:00:00Z`),
            amount: decimal(tutar),
            debt: { monthlyPayment: decimal('100.00'), paymentDay: odemeGunu },
          },
        ]),
      },
    }) as never;

  it('⚠️ 1 Aralık taksiti 29 Kasımda ödenince Aralık sorulmaz', async () => {
    const s = await fetchBekleyenOdemeler(istemci('2026-11-29', '100.00', 1), '2026-11-29');
    expect(s.filter((x) => x.donem === '2026-12')).toEqual([]);
  });

  it('ay ortasındaki geç ödeme kendi ayını kapatır', async () => {
    const s = await fetchBekleyenOdemeler(istemci('2026-11-20', '100.00', 15), '2026-11-20');
    expect(s.filter((x) => x.donem === '2026-11')).toEqual([]);
  });

  it('küçük ara ödeme yine kapatmaz', async () => {
    const s = await fetchBekleyenOdemeler(istemci('2026-11-29', '10.00', 1), '2026-11-29');
    expect(s.map((x) => x.donem)).toContain('2026-12');
  });
});

describe('bildirim: ödenmiş taksit hatırlatılmaz', () => {
  it('odenen kümesi', () => {
    const temel = {
      gun: '2026-10-30',
      saat: 10,
      tercih: { borc: true, aliskanlik: false, su: false },
      borclar: [{ id: 'b', ad: 'K', odemeGunu: 30, tutar: null }],
      kalanAliskanliklar: [],
      suMl: null,
    };
    expect(planla(temel)).toHaveLength(1);
    expect(planla({ ...temel, odenen: new Set(['b:2026-10']) })).toEqual([]);
  });
});

describe('⚠️ onay ödemesi sonraki taksiti gizlemez', () => {
  it("25 Kasım'da onaylanan 1 Kasım taksiti Aralık'ı kapatmaz", async () => {
    const client = {
      walletDebt: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'b',
            name: 'Kredi',
            monthlyPayment: decimal('1000.00'),
            paymentDay: 1,
            remainingAmount: decimal('9000.00'),
            unit: 'TRY',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]),
      },
      walletFlow: { findMany: vi.fn().mockResolvedValue([]) },
      walletOdeme: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ kaynakTur: 'BORC', kaynakId: 'b', donem: '2026-11' }]),
      },
      walletDebtPayment: {
        findMany: vi.fn().mockResolvedValue([
          {
            debtId: 'b',
            date: new Date('2026-11-25T00:00:00Z'),
            amount: decimal('1000.00'),
            note: 'Aylık ödeme',
            debt: { monthlyPayment: decimal('1000.00'), paymentDay: 1 },
          },
        ]),
      },
    } as never;
    const liste = await fetchBekleyenOdemeler(client, '2026-11-28');
    expect(liste.map((o) => o.donem)).toEqual(['2026-12']);
  });
});
