import { describe, expect, it } from 'vitest';

import {
  BACKUP_CODE_COUNT,
  consumeBackupCode,
  generateBackupCodes,
  hashBackupCodes,
  normalizeBackupCode,
} from '@/server/auth/backup-codes';

/** Üretim argon2 parametresi test için pahalı; sabit değişmez, test kendi verir. */
const FAST = { memoryCost: 1024, timeCost: 1, parallelism: 1 } as const;

describe('generateBackupCodes', () => {
  it('varsayılan olarak 10 kod üretir (ADR-013)', () => {
    expect(generateBackupCodes()).toHaveLength(BACKUP_CODE_COUNT);
    expect(BACKUP_CODE_COUNT).toBe(10);
  });

  it('kodlar XXXXX-XXXXX biçiminde', () => {
    for (const code of generateBackupCodes()) {
      expect(code).toMatch(/^[ACDEFGHJKMNPQRTUVWXY34679]{5}-[ACDEFGHJKMNPQRTUVWXY34679]{5}$/);
    }
  });

  it('karışması kolay karakterleri İÇERMEZ (0 O 1 I L 2 Z 5 S 8 B)', () => {
    const all = generateBackupCodes(50).join('');
    for (const ambiguous of ['0', 'O', '1', 'I', 'L', '2', 'Z', '5', 'S', '8', 'B']) {
      expect(all).not.toContain(ambiguous);
    }
  });

  it('kodlar birbirinden farklı (kriptografik üretim)', () => {
    const codes = generateBackupCodes(50);
    expect(new Set(codes).size).toBe(50);
  });

  it('iki çağrı aynı kümeyi üretmez', () => {
    expect(generateBackupCodes().join()).not.toBe(generateBackupCodes().join());
  });
});

describe('normalizeBackupCode', () => {
  it('küçük harf, tire ve boşluk farkını yok sayar', () => {
    expect(normalizeBackupCode('acdef-ghjkm')).toBe('ACDEFGHJKM');
    expect(normalizeBackupCode(' ACDEF GHJKM ')).toBe('ACDEFGHJKM');
    expect(normalizeBackupCode('ACDEF-GHJKM')).toBe('ACDEFGHJKM');
  });
});

describe('hashBackupCodes', () => {
  it('her kod için argon2id hash üretir, düz metin saklanmaz', async () => {
    const codes = generateBackupCodes(3);
    const hashes = await hashBackupCodes(codes, FAST);
    expect(hashes).toHaveLength(3);
    for (const [index, hash] of hashes.entries()) {
      expect(hash.startsWith('$argon2id$')).toBe(true);
      expect(hash).not.toContain(codes[index] ?? '');
      expect(hash).not.toContain(normalizeBackupCode(codes[index] ?? ''));
    }
  });
});

describe('consumeBackupCode', () => {
  it('geçerli kodu kabul eder ve TÜKETİR', async () => {
    const codes = generateBackupCodes(3);
    const hashes = await hashBackupCodes(codes, FAST);

    const first = await consumeBackupCode(codes[1] ?? '', hashes);
    expect(first.matched).toBe(true);
    expect(first.remainingHashes).toHaveLength(2);

    // AYNI kod ikinci kez kabul EDİLMEZ
    const second = await consumeBackupCode(codes[1] ?? '', first.remainingHashes);
    expect(second.matched).toBe(false);
    expect(second.remainingHashes).toHaveLength(2);
  });

  it('diğer kodlar tüketimden sonra hâlâ geçerli', async () => {
    const codes = generateBackupCodes(3);
    const hashes = await hashBackupCodes(codes, FAST);

    const used = await consumeBackupCode(codes[0] ?? '', hashes);
    const other = await consumeBackupCode(codes[2] ?? '', used.remainingHashes);
    expect(other.matched).toBe(true);
    expect(other.remainingHashes).toHaveLength(1);
  });

  it('biçim farkını (küçük harf, tiresiz) kabul eder', async () => {
    const codes = generateBackupCodes(1);
    const hashes = await hashBackupCodes(codes, FAST);
    const typed = (codes[0] ?? '').toLowerCase().replace('-', ' ');
    expect((await consumeBackupCode(typed, hashes)).matched).toBe(true);
  });

  it('yanlış kodu reddeder ve hiçbir şey tüketmez', async () => {
    const codes = generateBackupCodes(3);
    const hashes = await hashBackupCodes(codes, FAST);
    const result = await consumeBackupCode('XXXXX-XXXXX', hashes);
    expect(result.matched).toBe(false);
    expect(result.remainingHashes).toHaveLength(3);
  });

  it('boş kod reddedilir', async () => {
    const hashes = await hashBackupCodes(generateBackupCodes(2), FAST);
    expect((await consumeBackupCode('', hashes)).matched).toBe(false);
  });

  it('hiç kod kalmamışsa reddeder (fırlatmaz)', async () => {
    const result = await consumeBackupCode('ACDEF-GHJKM', []);
    expect(result.matched).toBe(false);
    expect(result.remainingHashes).toEqual([]);
  });

  it('bozuk hash listesi akışı çökertmez', async () => {
    const result = await consumeBackupCode('ACDEF-GHJKM', ['bozuk', '$argon2id$kirik']);
    expect(result.matched).toBe(false);
  });

  it('on kodun tamamı sırayla tüketilebilir', async () => {
    const codes = generateBackupCodes();
    let hashes = await hashBackupCodes(codes, FAST);

    for (const [index, code] of codes.entries()) {
      const result = await consumeBackupCode(code, hashes);
      expect(result.matched, `kod ${index}`).toBe(true);
      hashes = result.remainingHashes;
    }
    expect(hashes).toHaveLength(0);
  });
});
