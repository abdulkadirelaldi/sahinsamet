'use server';

import { createWorkoutSetSchema, entityIdSchema, updateWorkoutSetSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import type { RecalculateResult } from '@/server/services/_shared';
import { rekorDenetle } from '@/server/services/spor-gelisim';
import {
  createWorkoutSet,
  deleteWorkoutSet,
  updateWorkoutSet,
  type SetMutationResult,
  type WorkoutSetClient,
} from '@/server/services/workout-set';
import {
  buildDiff,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `WorkoutSet` Server Action'ları — §4.2, §7.1, ADR-021, T-111.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ MUTASYON VE REKOR HESABI AYNI İŞLEM İÇİNDE — AYRILMAZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Her set mutasyonu rekor hesabını tetikliyor (Karar 1) ve ikisi tek bir
 * `$transaction` içinde koşuyor.
 *
 * ⚠️ AYRI OLSALARDI ÜRETİLECEK HATA, HESABI HİÇ YAPMAMAKTAN DAHA KÖTÜ: set
 * yazılmış, hesap patlamış, kullanıcı "kaydedildi" cevabını almış olurdu.
 * Rekorlar eski değerde kalır, hiçbir yerde iz yoktur ve tutarsızlık bir
 * sonraki mutasyona kadar — belki haftalarca — sürer. İşlem içinde ise hesap
 * patlarsa SET DE YAZILMAZ: kullanıcı hata görür, veri tutarlı kalır.
 *
 * ÜÇ PR KARARININ GEREKÇESİ `services/_shared/personal-record.ts`in başında.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DENETİM KAYDI — SET DEĞERLERİ YAZILIYOR, VE `HealthLog`UN TERSİ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * T-110'da sağlık değerlerini yazmadım; burada `reps`/`weightKg` yazılıyor.
 * Aynı ölçüt, farklı cevap: bir set PERFORMANS kaydıdır, vücut ölçümü değil.
 * KVKK özel nitelikli veri kategorisine girmiyor ("100 kg kaldırdım" ile
 * "82,5 kg'ım" aynı sınıf değil), ve "bu rekoru doğuran set neydi" MEŞRU bir
 * soru — rekor türetilmiş olduğu için kaynağın izi denetim değeri taşıyor.
 *
 * ⚠️ VE HESABIN SONUCU DA YAZILIYOR (`recordsRecalculated`). ADR-022'nin
 * kuralı: eylemler SONUÇTUR. Bir set eklemenin sonucu yalnızca satır değil,
 * rekorların DEĞİŞMESİ. "3 set girdim ve 1 rekor kırdım" denetim kaydından
 * okunabiliyor; sayı yazılıyor, rekorların kendisi YAZILMIYOR (onlar
 * `PersonalRecord` tablosunda ve orada güncel).
 *
 * `revalidateTag` YOK — ADR-029 taraması `services/exercise.ts`te.
 */

interface TransactionCapableClient {
  $transaction<T>(work: (tx: WorkoutSetClient) => Promise<T>): Promise<T>;
}

/** İşlem sarmalayıcısı — gerekçe `actions/workout.ts`te (aynı kalıp). */
function runInTransaction<T>(work: (tx: WorkoutSetClient) => Promise<T>): Promise<T> {
  return (db as unknown as TransactionCapableClient).$transaction(work);
}

const SET_ZATEN_VAR = {
  message:
    'Bu antrenmanda bu hareketin bu set numarası zaten girilmiş. Mevcut seti düzeltin veya sonraki numarayı kullanın.',
  fields: { setNo: 'Bu set numarası zaten kullanılıyor.' },
};

/**
 * Hesap sonucunu denetim kaydına koyar — SAYI, rekorların kendisi değil.
 *
 * ⚠️ ALANLAR DÜZ, İÇ İÇE DEĞİL — ve bunu T-053'ün okuyucusu ÖLÇTÜRDÜ.
 * `{ recordsRecalculated: { upserted, removed } }` yazmıştım; `toDiffSummary`
 * iç içe nesneleri DÜZLEŞTİRİYOR, yani denetim ekranında
 * `recordsRecalculated.upserted` ve `...removed` diye İKİ SATIR görünürdü.
 * Düz iki alan aynı bilgiyi taşıyor ve ekranda okunur kalıyor.
 */
function recordsDiff(records: RecalculateResult): Record<string, unknown> {
  return { recordsUpserted: records.upserted, recordsRemoved: records.removed };
}

export async function createWorkoutSetAction(
  raw: unknown,
): Promise<ApiResponse<SetMutationResult & { yeniRekor: boolean }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createWorkoutSetSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await runInTransaction((tx) => createWorkoutSet(parsed.data, tx));

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'WorkoutSet',
        entityId: sonuc.set.id,
        diff: { ...buildDiff(null, parsed.data), ...recordsDiff(sonuc.records) },
      },
      db,
    );

    // Set yazıldı: rekor denetimi bozulsa da kayıt başarılı sayılır.
    const yeniRekor = await rekorDenetle(actorId, sonuc.set).catch(() => false);

    return ok({ ...sonuc, yeniRekor });
  } catch (error) {
    /*
     * P2002 → `@@unique([workoutId, exerciseId, setNo])`.
     * P2003 → `workoutId` veya `exerciseId` yok. `cuidSchema` yalnızca BİÇİMİ
     * doğruluyor, varlığı doğrulamıyor (T-051/B'nin ölçtüğü sınıf); varsayılan
     * P2003 metni eklentiye özeldi ("Seçilen dosya bulunamadı") ve burada
     * anlamsız kalırdı.
     */
    return toFailure('workoutSet:create', error, {
      conflict: SET_ZATEN_VAR,
      foreignKey: {
        message: 'Seçilen antrenman veya egzersiz bulunamadı. Sayfayı yenileyip tekrar seçin.',
        fields: { exerciseId: 'Seçilen egzersiz bulunamadı.' },
      },
    });
  }
}

