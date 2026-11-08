'use server';

import Anthropic from '@anthropic-ai/sdk';

import { tartiGorseliSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  addAppDays,
  appToday,
  fail,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import { fetchHealthTrend } from '@/server/services/health-log';
import {
  aiIstemcisi,
  saglikDegerlendirmesi,
  SaglikAiHatasi,
  tartiGorseliniOku,
  type SaglikDegerlendirmesi,
  type TartiOnerisi,
} from '@/server/services/saglik-ai';
import type { ApiFailure } from '@/types';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * SAĞLIK · YAPAY ZEKÂ EYLEMLERİ (2026-10-30).
 *
 * İkisi de kişisel sağlık verisini Anthropic'e GÖNDERİYOR. Bu yüzden her
 * gönderim, istekten ÖNCE denetim kaydına `EXPORT` olarak yazılır (yanıt
 * gelmese de veri çıkmıştır). Kayda değer YAZILMAZ — yalnızca ne gönderildiği.
 * Anahtar yoksa hiçbir şey gönderilmez ve kayıt da yazılmaz.
 */

/** Değerlendirmeye giren pencere — eğilim için yeterli, istek için küçük. */
const DEGERLENDIRME_GUNU = 90;

function aiHatasi(baglam: string, error: unknown): ApiFailure {
  if (error instanceof SaglikAiHatasi) {
    return fail(error.kod === 'ANAHTAR_YOK' ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR', error.message);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return fail('RATE_LIMITED', 'Yapay zekâ şu an yoğun. Bir dakika sonra yeniden dene.');
  }
  return toFailure(baglam, error);
}

/** Günlük yapay zekâ çağrısı: döngüye giren istemci ya da ele geçen oturum fatura çıkarmasın. */
const GUNLUK_AI_SINIRI = 30;

async function gunlukSinirAsildi(actorId: string): Promise<boolean> {
  const sayi = await db.auditLog.count({
    where: {
      actorId,
      action: 'EXPORT',
      entity: 'HealthLog',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
    },
  });
  return sayi >= GUNLUK_AI_SINIRI;
}

const SINIR_DOLU = 'Bugünkü yapay zekâ hakkın doldu. Yarın yeniden dene.';

const ANAHTAR_YOK = 'Yapay zekâ anahtarı sunucuda tanımlı değil; değerleri elle girebilirsin.';

export async function tartiGorseliOkuAction(raw: unknown): Promise<ApiResponse<TartiOnerisi>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(tartiGorseliSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const client = aiIstemcisi();
  if (!client) return fail('INTERNAL_ERROR', ANAHTAR_YOK);

  try {
    if (await gunlukSinirAsildi(actorId)) return fail('RATE_LIMITED', SINIR_DOLU);
    await writeAuditLog(
      {
        actorId,
        action: 'EXPORT',
        entity: 'HealthLog',
        entityId: 'tarti-gorseli',
        diff: { hedef: 'Anthropic', icerik: 'tartı ekran görüntüsü' },
      },
      db,
    );
    return ok(await tartiGorseliniOku(parsed.data, client));
  } catch (error) {
    return aiHatasi('saglik:tarti-oku', error);
  }
}

export async function saglikDegerlendirmesiAction(): Promise<ApiResponse<SaglikDegerlendirmesi>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const client = aiIstemcisi();
  if (!client) return fail('INTERNAL_ERROR', ANAHTAR_YOK);

  try {
    if (await gunlukSinirAsildi(actorId)) return fail('RATE_LIMITED', SINIR_DOLU);
    const bugun = appToday();
    const kayitlar = await fetchHealthTrend({
      from: addAppDays(bugun, -(DEGERLENDIRME_GUNU - 1)),
      to: bugun,
    });
    // Gönderilecek veri yoksa hiçbir şey çıkmasın — kayıt da yazılmasın.
    if (kayitlar.length === 0) {
      return fail('VALIDATION_ERROR', 'Yorum için önce en az bir ölçüm kaydet.');
    }
    await writeAuditLog(
      {
        actorId,
        action: 'EXPORT',
        entity: 'HealthLog',
        entityId: 'degerlendirme',
        diff: { hedef: 'Anthropic', kayitSayisi: kayitlar.length, gun: DEGERLENDIRME_GUNU },
      },
      db,
    );
    return ok(await saglikDegerlendirmesi(kayitlar, client));
  } catch (error) {
    return aiHatasi('saglik:degerlendirme', error);
  }
}
