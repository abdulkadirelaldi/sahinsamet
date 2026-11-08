'use server';

import { db } from '@/server/db';
import { ok, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import { anahtarSil, anahtarUret } from '@/server/services/saglik-baglantisi';

import { currentActorId, toFailure, unauthorized } from './_shared';

/** Kısayollar anahtarı (2026-11-01). Anahtarın kendisi denetime YAZILMAZ. */
export async function saglikAnahtariUretAction(): Promise<ApiResponse<{ anahtar: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  try {
    const anahtar = await anahtarUret(actorId);
    await writeAuditLog(
      { actorId, action: 'CREATE', entity: 'SaglikBaglantisi', entityId: actorId },
      db,
    );
    return ok({ anahtar });
  } catch (error) {
    return toFailure('saglik:anahtar-uret', error);
  }
}

export async function saglikAnahtariSilAction(): Promise<ApiResponse<{ ok: true }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  try {
    await anahtarSil(actorId);
    await writeAuditLog(
      { actorId, action: 'DELETE', entity: 'SaglikBaglantisi', entityId: actorId },
      db,
    );
    return ok({ ok: true });
  } catch (error) {
    return toFailure('saglik:anahtar-sil', error);
  }
}
