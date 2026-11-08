'use server';

import * as z from 'zod';

import { cuidSchema, entityIdSchema } from '@/lib/schemas/common';
import { db } from '@/server/db';
import { ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import {
  addProgramHareket,
  archiveProgramGun,
  createProgramGun,
  moveProgramHareket,
  removeProgramHareket,
  updateProgramGun,
  updateProgramHareket,
} from '@/server/services/antrenman-program';

import { currentActorId, toFailure, unauthorized } from './_shared';

/** PROGRAM DÜZENLEME EYLEMLERİ (2026-11-01). */

const gunAlanlari = {
  name: z.string().trim().min(1, { error: 'Gün adı zorunludur.' }).max(80),
  focus: z.string().trim().max(120).nullable(),
  weekday: z.number().int().min(1).max(7).nullable(),
};
const hareketAlanlari = {
  sets: z.number().int().min(1, { error: 'En az 1 set.' }).max(20, { error: 'En çok 20 set.' }),
  reps: z.string().trim().min(1, { error: 'Tekrar zorunludur.' }).max(40),
  restSec: z.number().int().min(0).max(900, { error: 'En çok 15 dakika.' }),
};
const gunSchema = z.object(gunAlanlari);
const gunGuncelleSchema = z.object({ id: cuidSchema, ...gunAlanlari });
const hareketEkleSchema = z.object({
  dayId: cuidSchema,
  exerciseId: cuidSchema,
  ...hareketAlanlari,
});
const hareketGuncelleSchema = z.object({ id: cuidSchema, ...hareketAlanlari });
const tasiSchema = z.object({ id: cuidSchema, yon: z.enum(['yukari', 'asagi']) });

export async function createProgramGunAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(gunSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const { id } = await createProgramGun(parsed.data);
    await writeAuditLog({ actorId, action: 'CREATE', entity: 'ProgramDay', entityId: id }, db);
    return ok({ id });
  } catch (error) {
    return toFailure('program:gun:create', error);
  }
}

export async function updateProgramGunAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(gunGuncelleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { id, ...girdi } = parsed.data;

  try {
    await updateProgramGun(id, girdi);
    await writeAuditLog({ actorId, action: 'UPDATE', entity: 'ProgramDay', entityId: id }, db);
    return ok({ id });
  } catch (error) {
    return toFailure('program:gun:update', error);
  }
}

export async function archiveProgramGunAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { id } = parsed.data;

  try {
    await archiveProgramGun(id);
    await writeAuditLog({ actorId, action: 'ARCHIVE', entity: 'ProgramDay', entityId: id }, db);
    return ok({ id });
  } catch (error) {
    return toFailure('program:gun:archive', error);
  }
}

export async function addProgramHareketAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(hareketEkleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { dayId, exerciseId, ...girdi } = parsed.data;

  try {
    const { id } = await addProgramHareket(dayId, exerciseId, girdi);
    await writeAuditLog({ actorId, action: 'CREATE', entity: 'ProgramExercise', entityId: id }, db);
    return ok({ id });
  } catch (error) {
    return toFailure('program:hareket:add', error);
  }
}

export async function updateProgramHareketAction(
  raw: unknown,
): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(hareketGuncelleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { id, ...girdi } = parsed.data;

  try {
    await updateProgramHareket(id, girdi);
    await writeAuditLog({ actorId, action: 'UPDATE', entity: 'ProgramExercise', entityId: id }, db);
    return ok({ id });
  } catch (error) {
    return toFailure('program:hareket:update', error);
  }
}

export async function removeProgramHareketAction(
  raw: unknown,
): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { id } = parsed.data;

  try {
    await removeProgramHareket(id);
    await writeAuditLog({ actorId, action: 'DELETE', entity: 'ProgramExercise', entityId: id }, db);
    return ok({ id });
  } catch (error) {
    return toFailure('program:hareket:remove', error);
  }
}

export async function moveProgramHareketAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(tasiSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { id, yon } = parsed.data;

  try {
    await db.$transaction((tx) => moveProgramHareket(id, yon, tx));
    await writeAuditLog(
      { actorId, action: 'UPDATE', entity: 'ProgramExercise', entityId: id, diff: { yon } },
      db,
    );
    return ok({ id });
  } catch (error) {
    return toFailure('program:hareket:move', error);
  }
}
