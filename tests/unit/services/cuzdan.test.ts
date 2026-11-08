import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tutarOku } from '@/components/panel/cuzdan-bicim';
import { fetchAylikRapor } from '@/server/services/cuzdan-rapor';

import {
  addDebtPayment,
  araCuzdan,
  aylikTutar,
  deleteDebtPayment,
  donemOdenen,
  odemeDonemi,
  kalanTaksit,
  butceOzeti,
  fetchButceLimitleri,
  fetchCuzdan,
  kalanAy,
  fetchWalletAccountById,
  fetchWalletDebtById,
  fetchWalletFlowById,
  odenenYuzde,
} from '@/server/services/cuzdan';
import { kaynagiCozumle, tlKarsiligi, type KurDurumu } from '@/server/services/kur';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

const KAYNAK = {
  Update_Date: '2026-10-30 10:00:00',
  USD: { Buying: 49.83, Selling: 49.84, Type: 'Currency' },
  GRA: { Buying: 6452.33, Selling: 6453.15, Type: 'Gold' },
  CEYREKALTIN: { Buying: 10392.68, Selling: 10632.48, Type: 'Gold' },
  EUR: { Buying: 'bozuk', Selling: 55.6 },
};

describe('kaynagiCozumle', () => {
  it('birimleri eşler, bozuk satırı ATLAR (sıfır kur üretmez)', () => {
    const k = kaynagiCozumle(KAYNAK);
    expect(k.USD).toEqual({ buying: '49.8300', selling: '49.8400' });
    expect(k.GOLD_QUARTER).toEqual({ buying: '10392.6800', selling: '10632.4800' });
    expect(k.EUR).toBeUndefined();
    expect(kaynagiCozumle(null)).toEqual({});
  });
});

describe('tlKarsiligi — kayıpsız, varlık alış / borç satış', () => {
  const kurlar = kaynagiCozumle(KAYNAK);
  it('3 çeyrek: alış ve satış ayrı', () => {
    expect(tlKarsiligi('3.00', 'GOLD_QUARTER', kurlar, 'alis')).toBe('31178.04');
    expect(tlKarsiligi('3.00', 'GOLD_QUARTER', kurlar, 'satis')).toBe('31897.44');
  });
  it('TRY kendisi; kuru olmayan birim null (0 DEĞİL)', () => {
    expect(tlKarsiligi('1250.50', 'TRY', kurlar, 'alis')).toBe('1250.50');
    expect(tlKarsiligi('10.00', 'EUR', kurlar, 'alis')).toBeNull();
  });
});

