import process from 'node:process';

import { createProfileSchema } from '@/lib/schemas';
import { argon2idGibi } from '@/lib/security/argon2-bicimi';
import { hashPassword } from '@/server/auth/password';
import { closeDatabase, db } from '@/server/db';

/**
 * ÜRETİM BAŞLATMA — boş bir üretim veritabanını kullanılabilir hâle getirir
 * (T-071). `araclar` imajında, göçten SONRA bir kez:
 *
 *   node --import ./scripts/yedek-register.mjs scripts/uretim-baslat.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN `prisma/seed.ts` DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Seed geliştirme aracı (`pnpm db:seed`) ve `.env` okur;
 * bu betik `araclar` imajında ortamdan çalışır ve hash biçimini doğrular.
 *
 * Bu betik YALNIZCA iki şey yapar ve ikisi de İDEMPOTENT:
 *
 *   1. YÖNETİCİ — e-posta + şifre hash'i. Varsa ŞİFREYE DOKUNMAZ: betiği
 *      yeniden çalıştırmak panelden değiştirilmiş bir şifreyi ezmemeli.
 *      2FA boş başlar; ilk girişte kurulum zorunlu (§8.1).
 *   2. PROFİL — YALNIZCA YOKSA asgari bir satır. Ana sayfa profil satırı
 *      olmadan 500 veriyor (BULGU-013); içerik panelden doldurulur. Var olan
 *      profil ASLA ezilmez.
 *
 * §8.20: hiçbir şifre, hash ya da e-posta yazdırılmaz.
 */

function gerekli(ad: string): string {
  const deger = process.env[ad]?.trim();
  if (!deger) throw new Error(`${ad} tanımlı değil.`);
  return deger;
}

async function yonetici(): Promise<'oluşturuldu' | 'zaten vardı'> {
  const email = gerekli('ADMIN_EMAIL').toLowerCase();

  const mevcut = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (mevcut) return 'zaten vardı';

  const hazirHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const duzSifre = process.env.ADMIN_PASSWORD;
  if (!hazirHash && !duzSifre) {
    throw new Error('ADMIN_PASSWORD_HASH (önerilen) ya da ADMIN_PASSWORD tanımlı değil.');
  }

  /*
   * ⚠️ HASH BİÇİMİ DOĞRULANIYOR — T-071'de ÖLÇÜLDÜ: argon2 hash'i `$` taşıyor
   * (`$argon2id$v=19$m=…`) ve Docker Compose ortam dosyasındaki TIRNAKSIZ
   * değeri değişken sanıp parçalıyor — 92 karakter konteynere 17 olarak
   * ulaştı, HATA VERMEDEN. Bozuk hash ile oluşan yönetici HİÇ giriş yapamaz.
   * Tek tırnak ya da `$$` kaçışı değeri koruyor (README → Yayına alma). Burada
   * sessizce kayıt oluşturmak yerine nedenini söyleyerek DURUYORUZ.
   */
  if (hazirHash && !argon2idGibi(hazirHash)) {
    throw new Error(
      `ADMIN_PASSWORD_HASH bir argon2id hash'i gibi görünmüyor (${hazirHash.length} karakter). ` +
        'Ortam dosyasında değeri TEK TIRNAĞA alın ya da her `$`ı `$$` yazın — Compose `$`lı ' +
        'parçaları değişken sanıp siliyor. Yönetici OLUŞTURULMADI.',
    );
  }

  await db.user.create({
    data: {
      email,
      name: process.env.ADMIN_NAME?.trim() || 'Yönetici',
      passwordHash: hazirHash ?? (await hashPassword(duzSifre ?? '')),
      totpSecret: null,
      totpEnabled: false,
      totpConfirmedAt: null,
      totpBackupCodes: [],
    },
  });
  return 'oluşturuldu';
}

async function profil(): Promise<'oluşturuldu' | 'zaten vardı'> {
  const mevcut = await db.profile.findUnique({ where: { id: 'singleton' }, select: { id: true } });
  if (mevcut) return 'zaten vardı';

  // Şemadan geçiyor — üretimde de ham nesne yok (seed'in doğrulama ilkesi).
  const girdi = createProfileSchema.parse({ headline: 'Kişisel sayfa', bio: '', socials: {} });
  await db.profile.create({ data: { id: 'singleton', ...girdi } });
  return 'oluşturuldu';
}

try {
  const y = await yonetici();
  const p = await profil();
  process.stdout.write(`[baslat] yönetici: ${y} · profil: ${p}\n`);
} catch (error) {
  process.stderr.write(
    `[baslat] BAŞARISIZ: ${error instanceof Error ? error.message : 'bilinmeyen hata'}\n`,
  );
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
