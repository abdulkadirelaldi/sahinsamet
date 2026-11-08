import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/server/db';
import {
  addDebtPayment,
  createWalletFlow,
  deleteDebtPayment,
  deleteWalletDebt,
  hesaptanDus,
  updateWalletFlow,
} from '@/server/services/cuzdan';
import { odemeGeriAl, odemeIsle } from '@/server/services/odeme-onay';

const ONEK = 'zzit';
const GUN = '2026-11-02';

async function temizle() {
  const borclar = await db.walletDebt.findMany({
    where: { name: { startsWith: ONEK } },
    select: { id: true },
  });
  const idler = borclar.map((b) => b.id);
  await db.walletOdeme.deleteMany({ where: { kaynakId: { in: idler } } });
  await db.walletDebt.deleteMany({ where: { id: { in: idler } } });
  await db.walletAccount.deleteMany({ where: { name: { startsWith: ONEK } } });
}

const hesapAc = (balance: string, unit: 'TRY' | 'USD' = 'TRY') =>
  db.walletAccount.create({
    data: { name: `${ONEK}-hesap`, kind: 'BANK', unit, balance },
    select: { id: true },
  });

const borcAc = (kalan: string, unit: 'TRY' | 'USD' = 'TRY', taksit = '1000.00') =>
  db.walletDebt.create({
    data: {
      name: `${ONEK}-borc`,
      unit,
      totalAmount: '50000.00',
      remainingAmount: kalan,
      monthlyPayment: taksit,
      paymentDay: 1,
    },
    select: { id: true },
  });

const bakiye = async (id: string) =>
  (await db.walletAccount.findUniqueOrThrow({ where: { id } })).balance.toFixed(2);
const kalan = async (id: string) =>
  (await db.walletDebt.findUniqueOrThrow({ where: { id } })).remainingAmount.toFixed(2);

beforeEach(temizle);
afterAll(async () => {
  await temizle();
  await db.$disconnect();
});