describe('fetchKurlar — sayfayı bekletmez (2026-10-30)', () => {
  /** Modül durumu (bellek, son hata) her testte sıfır: taze yükleme. */
  let fetchKurlar: typeof import('@/server/services/kur').fetchKurlar;
  beforeEach(async () => {
    vi.resetModules();
    ({ fetchKurlar } = await import('@/server/services/kur'));
  });

  const SIMDI = new Date('2026-10-30T07:00:00Z');
  const satir = (fetchedAt: string) => ({
    unit: 'USD',
    buying: decimal('49.0000'),
    selling: decimal('49.1000'),
    fetchedAt: new Date(fetchedAt),
  });
  const istemci = (satirlar: unknown[]) => {
    const upsert = vi.fn().mockReturnValue('islem');
    return {
      upsert,
      client: {
        priceQuote: { upsert, findMany: vi.fn().mockResolvedValue(satirlar) },
        $transaction: vi.fn().mockResolvedValue([]),
      } as never,
    };
  };
  const basarili = () => vi.fn().mockResolvedValue({ ok: true, json: async () => KAYNAK });

  it('⚠️ kaynak ASILI kalsa da kayıtlı kur HEMEN döner', async () => {
    const { client } = istemci([satir('2026-10-30T06:30:00Z')]);
    const asili = vi.fn(() => new Promise<never>(() => undefined));
    const d = await fetchKurlar(client, asili as never, SIMDI);
    expect(d).toMatchObject({ bayat: false, guncellendi: '2026-10-30T06:30:00.000Z' });
    expect(d.kurlar.USD).toEqual({ buying: '49.0000', selling: '49.1000' });
    expect(asili).toHaveBeenCalledTimes(1); // yenileme arka planda başladı
  });

  it('1 saatten eski kur "bayat" olarak gösterilir', async () => {
    const { client } = istemci([satir('2026-10-29T08:00:00Z')]);
    const d = await fetchKurlar(
      client,
      vi.fn().mockRejectedValue(new Error('ağ yok')) as never,
      SIMDI,
    );
    expect(d.bayat).toBe(true);
  });

  it('arka plan yenilemesi belleği doldurur, sonraki istek veritabanına gitmez', async () => {
    const { client, upsert } = istemci([satir('2026-10-30T06:30:00Z')]);
    await fetchKurlar(client, basarili() as never, SIMDI);
    await vi.waitFor(() => expect(upsert).toHaveBeenCalledTimes(3));
    const sonraki = await fetchKurlar(
      client,
      basarili() as never,
      new Date('2026-10-30T07:01:00Z'),
    );
    expect(sonraki).toMatchObject({ bayat: false, guncellendi: SIMDI.toISOString() });
    expect(Object.keys(sonraki.kurlar)).toContain('GOLD_GRAM');
  });

  it('kaynak düşükken 1 dakika yeniden denenmez', async () => {
    const { client } = istemci([satir('2026-10-30T06:30:00Z')]);
    const hatali = vi.fn().mockRejectedValue(new Error('ağ yok'));
    await fetchKurlar(client, hatali as never, SIMDI);
    await vi.waitFor(() => expect(hatali).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    await fetchKurlar(client, hatali as never, new Date('2026-10-30T07:00:30Z'));
    expect(hatali).toHaveBeenCalledTimes(1);
    await fetchKurlar(client, hatali as never, new Date('2026-10-30T07:01:01Z'));
    expect(hatali).toHaveBeenCalledTimes(2);
  });

  it('hiç kur yoksa kaynak BEKLENİR; o da düşükse boş ve bayat (uydurma yok)', async () => {
    const a = istemci([]);
    const d = await fetchKurlar(a.client, basarili() as never, SIMDI);
    expect(d.bayat).toBe(false);
    expect(a.upsert).toHaveBeenCalledTimes(3);

    vi.resetModules();
    ({ fetchKurlar } = await import('@/server/services/kur'));
    const b = istemci([]);
    const bos = await fetchKurlar(
      b.client,
      vi.fn().mockRejectedValue(new Error('x')) as never,
      SIMDI,
    );
    expect(bos).toEqual({ kurlar: {}, guncellendi: null, bayat: true });
  });
});

describe('saf hesaplar', () => {
  it('aylığa çevirme: haftalık ×52/12, yıllık ÷12, tek sefer aylığa girmez', () => {
    expect(aylikTutar('1000.00', 'MONTHLY')).toBe('1000.00');
    expect(aylikTutar('1000.00', 'WEEKLY')).toBe('4333.33');
    expect(aylikTutar('12000.00', 'YEARLY')).toBe('1000.00');
    expect(aylikTutar('500.00', 'ONCE')).toBeNull();
  });

  it('kalan ay: bitiş tarihi varsa ondan, yoksa kalan/taksit', () => {
    expect(kalanAy('12000.00', '1000.00', null, '2026-10-30')).toBe(12);
    expect(kalanAy('12000.00', null, '2027-10-30', '2026-10-30')).toBe(12);
    expect(kalanAy('12000.00', null, null, '2026-10-30')).toBeNull();
  });

  it('ödenen yüzde 0–100', () => {
    expect(odenenYuzde('10000.00', '2500.00')).toBe(75);
    expect(odenenYuzde('0.00', '0.00')).toBe(0);
  });
});

describe('fetchCuzdan', () => {
  const kur: KurDurumu = { kurlar: kaynagiCozumle(KAYNAK), guncellendi: null, bayat: false };
  const istemci = () =>
    ({
      $queryRaw: vi.fn(),
      walletAccount: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'a', name: 'Ziraat', kind: 'BANK', unit: 'TRY', balance: decimal('10000.00') },
          {
            id: 'b',
            name: 'Altın',
            kind: 'INVESTMENT',
            unit: 'GOLD_QUARTER',
            balance: decimal('2.00'),
          },
          { id: 'c', name: 'Euro', kind: 'CASH', unit: 'EUR', balance: decimal('100.00') },
        ]),
      },
      walletDebt: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'd',
            name: 'Altın borcu',
            lender: 'Ahmet',
            unit: 'GOLD_GRAM',
            totalAmount: decimal('10.00'),
            remainingAmount: decimal('5.00'),
            monthlyPayment: decimal('1.00'),
            paymentDay: 15,
            endDate: null,
            note: null,
            isClosed: false,
          },
        ]),
      },
      walletFlow: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'f1',
            kind: 'INCOME',
            name: 'Maaş',
            counterparty: 'Adapha',
            unit: 'TRY',
            amount: decimal('30000.00'),
            frequency: 'MONTHLY',
            day: 1,
            date: null,
            category: null,
            note: null,
            isActive: true,
          },
          {
            id: 'f2',
            kind: 'EXPENSE',
            name: 'Kira',
            counterparty: null,
            unit: 'TRY',
            amount: decimal('8000.00'),
            frequency: 'MONTHLY',
            day: 5,
            date: null,
            category: null,
            note: null,
            isActive: true,
          },
        ]),
      },
      walletDebtPayment: { findMany: vi.fn().mockResolvedValue([]) },
      walletOdeme: { findMany: vi.fn().mockResolvedValue([]) },
    }) as never;

  it('⚠️ kuru olmayan kalem toplama GİRMEZ ve sayılır; Decimal sızmaz', async () => {
    const c = await fetchCuzdan(istemci(), '2026-10-30', kur);
    expect(decimalKalanlar(c)).toEqual([]);
    // 10000 + 2 × 10392.68 = 30785.36 (EUR kuru yok → dışarıda)
    expect(c.ozet.varlikTl).toBe('30785.36');
    expect(c.ozet.kursuzKalem).toBe(1);
    // Altın borcu SATIŞ kuruyla: 5 × 6453.15
    expect(c.ozet.borcTl).toBe('32265.75');
    expect(c.ozet.netTl).toBe('-1480.39');
    // 30000 − 8000 − 6453.15
    expect(c.ozet.aylikKalanTl).toBe('15546.85');
    expect(c.borclar[0]).toMatchObject({ odenenYuzde: 50, kalanAy: 5 });
  });
});

