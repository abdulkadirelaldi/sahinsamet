import type { CreateWorkoutInput, UpdateWorkoutInput, WorkoutFilterInput } from '@/lib/schemas';
import { db } from '@/server/db';
import type { WorkoutType } from '@/types';

import {
  appDayToDate,
  dateToAppDay,
  panelSkipTake,
  toMeasureString,
  toPagedResult,
  type DecimalLike,
} from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `Workout` servisi — §4.2 "antrenman kaydı", T-111.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TARİH YARDIMCISI: `date` BİR `@db.Date` → `appDayToDate`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kural T-102'de konuldu ve her kartta yeniden uygulanıyor: HANGİ YARDIMCININ
 * KULLANILACAĞINI SÜTUNUN TİPİ BELİRLER. `Workout.date` `@db.Date`, saat
 * saklamıyor, UTC gece yarısı sınırı TAM DOĞRU. `appDayStartInstant` kullanmak
 * günü bir geri kaydırırdı.
 *
 * ⚠️ `HealthLog.date`TEN BİR FARK VAR: orası `@unique`ti, burası DEĞİL — aynı
 * güne iki antrenman düşebilir (sabah koşu, akşam ağırlık; şema `type` alanını
 * tam bunun için taşıyor). İki sonucu var:
 *   1. Günde tek kayıt kontrolü YOK, P2002 yolu YOK.
 *   2. Sıralamada İKİNCİL ANAHTAR ZORUNLU — yoksa aynı güne düşen iki
 *      antrenmanın sırası belirsiz kalır ve sayfalama satır TEKRARLAR veya
 *      ATLAR (T-101'de `Transaction` için ölçülen aynı sınıf).
 *
 * `createdAt`/`updatedAt` `timestamp` ve gün dönüşümünden GEÇMİYOR. Aynı dosyada
 * iki sütun ailesi var; ayrımı tip belirliyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — gerekçe `exercise.ts`te (ADR-029
 * taraması dört model için birlikte yapıldı).
 * ───────────────────────────────────────────────────────────────────────────
 */

export interface WorkoutDto {
  id: string;
  /** Gün (`YYYY-MM-DD`) — `@db.Date`. */
  date: string;
  type: WorkoutType;
  durationMin: number | null;
  /** 1–5 ölçek (ADR-020: kategori değil, enum yapılmadı). */
  feeling: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Liste satırı — set sayısı ekranda var, setlerin kendisi YOK. */
export interface WorkoutListItemDto extends WorkoutDto {
  setCount: number;
}

/** Detay — setleriyle birlikte. Tek antrenman okunduğunda setler ZATEN isteniyor. */
export interface WorkoutDetailDto extends WorkoutDto {
  sets: WorkoutSetDto[];
}

/**
 * Antrenman setinin DTO'su.
 *
 * ⚠️ `weightKg` `string | null` — ADR-014/D. Sütun `Decimal(6,2)`, yani
 * `toMeasureString(..., 2)`. `null` = AĞIRLIK GİRİLMEDİ (vücut ağırlığı
 * hareketi), sıfır DEĞİL; ve rekor hesabı tam bu yüzden ağırlıksız setleri
 * eliyor (0 kg bir rekor olurdu).
 */
export interface WorkoutSetDto {
  id: string;
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  setNo: number;
  reps: number;
  weightKg: string | null;
  /** Algılanan zorluk 1–10. */
  rpe: number | null;
}

const WORKOUT_SELECT = {
  id: true,
  date: true,
  type: true,
  durationMin: true,
  feeling: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const;

const WORKOUT_LIST_SELECT = {
  ...WORKOUT_SELECT,
  _count: { select: { sets: true } },
} as const;

/**
 * ⚠️ `as const` YOK — VE BUNU UYUM KAPISI ÖĞRETTİ.
 *
 * Diğer `SELECT` sabitleri `as const` taşıyor, bu taşımıyor. Sebep ölçüldü:
 * `as const` iç içe `orderBy`ı `readonly [...]` demetine çeviriyor ve Prisma
 * orada MUTABLE bir dizi istiyor — `tsc` "is 'readonly' and cannot be assigned
 * to the mutable type 'WorkoutSetOrderByWithRelationInput[]'" diyerek kırdı.
 *
 * Yani kapı üçüncü kez iş gördü (T-110'da `health-log`, BULGU-025'te
 * hesaplayıcı, şimdi burada): yazdığım sorgunun gerçek istemciye UYMADIĞINI
 * çalışma zamanından önce söyledi. Sabiti `as const` yapmak bir alışkanlıktı,
 * ölçüm değil.
 */
const WORKOUT_DETAIL_SELECT = {
  ...WORKOUT_SELECT,
  sets: {
    select: {
      id: true,
      workoutId: true,
      exerciseId: true,
      setNo: true,
      reps: true,
      weightKg: true,
      rpe: true,
      exercise: { select: { name: true } },
    },
    orderBy: [{ exerciseId: 'asc' as const }, { setNo: 'asc' as const }],
  },
};

interface WorkoutRow {
  id: string;
  date: Date;
  type: string;
  durationMin: number | null;
  feeling: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkoutListRow extends WorkoutRow {
  _count: { sets: number };
}

interface SetRow {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNo: number;
  reps: number;
  weightKg: DecimalLike | null;
  rpe: number | null;
  exercise: { name: string };
}

interface WorkoutDetailRow extends WorkoutRow {
  sets: SetRow[];
}

export interface WorkoutClient {
  workout: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof WORKOUT_LIST_SELECT;
      orderBy: Array<Record<string, 'asc' | 'desc'>>;
      skip?: number;
      take?: number;
    }): Promise<WorkoutListRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: typeof WORKOUT_DETAIL_SELECT;
    }): Promise<WorkoutDetailRow | null>;
    create(args: {
      data: {
        date: Date;
        type: WorkoutType;
        durationMin: number | null;
        feeling: number | null;
        note: string | null;
      };
      select: typeof WORKOUT_SELECT;
    }): Promise<WorkoutRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof WORKOUT_SELECT;
    }): Promise<WorkoutRow>;
    delete(args: { where: { id: string } }): Promise<WorkoutRow>;
  };
  workoutSet: {
    findMany(args: {
      where: { workoutId: string };
      select: { exerciseId: true };
      distinct: ['exerciseId'];
    }): Promise<Array<{ exerciseId: string }>>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. */
const _uyumKontrolu: WorkoutClient = db;
void _uyumKontrolu;

function toDto(row: WorkoutRow): WorkoutDto {
  return {
    id: row.id,
    date: dateToAppDay(row.date),
    type: row.type as WorkoutType,
    durationMin: row.durationMin,
    feeling: row.feeling,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** ⚠️ `Decimal(6,2)` → ölçek 2. `weightKg` DTO'da `string` (ADR-014/D). */
export function toWorkoutSetDto(row: SetRow): WorkoutSetDto {
  return {
    id: row.id,
    workoutId: row.workoutId,
    exerciseId: row.exerciseId,
    exerciseName: row.exercise.name,
    setNo: row.setNo,
    reps: row.reps,
    weightKg: toMeasureString(row.weightKg, 2),
    rpe: row.rpe,
  };
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

/**
 * Filtreyi `where`e çevirir — SAF.
 *
 * `date` bir `@db.Date`, bu yüzden aralık `appDayToDate` ile kuruluyor;
 * `appDayRangeToInstantFilter` BURADA KULLANILMAZ (o `timestamp` sütunlar için).
 */
export function buildWorkoutWhere(filter: WorkoutFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.type) where.type = filter.type;

  if (filter.from || filter.to) {
    where.date = {
      ...(filter.from ? { gte: appDayToDate(filter.from) } : {}),
      ...(filter.to ? { lte: appDayToDate(filter.to) } : {}),
    };
  }

  return where;
}

/**
 * Antrenman listesi — EN YENİ ÖNCE, sayfalı.
 *
 * ⚠️ İKİNCİL ANAHTAR `createdAt`, VE ZORUNLU: `date` `@unique` DEĞİL (bkz.
 * dosya başı). Aynı güne iki antrenman düşerse tek anahtarla sıra belirsiz
 * kalır ve PostgreSQL'in `OFFSET`i aynı satırı iki sayfada gösterebilir —
 * sayfalanmış bir listede satır TEKRARLAR veya ATLAR. `createdAt` bir
 * `timestamp` ve girdi sırasını taşıyor, yani tam da "aynı gün hangisi önce
 * girildi" sorusunu cevaplıyor.
 */
export async function fetchWorkouts(
  filter: WorkoutFilterInput,
  client: WorkoutClient = db,
): Promise<PagedResult<WorkoutListItemDto>> {
  const where = buildWorkoutWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.workout.findMany({
      where,
      select: WORKOUT_LIST_SELECT,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
    client.workout.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, (row) => ({
    ...toDto(row),
    setCount: row._count.sets,
  }));
}

/**
 * Tek antrenman — SETLERİYLE.
 *
 * Setler ayrı bir `fetchWorkoutSets` ile değil BURADA geliyor: bir antrenmanı
 * açmanın tek sebebi setlerini görmek. İki ayrı okuma, ikinci bir gidiş-dönüş
 * ve "setler yükleniyor" ara durumu demekti; ikisi de karşılığı olmayan maliyet.
 *
 * SET SIRASI: egzersiz, sonra `setNo`. Setler egzersiz bazında GRUPLANARAK
 * girilir ("bench 3 set, sonra squat 3 set") ve ekran da öyle okuyor.
 */
export async function fetchWorkoutById(
  id: string,
  client: WorkoutClient = db,
): Promise<WorkoutDetailDto | null> {
  const row = await client.workout.findUnique({ where: { id }, select: WORKOUT_DETAIL_SELECT });
  if (!row) return null;

  return { ...toDto(row), sets: row.sets.map(toWorkoutSetDto) };
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

function bosaNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

export async function createWorkout(
  input: CreateWorkoutInput,
  client: WorkoutClient = db,
): Promise<WorkoutDto> {
  const row = await client.workout.create({
    data: {
      date: appDayToDate(input.date),
      type: input.type,
      durationMin: input.durationMin ?? null,
      feeling: input.feeling ?? null,
      note: bosaNull(input.note),
    },
    select: WORKOUT_SELECT,
  });

  return toDto(row);
}

/**
 * Günceller — KISMİ.
 *
 * ⚠️ `date` DEĞİŞİRSE REKORLARIN GÜNÜ DE DEĞİŞİR, ve bu sessiz bir bağ.
 * `PersonalRecord.date` setin ait olduğu antrenmanın gününden TÜRETİLİYOR
 * (`recalculatePersonalRecords`, `set.workout.date`). Antrenmanın tarihini
 * düzeltmek — "bunu dün yapmıştım" — rekorun kırılma tarihini de düzeltmeli;
 * üstelik EŞİTLİK KIYASI günü kullandığı için (Karar 2) hangi setin rekor
 * olduğu bile değişebilir.
 *
 * Bu yüzden tarih değiştiğinde yeniden hesap ZORUNLU ve tetikleyen taraf eylem
 * (`actions/workout.ts`) — servis yeniden kullanılabilir kalsın (§7.1).
 * `workoutAffectedExerciseIds` tam bunun için var.
 */
export async function updateWorkout(
  input: UpdateWorkoutInput,
  client: WorkoutClient = db,
): Promise<WorkoutDto> {
  const { id, ...fields } = input;

  const row = await client.workout.update({
    where: { id },
    data: {
      ...(fields.date !== undefined ? { date: appDayToDate(fields.date) } : {}),
      ...(fields.type !== undefined ? { type: fields.type } : {}),
      ...(fields.durationMin !== undefined ? { durationMin: fields.durationMin } : {}),
      ...(fields.feeling !== undefined ? { feeling: fields.feeling } : {}),
      ...(fields.note !== undefined ? { note: bosaNull(fields.note) } : {}),
    },
    select: WORKOUT_SELECT,
  });

  return toDto(row);
}

/**
 * ⚠️⚠️ ANTRENMANIN DOKUNDUĞU EGZERSİZLER — SİLMEDEN/DEĞİŞTİRMEDEN ÖNCE OKUNUR.
 *
 * BU FONKSİYONUN VARLIK SEBEBİ BİR SESSİZ HATA SINIFI:
 *
 * `WorkoutSet.workoutId` `onDelete: Cascade`. Yani antrenman silindiğinde
 * setleri veritabanı tarafından yok edilir ve bu yol `workout-set.ts`ten
 * GEÇMEZ — yani rekor yeniden hesabı KENDİLİĞİNDEN tetiklenmez. Hesap
 * çağrılmazsa rekorlar ekranda kalır ve kullanıcı bir daha asla ulaşamayacağı
 * bir rekoru kırmaya çalışır.
 *
 * `PersonalRecord.workoutSetId` `onDelete: SetNull` o anda rekoru AYAKTA ama
 * KAYNAKSIZ bırakıyor — yani tutarsızlık GÖRÜNÜR kalıyor, sessizleşmiyor.
 * ⚠️ Ama `SetNull` korumanın kendisi DEĞİL, ağı (ADR-034'ün kalıbı):
 * tutarsızlığı kapatmak eylemin işi ve eylem bunu şöyle yapıyor —
 *
 *   1. BU fonksiyonla etkilenen egzersizleri topla (silmeden ÖNCE; sonra
 *      setler yok ve soru CEVAPSIZ),
 *   2. antrenmanı sil,
 *   3. her egzersiz için `recalculatePersonalRecords`.
 *
 * Üçü AYNI İŞLEM içinde. Sıra zorunlu ve `distinct` ile her egzersiz BİR KEZ
 * hesaplanıyor (bir antrenmanda aynı harekete 5 set girilir; 5 kez hesaplamak
 * aynı sonucu 5 kez yazmak olurdu).
 */
export async function workoutAffectedExerciseIds(
  workoutId: string,
  client: WorkoutClient = db,
): Promise<string[]> {
  const rows = await client.workoutSet.findMany({
    where: { workoutId },
    select: { exerciseId: true },
    distinct: ['exerciseId'],
  });

  return rows.map((row) => row.exerciseId);
}

/**
 * Antrenmanı SİLER — setleri CASCADE ile gider.
 *
 * Arşiv DEĞİL, ve ölçüt T-038'in ölçütü: `Workout`a bağlı tek FK
 * `WorkoutSet.workoutId` ve o `Cascade`, yani silmenin kıracağı bir referans
 * YOK. (`Exercise`te tersi ölçüldü: `Restrict` bağımlılar vardı, arşiv seçildi.)
 * Ayrıca antrenman bir ÖLÇÜM, referans veri değil — `HealthLog` ile aynı sınıf.
 *
 * ⚠️ REKOR HESABI BURADA DEĞİL: çağıran, silmeden önce
 * `workoutAffectedExerciseIds`i okumuş olmalı ve sildikten sonra hesabı
 * tetiklemeli. Servise koymak mümkün değil — hesaplayıcı `_shared`ta ve
 * `Decimal` dönüştürücüsünü dışarıdan alıyor; ayrıca §7.1 bu sıralamayı
 * eylemin işi sayıyor.
 */
export async function deleteWorkout(
  id: string,
  client: WorkoutClient = db,
): Promise<{ id: string; date: string }> {
  const row = await client.workout.delete({ where: { id } });
  return { id: row.id, date: dateToAppDay(row.date) };
}
