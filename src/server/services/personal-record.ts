import type { PersonalRecordFilterInput } from '@/lib/schemas';
import { db } from '@/server/db';
import type { MuscleGroup } from '@/types';

import {
  dateToAppDay,
  panelSkipTake,
  toMeasureString,
  toPagedResult,
  type DecimalLike,
} from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `PersonalRecord` servisi — §4.2 "PR takibi", ADR-021, T-111.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ YALNIZCA OKUMA — VE BU BİR KARAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu dosyada `createPersonalRecord` / `updatePersonalRecord` YOK, oysa şema
 * (T-011) `createPersonalRecordSchema` ve `updatePersonalRecordSchema` taşıyor.
 * Eksik değil, KARAR:
 *
 * PR TÜRETİLMİŞ veridir (ADR-021). Elle yazma yolu açmak, türetilmiş bir alanı
 * elle değiştirilebilir yapmak demekti — ve sonucu ADR-014'ün `baseAmount` için
 * reddettiği şeyin aynısı: bir sonraki yeniden hesap elle girilen değeri SESSİZCE
 * EZER. Kullanıcı rekorunu düzeltir, bir set ekler, düzeltmesi kaybolur. Hiçbir
 * yerde iz kalmaz.
 *
 * Rekor DÜZELTMENİN doğru yolu kaynağı düzeltmek: yanlış set düzeltilir veya
 * silinir, hesap rekoru takip eder (Karar 3). Yani elle yazma yolunun
 * karşılayacağı meşru bir ihtiyaç YOK.
 *
 * ⚠️ İKİ ŞEMA BU YÜZDEN BAĞLANMAMIŞ DURUMDA. Güvenlik'in ulaşılabilirlik kapısı
 * yalnızca `src/server` ihraçlarını izliyor, `src/lib/schemas`ı izlemiyor — yani
 * kapı bunu ötmez. Devri raporda yazılı: T-112'ye BIRAKILMIYOR, hiç
 * gerekmiyor; şemalar silinmedi çünkü silmek migration değil ama T-010'un
 * sözleşmesini değiştirmek olurdu ve kararın sahibi ben değilim.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ TARİH YARDIMCISI: `date` BİR `@db.Date` → `dateToAppDay`
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Okuma yönü, yani `dateToAppDay`. YAZMA yönü (`appDayToDate`) bu dosyada YOK
 * çünkü yazma yolu yok — rekorun günü `_shared/personal-record.ts`te
 * yazılıyor ve orada da `appDayToDate` kullanılıyor (T-111'de elle kurulan
 * `new Date(...)` oradan kaldırıldı).
 *
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — gerekçe `exercise.ts`te.
 */

export interface PersonalRecordDto {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  reps: number;
  /** `Decimal(6,2)` → `string` (ADR-014/D). Rekorda `null` YOK — sütun zorunlu. */
  weightKg: string;
  /** Rekorun kırıldığı gün (`YYYY-MM-DD`) — `@db.Date`. */
  date: string;
  /**
   * Kaynak set — `null` OLABİLİR ve bu bir HATA DEĞİL, bir İŞARET.
   *
   * `onDelete: SetNull`: antrenman silindiğinde setler CASCADE ile gider ve
   * rekor kaynaksız kalır. Normal akışta bu durum oluşmaz — `deleteWorkout`
   * sonrası hesap rekoru düzeltir — ama o çağrı düşerse `null` tutarsızlığı
   * GÖRÜNÜR kılar. DTO'da taşınıyor ki görünür kalsın.
   */
  workoutSetId: string | null;
  createdAt: string;
  updatedAt: string;
}

const RECORD_SELECT = {
  id: true,
  exerciseId: true,
  reps: true,
  weightKg: true,
  date: true,
  workoutSetId: true,
  createdAt: true,
  updatedAt: true,
  exercise: { select: { name: true, muscleGroup: true } },
} as const;

interface RecordRow {
  id: string;
  exerciseId: string;
  reps: number;
  weightKg: DecimalLike;
  date: Date;
  workoutSetId: string | null;
  createdAt: Date;
  updatedAt: Date;
  exercise: { name: string; muscleGroup: string };
}