describe('addDebtPayment', () => {
  const istemci = (kalan: string) => {
    const update = vi.fn();
    const tx = {
      walletDebt: {
        findUnique: vi.fn().mockResolvedValue({ remainingAmount: decimal(kalan), unit: 'TRY' }),
        update,
      },
      walletDebtPayment: { create: vi.fn() },
      $queryRaw: vi.fn(),
      walletAccount: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ unit: 'TRY', balance: decimal('500.00'), isArchived: false }),
        update: vi.fn(),
      },
    };
    return {
      client: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } as never,
      update,
      tx,
    };
  };

  it('ödeme kalanı düşürür', async () => {
    const { client, update } = istemci('1000.00');
    expect(
      await addDebtPayment(
        { debtId: 'ckabcdefghijklmnopqrstuv', date: '2026-10-30', amount: '250.00' },
        client,
      ),
    ).toEqual({ remainingAmount: '750.00', isClosed: false });
    expect(update.mock.calls[0]?.[0].data).toEqual({ remainingAmount: '750.00', isClosed: false });
  });

  it('⚠️ kalan borçtan fazlası reddedilir: yanlış rakam borcu kapatmaz', async () => {
    const { client, update } = istemci('100.00');
    await expect(
      addDebtPayment(
        { debtId: 'ckabcdefghijklmnopqrstuv', date: '2026-10-30', amount: '150.00' },
        client,
      ),
    ).rejects.toThrow('kalan borçtan fazla');
    expect(update).not.toHaveBeenCalled();
  });

  it('tam kalan ödenince borç kapanır', async () => {
    const { client } = istemci('100.00');
    expect(
      await addDebtPayment(
        { debtId: 'ckabcdefghijklmnopqrstuv', date: '2026-10-30', amount: '100.00' },
        client,
      ),
    ).toEqual({ remainingAmount: '0.00', isClosed: true });
  });

  it('hesap seçilirse hesaptan düşer ve ödemeye yazılır; yetmezse hiçbir şey olmaz', async () => {
    const CID = 'ckabcdefghijklmnopqrstuv';
    const { client, tx } = istemci('1000.00');
    await addDebtPayment(
      { debtId: CID, date: '2026-10-30', amount: '200.00', hesapId: CID },
      client,
    );
    expect(tx.walletAccount.update.mock.calls[0]?.[0].data).toEqual({ balance: '300.00' });
    expect(tx.walletDebtPayment.create.mock.calls[0]?.[0].data.hesapId).toBe(CID);

    const ikinci = istemci('1000.00');
    await expect(
      addDebtPayment(
        { debtId: CID, date: '2026-10-30', amount: '600.00', hesapId: CID },
        ikinci.client,
      ),
    ).rejects.toThrow('yeterli bakiye');
    expect(ikinci.tx.walletDebtPayment.create).not.toHaveBeenCalled();
  });
});

