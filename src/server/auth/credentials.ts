import { createHash } from 'node:crypto';

import {
  applyLockoutPolicy,
  ipGrubu,
  LOGIN_RATE_LIMIT,
  rateLimitWindowStart,
  type LockoutClient,
} from '@/lib/security/rate-limit';
import { TWO_FACTOR_CLAIM } from '@/lib/security/two-factor';
import { db } from '@/server/db';
import type { Prisma } from '@/server/generated/prisma/client';

import { consumeBackupCode } from './backup-codes';
import {
  countRecentFailures,
  hashEmail,
  recordLoginAttempt,
  type LoginAttemptClient,
} from './login-attempt';
import { hashPassword, needsRehash, verifyPassword } from './password';
import { decryptSecret, verifyTotpToken } from './totp';
import { guvenliHata } from '@/lib/security/guvenli-log';

/**
 * Giriş akışı — §8.1–8.4, ADR-013.
 *
 * Auth.js'in `authorize` geri çağrısından AYRI bir modülde tutuluyor. Gerekçe
 * T-013a'daki ayrımın aynısı: akış `authorize` içine gömülürse veritabanı ve
 * NextAuth başlatma yan etkileri olmadan test edilemez. Burada Prisma istemcisi
 * ENJEKTE EDİLİR, böylece `pnpm test` veritabanı ve `.env` olmadan koşar
 * (T-003c kazanımı).
 *
 * §8.20: Bu modül şifreyi, TOTP secret'ını, kurtarma kodunu veya TAM E-POSTAYI
 * hiçbir koşulda loglamaz.
 */

/**
 * Başarısızlık nedenleri.
 *
 * `INVALID_CREDENTIALS` bilerek TEK bir değerdir: "kullanıcı yok" ile "şifre
 * yanlış" ayırt edilemez (§8 kullanıcı numaralandırma koruması).
 */
export type AuthFailureReason =
  'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'TOTP_REQUIRED' | 'INVALID_TOTP';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  /**
   * §8.1 kapısının okuduğu değer — `User.totpConfirmedAt != null`.
   *
   * YENİ SORGU YOK: `authenticateUser` kullanıcı kaydını zaten okuyor ve
   * `totpConfirmedAt`'i 2FA kontrolünde kullanıyor; burada aynı alandan
   * türetiliyor. Ölçüt `totpEnabled` bayrağı DEĞİL — kurulum yarıda kalmış bir
   * kullanıcıda bayrak yanıltıcı olabilir ve giriş akışı da aynı ölçütü
   * kullanıyor (T-015b/K4 ile aynı gerekçe).
   */
  twoFactorEnabled: boolean;
}

export type AuthenticateResult =
  { ok: true; user: AuthenticatedUser } | { ok: false; reason: AuthFailureReason };

/** Akışın Prisma'dan ihtiyaç duyduğu asgari yüzey — test için taklit edilebilir. */
export interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  lockedUntil: Date | null;
  totpSecret: string | null;
  totpConfirmedAt: Date | null;
  totpBackupCodes: string[];
}

/**
 * `verifyTotpWithRecovery`nin gerçekten okuduğu alanlar — T-042s.
 *
 * `AuthUserRecord` bunu SAĞLAR (fazlasıyla); ayrı tutulması, ikinci faktörü
 * doğrulayan başka akışların giriş akışının tamamını taklit etmesini önlüyor.
 */
export interface TotpVerifiable {
  id: string;
  totpSecret: string | null;
  totpBackupCodes: string[];
}

/** Kurtarma kodu TÜKETİMİ için gereken asgari yazma yüzeyi. */
export interface TotpConsumerClient {
  user: {
    updateMany(args: {
      where: Record<string, unknown>;
      data: { totpBackupCodes?: string[]; totpSonKod?: string; totpSonZaman?: Date };
    }): Promise<{ count: number }>;
  };
}

/** Aynı anda en çok bu kadar Argon2 doğrulaması; `mem_limit: 512m` içinde güvenli. */
const EN_COK_ESZAMANLI_ARGON = 8;
let argonMesgul = 0;

