import type { OdemeGeriAlInput, OdemeIsleInput } from '@/lib/schemas/wallet';
import { db } from '@/server/db';
import type { WalletUnit } from '@/types';

import {
  addAppDays,
  appDayToDate,
  appToday,
  dateToAppDay,
  subtractMoney,
  sumMoney,
  toMeasureString,
  type AppDay,
} from './_shared';
import {
  borcaGeriEkle,
  borcOdemesiYaz,
  borcuKilitle,
  hesabaIade,
  hesaptanDus,
  gunFarki,
  odemeDonemi,
  OdemeHatasi,
  ONAY_NOTU,
  vade,
} from './cuzdan';

export { OdemeHatasi };

/**
 * AYLIK ÖDEME ONAYI (2026-11-01) — günü gelen taksit ve gider için "ödendi mi?".
 *
 * Kapsam: borç taksitleri ve AYLIK giderler. Haftalık/yıllık gider ve gelir yok.
 * Bu ay ve geçen ay gecikenler, 7 gün içinde günü gelenler listelenir. Geçen ay
 * `ILK_DONEM`den eskiye bakılmaz: özellikten önceki aylar onaylanmadı diye gecikmiş sayılmaz.
 *
 * GÜVENCE: tutar istemciden ALINMAZ, kaynaktan okunur. (tür, kaynak, dönem) eşsiz:
 * aynı ödeme iki kez işlenemez. Kayıt, hesaptan düşme ve borçtan düşme TEK işlem.
 * Hesapta yetmezse reddedilir: eksi bakiye altın/döviz kur hesabını bozar.
 * Son taksitte tutar kalan borcu geçmez. İşlenen kayıt `odemeGeriAl` ile geri alınır.
 */

const PENCERE_GUN = 7;
const ILK_DONEM = '2026-11';

export interface BekleyenOdeme {
  kaynakTur: 'BORC' | 'AKIS';
  kaynakId: string;
  ad: string;
  tutar: string;
  unit: WalletUnit;
  donem: string;
  /** Vadeye kalan gün; negatifse gecikmiş. */
  kala: number;
}

interface Kaynak {
  kaynakTur: 'BORC' | 'AKIS';
  kaynakId: string;
  ad: string;
  tutar: string;
  unit: WalletUnit;
  gun: number;
  /** Kaynağın eklendiği gün: öncesindeki vade "gecikmiş" sayılmaz. */
  olusturma?: AppDay;
}

/** `[geçen ay, bu ay, gelecek ay]`. SAF. */
function donemler(bugun: AppDay): [string, string, string] {
  const buAy = bugun.slice(0, 7);
  return [
    addAppDays(`${buAy}-01` as AppDay, -1).slice(0, 7),
    buAy,
    addAppDays(vade(buAy, 31), 1).slice(0, 7),
  ];
}

/** Taksit kalan borcu geçmez. SAF. */
function taksitTutari(aylik: string, kalan: string): string {
  return Number(kalan) < Number(aylik) ? kalan : aylik;
}

/** Listelenecekler: işlenmemiş, gecikmiş ya da pencere içinde; en acil önce. SAF. */
export function bekleyenleriSec(
  kaynaklar: readonly Kaynak[],
  islenen: ReadonlySet<string>,
  bugun: AppDay,
): BekleyenOdeme[] {
  const [gecenAy, buAy, gelecekAy] = donemler(bugun);
  const taranan = [...(gecenAy >= ILK_DONEM ? [gecenAy] : []), buAy, gelecekAy];
  const sonuc: BekleyenOdeme[] = [];
  for (const k of kaynaklar) {
    for (const donem of taranan) {
      if (islenen.has(`${k.kaynakTur}:${k.kaynakId}:${donem}`)) continue;
      const vadeGunu = vade(donem, k.gun);
      if (k.olusturma && vadeGunu < k.olusturma) continue;
      const kala = gunFarki(vadeGunu, bugun);
      if (kala > PENCERE_GUN) continue;
      sonuc.push({
        kaynakTur: k.kaynakTur,
        kaynakId: k.kaynakId,
        ad: k.ad,
        tutar: k.tutar,
        unit: k.unit,
        donem,
        kala,
      });
    }
  }
  return sonuc.sort((a, b) => a.kala - b.kala);
}

