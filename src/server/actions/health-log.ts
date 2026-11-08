'use server';

import { guvenliHata } from '@/lib/security/guvenli-log';
import { suAliskanliginiIsaretle } from '@/server/services/habit-gun';
import { createHealthLogSchema, entityIdSchema, updateHealthLogSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  createHealthLog,
  deleteHealthLog,
  findHealthLogIdByDay,
  updateHealthLog,
  type HealthLogDto,
} from '@/server/services/health-log';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `HealthLog` Server Action'ları — §4.2, §7.1, §8.20, T-110.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ SAĞLIK DEĞERLERİ DENETİM KAYDINA YAZILMIYOR — T-100'DEN FARKLI KARAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-100'de PARA için şu kararı verdim: tutar SATIRA yazılır (sır değil, adli
 * değeri gerçek), EKRANDA görünmez. Burada sonuç FARKLI ve farkın sebebi
 * ölçütün kendisi — kuralı kopyalamıyorum, yeniden türetiyorum (ADR-039'un
 * dersi, ve T-106'da §8.20 için zaten bir kez yaptım).
 *
 * T-100'DE TUTARI SATIRA YAZMAYI HAKLI ÇIKARAN ŞEY ADLİ DEĞERDİ:
 *   *"kuru 34,25'ten 40,00'a kim çekti"* — çünkü orada ÜÇÜNCÜ TARAF var
 *   (müşteri faturası, muhasebeci) ve tutar bir YÜKÜMLÜLÜĞÜN kanıtı.
 *
 * ⚠️ BURADA O DEĞER YOK, SORUMLULUK DA YOK:
 *   - Sistem TEK KULLANICILI (§1.B). "Kilomu kim 80'den 75'e çekti" sorusunun
 *     tek olası cevabı zaten kullanıcının kendisi.
 *   - "Ne zaman değişti" sorusunu `HealthLog.updatedAt` ZATEN cevaplıyor;
 *     denetim kaydı ikinci bir kopya olmaktan başka bir şey katmıyor.
 *   - Üçüncü taraf yok, yükümlülük yok, hesap verilecek kimse yok.
 *
 * ⚠️ VE SORUMLULUK YOKKEN HASSASİYET DAHA YÜKSEK: kilo, vücut yağı ve uyku
 * KVKK'nın özel nitelikli veri kategorisine girer (ADR-020 "hassas veri
 * (muhasebe, sağlık)" diye zaten ayırıyor). Denetim kaydı §8.21 YEDEĞİNE
 * giriyor ve T-052/T-053'ten beri EKRANA basılıyor — yani değeri yazmak, vücut
 * ölçümünü ikinci bir mağazaya VE ikinci bir ekrana kopyalamak demek.
 *
 * KARAR: DEĞER YAZILMIYOR, HANGİ ALANLARIN DEĞİŞTİĞİ VE HANGİ GÜNÜN KAYDI
 * OLDUĞU YAZILIYOR. Denetim kaydının burada cevaplayabileceği tek anlamlı soru
 * bu ("14 Ekim kaydımı düzenledim, kilo ve uyku alanlarına dokundum") ve bu
 * cevap hiçbir ölçümü duplike etmiyor.
 *
 * ⚠️ `note` DE YAZILMIYOR: serbest metin, yani içine ne yazıldığı bilinemez —
 * ADR-034'ün "masum anahtarın değerine gömülü sır" ölçümünün tarifi
 * (`Client.notes` ve `Transaction.description` ile aynı sınıf).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * `revalidateTag` YOK — T-110'da tarandı, gerekçe `services/health-log.ts`te.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** Denetim kaydına giren alan ADLARI — değerler ASLA. Gerekçe dosya başında. */
function changedFieldNames(input: Record<string, unknown>): string {
  return Object.keys(input)
    .filter((key) => key !== 'id')
    .sort()
    .join(', ');
}

/** Form su girdiyse alışkanlık da güncellenir; işaretlenemese de kayıt başarılıdır. */
async function suAliskanligi(
  actorId: string,
  dto: HealthLogDto,
  su: number | null | undefined,
): Promise<void> {
  if (su === undefined) return;
  await suAliskanliginiIsaretle(actorId, dto.date, su, true).catch((error: unknown) =>
    guvenliHata(
      '[saglik] alışkanlık işaretlenemedi:',
      error instanceof Error ? error.message : error,
    ),
  );
}

export async function createHealthLogAction(raw: unknown): Promise<ApiResponse<HealthLogDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createHealthLogSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    /*
     * ÖN KONTROL — `date @unique` ihlalini kullanıcıya ANLAŞILIR biçimde
     * söylemek için. T-038'in çift dönüşüm kalıbı: iki katmanlı savunma.
     * Tek başına yeterli DEĞİL (yarış var), ama P2002'nin ham metni
     * kullanıcıya NE YAPACAĞINI söylemiyor — mevcut kaydın kimliği söylüyor.
     */
    const mevcutId = await findHealthLogIdByDay(parsed.data.date);
    if (mevcutId) {
      return fail(
        'CONFLICT',
        'Bu güne ait bir kayıt zaten var. Günde yalnızca bir kayıt tutuluyor; mevcut kaydı düzenleyin.',
        { date: 'Bu gün için kayıt mevcut.', existingId: mevcutId },
      );
    }

    const dto = await createHealthLog(parsed.data);
    await suAliskanligi(actorId, dto, parsed.data.waterMl);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'HealthLog',
        entityId: dto.id,
        // ⚠️ DEĞER YOK — gerekçe dosya başında. Yalnızca hangi gün ve hangi alanlar.
        diff: { day: dto.date, changed: changedFieldNames(parsed.data) },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('healthLog:create', error, {
      // Yarışta kaybeden ikinci istek buraya düşer — ön kontrolle AYNI metin.
      conflict: {
        message:
          'Bu güne ait bir kayıt zaten var. Günde yalnızca bir kayıt tutuluyor; mevcut kaydı düzenleyin.',
        fields: { date: 'Bu gün için kayıt mevcut.' },
      },
    });
  }
}

