import { describe, expect, it } from 'vitest';

import {
  base32Decode,
  generateTotp,
  millisecondsUntilNextPeriod,
  totpFromKey,
} from '../e2e/_helpers/totp';

/**
 * E2E'nin TOTP hesaplayıcısını RFC 6238 Ek B'deki RESMÎ VEKTÖRLERLE doğrular.
 *
 * NEDEN BU TEST VAR: `tests/e2e/_helpers/totp.ts` uygulamayı dışarıdan sınamak
 * için var. Kendisi yanlışsa E2E ya hep kırmızı olur (herkes zaman kaybeder) ya
 * da — daha kötüsü — yanlış kod üretip uygulamanın reddetmesini "doğru davranış"
 * sanır. Doğrulayanı doğrulayan katman burası.
 *
 * Vektörlerin tohumu ASCII "12345678901234567890" (20 bayt, SHA-1) ve
 * çıktılar 8 hanelidir — RFC'nin verdiği biçim budur. Uygulama 6 hane
 * kullanıyor; hane sayısı yalnızca son moddur, algoritmayı değiştirmez.
 */

const RFC6238_SEED = Buffer.from('12345678901234567890', 'ascii');

describe('RFC 6238 — resmî test vektörleri', () => {
  const VEKTORLER: ReadonlyArray<readonly [saniye: number, beklenen: string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ];

  for (const [saniye, beklenen] of VEKTORLER) {
    it(`T=${saniye} → ${beklenen}`, () => {
      expect(
        totpFromKey(RFC6238_SEED, { timestampMs: saniye * 1000, digits: 8, algorithm: 'sha1' }),
      ).toBe(beklenen);
    });
  }
});

describe('base32Decode', () => {
  /** RFC 4648 §10 test vektörlerinin tamamı. */
  it('bilinen Base32 dizelerini çözer', () => {
    expect(base32Decode('MY======').toString('utf8')).toBe('f');
    expect(base32Decode('MZXQ====').toString('utf8')).toBe('fo');
    expect(base32Decode('MZXW6===').toString('utf8')).toBe('foo');
    expect(base32Decode('MZXW6YQ=').toString('utf8')).toBe('foob');
    expect(base32Decode('MZXW6YTB').toString('utf8')).toBe('fooba');
    expect(base32Decode('MZXW6YTBOI======').toString('utf8')).toBe('foobar');
  });

  it('RFC 6238 tohumunun Base32 hâlini doğru çözer', () => {
    // "12345678901234567890" ASCII karşılığı.
    expect(base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')).toEqual(RFC6238_SEED);
  });

  it('boşluk ve küçük harfi tolere eder', () => {
    expect(base32Decode('mzxw 6ytb oi').toString('utf8')).toBe('foobar');
  });

  it('geçersiz karakterde fırlatır — sessizce yanlış anahtar üretmez', () => {
    expect(() => base32Decode('MZXW6YT1')).toThrow(/Base32/);
  });
});

describe('generateTotp — uygulamanın kullandığı biçim', () => {
  it('varsayılan 6 hane üretir', () => {
    const kod = generateTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');

    expect(kod).toMatch(/^\d{6}$/);
  });

  it('Base32 secret ile ham anahtar aynı sonucu verir', () => {
    const zaman = 1234567890 * 1000;

    expect(
      generateTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', { timestampMs: zaman, digits: 8 }),
    ).toBe(totpFromKey(RFC6238_SEED, { timestampMs: zaman, digits: 8 }));
  });

  /** Aynı 30 sn'lik pencerede kod sabit, sonraki pencerede değişmeli. */
  it('kod periyot boyunca sabit, periyot değişince değişir', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const taban = 1_700_000_000_000;
    const periyotBasi = taban - (taban % 30_000);

    expect(generateTotp(secret, { timestampMs: periyotBasi })).toBe(
      generateTotp(secret, { timestampMs: periyotBasi + 29_000 }),
    );
    expect(generateTotp(secret, { timestampMs: periyotBasi })).not.toBe(
      generateTotp(secret, { timestampMs: periyotBasi + 30_000 }),
    );
  });
});

describe('millisecondsUntilNextPeriod', () => {
  it('periyot sınırında tam periyot döner', () => {
    expect(millisecondsUntilNextPeriod(30_000)).toBe(30_000);
  });

  it('periyot ortasında kalan süreyi döner', () => {
    expect(millisecondsUntilNextPeriod(40_000)).toBe(20_000);
  });
});
