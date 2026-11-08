import { randomInt } from 'node:crypto';

import { hashPassword, verifyPassword, type Argon2Overrides } from './password';

/**
 * 2FA kurtarma kodları — ADR-013.
 *
 * Neden varlar: 2FA v1'de zorunlu açık gelir (§8.1) ve sistem TEK KULLANICILIDIR.
 * Telefon kaybı, kurtarma kodu olmadan panele kalıcı erişim kaybı demektir; tek
 * çıkış veritabanına elle müdahale olurdu.
 *
 * §8.20: Kodlar üretildikleri an DIŞINDA hiçbir yerde düz metin bulunmaz —
 * veritabanına argon2id hash'i yazılır, log'a hiçbir şey yazılmaz.
 */

/** ADR-013 — 10 adet. */
export const BACKUP_CODE_COUNT = 10;

/** Grup başına karakter; kod `XXXXX-XXXXX` biçiminde gösterilir. */
const GROUP_LENGTH = 5;

/**
 * Karışması kolay karakterler ÇIKARILDI: 0/O, 1/I/L, 2/Z, 5/S, 8/B.
 * Kullanıcı bu kodu ekrandan kâğıda yazıp sonra elle girecek; okunabilirlik
 * burada güvenlikten çalınan bir şey değil, kodun işe yaramasının koşulu.
 *
 * 29 karakter × 10 hane ≈ 48.6 bit entropi — tek kullanımlık kurtarma kodu için
 * fazlasıyla yeterli (kaba kuvvet ayrıca §8.4 hız sınırına takılır).
 */
const ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';

/** Kullanıcının girdiği kodu karşılaştırılabilir biçime indirger. */
export function normalizeBackupCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Kriptografik olarak güvenli tek kullanımlık kodlar üretir.
 *
 * `Math.random()` KULLANILMAZ — öngörülebilir. `crypto.randomInt` modulo
 * sapması olmadan düzgün dağılım verir.
 *
 * Dönen değerler DÜZ METİNDİR ve yalnızca bir kez, kullanıcıya göstermek için
 * vardır (T-036). Saklanacak olan `hashBackupCodes()` çıktısıdır.
 */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const chars = Array.from(
      { length: GROUP_LENGTH * 2 },
      () => ALPHABET[randomInt(ALPHABET.length)] ?? '',
    ).join('');

    return `${chars.slice(0, GROUP_LENGTH)}-${chars.slice(GROUP_LENGTH)}`;
  });
}

/**
 * Kodları saklanmak üzere argon2id ile hash'ler (ADR-013).
 * Sıra korunur ama anlam taşımaz; kodlar birbirinden bağımsızdır.
 */
export async function hashBackupCodes(
  codes: readonly string[],
  overrides?: Argon2Overrides,
): Promise<string[]> {
  return Promise.all(codes.map((code) => hashPassword(normalizeBackupCode(code), overrides)));
}

export interface ConsumeBackupCodeResult {
  /** Kod geçerli miydi? */
  matched: boolean;
  /**
   * Kullanıcıda KALAN hash'ler. Eşleşme olduysa tüketilen çıkarılmıştır.
   * Çağıran (T-013b) bunu `User.totpBackupCodes` alanına yazar.
   */
  remainingHashes: string[];
}

/**
 * Kurtarma kodunu doğrular ve TÜKETİR.
 *
 * Tek kullanımlık olması ADR-013'ün gereği: tüketilmeyen bir kod, ele geçirildiği
 * anda kalıcı bir arka kapıya dönüşür.
 *
 * SABİT ZAMAN: eşleşme bulunduktan sonra döngü ERKEN ÇIKMAZ — tüm hash'ler
 * doğrulanır. Erken çıkılsaydı, "1. kodda eşleşti" ile "hiç eşleşmedi" arasında
 * ölçülebilir bir süre farkı oluşurdu. Maliyet: kurtarma kodu girişinde 10 argon2
 * doğrulaması. Bu akış nadirdir (yılda birkaç kez) ve gecikme kabul edilebilir;
 * normal TOTP girişi bu yoldan geçmez.
 */
export async function consumeBackupCode(
  input: string,
  storedHashes: readonly string[],
  overrides?: Argon2Overrides,
): Promise<ConsumeBackupCodeResult> {
  void overrides; // doğrulamada parametre hash'in içinden okunur

  const candidate = normalizeBackupCode(input);
  const results = await Promise.all(storedHashes.map((hash) => verifyPassword(hash, candidate)));

  const matchedIndex = results.indexOf(true);

  if (matchedIndex === -1) {
    return { matched: false, remainingHashes: [...storedHashes] };
  }

  return {
    matched: true,
    remainingHashes: storedHashes.filter((_, index) => index !== matchedIndex),
  };
}
