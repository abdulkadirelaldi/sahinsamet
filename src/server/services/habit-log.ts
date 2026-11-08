import type {
  CreateHabitLogInput,
  SayacDurdurInput,
  SetHabitDayStatusInput,
  SureEkleInput,
  ToggleHabitLogInput,
} from '@/lib/schemas';
import { db } from '@/server/db';

import { appDayToDate, appToday, type AppDay } from './_shared';

/**
 * `HabitLog` servisi — §4.2 "alışkanlık" panosunun YAZMA yolu, ADR-021, T-112.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `count = 0` SATIR TUTULMAZ — "yapıldı" = SATIR VAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-021 "yapıldı = `count > 0`" diyor. Sıfır sayaçlı bir satır saklamak bu
 * tanımın yanına ikinci bir "yapılmadı" gösterimi koymak olurdu: satırın
 * YOKLUĞU ve `count = 0` satırı aynı şeyi söylerdi ve her okuyucu ikisini de
 * hesaba katmak zorunda kalırdı. Sayaç sıfıra inince satır SİLİNİR; tek
 * gösterim kalır.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * YARIŞ: `upsert`, ön kontrol değil
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Panoda bir hücreye hızlı iki tık iki eşzamanlı istek demek. "Var mı bak,
 * yoksa ekle" ikisinde de "yok" görür ve ikinci `create` P2002 ile düşer —
 * kullanıcı tıkladığı hâlde hata görür. `@@unique([habitId, date])` üzerinde
 * `upsert` bunu tek ifadede çözüyor.
 *
 * ⚠️ ARŞİVLENMİŞ ALIŞKANLIĞA İŞARET KONMAZ: arşiv "bıraktım" demek (habit.ts).
 * Pano onu zaten göstermiyor; bu kontrol eski bir sekmeden ya da elle
 * gönderilen istekten gelen yazmayı durduruyor.
 */

/** Şemanın `count` üst sınırı — artırma bu sınırda DURUR, taşmaz. */
export const HABIT_LOG_MAX_COUNT = 100;

/** Süreli alışkanlıkta bir günün üst sınırı (dakika). */
export const HABIT_LOG_MAX_DAKIKA = 1440;

/** Bundan uzun açık kalan sayaç unutulmuş sayılır; süre sorulmadan yazılmaz. */
export const SAYAC_UZUN_DK = 240;

export interface HabitDayResult {
  habitId: string;
  date: AppDay;
  /** Yazmadan sonraki sayaç. `0` ve `missed: false` → satır yok. */
  count: number;
  /** Açık "yapmadım" işareti (2026-10-29) — `count` 0 iken satır kalır. */
  missed: boolean;
}

/** Hedef alışkanlık neden yazılamadı — eylem bunu kullanıcı metnine çevirir. */
export type HabitWriteBlock = 'NOT_FOUND' | 'ARCHIVED' | 'SURELI_DEGIL';

export class HabitWriteBlockedError extends Error {
  constructor(readonly reason: HabitWriteBlock) {
    super(`habit write blocked: ${reason}`);
    this.name = 'HabitWriteBlockedError';
  }
}

