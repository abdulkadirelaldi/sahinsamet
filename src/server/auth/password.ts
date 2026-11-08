import argon2 from 'argon2';

/**
 * Şifre hash'leme — PROGRAM.md §8.2, ADR-001.
 *
 * bcrypt KULLANILMAZ. argon2id bellek-zor (memory-hard) olduğu için GPU/ASIC ile
 * paralel kırmaya belirgin biçimde dayanıklıdır; tek hesabın korunduğu bir sistemde
 * (§1.B) en güçlü seçenek alınmıştır.
 *
 * §8.20: Bu modüldeki hiçbir fonksiyon şifreyi, hash'i veya bunların parçasını
 * loglamaz. Hata durumunda bile — `verifyPassword` sessizce `false` döner.
 */

/**
 * Üretim parametreleri — §8.2 "memory ≥ 19MB, iterations ≥ 2".
 *
 * Kütüphane varsayılanına BIRAKILMAZ: argon2 paketinin varsayılanı sürümle
 * birlikte değişebilir ve bir güvenlik gereksinimini üçüncü taraf sürüm notlarına
 * bağlamak kabul edilemez. Değerler burada açıkça sabitlenmiştir.
 *
 *  - `memoryCost` KiB cinsindendir. 19456 KiB = 19 MiB — §8.2'nin alt sınırı ve
 *    aynı zamanda OWASP'ın argon2id için önerdiği asgari bellek.
 *  - `timeCost` 3 seçildi (§8.2 en az 2 istiyor). Ölçülen maliyet raporda.
 *  - `parallelism` 1: tek kullanıcılı bir panelde eşzamanlı giriş yok; düşük
 *    tutmak sunucu kaynağını öngörülebilir kılar.
 *
 * Bu değerler değiştirilirse MEVCUT HASH'LER GEÇERSİZ OLMAZ — argon2 kodlanmış
 * hash'in içinde kendi parametrelerini taşır, `verify` onları okur. Yani parametre
 * yükseltmesi geriye dönük uyumludur.
 */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 3,
  parallelism: 1,
} as const;

/** Testlerin üretim maliyetini ödemeden koşabilmesi için parametre geçersiz kılma. */
export type Argon2Overrides = Partial<{
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}>;

/**
 * Düz şifreyi argon2id ile hash'ler.
 *
 * Dönen dize kodlanmış PHC biçimindedir (`$argon2id$v=19$m=...,t=...,p=...$salt$hash`)
 * ve tuzu (salt) kendi içinde taşır — ayrı bir salt sütunu gerekmez.
 */
export async function hashPassword(password: string, overrides?: Argon2Overrides): Promise<string> {
  return argon2.hash(password, { ...ARGON2_OPTIONS, ...overrides });
}

/**
 * Şifreyi kodlanmış hash'e karşı doğrular.
 *
 * BOZUK HASH'TE FIRLATMAZ, `false` DÖNER. Gerekçe: veritabanındaki tek bir bozuk
 * kayıt (elle düzenleme, yarım migration, kesilmiş sütun) tüm giriş akışını
 * 500 ile çökertmemelidir. Bu sınıf hata sessizce "yanlış şifre"ye düşer ve
 * kullanıcıya §8.20 uyumlu genel mesaj gider.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // §8.20 — hash veya şifre loglanmaz; ayrıntı zaten kullanışlı değil.
    return false;
  }
}

/**
 * Hash'in mevcut üretim parametrelerinin gerisinde kalıp kalmadığını söyler.
 *
 * Parametreler ileride yükseltilirse, kullanıcı doğru şifreyle giriş yaptığı anda
 * hash'i sessizce yeniden üretmek için kullanılır (T-013b). Şifre yalnızca o anda
 * bellekte bulunur; başka türlü yükseltme imkânı yoktur.
 */
export function needsRehash(hash: string): boolean {
  try {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  } catch {
    // Okunamayan hash zaten geçersiz; yeniden üretilmesi doğru davranış.
    return true;
  }
}
