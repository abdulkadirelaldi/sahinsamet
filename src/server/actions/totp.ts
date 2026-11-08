'use server';

import { revalidatePath } from 'next/cache';

import { totpCodeSchema } from '@/lib/schemas';
import { auth } from '@/server/auth';
import { generateBackupCodes, hashBackupCodes } from '@/server/auth/backup-codes';
import {
  buildTotpUri,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  verifyTotpToken,
} from '@/server/auth/totp';
import { db } from '@/server/db';
import { writeAuditLog } from '@/server/services/_shared';

import { currentActorId, kurulumActorId } from './_shared';
import {
  enableTotp,
  findUserTotpRecord,
  getTotpState,
  isTotpSetupRateLimited,
  replaceBackupCodes,
  storeTotpSecret,
  totpFail,
  type TotpResult,
  type TotpStatus,
} from '@/server/services/user';
import { guvenliHata } from '@/lib/security/guvenli-log';

/**
 * 2FA kurulum Server Action'ları — §7.1, §8.1, §8.6, ADR-013.
 *
 * HER EYLEM T-015 KONVANSİYONUNU İZLER:
 *   auth() → Zod → servis → AuditLog → revalidatePath
 *
 * §8.6: her eylem KENDİ `auth()` kontrolünü yapar. Middleware'e güvenilmez —
 * ara katman atlanabilir veya matcher yanlış yazılmış olabilir; yetki kontrolü
 * mutasyonun kendisinde durmalı.
 *
 * §8.20: Hiçbir eylem secret'ı, kurtarma kodunu veya hash'i LOGLAMAZ. Düz metin
 * kurtarma kodları YALNIZCA `confirmTotpSetup`/`regenerateBackupCodes` yanıtında,
 * bir kez döner.
 */

/** Panel ayarları sayfası — 2FA durumu burada gösteriliyor (§4.2). */
const SETTINGS_PATH = '/panel/ayarlar';

interface BackupCodesPayload {
  backupCodes: string[];
  remainingBackupCodes: number;
}

/**
 * Başarısız doğrulamayı denetim kaydına yazar; hız sınırı sayacı BUNU okur.
 *
 * `LOGIN_FAILED` seçildi: `AuditAction` içinde 2FA'ya özel bir değer yok ve
 * eklemek migration gerektirir. Olay özünde başarısız bir kimlik doğrulama
 * adımıdır. Ayırt edici bilgi `diff.context` alanındadır.
 */
async function recordTotpFailure(userId: string, context: string): Promise<void> {
  await writeAuditLog(
    {
      actorId: userId,
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: userId,
      diff: { context, reason: 'INVALID_TOTP' },
    },
    db,
  );
}

/**
 * Oturumdaki kullanıcı kimliği; yoksa `null` — YALNIZCA OKUMA için.
 *
 * ⚠️ BULGU-027 (T-062): bu yardımcı ADR-035/B'nin `writesRevoked` kontrolünü
 * YAPMIYOR ve T-062'ye kadar dört eylemin DÖRDÜ de onu kullanıyordu — üçü
 * YAZMA. Şifre değiştirmek eski oturumların yazmalarını iptal ediyor; iptal
 * edilmiş bir oturum yine de 2FA'yı kurabiliyor ve kurtarma kodlarını
 * yeniden üretebiliyordu. (Sömürülebilirlik düşük: yeniden üretme geçerli bir
 * TOTP kodu istiyor. Ama ADR-035'in değişmezi "iptal edilen oturum YAZAMAZ"
 * idi ve bu üç eylemde tutmuyordu.) Sebep tarih: bu dosya T-015b'de,
 * `currentActorId` ise T-046'da (ADR-035) geldi ve buraya taşınmadı.
 *
 * Yazmalar artık `currentActorId()`; okuma (`getTotpStatus`) bilerek burada
 * kalıyor — ADR-035 okumaları F6/C'ye bıraktı. Hepsini kaynaktan tarayan kapı:
 * `tests/unit/kisisel-veri-erisimi.test.ts` → eylem yetki taraması.
 */