/** Dönemin ilk gününden bir hafta önce: ay sonunda erken ödenen taksit de okunur. */
const addAppDaysOnce = (donem: string) => appDayToDate(addAppDays(`${donem}-01` as AppDay, -7));

const para = (d: unknown): string => toMeasureString(d as never, 2) ?? '0.00';

type Client = typeof db;

/**
 * İşlenmiş kayıtlar + taksiti karşılayan elle ödemeler → `TUR:id:YYYY-MM`. Ay içindeki
 * elle ödemeler toplanır: 100 ₺'lik ara ödeme 1.000 ₺'lik taksiti kapatmaz.
 */
async function islenenKumesi(
  client: Pick<Client, 'walletOdeme' | 'walletDebtPayment'>,
  bugun: AppDay,
): Promise<Set<string>> {
  const taranan = donemler(bugun);
  const [kayitlar, elle] = await Promise.all([
    client.walletOdeme.findMany({
      where: { donem: { in: taranan } },
      select: { kaynakTur: true, kaynakId: true, donem: true },
    }),
    client.walletDebtPayment.findMany({
      where: { date: { gte: addAppDaysOnce(taranan[0]) } },
      select: {
        debtId: true,
        date: true,
        amount: true,
        note: true,
        debt: { select: { monthlyPayment: true, paymentDay: true } },
      },
    }),
  ]);
  const ayToplami = new Map<string, { toplam: string; taksit: string }>();
  for (const o of elle) {
    // Onay ödemesini tarihten döneme çevirmek yanlış: 25 Kasım'da kapanan 1 Kasım taksiti
    // en yakın vade sayılan Aralık'a yazılıyor, Aralık taksiti listeden kayboluyordu.
    if (o.note === ONAY_NOTU) continue;
    const anahtar = `BORC:${o.debtId}:${odemeDonemi(dateToAppDay(o.date), o.debt.paymentDay)}`;
    ayToplami.set(anahtar, {
      toplam: sumMoney([ayToplami.get(anahtar)?.toplam ?? '0.00', para(o.amount)]),
      taksit: para(o.debt.monthlyPayment),
    });
  }
  return new Set([
    ...kayitlar.map((k) => `${k.kaynakTur}:${k.kaynakId}:${k.donem}`),
    ...[...ayToplami]
      .filter(([, a]) => !subtractMoney(a.toplam, a.taksit).startsWith('-'))
      .map(([anahtar]) => anahtar),
  ]);
}

export async function fetchBekleyenOdemeler(
  client: Pick<Client, 'walletDebt' | 'walletFlow' | 'walletOdeme' | 'walletDebtPayment'> = db,
  bugun: AppDay = appToday(),
): Promise<BekleyenOdeme[]> {
  const [borclar, giderler, islenen] = await Promise.all([
    client.walletDebt.findMany({
      where: { isClosed: false, paymentDay: { not: null }, monthlyPayment: { not: null } },
      select: {
        id: true,
        name: true,
        unit: true,
        monthlyPayment: true,
        remainingAmount: true,
        paymentDay: true,
        createdAt: true,
      },
    }),
    client.walletFlow.findMany({
      where: { isActive: true, kind: 'EXPENSE', frequency: 'MONTHLY', day: { not: null } },
      select: { id: true, name: true, unit: true, amount: true, day: true, createdAt: true },
    }),
    islenenKumesi(client, bugun),
  ]);
  return bekleyenleriSec(
    [
      ...borclar.map((b): Kaynak => ({
        kaynakTur: 'BORC',
        kaynakId: b.id,
        ad: b.name,
        tutar: taksitTutari(para(b.monthlyPayment), para(b.remainingAmount)),
        unit: b.unit as WalletUnit,
        gun: b.paymentDay ?? 1,
        olusturma: appToday(b.createdAt),
      })),
      ...giderler.map((g): Kaynak => ({
        kaynakTur: 'AKIS',
        kaynakId: g.id,
        ad: g.name,
        tutar: para(g.amount),
        unit: g.unit as WalletUnit,
        gun: g.day ?? 1,
        olusturma: appToday(g.createdAt),
      })),
    ],
    islenen,
    bugun,
  );
}

