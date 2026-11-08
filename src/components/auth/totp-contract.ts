/**
 * 2FA kurulum ekranının Backend'den beklediği Server Action sözleşmesi.
 *
 * BU DOSYA BİR TALEPTİR. Uygulama `src/server/actions/totp.ts` içinde Backend
 * tarafından yazılacak (T-036 raporu / ENGEL-1). Arayüz eylemleri prop olarak
 * alır; böylece bileşen sunucu modüllerine bağlanmadan yazılabilir ve test
 * edilebilir, imzalar da tek yerde yazılı kalır.
 *
 * Yanıt zarfı §7.2 ile aynı biçimdedir (`{ ok: true, data }` / `{ ok: false, error }`)
 * — Server Action olduğu için HTTP durum kodu yoktur, kod alanı taşınır.
 */

/** §7.2 hata kodları + bu akışa özgü olanlar. */
export type TotpErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_TOTP'
  | 'ALREADY_ENABLED'
  | 'NOT_ENABLED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type TotpError = { code: TotpErrorCode; message: string };

/** Ekranın açılışta gördüğü durum. Sunucu bileşeninde okunur, prop olarak iner. */
export type TotpStatus = {
  /** `User.totpConfirmedAt` dolu mu — yani 2FA gerçekten etkin mi. */
  enabled: boolean;
  /** Tüketilmemiş kurtarma kodu sayısı (T-013b sözleşmesi). */
  remainingBackupCodes: number;
};

/**
 * 1. adım — kurulumu başlatır.
 *
 * Sunucu yeni bir secret üretir, `TOTP_ENCRYPTION_KEY` ile şifreleyip saklar
 * ama `totpConfirmedAt`'i DOLDURMAZ. Kullanıcı doğrulayana kadar 2FA etkin
 * sayılmaz — yanlış kurulmuş bir authenticator kullanıcıyı kendi hesabından
 * kilitlerdi (ADR-013).
 */
export type StartTotpSetupResult =
  | {
      ok: true;
      data: {
        /** Base32 secret — QR okunamazsa elle girilebilsin diye düz metin de gösterilir. */
        secret: string;
        /** `buildTotpUri()` çıktısı; QR'a gömülür. */
        otpauthUri: string;
      };
    }
  | { ok: false; error: TotpError };

/**
 * 2. adım — kodu doğrular ve 2FA'yı ETKİNLEŞTİRİR.
 *
 * Yalnızca bu çağrı başarılı olduğunda `totpConfirmedAt` dolar ve kurtarma
 * kodları üretilir. Düz metin kodlar SADECE bu yanıtta döner; sunucuda argon2id
 * ile hash'li saklandığı için bir daha okunamaz (ADR-013).
 */
export type ConfirmTotpSetupResult =
  | {
      ok: true;
      data: {
        /** 10 adet, `XXXXX-XXXXX`. Bir daha ASLA dönmez. */
        backupCodes: string[];
        remainingBackupCodes: number;
      };
    }
  | { ok: false; error: TotpError };

/**
 * Kurtarma kodlarını yeniler — eskiler geçersizleşir.
 *
 * Kimlik tazeliği için geçerli bir TOTP kodu ister: oturumu ele geçiren biri
 * tek tıkla yeni kurtarma kodu üretememeli.
 */
export type RegenerateBackupCodesResult = ConfirmTotpSetupResult;

export type TotpActions = {
  startTotpSetup: () => Promise<StartTotpSetupResult>;
  confirmTotpSetup: (totpCode: string) => Promise<ConfirmTotpSetupResult>;
  /** İsteğe bağlı — sağlanmazsa "kodları yenile" eylemi gösterilmez. */
  regenerateBackupCodes?: (totpCode: string) => Promise<RegenerateBackupCodesResult>;
};

/** Kod eşlemesi — `auth-errors.ts` ile aynı ilke: metin sözleşmedir. */
export const TOTP_ERROR_MESSAGES: Record<TotpErrorCode, string> = {
  UNAUTHORIZED: 'Oturumun sona ermiş. Lütfen yeniden giriş yap.',
  INVALID_TOTP: 'Doğrulama kodu geçersiz. Uygulamandaki güncel kodu gir.',
  ALREADY_ENABLED: 'İki adımlı doğrulama zaten açık.',
  NOT_ENABLED: 'İki adımlı doğrulama açık değil.',
  RATE_LIMITED: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
  INTERNAL_ERROR: 'İşlem tamamlanamadı. Lütfen tekrar dene.',
};

export function resolveTotpErrorMessage(error: TotpError | undefined): string {
  if (!error) {
    return TOTP_ERROR_MESSAGES.INTERNAL_ERROR;
  }
  return TOTP_ERROR_MESSAGES[error.code] ?? TOTP_ERROR_MESSAGES.INTERNAL_ERROR;
}
