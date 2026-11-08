import { getToken } from 'next-auth/jwt';

import { readTwoFactorClaim, type TwoFactorClaim } from './two-factor';
import { guvenliHata } from '@/lib/security/guvenli-log';

/**
 * Ara katman için oturum okuyucu — §8.5.
 *
 * NEDEN `auth()` DEĞİL: `@/server/auth` içe aktarıldığı anda zincir
 * `authenticateUser` → `@/server/db` → Prisma + `pg` üzerinden Node API'lerine
 * iner. Ara katman **Edge çalışma zamanında** koşar; bu zincir orada
 * yüklenemez. `getToken` ise `jose` üzerinden Web Crypto kullanır ve Edge'de
 * çalışır.
 *
 * BU BİR "ÇEREZ VAR MI" KONTROLÜ DEĞİLDİR: `getToken` jetonu `AUTH_SECRET` ile
 * TÜREYEN anahtarla çözer. İmzası/şifrelemesi tutmayan, süresi geçmiş veya
 * uydurulmuş bir çerez `null` döner. Yine de §8.6 geçerlidir — aşağıdaki
 * uyarıya bakın.
 */

/**
 * Çerez adları — `src/server/auth.ts` ile BİREBİR aynı olmak ZORUNDA.
 *
 * Sapma sessizdir ve iki yönde de kötüdür: ad yanlışsa `getToken` her zaman
 * `null` döner ve giriş yapmış kullanıcı sonsuza dek `/giris`'e atılır; ters
 * durumda koruma hiç çalışmaz. Üstelik hiçbir hata mesajı çıkmaz.
 *
 * Bu yüzden `tests/unit/session.test.ts` `auth.ts` KAYNAĞINI okuyup adların
 * eşleştiğini doğrular — T-013a'nın dersi: "yapılandırma gerçekten uygulandı mı"
 * sorusu varsayımla değil, kanıtla cevaplanır.
 *
 * Ayrıca `getToken`'ın türettiği şifreleme tuzu (salt) varsayılan olarak çerez
 * ADIDIR; yani ad yanlışsa çözme de başarısız olur.
 */
export const SESSION_COOKIE_NAME_DEV = 'authjs.session-token';
export const SESSION_COOKIE_NAME_PROD = '__Secure-authjs.session-token';

/**
 * §8.3 — OTURUM ÖMRÜ: 24 saat (ADR-035/A, eskiden 7 gündü).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN ÇEREZ ADLARININ YANINDA — VE NEDEN `server/auth.ts`'TE DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-048g'de ölçülen sapma: ADR-035/A ömrü 24 saate indirdiğinde
 * `src/server/auth.ts` güncellendi ama `tests/e2e/_helpers/session.ts` **7 gün
 * üretmeye devam etti** ve hiçbir test kırılmadı. Sebep yapısal: sabit
 * `server/auth.ts` içindeydi, o dosya `next-auth` içe aktardığı için ne Edge
 * ara katmanından ne de Vitest'in node ortamından okunabiliyordu — yani
 * ihtiyacı olan iki taraf da sayıyı KOPYALAMAK zorundaydı.
 *
 * Bu modül çerez adları için tam bu sebeple zaten "tek kaynak" rolünde ve
 * Edge-güvenli (yalnızca `next-auth/jwt` → `jose` → Web Crypto). Ömür de
 * buraya taşındı: artık kopyalamak zorunda olan kimse yok.
 *
 * ⚠️ GEÇİŞ YARIM — `src/server/auth.ts` HÂLÂ KENDİ KOPYASINI KULLANIYOR.
 * O dosya Backend'in (§10.1) ve oradan içe aktarmaya çevirmek ayrı bir iş:
 * **T-050**. O güne kadar iki tanım var ve `tests/unit/session-omru.test.ts`
 * ikisinin AYRIŞMADIĞINI ölçüyor — geçişin yarım kalması sessiz bir sapmaya
 * dönüşmesin diye. T-050 tamamlandığında o çapraz kontrol silinebilir;
 * bugün silmek, taşımanın yarısını korumasız bırakmak olurdu.
 *
 * Değerin gerekçesi (maruziyet penceresi, tek kullanıcılı panelde bedeli)
 * `src/server/auth.ts` içinde ve ADR-035'te yazılı; burada tekrarlanmıyor.
 */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export function sessionCookieName(isProduction: boolean): string {
  return isProduction ? SESSION_COOKIE_NAME_PROD : SESSION_COOKIE_NAME_DEV;
}

