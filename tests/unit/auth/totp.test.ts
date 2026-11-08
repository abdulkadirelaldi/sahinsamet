import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildTotpUri,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  isEncryptedSecret,
  verifyTotpToken,
} from '@/server/auth/totp';

/** 32 baytlık geçerli anahtar (base64). Test amaçlı sabit. */
const TEST_KEY = Buffer.alloc(32, 7).toString('base64');
const ORIGINAL_KEY = process.env.TOTP_ENCRYPTION_KEY;
const ORIGINAL_ISSUER = process.env.TOTP_ISSUER;

beforeEach(() => {
  process.env.TOTP_ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
  else process.env.TOTP_ENCRYPTION_KEY = ORIGINAL_KEY;
  if (ORIGINAL_ISSUER === undefined) delete process.env.TOTP_ISSUER;
  else process.env.TOTP_ISSUER = ORIGINAL_ISSUER;
});

describe('generateTotpSecret', () => {
  it('32 karakterlik Base32 secret üretir', async () => {
    const secret = await generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('her çağrıda farklı secret üretir', async () => {
    const [a, b] = await Promise.all([generateTotpSecret(), generateTotpSecret()]);
    expect(a).not.toBe(b);
  });
});

describe('verifyTotpToken', () => {
  it('kendi ürettiği geçerli kodu kabul eder', async () => {
    const secret = await generateTotpSecret();
    // otplib ile aynı yoldan geçerli bir token üretiyoruz
    const { generate, NobleCryptoPlugin, ScureBase32Plugin } = await import('otplib');
    const token = await generate({
      secret,
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
      period: 30,
    });
    expect(await verifyTotpToken(token, secret)).toBe(true);
  });

  it('yanlış kodu reddeder', async () => {
    const secret = await generateTotpSecret();
    expect(await verifyTotpToken('000000', secret)).toBe(false);
  });

  it('başka secret ile üretilmiş kodu reddeder', async () => {
    const [s1, s2] = await Promise.all([generateTotpSecret(), generateTotpSecret()]);
    const { generate, NobleCryptoPlugin, ScureBase32Plugin } = await import('otplib');
    const token = await generate({
      secret: s2,
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
      period: 30,
    });
    expect(await verifyTotpToken(token, s1)).toBe(false);
  });

  it('biçimsel olarak bozuk kodda FIRLATMAZ, false döner', async () => {
    const secret = await generateTotpSecret();
    for (const bad of ['', 'abc', '12345', '1234567', 'ABCDEF']) {
      await expect(verifyTotpToken(bad, secret)).resolves.toBe(false);
    }
  });

  it('bozuk secret ile fırlatmaz', async () => {
    await expect(verifyTotpToken('123456', 'bu-base32-degil!')).resolves.toBe(false);
  });
});

describe('buildTotpUri', () => {
  it('otpauth bağlantısı üretir ve issuer’ı ortamdan alır', async () => {
    process.env.TOTP_ISSUER = 'Samet Panel';
    const secret = await generateTotpSecret();
    const uri = await buildTotpUri(secret, 'admin@example.com');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain('issuer=Samet%20Panel');
  });

  it('TOTP_ISSUER tanımsızsa yedek issuer kullanılır', async () => {
    delete process.env.TOTP_ISSUER;
    const secret = await generateTotpSecret();
    expect(await buildTotpUri(secret, 'admin@example.com')).toContain('issuer=Panel');
  });
});

describe('encryptSecret / decryptSecret — AES-256-GCM', () => {
  it('şifreleyip çözünce aynı değeri verir', async () => {
    const secret = await generateTotpSecret();
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it('DETERMİNİSTİK DEĞİL — aynı girdi iki kez farklı çıktı verir', async () => {
    const secret = await generateTotpSecret();
    const a = encryptSecret(secret);
    const b = encryptSecret(secret);
    expect(a).not.toBe(b);
    // ama ikisi de aynı değere çözülür
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it('şifreli çıktı düz secret’ı İÇERMEZ', async () => {
    const secret = await generateTotpSecret();
    expect(encryptSecret(secret)).not.toContain(secret);
  });

  it('biçim: v1.<iv>.<tag>.<ciphertext>', () => {
    const parts = encryptSecret('TESTSECRET').split('.');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('v1');
    expect(Buffer.from(parts[1] ?? '', 'base64url')).toHaveLength(12); // IV
    expect(Buffer.from(parts[2] ?? '', 'base64url')).toHaveLength(16); // GCM etiketi
  });

  it('KURCALANMIŞ şifreli metin çözülünce FIRLATIR (GCM etiketi tutmaz)', () => {
    const payload = encryptSecret('TESTSECRET');
    const parts = payload.split('.');
    const data = Buffer.from(parts[3] ?? '', 'base64url');
    data[0] = (data[0] ?? 0) ^ 0xff; // tek bit çevir
    const tampered = [parts[0], parts[1], parts[2], data.toString('base64url')].join('.');
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('kurcalanmış ETİKET de fırlatır', () => {
    const parts = encryptSecret('TESTSECRET').split('.');
    const tag = Buffer.from(parts[2] ?? '', 'base64url');
    tag[0] = (tag[0] ?? 0) ^ 0xff;
    expect(() =>
      decryptSecret([parts[0], parts[1], tag.toString('base64url'), parts[3]].join('.')),
    ).toThrow();
  });

  it('tanınmayan biçim fırlatır', () => {
    expect(() => decryptSecret('duz-metin')).toThrow(/biçimi tanınmıyor/);
    expect(() => decryptSecret('v2.a.b.c')).toThrow(/biçimi tanınmıyor/);
  });

  it('BAŞKA anahtarla çözülemez', () => {
    const payload = encryptSecret('TESTSECRET');
    process.env.TOTP_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
    expect(() => decryptSecret(payload)).toThrow();
  });
});

describe('anahtar doğrulaması — İLK KULLANIMDA, modül yüklenirken değil', () => {
  it('anahtar yoksa anlaşılır hata verir', () => {
    delete process.env.TOTP_ENCRYPTION_KEY;
    // Modül zaten yüklü ve import çökmedi — hata yalnızca çağrıda çıkıyor.
    expect(() => encryptSecret('X')).toThrow(/TOTP_ENCRYPTION_KEY tanımlı değil/);
  });

  it('yanlış uzunluktaki anahtar reddedilir ve anahtar mesajda GÖRÜNMEZ', () => {
    const shortKey = Buffer.alloc(16, 3).toString('base64');
    process.env.TOTP_ENCRYPTION_KEY = shortKey;
    try {
      encryptSecret('X');
      throw new Error('fırlatmalıydı');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('32 bayt olmalı');
      expect(message).toContain('16 bayt çözüldü');
      expect(message).not.toContain(shortKey); // §8.20
    }
  });
});

describe('isEncryptedSecret', () => {
  it('şifreli değeri tanır, düz secret’ı tanımaz', async () => {
    const secret = await generateTotpSecret();
    expect(isEncryptedSecret(encryptSecret(secret))).toBe(true);
    expect(isEncryptedSecret(secret)).toBe(false);
  });
});

describe('anahtar biçimi — base64 sessizce bozulursa', () => {
  it('geçersiz base64 uzunluk kontrolüne takılır (Buffer.from fırlatmaz)', () => {
    process.env.TOTP_ENCRYPTION_KEY = '!!!not-base64!!!';
    expect(() => encryptSecret('X')).toThrow(/32 bayt olmalı/);
  });

  it('boş dize anahtar "tanımlı değil" olarak ele alınır', () => {
    process.env.TOTP_ENCRYPTION_KEY = '';
    expect(() => encryptSecret('X')).toThrow(/tanımlı değil/);
  });
});
