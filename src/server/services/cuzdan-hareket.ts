import type { WalletDebtPaymentInput, WalletFlowInput } from '@/lib/schemas';
import type { WalletTransferInput } from '@/lib/schemas/wallet';
import { db } from '@/server/db';
import type { WalletUnit } from '@/types';

import { appDayToDate, subtractMoney, sumMoney, toMeasureString } from './_shared';

/**
 * CÜZDAN PARA HAREKETLERİ (2026-11-02): hesaba ve borca dokunan her yazma burada, satır kilidiyle.
 * Eşzamanlılık, geri alma ve eşsizlik `tests/integration/cuzdan-eszamanli.test.ts`te gerçek
 * Postgres ile ölçülüyor. Okuma ve ekran hesapları `cuzdan.ts`te; o dosya bunları yeniden dışa
 * aktarır, çağıranlar değişmedi.
 */

type Client = typeof db;

const para = (d: unknown): string => toMeasureString(d as never, 2) ?? '0.00';
const bosaNull = (v: string | undefined | null) => (v?.trim() ? v.trim() : null);

/** İşlenemeyen para hareketi: mesaj kullanıcıya gösterilir. */
export class OdemeHatasi extends Error {}

/** Onaydan yazılan ödeme satırının notu; dönemi `WalletOdeme` satırında kesin kayıtlı. */
export const ONAY_NOTU = 'Aylık ödeme';

/**
 * Satırı işlem bitene kadar kilitler: oku-hesapla-yaz yolları iki cihazdan aynı anda gelince
 * biri diğerini bekler, kaybolan güncelleme ve aşılan bakiye kontrolü olmaz. Kilit yalnızca
 * `$transaction` içinde anlamlı; bütün para yolları oradan geçiyor. Etkisi
 * `tests/integration/cuzdan-eszamanli.test.ts`te gerçek Postgres ile ölçülüyor.
 */
export async function hesabiKilitle(id: string, tx: Pick<Client, '$queryRaw'>): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "wallet_account" WHERE "id" = ${id} FOR UPDATE`;
}

export async function borcuKilitle(id: string, tx: Pick<Client, '$queryRaw'>): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "wallet_debt" WHERE "id" = ${id} FOR UPDATE`;
}

/** Hesaptan düşer: arşivli hesap, farklı birim ve eksi bakiye reddedilir. */
export async function hesaptanDus(
  hesapId: string,
  unit: WalletUnit,
  tutar: string,
  tx: Pick<Client, 'walletAccount' | '$queryRaw'>,
): Promise<void> {
  await hesabiKilitle(hesapId, tx);
  const hesap = await tx.walletAccount.findUnique({
    where: { id: hesapId },
    select: { unit: true, balance: true, isArchived: true },
  });
  if (!hesap || hesap.isArchived) throw new OdemeHatasi('Hesap bulunamadı.');
  if (hesap.unit !== unit) throw new OdemeHatasi('Hesabın birimi ödemeyle aynı değil.');
  const kalan = subtractMoney(para(hesap.balance), tutar);
  if (kalan.startsWith('-')) throw new OdemeHatasi('Hesapta yeterli bakiye yok.');
  await tx.walletAccount.update({ where: { id: hesapId }, data: { balance: kalan } });
}

/** Hesaba iade eder; hesap silinmişse iade edilecek yer yoktur. */
export async function hesabaIade(
  hesapId: string,
  tutar: string,
  tx: Pick<Client, 'walletAccount' | '$queryRaw'>,
): Promise<void> {
  await hesabiKilitle(hesapId, tx);
  const hesap = await tx.walletAccount.findUnique({
    where: { id: hesapId },
    select: { balance: true },
  });
  if (!hesap) return;
  await tx.walletAccount.update({
    where: { id: hesapId },
    data: { balance: sumMoney([para(hesap.balance), tutar]) },
  });
}

/** Silinen ödemeyi kalana geri ekler ve borcu açar; kalan toplamı geçmez. */
export async function borcaGeriEkle(
  debtId: string,
  tutar: string,
  tx: Pick<Client, 'walletDebt' | '$queryRaw'>,
): Promise<void> {
  await borcuKilitle(debtId, tx);
  const borc = await tx.walletDebt.findUnique({
    where: { id: debtId },
    select: { remainingAmount: true, totalAmount: true },
  });
  if (!borc) return;
  const yeni = sumMoney([para(borc.remainingAmount), tutar]);
  const toplam = para(borc.totalAmount);
  await tx.walletDebt.update({
    where: { id: debtId },
    data: { remainingAmount: Number(yeni) > Number(toplam) ? toplam : yeni, isClosed: false },
  });
}