export interface AuthClient extends LoginAttemptClient, LockoutClient {
  user: TotpConsumerClient['user'] & {
    findUnique(args: { where: { email: string } }): Promise<AuthUserRecord | null>;
    update(args: {
      where: { id: string };
      data: {
        lastLoginAt?: Date;
        passwordHash?: string;
        totpBackupCodes?: string[];
        /**
         * §8.4 kilidi — BULGU-005.
         * Bu alan tipte yokken `applyLockoutPolicy` kilidi TİP DÜZEYİNDE
         * yazamıyordu; politika yazılmış ama fiilen devre dışıydı.
         */
        lockedUntil?: Date;
      };
    }): Promise<unknown>;
  };
}

/**
 * Var olmayan kullanıcı için ödenecek sahte doğrulama maliyeti.
 *
 * KULLANICI NUMARALANDIRMA KORUMASI: e-posta bulunamazsa hemen dönülseydi yanıt
 * ~1 ms sürerdi; gerçek kullanıcıda ise argon2 doğrulaması ~30 ms. Bu fark
 * ölçülebilir ve hangi e-postaların kayıtlı olduğunu ele verir. Bu yüzden
 * kullanıcı yokken de bir argon2 doğrulaması yapılır.
 *
 * Sabit bir hash kullanılır; modül yüklenirken ÜRETİLMEZ (argon2 çağrısı
 * modül gövdesinde `await` gerektirir ve derlemeyi ağırlaştırır). Bu değer
 * gerçek bir şifreye ait değildir — rastgele üretilmiş, atılmış bir parolanın
 * hash'idir ve hiçbir zaman eşleşmez.
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=3,p=1$c29tZS1zdGF0aWMtc2FsdA$Ryr4dPeVdEnBl7CqzSCoJVWSDCEhc9ZCiGYYPGb5rGA';

/** Kullanıcı kaydı olmadığında zamanlamayı dengelemek için çağrılır. */
async function payVerificationCost(password: string): Promise<void> {
  await verifyPassword(DUMMY_PASSWORD_HASH, password);
}

/**
 * Gerçek Prisma istemcisini `AuthClient` sözleşmesine uyarlar.
 *
 * NEDEN ADAPTÖR GEREKTİ: `LockoutClient.auditLog.create` (T-014, Güvenlik ajanının
 * dosyası) elle yazılmış düz bir imza; Prisma'nın ürettiği `create` ise
 * `AuditLogCreateInput` ile `AuditLogUncheckedCreateInput` arasında bir XOR
 * birleşimi bekliyor ve `diff` alanında `InputJsonValue` istiyor. Bu ikisi
 * yapısal olarak uyuşmuyor — ölçüldü: `const x: LockoutClient = db` derlenmiyor.
 * Politika yalnızca sahte istemcilerle test edildiği için bu uyumsuzluk
 * T-014'te görünmemişti (rapora bulgu olarak yazıldı).
 *
 * Adaptör, uyumsuzluğu ÇAĞRI SINIRINDA çözer; Güvenlik'in dosyasına
 * dokunulmaz (§10.1) ve politika sözleşmesi olduğu gibi kalır.
 *
 * TEMBELLİK KORUNUR: `user` ve `loginAttempt` GETTER'dır. Doğrudan
 * `user: db.user` yazılsaydı modül yüklenirken Prisma istemcisi çözülür ve
 * T-003c'nin `.env`'siz derleme kazanımı kaybolurdu.
 */
const prismaAuthClient: AuthClient = {
  get user() {
    return db.user;
  },
  get loginAttempt() {
    return db.loginAttempt;
  },
  auditLog: {
    async create(args) {
      await db.auditLog.create({
        data: {
          actorId: args.data.actorId ?? null,
          actorEmailHash: args.data.actorEmailHash ?? null,
          action: args.data.action,
          entity: args.data.entity,
          entityId: args.data.entityId ?? null,
          // `Record<string, unknown>` → Prisma'nın özyinelemeli JSON tipi.
          // Daraltma değil genişletme; değer zaten redaksiyondan geçmiş bir nesne.
          diff: args.data.diff as Prisma.InputJsonValue | undefined,
          ip: args.data.ip ?? null,
        },
      });
    },
  },
};

