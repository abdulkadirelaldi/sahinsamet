'use server';

import { guvenliHata } from '@/lib/security/guvenli-log';
import { sporIsaretiniGeriAl } from '@/server/services/habit-gun';
import { createWorkoutSchema, entityIdSchema, updateWorkoutSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import { dateToAppDay } from '@/server/services/_shared';
import {
  createWorkout,
  deleteWorkout,
  updateWorkout,
  workoutAffectedExerciseIds,
  type WorkoutClient,
  type WorkoutDto,
} from '@/server/services/workout';
import { recalculateForExercises, type WorkoutSetClient } from '@/server/services/workout-set';
import {
  buildDiff,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `Workout` Server Action'ları — §4.2, §7.1, ADR-021, T-111.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ CASCADE'İN AÇTIĞI DELİK BURADA KAPANIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `WorkoutSet.workoutId` `onDelete: Cascade`. Yani antrenman silindiğinde
 * setleri VERİTABANI tarafından yok edilir ve bu yol `workout-set.ts`in
 * mutasyonlarından GEÇMEZ — rekor yeniden hesabı kendiliğinden tetiklenmez.
 *
 * ⚠️ TETİKLENMEZSE OLAN ŞEY, ADR-021'in "F5'in en olası sessiz hatası" dediği
 * şeyin tam kendisi: antrenman silinir, rekorlar ekranda kalır, kullanıcı bir
 * daha asla ulaşamayacağı bir rekoru kırmaya çalışır ve neden kıramadığını
 * anlamaz.
 *
 * SIRA ZORUNLU ve üçü AYNI İŞLEM içinde:
 *   1. Etkilenen egzersizleri OKU — silmeden ÖNCE. Sonra setler yok ve soru
 *      CEVAPSIZ; "hangi hareketlerin rekoru etkilendi" bilgisi kaybolur.
 *   2. Antrenmanı sil (setler cascade ile gider).
 *   3. Her egzersiz için rekorları yeniden hesapla.
 *
 * `PersonalRecord.workoutSetId` `onDelete: SetNull` bu üçlünün YERİNE GEÇMEZ;
 * adım 3 düşerse hatanın GÖRÜNÜR kalmasını sağlar (rekor kaynaksız kalır).
 * ADR-034'ün kalıbı: emniyet ağı, korumanın kendisi değil.
 *
 * ⚠️ TARİH DEĞİŞİKLİĞİ DE HESAP GEREKTİRİYOR ve bu daha sinsi: `PersonalRecord.
 * date` setin antrenmanının gününden TÜRETİLİYOR, ve eşitlik kıyası günü
 * kullandığı için (Karar 2 — "önce olan gün kazanır") hangi setin rekor olduğu
 * bile değişebilir. Antrenmanın tarihini düzeltmek rekorun tarihini de
 * düzeltmeli.
 *
 * `revalidateTag` YOK — ADR-029 taraması `services/exercise.ts`te.
 */

/**
 * İşlem sarmalayıcısı — ENJEKTE EDİLEBİLİR (T-100'ün `job.ts` kalıbı).
 *
 * `db.$transaction`ı doğrudan çağırmak, testi Prisma'nın etkileşimli işlem
 * uygulamasını taklit etmeye zorlardı (`pnpm test` DB'siz koşar). Sarmalayıcıyı
 * dışarı almak, testin "işlem içinde koşuyormuş gibi" davranan sade bir işlev
 * geçirmesini sağlıyor — ve GERÇEK kod yolu değişmiyor.
 */
type TxClient = WorkoutClient & WorkoutSetClient;

interface TransactionCapableClient {
  $transaction<T>(work: (tx: TxClient) => Promise<T>): Promise<T>;
}

function runInTransaction<T>(work: (tx: TxClient) => Promise<T>): Promise<T> {
  return (db as unknown as TransactionCapableClient).$transaction(work);
}

export async function createWorkoutAction(raw: unknown): Promise<ApiResponse<WorkoutDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createWorkoutSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createWorkout(parsed.data);

    /*
     * ⚠️ REKOR HESABI YOK, VE GEREKMİYOR: yeni antrenmanın HENÜZ SETİ YOK.
     * Hesap, set eklenince `createWorkoutSetAction` tarafından tetiklenecek.
     * Burada çağırmak, hiçbir şeyi değiştirmeyen bir tarama olurdu.
     */
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Workout',
        entityId: dto.id,
        diff: buildDiff(null, parsed.data),
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('workout:create', error);
  }
}

