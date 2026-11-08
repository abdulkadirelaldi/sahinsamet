import type { ChangePasswordInput } from '@/lib/schemas';
import { db } from '@/server/db';

import { isChangePasswordRateLimited, type TotpAuditReader } from '@/server/services/user';

import { verifyTotpWithRecovery, type TotpConsumerClient } from './credentials';
import { hashPassword, verifyPassword } from './password';

/**
 * Şifre değiştirme — §8.1'in eksik kalan yarısı (T-042s, Q8).
 *
 * F1'de kripto primitifleri (`hashPassword`/`verifyPassword`/`needsRehash`) ve
 * 2FA yazıldı ama şifreyi DEĞİŞTİRMENİN hiçbir yolu yoktu; şifre yalnızca seed
 * ile konuyordu.
 *
 * Bu modül `AuditLog` YAZMAZ ve oturuma dokunmaz — ikisi de action'ın işi
 * (§7.1). Servis yalnızca doğrular ve yazar.
 *
 * §8.20: Buradaki hiçbir satır şifreyi, hash'i veya parçasını LOGLAMAZ.
 */

/** Akışın Prisma'dan ihtiyaç duyduğu asgari kullanıcı alanları. */
export interface ChangePasswordUserRecord {
  id: string;
  passwordHash: string;
  totpSecret: string | null;
  /** `null` = 2FA kurulumu tamamlanmamış (ADR-013). İkinci faktör kararı buna bakar. */
  totpConfirmedAt: Date | null;
  totpBackupCodes: string[];
  /**
   * ADR-035/B damgası. İKİ İŞ BİRDEN görüyor ve bu kasıtlı:
   *   1. Yazma kapısının eşiği (`write-gate.ts`).
   *   2. Hız sınırı penceresinin SIFIRLAMA noktası — başarılı bir değişiklik
   *      sayacı temizler. İkinci bir "son başarılı değişiklik" sütunu açmak,
   *      aynı anı iki yerde tutup sapmalarına izin vermek olurdu.
   */
  writesValidFrom: Date | null;
}

export interface ChangePasswordClient extends TotpConsumerClient, TotpAuditReader {
  passkey: { deleteMany(args: { where: { userId: string } }): Promise<{ count: number }> };
  user: TotpConsumerClient['user'] & {
    findUnique(args: { where: { id: string } }): Promise<ChangePasswordUserRecord | null>;
    update(args: {
      where: { id: string };
      data: { passwordHash?: string; totpBackupCodes?: string[]; writesValidFrom?: Date };
    }): Promise<unknown>;
  };
}

/**
 * Başarısızlık sebepleri.
 *
 * Action bunları §7.2 zarfına çevirir. Servis HTTP kodu ya da kullanıcı metni
 * bilmez — o eşleme sunum kararıdır ve tek yerde (`actions/password.ts`) durur.
 */
export type ChangePasswordFailure =
  /** Oturum var ama kullanıcı kaydı yok (silinmiş hesap). */
  | 'USER_NOT_FOUND'
  | 'INVALID_CURRENT_PASSWORD'
  /** Hesapta 2FA kurulu ve kod gönderilmemiş. */
  | 'TOTP_REQUIRED'
  | 'INVALID_TOTP'
  /** Yeni şifre saklanan hash'le eşleşiyor — yani değişen bir şey yok. */
  | 'SAME_PASSWORD'
  /** §8.4 kalıbı, T-046/3a — kullanıcı başına 5/15 dk. */
  | 'RATE_LIMITED';

export type ChangePasswordResult = { ok: true } | { ok: false; reason: ChangePasswordFailure };

