import type { MoveHabitInput } from '@/lib/schemas';
import { db } from '@/server/db';

import { SU_HEDEFI_ML } from '@/lib/hedefler';

import {
  addAppDays,
  appDayToDate,
  appToday,
  dateToAppDay,
  differenceInAppDays,
  startOfAppWeek,
  type AppDay,
} from './_shared';
import { gunGerekliMi, isDayComplete } from './habit';

/**
 * HAYAT · GÜNLÜK LİSTE VE RAPOR (2026-10-29).
 *
 * Sahibi alışkanlıklarını her gün SIRAYLA işaretliyor: yaptım ya da yapmadım.
 * Bu dosya o akışın okumalarını taşıyor:
 *
 *   - `fetchHabitDay`    — tek günün listesi + özet ("bugün 2 şeyi yapmadın")
 *   - `fetchHabitReport` — son N günün alışkanlık bazında dökümü
 *
 * Dört durum, karıştırılmadan (rapor bunlara dayanıyor):
 *
 *   YAPILDI    → sayaç hedefe ulaştı (sayısızda 1)
 *   EKSIK      → sayılı alışkanlıkta 0 < sayaç < hedef ("8 bardaktan 5")
 *   YAPILMADI  → kullanıcı AÇIKÇA "yapmadım" dedi (`missed`)
 *   ISARETSIZ  → o gün hiçbir şey girilmedi
 *
 * ⚠️ Alışkanlık EKLENDİĞİ GÜNDEN ÖNCE sayılmaz: bugün eklenen bir alışkanlık
 * dünkü raporda "işaretlenmemiş" görünseydi oranı haksız yere düşerdi.
 */

export type GunDurumu = 'YAPILDI' | 'EKSIK' | 'YAPILMADI' | 'ISARETSIZ';

/** Sayaç + açık işaret → durum. SAF. */
export function gunDurumu(count: number, missed: boolean, targetPerDay: number | null): GunDurumu {
  if (missed) return 'YAPILMADI';
  if (count <= 0) return 'ISARETSIZ';
  return count >= (targetPerDay ?? 1) ? 'YAPILDI' : 'EKSIK';
}

export interface GunlukAliskanlikDto {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  targetPerDay: number | null;
  /** `targetPerDay` ve `count` dakika. */
  sureli: boolean;
  /** Çalışan sayacın başlangıcı (ISO). */
  sayacBaslangic: string | null;
  count: number;
  durum: GunDurumu;
  /** Bugün gerekli mi: haftalık hedef kalan günlere sığıyorsa değil. */
  gerekli: boolean;
  /** Her gün değilse "bu hafta 1/3" için; her gün olanlarda `null`. */
  hafta: { tamam: number; hedef: number } | null;
}

export interface GunOzeti {
  toplam: number;
  yapildi: number;
  eksik: number;
  yapilmadi: number;
  isaretsiz: number;
}

export interface GunlukListeDto {
  gun: AppDay;
  bugun: AppDay;
  items: GunlukAliskanlikDto[];
  ozet: GunOzeti;
}

function ozetle(durumlar: readonly GunDurumu[]): GunOzeti {
  const say = (d: GunDurumu) => durumlar.filter((x) => x === d).length;
  return {
    toplam: durumlar.length,
    yapildi: say('YAPILDI'),
    eksik: say('EKSIK'),
    yapilmadi: say('YAPILMADI'),
    isaretsiz: say('ISARETSIZ'),
  };
}

const AKTIF = { isActive: true, isArchived: false } as const;
const SIRA = [{ order: 'asc' as const }, { name: 'asc' as const }, { id: 'asc' as const }];

type GunClient = Pick<typeof db, 'habit' | 'habitLog'>;

