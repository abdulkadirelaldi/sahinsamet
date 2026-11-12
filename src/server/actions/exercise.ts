'use server';

import { archiveExerciseSchema, createExerciseSchema, updateExerciseSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  archiveExercise,
  createExercise,
  EgzersizCakismasi,
  hizliEgzersizEkle,
  updateExercise,
  type ExerciseDto,
} from '@/server/services/exercise';
import {
  buildDiff,
  fail,
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

/**
 * Ad çakışması → CONFLICT (2026-11-12). Çakışan hareket ARŞİVDEYSE bunu SÖYLER ve kimliğini
 * `fields.arsivdekiId`de verir: form "Arşivden çıkar" düğmesi gösterir. Eskiden yalnızca
 * "zaten var" deniyordu, hareket listede görünmüyordu ve sahibi çıkmaza giriyordu.
 * (`arsivdekiId` form alanı değil — kabuk şemada olmayan anahtarı alana basmıyor.)
 */
function cakisma(error: EgzersizCakismasi) {
  const { mevcut } = error;
  if (!mevcut.isArchived) {
    return fail('CONFLICT', ZATEN_VAR.message, {
      name: `“${mevcut.name}” adlı hareket zaten var.`,
    });
  }
  const mesaj = `“${mevcut.name}” arşivde. Yeniden eklemek yerine arşivden çıkarabilirsin.`;
  return fail('CONFLICT', mesaj, { name: mesaj, arsivdekiId: mevcut.id });
}

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
    if (error instanceof EgzersizCakismasi) return cakisma(error);
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
    if (error instanceof EgzersizCakismasi) return cakisma(error);
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

/**
 * Seçicilerden "yeni hareket" (2026-11-12): oluşturur, ya da aynı adlı hareketi döndürür
 * (arşivdeyse arşivden çıkarır). Denetim yalnızca bir şey DEĞİŞTİYSE yazılır.
 */
export async function hizliEgzersizEkleAction(
  raw: unknown,
): Promise<ApiResponse<{ egzersiz: ExerciseDto; durum: 'yeni' | 'mevcut' | 'arsivden' }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createExerciseSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await hizliEgzersizEkle(parsed.data);
    if (sonuc.durum !== 'mevcut') {
      await writeAuditLog(
        {
          actorId,
          action: sonuc.durum === 'yeni' ? 'CREATE' : 'UPDATE',
          entity: 'Exercise',
          entityId: sonuc.egzersiz.id,
          diff: sonuc.durum === 'yeni' ? buildDiff(null, parsed.data) : { isArchived: false },
        },
        db,
      );
    }
    return ok(sonuc);
  } catch (error) {
    return toFailure('exercise:hizli', error, { conflict: ZATEN_VAR });
  }
}
