'use server';

import * as z from 'zod';

import { db } from '@/server/db';
import { ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import { hataKaydet, hatalariTemizle } from '@/server/services/hata-kaydi';

import { currentActorId, toFailure, unauthorized } from './_shared';

/** Hata izleme eylemleri (2026-10-31) — bkz. `services/hata-kaydi.ts`. */

const istemciHatasiSchema = z.object({
  ad: z.string().max(200),
  mesaj: z.string().max(2000),
  yol: z.string().max(500).optional(),
  digest: z.string().max(100).optional(),
});

/** Panel hata sınırından — yalnızca oturumlu panel kullanıcısı bildirebilir. */
export async function istemciHatasiAction(raw: unknown): Promise<ApiResponse<{ ok: true }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(istemciHatasiSchema, raw);
  if (!parsed.ok) return parsed.failure;

  await hataKaydet({
    kaynak: 'istemci',
    ad: parsed.data.ad,
    mesaj: parsed.data.mesaj,
    yol: parsed.data.yol ?? null,
    ayrinti: parsed.data.digest ?? null,
  });
  return ok({ ok: true });
}

export async function hatalariTemizleAction(): Promise<ApiResponse<{ silinen: number }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  try {
    const silinen = await hatalariTemizle();
    await writeAuditLog(
      { actorId, action: 'DELETE', entity: 'HataKaydi', entityId: 'hepsi', diff: { silinen } },
      db,
    );
    return ok({ silinen });
  } catch (error) {
    return toFailure('hata:temizle', error);
  }
}