describe('deleteDebtPayment (2026-11-01)', () => {
  const kurulum = (
    odeme: Record<string, unknown>,
    onay: Record<string, unknown> | null = null,
    kalan = '0.00',
  ) => {
    const tx = {
      walletDebtPayment: { findUnique: vi.fn().mockResolvedValue(odeme), delete: vi.fn() },
      walletOdeme: { findFirst: vi.fn().mockResolvedValue(onay), delete: vi.fn() },
      $queryRaw: vi.fn(),
      walletAccount: {
        findUnique: vi.fn().mockResolvedValue({ balance: decimal('100.00') }),
        update: vi.fn(),
      },
      walletDebt: {
        findUnique: vi.fn().mockResolvedValue({
          remainingAmount: decimal(kalan),
          totalAmount: decimal('1000.00'),
        }),
        update: vi.fn(),
      },
    };
    return { tx, client: { $transaction: (f: (t: typeof tx) => unknown) => f(tx) } as never };
  };
  const odeme = {
    id: 'o1',
    debtId: 'd1',
    amount: decimal('250.00'),
    date: new Date('2026-10-30T00:00:00Z'),
    hesapId: 'h1',
  };

  it('hesaba iade eder, kalanı geri ekler, kapanan borcu açar', async () => {
    const { tx, client } = kurulum(odeme);
    await deleteDebtPayment('o1', client);
    expect(tx.walletAccount.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'h1' },
      data: { balance: '350.00' },
    });
    expect(tx.walletDebt.update.mock.calls[0]?.[0].data).toEqual({
      remainingAmount: '250.00',
      isClosed: false,
    });
    expect(tx.walletDebtPayment.delete).toHaveBeenCalledWith({ where: { id: 'o1' } });
  });

  it('⚠️ aylık onay da silinir: o ay yeniden sorulur; eski kayıtta hesap onaydan okunur', async () => {
    const { tx, client } = kurulum(
      { ...odeme, hesapId: null, note: 'Aylık ödeme' },
      { id: 'y1', hesapId: 'h2' },
    );
    await deleteDebtPayment('o1', client);
    expect(tx.walletAccount.update.mock.calls[0]?.[0].where).toEqual({ id: 'h2' });
    expect(tx.walletOdeme.delete).toHaveBeenCalledWith({ where: { id: 'y1' } });
  });

  it('⚠️ elle ödeme onaya bağlanmaz: onayın hesabına iade edilmez', async () => {
    const { tx, client } = kurulum(
      { ...odeme, hesapId: null, note: null },
      { id: 'y1', hesapId: 'h2' },
    );
    await deleteDebtPayment('o1', client);
    expect(tx.walletAccount.update).not.toHaveBeenCalled();
    expect(tx.walletOdeme.delete).not.toHaveBeenCalled();
  });

  it('hesapsız ödemede hesaba dokunulmaz; kalan toplamı geçmez', async () => {
    const { tx, client } = kurulum({ ...odeme, hesapId: null }, null, '900.00');
    await deleteDebtPayment('o1', client);
    expect(tx.walletAccount.update).not.toHaveBeenCalled();
    expect(tx.walletDebt.update.mock.calls[0]?.[0].data.remainingAmount).toBe('1000.00');
  });

  it('ödeme yoksa anlaşılır hata', async () => {
    const { client } = kurulum(null as never);
    await expect(deleteDebtPayment('o1', client)).rejects.toThrow('bulunamadı');
  });
});

