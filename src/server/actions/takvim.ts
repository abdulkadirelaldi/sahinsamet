'use server';

import { entityIdSchema } from '@/lib/schemas/common';
import {
  sporTakvimSchema,
  takvimEtkinligiSchema,
  takvimGuncelleSchema,
  takvimSilSchema,
} from '@/lib/schemas/takvim';
import { GUN_KISA } from '@/lib/takvim/bicim';
import { db } from '@/server/db';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import {
  sporTakvimKaldir,
  sporTakvimKaydet,
  SporTakvimCakismasi,
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

/**
 * SPOR PROGRAMINI TAKVİME EKLE / PLANI GÜNCELLE (2026-11-12). Aynı gün zaten takvimdeyse
 * ikinci seri AÇILMAZ: CONFLICT döner, `fields.mevcutId` mevcut planı taşır ve ekran
 * "mevcut planı düzenle"yi önerir.
 */
export async function sporTakvimKaydetAction(
  raw: unknown,
): Promise<ApiResponse<{ id: string; durum: 'yeni' | 'guncellendi' }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(sporTakvimSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;

  try {
    const sonuc = await sporTakvimKaydet(v);
    await writeAuditLog(
      {
        actorId,
        action: sonuc.durum === 'yeni' ? 'CREATE' : 'UPDATE',
        entity: 'TakvimEtkinligi',
        entityId: sonuc.id,
        diff: { programDayId: v.dayId, gunler: v.gunler, hatirlatma: v.hatirlatmalar.length },
      },
      db,
    );
    return ok(sonuc);
  } catch (error) {
    if (error instanceof SporTakvimCakismasi) {
      const { mevcut } = error;
      const gunler = mevcut.gunler.map((g) => GUN_KISA[g - 1]).join(', ');
      return fail(
        'CONFLICT',
        `Bu gün zaten takvimde: ${gunler} · ${mevcut.saat}. Yeni plan açmak yerine onu düzenle.`,
        { mevcutId: mevcut.id },
      );
    }
    if (error instanceof TakvimHatasi) return fail('VALIDATION_ERROR', error.message);
    return toFailure('takvim:spor', error);
  }
}

/** Program gününün takvim planını kaldırır. */
export async function sporTakvimKaldirAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  return kaydet(
    actorId,
    'DELETE',
    { kaynak: 'spor-programi' },
    () => sporTakvimKaldir(parsed.data.id),
    'takvim:spor-kaldir',
  );
}
