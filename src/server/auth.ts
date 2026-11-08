import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import * as z from 'zod';

import { oturumBittiMi, SESSION_MAX_AGE_SECONDS } from '@/lib/security/session';
import { readTwoFactorClaim } from '@/lib/security/two-factor';
import { loginSchema } from '@/lib/schemas';

import {
  applyLoginClaims,
  authenticateUser,
  extractClientIp,
  refreshTwoFactorClaim,
} from './auth/credentials';
import { girisDogrula, PasskeyHatasi, rpCoz } from './auth/passkey';
import { getTotpState } from './services/user';
import { guvenliHata, guvenliUyari } from '@/lib/security/guvenli-log';

/**
 * Auth.js v5 yapılandırması — PROGRAM.md §8.1–8.6, ADR-013.
 *
 * ADR-013 GEREĞİ:
 *   - `session.strategy = 'jwt'`. Credentials provider Auth.js v5'te YALNIZCA
 *     JWT ile çalışır; PrismaAdapter'ın DB oturumu bu akışla kullanılamaz.
 *   - PrismaAdapter YOK, `Account`/`Session` modelleri YOK.
 *
 * §8.6: `auth()` her Server Action ve Server Component'ten ayrıca çağrılır —
 * middleware'e GÜVENİLMEZ. Bu dosya o yardımcıyı ihraç eder.
 */

/*
 * §8.3 — oturum ömrü (24 saat, ADR-035/A).
 *
 * ⚠️ DEĞERİN KENDİSİ VE GEREKÇESİ BURADA DEĞİL: kanonik tanım
 * `@/lib/security/session` içinde (T-049g taşıdı, T-051/A bu dosyayı oraya
 * bağladı). Burada bir literal DURMAMALI — iki tanım, biri güncellenip diğeri
 * kalınca tutarsız bir ömür üretirdi ve tam bu yüzden taşındı.
 *
 * Neden O MODÜL kanonik: ara katman Edge'de koşuyor ve `@/server/*` zincirini
 * yükleyemiyor (T-044g'de `UnhandledSchemeError` ile ölçüldü), yani ömrü hem
 * ara katmanın hem bu dosyanın okuyabileceği tek yer orası.
 *
 * SABİT İKİ YERDE KULLANILIYOR — çerez `maxAge` ve oturum `maxAge` (JWT `exp`
 * ondan türer). İkisi de aşağıda aynı içe aktarmadan besleniyor.
 *
 * `tests/unit/session-omru.test.ts` bu dosyanın içe aktardığını ve kendi
 * literalini YAZMADIĞINI kaynaktan doğruluyor (Güvenlik'in kapısı).
 */

const useSecureCookies = process.env.NODE_ENV === 'production';

/** Passkey yanıtının kabaca biçimi — içerik kriptografik olarak serviste doğrulanır. */
const passkeyYanitSchema = z
  .object({
    id: z.string().min(1).max(1024),
    response: z.object({ clientDataJSON: z.string().max(4096) }).loose(),
  })
  .loose();

