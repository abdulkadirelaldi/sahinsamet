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
import { aylikTutar, donemOdenen, fetchCuzdan, kalanTaksit } from './cuzdan';
import { fetchKurlar, tlKarsiligi, type KurDurumu } from './kur';

/**
 * AYLIK CÜZDAN RAPORU VE NET VARLIK GEÇMİŞİ (2026-11-01).
 *
 * GERÇEK: tek seferlik gelir/gider ve yapılan borç ödemeleri (tarihli).
 * TAHMİNİ: düzenli gelir/gider — geçmiş tutulmuyor, BUGÜNKÜ tutarla; kalem o ay
 * sonunda eklenmiş olmalı. Ekran bunu söyler.
 * Dövizli kalemler BUGÜNKÜ kurla (geçmiş kur yok). Kuru olmayan kalem toplama
 * girmez ve sayılır.
 * Sonlandırılan kalem bitiş ayından ÖNCEKİ aylarda sayılır; Cüzdan onu bitiş günü
 * bıraktığı için süren ayda iki ekran aynı sayıyı verir. Atlanan kalem o aya girmez.
 */

const para = (d: unknown): string => toMeasureString(d as never, 2) ?? '0.00';

/* ── NET VARLIK ────────────────────────────────────────────────────────── */

/** Bugünün satırını yazar; kursuz kalem varsa ya da cüzdan boşsa yazmaz. */
export async function netVarlikKaydet(
  client: Pick<typeof db, 'netVarlikKaydi'> = db,
  bugun: AppDay = appToday(),
  cuzdanOku: typeof fetchCuzdan = fetchCuzdan,
): Promise<boolean> {
  const { hesaplar, borclar, ozet } = await cuzdanOku();
  if (ozet.kursuzKalem > 0 || (hesaplar.length === 0 && borclar.length === 0)) return false;
  const veri = { varlikTl: ozet.varlikTl, borcTl: ozet.borcTl, netTl: ozet.netTl };
  await client.netVarlikKaydi.upsert({
    where: { gun: appDayToDate(bugun) },
    create: { gun: appDayToDate(bugun), ...veri },
    update: veri,
  });
  return true;
}

/* ── RAPOR ─────────────────────────────────────────────────────────────── */

export interface RaporAkisi {
  id: string;
  ad: string;
  kind: 'INCOME' | 'EXPENSE';
  frequency: 'MONTHLY' | 'WEEKLY' | 'YEARLY' | 'ONCE';
  unit: WalletUnit;
  amount: string;
  date: AppDay | null;
  category: string | null;
  /** Eklendiği gün. */
  olusturma: AppDay;
  /** Sonlandırıldığı gün. */
  bitis: AppDay | null;
}

export interface RaporOdemesi {
  debtId?: string;
  date: AppDay;
  amount: string;
  unit: WalletUnit;
}

export interface AyOzeti {
  ay: string;
  gelirTl: string;
  /** Tek seferlik, gerçek. */
  harcamaTl: string;
  /** Düzenli gelir bu toplama dahil, düzenli gider aşağıda: tahmini. */
  duzenliGiderTl: string;
  borcOdemeTl: string;
  /** Yalnızca süren ayda: bu ay daha ödenecek taksit. */
  kalanTaksitTl: string;
  kalanTl: string;
  kategoriler: { kategori: string; tl: string; yuzde: number }[];
  /** Ayın tek seferlik harcamaları, yeniden eskiye. */
  kalemler: { id: string; ad: string; gun: AppDay; kategori: string; tl: string }[];
}

const ayAdi = (gun: string) => gun.slice(0, 7);

