import { createHash } from 'node:crypto';

import { db } from '@/server/db';
import { guvenliHata } from '@/lib/security/guvenli-log';

/**
 * `LoginAttempt` servisi — §8.4, ADR-013.
 *
 * SINIR (ADR-013): **Tablo ve servis Backend'in, POLİTİKA Güvenlik ajanının.**
 * Bu dosya yalnızca kaydı yazar ve sayar. "Kaç denemede kilitlenir", "kaç dakika
 * kilitli kalır" gibi eşikler BURADA TANIMLANMAZ — Güvenlik ajanı T-014'te
 * `src/lib/security/**` içinde bu fonksiyonların üzerine yazar.
 *
 * §8.20: Ham e-posta ASLA saklanmaz veya loglanmaz; yalnızca özeti.
 */

/** Prisma istemcisinin bu servise gereken asgari yüzeyi (test edilebilirlik için). */
export interface LoginAttemptClient {
  loginAttempt: {
    create(args: { data: { ip: string; emailHash: string; success: boolean } }): Promise<unknown>;
    count(args: {
      where: {
        success?: boolean;
        createdAt?: { gte: Date };
        ip?: string;
        emailHash?: string;
      };
    }): Promise<number>;
    deleteMany(args: { where: { createdAt: { lt: Date } } }): Promise<{ count: number }>;
  };
}

/**
 * E-postayı denetlenebilir ama geri çevrilemez bir özete indirger.
 *
 * Küçük harfe indirme ZORUNLU: aynı hesabın `A@b.com` ve `a@b.com` yazımları
 * farklı özet üretirse hız sınırı sayacı bölünür ve §8.4 fiilen atlatılabilir.
 *
 * NOT: Bu bir ŞİFRE HASH'İ DEĞİLDİR — argon2 kullanılmaz. Amaç gizlilik değil
 * bağlanabilirlik: aynı e-posta daima aynı özeti versin ki sayım yapılabilsin.
 * E-posta adres uzayı küçük olduğu için özet kaba kuvvetle çözülebilir; bu
 * yüzden `LoginAttempt` kayıtları 90 gün sonra temizlenir (ADR-013).
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase(), 'utf8').digest('hex');
}

export interface RecordLoginAttemptInput {
  ip: string;
  emailHash: string;
  success: boolean;
}

/**
 * Bir giriş denemesini kaydeder — BAŞARILI VE BAŞARISIZ (§8.4 "log").
 *
 * ASLA FIRLATMAZ. Denetim kaydı yazılamadı diye giriş akışının çökmesi, kullanıcıyı
 * hem sisteme sokmaz hem de sorunu gizler. Hata loglanır, akış devam eder.
 */
export async function recordLoginAttempt(
  input: RecordLoginAttemptInput,
  client: LoginAttemptClient = db,
): Promise<void> {
  try {
    await client.loginAttempt.create({ data: input });
  } catch (error) {
    // §8.20 — emailHash bile loglanmaz; yalnızca hatanın kendisi.
    guvenliHata(
      '[auth] giriş denemesi kaydedilemedi:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Belirli bir andan bu yana BAŞARISIZ deneme sayısı.
 *
 * T-014 bunu kullanarak "IP başına 15 dakikada 5" kuralını uygular (§8.4).
 * Eşik ve pencere BU DOSYADA TANIMLI DEĞİLDİR — çağıran belirler.
 */
export async function countRecentFailures(
  filter: { ip?: string; emailHash?: string },
  since: Date,
  client: LoginAttemptClient = db,
): Promise<number> {
  return client.loginAttempt.count({
    where: {
      success: false,
      createdAt: { gte: since },
      ...(filter.ip ? { ip: filter.ip } : {}),
      ...(filter.emailHash ? { emailHash: filter.emailHash } : {}),
    },
  });
}

/**
 * KVKK saklama sınırı (ADR-013): 90 günden eski denemeler silinir.
 * Gece cron'u çağırır (§13.5). Kaç gün saklanacağı çağıranın kararıdır.
 */
export async function purgeLoginAttemptsBefore(
  cutoff: Date,
  client: LoginAttemptClient = db,
): Promise<number> {
  const result = await client.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}
