import { LOGIN_RATE_LIMIT, rateLimitWindowStart } from '@/lib/security/rate-limit';
import { db } from '@/server/db';

/**
 * Kullanıcı / 2FA servisi — §7.4, ADR-013.
 *
 * T-015 konvansiyonu: Prisma istemcisi ENJEKTE EDİLİR, girdi doğrulanmış gelir,
 * çıkışta `Decimal` yok (bu serviste para alanı da yok), `AuditLog` ve
 * `revalidatePath` SERVİSTE DEĞİL Server Action'da.
 *
 * §8.20: Bu servis `totpSecret`'ı ÇÖZMEZ ve kurtarma kodu ÜRETMEZ — şifreli
 * değeri saklar, hash'li listeyi yazar. Kripto işi T-013a'nın primitiflerinde.
 */

/* ===========================================================================
 * TİPLER — Frontend'in `totp-contract.ts` dosyasıyla yapısal olarak aynı
 * ======================================================================== */

export type TotpErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_TOTP'
  | 'ALREADY_ENABLED'
  | 'NOT_ENABLED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface TotpError {
  code: TotpErrorCode;
  message: string;
}

export interface TotpStatus {
  enabled: boolean;
  remainingBackupCodes: number;
}

export type TotpResult<T> = { ok: true; data: T } | { ok: false; error: TotpError };

/** §7.2 ile aynı zarf; Server Action olduğu için HTTP durumu yok, kod taşınır. */
export const TOTP_ERRORS: Record<TotpErrorCode, string> = {
  UNAUTHORIZED: 'Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.',
  INVALID_TOTP: 'Doğrulama kodu geçersiz. Uygulamanızdaki güncel kodu girin.',
  ALREADY_ENABLED: 'İki adımlı doğrulama zaten açık.',
  NOT_ENABLED: 'İki adımlı doğrulama açık değil.',
  RATE_LIMITED: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.',
  INTERNAL_ERROR: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
};

export function totpFail(code: TotpErrorCode): { ok: false; error: TotpError } {
  return { ok: false, error: { code, message: TOTP_ERRORS[code] } };
}

/* ===========================================================================
 * HIZ SINIRI — kurulum doğrulaması
 * ======================================================================== */

/**
 * Başarısız TOTP doğrulaması `AuditLog`'a `LOGIN_FAILED` olarak yazılır ve
 * sayım BURADAN yapılır.
 *
 * NEDEN `LoginAttempt` DEĞİL: o tablo §8.4'ün IP başına kilit sayacıdır ve
 * `applyLockoutPolicy` onu okuyup HESABI KİLİTLER. Kurulum sırasında kodu birkaç
 * kez yanlış giren dürüst bir kullanıcı, kendi hesabını kilitlemiş olurdu —
 * üstelik 2FA'yı henüz kuramamışken. İki sayaç ayrı tutuluyor: aynı eşiği
 * paylaşıyorlar ama biri hesabı kilitler, diğeri yalnızca bu akışı yavaşlatır.
 *
 * Eşik ve pencere Güvenlik ajanının `LOGIN_RATE_LIMIT` sabitinden gelir —
 * ikinci bir sihirli sayı tanımlanmaz (§8.4 tek yerden denetlenebilir kalsın).
 */
export const TOTP_SETUP_RATE_LIMIT = {
  maxFailures: LOGIN_RATE_LIMIT.maxFailures,
  windowMinutes: LOGIN_RATE_LIMIT.windowMinutes,
} as const;

/**
 * `AuditLog` tabanlı başarısızlık sayacının BAĞLAMLARI — T-046.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ÇAPRAZ SAYIM KUSURU — ÖLÇÜLDÜ VE DÜZELTİLDİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu sayaç eskiden `action` + `entity` + `entityId` üzerinden sayıyordu ve
 * `diff.context`e HİÇ bakmıyordu. T-042s şifre değiştirme akışını ekleyince
 * aynı üçlüyle (`LOGIN_FAILED` / `User` / `<id>`) satır yazmaya başladı — yani
 * şifresini birkaç kez yanlış yazan kullanıcı, farkında olmadan 2FA KURULUM
 * hız sınırını da dolduruyordu. Tersi de geçerliydi.
 *
 * CANLI VERİTABANINDA ÖLÇÜLDÜ (T-046, geri alınan işlem içinde): üç satır
 * yazıldı (2 × `CHANGE_PASSWORD`, 1 × `TOTP_SETUP_CONFIRM`); filtresiz sayım
 * **3** döndü, `diff.path=['context']` filtreli sayımlar **2** ve **1** döndü.
 * Yani hem kusur hem de düzeltmesi ölçüldü.
 *
 * Artık her sayaç YALNIZCA kendi bağlamını sayıyor. Bağlam adları
 * `recordTotpFailure` ve `actions/password.ts`'in yazdığı `diff.context`
 * değerleriyle BİREBİR aynı olmak zorunda — sapma sessizdir ve sayacı sıfıra
 * düşürür, yani hız sınırını fiilen kapatır.
 */