export interface AuthenticateInput {
  email: string;
  password: string;
  /** İkinci adımda gelir; TOTP kodu VEYA kurtarma kodu olabilir. */
  totpCode?: string | undefined;
  /** §8.4 denetim kaydı için. Bilinmiyorsa 'unknown'. */
  ip: string;
}

/**
 * Kimlik doğrulama akışı.
 *
 * ADIM SIRASI ÖNEMLİ:
 *   1. Kullanıcıyı bul (yoksa da doğrulama maliyeti ödenir)
 *   2. Şifreyi doğrula
 *   3. HESAP KİLİDİ — şifre DOĞRULANDIKTAN SONRA kontrol edilir
 *   4. Gerekirse hash'i sessizce yükselt
 *   5. 2FA zorunluysa TOTP veya kurtarma kodu
 *   6. Başarı: `lastLoginAt` güncelle
 *
 * (3)'ün sırası bilinçli: kilit durumu şifre doğrulanmadan bildirilseydi,
 * saldırgan bir e-postayı kilitleyip yanıta bakarak hesabın VAR OLDUĞUNU
 * öğrenirdi. Şifre yanlışsa kilitli hesap da `INVALID_CREDENTIALS` döner.
 */
export async function authenticateUser(
  input: AuthenticateInput,
  client: AuthClient = prismaAuthClient,
  now: Date = new Date(),
): Promise<AuthenticateResult> {
  const emailHash = hashEmail(input.email);
  const ip = ipGrubu(input.ip);

  // IP engeli Argon2'DEN ÖNCE: engelliyken tahmin sürmesin, bellek ve CPU harcanmasın. Şifre
  // doğru da yanlış da aynı yanıt: engel şifre hakkında bilgi vermez. Sayılamıyorsa akış sürer.
  const ipDenemesi = await countRecentFailures({ ip }, rateLimitWindowStart(now), client).catch(
    () => 0,
  );
  if (ipDenemesi >= LOGIN_RATE_LIMIT.maxFailures) return { ok: false, reason: 'ACCOUNT_LOCKED' };

  // Hesap eşiği de var olmayan e-postada aynı çalışır: kilit yanıtı hesabın varlığını ele vermez.
  const hesapDenemesi = await countRecentFailures(
    { emailHash },
    rateLimitWindowStart(now),
    client,
  ).catch(() => 0);
  if (hesapDenemesi >= LOGIN_RATE_LIMIT.hesapMaxFailures) {
    return { ok: false, reason: 'ACCOUNT_LOCKED' };
  }

  const user = await client.user.findUnique({
    where: { email: input.email.trim().toLowerCase() },
  });

  /**
   * Başarısız her yol buradan çıkar — §8.4'ün iki yarısı da burada tamamlanır.
   *
   * SIRA ÖNEMLİ: önce `recordLoginAttempt`, SONRA `applyLockoutPolicy`.
   * Politika sayımı veritabanından okuyor; tetikleyen denemenin kendisi
   * kaydedilmeden sayılsaydı kilit bir deneme geç uygulanırdı — 5 yerine 6'da.
   *
   * `fail` kullanıcı aramasından SONRA tanımlanıyor: kilidin hangi kayda
   * yazılacağını bilmesi gerekiyor. Var olmayan e-postada `userId: null` geçer;
   * politika sayımı yine yapar ama yazacak kayıt bulamaz (`applied: false`) —
   * numaralandırma sızıntısı oluşmaz.
   *
   * `applyLockoutPolicy` ASLA FIRLATMAZ (T-014 sözleşmesi); giriş akışının
   * hata yolunu değiştirmez. Kilit yazılamazsa loglar ve devam eder.
   */
  const fail = async (reason: AuthFailureReason): Promise<AuthenticateResult> => {
    await recordLoginAttempt({ ip, emailHash, success: false }, client);

    await applyLockoutPolicy(
      { ip, emailHash, userId: user?.id ?? null },
      {
        countRecentFailures: (filter, since) => countRecentFailures(filter, since, client),
        client,
      },
      now,
    );

    return { ok: false, reason };
  };

  // --- 3: hesap kilidi (politika T-014'te, SAYGI burada) --------------------
  // Şifreden ÖNCE: kilitliyken yanıt şifrenin doğruluğunu ele vermez, tahmin de ilerlemez.
  if (user?.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
    return { ok: false, reason: 'ACCOUNT_LOCKED' };
  }

  // Argon2 deneme başına ~19 MiB: eşzamanlı istekler uygulamanın belleğini bitirmesin.
  if (argonMesgul >= EN_COK_ESZAMANLI_ARGON) return { ok: false, reason: 'ACCOUNT_LOCKED' };

  // --- 1 + 2: kullanıcı ve şifre -------------------------------------------
  argonMesgul += 1;
  let passwordValid = false;
  try {
    if (user) {
      // T-013a/T2a — HASH ÖNCE, şifre sonra. Ters yazılırsa sessizce hep false döner.
      passwordValid = await verifyPassword(user.passwordHash, input.password);
    } else {
      await payVerificationCost(input.password);
    }
  } finally {
    argonMesgul -= 1;
  }
  if (!user || !passwordValid) {
    return fail('INVALID_CREDENTIALS');
  }

  // --- 5: iki faktör (§8.1 — v1'de zorunlu) --------------------------------
  // `totpConfirmedAt` dolu = kurulum tamamlanmış = 2FA etkin.
  if (user.totpConfirmedAt && user.totpSecret) {
    if (!input.totpCode) {
      // Doğrulama kodu istenir. Bu noktaya YALNIZCA şifre doğruysa gelinir,
      // dolayısıyla numaralandırma sızıntısı oluşturmaz. Başarısız deneme DEĞİL: her olağan
      // giriş bu adımdan geçer, sayılsa 5 normal girişte IP engellenirdi.
      return { ok: false, reason: 'TOTP_REQUIRED' };
    }

    const totpAccepted = await verifyTotpWithRecovery(user, input.totpCode, client, now);
    if (!totpAccepted) {
      return fail('INVALID_TOTP');
    }
  }

  // --- 4: hash yükseltme (T-013a/T2c) --------------------------------------
  // Şifre yalnızca ŞU ANDA düz metin olarak elimizde; başka yükseltme fırsatı yok.
  if (needsRehash(user.passwordHash)) {
    try {
      await client.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(input.password) },
      });
    } catch (error) {
      // Yükseltme başarısızlığı girişi ENGELLEMEZ — kullanıcı doğrulandı.
      guvenliHata(
        '[auth] şifre hash yükseltmesi başarısız:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  // --- 6: başarı -----------------------------------------------------------
  try {
    await client.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
  } catch (error) {
    guvenliHata(
      '[auth] lastLoginAt güncellenemedi:',
      error instanceof Error ? error.message : error,
    );
  }

  await recordLoginAttempt({ ip, emailHash, success: true }, client);

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      twoFactorEnabled: user.totpConfirmedAt !== null,
    },
  };
}

