'use server';

import {
  archiveHabitSchema,
  createHabitLogSchema,
  createHabitSchema,
  moveHabitSchema,
  sayacBaslatSchema,
  sayacDurdurSchema,
  setHabitDayStatusSchema,
  sureEkleSchema,
  toggleHabitLogSchema,
  updateHabitSchema,
} from '@/lib/schemas';
import { db } from '@/server/db';
import { archiveHabit, createHabit, updateHabit, type HabitDto } from '@/server/services/habit';
import { createSuggestedHabits, moveHabit } from '@/server/services/habit-gun';
import {
  HabitWriteBlockedError,
  sayaciBaslat,
  sayaciDurdur,
  setHabitDayCount,
  setHabitDayStatus,
  sureEkle,
  toggleHabitDay,
  type HabitDayResult,
  type SayacSonucu,
} from '@/server/services/habit-log';
import {
  buildDiff,
  fail,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiFailure,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `Habit` + `HabitLog` Server Action'ları — §4.2, §7.1, §8.20, T-112.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DENETİM KAYDI: ALIŞKANLIK TANIMI DEĞERLERİYLE, İŞARETLER YALNIZCA SAYIYLA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Habit` bir REFERANS VERİ kaydı ("Kitap oku, haftada 5 gün") — `Exercise`
 * ile aynı sınıf, `buildDiff` ile alanların tamamı yazılıyor. Serbest metin
 * alanı yok (`name` kısa bir ad, `icon`/`color` kapalı biçimler).
 *
 * `HabitLog` işareti için `{ day, count }` yazılıyor. ⚠️ `entityId` İŞARETİN
 * DEĞİL ALIŞKANLIĞIN KİMLİĞİ ve bu bilinçli: aç/kapa satırı SİLEBİLİYOR
 * (`count = 0` satır tutulmaz, `services/habit-log.ts`), yani işaretin
 * kimliği denetim kaydında artık var olmayan bir satırı gösterirdi.
 * "Hangi alışkanlığın hangi günü" sorusunun kalıcı cevabı alışkanlık kimliği
 * ve gün.
 *
 * ⚠️ SİLME EYLEMİ YOK — `HabitLog.habitId` CASCADE, silmek geçmişi götürürdü
 * (`services/habit.ts`).
 *
 * `revalidateTag` YOK — F5 modelleri public tarafta okunmuyor.
 */

/** Arşivlenmiş ya da bulunamayan alışkanlığa yazma — kullanıcı metni. */
function blockedFailure(error: HabitWriteBlockedError): ApiFailure {
  if (error.reason === 'SURELI_DEGIL') {
    return fail('VALIDATION_ERROR', 'Bu alışkanlık süreli değil.', {
      habitId: 'Alışkanlık süreli değil.',
    });
  }
  return error.reason === 'ARCHIVED'
    ? fail(
        'VALIDATION_ERROR',
        'Bu alışkanlık arşivlenmiş. İşaretlemek için önce arşivden çıkarın.',
        { habitId: 'Alışkanlık arşivde.' },
      )
    : fail('NOT_FOUND', 'Alışkanlık bulunamadı. Başka bir yerden silinmiş olabilir.');
}

export async function createHabitAction(raw: unknown): Promise<ApiResponse<HabitDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createHabitSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createHabit(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Habit',
        entityId: dto.id,
        diff: buildDiff(null, parsed.data),
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('habit:create', error);
  }
}

export async function updateHabitAction(raw: unknown): Promise<ApiResponse<HabitDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateHabitSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const { id: _id, ...fields } = parsed.data;

  try {
    const dto = await updateHabit(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Habit',
        entityId: dto.id,
        diff: buildDiff(null, fields),
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('habit:update', error);
  }
}

/** Arşivler veya arşivden çıkarır — denetim eylemi `UPDATE` (`archiveExerciseAction` gerekçesi). */
export async function archiveHabitAction(raw: unknown): Promise<ApiResponse<HabitDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(archiveHabitSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await archiveHabit(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Habit',
        entityId: dto.id,
        diff: { isArchived: parsed.data.isArchived },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('habit:archive', error);
  }
}

/* ===========================================================================
 * İŞARETLER
 * ======================================================================== */

