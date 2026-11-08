import { db } from '@/server/db';

import {
  addAppDays,
  appDayToDate,
  appMonthRange,
  appToday,
  dateToAppDay,
  startOfAppWeek,
  subtractMoney,
  toMeasureString,
  type AppDay,
} from './_shared';
import { fetchAylikRapor, oncekiAy, type AyOzeti } from './cuzdan-rapor';
import { fetchHabitWeek, gunSayilari, isDayComplete } from './habit';

/**
 * AYLIK ÖZET (2026-11-05) — bir ayda ne harcandı, ne yapıldı; her ayın 1'inde bildirim.
 *
 * Para Cüzdan'ın aylık raporundan gelir (`fetchAylikRapor`): aynı sayılar, aynı tahmin notu.
 * Alışkanlık ayın kenarındaki haftalardan YALNIZCA ayın günleriyle hesaplanır; süren ayda
 * gelecek günler oranı düşürmez (`gunSayilari`). Sağlık ortalamaları yalnızca kayıt olan
 * günlerden: hiç girilmeyen gün "0 adım" sayılmaz.
 */

export const AYLAR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

/** `2026-10` → `Ekim 2026`. SAF. */
export function ayMetni(ay: string): string {
  return `${AYLAR[Number(ay.slice(5)) - 1]} ${ay.slice(0, 4)}`;
}

/** Ayın ilk ve son günü. SAF. */
export function ayAraligi(ay: string): { bas: AppDay; son: AppDay } {
  const { from, to } = appMonthRange(Number(ay.slice(0, 4)), Number(ay.slice(5)));
  return { bas: from, son: to };
}

export interface AylikOzet {
  ay: string;
  para: Pick<
    AyOzeti,
    'gelirTl' | 'harcamaTl' | 'duzenliGiderTl' | 'borcOdemeTl' | 'kalanTl' | 'kategoriler'
  > & { oncekiHarcamaTl: string; kurBayat: boolean };
  aliskanlik: {
    yuzde: number | null;
    oncekiYuzde: number | null;
    /** Ayda en çok tamamlanan alışkanlıklar, çoktan aza. */
    enCok: { ad: string; gun: number }[];
  };
  spor: { antrenman: number; oncekiAntrenman: number; hacimKg: number; oncekiHacimKg: number };
  saglik: {
    kiloBas: string | null;
    kiloSon: string | null;
    kiloFark: string | null;
    ortUyku: number | null;
    ortAdim: number | null;
    ortSuMl: number | null;
  };
}

/** Bildirim gövdesi; hiç veri yoksa `null` (boş özet gönderilmez). SAF. */
export function aylikMetni(o: AylikOzet): string | null {
  const parcalar: string[] = [];
  if (Number(o.para.harcamaTl) > 0) {
    parcalar.push(`${Math.round(Number(o.para.harcamaTl)).toLocaleString('tr-TR')} ₺ harcama`);
  }
  if (o.aliskanlik.yuzde !== null) parcalar.push(`Alışkanlık %${o.aliskanlik.yuzde}`);
  if (o.spor.antrenman > 0) parcalar.push(`${o.spor.antrenman} antrenman`);
  if (o.saglik.kiloFark !== null) {
    const fark = Number(o.saglik.kiloFark);
    parcalar.push(`${fark > 0 ? '+' : ''}${String(fark).replace('.', ',')} kg`);
  }
  return parcalar.length > 0 ? parcalar.join(' · ') : null;
}

type Client = Pick<typeof db, 'workout' | 'healthLog'>;

const kg = (d: unknown) => Number(toMeasureString(d as never, 2) ?? 0);
const ortalama = (liste: number[]) =>
  liste.length === 0 ? null : liste.reduce((t, n) => t + n, 0) / liste.length;

/** Ayı kesen haftaların pazartesileri. SAF. */
function haftalar(bas: AppDay, son: AppDay): AppDay[] {
  const sonuc: AppDay[] = [];
  for (let g = startOfAppWeek(bas); g <= son; g = addAppDays(g, 7)) sonuc.push(g);
  return sonuc;
}