/** Ödemeyi yazar ve kalanı düşürür — çağıranın işlemi içinde (`tx`). */
export async function borcOdemesiYaz(
  input: WalletDebtPaymentInput,
  tx: Pick<Client, 'walletDebt' | 'walletDebtPayment' | '$queryRaw'>,
): Promise<{ remainingAmount: string; isClosed: boolean }> {
  await borcuKilitle(input.debtId, tx);
  const borc = await tx.walletDebt.findUnique({
    where: { id: input.debtId },
    select: { remainingAmount: true },
  });
  if (!borc) throw new Error('Borç bulunamadı.');
  await tx.walletDebtPayment.create({
    data: {
      debtId: input.debtId,
      date: appDayToDate(input.date),
      amount: input.amount,
      note: bosaNull(input.note),
      hesapId: input.hesapId ?? null,
      hesapTutar: input.hesapTutar ?? null,
    },
  });
  const fark = subtractMoney(para(borc.remainingAmount), input.amount);
  const remainingAmount = fark.startsWith('-') ? '0.00' : fark;
  const isClosed = remainingAmount === '0.00';
  await tx.walletDebt.update({
    where: { id: input.debtId },
    data: { remainingAmount, isClosed },
  });
  return { remainingAmount, isClosed };
}

export async function addDebtPayment(
  input: WalletDebtPaymentInput,
  client: Client = db,
): Promise<{ remainingAmount: string; isClosed: boolean }> {
  return client.$transaction(async (tx) => {
    await borcuKilitle(input.debtId, tx);
    const borc = await tx.walletDebt.findUnique({
      where: { id: input.debtId },
      select: { remainingAmount: true, unit: true },
    });
    if (!borc) throw new OdemeHatasi('Borç bulunamadı.');
    if (Number(input.amount) > Number(para(borc.remainingAmount))) {
      throw new OdemeHatasi('Ödeme kalan borçtan fazla olamaz.');
    }
    if (input.hesapId) {
      if (input.hesapTutar) {
        // Dövizli borç başka birimdeki hesaptan: hesaptan gerçekten çıkan tutar yazılır.
        const hesap = await tx.walletAccount.findUnique({
          where: { id: input.hesapId },
          select: { unit: true },
        });
        if (!hesap) throw new OdemeHatasi('Hesap bulunamadı.');
        await hesaptanDus(input.hesapId, hesap.unit as WalletUnit, input.hesapTutar, tx);
      } else {
        await hesaptanDus(input.hesapId, borc.unit as WalletUnit, input.amount, tx);
      }
    }
    return borcOdemesiYaz(input, tx);
  });
}

/**
 * Ödemeyi siler: hesaba iade, kalana geri ekleme ve bağlı aylık onay TEK işlemde.
 * Ödeme onayından gelen eski kayıtlarda hesap yalnızca onay kaydındadır.
 */
export async function deleteDebtPayment(id: string, client: Client = db): Promise<void> {
  await client.$transaction(async (tx) => {
    const odeme = await tx.walletDebtPayment.findUnique({ where: { id } });
    if (!odeme) throw new OdemeHatasi('Ödeme bulunamadı.');
    const tutar = para(odeme.amount);
    // Yalnızca onaydan yazılan satır onaya bağlıdır: aynı gün aynı tutardaki elle ödemeyi
    // silmek onayın hesabına hiç çıkmamış parayı iade ediyordu.
    const onay =
      odeme.note === ONAY_NOTU
        ? await tx.walletOdeme.findFirst({
            where: {
              kaynakTur: 'BORC',
              kaynakId: odeme.debtId,
              gun: odeme.date,
              tutar: odeme.amount,
              durum: 'ODENDI',
            },
          })
        : null;
    const hesapId = odeme.hesapId ?? onay?.hesapId ?? null;
    // Kilit sırası her yolda borç, sonra hesap.
    await borcaGeriEkle(odeme.debtId, tutar, tx);
    if (hesapId) await hesabaIade(hesapId, odeme.hesapTutar ? para(odeme.hesapTutar) : tutar, tx);
    if (onay) await tx.walletOdeme.delete({ where: { id: onay.id } });
    await tx.walletDebtPayment.delete({ where: { id } });
  });
}

export type HesapEtkisi = Pick<WalletFlowInput, 'kind' | 'frequency' | 'amount' | 'unit'> & {
  hesapId?: string | null;
};