/** Tek günün listesi — sahibinin sırasıyla; o gün henüz yokken eklenenler hariç. */
export async function fetchHabitDay(
  gun: AppDay,
  client: GunClient = db,
  bugun: AppDay = appToday(),
): Promise<GunlukListeDto> {
  // Sorgu bir gün geniş, kesin eleme aşağıda İstanbul gününe göre: `createdAt` bir an, UTC gece
  // yarısıyla karşılaştırılsa 00:00-03:00 arası açılan alışkanlık önceki günde görünürdü.
  const gunSonu = appDayToDate(addAppDays(gun, 2));
  const satirlar = await client.habit.findMany({
    where: { ...AKTIF, createdAt: { lt: gunSonu } },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      targetPerDay: true,
      targetPerWeek: true,
      sureli: true,
      sayacBaslangic: true,
      createdAt: true,
    },
    orderBy: SIRA,
  });
  const habits = satirlar.filter((h) => appToday(h.createdAt) <= gun);
  const logs = await client.habitLog.findMany({
    where: { habitId: { in: habits.map((h) => h.id) }, date: appDayToDate(gun) },
    select: { habitId: true, count: true, missed: true },
  });
  const kayit = new Map(logs.map((l) => [l.habitId, l]));

  // Haftalık hedefli olanlar için haftanın önceki günleri.
  const haftalik = habits.filter((h) => (h.targetPerWeek ?? 7) < 7);
  const pazartesi = startOfAppWeek(gun);
  const oncekiLoglar =
    haftalik.length > 0 && pazartesi < gun
      ? await client.habitLog.findMany({
          where: {
            habitId: { in: haftalik.map((h) => h.id) },
            date: { gte: appDayToDate(pazartesi), lt: appDayToDate(gun) },
          },
          select: { habitId: true, count: true, missed: true },
        })
      : [];
  const gunSirasi = differenceInAppDays(pazartesi, gun);

  const items = habits.map(({ targetPerWeek, sayacBaslangic, sureli, createdAt: _c, ...h }) => {
    const l = kayit.get(h.id);
    const count = l?.count ?? 0;
    const durum = gunDurumu(count, l?.missed ?? false, h.targetPerDay);
    const hedef = targetPerWeek ?? 7;
    const onceki = oncekiLoglar.filter(
      (o) => o.habitId === h.id && isDayComplete(o.count, h.targetPerDay),
    ).length;
    return {
      ...h,
      sureli: sureli ?? false,
      sayacBaslangic: sayacBaslangic?.toISOString() ?? null,
      count,
      durum,
      gerekli: durum === 'YAPILDI' || gunGerekliMi(hedef, onceki, gunSirasi),
      hafta: hedef < 7 ? { tamam: onceki + (durum === 'YAPILDI' ? 1 : 0), hedef } : null,
    };
  });

  return { gun, bugun, items, ozet: ozetle(items.map((i) => i.durum)) };
}

export interface AliskanlikRaporSatiri {
  id: string;
  name: string;
  icon: string | null;
  /** Alışkanlığın var olduğu gün sayısı (pencere içinde). */
  gunSayisi: number;
  yapildi: number;
  eksik: number;
  yapilmadi: number;
  isaretsiz: number;
  /** `yapildi / gunSayisi` — yüzde, tam sayı. */
  oran: number;
  /** Penceredeki her gün için durum (eski → yeni); alışkanlık yokken `null`. */
  gunler: (GunDurumu | null)[];
}

export interface AliskanlikRaporDto {
  from: AppDay;
  to: AppDay;
  gunler: AppDay[];
  satirlar: AliskanlikRaporSatiri[];
  /** Tüm alışkanlıkların toplamı — "son 7 günde %72". */
  genelOran: number;
}

/** Son `gunSayisi` gün (bugün dahil, `bitis`e kadar). */
export async function fetchHabitReport(
  bitis: AppDay,
  gunSayisi: number,
  client: GunClient = db,
): Promise<AliskanlikRaporDto> {
  const from = addAppDays(bitis, -(gunSayisi - 1));
  const gunler = Array.from({ length: gunSayisi }, (_, i) => addAppDays(from, i));

  const habits = await client.habit.findMany({
    where: AKTIF,
    select: { id: true, name: true, icon: true, targetPerDay: true, createdAt: true },
    orderBy: SIRA,
  });
  const logs = await client.habitLog.findMany({
    where: {
      habitId: { in: habits.map((h) => h.id) },
      date: { gte: appDayToDate(from), lte: appDayToDate(bitis) },
    },
    select: { habitId: true, date: true, count: true, missed: true },
  });
  const kayit = new Map(logs.map((l) => [`${l.habitId}|${dateToAppDay(l.date)}`, l]));

  let toplamGun = 0;
  let toplamYapildi = 0;
  const satirlar = habits.map((h) => {
    const baslangic = appToday(h.createdAt);
    const durumlar = gunler.map((g) => {
      if (g < baslangic) return null;
      const l = kayit.get(`${h.id}|${g}`);
      return gunDurumu(l?.count ?? 0, l?.missed ?? false, h.targetPerDay);
    });
    const var_ = durumlar.filter((d): d is GunDurumu => d !== null);
    const ozet = ozetle(var_);
    toplamGun += var_.length;
    toplamYapildi += ozet.yapildi;
    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      gunSayisi: var_.length,
      yapildi: ozet.yapildi,
      eksik: ozet.eksik,
      yapilmadi: ozet.yapilmadi,
      isaretsiz: ozet.isaretsiz,
      oran: var_.length === 0 ? 0 : Math.round((ozet.yapildi / var_.length) * 100),
      gunler: durumlar,
    };
  });

  return {
    from,
    to: bitis,
    gunler,
    satirlar,
    genelOran: toplamGun === 0 ? 0 : Math.round((toplamYapildi / toplamGun) * 100),
  };
}

