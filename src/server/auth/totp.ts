import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import process from 'node:process';

import { generateSecret, generateURI, NobleCryptoPlugin, ScureBase32Plugin, verify } from 'otplib';

/**
 * TOTP — PROGRAM.md §8.1, ADR-013.
 *
 * İki ayrı sorumluluk var ve bilerek aynı dosyada:
 *   1. TOTP üretimi/doğrulaması (otplib)
 *   2. Secret'ın DİSKTE ŞİFRELİ durması (AES-256-GCM)
 *
 * (2) olmadan (1) anlamsızdır: `totpSecret` düz metin saklanırsa gece yedeği
 * (§8.21) sızdığı anda ikinci faktör tamamen değersizleşir — saldırgan secret'tan
 * istediği kadar geçerli kod üretir.
 *
 * §8.20: Bu modül secret'ı, şifresiz hâlini veya token'ı ASLA loglamaz.
 *
 * NOT (otplib 13): API v12'den tamamen farklı — `authenticator` nesnesi YOK.
 * Fonksiyonel API kullanılır; eklentiler `new` ile örneklenip seçeneklere üst
 * düzeyde verilir. Kurulu sürümün davranışı yazmadan önce ölçülmüştür.
 */

/**
 * Eklentiler SINIFTIR ve örneklenmeleri gerekir.
 *
 * Bu dosyanın ilk taslağında `{ plugins: { crypto: NobleCryptoPlugin, ... } }`
 * yazılmıştı ve çalışıyor GÖRÜNÜYORDU — ama `plugins` otplib 13'ün seçenek
 * tipinde YOK; nesne sessizce yok sayılıyor ve kütüphane kendi varsayılan
 * eklentilerine düşüyordu. Yani kod kripto sağlayıcısını açıkça seçiyor gibi
 * durup aslında seçmiyordu. TypeScript bunu yakaladı; çalışma zamanı yakalamadı.
 *
 * Doğru kullanım: sınıflar `new` ile örneklenir ve seçeneklere ÜST DÜZEYDE verilir.
 * Örnekler durumsuzdur, modül düzeyinde bir kez oluşturulur.
 */
const otpCrypto = new NobleCryptoPlugin();
const otpBase32 = new ScureBase32Plugin();

/** RFC 6238 varsayılanı; kimlik doğrulayıcı uygulamaların tamamı bunu bekler. */
const TOTP_PERIOD_SECONDS = 30;

/**
 * Zaman penceresi toleransı: ±1 adım (±30 sn).
 *
 * otplib 13'te `epochTolerance` ADIM DEĞİL SANİYE cinsindendir — ölçülerek
 * doğrulandı. Bu yüzden değer `TOTP_PERIOD_SECONDS` ile ifade edilir.
 *
 * Neden ±1: telefon saati ile sunucu saati arasındaki küçük kayma ve kullanıcının
 * kodu okuyup yazma süresi gerçek bir sorundur; tolerans sıfır olursa dürüst
 * kullanıcılar periyot sınırında rastgele reddedilir. Daha geniş tutmak ise
 * çalınmış bir kodun geçerlilik süresini uzatır. ±1 adım yaygın kabul gören denge.
 */
const TOTP_EPOCH_TOLERANCE_SECONDS = TOTP_PERIOD_SECONDS;

/* ===========================================================================
 * TOTP ÜRETİM VE DOĞRULAMA
 * ======================================================================== */

/** Yeni bir TOTP secret'ı üretir (Base32, 20 bayt — RFC 4226 önerisi). */
export async function generateTotpSecret(): Promise<string> {
  return generateSecret({ crypto: otpCrypto, base32: otpBase32 });
}

/**
 * Kullanıcının girdiği 6 haneli kodu doğrular.
 *
 * `boolean` döner — otplib'in `{ valid, delta, epoch }` nesnesi çağıran tarafa
 * SIZDIRILMAZ: `delta` kullanıcının saatinin ne kadar kaydığını söyler ve bunu
 * yanıt gövdesine taşımak gereksiz bilgi verir.
 *
 * Biçimsel olarak bozuk girdide (harf, yanlış uzunluk) otplib fırlatır; burada
 * yakalanır ve `false` dönülür — geçersiz kod ile bozuk kod arasında AYRIM YOK.
 */
export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({
      token,
      secret,
      crypto: otpCrypto,
      base32: otpBase32,
      period: TOTP_PERIOD_SECONDS,
      epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
    });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Kimlik doğrulayıcı uygulamaya okutulacak `otpauth://` bağlantısı.
 * QR kod üretimi Frontend'in işidir (T-036); burada yalnızca URI kurulur.
 */