/**
 * Önce TOTP, olmazsa kurtarma kodu dener.
 *
 * Kullanıcı ikisini de aynı alana yazar (T-036); ayrı alan istemek, telefonunu
 * kaybetmiş birinin akışını gereksiz yere karmaşıklaştırırdı.
 *
 * İHRAÇ EDİLİYOR (T-042s): şifre değiştirme de ikinci faktörü doğrulamak
 * zorunda ve bu mantığı orada YENİDEN YAZMAK iki kopya üretirdi — biri
 * kurtarma kodunu tüketmeyi unutursa kod kalıcı bir arka kapıya dönüşürdü.
 *
 * Parametre tipleri `AuthUserRecord`/`AuthClient`ten DARALTILDI: şifre
 * değiştirme akışının `lockedUntil`, `LoginAttempt` ya da e-postayla arama
 * yüzeyine ihtiyacı yok. Geniş tipler orada gereksiz bir taklit yükü olurdu.
 */
/** Doğrulama kodu ±1 adım (30 sn) geçerli: bu süre boyunca aynı kod ikinci kez kabul edilmez. */
const TOTP_TEKRAR_PENCERESI_MS = 90_000;

/**
 * Kabul edilen kodu harcar: gözetlenen ya da oltalanan kod pencere içinde yeniden kullanılamaz.
 * Koşullu yazma: aynı kodla eşzamanlı iki istekten yalnızca biri geçer.
 */