async function aliskanlikAyi(
  ay: string,
  bugun: AppDay,
  aliskanlikOku: typeof fetchHabitWeek,
): Promise<{ yuzde: number | null; enCok: { ad: string; gun: number }[] }> {
  const aralik = ayAraligi(ay);
  const listesi = await Promise.all(
    haftalar(aralik.bas, aralik.son).map((h) =>
      aliskanlikOku(h, undefined, bugun, { seri: false }),
    ),
  );
  let gerekli = 0;
  let tamam = 0;
  const gunler = new Map<string, { ad: string; gun: number }>();
  for (const hafta of listesi) {
    const s = gunSayilari(hafta, bugun, aralik);
    gerekli += s.gerekli;
    tamam += s.tamam;
    for (const h of hafta.habits) {
      const kayit = gunler.get(h.id) ?? { ad: h.name, gun: 0 };
      hafta.days.forEach((gun, i) => {
        if (gun < aralik.bas || gun > aralik.son || gun > bugun) return;
        if (isDayComplete(h.counts[i] ?? 0, h.targetPerDay)) kayit.gun += 1;
      });
      gunler.set(h.id, kayit);
    }
  }
  return {
    yuzde: gerekli === 0 ? null : Math.round((tamam / gerekli) * 100),
    enCok: [...gunler.values()]
      .filter((g) => g.gun > 0)
      .sort((a, b) => b.gun - a.gun)
      .slice(0, 5),
  };
}

export async function fetchAylikOzet(
  ay: string,
  client: Client = db,
  bugun: AppDay = appToday(),
  raporOku: (ay: string) => ReturnType<typeof fetchAylikRapor> = fetchAylikRapor,
  aliskanlikOku: typeof fetchHabitWeek = fetchHabitWeek,
): Promise<AylikOzet> {
  const { bas, son } = ayAraligi(ay);
  const onceki = oncekiAy(ay);
  const oncekiBas = ayAraligi(onceki).bas;
  const pencere = { gte: appDayToDate(oncekiBas), lte: appDayToDate(son) };

  const [rapor, buAy, gecenAy, antrenmanlar, saglik] = await Promise.all([
    raporOku(ay),
    aliskanlikAyi(ay, bugun, aliskanlikOku),
    aliskanlikAyi(onceki, bugun, aliskanlikOku),
    client.workout.findMany({
      where: { date: pencere },
      select: { date: true, sets: { select: { reps: true, weightKg: true } } },
    }),
    client.healthLog.findMany({
      where: { date: { gte: appDayToDate(bas), lte: appDayToDate(son) } },
      select: { date: true, weightKg: true, sleepHours: true, steps: true, waterMl: true },
      orderBy: { date: 'asc' },
    }),
  ]);

  const buAydaMi = (d: Date | null) => d !== null && dateToAppDay(d) >= bas;
  const hacim = (liste: typeof antrenmanlar) =>
    Math.round(
      liste.reduce((t, a) => t + a.sets.reduce((st, s) => st + s.reps * kg(s.weightKg), 0), 0),
    );
  const buAntrenman = antrenmanlar.filter((a) => buAydaMi(a.date));
  const gecenAntrenman = antrenmanlar.filter((a) => !buAydaMi(a.date));

  const tartilar = saglik.filter((s) => s.weightKg !== null);
  const kiloBas = toMeasureString(tartilar[0]?.weightKg ?? null, 2);
  const kiloSon = toMeasureString(tartilar.at(-1)?.weightKg ?? null, 2);
  const uyku = ortalama(saglik.flatMap((s) => (s.sleepHours === null ? [] : [kg(s.sleepHours)])));
  const adim = ortalama(saglik.flatMap((s) => (s.steps ? [s.steps] : [])));
  const su = ortalama(saglik.flatMap((s) => (s.waterMl ? [s.waterMl] : [])));

  const { ozet } = rapor;
  return {
    ay,
    para: {
      gelirTl: ozet.gelirTl,
      harcamaTl: ozet.harcamaTl,
      duzenliGiderTl: ozet.duzenliGiderTl,
      borcOdemeTl: ozet.borcOdemeTl,
      kalanTl: ozet.kalanTl,
      kategoriler: ozet.kategoriler.slice(0, 5),
      oncekiHarcamaTl: rapor.onceki.harcamaTl,
      kurBayat: rapor.kurBayat,
    },
    aliskanlik: { yuzde: buAy.yuzde, oncekiYuzde: gecenAy.yuzde, enCok: buAy.enCok },
    spor: {
      antrenman: buAntrenman.length,
      oncekiAntrenman: gecenAntrenman.length,
      hacimKg: hacim(buAntrenman),
      oncekiHacimKg: hacim(gecenAntrenman),
    },
    saglik: {
      kiloBas,
      kiloSon,
      // Tek tartıda değişim yok.
      kiloFark: kiloBas && kiloSon && tartilar.length > 1 ? subtractMoney(kiloSon, kiloBas) : null,
      ortUyku: uyku === null ? null : Math.round(uyku * 10) / 10,
      ortAdim: adim === null ? null : Math.round(adim),
      ortSuMl: su === null ? null : Math.round(su),
    },
  };
}
