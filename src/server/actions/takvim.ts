'use server';

import { takvimEtkinligiSchema, takvimGuncelleSchema, takvimSilSchema } from '@/lib/schemas/takvim';
import { db } from '@/server/db';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import {
  takvimEtkinligiGuncelle,
  takvimEtkinligiOlustur,
  takvimEtkinligiSil,
  TakvimHatasi,
} from '@/server/services/takvim';
import type { AuditAction } from '@/types';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * TAKVİM EYLEMLERİ (2026-11-10) — oluştur, düzenle, sil. Kalıp Cüzdan'la aynı: kimlik + yazma
 * kapısı ve Zod her eylemin ilk satırlarında, sonra servis + DENETİM KAYDI.
 *
 * ⚠️ Denetim farkına BAŞLIK, KONUM, AÇIKLAMA YAZILMIYOR: "Diş hekimi · Kadıköy" sağlık verisi
 * olabilir. Denetim ne değiştiğini (alan adları, kapsam) söyler, içeriği değil.
 */

async function kaydet(
  actorId: string,
  action: AuditAction,
  diff: Record<string, unknown>,
  is: () => Promise<{ id: string }>,
  etiket: string,
): Promise<ApiResponse<{ id: string }>> {
  try {
    const sonuc = await is();
    await writeAuditLog(
      { actorId, action, entity: 'TakvimEtkinligi', entityId: sonuc.id, diff },
      db,
    );
    return ok(sonuc);
  } catch (error) {
    if (error instanceof TakvimHatasi) return fail('VALIDATION_ERROR', error.message);
    return toFailure(etiket, error);
  }
}

export async function takvimEtkinligiOlusturAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(takvimEtkinligiSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'CREATE',
    { tekrar: v.tekrar.tur, tumGun: v.tumGun, hatirlatma: v.hatirlatmalar.length },
    () => takvimEtkinligiOlustur(v),
    'takvim:olustur',
  );
}

export async function takvimEtkinligiGuncelleAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(takvimGuncelleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'UPDATE',
    { kaynak: v.id, kapsam: v.kapsam, tekrar: v.tekrar.tur, hatirlatma: v.hatirlatmalar.length },
    () => takvimEtkinligiGuncelle(v),
    'takvim:guncelle',
  );
}

export async function takvimEtkinligiSilAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(takvimSilSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(actorId, 'DELETE', { kapsam: v.kapsam }, () => takvimEtkinligiSil(v), 'takvim:sil');
}
