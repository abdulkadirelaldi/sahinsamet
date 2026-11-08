import process from 'node:process';

import { createProfileSchema } from '@/lib/schemas/profile';
import { hashPassword } from '@/server/auth/password';
import { closeDatabase, db } from '@/server/db';

/**
 * Seed — ADR-013/017.
 *
 * YALNIZCA İKİ KAYIT: yönetici kullanıcı (e-posta ve şifre ortamdan) ve boş
 * bir yer tutucu profil. Kişisel veri (bio, fotoğraf, sosyal bağlantılar)
 * BURADA YOK — sahibi panelin Profil sayfasından doldurur. Profil girdisi
 * `createProfileSchema`'dan geçirilir; Prisma'ya ham nesne verilmez.
 *
 * İDEMPOTENT: her kayıt ya `upsert` ile ya da sabit `id` üzerinden yazılır.
 * İki kez çalıştırıldığında sayılar değişmez.
 *
 * §8.20: Çıktı hiçbir şifre, hash veya secret yazdırmaz.
 */

/* ===========================================================================
 * YARDIMCILAR
 * ======================================================================== */

/**
 * Seed özetini stdout'a yazar.
 *
 * `console.log` KULLANILMAZ: ESLint `no-console` kuralı yalnızca `warn`/`error`e
 * izin veriyor (§10.6 "sıfır uyarı") ve kural doğru — uygulama kodunda kalıntı
 * log istemiyoruz. Ama seed bir CLI aracıdır ve çıktısı ürünün parçasıdır;
 * `process.stdout.write` CLI'ların standart yoludur. Kuralı gevşetmek yerine
 * doğru API kullanılıyor.
 */
function print(line = ''): void {
  process.stdout.write(`${line}\n`);
}

/* ===========================================================================
 * BAĞLANTI
 * ======================================================================== */

/**
 * Bağlantı `@/server/db`'den gelir — seed KENDİ havuzunu kurmaz.
 *
 * Önceki sürüm ayarsız bir `new Pool({ connectionString })` açıyordu; `max`,
 * `idleTimeoutMillis` ve `connectionTimeoutMillis` (ADR-005) uygulanmıyordu.
 * Ortak havuzu kullanmak hem ayarları tek yerde tutar hem de seed'i F7'nin cron
 * betikleri için örnek hâline getirir: `closeDatabase()` ile kapat, `exit()` kullanma.
 *
 * `.env` ortak modül OKUNMADAN önce yüklenmeli — `db` tembel olduğu için ilk
 * gerçek erişime kadar `DATABASE_URL`'e bakılmaz, ama sırayı garantiye alıyoruz.
 */
if (!process.env.DATABASE_URL) {
  process.loadEnvFile?.('.env');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL tanımlı değil. .env dosyasını kontrol edin.');
}

/* ===========================================================================
 * 1. YÖNETİCİ KULLANICI — §8.2, ADR-013
 * ======================================================================== */

/** Panelde görünen ad — `ADMIN_NAME` yoksa site sahibinin adı. */
function adminName(): string {
  return process.env.ADMIN_NAME?.trim() || 'Samet Şahin';
}

async function seedAdmin(): Promise<string> {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    throw new Error('ADMIN_EMAIL tanımlı değil (§12). .env dosyasına ekleyin.');
  }

  /**
   * Şifre KODA GÖMÜLMEZ. İki kaynak desteklenir:
   *   1. `ADMIN_PASSWORD_HASH` (§12) — zaten argon2id hash'i, doğrudan kullanılır.
   *      Tercih edilen yol: düz şifre hiçbir yerde bulunmaz.
   *   2. `ADMIN_PASSWORD` — yalnızca ilk kurulum kolaylığı için; `hashPassword`
   *      (T-013a) ile hash'lenir ve düz hâli asla yazdırılmaz/saklanmaz.
   */
  const providedHash = process.env.ADMIN_PASSWORD_HASH;
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!providedHash && !plainPassword) {
    throw new Error(
      'Yönetici şifresi yok. ADMIN_PASSWORD_HASH (önerilen) veya ADMIN_PASSWORD tanımlayın.',
    );
  }

  const passwordHash = providedHash ?? (await hashPassword(plainPassword ?? ''));

  const user = await db.user.upsert({
    where: { email: email.trim().toLowerCase() },
    update: { name: adminName() },
    create: {
      email: email.trim().toLowerCase(),
      name: adminName(),
      passwordHash,
      /**
       * `totpConfirmedAt` BOŞ bırakılır (bilinçli, T-013b'de onaylandı):
       * ilk giriş 2FA istemez, kurulum panelden yapılır (T-036). Aksi hâlde
       * seed'in ürettiği bir secret'ı kullanıcıya güvenli biçimde ulaştırmak
       * gerekirdi — §8.20 ile çelişirdi.
       */
      totpSecret: null,
      totpEnabled: false,
      totpConfirmedAt: null,
      totpBackupCodes: [],
    },
  });

  return user.id;
}

/* ===========================================================================
 * 2. YER TUTUCU PROFİL — ADR-017
 * ======================================================================== */

/**
 * Tekil profil, sabit kimlik. VAR OLAN PROFİLE DOKUNULMAZ (`update: {}`):
 * seed yayındaki bir sunucuda yeniden çalıştırılırsa sahibinin panelden
 * yazdığı tanıtım silinmesin.
 */
async function seedProfile(): Promise<void> {
  const input = createProfileSchema.parse({
    headline: 'Kişisel sayfa',
    bio: '',
    socials: {},
  });

  await db.profile.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', ...input },
  });
}

/* ===========================================================================
 * ÇALIŞTIR
 * ======================================================================== */

async function main(): Promise<void> {
  print('Seed başlıyor…\n');

  await seedAdmin();
  await seedProfile();

  // §8.20 — hiçbir şifre, hash veya secret yazdırılmaz.
  print('Oluşturulan kayıtlar:');
  print('  Kullanıcı   1 (2FA kurulumu panelden yapılacak)');
  print('  Profil      1 (yer tutucu — panel → Profil)');
  print('\nSeed tamamlandı.');
}

try {
  await main();
} finally {
  // BULGU-007 — `$disconnect()` TEK BAŞINA YETMEZ; `pg` havuzunu bu kapatır.
  // `process.exit()` kullanılmaz: semptomu gizler, kaynağı bırakmaz.
  await closeDatabase();
}
