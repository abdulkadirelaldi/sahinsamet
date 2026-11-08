import { auth } from '@/server/auth';
import {
  PUBLIC_ATTACHMENT_ENTITIES,
  fetchAttachmentForServing,
} from '@/server/services/attachment';
import { getObjectBytes } from '@/server/storage/r2';
import { guvenliHata } from '@/lib/security/guvenli-log';

/**
 * `GET /api/v1/dosya/[id]` — eklenti sunumu, ADR-044.
 *
 * Tarayıcı R2'ye hiç gitmiyor: HTML'de imzalı adres yok, yalnızca bu kalıcı
 * adres. ADR-018'in öngördüğü çatışma (15 dakikada bayatlayan imzalı adres ×
 * önbellekli sayfa) böylece hiç doğmuyor ve CSP `img-src 'self'` kalıyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KİM GÖREBİLİR — VARSAYILAN REDDET
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   PROJECT · POST · PROFILE → herkese açık, `public, immutable` (içerik
 *     DEĞİŞMEZ: yeni dosya yeni kimlik; önbellek asla bayatlamaz)
 *   diğerleri (kişisel kayıtlar) → YALNIZCA OTURUMLA, `private, no-store`
 *
 *   T-117'nin müşteri logosu istisnası 2026-10-29'da müşteri modülüyle
 *   birlikte kaldırıldı.
 *
 * ⚠️ Oturumsuz istek özel bir dosya için 404 alıyor, 401 DEĞİL: 401 dosyanın
 * VAR OLDUĞUNU söylerdi. Kimlik tahmin edilemez (cuid) ama ikinci bir kat.
 *
 * ⚠️ BU OKUMA ADR-035/B İPTALİNE TABİ DEĞİL (`auth()`, `currentActorId` değil):
 * iptal YAZMALAR içindi; okumalar F6/C'ye bırakıldı (`getTotpStatus` ile aynı).
 */

const BIR_YIL = 31_536_000;

/**
 * Kimlik karakter kümesi — DAR. `cuidSchema` bilerek gevşek (1–64 uzunluk;
 * tohum kimlikleri `seed_…` biçiminde). Burada yol kaçışı riski YOK — R2
 * anahtarı kimlikten değil SATIRDAN geliyor — ama `../etc` gibi çöp girdiyi
 * veritabanına hiç götürmemek ucuz bir ikinci kat.
 */
const KIMLIK = /^[A-Za-z0-9_-]{1,64}$/;

function bulunamadi(): Response {
  return new Response('Bulunamadı', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!KIMLIK.test(id)) return bulunamadi();

  try {
    const dosya = await fetchAttachmentForServing(id);
    if (!dosya) return bulunamadi();

    const herkeseAcik = PUBLIC_ATTACHMENT_ENTITIES.has(dosya.entity);
    if (!herkeseAcik) {
      const oturum = await auth();
      if (!oturum?.user?.id) return bulunamadi();
    }

    const onbellek = herkeseAcik ? `public, max-age=${BIR_YIL}, immutable` : 'private, no-store';
    const etag = `"${dosya.checksum}"`;

    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, {
        status: 304,
        headers: { ETag: etag, 'Cache-Control': onbellek },
      });
    }

    const bytes = await getObjectBytes(dosya.key);
    if (!bytes) return bulunamadi();

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': dosya.mime,
        'Content-Length': String(bytes.length),
        'Cache-Control': onbellek,
        ETag: etag,
        'Content-Disposition': 'inline',
        ...(herkeseAcik ? {} : { 'X-Robots-Tag': 'noindex, nofollow' }),
      },
    });
  } catch (error) {
    guvenliHata('[dosya] sunulamadı:', error);
    return new Response('Dosya şu anda sunulamıyor', {
      status: 502,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