async function writeDayAudit(actorId: string, sonuc: HabitDayResult): Promise<void> {
  await writeAuditLog(
    {
      actorId,
      action: 'UPDATE',
      entity: 'HabitLog',
      entityId: sonuc.habitId,
      diff: { day: sonuc.date, count: sonuc.count },
    },
    db,
  );
}

/** Panodaki hücre tıkı — aç/kapa ya da sayaç artırma (`toggleHabitDay`). */
export async function toggleHabitDayAction(raw: unknown): Promise<ApiResponse<HabitDayResult>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(toggleHabitLogSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await toggleHabitDay(parsed.data);
    await writeDayAudit(actorId, sonuc);
    return ok(sonuc);
  } catch (error) {
    if (error instanceof HabitWriteBlockedError) return blockedFailure(error);
    return toFailure('habitLog:toggle', error);
  }
}

/** Sayacı doğrudan belirler — `0` işareti kaldırır. */
export async function setHabitDayCountAction(raw: unknown): Promise<ApiResponse<HabitDayResult>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createHabitLogSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await setHabitDayCount(parsed.data);
    await writeDayAudit(actorId, sonuc);
    return ok(sonuc);
  } catch (error) {
    if (error instanceof HabitWriteBlockedError) return blockedFailure(error);
    return toFailure('habitLog:set', error);
  }
}

/** Günlük listedeki tek dokunuş — YAPTIM / YAPMADIM / TEMIZLE (2026-10-29). */
export async function setHabitDayStatusAction(raw: unknown): Promise<ApiResponse<HabitDayResult>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(setHabitDayStatusSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await setHabitDayStatus(parsed.data);
    await writeDayAudit(actorId, sonuc);
    return ok(sonuc);
  } catch (error) {
    if (error instanceof HabitWriteBlockedError) return blockedFailure(error);
    return toFailure('habitLog:status', error);
  }
}

/** Süreli alışkanlığa sonradan dakika ekler. */
export async function sureEkleAction(raw: unknown): Promise<ApiResponse<HabitDayResult>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(sureEkleSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await sureEkle(parsed.data);
    await writeDayAudit(actorId, sonuc);
    return ok(sonuc);
  } catch (error) {
    if (error instanceof HabitWriteBlockedError) return blockedFailure(error);
    return toFailure('habitLog:sureEkle', error);
  }
}

/** Sayacı başlatır; başlangıç zamanını döner. */
export async function sayacBaslatAction(raw: unknown): Promise<ApiResponse<{ baslangic: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(sayacBaslatSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const baslangic = await sayaciBaslat(parsed.data.habitId);
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Habit',
        entityId: parsed.data.habitId,
        diff: { sayac: 'BASLADI' },
      },
      db,
    );
    return ok({ baslangic });
  } catch (error) {
    if (error instanceof HabitWriteBlockedError) return blockedFailure(error);
    return toFailure('habit:sayacBaslat', error);
  }
}

/** Sayacı durdurur; çok uzun açık kaldıysa süreyi yazmadan sorar. */
export async function sayacDurdurAction(raw: unknown): Promise<ApiResponse<SayacSonucu>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(sayacDurdurSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await sayaciDurdur(parsed.data);
    if (sonuc.durum === 'KAYDEDILDI') await writeDayAudit(actorId, sonuc.sonuc);
    return ok(sonuc);
  } catch (error) {
    if (error instanceof HabitWriteBlockedError) return blockedFailure(error);
    return toFailure('habit:sayacDurdur', error);
  }
}

/** Boş panelde sahibinin kendi alışkanlık listesini ekler (varsa dokunmaz). */
export async function createSuggestedHabitsAction(): Promise<ApiResponse<{ eklenen: number }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  try {
    const eklenen = await createSuggestedHabits();
    if (eklenen > 0) {
      await writeAuditLog(
        { actorId, action: 'CREATE', entity: 'Habit', entityId: 'onerilen', diff: { eklenen } },
        db,
      );
    }
    return ok({ eklenen });
  } catch (error) {
    return toFailure('habit:suggested', error);
  }
}

/** Listede bir basamak yukarı/aşağı. */
export async function moveHabitAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(moveHabitSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    await moveHabit(parsed.data);
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Habit',
        entityId: parsed.data.id,
        diff: { order: parsed.data.yon },
      },
      db,
    );
    return ok({ id: parsed.data.id });
  } catch (error) {
    return toFailure('habit:move', error);
  }
}
