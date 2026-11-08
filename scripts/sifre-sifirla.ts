import process from 'node:process';

import { passwordSchema } from '@/lib/schemas/user';
import { hashPassword } from '@/server/auth/password';
import { closeDatabase, db } from '@/server/db';

/**
 * PANEL ŞİFRESİNİ SIFIRLA — sunucuda, SİTE SAHİBİ çalıştırır (2026-10-28).
 *
 *   ssh "$SUNUCU"
 *   cd /opt/sahinsamet
 *   read -rsp "Yeni şifre: " ADMIN_PASSWORD; echo
 *   docker compose exec -T -e ADMIN_PASSWORD="$ADMIN_PASSWORD" araclar \
 *     node --import ./scripts/yedek-register.mjs scripts/sifre-sifirla.ts
 *   unset ADMIN_PASSWORD
 *
 * NEDEN AYRI BETİK: `uretim-baslat.ts` var olan yöneticinin şifresine BİLEREK
 * dokunmuyor (yeniden çalıştırmak panelden değiştirilmiş şifreyi ezmemeli).
 * Panelin şifre değiştirme ekranı ise mevcut şifreyi istiyor — unutulmuş
 * şifrenin tek yolu sunucuya erişimdir, yani bu betik.
 *
 * NE YAPAR: `ADMIN_EMAIL`deki yöneticinin şifresini değiştirir (§8.2 kuralı:
 * 12–128 karakter), oturumları geçersiz kılar (`writesValidFrom`, ADR-035/B —
 * panelin kendi şifre değiştirmesiyle aynı) ve hesap kilidini kaldırır.
 *
 * `--2fa-sifirla`: doğrulama uygulaması VE kurtarma kodları da kaybolduysa.
 * TOTP sırrı ve kurtarma kodları silinir; ilk girişte kurulum yeniden zorunlu
 * (§8.1). Bayraksız çalıştırmada 2FA KORUNUR.
 *
 * §8.20: hiçbir şifre, hash ya da e-posta yazdırılmaz.
 */

function gerekli(ad: string): string {
  const deger = process.env[ad]?.trim();
  if (!deger) throw new Error(`${ad} tanımlı değil.`);
  return deger;
}

async function sifirla(ikiAdimiSifirla: boolean): Promise<void> {
  const email = gerekli('ADMIN_EMAIL').toLowerCase();
  const sonuc = passwordSchema.safeParse(process.env.ADMIN_PASSWORD ?? '');
  if (!sonuc.success) {
    throw new Error(sonuc.error.issues[0]?.message ?? 'Şifre geçersiz.');
  }

  const kullanici = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!kullanici) throw new Error('ADMIN_EMAIL ile eşleşen yönetici yok.');

  await db.user.update({
    where: { id: kullanici.id },
    data: {
      passwordHash: await hashPassword(sonuc.data),
      writesValidFrom: new Date(),
      lockedUntil: null,
      ...(ikiAdimiSifirla && {
        totpSecret: null,
        totpEnabled: false,
        totpConfirmedAt: null,
        totpBackupCodes: [],
      }),
    },
  });
}

const ikiAdimiSifirla = process.argv.includes('--2fa-sifirla');
try {
  await sifirla(ikiAdimiSifirla);
  process.stdout.write(
    `[sifirla] şifre güncellendi · oturumlar kapatıldı · 2FA: ${ikiAdimiSifirla ? 'sıfırlandı (ilk girişte yeniden kurulacak)' : 'korundu'}\n`,
  );
} catch (error) {
  process.stderr.write(
    `[sifirla] BAŞARISIZ: ${error instanceof Error ? error.message : 'bilinmeyen hata'}\n`,
  );
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