/** Kalemin bakiyeye yansıması: yalnızca hesabı olan tek seferlik kalem. */
export async function hesabaYansit(
  k: HesapEtkisi,
  tx: Pick<Client, 'walletAccount' | '$queryRaw'>,
): Promise<void> {
  if (!k.hesapId || k.frequency !== 'ONCE') return;
  if (k.kind === 'EXPENSE') return hesaptanDus(k.hesapId, k.unit, k.amount, tx);
  const hesap = await tx.walletAccount.findUnique({
    where: { id: k.hesapId },
    select: { unit: true, isArchived: true },
  });
  if (!hesap || hesap.isArchived) throw new OdemeHatasi('Hesap bulunamadı.');
  if (hesap.unit !== k.unit) throw new OdemeHatasi('Hesabın birimi kalemle aynı değil.');
  await hesabaIade(k.hesapId, k.amount, tx);
}

/** Yansımayı geri alır; gelir zaten harcandıysa hesaptanDus reddeder. */
export async function yansimayiGeriAl(
  k: HesapEtkisi,
  tx: Pick<Client, 'walletAccount' | '$queryRaw'>,
): Promise<void> {
  if (!k.hesapId || k.frequency !== 'ONCE') return;
  if (k.kind === 'EXPENSE') return hesabaIade(k.hesapId, k.amount, tx);
  return hesaptanDus(k.hesapId, k.unit, k.amount, tx);
}

/**
 * Yönden bağımsız sabit sıra: A→B ile B→A aynı anda gelince karşılıklı beklenmesin. `hesaptanDus`
 * ve `hesabaIade` aynı işlemde yeniden kilitler; bu bekletmez.
 */
async function ikiHesabiKilitle(
  a: string,
  b: string,
  tx: Pick<Client, '$queryRaw'>,
): Promise<void> {
  for (const id of [a, b].sort()) await hesabiKilitle(id, tx);
}

/**
 * Tutarı düzeltilen tek seferlik kalemin farkı. Önce eskiyi geri alıp yeniyi uygulamak ara adımda
 * bakiyeyi aşıyordu: 600 ₺ kalmış hesapta 1000 ₺'lik geliri 900'e düzeltmek reddediliyordu.
 */
export async function hesabaFarkYansit(
  hesapId: string,
  kind: HesapEtkisi['kind'],
  unit: WalletUnit,
  eskiTutar: string,
  yeniTutar: string,
  tx: Pick<Client, 'walletAccount' | '$queryRaw'>,
): Promise<void> {
  const artis = subtractMoney(yeniTutar, eskiTutar);
  const artti = !artis.startsWith('-');
  const fark = artti ? artis : artis.slice(1);
  if (Number(fark) === 0) return;
  // Gelir artışı ya da gider azalışı hesaba ekler; tersi düşer.
  if (artti === (kind === 'INCOME')) return hesabaIade(hesapId, fark, tx);
  return hesaptanDus(hesapId, unit, fark, tx);
}

/** Hesaplar arası aktarım: yalnızca aynı birim, kaynak eksiye düşmez. */
export async function createWalletTransfer(
  input: WalletTransferInput,
  client: Client = db,
): Promise<{ id: string }> {
  return client.$transaction(async (tx) => {
    await ikiHesabiKilitle(input.kaynakId, input.hedefId, tx);
    const hedef = await tx.walletAccount.findUnique({
      where: { id: input.hedefId },
      select: { unit: true, isArchived: true },
    });
    if (!hedef || hedef.isArchived) throw new OdemeHatasi('Hedef hesap bulunamadı.');
    await hesaptanDus(input.kaynakId, hedef.unit as WalletUnit, input.amount, tx);
    await hesabaIade(input.hedefId, input.amount, tx);
    return tx.walletTransfer.create({
      data: {
        kaynakId: input.kaynakId,
        hedefId: input.hedefId,
        amount: input.amount,
        gun: appDayToDate(input.gun),
        note: bosaNull(input.note),
      },
      select: { id: true },
    });
  });
}

/** Geri alır: hedefte para kalmadıysa reddedilir, hesap eksiye düşmez. */
export async function deleteWalletTransfer(id: string, client: Client = db): Promise<void> {
  await client.$transaction(async (tx) => {
    const t = await tx.walletTransfer.findUnique({ where: { id } });
    if (!t) throw new OdemeHatasi('Transfer bulunamadı.');
    await ikiHesabiKilitle(t.kaynakId, t.hedefId, tx);
    const kaynak = await tx.walletAccount.findUnique({
      where: { id: t.kaynakId },
      select: { unit: true },
    });
    const tutar = para(t.amount);
    await hesaptanDus(t.hedefId, (kaynak?.unit ?? 'TRY') as WalletUnit, tutar, tx);
    await hesabaIade(t.kaynakId, tutar, tx);
    await tx.walletTransfer.delete({ where: { id } });
  });
}