async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/* ===========================================================================
 * 1. DURUM
 * ======================================================================== */

/**
 * Ekranın açılışta gördüğü durum.
 *
 * Mutasyon değil — `AuditLog` ve `revalidatePath` yok. Yetkisiz çağrıda
 * "kapalı" döner; hata fırlatmak sunucu bileşenini çökertirdi ve sayfa zaten
 * ara katman tarafından korunuyor (§8.5).
 */
export async function getTotpStatus(): Promise<TotpStatus> {
  const userId = await currentUserId();
  if (!userId) return { enabled: false, remainingBackupCodes: 0 };

  try {
    return await getTotpState(userId);
  } catch (error) {
    guvenliHata('[totp] durum okunamadı:', error instanceof Error ? error.message : error);
    return { enabled: false, remainingBackupCodes: 0 };
  }
}

/* ===========================================================================
 * 2. KURULUMU BAŞLAT
 * ======================================================================== */

export async function startTotpSetup(): Promise<
  TotpResult<{ secret: string; otpauthUri: string }>
> {
  const userId = await kurulumActorId();
  if (!userId) return totpFail('UNAUTHORIZED');

  try {
    const user = await findUserTotpRecord(userId);
    if (!user) return totpFail('UNAUTHORIZED');

    // Zaten etkinse yeniden kurulum secret'ı ÜRETİLMEZ: mevcut secret'ın üzerine
    // yazmak, çalışan bir authenticator'ı sessizce geçersizleştirirdi.
    if (user.totpConfirmedAt) return totpFail('ALREADY_ENABLED');

    const secret = await generateTotpSecret();

    // ADR-013 — secret DİSKTE ŞİFRELİ durur (TOTP_ENCRYPTION_KEY).
    await storeTotpSecret(userId, encryptSecret(secret));

    const otpauthUri = await buildTotpUri(secret, user.email);

    await writeAuditLog(
      {
        actorId: userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        // §8.20 — secret BURAYA YAZILMAZ. Yalnızca olayın kendisi kaydedilir.
        diff: { context: 'TOTP_SETUP_STARTED' },
      },
      db,
    );

    revalidatePath(SETTINGS_PATH);

    // Düz secret YALNIZCA bu yanıtta: kullanıcı QR okuyamazsa elle girecek.
    return { ok: true, data: { secret, otpauthUri } };
  } catch (error) {
    guvenliHata('[totp] kurulum başlatılamadı:', error instanceof Error ? error.message : error);
    return totpFail('INTERNAL_ERROR');
  }
}

/* ===========================================================================
 * 3. KURULUMU DOĞRULA VE ETKİNLEŞTİR
 * ======================================================================== */

export async function confirmTotpSetup(totpCode: string): Promise<TotpResult<BackupCodesPayload>> {
  const userId = await kurulumActorId();
  if (!userId) return totpFail('UNAUTHORIZED');

  // §8.8 — girdi Zod ile doğrulanır. Biçim hatası da geçersiz koddur.
  const parsed = totpCodeSchema.safeParse(totpCode);
  if (!parsed.success) return totpFail('INVALID_TOTP');

  try {
    if (await isTotpSetupRateLimited(userId)) return totpFail('RATE_LIMITED');

    const user = await findUserTotpRecord(userId);
    if (!user) return totpFail('UNAUTHORIZED');
    if (user.totpConfirmedAt) return totpFail('ALREADY_ENABLED');
    // Kurulum başlatılmadan doğrulama yapılamaz.
    if (!user.totpSecret) return totpFail('NOT_ENABLED');

    // T-013a/T2b — `decryptSecret` FIRLATABİLİR (kurcalanmış veya anahtar değişmiş).
    let secret: string;
    try {
      secret = decryptSecret(user.totpSecret);
    } catch (error) {
      guvenliHata('[totp] secret çözülemedi:', error instanceof Error ? error.message : error);
      return totpFail('INTERNAL_ERROR');
    }

    if (!(await verifyTotpToken(parsed.data, secret))) {
      await recordTotpFailure(userId, 'TOTP_SETUP_CONFIRM');
      /**
       * SECRET SİLİNMEZ. Yanlış kod, yanlış kurulmuş bir authenticator ya da
       * saat kayması demek olabilir; kullanıcı aynı QR ile tekrar deneyebilmeli.
       * Secret'ı temizlemek, her hatada baştan başlatmayı zorunlu kılardı.
       */
      return totpFail('INVALID_TOTP');
    }

    const backupCodes = generateBackupCodes();
    await enableTotp(userId, await hashBackupCodes(backupCodes));

    await writeAuditLog(
      {
        actorId: userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        // §8.20 — kodların kendisi DEĞİL, yalnızca sayısı.
        diff: { context: 'TOTP_ENABLED', backupCodesIssued: backupCodes.length },
      },
      db,
    );

    revalidatePath(SETTINGS_PATH);

    // ADR-013 — düz kodlar BİR DAHA ASLA dönmez; sunucuda argon2id hash'i var.
    return {
      ok: true,
      data: { backupCodes, remainingBackupCodes: backupCodes.length },
    };
  } catch (error) {
    guvenliHata('[totp] kurulum doğrulanamadı:', error instanceof Error ? error.message : error);
    return totpFail('INTERNAL_ERROR');
  }
}