describe('odemeDonemi', () => {
  it.each([
    ['2026-10-30', 1, '2026-11'], // 2 gün önceden: sıradaki taksit
    ['2026-10-25', 1, '2026-11'], // 7 gün önceden: sınır
    ['2026-10-24', 1, '2026-10'], // 8 gün önceden: kendi ayı
    ['2026-11-17', 1, '2026-11'], // ⚠️ geç ödeme kasımda kalır, aralığa kaymaz
    ['2026-11-10', 20, '2026-11'], // vadeden 10 gün önce: kendi ayı
    ['2026-11-02', 28, '2026-10'], // gecikmiş ekim taksiti
    ['2026-11-01', 1, '2026-11'], // tam vadesinde
    ['2026-02-28', 31, '2026-02'], // kısa ayda son gün
    ['2026-11-20', null, '2026-11'], // ödeme günü yok: takvim ayı
  ])('%s, ödeme günü %s → %s', (gun, odemeGunu, beklenen) => {
    expect(odemeDonemi(gun as never, odemeGunu)).toBe(beklenen);
  });
});

describe('donemOdenen', () => {
  const borc = { id: 'b', paymentDay: 1 };
  const elle = (date: string, amount = '1000.00', note: string | null = null) => ({
    debtId: 'b',
    date: date as never,
    amount,
    note,
  });

  it('ay sonunda erken ödenen taksit sonraki dönemi kapatır, bu dönemi değil', () => {
    expect(donemOdenen(borc, [elle('2026-10-30')], [], '2026-11')).toBe('1000.00');
    expect(donemOdenen(borc, [elle('2026-10-30')], [], '2026-10')).toBe('0.00');
  });

  it('kasımda ödenen gecikmiş ekim taksiti kasıma sayılmaz', () => {
    expect(donemOdenen({ id: 'b', paymentDay: 28 }, [elle('2026-11-02')], [], '2026-11')).toBe(
      '0.00',
    );
  });

  it('onay ödemesi tarihten değil kendi döneminden sayılır', () => {
    const onay = { kaynakTur: 'BORC', kaynakId: 'b', durum: 'ODENDI', tutar: '1000.00' };
    const satir = elle('2026-11-25', '1000.00', 'Aylık ödeme');
    expect(donemOdenen(borc, [satir], [onay], '2026-11')).toBe('1000.00');
    expect(donemOdenen(borc, [satir], [], '2026-12')).toBe('0.00');
  });
});