export async function updateHealthLogAction(raw: unknown): Promise<ApiResponse<HealthLogDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateHealthLogSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await updateHealthLog(parsed.data);
    await suAliskanligi(actorId, dto, parsed.data.waterMl);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'HealthLog',
        entityId: dto.id,
        diff: { day: dto.date, changed: changedFieldNames(parsed.data) },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('healthLog:update', error, {
      /*
       * `date` güncellenebiliyor ve yeni gün başka bir kayda aitse `@unique`
       * ihlal olur. Sessizce başarısız olmasın.
       */
      conflict: {
        message: 'Seçilen güne ait başka bir kayıt var. Günde yalnızca bir kayıt tutuluyor.',
        fields: { date: 'Bu gün için kayıt mevcut.' },
      },
    });
  }
}

/**
 * Kaydı SİLER — arşivlemez. Gerekçe `services/health-log.ts`te
 * (`HealthLog` referans veri değil ÖLÇÜM; yanlış ölçüm silinir, ve bağlı FK yok).
 */
export async function deleteHealthLogAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await deleteHealthLog(parsed.data.id);

    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'HealthLog',
        entityId: dto.id,
        /*
         * ⚠️ SİLİNEN KAYDIN DEĞERLERİ DE YAZILMIYOR — ve bu, içerik
         * varlıklarından bilinçli bir sapma. BULGU-019'da `skill`/`service`
         * silmelerinde alanlar tek tek yazılıyordu, çünkü orada silinen şey
         * SİTE İÇERİĞİ ve "ne sildim" sorusu meşru.
         *
         * Burada silinen şey bir VÜCUT ÖLÇÜMÜ. Silinmiş bir kilo değerini
         * denetim kaydında (ve §8.21 yedeğinde) yaşatmak, silme niyetini
         * doğrudan baltalardı: kullanıcı kaydı sildi, değer başka bir yerde
         * duruyor. Hangi GÜNÜN kaydının silindiği yeterli.
         */
        diff: { day: dto.date },
      },
      db,
    );

    return ok({ id: dto.id });
  } catch (error) {
    return toFailure('healthLog:delete', error);
  }
}