/* ===========================================================================
 * 4. KURTARMA KODLARINI YENİLE
 * ======================================================================== */

/**
 * Kurtarma kodlarını yeniler — ENGEL-5.
 *
 * OPSİYONEL DEĞİL: kodlar tükendiğinde kullanıcı yalnızca TOTP'ye bağımlı kalır
 * ve telefon kaybı yine kalıcı kilitlenme demek olur — ADR-013'ün kapatmak
 * istediği durumun aynısı, ikinci kez.
 *
 * GEÇERLİ TOTP İSTER: oturumu ele geçiren biri tek tıkla yeni kurtarma kodu
 * üretip kalıcı arka kapı açamamalı. Bu, kimlik tazeliği kontrolüdür.
 */
export async function regenerateBackupCodes(
  totpCode: string,
): Promise<TotpResult<BackupCodesPayload>> {
  const userId = await currentActorId();
  if (!userId) return totpFail('UNAUTHORIZED');

  const parsed = totpCodeSchema.safeParse(totpCode);
  if (!parsed.success) return totpFail('INVALID_TOTP');

  try {
    if (await isTotpSetupRateLimited(userId)) return totpFail('RATE_LIMITED');

    const user = await findUserTotpRecord(userId);
    if (!user) return totpFail('UNAUTHORIZED');
    // Kurulmamış 2FA'nın kurtarma kodu da olmaz.
    if (!user.totpConfirmedAt || !user.totpSecret) return totpFail('NOT_ENABLED');

    let secret: string;
    try {
      secret = decryptSecret(user.totpSecret);
    } catch (error) {
      guvenliHata('[totp] secret çözülemedi:', error instanceof Error ? error.message : error);
      return totpFail('INTERNAL_ERROR');
    }

    if (!(await verifyTotpToken(parsed.data, secret))) {
      await recordTotpFailure(userId, 'BACKUP_CODES_REGENERATE');
      return totpFail('INVALID_TOTP');
    }

    const backupCodes = generateBackupCodes();
    await replaceBackupCodes(userId, await hashBackupCodes(backupCodes));

    await writeAuditLog(
      {
        actorId: userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        diff: {
          context: 'BACKUP_CODES_REGENERATED',
          previousRemaining: user.totpBackupCodes.length,
          backupCodesIssued: backupCodes.length,
        },
      },
      db,
    );

    revalidatePath(SETTINGS_PATH);

    return {
      ok: true,
      data: { backupCodes, remainingBackupCodes: backupCodes.length },
    };
  } catch (error) {
    guvenliHata(
      '[totp] kurtarma kodları yenilenemedi:',
      error instanceof Error ? error.message : error,
    );
    return totpFail('INTERNAL_ERROR');
  }
}
