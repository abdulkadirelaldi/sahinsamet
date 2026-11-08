// `@auth/core/jwt` DEĞİL: o paket next-auth'un GEÇİŞLİ bağımlılığıdır ve
// pnpm'in sıkı node_modules düzeninde adıyla çözülemez (`next build` bunu
// tip hatası olarak yakaladı). `next-auth/jwt` aynı modülü yeniden ihraç
// ediyor ve doğrudan bağımlılığımız — `src/lib/security/session.ts` de onu
// kullanıyor, yani kodlayan ve çözen taraf aynı uygulamadan geliyor.
import type { BrowserContext } from '@playwright/test';
import { encode } from 'next-auth/jwt';

// Göreli yol — gerekçe: `_helpers/db.ts` başındaki not.
import {
  SESSION_COOKIE_NAME_DEV,
  SESSION_COOKIE_NAME_PROD,
  SESSION_MAX_AGE_SECONDS,
} from '../../../src/lib/security/session';
import { TWO_FACTOR_CLAIM } from '../../../src/lib/security/two-factor';

/**
 * Oturum çerezi üretimi — giriş akışını her testte tekrarlamadan panele girmek için.
 *
 * NEDEN GEREKLİ: `/panel` arkasındaki her E2E senaryosu (F3'ten itibaren onlarca
 * olacak) oturumla başlıyor. Her birinde formu doldurup 2FA kodu üretmek hem
 * yavaş hem kırılgan — test ettiği şey giriş akışı olmadığı hâlde giriş akışı
 * bozulunca hepsi birden kırmızıya döner.
 *
 * §9 senaryo 3 bu kısayolu KULLANMAZ: orada ölçülen şeyin ta kendisi giriş akışı.
 *
 * İKİ İNCELİK (T-018b'de ölçüldü):
 *   1. `next start` NODE_ENV=production ile koşar → çerez adı `__Secure-` önekli
 *      olanıdır, geliştirme adı DEĞİL. Yanlış ad sessizce çalışmaz: `getToken`
 *      null döner, test "oturum yok" sanır.
 *   2. Playwright `__Secure-` önekli çerezi yalnızca `secure: true` ile kabul
 *      eder. `127.0.0.1` güvenli bağlam sayıldığı için düz HTTP'de de geçerlidir.
 */

/**
 * Jetonun şifreleme tuzu (salt) çerez ADIDIR — `getToken` da öyle türetir
 * (`src/lib/security/session.ts`). Ad ile tuz ayrışırsa jeton çözülemez.
 */
function cookieName(): string {
  // E2E üretim derlemesine karşı koşar; ortam değişkeni ile geçersiz kılınabilir.
  return process.env.E2E_SESSION_COOKIE_NAME ?? SESSION_COOKIE_NAME_PROD;
}

export interface IssueSessionInput {
  userId: string;
  email: string;
  name?: string;
  /**
   * Saniye cinsinden ömür. Varsayılan **§8.3'ün kendisi** —
   * `SESSION_MAX_AGE_SECONDS` içe aktarılıyor, sayı burada YAZILMIYOR.
   */
  maxAgeSeconds?: number;
  /**
   * §8.1 — jetondaki `tfa` alanı (T-019).
   *
   * Verilmezse alan jetona HİÇ konmaz; bu, Backend alanı eklemeden önce
   * üretilmiş jetonları taklit eder (geçiş penceresi). `true`/`false` vererek
   * ara katmanın iki dalı da gerçek tarayıcıyla sınanabilir — bu sayede
   * §8.1 kapısı, Backend'in giriş akışını değiştirmesini BEKLEMEDEN uçtan uca
   * doğrulanabiliyor.
   */
  twoFactorEnabled?: boolean;
}

/**
 * Auth.js'in kabul edeceği bir oturum jetonu üretir.
 *
 * Jetonun içeriği `auth.ts`'teki `jwt` geri çağrısıyla aynı tutulur: yalnızca
 * `sub`, `email`, `name`. Fazlasını koymak, üretimde olmayan bir jetonla test
 * yapmak olurdu.
 */
export async function issueSessionToken(input: IssueSessionInput): Promise<string> {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('E2E oturum çerezi için AUTH_SECRET gerekli. .env dosyasını kontrol edin.');
  }

  const name = cookieName();

  return encode({
    salt: name,
    secret,
    /*
     * ÖMÜR İÇE AKTARILIYOR, TEKRAR YAZILMIYOR (T-049g).
     *
     * T-048g'de bu satır `7 * 24 * 60 * 60` idi: ADR-035/A ömrü 24 saate
     * indirdikten sonra da eski değeri üretiyordu ve hiçbir test kırılmadı.
     * O turda sayı 24 saate çekilip sapma bir kaynak taramasıyla kapatıldı —
     * ama tarama bir SEMPTOM çözümüydü: iki yerde yazılı bir sayı, yarın
     * yine ayrışabilirdi.
     *
     * T-049g sabiti `src/lib/security/session`e taşıdı (Edge-güvenli, bu
     * yardımcının zaten çerez adları için içe aktardığı modül). Artık
     * kopyalanacak sayı yok: ömür değişirse burası KENDİLİĞİNDEN uyar.
     * Sapmanın imkânsız hâle gelmesi, sapmayı yakalayan bir testten iyidir.
     */
    maxAge: input.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS,
    token: {
      sub: input.userId,
      email: input.email,
      ...(input.name ? { name: input.name } : {}),
      // Verilmediyse alan hiç konmaz — alanı taşımayan eski jetonu taklit eder.
      ...(input.twoFactorEnabled === undefined
        ? {}
        : { [TWO_FACTOR_CLAIM]: input.twoFactorEnabled }),
    },
  });
}

/** Üretilen jetonu tarayıcı bağlamına çerez olarak yerleştirir. */
export async function applySessionCookie(
  context: BrowserContext,
  input: IssueSessionInput,
  baseUrl: string,
): Promise<void> {
  const value = await issueSessionToken(input);
  const { hostname } = new URL(baseUrl);

  await context.addCookies([
    {
      name: cookieName(),
      value,
      domain: hostname,
      path: '/',
      httpOnly: true,
      // `__Secure-` öneki bunu ZORUNLU kılar; 127.0.0.1 güvenli bağlam sayılır.
      secure: true,
      sameSite: 'Lax',
    },
  ]);
}

export { SESSION_COOKIE_NAME_DEV, SESSION_COOKIE_NAME_PROD };
