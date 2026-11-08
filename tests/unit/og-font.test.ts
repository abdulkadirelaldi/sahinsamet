import { describe, expect, it } from 'vitest';

import { OG_FONT_NAME, ogFontData } from '@/app/og/font';

/**
 * OG FONT KAPISI — BULGU-014.
 *
 * Gömülü font bozuk ya da DEĞİŞKEN olduğunda `pnpm build` GEÇER, diğer testler
 * GEÇER ve hata yalnızca gerçek bir istekte ortaya çıkar:
 *
 *   TypeError: Cannot read properties of undefined (reading '256')
 *     at parseFvarAxis (@vercel/og)
 *
 * Sebep: paketlenmiş opentype.js'te `font.names` hiç doldurulmuyor, bu yüzden
 * `fvar` tablosu taşıyan her font ayrıştırmada çöküyor. Bu test o koşulu
 * DERLEMEDEN ÖNCE yakalar — font ikili olarak burada doğrulanır.
 */

const font = Buffer.from(ogFontData());

/** TrueType tablo dizinini okur. */
function tableTags(buffer: Buffer): string[] {
  const count = buffer.readUInt16BE(4);
  const tags: string[] = [];
  for (let i = 0; i < count; i += 1) {
    tags.push(buffer.toString('ascii', 12 + i * 16, 16 + i * 16));
  }
  return tags;
}

/** `cmap` format 4 alt tablosunda kod noktası var mı. */
function hasGlyph(buffer: Buffer, codePoint: number): boolean {
  const tableCount = buffer.readUInt16BE(4);
  let cmapOffset: number | null = null;
  for (let i = 0; i < tableCount; i += 1) {
    const entry = 12 + i * 16;
    if (buffer.toString('ascii', entry, entry + 4) === 'cmap') {
      cmapOffset = buffer.readUInt32BE(entry + 8);
    }
  }
  if (cmapOffset === null) return false;

  const subtableCount = buffer.readUInt16BE(cmapOffset + 2);
  let subtable: number | null = null;
  for (let i = 0; i < subtableCount; i += 1) {
    const record = cmapOffset + 4 + i * 8;
    const platform = buffer.readUInt16BE(record);
    const encoding = buffer.readUInt16BE(record + 2);
    const offset = buffer.readUInt32BE(record + 4);
    if (platform === 3 && encoding === 1 && buffer.readUInt16BE(cmapOffset + offset) === 4) {
      subtable = cmapOffset + offset;
    }
  }
  if (subtable === null) return false;

  const segCountX2 = buffer.readUInt16BE(subtable + 6);
  const segCount = segCountX2 / 2;
  const endOffset = subtable + 14;
  const startOffset = endOffset + segCountX2 + 2;
  const deltaOffset = startOffset + segCountX2;
  const rangeOffset = deltaOffset + segCountX2;

  for (let i = 0; i < segCount; i += 1) {
    if (codePoint > buffer.readUInt16BE(endOffset + i * 2)) continue;
    const start = buffer.readUInt16BE(startOffset + i * 2);
    if (codePoint < start) return false;
    const range = buffer.readUInt16BE(rangeOffset + i * 2);
    if (range === 0) {
      return ((codePoint + buffer.readInt16BE(deltaOffset + i * 2)) & 0xffff) !== 0;
    }
    const glyphIndex = rangeOffset + i * 2 + range + (codePoint - start) * 2;
    if (glyphIndex + 1 >= buffer.length) return false;
    return buffer.readUInt16BE(glyphIndex) !== 0;
  }
  return false;
}

describe('gömülü OG fontu', () => {
  it('geçerli bir TrueType dosyası', () => {
    // 0x00010000 (TTF) veya 'true'. Base64 gömme bozulsaydı burada anlaşılır.
    expect(font.length).toBeGreaterThan(1000);
    expect(font.readUInt32BE(0)).toBe(0x00010000);
  });

  it('ZORUNLU tablolar yerinde', () => {
    expect(tableTags(font)).toEqual(
      expect.arrayContaining(['cmap', 'glyf', 'head', 'hmtx', 'loca']),
    );
  });

  it('DEĞİŞKEN FONT DEĞİL — fvar/gvar YOK (BULGU-014)', () => {
    // `fvar` taşıyan font çalışma zamanında parseFvarAxis içinde çöker.
    // Derleme ve diğer testler bunu YAKALAMAZ; kapı burasıdır.
    const tags = tableTags(font);
    expect(tags).not.toContain('fvar');
    expect(tags).not.toContain('gvar');
  });

  it('TÜRKÇE HARFLERİN HEPSİ VAR', () => {
    const turkish: Record<string, number> = {
      İ: 0x0130,
      ı: 0x0131,
      ğ: 0x011f,
      Ğ: 0x011e,
      ş: 0x015f,
      Ş: 0x015e,
      ç: 0x00e7,
      Ç: 0x00c7,
      ö: 0x00f6,
      Ö: 0x00d6,
      ü: 0x00fc,
      Ü: 0x00dc,
    };
    const eksik = Object.entries(turkish)
      .filter(([, cp]) => !hasGlyph(font, cp))
      .map(([ch]) => ch);
    expect(eksik, `eksik glif: ${eksik.join(' ')}`).toEqual([]);
  });

  it('font adı tanımlı', () => {
    expect(OG_FONT_NAME).toBe('Space Grotesk');
  });
});
