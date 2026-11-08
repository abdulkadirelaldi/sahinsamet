'use server';

import * as z from 'zod';

import { decimalSchema } from '@/lib/schemas/common';
import { db } from '@/server/db';
import { ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import { saglikHedefiKoy } from '@/server/services/health-log';

import { currentActorId, toFailure, unauthorized } from './_shared';

/** Hedef kilo (2026-10-31). Denetime değer yazılmaz — kişisel sağlık verisi. */
const hedefSchema = z.object({ hedefKg: decimalSchema(3, 2) });

export async function saglikHedefiAction(raw: unknown): Promise<ApiResponse<{ ok: true }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(hedefSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    await saglikHedefiKoy(actorId, parsed.data.hedefKg);
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'SaglikHedefi',
        entityId: actorId,
        diff: { alanlar: ['hedefKg'] },
      },
      db,
    );
    return ok({ ok: true });
  } catch (error) {
    return toFailure('saglik:hedef', error);
  }
}