export interface SessionInfo {
  /** Auth.js JWT'sinde kullanıcı kimliği `sub` alanındadır. */
  userId: string;
  /**
   * §8.1 — hesapta 2FA kurulu mu?
   *
   * `null` = bilgi jetonda YOK (alanı taşımayan eski jeton). `false`'tan ayrı
   * tutulur; gerekçesi `two-factor.ts` → `requiresTwoFactorSetup`.
   *
   * VERİTABANINA BAKILMAZ: ara katman Edge'de koşuyor ve Prisma orada
   * yüklenemiyor (T-014/K1). Bilgi jetondan okunur.
   */
  twoFactorEnabled: TwoFactorClaim;
}

export interface ReadSessionOptions {
  isProduction: boolean;
  /** `AUTH_SECRET`. Yoksa oturum doğrulanamaz. */
  secret: string | undefined;
}

/**
 * Oturum bitti mi: giriş anına göre, yenilemelerden etkilenmez. `iat` ve `exp` her
 * `/api/auth/session` çağrısında ileri alınıyor; bu yüzden çalınan çerez süresiz yenilenebilir
 * ve şifre değişikliğinin yazma damgasını aşabilirdi. SAF.
 */
export function oturumBittiMi(
  authTime: number,
  maxAgeSeconds: number,
  nowSeconds: number,
): boolean {
  return nowSeconds - authTime > maxAgeSeconds;
}

/**
 * Geçerli bir oturum varsa kimliğini döner, yoksa `null`.
 *
 * **KAPALI YÖNDE BAŞARISIZ OLUR (fail closed).** `AUTH_SECRET` tanımsızsa veya
 * çözme sırasında beklenmedik bir hata olursa `null` döner — yani erişim
 * REDDEDİLİR. Ters tasarım (hata durumunda içeri almak) yapılandırma hatasını
 * sessiz bir yetkilendirme atlatmasına çevirirdi.
 */
export async function readSession(
  request: Request,
  options: ReadSessionOptions,
): Promise<SessionInfo | null> {
  if (!options.secret) {
    // Üretimde bu bir yapılandırma hatasıdır; sessizce içeri almak yerine
    // gürültü çıkarıp reddediyoruz.
    guvenliHata('[security] AUTH_SECRET tanımsız — oturum doğrulanamıyor, erişim reddedildi.');
    return null;
  }

  const cookieName = sessionCookieName(options.isProduction);

  try {
    const token = await getToken({
      req: request,
      secret: options.secret,
      cookieName,
      secureCookie: options.isProduction,
      // `salt` verilmezse `cookieName` kullanılır — `auth.ts` de aynı adı
      // kullandığı için türetilen anahtar eşleşir.
    });

    const userId = typeof token?.sub === 'string' ? token.sub : null;
    if (!userId) return null;

    // Giriş anından itibaren mutlak süre: `exp` yenilemelerle ileri alınabiliyor.
    const girisAni = typeof token?.authTime === 'number' ? token.authTime : null;
    if (
      girisAni !== null &&
      oturumBittiMi(girisAni, SESSION_MAX_AGE_SECONDS, Math.floor(Date.now() / 1000))
    ) {
      return null;
    }

    return { userId, twoFactorEnabled: readTwoFactorClaim(token) };
  } catch (error) {
    // §8.20 — jetonun kendisi ASLA loglanmaz.
    guvenliHata(
      '[security] oturum jetonu çözülemedi:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
