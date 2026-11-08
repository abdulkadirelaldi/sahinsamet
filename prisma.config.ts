import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 yapılandırması (risk R8).
 *
 * İki kırıcı değişikliği birden karşılar:
 *
 * 1. `datasource` bloğundaki `url` Prisma 7'de kaldırıldı. Migrate ve introspect
 *    komutlarının kullandığı bağlantı dizesi ARTIK BURADA yaşıyor. Bu dosya
 *    olmadan `prisma migrate` / `prisma db push` hiç çalışmaz.
 *
 * 2. Prisma 7 CLI `.env` dosyasını KENDİLİĞİNDEN YÜKLEMİYOR (v6 yüklüyordu).
 *    Aşağıdaki `process.loadEnvFile()` bunu telafi eder — Node 20.12+ ile gelen
 *    yerleşik API, ek bağımlılık gerektirmez (ADR-004).
 *
 * Bu dosya YALNIZCA Prisma CLI tarafından okunur; uygulama çalışma zamanında
 * kullanılmaz. Çalışma zamanı bağlantısı `src/server/db.ts` üzerinden kurulur.
 *
 * Konum: proje kökü zorunludur — CLI burayı arar, `prisma/` altına taşınamaz.
 */

// Üretimde/CI'da değişkenler zaten ortamdan gelir; .env yoksa sessizce geç.
const envPath = path.join(process.cwd(), '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

/**
 * `datasource` BİLEREK koşullu.
 *
 * `prisma generate` veritabanına hiç bağlanmaz — yalnızca şemadan kod üretir.
 * Buna rağmen `env('DATABASE_URL')` yardımcısı config yüklenirken değişkeni
 * ZORUNLU kılar ve yoksa `PrismaConfigEnvError` fırlatır. ADR-006 ile eklenen
 * `postinstall: prisma generate` yüzünden bu, `.env` bulunmayan her ortamda
 * (CI, Docker build katmanı, taze klon) doğrudan `pnpm install`'ı düşürürdü.
 * Ölçüldü: `.env` kaldırılınca `pnpm install` ELIFECYCLE ile çöküyordu.
 *
 * Bu yüzden URL yalnızca tanımlıysa aktarılır. `migrate` / `db push` gibi
 * gerçekten bağlantı isteyen komutlar, değişken yoksa zaten kendi anlaşılır
 * hatasını verir.
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',

  // §12 — .env'den okunur, repoya asla girmez (§8.17).
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),

  migrations: {
    path: 'prisma/migrations',
    /**
     * `prisma migrate dev/reset` sonrası çalıştırılacak komut.
     *
     * PRISMA 7 FARKI: seed komutu artık `package.json` içindeki `prisma.seed`
     * alanında DEĞİL, burada tanımlanır. Eski yere yazılsaydı sessizce yok
     * sayılırdı — `pnpm db:seed` yine çalışırdı ama `migrate reset` seed'i
     * atlardı ve fark ancak veritabanı boş kalınca anlaşılırdı.
     */
    seed: 'node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./prisma/seed-register.mjs prisma/seed.ts',
  },
});
