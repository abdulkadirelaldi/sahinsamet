'use server';

import { entityIdSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import { attachmentOwnerCacheTargets, fetchAttachmentById } from '@/server/services/attachment';
import { deleteObjectQuietly } from '@/server/storage/r2';
import {
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';
import { revalidateContent } from './tags';

/**
 * EKLENTİ Server Action'ları — §8.11, ADR-018, ADR-044.
 *
 * ⚠️ YÜKLEME BURADA DEĞİL — `POST /api/v1/panel/eklenti` (ADR-044).
 *
 * T-037'de burada iki adımlı bir akış vardı (`requestUploadAction` imzalı PUT
 * adresi veriyor, tarayıcı DOĞRUDAN R2'ye yazıyor, `confirmUploadAction`
 * doğruluyordu). T-037f'te tarayıcının yapacağı isteği ölçtüm: bucket'ta CORS
 * yok, ön uçuş 403 — akış HİÇBİR tarayıcıdan çalışmazdı (T-037 `curl` ile
 * ölçmüştü, `curl` CORS'a tabi değil). Server Action'ın 1 MB gövde sınırı
 * route handler'da yok; yükleme oraya taşındı ve doğrulama artık YAZMADAN
 * ÖNCE yapılıyor. Arayüzü olmayan, imzalı PUT adresi dağıtan iki uç kaldırıldı.
 */

/* ===========================================================================
 * SİLME
 * ======================================================================== */

/**
 * Eklentiyi siler — ÖNCE DB SATIRI, SONRA R2 NESNESİ.
 *
 * ⚠️ SIRA YÜKLEMENİN TERSİ VE SEBEBİ AYNI MANTIK: başarısızlık penceresinde
 * kalan şey yine YETİM NESNE olsun, kırık referans olmasın.
 *
 *   satır silindi, nesne silinemedi → yetim nesne (görünmez, gece işi alır)
 *   nesne silindi, satır silinemedi → KIRIK REFERANS (kullanıcı kırık görsel
 *                                     görür ve neden olduğunu anlamaz)
 *
 * ⚠️ `onDelete: Restrict` BURADA GERÇEK BİR KAPI: eklenti bir kapak/CV olarak
 * bağlıysa `db.attachment.delete` P2003 ile düşüyor ve nesneye HİÇ
 * DOKUNULMUYOR — çünkü silme sırası DB'yi öne alıyor. T-050'de yazdığım P2003
 * dalının mesajı ("Seçilen dosya bulunamadı…") burada ters yönden okunuyor, bu
 * yüzden kendi metnini veriyorum.
 */
export async function deleteAttachmentAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const mevcut = await fetchAttachmentById(parsed.data.id);
    if (!mevcut) return notFound('Dosya bulunamadı.');

    await db.attachment.delete({ where: { id: parsed.data.id } });

    // Satır gitti; nesne gitmezse yetim kalır ve gece işi alır.
    await deleteObjectQuietly(mevcut.key);

    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'Attachment',
        entityId: mevcut.id,
        diff: { deleted: { key: mevcut.key, mime: mevcut.mime, size: mevcut.size } },
      },
      db,
    );

    // ADR-029 — silinen görsel public galeride kırık kare olarak kalmasın.
    const hedef = await attachmentOwnerCacheTargets(mevcut.entity, mevcut.entityId);
    if (hedef) revalidateContent(hedef.contentEntity);

    return ok({ id: mevcut.id });
  } catch (error) {
    return toFailure('attachment:delete', error, {
      foreignKey: {
        message:
          'Bu dosya bir kapak görseli ya da CV olarak kullanılıyor. Önce kullanıldığı yerden kaldırın.',
        fields: { id: 'Dosya kullanımda.' },
      },
    });
  }
}
