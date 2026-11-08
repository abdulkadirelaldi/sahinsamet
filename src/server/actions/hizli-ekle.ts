'use server';

import * as z from 'zod';

import { dayDateSchema, decimalSchema } from '@/lib/schemas/common';
import { hizliHarcamaSchema } from '@/lib/schemas/wallet';
import { db } from '@/server/db';
import {
  appToday,
  fail,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import { birKez } from '@/server/services/islem-anahtari';
import {
  createWalletFlow,
  fetchOdemeHesaplari,
  kuyrukGunu,
  OdemeHatasi,
} from '@/server/services/cuzdan';
import { suAliskanliginiIsaretle } from '@/server/services/habit-gun';
import { gununKaydinaEkle, sonTarti } from '@/server/services/health-log';

import { guvenliHata } from '@/lib/security/guvenli-log';

import { currentActorId, toFailure, unauthorized } from './_shared';

/** Alışkanlık işaretlenemese de su kaydı başarılıdır; hata yutulmaz, kayda geçer. */
const isaretHatasi = (error: unknown) =>
  guvenliHata('[hizli] alışkanlık işaretlenemedi:', error instanceof Error ? error.message : error);

/**
 * HIZLI EKLEME (2026-10-30) — her ekrandaki "+" düğmesi. Üç sık iş tek
 * dokunuşta: harcama, kilo, su. Gün sunucuda İstanbul saatine göre
 * (`appToday`, ADR-016); bağlantı yokken kuyruğa alınan kayıt GİRİLDİĞİ günü
 * taşır (`kuyrukGunu` sınırlar). Denetim kaydına tutar/kilo YAZILMAZ (kişisel veri).
 */

const gunAlani = { gun: dayDateSchema.optional(), anahtar: z.uuid().optional() };
const kiloSchema = z.object({
  kg: decimalSchema(3, 2).refine((v) => Number(v) >= 30 && Number(v) <= 250, {
    error: 'Kilo 30–250 arasında olmalı.',
  }),
  ...gunAlani,
});
const suSchema = z.object({ ml: z.number().int().min(50).max(2000), ...gunAlani });
const uykuSchema = z.object({
  saat: decimalSchema(2, 1).refine((v) => Number(v) >= 1 && Number(v) <= 16, {
    error: 'Uyku 1–16 saat arasında olmalı.',
  }),
  ...gunAlani,
});
const suGeriAlSchema = z.object({ ml: suSchema.shape.ml, gun: dayDateSchema.optional() });
const harcamaSchema = hizliHarcamaSchema.extend(gunAlani);

export async function hizliHarcamaAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(harcamaSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await birKez(parsed.data.anahtar, (tx) =>
      createWalletFlow(
        {
          kind: 'EXPENSE',
          name: parsed.data.ne,
          amount: parsed.data.tutar,
          unit: 'TRY',
          frequency: 'ONCE',
          date: kuyrukGunu(parsed.data.gun, appToday()),
          category: parsed.data.kategori,
          ...(parsed.data.hesapId ? { hesapId: parsed.data.hesapId } : {}),
        },
        tx,
      ),
    );
    if (sonuc === null) return ok({ id: '' });
    const { id } = sonuc;
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'WalletFlow',
        entityId: id,
        diff: {
          kaynak: 'hizli-ekle',
          kategori: parsed.data.kategori,
          hesaptan: Boolean(parsed.data.hesapId),
        },
      },
      db,
    );
    return ok({ id });
  } catch (error) {
    if (error instanceof OdemeHatasi) return fail('VALIDATION_ERROR', error.message);
    return toFailure('hizli:harcama', error);
  }
}

export async function hizliKiloAction(
  raw: unknown,
): Promise<ApiResponse<{ weightKg: string | null }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(kiloSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await birKez(parsed.data.anahtar, (tx) =>
      gununKaydinaEkle(kuyrukGunu(parsed.data.gun, appToday()), { weightKg: parsed.data.kg }, tx),
    );
    if (sonuc === null) return ok({ weightKg: parsed.data.kg });
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'HealthLog',
        entityId: sonuc.id,
        diff: { alanlar: ['weightKg'] },
      },
      db,
    );
    return ok({ weightKg: sonuc.weightKg });
  } catch (error) {
    return toFailure('hizli:kilo', error);
  }
}

export async function hizliSuAction(
  raw: unknown,
): Promise<ApiResponse<{ waterMl: number | null }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(suSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await birKez(parsed.data.anahtar, (tx) =>
      gununKaydinaEkle(kuyrukGunu(parsed.data.gun, appToday()), { suMl: parsed.data.ml }, tx),
    );
    if (sonuc === null) return ok({ waterMl: null });
    // Alışkanlık işaretlenemese de su kaydı başarılıdır.
    await suAliskanliginiIsaretle(
      actorId,
      kuyrukGunu(parsed.data.gun, appToday()),
      sonuc.waterMl,
    ).catch(isaretHatasi);
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'HealthLog',
        entityId: sonuc.id,
        diff: { alanlar: ['waterMl'] },
      },
      db,
    );
    return ok({ waterMl: sonuc.waterMl });
  } catch (error) {
    return toFailure('hizli:su', error);
  }
}

/** Son su eklemesini geri alır: kayıt sıfırın altına inmez, alışkanlık yeniden hesaplanır. */
export async function suGeriAlAction(
  raw: unknown,
): Promise<ApiResponse<{ waterMl: number | null }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(suGeriAlSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const gun = kuyrukGunu(parsed.data.gun, appToday());
    const sonuc = await gununKaydinaEkle(gun, { suMl: -parsed.data.ml });
    await suAliskanliginiIsaretle(actorId, gun, sonuc.waterMl, true).catch(isaretHatasi);
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'HealthLog',
        entityId: sonuc.id,
        diff: { alanlar: ['waterMl'], geriAlma: true },
      },
      db,
    );
    return ok({ waterMl: sonuc.waterMl });
  } catch (error) {
    return toFailure('hizli:su-geri', error);
  }
}

export async function hizliUykuAction(raw: unknown): Promise<ApiResponse<{ sleepHours: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(uykuSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await birKez(parsed.data.anahtar, (tx) =>
      gununKaydinaEkle(
        kuyrukGunu(parsed.data.gun, appToday()),
        { sleepHours: parsed.data.saat },
        tx,
      ),
    );
    if (sonuc === null) return ok({ sleepHours: parsed.data.saat });
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'HealthLog',
        entityId: sonuc.id,
        diff: { alanlar: ['sleepHours'] },
      },
      db,
    );
    return ok({ sleepHours: parsed.data.saat });
  } catch (error) {
    return toFailure('hizli:uyku', error);
  }
}

/** Kilo formundaki "son tartı" bilgisi: yalnızca okur. */
export async function sonKiloAction(): Promise<
  ApiResponse<{ kg: string; gun: string; bugun: boolean } | null>
> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  try {
    const son = await sonTarti();
    return ok(son && { ...son, bugun: son.gun === appToday() });
  } catch (error) {
    return toFailure('hizli:son-kilo', error);
  }
}

/** Hızlı harcamada seçilebilen TL hesapları: yalnızca okur. */
export async function hizliHesaplarAction(): Promise<
  ApiResponse<{ id: string; ad: string; bakiye: string }[]>
> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  try {
    const hesaplar = await fetchOdemeHesaplari('TRY');
    return ok(hesaplar.map((h) => ({ id: h.id, ad: h.name, bakiye: h.balance })));
  } catch (error) {
    return toFailure('hizli:hesaplar', error);
  }
}
