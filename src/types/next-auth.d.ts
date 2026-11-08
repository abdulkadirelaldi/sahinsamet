import type { DefaultSession } from 'next-auth';

/**
 * Auth.js tip artırması — §8.1 kapısının okuduğu `tfa` alanı (BULGU-008).
 *
 * Bu dosya olmadan `token.tfa` ve `user.tfa` derleme hatası verir; alanı
 * `as any` ile geçmek §2'nin yasağıdır ve daha kötüsü, kapının okuduğu alanın
 * tipini denetimsiz bırakırdı. Alan adı `@/lib/security/two-factor`'daki
 * `TWO_FACTOR_CLAIM` sabitiyle aynı olmak ZORUNDA — sabit tek kaynak, bu bildirim
 * onun tip karşılığı.
 *
 * OPSİYONEL (`?`) bilerek: geçiş penceresinde üretilmiş jetonlar alanı taşımıyor
 * ve `readTwoFactorClaim` bunu `null` olarak okuyor. Zorunlu yapmak, var olmayan
 * bir garantiyi tipte varmış gibi göstermek olurdu.
 */

declare module 'next-auth' {
  /** `authorize` dönüşü ve `jwt` geri çağrısının `user` parametresi. */
  interface User {
    /** `User.totpConfirmedAt != null` — 2FA kurulumu tamamlanmış mı. */
    tfa?: boolean;
  }

  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
    /**
     * Jetonun verildiği an — saniye cinsinden Unix zamanı (JWT `iat`).
     *
     * ADR-035/B: yazma kapısı bunu `User.writesValidFrom` ile karşılaştırıyor.
     * Oturum nesnesine taşınıyor çünkü `auth()` ham jetonu değil oturumu döner
     * ve karşılaştırma `currentActorId()` içinde, yani action katmanında yapılıyor.
     *
     * HASSAS DEĞİL (§8.20): `iat` zaten istemcinin elindeki JWT'nin içinde.
     *
     * OPSİYONEL: alanı taşımayan eski jetonlar olabilir. `undefined` "bilinmiyor"
     * demek ve kapı onu YAZMAYA İZİN VERMEYEN tarafa yorumluyor — bkz.
     * `currentActorId`. Varsayılanı "izin ver" yapmak, bozuk bir jetonu
     * geçersizleştirmeden muaf tutardı.
     */
    tokenIssuedAt?: number;
    /** Jetonun 2FA alanı; `false` = kurulum tamamlanmamış. */
    tfa?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** §8.1 — `TWO_FACTOR_CLAIM` ile aynı ad. Hassas değildir (§8.20). */
    tfa?: boolean;
  }
}
