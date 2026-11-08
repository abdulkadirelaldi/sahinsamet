import { NextResponse } from 'next/server';

import { guvenliHata } from '@/lib/security/guvenli-log';
import { extractClientIp } from '@/server/auth/credentials';
import { anahtarDogrula, olcumSchema, olcumYaz } from '@/server/services/saglik-baglantisi';

/**
 * `POST /api/v1/saglik/olcum` — iPhone Kısayollar (2026-11-01).
 * `Authorization: Bearer aesk_…` + JSON `{adim?, uyku?, nabiz?, kilo?, gun?}`.
 *
 * Oturum değil ANAHTAR: `/api/v1/panel/*` dışında, çünkü Kısayollar çerez
 * taşımaz. Her istek denetim kaydı yazmaz (günde birkaç kez çalışan otomasyon
 * kaydı boğardı); son kullanım anahtarın satırında. Anahtar oluşturma/iptal
 * denetlenir. Değerler günlüğe yazılmaz.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GOVDE_TAVANI = 2_048;
const DAKIKA_TAVANI = 30;
const istekler = new Map<string, { sayi: number; bas: number }>();

/** IP başına dakikalık tavan — geçersiz anahtar seli veritabanını yormasın. SAF değil. */
function fazlaIstek(ip: string, simdi: number): boolean {
  if (istekler.size > 1_000) istekler.clear();
  const k = istekler.get(ip);
  if (!k || simdi - k.bas > 60_000) {
    istekler.set(ip, { sayi: 1, bas: simdi });
    return false;
  }
  k.sayi += 1;
  return k.sayi > DAKIKA_TAVANI;
}

const yanit = (durum: number, govde: unknown) =>
  NextResponse.json(govde, {
    status: durum,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
const hata = (durum: number, code: string, message: string) =>
  yanit(durum, { ok: false, error: { code, message } });

export async function POST(request: Request): Promise<Response> {
  if (fazlaIstek(extractClientIp(request), Date.now())) {
    return hata(429, 'RATE_LIMITED', 'Çok fazla istek.');
  }

  const anahtar = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  try {
    if (!anahtar || !(await anahtarDogrula(anahtar))) {
      return hata(401, 'UNAUTHORIZED', 'Anahtar geçersiz.');
    }

    const ham = await request.text();
    if (ham.length > GOVDE_TAVANI) return hata(413, 'VALIDATION_ERROR', 'Gövde çok büyük.');
    let json: unknown;
    try {
      json = JSON.parse(ham);
    } catch {
      return hata(400, 'VALIDATION_ERROR', 'JSON okunamadı.');
    }
    const girdi = olcumSchema.safeParse(json);
    if (!girdi.success) return hata(400, 'VALIDATION_ERROR', 'Ölçü geçersiz.');

    return yanit(200, { ok: true, data: await olcumYaz(girdi.data) });
  } catch (error) {
    guvenliHata('[saglik/olcum]', error instanceof Error ? error.name : 'hata');
    return hata(500, 'INTERNAL_ERROR', 'Kaydedilemedi.');
  }
}