export interface HabitLogClient {
  habit: {
    findUnique(args: {
      where: { id: string };
      select: { targetPerDay: true; isArchived: true; sureli: true };
    }): Promise<{ targetPerDay: number | null; isArchived: boolean; sureli: boolean } | null>;
    updateMany(args: {
      where: { id: string; sayacBaslangic: { not: null } };
      data: { sayacBaslangic: null };
    }): Promise<{ count: number }>;
  };
  habitLog: {
    findUnique(args: {
      where: { habitId_date: { habitId: string; date: Date } };
      select: { count: true };
    }): Promise<{ count: number } | null>;
    upsert(args: {
      where: { habitId_date: { habitId: string; date: Date } };
      create: { habitId: string; date: Date; count: number; missed: boolean };
      update: { count: number; missed: boolean };
      select: { count: true; missed: true };
    }): Promise<{ count: number; missed: boolean }>;
    deleteMany(args: { where: { habitId: string; date: Date } }): Promise<{ count: number }>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR (T-110'un kalıbı). */
const _uyumKontrolu: HabitLogClient = db;
void _uyumKontrolu;

async function requireWritableHabit(
  habitId: string,
  client: HabitLogClient,
): Promise<{ targetPerDay: number | null; sureli: boolean }> {
  const habit = await client.habit.findUnique({
    where: { id: habitId },
    select: { targetPerDay: true, isArchived: true, sureli: true },
  });

  if (!habit) throw new HabitWriteBlockedError('NOT_FOUND');
  if (habit.isArchived) throw new HabitWriteBlockedError('ARCHIVED');
  return habit;
}

/** Sayacı yazar; `0` satırı siler (dosya başındaki kural). */
async function writeCount(
  habitId: string,
  day: AppDay,
  count: number,
  client: HabitLogClient,
): Promise<HabitDayResult> {
  const date = appDayToDate(day);

  if (count <= 0) {
    // `deleteMany`: satır zaten yoksa hata değil — "sıfırla" idempotent.
    await client.habitLog.deleteMany({ where: { habitId, date } });
    return { habitId, date: day, count: 0, missed: false };
  }

  // Sayı yazmak "yapmadım" işaretini KALDIRIR — ikisi aynı anda doğru olamaz.
  const row = await client.habitLog.upsert({
    where: { habitId_date: { habitId, date } },
    create: { habitId, date, count, missed: false },
    update: { count, missed: false },
    select: { count: true, missed: true },
  });

  return { habitId, date: day, count: row.count, missed: row.missed };
}

/**
 * Panodaki hücreye tıklamak — §4.2'nin en sık eylemi.
 *
 * Davranış alışkanlığın türüne bağlı:
 *   - `targetPerDay` YOK (yapıldı/yapılmadı) → AÇ/KAPA. Yanlışlıkla işaretlenen
 *     gün ikinci tıkla geri alınabilmeli.
 *   - `targetPerDay` VAR (8 bardak su) → sayacı BİR ARTIR. Burada aç/kapa
 *     yanlış olurdu: ikinci bardak ilk bardağı silerdi. Düzeltme için
 *     `setHabitDayCount` var.
 *
 * ⚠️ OKU-SONRA-YAZ yarışı ARTIRMADA kabul edildi: iki eşzamanlı tık aynı
 * sayacı okuyup ikisi de `n+1` yazabilir, yani bir tık kaybolur. Prisma'nın
 * `increment`i bunu çözerdi ama `upsert`in `create` dalında anlamsız ve üst
 * sınırı (`HABIT_LOG_MAX_COUNT`) uygulayamaz. Tek kullanıcılı bir panoda
 * kayıp tık görünür (sayı ekranda) ve düzeltilebilir; P2002 hatası değil.
 */
export async function toggleHabitDay(
  input: ToggleHabitLogInput,
  client: HabitLogClient = db,
): Promise<HabitDayResult> {
  const habit = await requireWritableHabit(input.habitId, client);

  const existing = await client.habitLog.findUnique({
    where: { habitId_date: { habitId: input.habitId, date: appDayToDate(input.date) } },
    select: { count: true },
  });
  const current = existing?.count ?? 0;

  // Süreli alışkanlıkta "bir artır" bir dakika demek olurdu: aç/kapa, hedefe tamamlar.
  const next =
    habit.targetPerDay === null || habit.sureli
      ? current > 0
        ? 0
        : (habit.targetPerDay ?? 1)
      : Math.min(current + 1, HABIT_LOG_MAX_COUNT);

  return writeCount(input.habitId, input.date, next, client);
}

/** Sayacı doğrudan belirler — düzeltme yolu. `0` → işareti kaldırır. */
export async function setHabitDayCount(
  input: CreateHabitLogInput,
  client: HabitLogClient = db,
): Promise<HabitDayResult> {
  const habit = await requireWritableHabit(input.habitId, client);
  const sinir = habit.sureli ? HABIT_LOG_MAX_DAKIKA : HABIT_LOG_MAX_COUNT;
  return writeCount(input.habitId, input.date, Math.min(input.count, sinir), client);
}

/** Süreli alışkanlığa dakika ekler: "yaparken başlatmayı unuttum" yolu (2026-11-02). */
export async function sureEkle(
  input: SureEkleInput,
  client: HabitLogClient = db,
): Promise<HabitDayResult> {
  const habit = await requireWritableHabit(input.habitId, client);
  if (!habit.sureli) throw new HabitWriteBlockedError('SURELI_DEGIL');
  const mevcut = await client.habitLog.findUnique({
    where: { habitId_date: { habitId: input.habitId, date: appDayToDate(input.date) } },
    select: { count: true },
  });
  const toplam = Math.min((mevcut?.count ?? 0) + input.dakika, HABIT_LOG_MAX_DAKIKA);
  return writeCount(input.habitId, input.date, toplam, client);
}

/** Sayacı başlatır. Zaten çalışıyorsa başlangıcına dokunmaz: ikinci cihaz süreyi sıfırlamasın. */
export async function sayaciBaslat(habitId: string, simdi: Date = new Date()): Promise<string> {
  const yazilabilir = await requireWritableHabit(habitId, db);
  if (!yazilabilir.sureli) throw new HabitWriteBlockedError('SURELI_DEGIL');
  // Koşullu yazma: iki cihaz aynı anda başlatsa da ilk başlangıç kalır.
  await db.habit.updateMany({
    where: { id: habitId, sayacBaslangic: null },
    data: { sayacBaslangic: simdi },
  });
  const habit = await db.habit.findUnique({
    where: { id: habitId },
    select: { sayacBaslangic: true },
  });
  return (habit?.sayacBaslangic ?? simdi).toISOString();
}

export type SayacSonucu =
  | { durum: 'KAYDEDILDI'; sonuc: HabitDayResult; eklenen: number }
  /** Sayaç unutulmuş olabilir: süre yazılmadı, kullanıcıya sorulacak. */
  | { durum: 'UZUN'; gecenDk: number }
  /** Çalışan sayaç yok (başka cihazda durdurulmuş olabilir). */
  | { durum: 'YOK' };

/**
 * Sayacı durdurup süreyi BAŞLADIĞI GÜNE yazar: 23:50'de başlayan okuma ertesi güne geçmez.
 * Eşzamanlı iki "durdur"da süre iki kez eklenmez: yalnızca sayacı kapatan işlem yazar.
 */
export async function sayaciDurdur(
  input: SayacDurdurInput,
  simdi: Date = new Date(),
): Promise<SayacSonucu> {
  const habit = await db.habit.findUnique({
    where: { id: input.habitId },
    select: { sayacBaslangic: true },
  });
  const baslangic = habit?.sayacBaslangic;
  if (!baslangic) return { durum: 'YOK' };

  // Yarım dakikadan kısası yanlışlıkla başlatmadır: sayaç kapanır, süre yazılmaz.
  const gecenDk = Math.round((simdi.getTime() - baslangic.getTime()) / 60_000);
  if (input.dakika === undefined && gecenDk > SAYAC_UZUN_DK) return { durum: 'UZUN', gecenDk };
  const eklenen = input.dakika ?? gecenDk;
  const gun = appToday(baslangic);

  return db.$transaction(async (tx) => {
    const kapanan = await tx.habit.updateMany({
      // Okunan başlangıca bağlı: gecikmiş ikinci "durdur" yeni başlatılan sayacı kapatmasın.
      where: { id: input.habitId, sayacBaslangic: baslangic },
      data: { sayacBaslangic: null },
    });
    if (kapanan.count === 0) return { durum: 'YOK' } as const;

    if (eklenen === 0) {
      const mevcut = await tx.habitLog.findUnique({
        where: { habitId_date: { habitId: input.habitId, date: appDayToDate(gun) } },
        select: { count: true, missed: true },
      });
      return {
        durum: 'KAYDEDILDI',
        eklenen,
        sonuc: {
          habitId: input.habitId,
          date: gun,
          count: mevcut?.count ?? 0,
          missed: mevcut?.missed ?? false,
        },
      } as const;
    }
    const sonuc = await sureEkle({ habitId: input.habitId, date: gun, dakika: eklenen }, tx);
    return { durum: 'KAYDEDILDI', eklenen, sonuc } as const;
  });
}

/**
 * Günlük listedeki tek dokunuş (2026-10-29).
 *
 *   YAPTIM   → hedefe tamamla (sayısız alışkanlıkta 1, sayılıda `targetPerDay`)
 *   YAPMADIM → `count = 0, missed = true` — satır KALIR: rapor "işaretlenmemiş"
 *              ile "yapmadım dedi"yi ayırabilsin
 *   TEMIZLE  → satır silinir (işaretlenmemiş)
 */
export async function setHabitDayStatus(
  input: SetHabitDayStatusInput,
  client: HabitLogClient = db,
): Promise<HabitDayResult> {
  const habit = await requireWritableHabit(input.habitId, client);

  // Elle işaretlenen günde açık sayaç kalmasın: sonradan aynı süre ikinci kez eklenirdi.
  if (habit.sureli) {
    await client.habit.updateMany({
      where: { id: input.habitId, sayacBaslangic: { not: null } },
      data: { sayacBaslangic: null },
    });
  }

  if (input.durum === 'YAPTIM') {
    return writeCount(input.habitId, input.date, habit.targetPerDay ?? 1, client);
  }
  if (input.durum === 'TEMIZLE') {
    return writeCount(input.habitId, input.date, 0, client);
  }

  const date = appDayToDate(input.date);
  const row = await client.habitLog.upsert({
    where: { habitId_date: { habitId: input.habitId, date } },
    create: { habitId: input.habitId, date, count: 0, missed: true },
    update: { count: 0, missed: true },
    select: { count: true, missed: true },
  });
  return { habitId: input.habitId, date: input.date, count: row.count, missed: row.missed };
}