describe('kalanTaksit (2026-11-01)', () => {
  it.each([
    ['1000.00', '5000.00', '0.00', false, '1000.00'],
    ['1000.00', '5000.00', '400.00', false, '600.00'],
    ['1000.00', '5000.00', '1000.00', false, '0.00'],
    ['1000.00', '5000.00', '1500.00', false, '0.00'],
    ['1000.00', '300.00', '0.00', false, '300.00'],
    ['1000.00', '5000.00', '0.00', true, '0.00'],
    [null, '5000.00', '0.00', false, '0.00'],
  ] as const)('%s / kalan %s / ödenen %s / atlandı %s → %s', (a, k, o, at, sonuc) => {
    expect(kalanTaksit(a, k, o, at)).toBe(sonuc);
  });
});

describe('tutarOku · altın (2026-11-01)', () => {
  it('⚠️ altında nokta ondalıktır, binlik değil; üç ondalık sessizce büyümez', () => {
    expect(tutarOku('2.125', 'GOLD_GRAM')).toBeNull();
    expect(tutarOku('2,125', 'GOLD_GRAM')).toBeNull();
    expect(tutarOku('2.13', 'GOLD_GRAM')).toBe('2.13');
    expect(tutarOku('2,5', 'GOLD_GRAM')).toBe('2.5');
  });
  it('parada binlik davranışı aynı', () => {
    expect(tutarOku('2.125', 'TRY')).toBe('2125');
    expect(tutarOku('2.125')).toBe('2125');
  });
});

describe('tekil okumalar — Decimal sızmaz', () => {
  const hesap = {
    id: 'a',
    name: 'Ziraat',
    kind: 'BANK',
    unit: 'TRY',
    balance: decimal('10.00'),
    note: null,
    isArchived: false,
  };
  const borc = {
    id: 'd',
    name: 'Kredi',
    lender: null,
    unit: 'TRY',
    totalAmount: decimal('100.00'),
    remainingAmount: decimal('40.00'),
    monthlyPayment: decimal('10.00'),
    paymentDay: 1,
    endDate: null,
    note: null,
    isClosed: false,
  };
  const akis = {
    id: 'f',
    kind: 'INCOME',
    name: 'Maaş',
    counterparty: null,
    unit: 'TRY',
    amount: decimal('5.00'),
    frequency: 'MONTHLY',
    day: 1,
    date: null,
    category: null,
    note: null,
    isActive: true,
  };
  const client = {
    $queryRaw: vi.fn(),
    walletAccount: { findUnique: vi.fn().mockResolvedValue(hesap) },
    walletDebt: { findUnique: vi.fn().mockResolvedValue(borc) },
    walletFlow: { findUnique: vi.fn().mockResolvedValue(akis) },
  } as never;

  it('hesap, borç, akış', async () => {
    expect(decimalKalanlar(await fetchWalletAccountById('a', client))).toEqual([]);
    expect(decimalKalanlar(await fetchWalletDebtById('d', client))).toEqual([]);
    expect(decimalKalanlar(await fetchWalletFlowById('f', client))).toEqual([]);
  });
});

describe('tek seferlik kalemler — yalnızca KENDİ aylarında (2026-10-30)', () => {
  const kur: KurDurumu = { kurlar: {}, guncellendi: null, bayat: false };
  const akis = (
    id: string,
    kind: string,
    frequency: string,
    amount: string,
    date: Date | null,
  ) => ({
    id,
    kind,
    name: id,
    counterparty: null,
    unit: 'TRY',
    amount: decimal(amount),
    frequency,
    day: null,
    date,
    category: 'Market',
    note: null,
    isActive: true,
  });
  const istemci = () =>
    ({
      $queryRaw: vi.fn(),
      walletAccount: { findMany: vi.fn().mockResolvedValue([]) },
      walletDebt: { findMany: vi.fn().mockResolvedValue([]) },
      walletFlow: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            akis('maas', 'INCOME', 'MONTHLY', '30000.00', null),
            akis('kira', 'EXPENSE', 'MONTHLY', '8000.00', null),
            akis('market', 'EXPENSE', 'ONCE', '450.50', new Date('2026-10-12T00:00:00Z')),
            akis('kahve', 'EXPENSE', 'ONCE', '90.00', new Date('2026-10-28T00:00:00Z')),
            akis('eski', 'EXPENSE', 'ONCE', '999.00', new Date('2026-09-30T00:00:00Z')),
            akis('ikramiye', 'INCOME', 'ONCE', '5000.00', new Date('2026-10-01T00:00:00Z')),
          ]),
      },
      walletDebtPayment: { findMany: vi.fn().mockResolvedValue([]) },
      walletOdeme: { findMany: vi.fn().mockResolvedValue([]) },
    }) as never;

  it('bu ayın tek seferlikleri hesaba girer, geçen ayınki girmez', async () => {
    const c = await fetchCuzdan(istemci(), '2026-10-30', kur);
    expect(c.ozet.aylikGelirTl).toBe('35000.00');
    // 8000 + 450.50 + 90 — eylül harcaması (999) yok
    expect(c.ozet.aylikGiderTl).toBe('8540.50');
    expect(c.giderler.map((g) => g.id)).toEqual(['kira']);
    // yeniden eskiye
    expect(c.harcamalar.map((h) => h.id)).toEqual(['kahve', 'market']);
    expect(c.gelirler.map((g) => g.id)).toEqual(['maas', 'ikramiye']);
  });
});

