'use server';

import { guvenliHata } from '@/lib/security/guvenli-log';
import { otomatikIsaretle } from '@/server/services/habit-gun';
import * as z from 'zod';

import { cuidSchema, entityIdSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  abandonSession,
  createSuggestedProgram,
  finishSession,
  OturumHatasi,
  startSession,
} from '@/server/services/antrenman-oturumu';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * SPOR · OTURUM EYLEMLERİ (2026-10-30). Setler `workout-set.ts`
 * (`createWorkoutSetAction`) üzerinden yazılıyor — rekor hesabı orada.
 */

const baslatSchema = z.object({ dayId: cuidSchema });

function oturumHatasi(error: OturumHatasi) {
  if (error.sebep === 'GUN_YOK') return fail('NOT_FOUND', 'Program günü bulunamadı.');
  if (error.sebep === 'BITMIS') return fail('CONFLICT', 'Bu antrenman zaten bitirilmiş.');
  if (error.sebep === 'SETLI')
    return fail('CONFLICT', 'Bu antrenmanda set var; silmek yerine bitir.');
  return fail('NOT_FOUND', 'Antrenman bulunamadı.');
}

/** Sahibinin 5+1 günlük programını yükler (program günü yoksa). */
export async function createSuggestedProgramAction(): Promise<ApiResponse<{ gun: number }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  try {
    const gun = await createSuggestedProgram();
    if (gun > 0) {
      await writeAuditLog(
        { actorId, action: 'CREATE', entity: 'ProgramDay', entityId: 'onerilen', diff: { gun } },
        db,
      );
    }
    return ok({ gun });
  } catch (error) {
    return toFailure('program:suggested', error);
  }
}

/** Program gününden oturum başlatır; açık oturum varsa ONU döndürür. */
export async function startSessionAction(
  raw: unknown,
): Promise<ApiResponse<{ id: string; yeni: boolean }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(baslatSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await startSession(parsed.data.dayId);
    if (sonuc.yeni) {
      await writeAuditLog(
        {
          actorId,
          action: 'CREATE',
          entity: 'Workout',
          entityId: sonuc.id,
          diff: { programDayId: parsed.data.dayId },
        },
        db,
      );
    }
    return ok(sonuc);
  } catch (error) {
    if (error instanceof OturumHatasi) return oturumHatasi(error);
    return toFailure('workout:start', error);
  }
}

/** Oturumu bitirir — süre ve tahmini kalori yazılır. */
export async function finishSessionAction(
  raw: unknown,
): Promise<
  ApiResponse<{ durationMin: number; kcal: number; kiloKg: number; varsayilanKilo: boolean }>
> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await finishSession(parsed.data.id);
    // Alışkanlık işaretlenemese de antrenman bitmiştir.
    // Gece yarısını geçen antrenman başladığı güne yazılır: işaret de o güne gider.
    await otomatikIsaretle('SPOR', sonuc.gun).catch((error: unknown) =>
      guvenliHata(
        '[spor] alışkanlık işaretlenemedi:',
        error instanceof Error ? error.message : error,
      ),
    );
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Workout',
        entityId: parsed.data.id,
        diff: { durationMin: sonuc.durationMin, kcal: sonuc.kcal },
      },
      db,
    );
    return ok(sonuc);
  } catch (error) {
    if (error instanceof OturumHatasi) return oturumHatasi(error);
    return toFailure('workout:finish', error);
  }
}

/** Boş oturumdan vazgeç: hiç set yoksa kayıt silinir (2026-11-12). */
export async function abandonSessionAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    await abandonSession(parsed.data.id);
    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'Workout',
        entityId: parsed.data.id,
        diff: { bos: true },
      },
      db,
    );
    return ok({ id: parsed.data.id });
  } catch (error) {
    if (error instanceof OturumHatasi) return oturumHatasi(error);
    return toFailure('workout:abandon', error);
  }
}