/**
 * Sahibinin kendi listesi (2026-10-29) — boş panelde tek dokunuşla eklenir.
 * Sayılı olanlar: su 3,5 L = 7 × 500 ml bardak. Liste SIRASIYLA eklenir.
 */
export const ONERILEN_ALISKANLIKLAR: ReadonlyArray<{
  name: string;
  icon: string;
  targetPerDay?: number;
  otoKaynak?: 'SU' | 'SPOR';
}> = [
  { name: 'Diş fırçala', icon: '🪥', targetPerDay: 2 },
  { name: 'Yüze buz uygula', icon: '🧊' },
  { name: 'Spor / egzersiz', icon: '🏋️', otoKaynak: 'SPOR' },
  { name: 'Su iç (3,5 L)', icon: '💧', targetPerDay: 7, otoKaynak: 'SU' },
  { name: 'Kod yaz', icon: '💻' },
  { name: 'Kitap oku', icon: '📖' },
  { name: 'İngilizce çalış', icon: '🇬🇧' },
  { name: 'Ders çalış', icon: '🎓' },
];

/**
 * Kişisel su hedefi; ayar satırı yoksa varsayılan (2026-11-01).
 */
export async function fetchSuHedefi(
  userId: string | null | undefined,
  client: Pick<typeof db, 'bildirimTercihi'> = db,
): Promise<number> {
  if (!userId) return SU_HEDEFI_ML;
  const tercih = await client.bildirimTercihi.findUnique({
    where: { userId },
    select: { suHedefMl: true },
  });
  return tercih?.suHedefMl ?? SU_HEDEFI_ML;
}

/**
 * Kayıttan kendiliğinden işaretler. Spor: antrenman bitince tam. Su: içilen orana göre
 * (3,5 L hedefi, 7 bardaklık alışkanlıkta 1,5 L = 3 bardak). Elle girilenin altına inmez;
 * `kesin` geri almada kullanılır.
 */
export async function otomatikIsaretle(
  kaynak: 'SU' | 'SPOR',
  gun: AppDay,
  suMl: number | null = null,
  kesin = false,
  client: GunClient = db,
  suHedefMl: number = SU_HEDEFI_ML,
): Promise<void> {
  const habits = await client.habit.findMany({
    where: { ...AKTIF, otoKaynak: kaynak },
    select: { id: true, targetPerDay: true },
  });
  const date = appDayToDate(gun);
  for (const h of habits) {
    const hedef = h.targetPerDay ?? 1;
    const yeni =
      kaynak === 'SPOR' ? hedef : Math.min(hedef, Math.floor(((suMl ?? 0) * hedef) / suHedefMl));
    const mevcut = await client.habitLog.findUnique({
      where: { habitId_date: { habitId: h.id, date } },
      select: { count: true },
    });
    if (!kesin && (mevcut?.count ?? 0) >= yeni) continue;
    await client.habitLog.upsert({
      where: { habitId_date: { habitId: h.id, date } },
      create: { habitId: h.id, date, count: yeni, missed: false },
      update: { count: yeni, missed: false },
    });
  }
}

/** Antrenman silinince: o gün başka biten antrenman yoksa spor işareti de kalkar. */
export async function sporIsaretiniGeriAl(gun: AppDay, client: typeof db = db): Promise<void> {
  const kalan = await client.workout.count({
    where: { date: appDayToDate(gun), finishedAt: { not: null } },
  });
  if (kalan > 0) return;
  const habits = await client.habit.findMany({
    where: { ...AKTIF, otoKaynak: 'SPOR' },
    select: { id: true },
  });
  await client.habitLog.deleteMany({
    where: { habitId: { in: habits.map((h) => h.id) }, date: appDayToDate(gun) },
  });
}

/** Su kaydı değişince: kullanıcının kendi hedefiyle işaretler. */
export async function suAliskanliginiIsaretle(
  userId: string,
  gun: AppDay,
  suMl: number | null,
  kesin = false,
): Promise<void> {
  await otomatikIsaretle('SU', gun, suMl, kesin, db, await fetchSuHedefi(userId));
}