/** Bildirim planı için: işlenmiş taksitler `borçId:YYYY-MM`. */
export async function fetchIslenenBorclar(
  client: Pick<Client, 'walletOdeme' | 'walletDebtPayment'> = db,
  bugun: AppDay = appToday(),
): Promise<Set<string>> {
  const kume = await islenenKumesi(client, bugun);
  return new Set(
    [...kume].filter((k) => k.startsWith('BORC:')).map((k) => k.slice('BORC:'.length)),
  );
}

/** Bildirim planı için: işlenmiş giderler `akışId:YYYY-MM`. */
export async function fetchIslenenGiderler(
  client: Pick<Client, 'walletOdeme' | 'walletDebtPayment'> = db,
  bugun: AppDay = appToday(),
): Promise<Set<string>> {
  const kume = await islenenKumesi(client, bugun);
  return new Set(
    [...kume].filter((k) => k.startsWith('AKIS:')).map((k) => k.slice('AKIS:'.length)),
  );
}

export async function odemeIsle(
  girdi: OdemeIsleInput,
  client: Pick<Client, '$transaction'> = db,
  bugun: AppDay = appToday(),
): Promise<{ yeni: boolean }> {
  try {
    await client.$transaction(async (tx) => {
      // Okumadan önce kilit: iki dönemi aynı anda onaylamak kalan borcu iki kez düşmesin.
      if (girdi.kaynakTur === 'BORC') await borcuKilitle(girdi.kaynakId, tx);
      const kaynak =
        girdi.kaynakTur === 'BORC'
          ? await tx.walletDebt.findUnique({
              where: { id: girdi.kaynakId },
              select: { unit: true, monthlyPayment: true, remainingAmount: true, isClosed: true },
            })
          : await tx.walletFlow.findUnique({
              where: { id: girdi.kaynakId },
              select: { unit: true, amount: true },
            });
      if (!kaynak) throw new OdemeHatasi('Kayıt bulunamadı.');
      const tutar =
        'monthlyPayment' in kaynak
          ? taksitTutari(para(kaynak.monthlyPayment), para(kaynak.remainingAmount))
          : para(kaynak.amount);
      const odendi = girdi.durum === 'ODENDI';
      if (odendi && 'isClosed' in kaynak && kaynak.isClosed) {
        throw new OdemeHatasi('Bu borç kapanmış.');
      }

      await tx.walletOdeme.create({
        data: {
          kaynakTur: girdi.kaynakTur,
          kaynakId: girdi.kaynakId,
          donem: girdi.donem,
          durum: girdi.durum,
          hesapId: odendi ? (girdi.hesapId ?? null) : null,
          tutar: odendi ? tutar : null,
          gun: appDayToDate(bugun),
        },
      });
      if (!odendi) return;

      if (girdi.hesapId) await hesaptanDus(girdi.hesapId, kaynak.unit as WalletUnit, tutar, tx);
      if (girdi.kaynakTur === 'BORC') {
        await borcOdemesiYaz(
          {
            debtId: girdi.kaynakId,
            date: bugun,
            amount: tutar,
            note: ONAY_NOTU,
            ...(girdi.hesapId ? { hesapId: girdi.hesapId } : {}),
          },
          tx,
        );
      }
    });
    return { yeni: true };
  } catch (error) {
    // Aynı dönem zaten işlenmiş: hata değil, ikinci dokunuş etkisiz.
    if ((error as { code?: unknown }).code === 'P2002') return { yeni: false };
    throw error;
  }
}

