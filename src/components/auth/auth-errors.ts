/**
 * T-013b sözleşmesinin arayüz tarafı: hata kodu → kullanıcıya gösterilen metin.
 *
 * BU METİNLER SÖZLEŞMEDİR. T-016 E2E senaryoları bu dizelere bakar; değiştirmek
 * testleri kırar. Değişiklik gerekiyorsa önce Orkestra Şefi'ne bildirilir.
 *
 * Kodların kaynağı: `AuthFailureReason` (src/server/auth/credentials.ts).
 */

/** Sunucunun döndürebileceği kodlar (T-013b). */
export const AUTH_ERROR_CODES = [
  'INVALID_CREDENTIALS',
  'ACCOUNT_LOCKED',
  'TOTP_REQUIRED',
  'INVALID_TOTP',
  'PASSKEY_FAILED',
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

/**
 * `TOTP_REQUIRED` bilerek YOKTUR: o bir hata değil, akışın ikinci adıma
 * geçtiğini söyleyen sinyaldir ve kullanıcıya hata olarak gösterilmez.
 *
 * `INVALID_CREDENTIALS` tek bir metindir — e-postanın mı şifrenin mi yanlış
 * olduğu BELLİ EDİLMEZ (§8, kullanıcı numaralandırma koruması). Sunucu da bu
 * ayrımı yapmıyor; arayüz onu geri sızdırmamalı.
 */
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'E-posta veya şifre hatalı.',
  ACCOUNT_LOCKED: 'Hesabınız geçici olarak kilitlendi. Lütfen daha sonra deneyin.',
  INVALID_TOTP: 'Doğrulama kodu geçersiz.',
  PASSKEY_FAILED: 'Face ID ile giriş yapılamadı. Şifrenle dene.',
} as const satisfies Partial<Record<AuthErrorCode, string>>;

/**
 * Tanınmayan/eksik kod için gösterilir.
 *
 * Bu yol ölü değil: Auth.js yapılandırma hatalarında `code` taşımadan
 * `error=Configuration` döndürebiliyor (bkz. T-017 raporu / ENGEL-1).
 * Kullanıcıya teknik ayrıntı verilmez, eylem önerilir.
 */
export const AUTH_GENERIC_ERROR_MESSAGE = 'Giriş yapılamadı. Lütfen tekrar deneyin.';

function isKnownMessageCode(code: string): code is keyof typeof AUTH_ERROR_MESSAGES {
  return code in AUTH_ERROR_MESSAGES;
}

/**
 * Kodu gösterilecek metne çevirir.
 *
 * `TOTP_REQUIRED` ve boş kod için `null` döner — çağıran taraf hata KUTUSU
 * göstermez, adım değiştirir.
 */
export function resolveAuthErrorMessage(code: string | undefined | null): string | null {
  if (!code || code === 'TOTP_REQUIRED') {
    return null;
  }

  return isKnownMessageCode(code) ? AUTH_ERROR_MESSAGES[code] : AUTH_GENERIC_ERROR_MESSAGE;
}