/** Hiç (arşivsiz) alışkanlık yokken önerilen listeyi ekler; varsa dokunmaz. */
export async function createSuggestedHabits(client: GunClient = db): Promise<number> {
  const mevcut = await client.habit.count({ where: { isArchived: false } });
  if (mevcut > 0) return 0;
  await client.habit.createMany({
    data: ONERILEN_ALISKANLIKLAR.map((a, i) => ({
      name: a.name,
      icon: a.icon,
      targetPerDay: a.targetPerDay ?? null,
      otoKaynak: a.otoKaynak ?? null,
      order: (i + 1) * 10,
    })),
  });
  return ONERILEN_ALISKANLIKLAR.length;
}

/**
 * Listede bir basamak taşır: komşusuyla `order` değerini değiştirir. Sıralar
 * eşitse (eski kayıtlar 0) önce tüm liste 10'ar aralıkla numaralanır.
 */
export async function moveHabit(input: MoveHabitInput, client: GunClient = db): Promise<void> {
  const liste = await client.habit.findMany({
    where: { isArchived: false },
    select: { id: true, order: true },
    orderBy: SIRA,
  });
  const i = liste.findIndex((h) => h.id === input.id);
  const j = input.yon === 'yukari' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= liste.length) return;

  const yeni = liste.map((h) => h.id);
  [yeni[i], yeni[j]] = [yeni[j]!, yeni[i]!];
  await Promise.all(
    yeni.map((id, k) => client.habit.update({ where: { id }, data: { order: (k + 1) * 10 } })),
  );
}

/* ===========================================================================
 * YILLIK ISI HARİTASI (2026-10-30) — GitHub katkı grafiği gibi
 * ======================================================================== */

export interface IsiHucresi {
  gun: AppDay;
  /** O gün TAMAMLANAN / o gün var olan alışkanlık; alışkanlık yoksa `null`. */
  oran: number | null;
}

/** Haritanın genişliği — 53 hafta, bugünün haftası dahil. */
export const ISI_HAFTA = 53;

/**
 * Hücreler: haftalar sütun (pazartesi başlar), en eski solda; bugünden
 * sonraki günler dizide YOK. SAF.
 */
export function isiHaritasi(
  aliskanliklar: { id: string; olusturma: AppDay; targetPerDay: number | null }[],
  isaretler: { habitId: string; gun: AppDay; count: number }[],
  bugun: AppDay,
): IsiHucresi[] {
  const haftaGunu = (g: AppDay) => {
    const d = new Date(`${g}T00:00:00Z`).getUTCDay();
    return d === 0 ? 7 : d;
  };
  const bas = addAppDays(bugun, -(haftaGunu(bugun) - 1) - (ISI_HAFTA - 1) * 7);
  const hedef = new Map(aliskanliklar.map((a) => [a.id, a.targetPerDay ?? 1]));
  const tamam = new Map<AppDay, number>();
  for (const i of isaretler) {
    const h = hedef.get(i.habitId);
    if (h !== undefined && i.count >= h) tamam.set(i.gun, (tamam.get(i.gun) ?? 0) + 1);
  }

  const hucreler: IsiHucresi[] = [];
  for (let g = bas; g <= bugun; g = addAppDays(g, 1)) {
    const varOlan = aliskanliklar.filter((a) => a.olusturma <= g).length;
    hucreler.push({
      gun: g,
      oran: varOlan === 0 ? null : Math.min(1, (tamam.get(g) ?? 0) / varOlan),
    });
  }
  return hucreler;
}

export async function fetchIsiHaritasi(
  client: GunClient = db,
  bugun: AppDay = appToday(),
): Promise<IsiHucresi[]> {
  const bas = addAppDays(bugun, -(ISI_HAFTA * 7));
  const [aliskanliklar, isaretler] = await Promise.all([
    client.habit.findMany({
      where: AKTIF,
      select: { id: true, createdAt: true, targetPerDay: true },
    }),
    client.habitLog.findMany({
      where: { date: { gte: appDayToDate(bas), lte: appDayToDate(bugun) }, missed: false },
      select: { habitId: true, date: true, count: true },
    }),
  ]);
  return isiHaritasi(
    aliskanliklar.map((a) => ({
      id: a.id,
      // Oluşturma bir AN; günü İstanbul saatiyle — gece eklenen alışkanlık o güne sayılır.
      olusturma: appToday(a.createdAt),
      targetPerDay: a.targetPerDay,
    })),
    isaretler.map((i) => ({ habitId: i.habitId, gun: dateToAppDay(i.date), count: i.count })),
    bugun,
  );
}
