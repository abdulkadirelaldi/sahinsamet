import { NextResponse } from 'next/server';

import { MAX_UPLOAD_BYTES, uploadFormSchema } from '@/lib/schemas/attachment';
import { currentActorId } from '@/server/actions/_shared';
import { revalidateContent } from '@/server/actions/tags';
import {
  attachmentOwnerCacheTargets,
  attachmentTargetExists,
  storeAttachment,
  uploadRateGate,
  type AttachmentDto,
  type UploadRejection,
} from '@/server/services/attachment';
import {
  fail,
  internalError,
  ok,
  parseOrFail,
  unauthorized,
  writeAuditLog,
  type ApiFailure,
  type ApiResponse,
} from '@/server/services/_shared';
import { db } from '@/server/db';

/**
 * `POST /api/v1/panel/eklenti` — dosya yükleme, ADR-044.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN ROUTE HANDLER (Server Action DEĞİL)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Server Action gövdesi varsayılan 1 MB (T-037 ölçümü); §8.11 10 MB istiyor.
 * Route handler bu sınıra TABİ DEĞİL. T-037 bu yüzden tarayıcıdan doğrudan
 * R2'ye PUT seçmişti ve bucket'ta CORS olmadığı için o akış hiçbir tarayıcıdan
 * çalışmıyordu (ön uçuş 403). Baytlar artık buradan geçiyor ve YAZMADAN ÖNCE
 * doğrulanıyor.
 *
 * KİMLİK İKİ KATMAN: ara katman `/api/v1/panel/*`ı oturumsuz 401'e çeviriyor
 * (§8.5); burada AYRICA `currentActorId` (§8.6 + ADR-035/B iptali). Sıra:
 * kimlik → boyut (gövdeyi OKUMADAN) → hız (§8.16) → form → hedef → saklama.
 *
 * Form alanları: `dosya` (File), `entity`, `entityId`, `order` (isteğe bağlı).
 */

const BASLIKLAR = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

/** Çok parçalı gövdenin dosya dışındaki payı için tolerans. */
const FORM_PAYI = 64 * 1024;

const RED_METNI: Record<UploadRejection, string> = {
  EMPTY: 'Dosya boş.',
  TOO_LARGE: 'Dosya en fazla 10 MB olabilir.',
  TYPE_NOT_ALLOWED:
    'Dosya içeriği kabul edilen tiplerden biri değil (JPEG, PNG, WebP, AVIF, PDF). ' +
    'Uzantı doğru olsa bile içerik farklı olabilir.',
};

function json<T>(body: ApiResponse<T>, status: number): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>(body, { status, headers: BASLIKLAR });
}

function durumKodu(failure: ApiFailure): number {
  switch (failure.error.code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'RATE_LIMITED':
      return 429;
    case 'VALIDATION_ERROR':
      return 422;
    default:
      return 500;
  }
}

export async function POST(request: Request): Promise<NextResponse<ApiResponse<AttachmentDto>>> {
  const actorId = await currentActorId();
  if (!actorId) return json(unauthorized(), 401);

  /*
   * GÖVDEYİ OKUMADAN boyut kapısı: `formData()` gövdenin tamamını belleğe
   * alıyor. `Content-Length` yalan söyleyebilir — asıl kontrol baytlarda
   * (`storeAttachment`); bu yalnızca dürüst büyük istekleri ucuza reddediyor.
   */
  const uzunluk = Number(request.headers.get('content-length') ?? '0');
  if (uzunluk > MAX_UPLOAD_BYTES + FORM_PAYI) {
    return json(fail('VALIDATION_ERROR', RED_METNI.TOO_LARGE, { dosya: 'Dosya çok büyük.' }), 413);
  }

  try {
    const sinir = await uploadRateGate(actorId);
    if (sinir) return json(sinir, 429);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json(fail('VALIDATION_ERROR', 'İstek bir dosya formu değil.'), 400);
    }

    const dosya = form.get('dosya');
    if (!(dosya instanceof File)) {
      return json(fail('VALIDATION_ERROR', 'Dosya seçilmedi.', { dosya: 'Dosya seçin.' }), 422);
    }
    if (dosya.size > MAX_UPLOAD_BYTES) {
      return json(
        fail('VALIDATION_ERROR', RED_METNI.TOO_LARGE, { dosya: 'Dosya çok büyük.' }),
        413,
      );
    }

    const parsed = parseOrFail(uploadFormSchema, {
      entity: form.get('entity'),
      entityId: form.get('entityId'),
      order: Number(form.get('order') ?? '0'),
    });
    if (!parsed.ok) return json(parsed.failure, durumKodu(parsed.failure));

    const { entity, entityId, order } = parsed.data;
    if (!(await attachmentTargetExists(entity, entityId))) {
      return json(
        fail(
          'VALIDATION_ERROR',
          'Dosyanın bağlanacağı kayıt bulunamadı — silinmiş olabilir. Sayfayı yenileyin.',
          { entityId: 'Bağlanacak kayıt bulunamadı.' },
        ),
        422,
      );
    }

    const sonuc = await storeAttachment({
      bytes: Buffer.from(await dosya.arrayBuffer()),
      entity,
      entityId,
      order,
      actorId,
    });

    if (!sonuc.ok) {
      return json(
        fail('VALIDATION_ERROR', RED_METNI[sonuc.reason], { dosya: RED_METNI[sonuc.reason] }),
        sonuc.reason === 'TOO_LARGE' ? 413 : 422,
      );
    }

    const { attachment } = sonuc;
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Attachment',
        entityId: attachment.id,
        diff: {
          key: attachment.key,
          mime: attachment.mime,
          size: attachment.size,
          targetEntity: entity,
        },
      },
      db,
    );

    /*
     * ADR-029 — sahibin public önbelleği DÜŞÜRÜLÜYOR (galeri detay girdisinde).
     * Mutasyondan SONRA: önce düşürülseydi araya giren bir okuma eski hâli
     * yeniden önbelleğe yazabilirdi.
     */
    const hedef = await attachmentOwnerCacheTargets(entity, entityId);
    if (hedef) revalidateContent(hedef.contentEntity);

    return json(ok(attachment), 201);
  } catch (error) {
    return json(internalError('attachment:upload', error), 500);
  }
}
