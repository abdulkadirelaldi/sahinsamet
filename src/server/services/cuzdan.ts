import type {
  UpdateWalletAccountInput,
  UpdateWalletDebtInput,
  UpdateWalletFlowInput,
  WalletAccountInput,
  WalletDebtInput,
  WalletFlowInput,
} from '@/lib/schemas';
import { db } from '@/server/db';
import type { WalletAccountKind, WalletFlowKind, WalletFrequency, WalletUnit } from '@/types';

import {
  addAppDays,
  appDayToDate,
  appToday,
  computeBaseAmount,
  dateToAppDay,
  differenceInAppDays,
  subtractMoney,
  sumMoney,
  toMeasureString,
  type AppDay,
} from './_shared';
import {
  hesabaFarkYansit,
  hesabaYansit,
  OdemeHatasi,
  ONAY_NOTU,
  yansimayiGeriAl,
  type HesapEtkisi,
} from './cuzdan-hareket';
import { fetchKurlar, tlKarsiligi, type KurDurumu } from './kur';

export * from './cuzdan-hareket';

/**
 * CÜZDAN (2026-10-30) — muhasebenin yerine kişisel varlık, borç, gelir/gider.
 *
 * Tutarlar uç uca METİN; TL karşılıkları kayıpsız (`computeBaseAmount`),
 * toplamlar `sumMoney` (ADR-014/D). Varlık ALIŞ, borç SATIŞ kuruyla (kur.ts).
 * Kuru bilinmeyen kalem toplama GİRMEZ ve ekranda "kur yok" diye işaretlenir —
 * sıfır saymak toplamı sessizce düşürürdü.
 *
 * "AY SONUNDA KALAN" TEK KURALLA: gelir ALIŞ, gider ve taksit SATIŞ kuruyla; atlanan
 * kalem girmez; taksit = bu ay ödenen + bu ay kalan (`kalanTaksit`). Aylık rapor da
 * aynısını kullanır.
 */

type Client = typeof db;

const para = (d: unknown): string => toMeasureString(d as never, 2) ?? '0.00';

/* ===========================================================================
 * SAF YARDIMCILAR
 * ======================================================================== */

/** Aylığa çeviren çarpan — haftalık 52/12, yıllık 1/12; tek seferlik aylığa girmez. */
export const AYLIK_CARPAN: Record<WalletFrequency, string | null> = {
  MONTHLY: '1',
  WEEKLY: '4.33333333',
  YEARLY: '0.08333333',
  ONCE: null,
};

/** Tutarın AYLIK karşılığı (aynı birimde); tek seferlikse `null`. SAF. */
export function aylikTutar(tutar: string, siklik: WalletFrequency): string | null {
  const carpan = AYLIK_CARPAN[siklik];
  return carpan === null ? null : computeBaseAmount(tutar, carpan);
}

/**
 * Borcun bitişine kalan ay. Bitiş tarihi varsa ondan (tam ay, yukarı yuvarlı);
 * yoksa kalan / taksit (yukarı). İkisi de yoksa `null`. SAF.
 */
export function kalanAy(
  kalan: string,
  taksit: string | null,
  bitis: AppDay | null,
  bugun: AppDay,
): number | null {
  if (bitis) return Math.max(0, Math.ceil(differenceInAppDays(bugun, bitis) / 30.44));
  if (taksit && Number(taksit) > 0) return Math.ceil(Number(kalan) / Number(taksit));
  return null;
}

/** Ödenen yüzde — `(toplam - kalan) / toplam`, 0–100 tam sayı. SAF. */
export function odenenYuzde(toplam: string, kalan: string): number {
  const t = Number(toplam);
  if (t <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((t - Number(kalan)) / t) * 100)));
}