export const AUTH_FAILURE_CONTEXTS = {
  /** 2FA kurulumu ve kurtarma kodu yenileme — `actions/totp.ts`. */
  totpSetup: ['TOTP_SETUP_CONFIRM', 'BACKUP_CODES_REGENERATE', 'PASSKEY_KAYIT'],
  /** Şifre değiştirme — `actions/password.ts` (T-042s). */
  changePassword: ['CHANGE_PASSWORD'],
} as const;

/** Sayım için gereken asgari Prisma yüzeyi. */
export interface TotpAuditReader {
  auditLog: {
    count(args: {
      where: {
        action: 'LOGIN_FAILED';
        entity: string;
        entityId: string;
        createdAt: { gte: Date };
        OR: { diff: { path: ['context']; equals: string } }[];
      };
    }): Promise<number>;
  };
}

/**
 * Son pencerede, VERİLEN BAĞLAMLARDA kaç başarısız doğrulama yapıldı.
 *
 * `action` + `entity` + `entityId` + `createdAt` kısmı `@@index([entity,
 * entityId])` ile karşılanıyor; JSON filtresi o daraltılmış küme üzerinde
 * çalışıyor. Sorgu şekli canlı veritabanında doğrulandı (yukarıdaki ölçüm).
 *
 * `since` AYRI PARAMETRE: şifre değiştirme sayacının penceresi başarılı bir
 * değişiklikte SIFIRLANIYOR ve sıfırlama noktası `User.writesValidFrom`'dan
 * geliyor (ADR-035/B ile aynı damga — iki ayrı zaman kaynağı tutulmuyor).
 */
export async function countRecentAuthFailures(
  userId: string,
  contexts: readonly string[],
  since: Date,
  client: TotpAuditReader = db,
): Promise<number> {
  return client.auditLog.count({
    where: {
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: userId,
      createdAt: { gte: since },
      OR: contexts.map((context) => ({
        diff: { path: ['context'] as ['context'], equals: context },
      })),
    },
  });
}

/** Geriye dönük ad — 2FA kurulumu bağlamıyla sınırlı sayım. */
export async function countRecentTotpFailures(
  userId: string,
  now: Date = new Date(),
  client: TotpAuditReader = db,
): Promise<number> {
  return countRecentAuthFailures(
    userId,
    AUTH_FAILURE_CONTEXTS.totpSetup,
    rateLimitWindowStart(now),
    client,
  );
}

export async function isTotpSetupRateLimited(
  userId: string,
  now: Date = new Date(),
  client: TotpAuditReader = db,
): Promise<boolean> {
  return (await countRecentTotpFailures(userId, now, client)) >= TOTP_SETUP_RATE_LIMIT.maxFailures;
}

/**
 * ŞİFRE DEĞİŞTİRME hız sınırı — Güvenlik'in kararı (T-046/3a).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GEREKÇE BRUTE-FORCE DEĞİL — İKİSİ DE ÖLÇÜLMÜŞ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  1. KAYNAK TÜKETİMİ: §8.2 gereği argon2id bilerek pahalı. Yanlış şifre
 *     doğrulaması p50 31 ms, ~33 deneme/sn/çekirdek, her deneme 19 MiB.
 *     50 eşzamanlı istek ≈ 1 GB — tek bir oturum üretim kutusunun CPU ve
 *     belleğini doyurabilir. §8.15'in iletişim formuna sınır koyma gerekçesi
 *     birebir aynı, üstelik orada saldırgan kimliksizdi.
 *  2. YETKİ YÜKSELTME: çalınmış oturumla mevcut şifre tahmin edilirse saldırgan
 *     şifreyi değiştirip asıl sahibi kilitler.
 *
 * KULLANICI BAŞINA, IP başına değil: sayaç kimliği bilinen tek hesaba ait ve
 * `LoginAttempt`e yazmak §8.4'ün GİRİŞ kilidini tetiklerdi (T-042s kararı).
 *
 * EŞİK ÜÇÜNCÜ BİR SİHİRLİ SAYI DEĞİL: `TOTP_SETUP_RATE_LIMIT` ile aynı, o da
 * `LOGIN_RATE_LIMIT`ten geliyor. §8.4 tek yerden denetlenebilir kalsın.
 */
export const CHANGE_PASSWORD_RATE_LIMIT = TOTP_SETUP_RATE_LIMIT;