async function totpKodunuHarca(
  userId: string,
  code: string,
  client: TotpConsumerClient,
  now: Date,
): Promise<boolean> {
  const ozet = createHash('sha256').update(code).digest('hex');
  try {
    const yazilan = await client.user.updateMany({
      where: {
        id: userId,
        OR: [
          { totpSonKod: null },
          { totpSonKod: { not: ozet } },
          { totpSonZaman: { lt: new Date(now.getTime() - TOTP_TEKRAR_PENCERESI_MS) } },
        ],
      },
      data: { totpSonKod: ozet, totpSonZaman: now },
    });
    return yazilan.count > 0;
  } catch (error) {
    guvenliHata(
      '[auth] doğrulama kodu kaydedilemedi:',
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export async function verifyTotpWithRecovery(
  user: TotpVerifiable,
  code: string,
  client: TotpConsumerClient,
  now: Date = new Date(),
  /** Girişte kod harcanır. Şifre değiştirip hemen aynı kodla giriş yapmak engellenmesin. */
  kodHarca = true,
): Promise<boolean> {
  // T-013a/T2b — `decryptSecret` FIRLATABİLİR (kurcalanmış veya anahtar değişmiş).
  let secret: string | null = null;
  try {
    secret = user.totpSecret ? decryptSecret(user.totpSecret) : null;
  } catch (error) {
    // §8.20 — secret'ın kendisi değil, yalnızca olayın oluştuğu loga yazılır.
    guvenliHata('[auth] TOTP secret çözülemedi:', error instanceof Error ? error.message : error);
    secret = null;
  }

  if (secret && (await verifyTotpToken(code, secret))) {
    return kodHarca ? totpKodunuHarca(user.id, code, client, now) : true;
  }

  // TOTP tutmadı — kurtarma kodu olabilir (ADR-013).
  if (user.totpBackupCodes.length === 0) {
    return false;
  }

  const result = await consumeBackupCode(code, user.totpBackupCodes);
  if (!result.matched) {
    return false;
  }

  // Kod TÜKETİLİR: kalıcı bir arka kapıya dönüşmemeli. Koşullu yazma: aynı kodla eşzamanlı iki
  // istekten yalnızca biri listeyi değiştirebilir, öteki reddedilir.
  try {
    const yazilan = await client.user.updateMany({
      where: { id: user.id, totpBackupCodes: { equals: user.totpBackupCodes } },
      data: { totpBackupCodes: result.remainingHashes },
    });
    if (yazilan.count === 0) return false;
  } catch (error) {
    // Tüketim yazılamadıysa girişi REDDET — aksi hâlde kod sınırsız kullanılabilir.
    guvenliHata(
      '[auth] kurtarma kodu tüketimi kaydedilemedi:',
      error instanceof Error ? error.message : error,
    );
    return false;
  }

  return true;
}

/**
 * İstemci IP'si — §8.4 denetim kaydı için.
 *
 * Coolify ters vekil arkasında `x-forwarded-for` ilk değeri gerçek istemcidir.
 * Başlık yoksa 'unknown' yazılır; uydurma bir değer denetim kaydını yanıltıcı yapardı.
 *
 * BU FONKSİYON BİLEREK BURADA, `auth.ts` içinde değil: `auth.ts` `next-auth`
 * import ettiği için Vitest'in node ortamında yüklenemiyor (`next/server`
 * çözülmüyor) ve orada kalsaydı hiç test edilemezdi. Burada saf ve test edilebilir.
 */
export function extractClientIp(request: Request | undefined): string {
  if (!request) return 'unknown';

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/* ===========================================================================
 * JETON ALANLARI — §8.1 kapısının okuduğu şekil (BULGU-008)
 *
 * Bu iki fonksiyon `auth.ts`'in `jwt` geri çağrısından ÇAĞRILIR ama BURADA
 * yaşar. Gerekçe T-013b'deki `extractClientIp` ile aynı: `auth.ts` `next-auth`
 * import ettiği için Vitest'in node ortamında yüklenemiyor; mantık orada
 * kalsaydı hiç test edilemezdi. Burada saf ve enjekte edilebilir.
 * ======================================================================== */

/** JWT'nin bu katmanın umursadığı alanları. */
export interface SessionClaims {
  /** Giriş anı (sn): yenilemelerde değişmez. */
  authTime?: number;
  sub?: string | undefined;
  /**
   * `null` DA KABUL EDİLİR: Auth.js'in `DefaultJWT` tipi bu alanları
   * `string | null` olarak tanımlıyor. Yalnızca `string | undefined` yazılsaydı
   * `JWT` bu arayüze atanamaz ve geri çağrı derlenmezdi.
   */
  email?: string | null | undefined;
  name?: string | null | undefined;
  /** `TWO_FACTOR_CLAIM` ile aynı ad — §8.1 kapısı bunu okur. */
  [TWO_FACTOR_CLAIM]?: boolean | undefined;
}

/** `authorize` dönüşünden jetona taşınacak asgari kullanıcı bilgisi. */
export interface LoginClaimSource {
  id?: string | undefined;
  email?: string | null | undefined;
  name?: string | null | undefined;
  tfa?: boolean | undefined;
}

/**
 * GİRİŞ anında jetonu doldurur.
 *
 * §8.20 — yalnızca dört alan: kimlik, görüntüleme bilgisi ve 2FA durumu.
 * Secret, kurtarma kodu veya SAYISI jetona GİRMEZ; JWT imzalıdır ama istemcide
 * okunabilir bir çerezdir.
 */
export function applyLoginClaims<T extends SessionClaims>(token: T, user: LoginClaimSource): T {
  token.sub = user.id;
  token.email = user.email ?? undefined;
  token.name = user.name ?? undefined;
  token[TWO_FACTOR_CLAIM] = user.tfa;
  token.authTime = Math.floor(Date.now() / 1000);
  return token;
}

/**
 * `update()` sonrası 2FA alanını tazeler — BULGU-008'in ikinci yarısı.
 *
 * DEĞER VERİTABANINDAN OKUNUR, İSTEMCİDEN DEĞİL. `update()` çağrısına gövde
 * iliştirilebilir ve o gövde istemcinin denetimindedir; bir YETKİLENDİRME
 * girdisini oradan almak, kullanıcının kendi kapısını `{ tfa: true }`
 * göndererek açması demek olurdu.
 *
 * Okuma başarısız olursa jeton OLDUĞU GİBİ kalır — kullanıcı çıkıp yeniden
 * girerek yine kurtulur; kilitlenme oluşmaz.
 */
export async function refreshTwoFactorClaim<T extends SessionClaims>(
  token: T,
  readTwoFactorState: (userId: string) => Promise<{ enabled: boolean }>,
): Promise<T> {
  if (!token.sub) return token;

  try {
    const state = await readTwoFactorState(token.sub);
    token[TWO_FACTOR_CLAIM] = state.enabled;
  } catch (error) {
    // §8.20 — ayrıntı yalnızca loga.
    guvenliHata('[auth] 2FA durumu tazelenemedi:', error instanceof Error ? error.message : error);
  }

  return token;
}
