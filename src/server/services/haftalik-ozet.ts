import { db } from '@/server/db';
import type { WalletUnit } from '@/types';

import {
  addAppDays,
  appDayToDate,
  appToday,
  dateToAppDay,
  startOfAppWeek,
  subtractMoney,
  sumMoney,
  toMeasureString,
  type AppDay,
} from './_shared';
import { fetchHabitWeek, gunOranlari, haftaYuzdesi } from './habit';
import { fetchKurlar, tlKarsiligi, type KurDurumu } from './kur';

/**
 * HAFTALIK ÖZET (2026-11-01) — alışkanlık, spor, harcama, kilo tek ekranda.
 *
 * Harcama yalnızca TARİHLİ tek seferlik giderlerdir; düzenli ödemelerin haftası
 * yok. Dövizli kalem bugünkü kurla, kuru olmayan girmez.
 * Alışkanlık oranı YALNIZCA GEÇEN GÜNLERDEN: çarşamba bakınca perşembe-pazar
 * "yapılmadı" sayılıp oranı düşürmemeli.
 */

export interface HaftalikOzet {
  bas: AppDay;
  son: AppDay;
  aliskanlik: { yuzde: number | null; oncekiYuzde: number | null; gunler: number[]; adet: number };
  spor: { antrenman: number; hacimKg: number; oncekiHacimKg: number };
  harcama: { tl: string; oncekiTl: string };
  kilo: { son: string | null; fark: string | null };
}

/** Bildirim gövdesi; hiç veri yoksa `null` (boş özet gönderilmez). SAF. */
export function ozetMetni(o: HaftalikOzet): string | null {
  const parcalar: string[] = [];
  if (o.aliskanlik.yuzde !== null) parcalar.push(`Alışkanlık %${o.aliskanlik.yuzde}`);
  if (o.spor.antrenman > 0) parcalar.push(`${o.spor.antrenman} antrenman`);
  if (Number(o.harcama.tl) > 0) {
    parcalar.push(`${Math.round(Number(o.harcama.tl)).toLocaleString('tr-TR')} ₺ harcama`);
  }
  if (o.kilo.son) parcalar.push(`${String(Number(o.kilo.son)).replace('.', ',')} kg`);
  return parcalar.length > 0 ? parcalar.join(' · ') : null;
}

type Client = Pick<typeof db, 'workout' | 'walletFlow' | 'healthLog'>;

const kg = (d: unknown) => Number(toMeasureString(d as never, 2) ?? 0);

export async function fetchHaftalikOzet(
  gun: AppDay,
  client: Client = db,
  bugun: AppDay = appToday(),
  kurDurumu?: KurDurumu,
  aliskanlikOku: typeof fetchHabitWeek = fetchHabitWeek,
): Promise<HaftalikOzet> {
  const bas = startOfAppWeek(gun);
  const son = addAppDays(bas, 6);
  const oncekiBas = addAppDays(bas, -7);
  const aralik = { gte: appDayToDate(oncekiBas), lte: appDayToDate(son) };

  const [hafta, oncekiHafta, antrenmanlar, giderler, tartilar, kur] = await Promise.all([
    aliskanlikOku(bas, undefined, bugun, { seri: false }),
    aliskanlikOku(oncekiBas, undefined, bugun, { seri: false }),
    client.workout.findMany({
      where: { date: aralik },
      select: { date: true, sets: { select: { reps: true, weightKg: true } } },
    }),
    client.walletFlow.findMany({
      where: { kind: 'EXPENSE', frequency: 'ONCE', isActive: true, date: aralik },
      select: { date: true, amount: true, unit: true },
    }),
    client.healthLog.findMany({
      where: { date: aralik, weightKg: { not: null } },
      select: { date: true, weightKg: true },
      orderBy: { date: 'asc' },
    }),
    kurDurumu ? Promise.resolve(kurDurumu) : fetchKurlar(),
  ]);

  const buHaftada = (d: Date | null) => d !== null && dateToAppDay(d) >= bas;

  const hacim = (liste: typeof antrenmanlar) =>
    Math.round(
      liste.reduce((t, a) => t + a.sets.reduce((st, s) => st + s.reps * kg(s.weightKg), 0), 0),
    );
  const buAntrenman = antrenmanlar.filter((a) => buHaftada(a.date));

  const giderToplam = (liste: typeof giderler) =>
    sumMoney(
      liste.flatMap((g) => {
        const tl = tlKarsiligi(
          toMeasureString(g.amount, 2) ?? '0.00',
          g.unit as WalletUnit,
          kur.kurlar,
          'satis',
        );
        return tl ? [tl] : [];
      }),
    );

  const buTarti = tartilar.filter((t) => buHaftada(t.date));
  const oncekiTarti = tartilar.filter((t) => !buHaftada(t.date));
  const sonTarti = toMeasureString(buTarti.at(-1)?.weightKg ?? null, 2);
  const oncekiSon = toMeasureString(oncekiTarti.at(-1)?.weightKg ?? null, 2);

  return {
    bas,
    son,
    aliskanlik: {
      yuzde: haftaYuzdesi(hafta, bugun),
      oncekiYuzde: haftaYuzdesi(oncekiHafta, bugun),
      gunler: gunOranlari(hafta),
      adet: hafta.habits.length,
    },
    spor: {
      antrenman: buAntrenman.length,
      hacimKg: hacim(buAntrenman),
      oncekiHacimKg: hacim(antrenmanlar.filter((a) => !buHaftada(a.date))),
    },
    harcama: {
      tl: giderToplam(giderler.filter((g) => buHaftada(g.date))),
      oncekiTl: giderToplam(giderler.filter((g) => !buHaftada(g.date))),
    },
    kilo: {
      son: sonTarti,
      fark: sonTarti && oncekiSon ? subtractMoney(sonTarti, oncekiSon) : null,
    },
  };
}