/**
 * Şifreyi değiştirir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SIRA ÖNEMLİ — ÖNCE KİMLİK, SONRA İKİNCİ FAKTÖR, EN SON YAZMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. MEVCUT ŞİFRE (§8.4 gerekçesi): oturumu ele geçiren biri şifreyi
 *    değiştirip KALICI erişim kuramamalı. Oturum çerezi 24 saat geçerli
 *    (§8.3, ADR-035/A ile 7 günden indirildi), yani "zaten giriş yapmış" olmak
 *    taze bir kimlik kanıtı değildir.
 *
 * 2. İKİNCİ FAKTÖR — bkz. aşağıdaki blok.
 *
 * 3. YENİ ŞİFRE ESKİSİYLE AYNI OLAMAZ, ve bu SAKLANAN HASH'e karşı ölçülür.
 *    Şemada da bir karşılaştırma var (`currentPassword !== newPassword`) ama o
 *    istemcide de koşan bir KOLAYLIK; sunucu istemcide koşan bir kurala
 *    güvenemez. Buradaki kontrol yetkilidir.
 *
 * Kurtarma kodu TÜKETİLİR (`verifyTotpWithRecovery` yapıyor) — şifre değiştirme
 * de tıpkı giriş gibi kodu harcar, yoksa kalıcı bir arka kapıya dönüşürdü.
 */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  client: ChangePasswordClient = db,
  now: Date = new Date(),
): Promise<ChangePasswordResult> {
  const user = await client.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, reason: 'USER_NOT_FOUND' };

  /*
   * ⚠️ HIZ SINIRI ARGON2'DEN **ÖNCE** — sıranın kendisi korumanın yarısı.
   *
   * Gerekçe kaynak tüketimi (T-046/3a): her yanlış şifre doğrulaması p50 31 ms
   * CPU ve 19 MiB bellek harcıyor. Kontrol doğrulamadan SONRA yapılsaydı sınır
   * aşılmış olsa bile maliyet zaten ödenmiş olurdu — yani sınır saldırıyı
   * saymış ama engellememiş olurdu.
   *
   * Pencere `writesValidFrom`tan başlıyor: son BAŞARILI değişiklikten önceki
   * denemeler sayılmıyor.
   */
  if (await isChangePasswordRateLimited(userId, now, user.writesValidFrom, client)) {
    return { ok: false, reason: 'RATE_LIMITED' };
  }

  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    return { ok: false, reason: 'INVALID_CURRENT_PASSWORD' };
  }

  /*
   * ═══════════════════════════════════════════════════════════════════════
   * İKİNCİ FAKTÖR İSTENİYOR — AMA YALNIZCA KURULUYSA
   * ═══════════════════════════════════════════════════════════════════════
   *
   * KARAR: 2FA kodu İSTENİR. Gerekçe tehdit modelinden çıkıyor, "§8.1 zorunlu
   * kıldı" gibi bir otoriteden değil:
   *
   *   Oturum çalınmış, şifre bilinmiyor  → mevcut şifre şartı zaten durduruyor;
   *                                        2FA burada bir şey eklemiyor.
   *   Oturum ÇALINMIŞ VE şifre SIZMIŞ    → mevcut şifre şartı GEÇİLİR. Geriye
   *                                        kalan tek engel ikinci faktördür.
   *
   * İkinci senaryo bileşik ama gerçek: çerez hırsızlığı (XSS) ile şifre
   * sızıntısı (yeniden kullanım, oltalama) bağımsız olaylardır. Ve "kullanıcı
   * zaten 2FA ile giriş yaptı" savunması burada zayıf, çünkü o giriş BİR GÜN
   * ÖNCE olmuş olabilir (§8.3; ADR-035/A pencereyi 7 günden 24 saate indirdi —
   * daralttı ama KAPATMADI). Kimlik bilgisini değiştiren bir işlemde cihaz
   * sahipliğini O AN yeniden kanıtlatmak standart adım-yükseltme (step-up)
   * pratiğidir ve maliyeti tek bir kod girişidir.
   *
   * KURULU DEĞİLSE İSTENMEZ: `totpConfirmedAt` boşken kod şart koşmak, 2FA
   * kurulumunu henüz bitirmemiş kullanıcıyı şifresini DEĞİŞTİREMEZ hâle
   * getirirdi — üstelik §8.1 gereği panel zaten kurulum ekranına yönlendiriyor,
   * yani bu dal pratikte yalnızca kurulum penceresinde görülür. Olmayan bir
   * faktörü istemek, güvenlik eklemeden kilitlenme üretirdi.
   *
   * TELEFONUNU KAYBEDENİN YOLU AÇIK: `verifyTotpWithRecovery` kurtarma kodunu
   * da kabul ediyor (ADR-013), yani kod şartı kullanıcıyı hesabından etmiyor.
   */
  // Kurtarma kodu tüketilmeden önce: hiçbir şey değiştirmeyecek istek kodu harcamasın.
  if (await verifyPassword(user.passwordHash, input.newPassword)) {
    return { ok: false, reason: 'SAME_PASSWORD' };
  }

  if (user.totpConfirmedAt) {
    if (!input.totpCode) return { ok: false, reason: 'TOTP_REQUIRED' };
    if (!(await verifyTotpWithRecovery(user, input.totpCode, client, now, false))) {
      return { ok: false, reason: 'INVALID_TOTP' };
    }
  }

  /*
   * ADR-035/B — ŞİFRE VE DAMGA BİRLİKTE YAZILIYOR.
   *
   * Ayrı iki `update` olsaydı araya düşen bir hata şifreyi değiştirip damgayı
   * atlayabilirdi: kullanıcı şifresini değiştirmiş sanır, ama çalınmış oturum
   * yazmaya devam eder. Tek `update` bu ikisini ayrılamaz kılıyor.
   *
   * DAMGA KENDİ OTURUMUNU DA KAPSIYOR ve bu bir özellik: şifreyi SALDIRGAN
   * değiştirse bile kendi yazma yetkisini kaybeder ve yeniden giriş yapmak
   * zorunda kalır — bunun için yeni şifreye VE TOTP cihazına ihtiyacı vardır.
   * Kullanıcıya söylenecek cümle bunu açıkça söylemeli (ADR-035).
   */
  await client.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      writesValidFrom: now,
    },
  });

  // Şifre genelde bir şüphe üzerine değişir. Saldırganın eklemiş olabileceği Face ID şifreyi ve
  // kodu atlar; bu yüzden kayıtlı passkey'ler silinir, sahibi yeniden ekler.
  await client.passkey.deleteMany({ where: { userId } });

  return { ok: true };
}