/** Önceki ay `YYYY-MM`. SAF. */
export function oncekiAy(ay: string): string {
  const [y, m] = ay.split('-').map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** Tek ayın hesabı. Kuru olmayan kalem toplama girmez. SAF. */
export function ayOzeti(
  ay: string,
  akislar: readonly RaporAkisi[],
  odemeler: readonly RaporOdemesi[],
  kurlar: KurDurumu['kurlar'],
  ek: { atlanan?: ReadonlySet<string>; kalanTaksitTl?: string } = {},
): AyOzeti {
  const gelir: string[] = [];
  const harcama: string[] = [];
  const duzenliGider: string[] = [];
  const kategori = new Map<string, string[]>();
  const kalemler: AyOzeti['kalemler'] = [];

  for (const a of akislar) {
    if (a.frequency === 'ONCE') {
      if (!a.date || ayAdi(a.date) !== ay) continue;
      const tl = tlKarsiligi(a.amount, a.unit, kurlar, a.kind === 'INCOME' ? 'alis' : 'satis');
      if (tl === null) continue;
      if (a.kind === 'INCOME') gelir.push(tl);
      else {
        harcama.push(tl);
        const k = a.category ?? 'Diğer';
        kategori.set(k, [...(kategori.get(k) ?? []), tl]);
        kalemler.push({ id: a.id, ad: a.ad, gun: a.date, kategori: k, tl });
      }
    } else {
      // Düzenli kalem, o ay sona ermeden eklenmişse sayılır.
      if (ayAdi(a.olusturma) > ay) continue;
      if (a.bitis && ayAdi(a.bitis) <= ay) continue;
      if (ek.atlanan?.has(`${a.id}:${ay}`)) continue;
      const aylik = aylikTutar(a.amount, a.frequency);
      const tl =
        aylik && tlKarsiligi(aylik, a.unit, kurlar, a.kind === 'INCOME' ? 'alis' : 'satis');
      if (!tl) continue;
      (a.kind === 'INCOME' ? gelir : duzenliGider).push(tl);
    }
  }

  const borcOdeme = odemeler.flatMap((o) => {
    if (ayAdi(o.date) !== ay) return [];
    const tl = tlKarsiligi(o.amount, o.unit, kurlar, 'satis');
    return tl ? [tl] : [];
  });

  const harcamaTl = sumMoney(harcama);
  const toplam = Number(harcamaTl);
  const gelirTl = sumMoney(gelir);
  const duzenliGiderTl = sumMoney(duzenliGider);
  const borcOdemeTl = sumMoney(borcOdeme);
  const kalanTaksitTl = ek.kalanTaksitTl ?? '0.00';
  return {
    ay,
    gelirTl,
    harcamaTl,
    duzenliGiderTl,
    borcOdemeTl,
    kalanTaksitTl,
    kalanTl: subtractMoney(
      gelirTl,
      sumMoney([harcamaTl, duzenliGiderTl, borcOdemeTl, kalanTaksitTl]),
    ),
    kalemler: kalemler.sort((x, y) => y.gun.localeCompare(x.gun)),
    kategoriler: [...kategori.entries()]
      .map(([k, liste]) => {
        const tl = sumMoney(liste);
        return { kategori: k, tl, yuzde: toplam > 0 ? Math.round((Number(tl) / toplam) * 100) : 0 };
      })
      .sort((a, b) => Number(b.tl) - Number(a.tl)),
  };
}

/** Değişim yüzdesi; önceki 0 ise `null` (sonsuz artış anlamsız). SAF. */
export function degisimYuzdesi(simdi: string, onceki: string): number | null {
  const o = Number(onceki);
  return o === 0 ? null : Math.round(((Number(simdi) - o) / o) * 100);
}

export interface AylikRapor {
  ozet: AyOzeti;
  onceki: AyOzeti;
  /** Son 6 ay harcama, eskiden yeniye. */
  alti: { ay: string; harcamaTl: string }[];
  /** Net varlık geçmişi (son 1 yıl), eskiden yeniye. */
  netGecmis: { gun: AppDay; netTl: string }[];
  kurBayat: boolean;
}

export async function fetchAylikRapor(
  ay: string,
  client: Pick<
    typeof db,
    'walletFlow' | 'walletDebtPayment' | 'netVarlikKaydi' | 'walletOdeme' | 'walletDebt'
  > = db,
  kurDurumu?: KurDurumu,
  bugun: AppDay = appToday(),
): Promise<AylikRapor> {
  // Yalnızca ekranın baktığı aylar: seçilen ay, önceki ay ve 6 aylık grafik.
  const aylar = [ay];
  for (let i = 0; i < 5; i += 1) aylar.unshift(oncekiAy(aylar[0] as string));
  const pencereBas = appDayToDate(`${aylar[0]}-01` as AppDay);
  const buAyBas = appDayToDate(`${bugun.slice(0, 7)}-01` as AppDay);

  const [akisSatir, odemeSatir, netSatir, atlananSatir, borcSatir, kur] = await Promise.all([
    client.walletFlow.findMany({
      where: {
        AND: [
          { OR: [{ isActive: true }, { bitisGunu: { not: null } }] },
          { OR: [{ frequency: { not: 'ONCE' } }, { date: { gte: pencereBas } }] },
        ],
      },
      select: {
        id: true,
        name: true,
        bitisGunu: true,
        kind: true,
        frequency: true,
        unit: true,
        amount: true,
        date: true,
        category: true,
        createdAt: true,
      },
    }),
    client.walletDebtPayment.findMany({
      // Bir hafta geriden: ay sonunda erken ödenen taksit bu dönemi kapatır (`donemOdenen`).
      where: {
        date: {
          gte:
            pencereBas < buAyBas
              ? pencereBas
              : appDayToDate(addAppDays(bugun.slice(0, 7).concat('-01') as AppDay, -7)),
        },
      },
      select: {
        debtId: true,
        date: true,
        amount: true,
        note: true,
        debt: { select: { unit: true } },
      },
    }),
    client.netVarlikKaydi.findMany({
      where: { gun: { gte: appDayToDate(addAppDays(bugun, -365)) } },
      orderBy: { gun: 'asc' },
    }),
    client.walletOdeme.findMany({
      where: { OR: [{ durum: 'ATLANDI' }, { durum: 'ODENDI', donem: bugun.slice(0, 7) }] },
      select: { kaynakTur: true, kaynakId: true, donem: true, durum: true, tutar: true },
    }),
    client.walletDebt.findMany({
      where: { isClosed: false },
      select: {
        id: true,
        unit: true,
        monthlyPayment: true,
        remainingAmount: true,
        paymentDay: true,
      },
    }),
    kurDurumu ? Promise.resolve(kurDurumu) : fetchKurlar(),
  ]);

  const akislar: RaporAkisi[] = akisSatir.map((a) => ({
    id: a.id,
    ad: a.name,
    bitis: a.bitisGunu ? dateToAppDay(a.bitisGunu) : null,
    kind: a.kind as RaporAkisi['kind'],
    frequency: a.frequency as RaporAkisi['frequency'],
    unit: a.unit as WalletUnit,
    amount: para(a.amount),
    date: a.date ? dateToAppDay(a.date) : null,
    category: a.category,
    olusturma: appToday(a.createdAt),
  }));
  const odemeler: RaporOdemesi[] = odemeSatir.map((o) => ({
    debtId: o.debtId,
    date: dateToAppDay(o.date),
    amount: para(o.amount),
    unit: o.debt.unit as WalletUnit,
  }));

  const atlanan = new Set(
    atlananSatir
      .filter((o) => o.kaynakTur === 'AKIS' && o.durum === 'ATLANDI')
      .map((o) => `${o.kaynakId}:${o.donem}`),
  );
  const buAy = bugun.slice(0, 7);
  const atlananBorc = new Set(
    atlananSatir
      .filter((o) => o.kaynakTur === 'BORC' && o.donem === buAy && o.durum === 'ATLANDI')
      .map((o) => o.kaynakId),
  );
  const kalanTaksitTl = sumMoney(
    borcSatir.flatMap((b) => {
      const odenen = donemOdenen(
        b,
        odemeSatir.map((o) => ({
          debtId: o.debtId,
          date: dateToAppDay(o.date),
          amount: para(o.amount),
          note: o.note,
        })),
        atlananSatir
          .filter((o) => o.donem === buAy)
          .map((o) => ({
            kaynakTur: o.kaynakTur,
            kaynakId: o.kaynakId,
            durum: o.durum,
            tutar: o.tutar ? para(o.tutar) : null,
          })),
        buAy,
      );
      const kalan = kalanTaksit(
        b.monthlyPayment === null ? null : para(b.monthlyPayment),
        para(b.remainingAmount),
        odenen,
        atlananBorc.has(b.id),
      );
      const tl = tlKarsiligi(kalan, b.unit as WalletUnit, kur.kurlar, 'satis');
      return tl ? [tl] : [];
    }),
  );
  const hesap = (a: string) =>
    ayOzeti(a, akislar, odemeler, kur.kurlar, {
      atlanan,
      ...(a === buAy ? { kalanTaksitTl } : {}),
    });

  return {
    ozet: hesap(ay),
    onceki: hesap(oncekiAy(ay)),
    alti: aylar.map((a) => ({ ay: a, harcamaTl: hesap(a).harcamaTl })),
    netGecmis: netSatir.map((n) => ({ gun: dateToAppDay(n.gun), netTl: para(n.netTl) })),
    kurBayat: kur.bayat,
  };
}