/**
 * Seti günceller; rekorlar yeniden hesaplanır.
 *
 * ⚠️ `exerciseId` DEĞİŞİRSE İKİ EGZERSİZ ETKİLENİR ve servis bunu kendi
 * içinde hallediyor (eski `exerciseId`yi mutasyondan ÖNCE okuyor). Tek
 * egzersiz için hesaplamak, listedeki en sinsi sessiz hata olurdu: rekor
 * YANLIŞ HAREKETTE durmaya devam ederdi.
 */
export async function updateWorkoutSetAction(
  raw: unknown,
): Promise<ApiResponse<SetMutationResult>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateWorkoutSetSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const { id, ...fields } = parsed.data;

  try {
    const sonuc = await runInTransaction((tx) => updateWorkoutSet(parsed.data, tx));

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'WorkoutSet',
        entityId: id,
        diff: { ...buildDiff(null, fields), ...recordsDiff(sonuc.records) },
      },
      db,
    );

    return ok(sonuc);
  } catch (error) {
    return toFailure('workoutSet:update', error, {
      conflict: SET_ZATEN_VAR,
      foreignKey: {
        message: 'Seçilen antrenman veya egzersiz bulunamadı. Sayfayı yenileyip tekrar seçin.',
        fields: { exerciseId: 'Seçilen egzersiz bulunamadı.' },
      },
    });
  }
}

/**
 * Seti SİLER; rekorlar yeniden hesaplanır.
 *
 * Karar 3'ün uygulandığı yer. Son 5 tekrarlık setini silen kullanıcı 5RM
 * rekorunu ekranda GÖRMEYE DEVAM ETMEZ — ADR-021'in kapatmak istediği sessiz
 * hata budur ve `recordsRemoved` kullanıcıya ne olduğunu da SÖYLÜYOR
 * ("1 rekor kaldırıldı"), sessizce yapmıyor.
 */
export async function deleteWorkoutSetAction(
  raw: unknown,
): Promise<ApiResponse<{ id: string; recordsRemoved: number }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await runInTransaction((tx) => deleteWorkoutSet(parsed.data.id, tx));

    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'WorkoutSet',
        entityId: sonuc.id,
        diff: { workoutId: sonuc.workoutId, ...recordsDiff(sonuc.records) },
      },
      db,
    );

    return ok({ id: sonuc.id, recordsRemoved: sonuc.records.removed });
  } catch (error) {
    return toFailure('workoutSet:delete', error);
  }
}
