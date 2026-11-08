/**
 * §8.1 — "2FA kurulumu ilk girişte zorunludur."
 *
 * PROGRAM.md §8.1 (2026-08-10 düzeltmesi, T-016/T2): seed kullanıcıyı 2FA'sız
 * açar — kurulmamış bir authenticator kullanıcıyı kendi panelinden kilitlerdi
 * (R3). Zorunluluk gevşetilmedi, KURULUM ANINA taşındı: `totpConfirmedAt`
 * boşken panelin hiçbir bölümü kullanılamaz, her istek kurulum ekranına düşer.
 *
 * Bu modül bilinçli olarak SAFTIR: veritabanına, `next/server`'a veya herhangi
 * bir çalışma zamanına bağımlı değil. Karar mantığı burada, uygulaması
 * `src/middleware.ts` içinde.
 */

/** Kurulum ekranı — Frontend'in T-036'da yazdığı sayfa. */
export const TWO_FACTOR_SETUP_PATH = '/panel/ayarlar/guvenlik';

/**
 * JWT'de 2FA durumunu taşıyan alan.
 *
 * DEĞER HASSAS DEĞİLDİR: yalnızca "bu hesapta 2FA kurulu mu" bilgisini taşır.
 * Secret, kurtarma kodu veya sayıları JWT'ye GİRMEZ (§8.20) — JWT istemcide
 * okunabilir bir çerezdir.
 *
 * UYDURULAMAZ: jeton `AUTH_SECRET` ile şifrelenip imzalanıyor; istemci içeriği
 * okuyabilir ama değiştiremez. Bu yüzden yetkilendirme girdisi olarak
 * kullanılabilir — düz bir çerez olsaydı kullanılamazdı.
 */
export const TWO_FACTOR_CLAIM = 'tfa';

/**
 * Jetondaki 2FA durumu.
 *
 * `null` = alan JETONDA YOK. Ayrı bir değer olarak KORUNUYOR: `false`'a
 * indirgemek bilgiyi kaybettirirdi ve "alan yok" ile "2FA yok" farkı loglarda
 * ve ileride yazılacak tanılama kodunda ayırt edilemez hâle gelirdi.
 * Kapı açısından ikisi de aynı sonucu verir (bkz. `requiresTwoFactorSetup`).
 */
export type TwoFactorClaim = boolean | null;

/** Jeton yükünden `tfa` alanını okur; tanımsız veya boolean olmayan değer `null`. */
export function readTwoFactorClaim(
  token: Record<string, unknown> | null | undefined,
): TwoFactorClaim {
  const value = token?.[TWO_FACTOR_CLAIM];
  return typeof value === 'boolean' ? value : null;
}

/** Kurulum ekranının kendisi mi? (Kendisi yönlendirilirse sonsuz döngü olur.) */
export function isTwoFactorSetupPath(pathname: string): boolean {
  return pathname === TWO_FACTOR_SETUP_PATH || pathname.startsWith(`${TWO_FACTOR_SETUP_PATH}/`);
}

export interface TwoFactorGateInput {
  pathname: string;
  twoFactorEnabled: TwoFactorClaim;
}

/**
 * Bu istek kurulum ekranına yönlendirilmeli mi?
 *
 * **YALNIZCA `true` GEÇER.** Kapı kapalı yönde başarısız olur:
 *
 * | `tfa` | Anlamı | Davranış |
 * | ----- | ------ | -------- |
 * | `true`  | 2FA kurulu | geçer |
 * | `false` | 2FA kurulu değil | kuruluma yönlendirilir |
 * | `null`  | Alan jetonda yok | **kuruluma yönlendirilir** |
 *
 * **`null` ARTIK GEÇMİYOR (T-019b).** T-019'da geçici olarak geçiriliyordu:
 * o sırada `tfa` alanını giriş akışı henüz jetona koymuyordu (BULGU-008) ve
 * `null`'ı "kurulu değil" saymak, 2FA'sı ZATEN KURULU olan kullanıcıyı da
 * kurulum ekranına kalıcı olarak kilitlerdi — jetonu alanı hiçbir zaman
 * kazanmayacağı için. Backend T-013e'de alanı hem girişte (`applyLoginClaims`)
 * hem kurulum sonrası tazelemede (`refreshTwoFactorClaim`) yazdı; artık her
 * geçerli jeton alanı taşıyor ve pencerenin gerekçesi ortadan kalktı.
 *
 * Neden kapatılması ŞART: `null`'ı geçirmek, alanı yazan kod bir gün sessizce
 * bozulursa kapının da sessizce açılması demekti. Kontrolün, beslendiği verinin
 * yokluğunda AÇILMASI değil KAPANMASI gerekir.
 *
 * Geçiş maliyeti: değişiklikten önce üretilmiş jetonlar alanı taşımıyor ve
 * artık kuruluma yönlendirilecekler. Kullanıcı bir kez çıkıp girdiğinde yeni
 * jeton alanı kazanır. Uygulama henüz yayında olmadığı için (F7) gerçek etki yok.
 */
export function requiresTwoFactorSetup(input: TwoFactorGateInput): boolean {
  if (input.twoFactorEnabled === true) return false;

  // Kurulum ekranının kendisi muaf — aksi hâlde sonsuz yönlendirme.
  return !isTwoFactorSetupPath(input.pathname);
}
