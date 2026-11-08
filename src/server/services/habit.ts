import type {
  ArchiveHabitInput,
  CreateHabitInput,
  HabitFilterInput,
  UpdateHabitInput,
} from '@/lib/schemas';
import { db } from '@/server/db';

import {
  addAppDays,
  appDayToDate,
  appToday,
  appWeekRange,
  dateToAppDay,
  panelSkipTake,
  startOfAppWeek,
  toPagedResult,
  type AppDay,
} from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `Habit` servisi — §4.2 `/panel/hayat` "alışkanlık", ADR-017, ADR-021, T-112.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SİLİNMEZ, ARŞİVLENİR — VE BURADA SEBEP `Exercise`İN TERSİ YÖNDEN GELİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Exercise`te silme MÜMKÜN DEĞİLDİ (`Restrict`, P2003). Burada mümkün —
 * `HabitLog.habitId` `onDelete: Cascade` — ve tam da bu yüzden tehlikeli: bir
 * alışkanlığı silmek, aylarca tutulmuş tüm işaretlerini SESSİZCE götürür.
 * Hiçbir hata, hiçbir uyarı. "Artık bunu yapmıyorum" demek isteyen kullanıcı
 * "bunu hiç yapmadım" demiş olur.
 *
 * T-038'in ölçütü ("FK bağımlısı varsa arşiv") burada da aynı cevabı veriyor;
 * yalnızca bağımlılığın türü farklı: veritabanı silmeyi ENGELLEMİYOR, geçmişi
 * YOK EDİYOR. Bu yüzden silme eylemi yazılmadı.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * İKİ AYRI BAYRAK: `isActive` ≠ `isArchived`
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `isActive=false` → "ara verdim" (tatil, sakatlık): haftalık panoda görünmez
 * ama yönetim listesinde normal durur. `isArchived=true` → "bıraktım": seçim
 * listelerinden de düşer. Haftalık pano İKİSİNİ BİRDEN süzüyor.
 *
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — gerekçe `health-log.ts`teki ile aynı:
 * F5 modellerinin hiçbiri public tarafta okunmuyor (T-110/T-111 taraması).
 */

export interface HabitDto {
  id: string;
  name: string;
  /** Haftada kaç GÜN (1–7). */
  targetPerWeek: number;
  /** Gün içinde kaç KEZ; `null` → "yapıldı/yapılmadı" yeterli. */
  targetPerDay: number | null;
  /** `targetPerDay` dakika (2026-11-02). */
  sureli: boolean;
  color: string | null;
  icon: string | null;
  /** Günlük listedeki sıra — küçük önce (2026-10-29). */
  order: number;
  isActive: boolean;
  isArchived: boolean;
  /** Kayıttan kendiliğinden işaretlenme kaynağı; `null` → elle. */
  otoKaynak: 'SU' | 'SPOR' | null;
  createdAt: string;
  updatedAt: string;
}

const HABIT_SELECT = {
  id: true,
  name: true,
  targetPerWeek: true,
  targetPerDay: true,
  sureli: true,
  color: true,
  icon: true,
  order: true,
  isActive: true,
  isArchived: true,
  otoKaynak: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface HabitRow {
  id: string;
  name: string;
  targetPerWeek: number;
  targetPerDay: number | null;
  color: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  otoKaynak?: string | null;
  sureli?: boolean;
}

interface HabitLogRow {
  habitId: string;
  date: Date;
  count: number;
}

export interface HabitClient {
  habit: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof HABIT_SELECT;
      orderBy: Array<Record<string, 'asc' | 'desc'>>;
      skip?: number;
      take?: number;
    }): Promise<HabitRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: typeof HABIT_SELECT;
    }): Promise<HabitRow | null>;
    create(args: {
      data: {
        name: string;
        targetPerWeek: number;
        targetPerDay: number | null;
        sureli: boolean;
        color: string | null;
        icon: string | null;
        order: number;
        isActive: boolean;
        otoKaynak: string | null;
      };
      select: typeof HABIT_SELECT;
    }): Promise<HabitRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof HABIT_SELECT;
    }): Promise<HabitRow>;
  };
  habitLog: {
    findMany(args: {
      where: { habitId: { in: string[] }; date: { gte: Date; lte: Date } };
      select: { habitId: true; date: true; count: true };
    }): Promise<HabitLogRow[]>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR (T-110'un kalıbı). */
const _uyumKontrolu: HabitClient = db;
void _uyumKontrolu;

function toDto(row: HabitRow): HabitDto {
  return {
    id: row.id,
    name: row.name,
    targetPerWeek: row.targetPerWeek,
    targetPerDay: row.targetPerDay,
    sureli: row.sureli ?? false,
    color: row.color,
    icon: row.icon,
    order: row.order,
    isActive: row.isActive,
    isArchived: row.isArchived,
    otoKaynak: (row.otoKaynak ?? null) as HabitDto['otoKaynak'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ===========================================================================
 * SAF ÇEKİRDEK — gün tamamlandı mı, seri ne kadar
 * ======================================================================== */

/**
 * Bir gün TAMAMLANDI mı.
 *
 * ⚠️ "Yapıldı" (`count > 0`, ADR-021) ile "tamamlandı" AYNI ŞEY DEĞİL:
 * günde 8 bardak hedefli bir alışkanlıkta 3 bardak "yapıldı" ama tamamlanmadı.
 * Seriyi ve haftalık hedefi TAMAMLANAN gün sayar; aksi hâlde tek bardak su
 * seriyi canlı tutardı ve hedef alanı süs olurdu.
 */
export function isDayComplete(count: number, targetPerDay: number | null): boolean {
  return count >= (targetPerDay ?? 1);
}

export interface HabitStreak {
  /**
   * Seri BİRİMİ hedefe göre seçiliyor. Haftada 3 gün hedefli bir alışkanlıkta
   * GÜN serisi her hafta kendiliğinden kırılır ve kullanıcı hedefini tutturduğu
   * hâlde "seri: 1" görür — doğru sayı, yanlış soru. Hedef her gün değilse
   * soru "kaç hafta üst üste tutturdum"dur.
   */
  unit: 'day' | 'week';
  value: number;
  /**
   * Seri geriye bakma penceresinin SONUNA dayandı mı. Öyleyse gerçek değer
   * en az `value` — ekran "400+" yazmalı, kesin sayı gibi göstermemeli.
   */
  atLeast: boolean;
}

/**
 * Seri hesabı için geriye bakılan gün sayısı.
 *
 * Sınırsız okumak yıllarca birikmiş işareti her pano açılışında taşımak
 * demekti (`TREND_MAX_DAYS` ile aynı kalıp). Pencereye dayanan seri
 * `atLeast` ile işaretleniyor, yani sınır SESSİZ değil.
 */
export const STREAK_LOOKBACK_DAYS = 400;

/**
 * Günlük seri — BUGÜNDEN geriye kesintisiz tamamlanan gün sayısı.
 *
 * ⚠️ BUGÜN HENÜZ TAMAMLANMADIYSA SERİ DÜNDEN SAYILIR. Gün bitmeden seriyi
 * sıfır göstermek, sabah paneli açan kullanıcıya dünkü 30 günlük serisini
 * "kırılmış" gösterirdi — kırılmadı, gün sürüyor.
 */
export function dailyStreak(
  completeDays: ReadonlySet<AppDay>,
  today: AppDay,
  lookbackFrom: AppDay,
): HabitStreak {
  let cursor = completeDays.has(today) ? today : addAppDays(today, -1);
  let value = 0;

  while (cursor >= lookbackFrom && completeDays.has(cursor)) {
    value += 1;
    cursor = addAppDays(cursor, -1);
  }

  return { unit: 'day', value, atLeast: cursor < lookbackFrom };
}

/**
 * Haftalık seri — hedefin tutturulduğu ardışık hafta sayısı.
 *
 * Günlük serinin "gün sürüyor" kuralının hafta karşılığı: İÇİNDE
 * BULUNULAN hafta hedefi henüz tutturmadıysa seri GEÇEN haftadan sayılır.
 *
 * ⚠️ Pencerenin başına denk gelen KISMİ hafta sayılmıyor: o haftanın
 * pencere dışında kalan günleri okunmadı, yani "tutturamadı" demek
 * okunmayan veriden hüküm çıkarmak olurdu. Seri oraya dayanırsa `atLeast`.
 */
export function weeklyStreak(
  completeDays: ReadonlySet<AppDay>,
  today: AppDay,
  targetPerWeek: number,
  lookbackFrom: AppDay,
): HabitStreak {
  const completedInWeek = (weekStart: AppDay): number => {
    let total = 0;
    for (let i = 0; i < 7; i += 1) {
      if (completeDays.has(addAppDays(weekStart, i))) total += 1;
    }
    return total;
  };

  const currentWeek = startOfAppWeek(today);
  let cursor =
    completedInWeek(currentWeek) >= targetPerWeek ? currentWeek : addAppDays(currentWeek, -7);
  let value = 0;

  while (cursor >= lookbackFrom && completedInWeek(cursor) >= targetPerWeek) {
    value += 1;
    cursor = addAppDays(cursor, -7);
  }

  return { unit: 'week', value, atLeast: cursor < lookbackFrom };
}

/* ===========================================================================
 * OKUMA — yönetim listesi
 * ======================================================================== */

/**
 * Filtreyi `where`e çevirir — SAF.
 *
 * `isArchived`/`isActive` VARSAYILANI YOK (`buildExerciseWhere` ile aynı
 * gerekçe, ADR-033): "verilmedi" TÜMÜ demek, çağıran ne istediğini söylüyor.
 */
export function buildHabitWhere(filter: HabitFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.isActive !== undefined) where.isActive = filter.isActive;
  if (filter.isArchived !== undefined) where.isArchived = filter.isArchived;

  return where;
}

/**
 * Alışkanlık listesi — ada göre, sayfalı.
 *
 * ⚠️ İKİNCİL ANAHTAR `id` ZORUNLU: `name` `@unique` DEĞİL (`Exercise.name`in
 * tersi). Aynı adlı iki alışkanlık mümkün ve sıraları belirsiz kalırsa
 * sayfalama satır tekrarlar (`Workout`ta ölçülen sınıf).
 */
export async function fetchHabits(
  filter: HabitFilterInput,
  client: HabitClient = db,
): Promise<PagedResult<HabitDto>> {
  const where = buildHabitWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.habit.findMany({
      where,
      select: HABIT_SELECT,
      orderBy: [{ order: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip,
      take,
    }),
    client.habit.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toDto);
}

export async function fetchHabitById(
  id: string,
  client: HabitClient = db,
): Promise<HabitDto | null> {
  const row = await client.habit.findUnique({ where: { id }, select: HABIT_SELECT });
  return row ? toDto(row) : null;
}

/* ===========================================================================
 * OKUMA — haftalık pano
 * ======================================================================== */

export interface HabitWeekRowDto extends HabitDto {
  /** Haftanın 7 günü için sayaç, `days` ile aynı sırada. İşaret yoksa 0. */
  counts: number[];
  /** Bu hafta TAMAMLANAN gün sayısı (`isDayComplete`). */
  completedDays: number;
  weekTargetMet: boolean;
  streak: HabitStreak;
}

export interface HabitWeekDto {
  /** Haftanın günleri, pazartesiden pazara (ADR-016). */
  days: AppDay[];
  today: AppDay;
  habits: HabitWeekRowDto[];
}

/**
 * Haftalık alışkanlık panosu — §4.2'nin "alışkanlık" ekranının ana okuması.
 *
 * ⚠️ İKİ AYRI PENCERE OKUNUYOR ve birleştirilmedi: seçilen HAFTA (ızgara) ve
 * BUGÜNDEN geriye seri penceresi. Kullanıcı geçmiş bir haftaya baktığında da
 * seri BUGÜNE göredir — "o haftaki seri" diye bir soru yok. Tek bir geniş
 * aralık okumak, üç ay önceki bir haftaya bakıldığında aradaki her şeyi
 * taşımak olurdu.
 *
 * Yalnızca `isActive && !isArchived` alışkanlıklar: ara verilen ve bırakılan
 * alışkanlık panoyu kalabalıklaştırmasın (dosya başındaki iki bayrak).
 */
export async function fetchHabitWeek(
  day: AppDay,
  client: HabitClient = db,
  today: AppDay = appToday(),
  { seri = true }: { seri?: boolean } = {},
): Promise<HabitWeekDto> {
  const week = appWeekRange(day);
  const days = Array.from({ length: 7 }, (_, i) => addAppDays(week.from, i));
  const lookbackFrom = addAppDays(today, -(STREAK_LOOKBACK_DAYS - 1));

  const habits = await client.habit.findMany({
    where: { isActive: true, isArchived: false },
    select: HABIT_SELECT,
    orderBy: [{ order: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  });

  if (habits.length === 0) return { days, today, habits: [] };

  const ids = habits.map((habit) => habit.id);
  const select = { habitId: true, date: true, count: true } as const;

  const [weekLogs, streakLogs] = await Promise.all([
    client.habitLog.findMany({
      where: {
        habitId: { in: ids },
        date: { gte: appDayToDate(week.from), lte: appDayToDate(week.to) },
      },
      select,
    }),
    // Seri 400 günlük kayıt ister; yalnızca oran gereken ekran bunu okumaz.
    seri
      ? client.habitLog.findMany({
          where: {
            habitId: { in: ids },
            date: { gte: appDayToDate(lookbackFrom), lte: appDayToDate(today) },
          },
          select,
        })
      : [],
  ]);

  const rows = habits.map((habit): HabitWeekRowDto => {
    const weekCounts = new Map(
      weekLogs
        .filter((log) => log.habitId === habit.id)
        .map((log) => [dateToAppDay(log.date), log.count]),
    );
    const counts = days.map((d) => weekCounts.get(d) ?? 0);
    const completedDays = counts.filter((c) => isDayComplete(c, habit.targetPerDay)).length;

    const completeSet = new Set(
      streakLogs
        .filter((log) => log.habitId === habit.id && isDayComplete(log.count, habit.targetPerDay))
        .map((log) => dateToAppDay(log.date)),
    );

    const streak =
      habit.targetPerWeek >= 7
        ? dailyStreak(completeSet, today, lookbackFrom)
        : weeklyStreak(completeSet, today, habit.targetPerWeek, lookbackFrom);

    return {
      ...toDto(habit),
      counts,
      completedDays,
      weekTargetMet: completedDays >= habit.targetPerWeek,
      streak,
    };
  });

  return { days, today, habits: rows };
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

export async function createHabit(
  input: CreateHabitInput,
  client: HabitClient = db,
): Promise<HabitDto> {
  const row = await client.habit.create({
    data: {
      name: input.name,
      targetPerWeek: input.targetPerWeek,
      targetPerDay: input.targetPerDay ?? null,
      sureli: input.sureli,
      color: input.color ?? null,
      icon: input.icon?.trim() ? input.icon : null,
      order: input.order,
      isActive: input.isActive,
      otoKaynak: input.otoKaynak ?? null,
    },
    select: HABIT_SELECT,
  });

  return toDto(row);
}

/**
 * Günceller — KISMİ (`undefined` ≠ "temizle").
 *
 * ⚠️ `targetPerDay` DEĞİŞİRSE GEÇMİŞ YENİDEN YORUMLANIR ve bu bilinçli:
 * "tamamlandı" saklanmıyor, her okumada `count` ile hedeften türetiliyor
 * (ADR-021'in PR kararıyla aynı ilke — türetilmiş veri saklanmaz). Hedefi
 * 8'den 6'ya indiren kullanıcı, 6–7 bardak içtiği eski günleri tamamlanmış
 * görür. Saklasaydık iki kaynak birbirini tutmazdı.
 */
export async function updateHabit(
  input: UpdateHabitInput,
  client: HabitClient = db,
): Promise<HabitDto> {
  const { id, ...fields } = input;

  const row = await client.habit.update({
    where: { id },
    data: {
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.targetPerWeek !== undefined ? { targetPerWeek: fields.targetPerWeek } : {}),
      ...(fields.targetPerDay !== undefined ? { targetPerDay: fields.targetPerDay } : {}),
      ...(fields.sureli !== undefined ? { sureli: fields.sureli } : {}),
      ...(fields.color !== undefined ? { color: fields.color } : {}),
      ...(fields.icon !== undefined ? { icon: fields.icon?.trim() ? fields.icon : null } : {}),
      ...(fields.isActive !== undefined ? { isActive: fields.isActive } : {}),
      ...(fields.otoKaynak !== undefined ? { otoKaynak: fields.otoKaynak } : {}),
    },
    select: HABIT_SELECT,
  });

  return toDto(row);
}

/** Arşivler veya arşivden çıkarır — SİLMEZ (gerekçe dosya başında). */
export async function archiveHabit(
  input: ArchiveHabitInput,
  client: HabitClient = db,
): Promise<HabitDto> {
  const row = await client.habit.update({
    where: { id: input.id },
    // Arşivde sayaç açık kalmaz: durdurma arşive yazamaz, aylar sonra "unutuldu" uyarısı çıkardı.
    data: { isArchived: input.isArchived, ...(input.isArchived ? { sayacBaslangic: null } : {}) },
    select: HABIT_SELECT,
  });

  return toDto(row);
}

/**
 * Bu gün gerçekten gerekli mi: haftada 3 günlük alışkanlık, hedef hâlâ kalan günlere
 * sığıyorsa o gün "eksik" sayılmaz. Her gün olanlar her zaman gereklidir. SAF.
 */
export function gunGerekliMi(haftaHedefi: number, oncekiTamam: number, gunSirasi: number): boolean {
  return haftaHedefi - oncekiTamam >= 7 - gunSirasi;
}

type HaftaGorunumu = Pick<HabitWeekDto, 'days' | 'habits'>;

/** Bir günün gerekli ve tamamlanan alışkanlık sayısı. SAF. */
function gunSayimi(hafta: HaftaGorunumu, i: number): { gerekli: number; tamam: number } {
  let gerekli = 0;
  let tamam = 0;
  for (const h of hafta.habits) {
    const bitti = (g: number) => isDayComplete(h.counts[g] ?? 0, h.targetPerDay);
    const onceki = Array.from({ length: i }, (_, g) => g).filter(bitti).length;
    if (bitti(i)) {
      tamam += 1;
      gerekli += 1;
    } else if (gunGerekliMi(h.targetPerWeek ?? 7, onceki, i)) gerekli += 1;
  }
  return { gerekli, tamam };
}

/**
 * Haftanın her günü için TAMAMLANAN alışkanlık oranı (0–1), `days` sırasıyla.
 * Yalnızca o gün gerekli olanlar paydaya girer. Bugün ve Hayat'taki hafta
 * görünümleri okur. Alışkanlık yoksa hepsi 0. SAF.
 */
export function gunOranlari(hafta: HaftaGorunumu): number[] {
  return hafta.days.map((_, i) => {
    const { gerekli, tamam } = gunSayimi(hafta, i);
    return gerekli === 0 ? 0 : tamam / gerekli;
  });
}

/**
 * Geçen günlerin gerekli ve tamamlanan sayısı; `aralik` verilirse yalnızca içindeki günler.
 * Ay özeti bir ayın kenarındaki haftaları böyle keser. SAF.
 */
export function gunSayilari(
  hafta: HaftaGorunumu,
  bugun: AppDay,
  aralik?: { bas: AppDay; son: AppDay },
): { gerekli: number; tamam: number } {
  let gerekli = 0;
  let tamam = 0;
  hafta.days.forEach((gun, i) => {
    if (gun > bugun) return;
    if (aralik && (gun < aralik.bas || gun > aralik.son)) return;
    const g = gunSayimi(hafta, i);
    gerekli += g.gerekli;
    tamam += g.tamam;
  });
  return { gerekli, tamam };
}

/** Geçen günlerin tamamlanma yüzdesi; gerekli gün yoksa `null`. SAF. */
export function haftaYuzdesi(hafta: HaftaGorunumu, bugun: AppDay): number | null {
  const { gerekli, tamam } = gunSayilari(hafta, bugun);
  return gerekli === 0 ? null : Math.round((tamam / gerekli) * 100);
}