/**
 * Şifre değiştirme penceresindeki başarısız deneme sayısı.
 *
 * `resetAt` (yani `User.writesValidFrom`) verilirse pencere ONDAN başlar:
 * BAŞARILI BİR DEĞİŞİKLİK SAYACI SIFIRLAR. `AuditLog` satırları silinmiyor
 * (§8.19 — denetim kaydı kalıcıdır); sayaç onları görmezden geliyor.
 */
export async function countRecentChangePasswordFailures(
  userId: string,
  now: Date = new Date(),
  resetAt: Date | null = null,
  client: TotpAuditReader = db,
): Promise<number> {
  const pencereBasi = rateLimitWindowStart(now);
  const since = resetAt && resetAt > pencereBasi ? resetAt : pencereBasi;

  return countRecentAuthFailures(userId, AUTH_FAILURE_CONTEXTS.changePassword, since, client);
}

export async function isChangePasswordRateLimited(
  userId: string,
  now: Date = new Date(),
  resetAt: Date | null = null,
  client: TotpAuditReader = db,
): Promise<boolean> {
  return (
    (await countRecentChangePasswordFailures(userId, now, resetAt, client)) >=
    CHANGE_PASSWORD_RATE_LIMIT.maxFailures
  );
}

/* ===========================================================================
 * 2FA DURUMU VE MUTASYONLARI
 * ======================================================================== */

/** Servisin Prisma'dan ihtiyaç duyduğu asgari yüzey. */
export interface UserTotpRecord {
  id: string;
  email: string;
  totpSecret: string | null;
  totpEnabled: boolean;
  totpConfirmedAt: Date | null;
  totpBackupCodes: string[];
}

export interface UserTotpClient extends TotpAuditReader {
  user: {
    findUnique(args: { where: { id: string } }): Promise<UserTotpRecord | null>;
    update(args: {
      where: { id: string };
      data: {
        totpSecret?: string | null;
        totpEnabled?: boolean;
        totpConfirmedAt?: Date | null;
        totpBackupCodes?: string[];
      };
    }): Promise<unknown>;
  };
}

export async function findUserTotpRecord(
  userId: string,
  client: UserTotpClient = db,
): Promise<UserTotpRecord | null> {
  return client.user.findUnique({ where: { id: userId } });
}

/**
 * Ekranın açılışta gördüğü durum.
 *
 * `enabled` ölçütü `totpConfirmedAt`tır, `totpEnabled` DEĞİL: kurulum başlatılmış
 * ama doğrulanmamış bir kullanıcıda secret vardır ve bayrak yanıltıcı olabilir.
 * Giriş akışı da (T-013b) aynı ölçütü kullanıyor — iki yerde farklı ölçüt
 * kullanmak "ekranda açık, girişte kapalı" gibi bir tutarsızlık üretirdi.
 */
export async function getTotpState(
  userId: string,
  client: UserTotpClient = db,
): Promise<TotpStatus> {
  const user = await findUserTotpRecord(userId, client);
  if (!user) return { enabled: false, remainingBackupCodes: 0 };

  return {
    enabled: user.totpConfirmedAt !== null,
    remainingBackupCodes: user.totpBackupCodes.length,
  };
}

/**
 * Kurulum secret'ını saklar — `totpConfirmedAt` DOLDURULMAZ.
 *
 * Bu ayrım ADR-013'ün özü: doğrulanmamış bir secret 2FA'yı etkinleştirmez.
 * Aksi hâlde QR'ı yanlış okuyan kullanıcı, çalışmayan bir authenticator'la
 * kendi hesabından kilitlenirdi.
 */
export async function storeTotpSecret(
  userId: string,
  encryptedSecret: string,
  client: UserTotpClient = db,
): Promise<void> {
  await client.user.update({
    where: { id: userId },
    data: { totpSecret: encryptedSecret, totpEnabled: false, totpConfirmedAt: null },
  });
}

/** 2FA'yı ETKİNLEŞTİRİR — yalnızca doğrulama başarılıysa çağrılır. */
export async function enableTotp(
  userId: string,
  hashedBackupCodes: string[],
  now: Date = new Date(),
  client: UserTotpClient = db,
): Promise<void> {
  await client.user.update({
    where: { id: userId },
    data: {
      totpEnabled: true,
      totpConfirmedAt: now,
      totpBackupCodes: hashedBackupCodes,
    },
  });
}

/** Kurtarma kodlarını değiştirir — eskiler geçersizleşir (ADR-013). */
export async function replaceBackupCodes(
  userId: string,
  hashedBackupCodes: string[],
  client: UserTotpClient = db,
): Promise<void> {
  await client.user.update({
    where: { id: userId },
    data: { totpBackupCodes: hashedBackupCodes },
  });
}
