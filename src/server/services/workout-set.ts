import type { CreateWorkoutSetInput, UpdateWorkoutSetInput } from '@/lib/schemas';
import { db } from '@/server/db';

import {
  recalculatePersonalRecords,
  toMeasureString,
  type DecimalLike,
  type PersonalRecordClient,
  type RecalculateResult,
} from './_shared';
import { toWorkoutSetDto, type WorkoutSetDto } from './workout';

/**
 * `WorkoutSet` servisi — §4.2, ADR-021, T-111.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ BU DOSYA REKOR HESABININ TEK TETİKLEYİCİSİ (set yolu için)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Her set mutasyonu — EKLEME, DÜZELTME, SİLME — rekorları yeniden hesaplatır.
 * Üç PR kararının GEREKÇESİ `_shared/personal-record.ts`in başında; burada
 * UYGULANIŞI var. Özet:
 *   Karar 1 — hesap her mutasyonda SIFIRDAN, "kırıldı mı" diye sorulmuyor.
 *   Karar 2 — eşitlik rekor değil (önce olan gün kazanır); aynı ağırlıkta bir
 *             tekrar fazla AYRI bir rekor (tekrar bazındalık).
 *   Karar 3 — kaynağı kalmayan rekor SİLİNİR; düzeltme geriye işler.
 *
 * ⚠️ HESAP MUTASYONLA AYNI İŞLEM İÇİNDE. Ayrı olsaydı, hesap patladığında set
 * yazılmış ama rekorlar eski kalmış olurdu — ve bu, hesabı hiç yapmamaktan
 * DAHA kötü: kullanıcı "kaydettim" cevabını alır, veri tutarsızdır ve hiçbir
 * yerde iz yoktur.
 *
 * ⚠️ DÜZELTMEDE İKİ EGZERSİZ ETKİLENEBİLİR. Set `exerciseId`si değişirse
 * (yanlış hareket seçilmiş) ESKİ egzersizin rekoru da düşmeli — o setin orada
 * bıraktığı rekor artık dayanaksız. Bu yüzden `updateWorkoutSet` eski
 * `exerciseId`yi mutasyondan ÖNCE okuyor ve iki egzersiz için de hesaplıyor.
 * Tek egzersiz için hesaplamak, listedeki en sinsi sessiz hata olurdu: rekor
 * YANLIŞ HAREKETTE durmaya devam ederdi.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — gerekçe `exercise.ts`te.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** `WorkoutSet.weightKg` `Decimal(6,2)` — DTO sınırında ölçek 2 (ADR-014/D). */
const WEIGHT_SCALE = 2;

const SET_SELECT = {
  id: true,
  workoutId: true,
  exerciseId: true,
  setNo: true,
  reps: true,
  weightKg: true,
  rpe: true,
  exercise: { select: { name: true } },
} as const;

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

export interface WorkoutSetClient extends PersonalRecordClient {
  workoutSet: PersonalRecordClient['workoutSet'] & {
    findUnique(args: {
      where: { id: string };
      select: { exerciseId: true };
    }): Promise<{ exerciseId: string } | null>;
    create(args: {
      data: {
        workoutId: string;
        exerciseId: string;
        setNo: number;
        reps: number;
        weightKg: string | null;
        rpe: number | null;
      };
      select: typeof SET_SELECT;
    }): Promise<SetRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof SET_SELECT;
    }): Promise<SetRow>;
    delete(args: {
      where: { id: string };
      select: { id: true; exerciseId: true; workoutId: true };
    }): Promise<{ id: string; exerciseId: string; workoutId: string }>;
  };
}

/**
 * ⚠️ UYUM KAPISI — VE `PersonalRecordClient` İÇİN DE GEÇERLİ.
 *
 * `WorkoutSetClient` `PersonalRecordClient`ı GENİŞLETİYOR, yani bu tek atama
 * hesaplayıcının dar arayüzünü de doğruluyor. BULGU-025'i yakalayan şey tam
 * olarak buydu: hesaplayıcının sorgusu `workout.date` iddia ediyordu ama
 * `select` yazmıyordu ve `tsc` burada kırıldı.
 *
 * Kapı `_shared/personal-record.ts`e KONULAMAZ: o dosya `@/server/db` çekmiyor
 * ve çekmemeli — `prisma/seed.ts` ve §13.5 cron düz Node ile `_shared`ı okuyor
 * (BULGU-012). Yani kapının yeri, hesaplayıcıyı Prisma'ya BAĞLAYAN dosya:
 * burası.
 */
const _uyumKontrolu: WorkoutSetClient = db;
void _uyumKontrolu;

/**
 * Ham `Decimal`i hesaplayıcının beklediği dizeye çevirir.
 *
 * Hesaplayıcı bunu PARAMETRE olarak alıyor (`toWeightString`) çünkü `_shared`
 * saf kalmalı ve `Decimal` dönüşümü sütunun ölçeğine bağlı — hesaplayıcı
 * ölçeği bilemez, çağıran bilir.
 */
function toWeightString(value: unknown): string | null {
  return toMeasureString(value as DecimalLike | null, WEIGHT_SCALE);
}

/** Hesabı tetikler — çağıran egzersizi bilir. */
async function recalculate(
  exerciseId: string,
  client: WorkoutSetClient,
): Promise<RecalculateResult> {
  return recalculatePersonalRecords(exerciseId, client, toWeightString);
}

