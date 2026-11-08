'use server';

import * as z from 'zod';

import { alistirmaBul, dersBul } from '@/lib/ingilizce/mufredat';
import { db } from '@/server/db';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import {
  dersKaydet,
  HEDEF_SECENEKLERI,
  VARSAYILAN_HEDEF,
  type DersSonucu,
} from '@/server/services/ingilizce';
import { hataKaydet } from '@/server/services/hata-kaydi';

import { currentActorId, toFailure, unauthorized } from './_shared';

/** İNGİLİZCE EYLEMLERİ (2026-11-06) — ders bitirme ve günlük hedef. */

const kimlik = z.string().regex(/^[a-z0-9-]{1,80}$/);
const dersSchema = z.object({
  dersId: kimlik,
  hatalar: z.array(kimlik).max(60),
  dogrular: z.array(kimlik).max(60),
});
const hedefSchema = z.object({
  hedef: z
    .number()
    .int()
    .refine((h) => (HEDEF_SECENEKLERI as readonly number[]).includes(h)),
});

export async function ingilizceDersBitirAction(raw: unknown): Promise<ApiResponse<DersSonucu>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(dersSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await dersKaydet(parsed.data);
    if (!sonuc) return fail('VALIDATION_ERROR', 'Bu ders kaydedilemedi: kilitli ya da bilinmiyor.');
    const ayar = await db.ingilizceAyar.findUnique({ where: { userId: actorId } });
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'IngilizceDers',
        entityId: parsed.data.dersId,
        diff: { xp: sonuc.xp, hata: parsed.data.hatalar.length },
      },
      db,
    );
    return ok({ ...sonuc, hedefXp: ayar?.gunlukHedefXp ?? VARSAYILAN_HEDEF });
  } catch (error) {
    return toFailure('ingilizce:ders', error);
  }
}

export async function ingilizceHedefAction(raw: unknown): Promise<ApiResponse<{ hedef: number }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(hedefSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const { hedef } = parsed.data;
    await db.ingilizceAyar.upsert({
      where: { userId: actorId },
      create: { userId: actorId, gunlukHedefXp: hedef },
      update: { gunlukHedefXp: hedef },
    });
    await writeAuditLog(
      { actorId, action: 'UPDATE', entity: 'IngilizceAyar', entityId: actorId, diff: { hedef } },
      db,
    );
    return ok({ hedef });
  } catch (error) {
    return toFailure('ingilizce:hedef', error);
  }
}

const bildirSchema = z.object({
  alistirmaId: kimlik,
  dersId: kimlik,
  not: z.string().trim().max(500),
});

/**
 * "Bu soruda hata var" (2026-11-06): Ayarlar → Hatalar'a İçerik kaynağıyla düşer; soru
 * kimliği ayrıntıda. Aynı soruya aynı not tekrar gelirse sayaç artar.
 */
export async function ingilizceHataBildirAction(raw: unknown): Promise<ApiResponse<{ ok: true }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(bildirSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { alistirmaId, dersId, not } = parsed.data;
  if (!alistirmaBul(alistirmaId)) return fail('NOT_FOUND', 'Bu soru bulunamadı.');

  await hataKaydet({
    kaynak: 'icerik',
    ad: `İngilizce · ${dersBul(dersId)?.ders.baslik ?? 'Tekrar'}`,
    mesaj: not || 'Soruda hata bildirildi (not yok).',
    yol: `/panel/ingilizce/ders/${dersId}`,
    ayrinti: alistirmaId,
  });
  return ok({ ok: true });
}