export const { handlers, auth, signIn, signOut } = NextAuth({
  /**
   * `trustHost` üretimde ters vekil (Coolify) arkasında çalışmak için gerekli;
   * aksi hâlde Auth.js `Host` başlığını doğrulayamaz ve isteği reddeder (§13.3).
   */
  trustHost: true,

  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },

  /**
   * §8.3 — çerez bayrakları AÇIKÇA verilir.
   *
   * Auth.js varsayılanları bugün bunlarla örtüşüyor olabilir ama bir güvenlik
   * kabul şartını kütüphane varsayılanına bırakmak, sürüm notlarına bağlı hale
   * getirmek demektir (T-013a'da otplib'de tam bu sınıf hata çıktı).
   */
  cookies: {
    sessionToken: {
      name: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    },
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-posta', type: 'email' },
        password: { label: 'Şifre', type: 'password' },
        totpCode: { label: 'Doğrulama kodu', type: 'text' },
      },

      async authorize(credentials, request) {
        // §8.8 — her girdi Zod ile doğrulanır. Şema T-011'de yazıldı, yeniden yazılmaz.
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          // Biçimsel hata da "geçersiz kimlik bilgisi"dir; ayrım sızdırmaz.
          throw new CredentialsError('INVALID_CREDENTIALS');
        }

        const result = await authenticateUser({
          email: parsed.data.email,
          password: parsed.data.password,
          totpCode: parsed.data.totpCode,
          ip: extractClientIp(request),
        });

        if (!result.ok) {
          throw new CredentialsError(result.reason);
        }

        // Bu nesne JWT'ye taşınır — HASSAS ALAN KOYULMAZ.
        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          // §8.1 kapısının okuduğu alan (BULGU-008). Yeni sorgu yok:
          // `authenticateUser` kullanıcı kaydını zaten okumuştu.
          tfa: result.user.twoFactorEnabled,
        };
      },
    }),

    /*
     * FACE ID / TOUCH ID (2026-10-30, `server/auth/passkey.ts`). Tarayıcının
     * imzaladığı WebAuthn yanıtı JSON olarak gelir; doğrulama, meydan okumanın
     * tüketilmesi, kilit ve başarısız deneme sayımı serviste. Başarıda jeton
     * şifreli girişle AYNI alanlarla basılır (`applyLoginClaims`).
     */
    Credentials({
      id: 'passkey',
      name: 'Passkey',
      credentials: { yanit: { label: 'Yanıt', type: 'text' } },

      async authorize(credentials, request) {
        const ham = typeof credentials?.yanit === 'string' ? credentials.yanit : '';
        // Boyut sınırı JSON.parse'tan ÖNCE — devasa gövde ayrıştırılmaz.
        if (!ham || ham.length > 20_000) throw new CredentialsError('INVALID_CREDENTIALS');

        let yanit: unknown;
        try {
          yanit = JSON.parse(ham);
        } catch {
          throw new CredentialsError('INVALID_CREDENTIALS');
        }
        const bicim = passkeyYanitSchema.safeParse(yanit);
        const rp = rpCoz(request?.headers.get('origin'));
        if (!bicim.success || !rp) throw new CredentialsError('INVALID_CREDENTIALS');

        try {
          const kullanici = await girisDogrula(
            bicim.data as unknown as Parameters<typeof girisDogrula>[0],
            rp,
            extractClientIp(request),
          );
          return {
            id: kullanici.id,
            email: kullanici.email,
            name: kullanici.name,
            tfa: kullanici.twoFactorEnabled,
          };
        } catch (error) {
          throw new CredentialsError(
            error instanceof PasskeyHatasi && error.kod === 'KILITLI'
              ? 'ACCOUNT_LOCKED'
              : 'PASSKEY_FAILED',
          );
        }
      },
    }),
  ],

  callbacks: {
    /**
     * JWT içeriği ASGARİ tutulur (§8.20).
     * `sub` zaten kullanıcı kimliğini taşır; ek olarak yalnızca görüntüleme için
     * gereken `email` ve `name` konur. Şifre, TOTP durumu, kurtarma kodu sayısı
     * gibi hiçbir hassas alan JWT'ye GİRMEZ — JWT istemcide okunabilir bir çerezdir.
     */
    /**
     * Jeton alanları — mantık `./auth/credentials` içinde, burada yalnızca
     * bağlantı var. Gerekçe: bu dosya `next-auth` import ettiği için Vitest'in
     * node ortamında yüklenemiyor; mantık burada kalsaydı test edilemezdi
     * (T-013b/T3). `getTotpState` ENJEKTE EDİLİYOR, böylece tazeleme yolu
     * veritabanı olmadan test edilebiliyor.
     */
    async jwt({ token, user, trigger }) {
      // GİRİŞ — `user` yalnızca `authorize` başarılı olduğunda dolu gelir.
      if (user) return applyLoginClaims(token, user);

      // KURULUM SONRASI TAZELEME — yalnızca açık `update()` çağrılarında.
      // Normal istek yolunda veritabanına GİDİLMEZ.
      if (trigger === 'update') return refreshTwoFactorClaim(token, getTotpState);

      // Bu özellikten önce açılmış oturumda giriş anı `iat`tir ve bir daha ilerlemez.
      const girisAni = typeof token.authTime === 'number' ? token.authTime : token.iat;
      if (typeof girisAni === 'number') {
        token.authTime = girisAni;
        if (oturumBittiMi(girisAni, SESSION_MAX_AGE_SECONDS, Math.floor(Date.now() / 1000))) {
          return null;
        }
      }
      return token;
    },

    /** Server Component ve Server Action'ların gördüğü nesne. */
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      /*
       * ADR-035/B — `iat` oturuma taşınıyor.
       *
       * BURADA VERİTABANINA GİDİLMİYOR ve bu kasıtlı: karşılaştırmayı bu geri
       * çağrıya koymak, `auth()` çağıran HER yolu (okuma dahil) veritabanına
       * bağlardı ve karşılığında hiçbir okumayı korumazdı — okuma koruması ara
       * katmanda, o da Edge'de ve DB okuyamıyor (T-014/K1).
       *
       * Burada yalnızca jetonun kendi alanı kopyalanıyor; kararı yazma kapısı
       * (`currentActorId`) veriyor.
       */
      // Giriş anı, `iat` değil: yenilemeyle ileri alınıp şifre değişikliği damgasını aşamaz.
      const girisAni = typeof token.authTime === 'number' ? token.authTime : token.iat;
      session.tokenIssuedAt = typeof girisAni === 'number' ? girisAni : undefined;
      session.tfa = readTwoFactorClaim(token) ?? undefined;
      return session;
    },
  },

  pages: {
    signIn: '/giris',
    error: '/giris',
  },

  /**
   * §8.20 — Auth.js'in kendi hata logları e-posta içerebilir.
   * Bu yüzden `error` olayı bilerek daraltılır: yalnızca hata TÜRÜ yazılır.
   */
  logger: {
    error(error) {
      guvenliHata('[auth]', error.name);
    },
    warn(code) {
      guvenliUyari('[auth]', code);
    },
    debug() {
      // Üretimde ve geliştirmede sessiz — debug çıktısı token taşıyabilir.
    },
  },
});

/**
 * `authorize` içinden fırlatılan hata — `code` istemciye bu sınıfla ulaşır.
 *
 * `CredentialsSignin`'İ GENİŞLETMEK ZORUNLUDUR, adı elle set etmek YETMEZ.
 * Auth.js şu kontrolü yapıyor:
 *
 *     if (error instanceof CredentialsSignin) params.set('code', error.code)
 *
 * `name = 'CredentialsSignin'` atanmış düz bir `Error` bu `instanceof`
 * kontrolünü GEÇEMEZ. İlk sürüm böyleydi ve sonucu şuydu: hata
 * `CallbackRouteError`'a sarılıyor, istemciye `error=Configuration` gidiyor,
 * `code` HİÇ GİTMİYORDU. Dört hata kodu ayırt edilemiyor, `TOTP_REQUIRED`
 * ulaşmadığı için ikinci adım hiç açılmıyor ve 2FA'lı kullanıcı giriş
 * yapamıyordu. Sınıf kimliği burada davranışın kendisidir.
 */
class CredentialsError extends CredentialsSignin {
  override code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}
