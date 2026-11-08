import { createHmac } from 'node:crypto';

/**
 * RFC 6238 (TOTP) / RFC 4226 (HOTP) — TEST TARAFI uygulaması.
 *
 * NEDEN UYGULAMANIN `otplib`'İ KULLANILMIYOR: E2E'nin işi uygulamayı DIŞARIDAN
 * doğrulamak. Kodu üretmek için de doğrulamak için de aynı kütüphane
 * kullanılırsa, kütüphane yanlış davransa bile test yeşil kalır — birbirini
 * onaylayan iki kopya elde ederiz. Bağımsız bir uygulama, `otplib`'in gerçekten
 * RFC'ye uyduğunu da sınar.
 *
 * Bu uygulamanın kendisi RFC 6238 Ek B'deki RESMÎ TEST VEKTÖRLERİYLE
 * doğrulanır (`tests/unit/totp-helper.test.ts`) — yani "doğrulayanı kim
 * doğruluyor" sorusu cevapsız kalmaz.
 *
 * Kaynak: T-018b'de Frontend'in elle kurduğu hesaplama; buraya yeniden
 * kullanılabilir biçimde devralındı.
 */

/** Uygulamanın kullandığı değerler (`src/server/auth/totp.ts`). */
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;

export interface TotpOptions {
  /** Kodun üretileceği an. Varsayılan: şimdi. */
  timestampMs?: number;
  digits?: number;
  periodSeconds?: number;
  /** RFC 6238 SHA-1'i varsayılan sayar; otplib de öyle. */
  algorithm?: 'sha1' | 'sha256' | 'sha512';
}

/**
 * Base32 çözücü (RFC 4648, dolgusuz).
 *
 * `otplib` secret'ı Base32 üretir; HMAC ise ham baytlarla çalışır.
 */
export function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const temiz = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');

  let bits = 0;
  let deger = 0;
  const cikti: number[] = [];

  for (const karakter of temiz) {
    const indeks = alphabet.indexOf(karakter);
    if (indeks === -1) {
      throw new Error(`Base32 dışı karakter: ${karakter}`);
    }

    deger = (deger << 5) | indeks;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      cikti.push((deger >>> bits) & 0xff);
    }
  }

  return Buffer.from(cikti);
}

/**
 * HOTP/TOTP çekirdeği — ham anahtar üzerinden.
 *
 * RFC 6238 test vektörleri Base32 değil ASCII tohum verdiği için anahtarı
 * doğrudan alan bir giriş noktası gerekiyor.
 */
export function totpFromKey(key: Buffer, options: TotpOptions = {}): string {
  const {
    timestampMs = Date.now(),
    digits = TOTP_DIGITS,
    periodSeconds = TOTP_PERIOD_SECONDS,
    algorithm = 'sha1',
  } = options;

  const sayac = Math.floor(timestampMs / 1000 / periodSeconds);

  // 8 baytlık big-endian sayaç (RFC 4226 §5.1).
  const sayacTamponu = Buffer.alloc(8);
  sayacTamponu.writeBigUInt64BE(BigInt(sayac));

  const ozet = createHmac(algorithm, key).update(sayacTamponu).digest();

  // Dinamik kesme (RFC 4226 §5.3): son baytın alt 4 biti ofseti verir.
  const ofset = ozet[ozet.length - 1]! & 0x0f;
  const ikili =
    ((ozet[ofset]! & 0x7f) << 24) |
    ((ozet[ofset + 1]! & 0xff) << 16) |
    ((ozet[ofset + 2]! & 0xff) << 8) |
    (ozet[ofset + 3]! & 0xff);

  return (ikili % 10 ** digits).toString().padStart(digits, '0');
}

/** Uygulamanın ürettiği Base32 secret'tan geçerli kod üretir. */
export function generateTotp(secretBase32: string, options: TotpOptions = {}): string {
  return totpFromKey(base32Decode(secretBase32), options);
}

/**
 * Bir sonraki periyoda kadar bekle.
 *
 * NEDEN GEREKLİ: aynı kodun iki kez kullanıldığı bir test, uygulama tekrar
 * kullanımı engellese bile geçiyormuş gibi görünebilir. Ayrıca kod periyot
 * sınırına çok yakın üretilirse doğrulama anında geçersizleşir ve test
 * RASTGELE kırılır — E2E'de en can sıkıcı hata sınıfı budur.
 */
export function millisecondsUntilNextPeriod(timestampMs: number = Date.now()): number {
  const periyotMs = TOTP_PERIOD_SECONDS * 1000;
  return periyotMs - (timestampMs % periyotMs);
}

/**
 * Periyodun sonuna çok yakınsak bir sonrakini bekler.
 *
 * Kod üretimi ile formun gönderilmesi arasında ~1–2 sn geçiyor; 3 saniyeden az
 * kalmışsa üretilen kod sunucuya ulaştığında ±1 adım toleransının dışına
 * düşebilir. Beklemek, testi kararlı kılmanın en ucuz yolu.
 */
export async function waitForSafeTotpWindow(minimumRemainingMs = 3000): Promise<void> {
  const kalan = millisecondsUntilNextPeriod();
  if (kalan < minimumRemainingMs) {
    await new Promise((resolve) => setTimeout(resolve, kalan + 250));
  }
}