describe('eşzamanlı para hareketleri', () => {
  it('aynı hesaptan aynı anda 10 ödeme: hiçbiri kaybolmaz', async () => {
    const hesap = await hesapAc('10000.00');
    const borc = await borcAc('5000.00');
    await Promise.all(
      Array.from({ length: 10 }, () =>
        addDebtPayment({ debtId: borc.id, date: GUN, amount: '100.00', hesapId: hesap.id }),
      ),
    );
    expect(await bakiye(hesap.id)).toBe('9000.00');
    expect(await kalan(borc.id)).toBe('4000.00');
  });

  it('bakiye kontrolü aşılamaz: 100 ₺ hesaptan aynı anda iki 80 ₺', async () => {
    const hesap = await hesapAc('100.00');
    const sonuclar = await Promise.allSettled(
      [1, 2].map(() => db.$transaction((tx) => hesaptanDus(hesap.id, 'TRY', '80.00', tx))),
    );
    expect(sonuclar.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
    expect(await bakiye(hesap.id)).toBe('20.00');
  });

  it('kalan borç aşılamaz: 100 ₺ borca aynı anda iki 80 ₺', async () => {
    const borc = await borcAc('100.00');
    const sonuclar = await Promise.allSettled(
      [1, 2].map(() => addDebtPayment({ debtId: borc.id, date: GUN, amount: '80.00' })),
    );
    expect(sonuclar.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
    expect(await kalan(borc.id)).toBe('20.00');
  });
});

describe('ödeme onayı', () => {
  const onay = (borcId: string, hesapId: string) => ({
    kaynakTur: 'BORC' as const,
    kaynakId: borcId,
    donem: '2026-11',
    durum: 'ODENDI' as const,
    hesapId,
  });

  it('aynı dönem iki kez işlenemez: çift dokunuş parayı bir kez düşer', async () => {
    const hesap = await hesapAc('3000.00');
    const borc = await borcAc('5000.00');
    await Promise.allSettled([
      odemeIsle(onay(borc.id, hesap.id), db, GUN),
      odemeIsle(onay(borc.id, hesap.id), db, GUN),
    ]);
    expect(await bakiye(hesap.id)).toBe('2000.00');
    expect(await kalan(borc.id)).toBe('4000.00');
    expect(await db.walletDebtPayment.count({ where: { debtId: borc.id } })).toBe(1);
  });

  it('⚠️ iki dönem aynı anda onaylanınca kalan borçtan fazlası düşülmez', async () => {
    const hesap = await hesapAc('3000.00');
    const borc = await borcAc('1000.00');
    await Promise.allSettled(
      ['2026-10', '2026-11'].map((donem) =>
        odemeIsle({ ...onay(borc.id, hesap.id), donem }, db, GUN),
      ),
    );
    expect(await bakiye(hesap.id)).toBe('2000.00');
    expect(await kalan(borc.id)).toBe('0.00');
  });

  it('geri alma her şeyi tam olarak eski hâline getirir', async () => {
    const hesap = await hesapAc('3000.00');
    const borc = await borcAc('5000.00');
    await odemeIsle(onay(borc.id, hesap.id), db, GUN);
    await odemeGeriAl({ kaynakTur: 'BORC', kaynakId: borc.id, donem: '2026-11' });
    expect(await bakiye(hesap.id)).toBe('3000.00');
    expect(await kalan(borc.id)).toBe('5000.00');
    expect(await db.walletDebtPayment.count({ where: { debtId: borc.id } })).toBe(0);
    expect(await db.walletOdeme.count({ where: { kaynakId: borc.id } })).toBe(0);
  });

  it('yetersiz bakiyede işlem tamamen geri alınır: yarım kayıt kalmaz', async () => {
    const hesap = await hesapAc('10.00');
    const borc = await borcAc('5000.00');
    await expect(odemeIsle(onay(borc.id, hesap.id), db, GUN)).rejects.toThrow();
    expect(await db.walletOdeme.count({ where: { kaynakId: borc.id } })).toBe(0);
    expect(await db.walletDebtPayment.count({ where: { debtId: borc.id } })).toBe(0);
    expect(await kalan(borc.id)).toBe('5000.00');
    expect(await bakiye(hesap.id)).toBe('10.00');
  });

  it('⚠️ aynı gün aynı tutardaki elle ödeme silinince onayın hesabına para dönmez', async () => {
    const hesap = await hesapAc('3000.00');
    const borc = await borcAc('5000.00');
    await odemeIsle(onay(borc.id, hesap.id), db, GUN);
    await addDebtPayment({ debtId: borc.id, date: GUN, amount: '1000.00' });
    const elle = await db.walletDebtPayment.findFirstOrThrow({
      where: { debtId: borc.id, note: null },
    });
    await deleteDebtPayment(elle.id);
    expect(await bakiye(hesap.id)).toBe('2000.00');
    expect(await kalan(borc.id)).toBe('4000.00');
    expect(await db.walletOdeme.count({ where: { kaynakId: borc.id } })).toBe(1);
  });
});

describe('kalem düzeltme', () => {
  afterAll(async () => {
    await db.walletFlow.deleteMany({ where: { name: { startsWith: ONEK } } });
  });

  it('⚠️ harcanmış geliri düzeltmek reddedilmez, yalnızca fark yansır', async () => {
    const hesap = await hesapAc('0.00');
    const k = await db.$transaction((tx) =>
      createWalletFlow(
        {
          kind: 'INCOME',
          name: `${ONEK}-gelir`,
          unit: 'TRY',
          amount: '1000.00',
          frequency: 'ONCE',
          date: GUN,
          hesapId: hesap.id,
        } as never,
        tx,
      ),
    );
    await db.$transaction((tx) => hesaptanDus(hesap.id, 'TRY', '400.00', tx));
    await updateWalletFlow({ id: k.id, amount: '900.00' } as never);
    expect(await bakiye(hesap.id)).toBe('500.00');
  });

  it('fark bakiyeyi aşıyorsa reddedilir, bakiye değişmez', async () => {
    const hesap = await hesapAc('0.00');
    const k = await db.$transaction((tx) =>
      createWalletFlow(
        {
          kind: 'INCOME',
          name: `${ONEK}-gelir`,
          unit: 'TRY',
          amount: '1000.00',
          frequency: 'ONCE',
          date: GUN,
          hesapId: hesap.id,
        } as never,
        tx,
      ),
    );
    await db.$transaction((tx) => hesaptanDus(hesap.id, 'TRY', '950.00', tx));
    await expect(updateWalletFlow({ id: k.id, amount: '900.00' } as never)).rejects.toThrow();
    expect(await bakiye(hesap.id)).toBe('50.00');
  });

  it('aynı kalemin aynı anda iki düzeltmesi bakiyeyi kaydırmaz', async () => {
    const hesap = await hesapAc('1000.00');
    const k = await db.$transaction((tx) =>
      createWalletFlow(
        {
          kind: 'INCOME',
          name: `${ONEK}-gelir`,
          unit: 'TRY',
          amount: '100.00',
          frequency: 'ONCE',
          date: GUN,
          hesapId: hesap.id,
        } as never,
        tx,
      ),
    );
    await Promise.all(
      ['200.00', '300.00'].map((amount) => updateWalletFlow({ id: k.id, amount } as never)),
    );
    const son = await db.walletFlow.findUniqueOrThrow({ where: { id: k.id } });
    expect(await bakiye(hesap.id)).toBe((1000 + Number(son.amount)).toFixed(2));
  });
});

describe('borç koruması ve döviz', () => {
  it('ödemesi olan borç silinemez, ödemesiz olan silinir', async () => {
    const dolu = await borcAc('5000.00');
    await addDebtPayment({ debtId: dolu.id, date: GUN, amount: '10.00' });
    await expect(deleteWalletDebt(dolu.id)).rejects.toThrow(/silinemez/);
    expect(await db.walletDebtPayment.count({ where: { debtId: dolu.id } })).toBe(1);
    const bos = await borcAc('5000.00');
    await deleteWalletDebt(bos.id);
    expect(await db.walletDebt.count({ where: { id: bos.id } })).toBe(0);
  });

  it('dolar borcu TL hesaptan: hesaptan çıkan düşer, silinince aynısı döner', async () => {
    const hesap = await hesapAc('50000.00', 'TRY');
    const borc = await borcAc('1000.00', 'USD', '100.00');
    await addDebtPayment({
      debtId: borc.id,
      date: GUN,
      amount: '100.00',
      hesapId: hesap.id,
      hesapTutar: '4250.50',
    });
    expect(await bakiye(hesap.id)).toBe('45749.50');
    expect(await kalan(borc.id)).toBe('900.00');
    const odeme = await db.walletDebtPayment.findFirstOrThrow({ where: { debtId: borc.id } });
    await deleteDebtPayment(odeme.id);
    expect(await bakiye(hesap.id)).toBe('50000.00');
    expect(await kalan(borc.id)).toBe('1000.00');
  });

  it('dövizli borç tutar yazılmadan TL hesaptan düşülmez', async () => {
    const hesap = await hesapAc('50000.00', 'TRY');
    const borc = await borcAc('1000.00', 'USD', '100.00');
    await expect(
      addDebtPayment({ debtId: borc.id, date: GUN, amount: '100.00', hesapId: hesap.id }),
    ).rejects.toThrow(/birimi/);
    expect(await bakiye(hesap.id)).toBe('50000.00');
  });
});