export async function buildTotpUri(secret: string, accountLabel: string): Promise<string> {
  return generateURI({
    secret,
    label: accountLabel,
    issuer: process.env.TOTP_ISSUER ?? 'Panel',
    // `generateURI` eklenti ALMAZ: secret zaten Base32 dizedir, çözülmesi gerekmez.
    period: TOTP_PERIOD_SECONDS,
  });
}

/* ===========================================================================
 * SECRET ŞİFRELEME — AES-256-GCM
 * ======================================================================== */

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12; // GCM için önerilen uzunluk
const FORMAT_VERSION = 'v1';

/**
 * Anahtar İLK KULLANIMDA okunur, modül yüklenirken değil.
 *
 * T-003c'de öğrenilen ders: modül gövdesinde `throw` etmek `next build`'in
 * "Collecting page data" adımını düşürür ve `.env` bulunmayan CI / Docker build
 * katmanında derlemeyi imkânsız kılar. Yapılandırma eksikliği DERLEME zamanı
 * değil ÇALIŞMA zamanı sorunudur.
 */
function loadEncryptionKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY tanımlı değil. `openssl rand -base64 32` ile üretip .env dosyasına ekleyin.',
    );
  }

  /**
   * `Buffer.from(x, 'base64')` GEÇERSİZ GİRDİDE FIRLATMAZ — geçersiz karakterleri
   * sessizce atar ve kısa bir tampon döndürür (ölçüldü: `'!!!not-base64!!!'`
   * 7 bayt veriyor). Bu yüzden burada try/catch yoktur; gerçek doğrulama
   * aşağıdaki UZUNLUK kontrolüdür. Bozuk bir anahtar 32 baytı tutturamaz.
   */
  const key = Buffer.from(raw, 'base64');

  if (key.length !== KEY_BYTES) {
    // §8.20 — anahtarın kendisi mesaja GİRMEZ, yalnızca uzunluğu.
    throw new Error(
      `TOTP_ENCRYPTION_KEY ${KEY_BYTES} bayt olmalı, ${key.length} bayt çözüldü. ` +
        '`openssl rand -base64 32` ile yeniden üretin.',
    );
  }

  return key;
}

/**
 * Secret'ı şifreler.
 *
 * Saklama biçimi TEK ALANDIR (`User.totpSecret`), dört parça noktayla ayrılır:
 *   `v1.<iv_b64url>.<tag_b64url>.<ciphertext_b64url>`
 *
 * IV ayrı bir sütunda tutulmaz — şifreli metnin yanında durması standarttır ve
 * gizli değildir; gizli olması gereken tek şey anahtardır. Sürüm öneki ileride
 * anahtar/algoritma değişimi gerektiğinde eski kayıtları tanımayı sağlar.
 *
 * Her çağrıda RASTGELE IV üretilir; bu yüzden aynı secret iki kez şifrelenince
 * FARKLI çıktı verir. Deterministik olsaydı, iki kullanıcının (veya iki
 * anlık görüntünün) aynı secret'ı taşıdığı yedekten okunabilirdi.
 */
export function encryptSecret(plaintext: string): string {
  const key = loadEncryptionKey();
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    FORMAT_VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

/**
 * Şifreli secret'ı çözer.
 *
 * BOZULMUŞ VERİDE FIRLATIR — bilerek. GCM kimlik doğrulama etiketi tutmuyorsa
 * şifreli metin kurcalanmış demektir; bunu sessizce yutmak, saldırganın seçtiği
 * bir secret'ın kabul edilmesi anlamına gelirdi. Çağıran taraf (T-013b) bunu
 * yakalar ve kullanıcıya genel bir hata gösterir.
 */
export function decryptSecret(payload: string): string {
  const key = loadEncryptionKey();
  const parts = payload.split('.');

  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('Şifreli TOTP secret biçimi tanınmıyor.');
  }

  const [, ivPart, tagPart, dataPart] = parts as [string, string, string, string];

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  // Etiket tutmazsa `final()` fırlatır — kurcalama burada yakalanır.
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** `User.totpSecret` alanındaki değerin bu modülün ürettiği biçimde olup olmadığı. */
export function isEncryptedSecret(value: string): boolean {
  return value.split('.').length === 4 && value.startsWith(`${FORMAT_VERSION}.`);
}