/** O ayın ödeme günü: 31'i kısa ayda son güne düşer. SAF. */
export function vade(donem: string, gun: number): AppDay {
  const [y, m] = donem.split('-').map(Number) as [number, number];
  const son = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${donem}-${String(Math.min(gun, son)).padStart(2, '0')}` as AppDay;
}

/** Vadeye bu kadar gün yakın ödeme o taksidi kapatır; daha uzağı kendi takvim ayında kalır. */
const YAKIN_ODEME_GUNU = 7;

export const gunFarki = (a: string, b: string) =>
  Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

/**
 * Elle ödeme hangi taksidi karşılar: vadesine 7 günden yakın olduğu dönem, yoksa kendi takvim ayı.
 * 1 Kasım taksidi 30 Ekim'de ödenirse Kasım; 28 Ekim taksidi 2 Kasım'da ödenirse Ekim. 17 Kasım'daki
 * ödeme iki vadeye de uzak: Kasım'da kalır, 14 gün sonraki Aralık'a kaymaz. Ödeme günü yoksa takvim
 * ayı. Pencere `islenenKumesi` ve `fetchCuzdan` sorgularıyla aynı. SAF.
 */
export function odemeDonemi(gun: AppDay, odemeGunu: number | null | undefined): string {
  const buAy = gun.slice(0, 7);
  if (!odemeGunu) return buAy;
  const adaylar = [
    addAppDays(`${buAy}-01` as AppDay, -1).slice(0, 7),
    buAy,
    addAppDays(vade(buAy, 31), 1).slice(0, 7),
  ];
  const uzaklik = (donem: string) => Math.abs(gunFarki(vade(donem, odemeGunu), gun));
  const enYakin = adaylar.reduce((en, aday) => (uzaklik(aday) < uzaklik(en) ? aday : en));
  return uzaklik(enYakin) <= YAKIN_ODEME_GUNU ? enYakin : buAy;
}

/**
 * Dönemin taksitine sayılan ödeme. Takvim ayı değil dönem: 30 Ekim'de ödenen 1 Kasım taksiti
 * Kasım'ı kapatır, Kasım'da ödenen gecikmiş Ekim taksiti Kasım'ı kapatmaz. Bekleyen ödemeler
 * listesiyle aynı kural. SAF.
 */
export function donemOdenen(
  borc: { id: string; paymentDay: number | null | undefined },
  odemeler: readonly { debtId: string; date: AppDay; amount: string; note?: string | null }[],
  onaylar: readonly {
    kaynakTur: string;
    kaynakId: string;
    durum?: string;
    tutar?: string | null;
  }[],
  donem: string,
): string {
  const onayli = onaylar.flatMap((o) =>
    o.kaynakTur === 'BORC' && o.kaynakId === borc.id && o.durum === 'ODENDI' && o.tutar
      ? [o.tutar]
      : [],
  );
  const elle = odemeler
    .filter(
      (o) =>
        o.debtId === borc.id &&
        o.note !== ONAY_NOTU &&
        odemeDonemi(o.date, borc.paymentDay) === donem,
    )
    .map((o) => o.amount);
  return sumMoney([...onayli, ...elle]);
}

/** Bu ay daha ödenecek taksit: atlandıysa ya da ödendiyse 0, kalan borcu geçmez. SAF. */
export function kalanTaksit(
  aylik: string | null,
  kalanBorc: string,
  odenen: string,
  atlandi: boolean,
): string {
  if (!aylik || atlandi) return '0.00';
  const eksik = subtractMoney(aylik, odenen);
  if (eksik.startsWith('-')) return '0.00';
  return Number(kalanBorc) < Number(eksik) ? kalanBorc : eksik;
}

/* ===========================================================================
 * DTO'lar
 * ======================================================================== */

export interface HesapDto {
  id: string;
  name: string;
  kind: WalletAccountKind;
  unit: WalletUnit;
  balance: string;
  /** TL karşılığı (alış) — kur yoksa `null`. */
  tl: string | null;
}

export interface BorcDto {
  id: string;
  name: string;
  lender: string | null;
  unit: WalletUnit;
  totalAmount: string;
  remainingAmount: string;
  monthlyPayment: string | null;
  paymentDay: number | null;
  endDate: AppDay | null;
  note: string | null;
  isClosed: boolean;
  /** Kalan borcun TL karşılığı (satış) — kur yoksa `null`. */
  kalanTl: string | null;
  /** Aylık taksidin TL karşılığı (satış). */
  taksitTl: string | null;
  odenenYuzde: number;
  kalanAy: number | null;
}

export interface AkisDto {
  id: string;
  kind: WalletFlowKind;
  name: string;
  counterparty: string | null;
  unit: WalletUnit;
  amount: string;
  frequency: WalletFrequency;
  day: number | null;
  date: AppDay | null;
  category: string | null;
  note: string | null;
  isActive: boolean;
  /** Tek seferlik kalemin yansıdığı hesap. */
  hesapId: string | null;
  /**
   * BU AYA düşen TL — tekrarlayanda aylık karşılık, tek seferlikte bu ay
   * tarihliyse tutarın kendisi; başka aya aitse `null`.
   */
  aylikTl: string | null;
}

export interface CuzdanOzeti {
  varlikTl: string;
  borcTl: string;
  netTl: string;
  aylikGelirTl: string;
  aylikGiderTl: string;
  /** Bu ayın tek seferlik harcamaları: düzenli giderler hariç. */
  harcananTl: string;
  /** Bu ay ödenen + bu ay daha ödenecek taksit. */
  aylikTaksitTl: string;
  /** Gelir − gider − taksit. */
  aylikKalanTl: string;
  /** Kuru bilinmediği için toplamlara GİRMEYEN kalem sayısı. */
  kursuzKalem: number;
}

export interface CuzdanDto {
  hesaplar: HesapDto[];
  borclar: BorcDto[];
  gelirler: AkisDto[];
  /** Tekrarlayan giderler (kira, abonelik…). */
  giderler: AkisDto[];
  /** Bu ayın TEK SEFERLİK giderleri (hızlı harcama dahil), yeniden eskiye. */
  harcamalar: AkisDto[];
  ozet: CuzdanOzeti;
  kur: Pick<KurDurumu, 'guncellendi' | 'bayat'> & { kurlar: KurDurumu['kurlar'] };
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

export async function fetchCuzdan(
  client: Client = db,
  bugun: AppDay = appToday(),
  kurDurumu?: KurDurumu,
): Promise<CuzdanDto> {
  const buAyKodu = bugun.slice(0, 7);
  const [hesapSatir, borcSatir, akisSatir, odemeSatir, onaySatir, kur] = await Promise.all([
    client.walletAccount.findMany({
      where: { isArchived: false },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    }),
    client.walletDebt.findMany({
      where: { isClosed: false },
      orderBy: [{ endDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    }),
    // Geçmiş ayların tek seferlikleri bu ekranda kullanılmaz; aylar geçtikçe sorgu büyümesin.
    client.walletFlow.findMany({
      where: {
        isActive: true,
        OR: [
          { frequency: { not: 'ONCE' } },
          { date: { gte: appDayToDate(`${buAyKodu}-01` as AppDay) } },
        ],
      },
      orderBy: [{ day: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    }),
    // Bir hafta geriden: ay sonunda erken ödenen taksit bu dönemi kapatır.
    client.walletDebtPayment.findMany({
      where: { date: { gte: appDayToDate(addAppDays(`${buAyKodu}-01` as AppDay, -7)) } },
      select: {
        debtId: true,
        date: true,
        amount: true,
        note: true,
        debt: { select: { unit: true } },
      },
    }),
    client.walletOdeme.findMany({
      where: { donem: buAyKodu },
      select: { kaynakTur: true, kaynakId: true, durum: true, tutar: true },
    }),
    kurDurumu ? Promise.resolve(kurDurumu) : fetchKurlar(),
  ]);
  const { kurlar } = kur;
  let kursuz = 0;
  const say = (v: string | null) => {
    if (v === null) kursuz += 1;
    return v;
  };

  const hesaplar: HesapDto[] = hesapSatir.map((h) => {
    const balance = para(h.balance);
    return {
      id: h.id,
      name: h.name,
      kind: h.kind as WalletAccountKind,
      unit: h.unit as WalletUnit,
      balance,
      tl: say(tlKarsiligi(balance, h.unit as WalletUnit, kurlar, 'alis')),
    };
  });

  const borclar: BorcDto[] = borcSatir.map((b) => {
    const unit = b.unit as WalletUnit;
    const remainingAmount = para(b.remainingAmount);
    const totalAmount = para(b.totalAmount);
    const monthlyPayment = b.monthlyPayment === null ? null : para(b.monthlyPayment);
    const endDate = b.endDate ? dateToAppDay(b.endDate) : null;
    return {
      id: b.id,
      name: b.name,
      lender: b.lender,
      unit,
      totalAmount,
      remainingAmount,
      monthlyPayment,
      paymentDay: b.paymentDay,
      endDate,
      note: b.note,
      isClosed: b.isClosed,
      kalanTl: say(tlKarsiligi(remainingAmount, unit, kurlar, 'satis')),
      taksitTl: monthlyPayment === null ? null : tlKarsiligi(monthlyPayment, unit, kurlar, 'satis'),
      odenenYuzde: odenenYuzde(totalAmount, remainingAmount),
      kalanAy: kalanAy(remainingAmount, monthlyPayment, endDate, bugun),
    };
  });

  const akislar: AkisDto[] = akisSatir.map((a) => {
    const unit = a.unit as WalletUnit;
    const amount = para(a.amount);
    const frequency = a.frequency as WalletFrequency;
    const gun = a.date ? dateToAppDay(a.date) : null;
    // Tek seferlik kalem, tarihi BU AY ise bu ayın hesabına girer (2026-10-30).
    const buAy = frequency === 'ONCE' && gun !== null && gun.slice(0, 7) === bugun.slice(0, 7);
    const aylik = buAy ? amount : aylikTutar(amount, frequency);
    return {
      id: a.id,
      kind: a.kind as WalletFlowKind,
      name: a.name,
      counterparty: a.counterparty,
      unit,
      amount,
      frequency: a.frequency as WalletFrequency,
      day: a.day,
      date: a.date ? dateToAppDay(a.date) : null,
      category: a.category,
      note: a.note,
      isActive: a.isActive,
      hesapId: a.hesapId ?? null,
      aylikTl:
        aylik === null
          ? null
          : say(tlKarsiligi(aylik, unit, kurlar, a.kind === 'INCOME' ? 'alis' : 'satis')),
    };
  });

  const bilinen = (v: string | null): v is string => v !== null;
  const topla = (degerler: (string | null)[]) => sumMoney(degerler.filter(bilinen));
  const varlikTl = topla(hesaplar.map((h) => h.tl));
  const borcTl = topla(borclar.map((b) => b.kalanTl));
  // Geçmiş aylara ait tek seferlikler listelere ve toplamlara girmez.
  const buAyMi = (a: AkisDto) => a.date !== null && a.date.slice(0, 7) === bugun.slice(0, 7);
  const gecerli = akislar.filter((a) => a.frequency !== 'ONCE' || buAyMi(a));
  const gelirler = gecerli.filter((a) => a.kind === 'INCOME');
  const giderler = gecerli.filter((a) => a.kind === 'EXPENSE' && a.frequency !== 'ONCE');
  const harcamalar = gecerli
    .filter((a) => a.kind === 'EXPENSE' && a.frequency === 'ONCE')
    .sort((x, y) => (y.date ?? '').localeCompare(x.date ?? ''));
  const aylikGelirTl = topla(gelirler.map((a) => a.aylikTl));
  const atlanan = new Set(
    onaySatir.filter((o) => o.durum === 'ATLANDI').map((o) => `${o.kaynakTur}:${o.kaynakId}`),
  );
  const donemOdemeleri = odemeSatir.map((o) => ({
    debtId: o.debtId,
    date: dateToAppDay(o.date),
    amount: para(o.amount),
    note: o.note,
  }));
  const donemOnaylari = onaySatir.map((o) => ({
    kaynakTur: o.kaynakTur,
    kaynakId: o.kaynakId,
    durum: o.durum,
    tutar: o.tutar ? para(o.tutar) : null,
  }));
  const aylikGiderTl = topla(
    [...giderler.filter((g) => !atlanan.has(`AKIS:${g.id}`)), ...harcamalar].map((a) => a.aylikTl),
  );
  const buAyOdemeleri = odemeSatir.filter((o) => dateToAppDay(o.date).slice(0, 7) === buAyKodu);
  const aylikTaksitTl = topla([
    ...buAyOdemeleri.map((o) =>
      tlKarsiligi(para(o.amount), o.debt.unit as WalletUnit, kurlar, 'satis'),
    ),
    ...borclar.map((b) =>
      tlKarsiligi(
        kalanTaksit(
          b.monthlyPayment,
          b.remainingAmount,
          donemOdenen(b, donemOdemeleri, donemOnaylari, buAyKodu),
          atlanan.has(`BORC:${b.id}`),
        ),
        b.unit,
        kurlar,
        'satis',
      ),
    ),
  ]);

  return {
    hesaplar,
    borclar,
    gelirler,
    giderler,
    harcamalar,
    ozet: {
      varlikTl,
      borcTl,
      netTl: subtractMoney(varlikTl, borcTl),
      aylikGelirTl,
      aylikGiderTl,
      harcananTl: topla(harcamalar.map((a) => a.aylikTl)),
      aylikTaksitTl,
      aylikKalanTl: subtractMoney(aylikGelirTl, sumMoney([aylikGiderTl, aylikTaksitTl])),
      kursuzKalem: kursuz,
    },
    kur: { kurlar, guncellendi: kur.guncellendi, bayat: kur.bayat },
  };
}

/** Tek borcun ödemeleri — borç ekranı için. */
export async function fetchDebtPayments(
  debtId: string,
  client: Client = db,
): Promise<{ id: string; date: AppDay; amount: string; note: string | null }[]> {
  const satirlar = await client.walletDebtPayment.findMany({
    where: { debtId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });
  return satirlar.map((p) => ({
    id: p.id,
    date: dateToAppDay(p.date),
    amount: para(p.amount),
    note: p.note,
  }));
}

/** Dövizli borçta başka birimden ödemek için bütün arşivsiz hesaplar. */
export async function fetchTumHesaplar(
  client: Pick<Client, 'walletAccount'> = db,
): Promise<{ id: string; name: string; unit: WalletUnit; balance: string }[]> {
  const satirlar = await client.walletAccount.findMany({
    where: { isArchived: false },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return satirlar.map((h) => ({
    id: h.id,
    name: h.name,
    unit: h.unit as WalletUnit,
    balance: para(h.balance),
  }));
}

/** Ödemede seçilebilecek hesaplar: arşivsiz ve aynı birimde. */
export async function fetchOdemeHesaplari(
  unit: WalletUnit,
  client: Pick<Client, 'walletAccount'> = db,
): Promise<{ id: string; name: string; unit: WalletUnit; balance: string }[]> {
  const satirlar = await client.walletAccount.findMany({
    where: { isArchived: false, unit },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return satirlar.map((h) => ({
    id: h.id,
    name: h.name,
    unit: h.unit as WalletUnit,
    balance: para(h.balance),
  }));
}

export interface AramaSonucu {
  kalemler: {
    id: string;
    name: string;
    kind: WalletFlowKind;
    frequency: WalletFrequency;
    unit: WalletUnit;
    amount: string;
    date: AppDay | null;
    category: string | null;
  }[];
  /** Tavan yüzünden kesildi mi. */
  fazlasiVar: boolean;
}

const ARAMA_TAVANI = 100;

/** Gelir ve gider kalemlerinde ad, kişi ve kategoriye göre arama, yeniden eskiye. */
export async function araCuzdan(
  q: string,
  client: Pick<Client, 'walletFlow'> = db,
): Promise<AramaSonucu> {
  const icerir = { contains: q, mode: 'insensitive' as const };
  const satirlar = await client.walletFlow.findMany({
    where: { OR: [{ name: icerir }, { counterparty: icerir }, { category: icerir }] },
    orderBy: [{ date: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: ARAMA_TAVANI + 1,
  });
  return {
    kalemler: satirlar.slice(0, ARAMA_TAVANI).map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind as WalletFlowKind,
      frequency: a.frequency as WalletFrequency,
      unit: a.unit as WalletUnit,
      amount: para(a.amount),
      date: a.date ? dateToAppDay(a.date) : null,
      category: a.category,
    })),
    fazlasiVar: satirlar.length > ARAMA_TAVANI,
  };
}

export interface CuzdanArsivi {
  hesaplar: { id: string; name: string; unit: WalletUnit; balance: string }[];
  borclar: { id: string; name: string; unit: WalletUnit; totalAmount: string }[];
  sonlananlar: {
    id: string;
    name: string;
    unit: WalletUnit;
    amount: string;
    bitis: AppDay | null;
  }[];
  /** Tarihi girilmemiş eski tek seferlik kalemler: hiçbir toplama girmez, düzeltilmeli. */
  tarihsizler: { id: string; name: string; unit: WalletUnit; amount: string }[];
}

/** Ana ekranda görünmeyen ama silinmemiş kayıtlar. */
export async function fetchCuzdanArsivi(
  client: Pick<Client, 'walletAccount' | 'walletDebt' | 'walletFlow'> = db,
): Promise<CuzdanArsivi> {
  const [hesaplar, borclar, sonlananlar, tarihsizler] = await Promise.all([
    client.walletAccount.findMany({
      where: { isArchived: true },
      orderBy: { updatedAt: 'desc' },
    }),
    client.walletDebt.findMany({ where: { isClosed: true }, orderBy: { updatedAt: 'desc' } }),
    client.walletFlow.findMany({
      where: { isActive: false, frequency: { not: 'ONCE' } },
      orderBy: { updatedAt: 'desc' },
    }),
    client.walletFlow.findMany({
      where: { frequency: 'ONCE', date: null },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    hesaplar: hesaplar.map((h) => ({
      id: h.id,
      name: h.name,
      unit: h.unit as WalletUnit,
      balance: para(h.balance),
    })),
    borclar: borclar.map((b) => ({
      id: b.id,
      name: b.name,
      unit: b.unit as WalletUnit,
      totalAmount: para(b.totalAmount),
    })),
    sonlananlar: sonlananlar.map((a) => ({
      id: a.id,
      name: a.name,
      unit: a.unit as WalletUnit,
      amount: para(a.amount),
      bitis: a.bitisGunu ? dateToAppDay(a.bitisGunu) : null,
    })),
    tarihsizler: tarihsizler.map((a) => ({
      id: a.id,
      name: a.name,
      unit: a.unit as WalletUnit,
      amount: para(a.amount),
    })),
  };
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

const bosaNull = (v: string | undefined | null) => (v?.trim() ? v.trim() : null);

export async function createWalletAccount(input: WalletAccountInput, client: Client = db) {
  const sira = await client.walletAccount.count();
  return client.walletAccount.create({
    data: { ...input, order: (sira + 1) * 10 },
    select: { id: true },
  });
}

export async function updateWalletAccount(input: UpdateWalletAccountInput, client: Client = db) {
  const { id, ...alanlar } = input;
  return client.walletAccount.update({ where: { id }, data: alanlar, select: { id: true } });
}

export async function archiveWalletAccount(id: string, client: Client = db) {
  return client.walletAccount.update({
    where: { id },
    data: { isArchived: true },
    select: { id: true },
  });
}

export async function restoreWalletAccount(id: string, client: Client = db) {
  return client.walletAccount.update({
    where: { id },
    data: { isArchived: false },
    select: { id: true },
  });
}

export async function createWalletDebt(input: WalletDebtInput, client: Client = db) {
  return client.walletDebt.create({
    data: {
      name: input.name,
      lender: bosaNull(input.lender),
      unit: input.unit,
      totalAmount: input.totalAmount,
      remainingAmount: input.remainingAmount,
      monthlyPayment: input.monthlyPayment ?? null,
      paymentDay: input.paymentDay ?? null,
      endDate: input.endDate ? appDayToDate(input.endDate) : null,
      note: bosaNull(input.note),
    },
    select: { id: true },
  });
}

export async function updateWalletDebt(input: UpdateWalletDebtInput, client: Client = db) {
  const { id, endDate, ...alanlar } = input;
  return client.walletDebt.update({
    where: { id },
    data: {
      ...alanlar,
      // Kalan elle değişince durum da değişir: düzeltilen borç yeniden açılır.
      ...(alanlar.remainingAmount !== undefined
        ? { isClosed: Number(alanlar.remainingAmount) === 0 }
        : {}),
      ...(endDate !== undefined
        ? { endDate: endDate === null ? null : appDayToDate(endDate) }
        : {}),
    },
    select: { id: true },
  });
}

/**
 * Ödemesi olan borç silinmez: ödemeler silinirse geçmiş raporlar değişir ve hesaptan düşen
 * para kayıtsız kalır. Kapatılır (arşivde durur). Ödemesiz borcun atlama kayıtları da silinir.
 */
export async function deleteWalletDebt(id: string, client: Client = db) {
  return client.$transaction(async (tx) => {
    const odemeSayisi = await tx.walletDebtPayment.count({ where: { debtId: id } });
    if (odemeSayisi > 0) {
      throw new OdemeHatasi('Ödemesi olan borç silinemez. Geçmiş korunsun diye kapatabilirsin.');
    }
    await tx.walletOdeme.deleteMany({ where: { kaynakTur: 'BORC', kaynakId: id } });
    return tx.walletDebt.delete({ where: { id }, select: { id: true } });
  });
}

/** Kalem + varsa hesap etkisi: `client` işlem olmalı (`birKez` ya da `$transaction`). */
export async function createWalletFlow(
  input: WalletFlowInput,
  client: Pick<Client, 'walletFlow' | 'walletAccount' | '$queryRaw'> = db,
) {
  await hesabaYansit(input, client);
  return client.walletFlow.create({
    data: {
      kind: input.kind,
      name: input.name,
      counterparty: bosaNull(input.counterparty),
      unit: input.unit,
      amount: input.amount,
      frequency: input.frequency,
      day: input.day ?? null,
      date: input.date ? appDayToDate(input.date) : null,
      category: bosaNull(input.category),
      note: bosaNull(input.note),
      hesapId: input.frequency === 'ONCE' ? (input.hesapId ?? null) : null,
    },
    select: { id: true },
  });
}

/** Tutar ya da hesap değişirse eski yansıma geri alınır, yenisi uygulanır; tek işlemde. */
export async function updateWalletFlow(input: UpdateWalletFlowInput, client: Client = db) {
  const { id, date, hesapId, ...alanlar } = input;
  return client.$transaction(async (tx) => {
    // Aynı kalemi iki cihaz aynı anda düzenlerse ikincisi güncel değeri okusun.
    await tx.$queryRaw`SELECT 1 FROM "wallet_flow" WHERE "id" = ${id} FOR UPDATE`;
    const eski = await tx.walletFlow.findUnique({
      where: { id },
      select: { kind: true, frequency: true, amount: true, unit: true, hesapId: true },
    });
    if (!eski) throw new OdemeHatasi('Kayıt bulunamadı.');
    const eskiEtki: HesapEtkisi = {
      kind: eski.kind as WalletFlowKind,
      frequency: eski.frequency as WalletFrequency,
      amount: para(eski.amount),
      unit: eski.unit as WalletUnit,
      hesapId: eski.hesapId,
    };
    const yeniEtki: HesapEtkisi = {
      ...eskiEtki,
      ...(alanlar.kind ? { kind: alanlar.kind } : {}),
      ...(alanlar.frequency ? { frequency: alanlar.frequency } : {}),
      ...(alanlar.amount ? { amount: alanlar.amount } : {}),
      ...(alanlar.unit ? { unit: alanlar.unit } : {}),
      ...(hesapId !== undefined ? { hesapId } : {}),
    };
    // Yalnızca ad ya da tarih değiştiyse bakiyeye dokunulmaz: harcanmış gelirin adı da düzelebilsin.
    const paraDegisti =
      eskiEtki.kind !== yeniEtki.kind ||
      eskiEtki.frequency !== yeniEtki.frequency ||
      Number(eskiEtki.amount) !== Number(yeniEtki.amount) ||
      eskiEtki.unit !== yeniEtki.unit ||
      (eskiEtki.hesapId ?? null) !== (yeniEtki.hesapId ?? null);
    const yalnizTutar =
      eskiEtki.kind === yeniEtki.kind &&
      eskiEtki.frequency === 'ONCE' &&
      yeniEtki.frequency === 'ONCE' &&
      eskiEtki.unit === yeniEtki.unit &&
      eskiEtki.hesapId &&
      eskiEtki.hesapId === yeniEtki.hesapId;
    if (paraDegisti && yalnizTutar) {
      await hesabaFarkYansit(
        eskiEtki.hesapId as string,
        eskiEtki.kind,
        eskiEtki.unit,
        eskiEtki.amount,
        yeniEtki.amount,
        tx,
      );
    } else if (paraDegisti) {
      await yansimayiGeriAl(eskiEtki, tx);
      await hesabaYansit(yeniEtki, tx);
    }
    return tx.walletFlow.update({
      where: { id },
      data: {
        ...alanlar,
        hesapId: yeniEtki.frequency === 'ONCE' ? (yeniEtki.hesapId ?? null) : null,
        ...(date !== undefined ? { date: date && appDayToDate(date) } : {}),
      },
      select: { id: true },
    });
  });
}

/** Düzenli kalemi sonlandırır: geçmiş aylar raporda kalır, bu aydan itibaren sayılmaz. */
export async function sonlandirWalletFlow(
  id: string,
  client: Pick<Client, 'walletFlow'> = db,
  bugun: AppDay = appToday(),
) {
  return client.walletFlow.update({
    where: { id },
    data: { isActive: false, bitisGunu: appDayToDate(bugun) },
    select: { id: true },
  });
}

export async function yenidenBaslatWalletFlow(id: string, client: Pick<Client, 'walletFlow'> = db) {
  return client.walletFlow.update({
    where: { id },
    data: { isActive: true, bitisGunu: null },
    select: { id: true },
  });
}

/** Siler; hesaba yansımışsa geri alır. */
export async function deleteWalletFlow(id: string, client: Client = db) {
  return client.$transaction(async (tx) => {
    const k = await tx.walletFlow.findUnique({
      where: { id },
      select: { kind: true, frequency: true, amount: true, unit: true, hesapId: true },
    });
    if (k) {
      await yansimayiGeriAl(
        {
          kind: k.kind as WalletFlowKind,
          frequency: k.frequency as WalletFrequency,
          amount: para(k.amount),
          unit: k.unit as WalletUnit,
          hesapId: k.hesapId,
        },
        tx,
      );
    }
    return tx.walletFlow.delete({ where: { id }, select: { id: true } });
  });
}

/* ===========================================================================
 * TRANSFER (2026-11-01)
 * ======================================================================== */

export interface TransferDto {
  id: string;
  kaynak: string;
  hedef: string;
  unit: WalletUnit;
  amount: string;
  gun: AppDay;
  note: string | null;
}

export async function fetchSonTransferler(
  client: Pick<Client, 'walletTransfer' | 'walletAccount'> = db,
): Promise<TransferDto[]> {
  const satirlar = await client.walletTransfer.findMany({
    orderBy: [{ gun: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  });
  const hesaplar = await client.walletAccount.findMany({
    where: { id: { in: satirlar.flatMap((t) => [t.kaynakId, t.hedefId]) } },
    select: { id: true, name: true, unit: true },
  });
  const hesap = new Map(hesaplar.map((h) => [h.id, h]));
  return satirlar.map((t) => ({
    id: t.id,
    kaynak: hesap.get(t.kaynakId)?.name ?? 'Silinmiş hesap',
    hedef: hesap.get(t.hedefId)?.name ?? 'Silinmiş hesap',
    unit: (hesap.get(t.kaynakId)?.unit ?? 'TRY') as WalletUnit,
    amount: para(t.amount),
    gun: dateToAppDay(t.gun),
    note: t.note,
  }));
}

/** Formlarda seçilebilen hesaplar: arşivsiz, her birim. */
export async function fetchSecilebilirHesaplar(
  client: Pick<Client, 'walletAccount'> = db,
): Promise<{ id: string; name: string; unit: WalletUnit; balance: string }[]> {
  const satirlar = await client.walletAccount.findMany({
    where: { isArchived: false },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return satirlar.map((h) => ({
    id: h.id,
    name: h.name,
    unit: h.unit as WalletUnit,
    balance: para(h.balance),
  }));
}

/* ===========================================================================
 * TEKİL OKUMA — düzenleme ekranları
 * ======================================================================== */

export async function fetchWalletAccountById(
  id: string,
  client: Client = db,
): Promise<Omit<HesapDto, 'tl'> | null> {
  const h = await client.walletAccount.findUnique({ where: { id } });
  if (!h || h.isArchived) return null;
  return {
    id: h.id,
    name: h.name,
    kind: h.kind as WalletAccountKind,
    unit: h.unit as WalletUnit,
    balance: para(h.balance),
  };
}

export async function fetchWalletDebtById(
  id: string,
  client: Client = db,
  bugun: AppDay = appToday(),
): Promise<Omit<BorcDto, 'kalanTl' | 'taksitTl'> | null> {
  const b = await client.walletDebt.findUnique({ where: { id } });
  if (!b) return null;
  const remainingAmount = para(b.remainingAmount);
  const totalAmount = para(b.totalAmount);
  const monthlyPayment = b.monthlyPayment === null ? null : para(b.monthlyPayment);
  const endDate = b.endDate ? dateToAppDay(b.endDate) : null;
  return {
    id: b.id,
    name: b.name,
    lender: b.lender,
    unit: b.unit as WalletUnit,
    totalAmount,
    remainingAmount,
    monthlyPayment,
    paymentDay: b.paymentDay,
    endDate,
    note: b.note,
    isClosed: b.isClosed,
    odenenYuzde: odenenYuzde(totalAmount, remainingAmount),
    kalanAy: kalanAy(remainingAmount, monthlyPayment, endDate, bugun),
  };
}

export async function fetchWalletFlowById(
  id: string,
  client: Client = db,
): Promise<Omit<AkisDto, 'aylikTl'> | null> {
  const a = await client.walletFlow.findUnique({ where: { id } });
  if (!a) return null;
  return {
    id: a.id,
    kind: a.kind as WalletFlowKind,
    name: a.name,
    counterparty: a.counterparty,
    unit: a.unit as WalletUnit,
    amount: para(a.amount),
    frequency: a.frequency as WalletFrequency,
    day: a.day,
    date: a.date ? dateToAppDay(a.date) : null,
    category: a.category,
    note: a.note,
    isActive: a.isActive,
    hesapId: a.hesapId ?? null,
  };
}

/* ===========================================================================
 * AYLIK BÜTÇE (2026-10-31) — kategori başına limit
 * ======================================================================== */

export interface ButceSatiri {
  kategori: string;
  harcananTl: string;
  /** Limit yoksa `null` — yalnızca harcama gösterilir. */
  limitTl: string | null;
  /** Limitin yüzde kaçı harcandı; limit yoksa `null`. 100'ü geçebilir. */
  yuzde: number | null;
  /** Kalan (eksiyse aşım); limit yoksa `null`. */
  kalanTl: string | null;
}

/**
 * Bu ayın harcamaları + limitler → satırlar; en çok harcanan önce. Kategorisiz
 * harcama "Diğer". Kuru bilinmeyen kalem (`aylikTl` null) toplama GİRMEZ. SAF.
 */
export function butceOzeti(
  harcamalar: readonly Pick<AkisDto, 'category' | 'aylikTl'>[],
  limitler: readonly { kategori: string; limitTl: string }[],
): ButceSatiri[] {
  const gruplar = new Map<string, string[]>();
  for (const h of harcamalar) {
    if (h.aylikTl === null) continue;
    const k = h.category ?? 'Diğer';
    gruplar.set(k, [...(gruplar.get(k) ?? []), h.aylikTl]);
  }
  const limit = new Map(limitler.map((l) => [l.kategori, l.limitTl]));
  return [...new Set([...gruplar.keys(), ...limit.keys()])]
    .map((kategori): ButceSatiri => {
      const harcananTl = sumMoney(gruplar.get(kategori) ?? []);
      const limitTl = limit.get(kategori) ?? null;
      return {
        kategori,
        harcananTl,
        limitTl,
        yuzde:
          limitTl === null || Number(limitTl) === 0
            ? null
            : Math.round((Number(harcananTl) / Number(limitTl)) * 100),
        kalanTl: limitTl === null ? null : subtractMoney(limitTl, harcananTl),
      };
    })
    .sort((a, b) => Number(b.harcananTl) - Number(a.harcananTl));
}

export async function fetchButceLimitleri(
  client: Pick<typeof db, 'walletButce'> = db,
): Promise<{ kategori: string; limitTl: string }[]> {
  const satirlar = await client.walletButce.findMany({ orderBy: { kategori: 'asc' } });
  return satirlar.map((s) => ({ kategori: s.kategori, limitTl: para(s.limitTl) }));
}

/** Limiti koyar; `null` kaldırır. */
export async function butceKoy(
  kategori: string,
  limitTl: string | null,
  client: Pick<typeof db, 'walletButce'> = db,
): Promise<void> {
  if (limitTl === null) {
    await client.walletButce.deleteMany({ where: { kategori } });
    return;
  }
  await client.walletButce.upsert({
    where: { kategori },
    create: { kategori, limitTl },
    update: { limitTl },
  });
}

/** Kuyruktan gelen kaydın kabul edilen en eski yaşı (gün). */
const KUYRUK_EN_ESKI_GUN = 30;

/**
 * Çevrimdışı kuyruğundan gelen gün: gelecek ya da 30 günden eski olamaz (cihaz
 * saati yanlış olabilir) — öyleyse bugün. Gün yoksa bugün. SAF.
 */
export function kuyrukGunu(gun: AppDay | undefined, bugun: AppDay): AppDay {
  if (!gun || gun > bugun || gun < addAppDays(bugun, -KUYRUK_EN_ESKI_GUN)) return bugun;
  return gun;
}