/**
 * Antrenmanı günceller; TARİH DEĞİŞTİYSE rekorları da yeniden hesaplar.
 *
 * ⚠️ HESAP KOŞULLU ve koşul `date`: diğer alanlar (`type`, `durationMin`,
 * `feeling`, `note`) rekor hesabına HİÇ girmiyor, yani onlar için tarama
 * yapmak karşılığı olmayan bir maliyet olurdu. `date` ise rekorun GÜNÜNÜ ve
 * eşitlik kıyasının sonucunu belirliyor.
 */
export async function updateWorkoutAction(raw: unknown): Promise<ApiResponse<WorkoutDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateWorkoutSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const { id, ...fields } = parsed.data;
  const tarihDegisti = fields.date !== undefined;

  try {
    const { dto, records } = await runInTransaction(async (tx) => {
      const guncel = await updateWorkout(parsed.data, tx);

      if (!tarihDegisti) return { dto: guncel, records: null };

      const exerciseIds = await workoutAffectedExerciseIds(id, tx);
      const sonuc = await recalculateForExercises(exerciseIds, tx);

      return { dto: guncel, records: sonuc };
    });

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Workout',
        entityId: dto.id,
        diff: {
          ...buildDiff(null, fields),
          /*
           * Hesabın SONUCU denetim kaydında: "tarihi düzelttim ve 3 rekor
           * değişti" okunabilir olsun. ⚠️ Rekorların KENDİSİ yazılmıyor —
           * sayı yeterli ve rekorlar zaten `PersonalRecord` tablosunda.
           *
           * ⚠️ ALANLAR DÜZ: `toDiffSummary` iç içe nesneleri düzleştiriyor,
           * yani iç içe yazmak denetim ekranında iki tuhaf satır üretirdi
           * (gerekçe `actions/workout-set.ts`te).
           */
          ...(records
            ? { recordsUpserted: records.upserted, recordsRemoved: records.removed }
            : {}),
        },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('workout:update', error);
  }
}

/**
 * Antrenmanı SİLER — setleri cascade ile gider, rekorlar yeniden hesaplanır.
 *
 * Üç adımın sırası ve gerekçesi dosya başında. ⚠️ Adım 1 adım 2'den ÖNCE
 * olmak ZORUNDA ve bu testle kilitli.
 */
export async function deleteWorkoutAction(
  raw: unknown,
): Promise<ApiResponse<{ id: string; recordsRemoved: number }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    // Silmeden önce: o günün spor alışkanlığı işareti antrenmanla birlikte geri alınacak.
    const silinecek = await db.workout.findUnique({
      where: { id: parsed.data.id },
      select: { date: true },
    });
    const { silinen, records } = await runInTransaction(async (tx) => {
      // 1. SİLMEDEN ÖNCE — sonra bu soru cevapsız kalır.
      const exerciseIds = await workoutAffectedExerciseIds(parsed.data.id, tx);

      // 2. Setler CASCADE ile gidiyor.
      const sonuc = await deleteWorkout(parsed.data.id, tx);

      // 3. Cascade'in tetiklemediği hesap — delik burada kapanıyor.
      const hesap = await recalculateForExercises(exerciseIds, tx);

      return { silinen: sonuc, records: hesap };
    });

    if (silinecek) {
      // Alışkanlık düzeltilemese de antrenman silinmiştir; hata kayda geçer.
      await sporIsaretiniGeriAl(dateToAppDay(silinecek.date)).catch((error: unknown) =>
        guvenliHata(
          '[spor] işaret geri alınamadı:',
          error instanceof Error ? error.message : error,
        ),
      );
    }

    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'Workout',
        entityId: silinen.id,
        diff: {
          day: silinen.date,
          recordsUpserted: records.upserted,
          recordsRemoved: records.removed,
        },
      },
      db,
    );

    return ok({ id: silinen.id, recordsRemoved: records.removed });
  } catch (error) {
    return toFailure('workout:delete', error);
  }
}