describe('ay sonunda kalan: Cüzdan ve rapor AYNI sayı (2026-11-01)', () => {
  const tarih = (g: string) => new Date(`${g}T00:00:00Z`);
  const akis = (
    id: string,
    kind: string,
    frequency: string,
    amount: string,
    date: Date | null,
  ) => ({
    id,
    kind,
    name: id,
    counterparty: null,
    unit: 'TRY',
    amount: decimal(amount),
    frequency,
    day: 5,
    date,
    category: null,
    note: null,
    isActive: true,
    bitisGunu: null,
    createdAt: tarih('2026-01-01'),
  });
  const borclar = [
    {
      id: 'b1',
      name: 'Kredi',
      lender: null,
      unit: 'TRY',
      totalAmount: decimal('9000.00'),
      remainingAmount: decimal('4000.00'),
      monthlyPayment: decimal('1000.00'),
      paymentDay: 15,
      endDate: null,
      note: null,
      isClosed: false,
    },
    {
      id: 'b2',
      name: 'Atlanan',
      lender: null,
      unit: 'TRY',
      totalAmount: decimal('9000.00'),
      remainingAmount: decimal('4000.00'),
      monthlyPayment: decimal('700.00'),
      paymentDay: 15,
      endDate: null,
      note: null,
      isClosed: false,
    },
  ];
  const client = {
    $queryRaw: vi.fn(),
    walletAccount: { findMany: vi.fn().mockResolvedValue([]) },
    walletDebt: { findMany: vi.fn().mockResolvedValue(borclar) },
    walletFlow: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          akis('maas', 'INCOME', 'MONTHLY', '30000.00', null),
          akis('kira', 'EXPENSE', 'MONTHLY', '8000.00', null),
          akis('dergi', 'EXPENSE', 'MONTHLY', '100.00', null),
          akis('market', 'EXPENSE', 'ONCE', '500.00', tarih('2026-10-12')),
        ]),
    },
    walletDebtPayment: {
      findMany: vi.fn().mockResolvedValue([
        {
          debtId: 'b1',
          date: tarih('2026-10-02'),
          amount: decimal('400.00'),
          debt: { unit: 'TRY' },
        },
      ]),
    },
    walletOdeme: {
      findMany: vi.fn().mockResolvedValue([
        { kaynakTur: 'AKIS', kaynakId: 'dergi', donem: '2026-10', durum: 'ATLANDI' },
        { kaynakTur: 'BORC', kaynakId: 'b2', donem: '2026-10', durum: 'ATLANDI' },
      ]),
    },
    netVarlikKaydi: { findMany: vi.fn().mockResolvedValue([]) },
  } as never;
  const kur: KurDurumu = { kurlar: {}, guncellendi: null, bayat: false };

  it('atlanan girmez, kısmi ödeme ikiye sayılmaz, sonuç eşit', async () => {
    const c = await fetchCuzdan(client, '2026-10-30', kur);
    const r = await fetchAylikRapor('2026-10', client, kur, '2026-10-30');
    // 30000 − 8000 − 500 − (400 ödenen + 600 kalan taksit)
    expect(c.ozet.aylikKalanTl).toBe('20500.00');
    expect(r.ozet.kalanTl).toBe(c.ozet.aylikKalanTl);
    expect(c.ozet.harcananTl).toBe('500.00');
  });
});