/**
 * Birden çok egzersiz için hesaplar — HER BİRİ BİR KEZ.
 *
 * `Set` ile tekilleştiriliyor: bir antrenmanda aynı harekete 5 set girilir ve
 * 5 kez hesaplamak aynı sonucu 5 kez yazmak olurdu.
 */
export async function recalculateForExercises(
  exerciseIds: readonly string[],
  client: WorkoutSetClient = db,
): Promise<RecalculateResult> {
  const toplam: RecalculateResult = { upserted: 0, removed: 0 };

  for (const exerciseId of new Set(exerciseIds)) {
    const sonuc = await recalculate(exerciseId, client);
    toplam.upserted += sonuc.upserted;
    toplam.removed += sonuc.removed;
  }

  return toplam;
}

export interface SetMutationResult {
  set: WorkoutSetDto;
  /** Hesabın sonucu — eylem bunu denetim kaydına yazıyor. */
  records: RecalculateResult;
}

/**
 * Set ekler ve rekorları yeniden hesaplar.
 *
 * `@@unique([workoutId, exerciseId, setNo])` — aynı antrenmanda aynı hareketin
 * aynı set numarası iki kez girilemez. P2002 eylemde CONFLICT'e çevriliyor:
 * sessizce ikinci bir satır yazmak, set sayısını ve dolayısıyla hacim
 * hesaplarını bozardı.
 */
export async function createWorkoutSet(
  input: CreateWorkoutSetInput,
  client: WorkoutSetClient = db,
): Promise<SetMutationResult> {
  const row = await client.workoutSet.create({
    data: {
      workoutId: input.workoutId,
      exerciseId: input.exerciseId,
      setNo: input.setNo,
      reps: input.reps,
      weightKg: input.weightKg ?? null,
      rpe: input.rpe ?? null,
    },
    select: SET_SELECT,
  });

  const records = await recalculate(row.exerciseId, client);

  return { set: toWorkoutSetDto(row), records };
}

/**
 * Seti günceller ve rekorları yeniden hesaplar — KISMİ.
 *
 * ⚠️ ESKİ `exerciseId` MUTASYONDAN ÖNCE OKUNUYOR. Set başka bir harekete
 * taşınırsa (yanlış egzersiz seçilmiş) ESKİ egzersizin rekoru da dayanaksız
 * kalır. Sonra okumak imkânsız: satır artık yeni egzersizi gösteriyor ve eski
 * bağ KAYBOLMUŞ olur.
 *
 * ⚠️ `weightKg` İÇİN `null` GEÇERLİ BİR DEĞER, "dokunmadım" DEĞİL: `undefined`
 * dokunmadım, `null` "ağırlığı kaldır" (vücut ağırlığı hareketine çevir) demek
 * ve rekoru DÜŞÜRÜR, çünkü ağırlıksız set rekora girmiyor. T-031'in
 * `undefined` ≠ `null` kuralı burada davranışsal bir fark yaratıyor.
 */
export async function updateWorkoutSet(
  input: UpdateWorkoutSetInput,
  client: WorkoutSetClient = db,
): Promise<SetMutationResult> {
  const { id, ...fields } = input;

  const onceki = await client.workoutSet.findUnique({
    where: { id },
    select: { exerciseId: true },
  });

  const row = await client.workoutSet.update({
    where: { id },
    data: {
      ...(fields.workoutId !== undefined ? { workoutId: fields.workoutId } : {}),
      ...(fields.exerciseId !== undefined ? { exerciseId: fields.exerciseId } : {}),
      ...(fields.setNo !== undefined ? { setNo: fields.setNo } : {}),
      ...(fields.reps !== undefined ? { reps: fields.reps } : {}),
      ...(fields.weightKg !== undefined ? { weightKg: fields.weightKg } : {}),
      ...(fields.rpe !== undefined ? { rpe: fields.rpe } : {}),
    },
    select: SET_SELECT,
  });

  // Eski egzersiz farklıysa O DA hesaplanır (gerekçe yukarıda).
  const etkilenen = onceki ? [onceki.exerciseId, row.exerciseId] : [row.exerciseId];
  const records = await recalculateForExercises(etkilenen, client);

  return { set: toWorkoutSetDto(row), records };
}

/**
 * Seti SİLER ve rekorları yeniden hesaplar.
 *
 * ⚠️ `exerciseId` SİLME SONUCUNDAN OKUNUYOR. Silinmiş satıra sonradan
 * sorulamaz; `delete` dönüşü bu yüzden `select` taşıyor. Önce ayrı bir okuma
 * yapmak da olurdu ama gereksiz bir gidiş-dönüş — Prisma sildiği satırı
 * döndürüyor.
 *
 * Karar 3'ün uygulandığı yer: hesap, kaynağı kalmayan rekoru SİLER. Son 5
 * tekrarlık setini silen kullanıcı 5RM'ini ekranda GÖRMEYE DEVAM ETMEZ.
 */
export async function deleteWorkoutSet(
  id: string,
  client: WorkoutSetClient = db,
): Promise<{ id: string; workoutId: string; records: RecalculateResult }> {
  const row = await client.workoutSet.delete({
    where: { id },
    select: { id: true, exerciseId: true, workoutId: true },
  });

  const records = await recalculate(row.exerciseId, client);

  return { id: row.id, workoutId: row.workoutId, records };
}
