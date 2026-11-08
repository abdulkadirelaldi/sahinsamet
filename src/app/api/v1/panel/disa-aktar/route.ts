import { NextResponse } from 'next/server';
import * as z from 'zod';

import { currentActorId } from '@/server/actions/_shared';
import { db } from '@/server/db';
import { appToday, writeAuditLog } from '@/server/services/_shared';
import { disaAktar } from '@/server/services/disa-aktar';

/**
 * `GET /api/v1/panel/disa-aktar?tur=cuzdan|saglik|aliskanlik|spor|gunluk|hedef` — CSV indirme
 * (2026-10-31). Kimlik iki katman: ara katman `/api/v1/panel/*`ı oturumsuz
 * 401'e çeviriyor + burada `currentActorId`. Her indirme denetime `EXPORT`.
 * Önbelleğe ALINMAZ (`no-store`) — kişisel finans ve sağlık verisi.
 */

const turSchema = z.enum(['cuzdan', 'saglik', 'aliskanlik', 'spor', 'gunluk', 'hedef']);

export async function GET(request: Request): Promise<Response> {
  const actorId = await currentActorId();
  if (!actorId) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Oturum gerekli.' } },
      { status: 401 },
    );
  }

  const tur = turSchema.safeParse(new URL(request.url).searchParams.get('tur'));
  if (!tur.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Geçersiz tür.' } },
      { status: 400 },
    );
  }

  const govde = await disaAktar(tur.data);
  await writeAuditLog(
    {
      actorId,
      action: 'EXPORT',
      entity: 'DisaAktar',
      entityId: tur.data,
      diff: { bayt: govde.length },
    },
    db,
  );

  return new Response(govde, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tur.data}-${appToday()}.csv"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