describe('butceOzeti — aylık bütçe (2026-10-31)', () => {
  const h = (category: string | null, aylikTl: string | null) => ({ category, aylikTl });

  it('kategori toplamı kuruşu kuruşuna, en çok harcanan önce', () => {
    const s = butceOzeti(
      [h('Market', '450.50'), h('Market', '0.10'), h('Yemek', '900.00')],
      [{ kategori: 'Market', limitTl: '1000.00' }],
    );
    expect(s.map((x) => x.kategori)).toEqual(['Yemek', 'Market']);
    expect(s[1]).toEqual({
      kategori: 'Market',
      harcananTl: '450.60',
      limitTl: '1000.00',
      yuzde: 45,
      kalanTl: '549.40',
    });
    expect(s[0]).toMatchObject({ limitTl: null, yuzde: null, kalanTl: null });
  });

  it('aşım eksi kalan; harcaması olmayan limit de görünür', () => {
    const s = butceOzeti(
      [h('Yemek', '1500.00')],
      [
        { kategori: 'Yemek', limitTl: '1000.00' },
        { kategori: 'Ulaşım', limitTl: '500.00' },
      ],
    );
    expect(s[0]).toMatchObject({ yuzde: 150, kalanTl: '-500.00' });
    expect(s[1]).toMatchObject({ kategori: 'Ulaşım', harcananTl: '0.00', yuzde: 0 });
  });

  it('⚠️ kuru bilinmeyen kalem toplama girmez; kategorisiz "Diğer"', () => {
    const s = butceOzeti([h('Market', null), h(null, '10.00')], []);
    expect(s).toEqual([
      { kategori: 'Diğer', harcananTl: '10.00', limitTl: null, yuzde: null, kalanTl: null },
    ]);
  });

  it('limit okuması Decimal sızdırmaz', async () => {
    const client = {
      walletButce: {
        findMany: vi.fn().mockResolvedValue([{ kategori: 'Market', limitTl: decimal('5000.00') }]),
      },
    } as never;
    const l = await fetchButceLimitleri(client);
    expect(decimalKalanlar(l)).toEqual([]);
    expect(l).toEqual([{ kategori: 'Market', limitTl: '5000.00' }]);
  });
});

describe('araCuzdan (2026-11-01)', () => {
  const satir = (id: string) => ({
    id,
    name: 'Fatura',
    kind: 'EXPENSE',
    frequency: 'ONCE',
    unit: 'TRY',
    amount: decimal('10.00'),
    date: new Date('2026-10-05T00:00:00Z'),
    category: 'Fatura',
  });

  it('büyük-küçük harf duyarsız arar; Decimal sızmaz', async () => {
    const findMany = vi.fn().mockResolvedValue([satir('a')]);
    const s = await araCuzdan('fat', { walletFlow: { findMany } } as never);
    expect(findMany.mock.calls[0]?.[0].where.OR[0]).toEqual({
      name: { contains: 'fat', mode: 'insensitive' },
    });
    expect(decimalKalanlar(s)).toEqual([]);
    expect(s.fazlasiVar).toBe(false);
  });

  it('tavan aşılınca söyler', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue(Array.from({ length: 101 }, (_, i) => satir(String(i))));
    const s = await araCuzdan('fat', { walletFlow: { findMany } } as never);
    expect(s.kalemler).toHaveLength(100);
    expect(s.fazlasiVar).toBe(true);
  });
});
