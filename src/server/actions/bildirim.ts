'use server';

import * as z from 'zod';

import { db } from '@/server/db';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import { kullaniciyaGonder, vapidAyarlari } from '@/server/services/bildirim';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * BİLDİRİM EYLEMLERİ (2026-10-30) — abone ol / ayrıl, tercih, test.
 * Abonelik uç noktası tarayıcı üreticisinin (Apple/Google) adresi olmak
 * ZORUNDA: başka bir adrese "bildirim" POST'lattırmak sunucuyu SSRF'e açardı.
 */

const PUSH_KOKENLERI = [
  /^https:\/\/web\.push\.apple\.com\//,
  /^https:\/\/fcm\.googleapis\.com\//,
  /^https:\/\/updates\.push\.services\.mozilla\.com\//,
  /^https:\/\/[a-z0-9.-]+\.notify\.windows\.com\//,
];

const abonelikSchema = z.object({
  endpoint: z
    .url()
    .max(1024)
    .refine((u) => PUSH_KOKENLERI.some((r) => r.test(u)), {
      error: 'Desteklenmeyen bildirim servisi.',
    }),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(128) }),
  cihaz: z.string().trim().min(1).max(60),
});

const tercihSchema = z.object({
  borc: z.boolean(),
  aliskanlik: z.boolean(),
  su: z.boolean(),
  rekor: z.boolean(),
  haftalik: z.boolean(),
  aylik: z.boolean(),
  ingilizce: z.boolean(),
  suHedefMl: z.number().int().min(500).max(10000),
  suSaatleri: z
    .array(z.number().int().min(0).max(23))
    .min(1)
    .max(6)
    .transform((s) => [...new Set(s)].sort((a, b) => a - b)),
  aliskanlikSaati: z.number().int().min(0).max(23),
});

export async function bildirimAboneOlAction(raw: unknown): Promise<ApiResponse<{ ok: true }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(abonelikSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const { endpoint, keys, cihaz } = parsed.data;
    const kayit = await db.pushAbonelik.upsert({
      where: { endpoint },
      create: { userId: actorId, endpoint, p256dh: keys.p256dh, auth: keys.auth, cihaz },
      update: { userId: actorId, p256dh: keys.p256dh, auth: keys.auth, cihaz },
      select: { id: true },
    });
    await writeAuditLog(
      { actorId, action: 'CREATE', entity: 'PushAbonelik', entityId: kayit.id, diff: { cihaz } },
      db,
    );
    return ok({ ok: true });
  } catch (error) {
    return toFailure('bildirim:abone', error);
  }
}

export async function bildirimAyrilAction(raw: unknown): Promise<ApiResponse<{ ok: true }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(z.object({ endpoint: z.string().max(1024) }), raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const silinen = await db.pushAbonelik.deleteMany({
      where: { endpoint: parsed.data.endpoint, userId: actorId },
    });
    await writeAuditLog(
      { actorId, action: 'DELETE', entity: 'PushAbonelik', entityId: String(silinen.count) },
      db,
    );
    return ok({ ok: true });
  } catch (error) {
    return toFailure('bildirim:ayril', error);
  }
}

export async function bildirimTercihAction(raw: unknown): Promise<ApiResponse<{ ok: true }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(tercihSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    await db.bildirimTercihi.upsert({
      where: { userId: actorId },
      create: { userId: actorId, ...parsed.data },
      update: parsed.data,
    });
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'BildirimTercihi',
        entityId: actorId,
        diff: parsed.data,
      },
      db,
    );
    return ok({ ok: true });
  } catch (error) {
    return toFailure('bildirim:tercih', error);
  }
}

export async function testBildirimiAction(): Promise<ApiResponse<{ cihaz: number }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const vapid = vapidAyarlari();
  if (!vapid) return fail('INTERNAL_ERROR', 'Bildirim anahtarları sunucuda tanımlı değil.');

  try {
    const cihaz = await kullaniciyaGonder(
      actorId,
      {
        baslik: 'Bildirimler açık ✅',
        govde: 'SŞ Panel bu cihaza bildirim gönderebiliyor.',
        url: '/panel',
      },
      vapid,
    );
    await writeAuditLog(
      { actorId, action: 'CREATE', entity: 'TestBildirimi', entityId: actorId, diff: { cihaz } },
      db,
    );
    return cihaz > 0 ? ok({ cihaz }) : fail('NOT_FOUND', 'Bu hesaba kayıtlı cihaz yok.');
  } catch (error) {
    return toFailure('bildirim:test', error);
  }
}
