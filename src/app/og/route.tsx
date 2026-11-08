import { ImageResponse } from 'next/og';

import { SITE_INITIALS, SITE_NAME } from '@/lib/constants';
import { getProfile } from '@/server/services';

import { OG_FONT_NAME, ogFontData } from './font';

/**
 * `/og` — ana sayfanın paylaşım görseli (1200×630): ad + tanıtım satırı.
 *
 * RUNTIME NODE: rota Prisma'dan okuyor; Edge'de Prisma yüklenemiyor (T-014/K1).
 * `ImageResponse` Node yapısını da taşıyor.
 *
 * SORGU PARAMETRESİ ALINMIYOR: `/og?title=…` herkese açık bir metin
 * oluşturucu olurdu — üçüncü kişi bizim alan adımızla istediği metni
 * paylaşabilirdi (ADR-032'nin görsel karşılığı). Metin yalnızca profilden.
 */
export const runtime = 'nodejs';

const SIZE = { width: 1200, height: 630 };

/** Uzun metin görseli taşırır; satori kırpmaz, taşan metni çizer. */
function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

async function tanitimSatiri(): Promise<string> {
  try {
    return (await getProfile()).headline.trim();
  } catch {
    // Profil okunamazsa görsel yine üretilsin — yalnızca adla.
    return '';
  }
}

export async function GET(): Promise<ImageResponse> {
  const headline = await tanitimSatiri();

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: 'linear-gradient(135deg, #0a0a12 0%, #1a1a2e 100%)',
        color: '#ececf5',
        fontFamily: OG_FONT_NAME,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 96,
          height: 96,
          borderRadius: 48,
          background: 'linear-gradient(135deg, #7756ff 0%, #1c6aff 100%)',
          color: '#ffffff',
          fontSize: 40,
        }}
      >
        {SITE_INITIALS}
      </div>
      <div style={{ display: 'flex', marginTop: 40, fontSize: 76, letterSpacing: '-0.02em' }}>
        {SITE_NAME}
      </div>
      {headline && (
        <div style={{ display: 'flex', marginTop: 20, fontSize: 34, color: '#b4b4cc' }}>
          {truncate(headline, 90)}
        </div>
      )}
      <div style={{ display: 'flex', marginTop: 'auto', fontSize: 26, color: '#a78bfa' }}>
        sahinsamet.com
      </div>
    </div>,
    {
      ...SIZE,
      fonts: [{ name: OG_FONT_NAME, data: ogFontData(), weight: 400, style: 'normal' }],
    },
  );
}