export interface PersonalRecordReadClient {
  personalRecord: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof RECORD_SELECT;
      orderBy: Array<Record<string, 'asc' | 'desc'>>;
      skip?: number;
      take?: number;
    }): Promise<RecordRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. */
const _uyumKontrolu: PersonalRecordReadClient = db;
void _uyumKontrolu;

/**
 * ⚠️ `weightKg` NON-NULL ASSERTION İLE DEĞİL, SÜTUN ZORUNLU OLDUĞU İÇİN
 * `string`.
 *
 * `toMeasureString` `null` kabul ettiği için `string | null` döner, ama
 * `PersonalRecord.weightKg` `Decimal` (opsiyonel DEĞİL) — yani `null` gelmesi
 * mümkün değil. Yine de `??` ile bir taban veriliyor: `!` koymak, bir gün sütun
 * nullable yapılırsa SESSİZCE `null` sızdırırdı.
 */
function toDto(row: RecordRow): PersonalRecordDto {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    exerciseName: row.exercise.name,
    muscleGroup: row.exercise.muscleGroup as MuscleGroup,
    reps: row.reps,
    weightKg: toMeasureString(row.weightKg, 2) ?? '0.00',
    date: dateToAppDay(row.date),
    workoutSetId: row.workoutSetId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Filtreyi `where`e çevirir — SAF. */
export function buildPersonalRecordWhere(
  filter: PersonalRecordFilterInput,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.exerciseId) where.exerciseId = filter.exerciseId;
  if (filter.reps !== undefined) where.reps = filter.reps;

  return where;
}

/**
 * Rekor listesi — sayfalı.
 *
 * SIRA: egzersiz, sonra TEKRAR ARTAN. `reps` artan bilinçli: 1RM, 3RM, 5RM,
 * 10RM okunurken doğal sıra bu ve ağırlık azalan yönde gider. Ağırlığa göre
 * sıralamak rekorları karıştırırdı — 100×1 ile 100×10 yan yana düşer ve hangisi
 * hangi kategorinin rekoru olduğu kaybolur (ADR-021'in tekrar bazındalığının
 * görsel karşılığı).
 *
 * İkincil anahtar BELİRLİ: `@@unique([exerciseId, reps])`, yani (egzersiz, reps)
 * çifti tekil ve sıra belirsiz kalamaz.
 */
export async function fetchPersonalRecords(
  filter: PersonalRecordFilterInput,
  client: PersonalRecordReadClient = db,
): Promise<PagedResult<PersonalRecordDto>> {
  const where = buildPersonalRecordWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.personalRecord.findMany({
      where,
      select: RECORD_SELECT,
      orderBy: [{ exerciseId: 'asc' }, { reps: 'asc' }],
      skip,
      take,
    }),
    client.personalRecord.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toDto);
}

/**
 * Bir egzersizin TÜM rekorları — sayfalama YOK, kronolojik DEĞİL, tekrar bazlı.
 *
 * Listeden ayrı bir okuma ve sebebi `fetchHealthTrend`in sebebiyle aynı sınıf:
 * iki yüzeyin sorusu farklı. Liste "hangi rekorlarım var" diye soruyor
 * (sayfalı); bu "şu hareketteki rekor eğrim ne" diye soruyor ve bunun için
 * egzersizin REKORLARININ TAMAMI gerekiyor.
 *
 * ÜST SINIR GEREKMİYOR ve bu ölçülebilir bir fark: rekor sayısı `reps`
 * değerlerinin SAYISI kadar — `@@unique([exerciseId, reps])` tavanı koyuyor ve
 * pratikte 1–20 arası. `fetchHealthTrend`te sınır gerekmişti çünkü orada satır
 * sayısı GÜN sayısıyla büyüyordu (beş yıl = 1825 satır); burada set geçmişi ne
 * kadar büyürse büyüsün rekor sayısı büyümüyor.
 */
export async function fetchRecordsForExercise(
  exerciseId: string,
  client: PersonalRecordReadClient = db,
): Promise<PersonalRecordDto[]> {
  const rows = await client.personalRecord.findMany({
    where: { exerciseId },
    select: RECORD_SELECT,
    orderBy: [{ reps: 'asc' }],
  });

  return rows.map(toDto);
}
