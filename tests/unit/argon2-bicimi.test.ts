import { describe, expect, it } from 'vitest';

import { argon2idGibi } from '@/lib/security/argon2-bicimi';
import { hashPassword } from '@/server/auth/password';

/**
 * Üretim başlatmasının hash biçimi kapısı (T-071).
 *
 * ⚠️ İLK İDDİA GERÇEK ÇIKTIYLA: ilk desen uydurma bir örnekle yazıldı ve
 * projenin kendi `hashPassword` çıktısını reddetti (parametre sırası `m,p,t`).
 */
describe('argon2idGibi', () => {
  it('⚠️ projenin KENDİ hashPassword çıktısını kabul ediyor', async () => {
    const hash = await hashPassword('deneme-sifresi-123', {
      memoryCost: 1024,
      timeCost: 1,
      parallelism: 1,
    });
    expect(argon2idGibi(hash)).toBe(true);
  });

  it('parametre sırası serbest', () => {
    const govde = '$c29tZXNhbHRzb21lc2FsdA$aGFzaGhhc2hoYXNoaGFzaA';
    expect(argon2idGibi(`$argon2id$v=19$m=19456,t=2,p=1${govde}`)).toBe(true);
    expect(argon2idGibi(`$argon2id$v=19$m=19456,p=1,t=2${govde}`)).toBe(true);
  });

  it('⚠️ Compose`un tırnaksız değeri PARÇALADIĞI hâl reddediliyor', () => {
    // `$argon2id$v=19$m=...` → `$v`, `$m`… değişken sanılıp silinince kalan biçim.
    expect(argon2idGibi('=19,p=1,t=3')).toBe(false);
    expect(argon2idGibi('')).toBe(false);
    expect(argon2idGibi('$2b$10$bcrypthashdegil')).toBe(false);
  });
});
