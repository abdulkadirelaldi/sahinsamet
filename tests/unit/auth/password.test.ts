import { describe, expect, it } from 'vitest';

import { ARGON2_OPTIONS, hashPassword, needsRehash, verifyPassword } from '@/server/auth/password';

/**
 * Testler ÜRETİM parametrelerini kullanmaz — 19 MiB × timeCost 3 her çağrıda
 * ~50 ms ve testler onlarca hash üretiyor. Üretim sabiti DEĞİŞMEZ; test kendi
 * (daha ucuz) parametresini verir. Ölçülen gerçek üretim süresi raporda.
 */
const FAST = { memoryCost: 1024, timeCost: 1, parallelism: 1 } as const;

describe('ARGON2_OPTIONS — §8.2 kabul şartları', () => {
  it('argon2id kullanılıyor (bcrypt değil, argon2i/d değil)', () => {
    expect(ARGON2_OPTIONS.type).toBe(2); // argon2.argon2id === 2
  });

  it('memoryCost ≥ 19 MB', () => {
    expect(ARGON2_OPTIONS.memoryCost).toBeGreaterThanOrEqual(19 * 1024);
  });

  it('timeCost ≥ 2', () => {
    expect(ARGON2_OPTIONS.timeCost).toBeGreaterThanOrEqual(2);
  });
});

describe('hashPassword', () => {
  it('argon2id PHC biçiminde hash üretir', async () => {
    const hash = await hashPassword('cok-guclu-sifre-2026', FAST);
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('aynı şifre iki kez hash’lenince FARKLI sonuç verir (rastgele tuz)', async () => {
    const a = await hashPassword('ayni-sifre-2026', FAST);
    const b = await hashPassword('ayni-sifre-2026', FAST);
    expect(a).not.toBe(b);
  });

  it('hash düz şifreyi İÇERMEZ', async () => {
    const hash = await hashPassword('gizli-parola-123', FAST);
    expect(hash).not.toContain('gizli-parola-123');
  });
});

describe('verifyPassword', () => {
  it('doğru şifreyi kabul eder', async () => {
    const hash = await hashPassword('dogru-sifre-2026', FAST);
    expect(await verifyPassword(hash, 'dogru-sifre-2026')).toBe(true);
  });

  it('yanlış şifreyi reddeder', async () => {
    const hash = await hashPassword('dogru-sifre-2026', FAST);
    expect(await verifyPassword(hash, 'yanlis-sifre-2026')).toBe(false);
  });

  it('tek karakter farkı reddedilir', async () => {
    const hash = await hashPassword('dogru-sifre-2026', FAST);
    expect(await verifyPassword(hash, 'dogru-sifre-2027')).toBe(false);
  });

  it('BOZUK hash biçiminde FIRLATMAZ, false döner', async () => {
    // Tek bir bozuk kayıt tüm giriş akışını 500 ile çökertmemeli.
    for (const broken of ['', 'duz-metin', '$argon2id$bozuk', '$2b$10$bcrypt-hash-gibi']) {
      await expect(verifyPassword(broken, 'herhangi')).resolves.toBe(false);
    }
  });

  it('boş şifre reddedilir', async () => {
    const hash = await hashPassword('gercek-sifre-2026', FAST);
    expect(await verifyPassword(hash, '')).toBe(false);
  });
});

describe('needsRehash', () => {
  it('daha zayıf parametreyle üretilmiş hash yükseltme ister', async () => {
    const weak = await hashPassword('sifre-2026', FAST);
    expect(needsRehash(weak)).toBe(true);
  });

  it('üretim parametreleriyle üretilmiş hash yükseltme istemez', async () => {
    const current = await hashPassword('sifre-2026');
    expect(needsRehash(current)).toBe(false);
  });

  it('okunamayan hash yükseltme ister (fırlatmaz)', () => {
    expect(needsRehash('bozuk')).toBe(true);
  });
});
