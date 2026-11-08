import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { guvenliHata, guvenliParca, redactLogText } from '@/lib/security/guvenli-log';

/**
 * §8.20 — "Loglarda şifre, token, TOTP secret, tam e-posta ASLA görünmez"
 * (T-062). İki yarı:
 *
 *   1. MASKELEME — her sır biçimi için bir vaka, ve KARŞI vakalar: teşhis
 *      için gereken bilgi (alan adı, kayıt kimliği, şema) KALMALI. Her şeyi
 *      silen bir maskeleyici de bu testleri geçerdi; karşı vakalar onu engeller.
 *   2. KAPI — sunucu katmanında doğrudan `console` çağrısı YOK. Tek bir
 *      maskelenmemiş çağrı tüm modülün değerini sıfırlar.
 */

describe('redactLogText — sır biçimleri', () => {
  it('bağlantı dizesinin kullanıcı:parola kısmı', () => {
    const metin = redactLogText(
      'connect ECONNREFUSED postgresql://sahinsamet:CokGizliParola9@db:5432/app',
    );
    expect(metin).not.toContain('CokGizliParola9');
    expect(metin).not.toContain('sahinsamet:');
    // Teşhis: şema ve sunucu kalıyor.
    expect(metin).toContain('postgresql://[gizli]@db:5432/app');
  });

  it('⚠️ e-postanın YEREL kısmı — alan adı kalıyor', () => {
    const metin = redactLogText('Unique constraint failed for email samet@ornek.com');
    expect(metin).not.toContain('samet@');
    expect(metin).toContain('s***@ornek.com');
  });

  it('⚠️ Prisma doğrulama hatası biçimi — argümanlardaki e-posta ve hash', () => {
    const prisma = `Invalid \`prisma.user.update()\` invocation:
{ data: { email: "kisi@ornek.com", passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$aGFzaGhhc2hoYXNo" } }`;
    const metin = redactLogText(prisma);
    expect(metin).not.toContain('kisi@');
    expect(metin).not.toContain('$argon2id$');
    expect(metin).toContain('[hash]');
    expect(metin).toContain('prisma.user.update()');
  });

  it('JWT ve Bearer', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3JfMSJ9.c2lnbmF0dXJl';
    expect(redactLogText(`jeton ${jwt} reddedildi`)).toBe('jeton [jwt] reddedildi');
    expect(redactLogText('Authorization: Bearer abc.def.ghi')).toBe(
      'Authorization: Bearer [gizli]',
    );
  });

  it('otpauth adresi — secret parametre olarak içinde', () => {
    const metin = redactLogText(
      'qr: otpauth://totp/Panel:a@b.co?secret=GEZDGNBVGY3TQOJQ&issuer=Panel',
    );
    expect(metin).not.toContain('GEZDGNBVGY3TQOJQ');
    expect(metin).toBe('qr: [otpauth]');
  });

  it('32+ karakterlik anahtar/imza dizisi', () => {
    const anahtar = 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo0NTY3ODk=';
    expect(redactLogText(`anahtar=${anahtar}`)).toBe('anahtar=[gizli]');
  });

  it('KARŞI VAKA — cuid kimliği ve sıradan metin KALIYOR', () => {
    const metin = '[project:update] kayıt bulunamadı: ckabcdefghijklmnopqrstuv (P2025)';
    expect(redactLogText(metin)).toBe(metin);
  });
});

describe('guvenliParca', () => {
  it('Error → ad + maskelenmiş mesaj, yığın izi YOK', () => {
    const hata = new Error('bağlanılamadı: postgres://u:p@h/db');
    const metin = guvenliParca(hata);
    expect(metin).toBe('Error: bağlanılamadı: postgres://[gizli]@h/db');
    expect(metin).not.toContain('    at ');
  });

  it('nesne JSON olarak, içindeki e-posta maskeli; döngü çökertmiyor', () => {
    expect(guvenliParca({ kime: 'ali@ornek.com' })).toBe('{"kime":"a***@ornek.com"}');
    const dongu: Record<string, unknown> = {};
    dongu.ben = dongu;
    expect(guvenliParca(dongu)).toBe('[yazdırılamayan değer]');
  });
});

describe('guvenliHata — gerçekten console`a maskeli yazıyor', () => {
  afterEach(() => vi.restoreAllMocks());

  it('her parça maskelenmiş', () => {
    const casus = vi.spyOn(console, 'error').mockImplementation(() => {});
    guvenliHata('[auth]', new Error('kullanıcı veli@ornek.com bulunamadı'));
    expect(casus).toHaveBeenCalledWith('[auth]', 'Error: kullanıcı v***@ornek.com bulunamadı');
  });
});

/* ===========================================================================
 * KAPI — sunucu katmanında doğrudan `console` YOK
 * ======================================================================== */

const KOK = resolve(__dirname, '..', '..');

function dosyalar(goreli: string): string[] {
  const sonuc: string[] = [];
  for (const ad of readdirSync(join(KOK, goreli))) {
    const yol = `${goreli}/${ad}`;
    if (statSync(join(KOK, yol)).isDirectory()) {
      if (ad === 'generated') continue;
      sonuc.push(...dosyalar(yol));
    } else if (/\.tsx?$/.test(ad)) sonuc.push(yol);
  }
  return sonuc;
}

/**
 * Taranmayanlar, gerekçesiyle:
 *   - modülün kendisi (çağrıyı o yapıyor);
 *   - `'use client'` dosyaları — TARAYICI konsoluna yazar, sunucu loguna değil
 *     (`error.tsx` hata sınırları).
 */
const MUAF = new Set(['src/lib/security/guvenli-log.ts']);

describe('§8.20 KAPI — sunucu katmanı console`u doğrudan çağırmıyor', () => {
  const kod = (yol: string) =>
    readFileSync(join(KOK, yol), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

  const taranan = dosyalar('src').filter((y) => {
    if (MUAF.has(y)) return false;
    return !/^\s*['"]use client['"]/m.test(readFileSync(join(KOK, y), 'utf8'));
  });

  it('önkoşul — tarama sunucu dosyalarını kapsıyor', () => {
    expect(taranan.length).toBeGreaterThan(150);
    expect(taranan).toContain('src/server/services/_shared/api-response.ts');
    expect(taranan).toContain('src/lib/security/session.ts');
  });

  it('⚠️ doğrudan console.error/warn/log/info YOK', () => {
    const ihlal = taranan.filter((y) =>
      /\bconsole\.(?:error|warn|log|info|debug)\s*\(/.test(kod(y)),
    );
    expect(
      ihlal,
      'Maskelenmemiş log — `guvenliHata`/`guvenliUyari` kullan (`@/lib/security/guvenli-log`).',
    ).toEqual([]);
  });
});