export interface IslenenOdeme {
  kaynakTur: 'BORC' | 'AKIS';
  kaynakId: string;
  donem: string;
  ad: string;
  durum: 'ODENDI' | 'ATLANDI';
  tutar: string | null;
  unit: WalletUnit;
}

/** Geri alınabilir kayıtlar: geçen ay, bu ay ve gelecek ay. Kaynağı silinmiş olan listelenmez. */
export async function fetchIslenenOdemeler(
  client: Pick<Client, 'walletDebt' | 'walletFlow' | 'walletOdeme'> = db,
  bugun: AppDay = appToday(),
): Promise<IslenenOdeme[]> {
  const kayitlar = await client.walletOdeme.findMany({
    where: { donem: { in: donemler(bugun) } },
    orderBy: { createdAt: 'desc' },
  });
  const idler = kayitlar.map((k) => k.kaynakId);
  const [borclar, akislar] = await Promise.all([
    client.walletDebt.findMany({
      where: { id: { in: idler } },
      select: { id: true, name: true, unit: true },
    }),
    client.walletFlow.findMany({
      where: { id: { in: idler } },
      select: { id: true, name: true, unit: true },
    }),
  ]);
  const kaynaklar = new Map([...borclar, ...akislar].map((k) => [k.id, k]));
  return kayitlar.flatMap((k) => {
    const kaynak = kaynaklar.get(k.kaynakId);
    if (!kaynak) return [];
    return [
      {
        kaynakTur: k.kaynakTur as IslenenOdeme['kaynakTur'],
        kaynakId: k.kaynakId,
        donem: k.donem,
        ad: kaynak.name,
        durum: k.durum as IslenenOdeme['durum'],
        tutar: toMeasureString(k.tutar, 2),
        unit: kaynak.unit as WalletUnit,
      },
    ];
  });
}

/** İşlenen ödemeyi TEK işlemde geri alır: hesap, borç ve kayıt eski hâline döner. */
export async function odemeGeriAl(
  girdi: OdemeGeriAlInput,
  client: Pick<Client, '$transaction'> = db,
): Promise<{ geriAlindi: boolean }> {
  return client.$transaction(async (tx) => {
    const anahtar = {
      kaynakTur: girdi.kaynakTur,
      kaynakId: girdi.kaynakId,
      donem: girdi.donem,
    };
    const kayit = await tx.walletOdeme.findUnique({
      where: { kaynakTur_kaynakId_donem: anahtar },
    });
    if (!kayit) return { geriAlindi: false };

    const tutar = toMeasureString(kayit.tutar, 2);
    if (kayit.durum === 'ODENDI' && tutar) {
      // Kilit sırası her yolda borç, sonra hesap: karşılıklı beklemede kalınmasın.
      if (kayit.kaynakTur === 'BORC') {
        await borcOdemesiniGeriAl(kayit.kaynakId, kayit.gun, tutar, tx);
      }
      if (kayit.hesapId) await hesabaIade(kayit.hesapId, tutar, tx);
    }
    await tx.walletOdeme.delete({ where: { kaynakTur_kaynakId_donem: anahtar } });
    return { geriAlindi: true };
  });
}

async function borcOdemesiniGeriAl(
  debtId: string,
  gun: Date,
  tutar: string,
  tx: Pick<Client, 'walletDebt' | 'walletDebtPayment' | '$queryRaw'>,
): Promise<void> {
  const odeme = await tx.walletDebtPayment.findFirst({
    where: { debtId, date: gun, amount: tutar, note: ONAY_NOTU },
    select: { id: true },
  });
  if (odeme) await tx.walletDebtPayment.delete({ where: { id: odeme.id } });
  await borcaGeriEkle(debtId, tutar, tx);
}
