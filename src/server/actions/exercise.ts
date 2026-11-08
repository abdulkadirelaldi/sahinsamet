'use server';

import { archiveExerciseSchema, createExerciseSchema, updateExerciseSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  archiveExercise,
  createExercise,
  updateExercise,
  type ExerciseDto,
} from '@/server/services/exercise';
import {
  buildDiff,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `Exercise` Server Action'ları — §4.2, §7.1, §8.19, T-111.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DENETİM KAYDINA DEĞERLER YAZILIYOR — `HealthLog`UN TERSİ, VE SEBEBİ ÖLÇÜT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-110'da sağlık DEĞERLERİNİ denetim kaydına yazmadım. Burada `buildDiff` ile
 * alanların TAMAMI yazılıyor. Çelişki değil, aynı ölçütün farklı cevabı:
 *
 *   - `HealthLog` bir VÜCUT ÖLÇÜMÜ: KVKK özel nitelikli, tek kullanıcılı
 *     sistemde adli değeri yok, `updatedAt` zaten "ne zaman" sorusunu
 *     cevaplıyor. Yazmak ölçümü ikinci bir mağazaya kopyalamaktı.
 *   - `Exercise` bir REFERANS VERİ KAYDI — "Bench Press, GÖĞÜS, BARBELL".
 *     Hassas değil, kişisel değil, ve "bu hareketin kas grubunu kim
 *     değiştirdi" MEŞRU bir soru: kas grubu rapor ve filtre anahtarı, yanlış
 *     değiştirilirse geçmiş sessizce yanlış gruplanır.
 *
 * Yani F3'ün içerik varlıklarıyla aynı sınıf (`skill`, `service`) ve kuralı da
 * onlarla aynı.
 *
 * ⚠️ SİLME EYLEMİ YOK — arşivleme var. Gerekçe `services/exercise.ts`te:
 * `WorkoutSet.exerciseId` ve `PersonalRecord.exerciseId` ikisi de `Restrict`,
 * yani silme ZATEN mümkün değil (P2003). Bir silme eylemi yazmak, kullanıcıya
 * asla çalışmayacak bir düğme vermek olurdu.
 *
 * `revalidateTag` YOK — ADR-029 taraması `services/exercise.ts`te.
 */

const ZATEN_VAR = {
  message: 'Bu adla bir egzersiz zaten var. Aynı hareketi iki kez eklemek rekorları böler.',
  fields: { name: 'Bu egzersiz adı zaten kullanılıyor.' },
};

export async function createExerciseAction(raw: unknown): Promise<ApiResponse<ExerciseDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createExerciseSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createExercise(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Exercise',
        entityId: dto.id,
        diff: buildDiff(null, parsed.data),
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('exercise:create', error, { conflict: ZATEN_VAR });
  }
}

export async function updateExerciseAction(raw: unknown): Promise<ApiResponse<ExerciseDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateExerciseSchema, raw);
  if (!parsed.ok) return parsed.failure;

  // `id` diff'e GİRMEZ: kimlik `entityId`de ve diff'te tekrarlamak gürültü.
  const { id: _id, ...fields } = parsed.data;

  try {
    const dto = await updateExercise(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Exercise',
        entityId: dto.id,
        diff: buildDiff(null, fields),
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('exercise:update', error, { conflict: ZATEN_VAR });
  }
}

/**
 * Arşivler veya arşivden çıkarır.
 *
 * ⚠️ DENETİM EYLEMİ `UPDATE`, `DELETE` DEĞİL — ve bu bilinçli. Arşivlemek bir
 * silme değil; `DELETE` yazmak denetim ekranında kaydın yok olduğunu
 * söylerdi, oysa egzersiz ve tüm rekorları YERİNDE. `isArchived` diff'te
 * görünüyor, yani hangi yöne gidildiği okunabilir.
 */
export async function archiveExerciseAction(raw: unknown): Promise<ApiResponse<ExerciseDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(archiveExerciseSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await archiveExercise(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Exercise',
        entityId: dto.id,
        diff: { isArchived: parsed.data.isArchived },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('exercise:archive', error);
  }
}
