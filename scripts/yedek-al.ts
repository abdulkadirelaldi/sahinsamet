import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { deleteObjectQuietly, presignUrl, readR2Config } from '@/server/storage/r2';
import {
  gunDizesi,
  libpqUrl,
  SAKLAMA_GUNU,
  silinecekKeyler,
  yedekAnahtari,
  yedekKeyi,
  yedekSifrele,
} from './yedek-ortak';

/**
 * YEDEK AL — `pg_dump` → AES-256-GCM → R2 (T-066, §8.21).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KOŞTURMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   set -a; . ./.env; set +a
 *   node scripts/yedek-al.ts
 *
 * Ortam değişkenleri betik tarafından OKUNMUYOR, DIŞARIDAN bekleniyor ve
 * eksikse adıyla söyleniyor. `.env` ayrıştırıcısı yazmadım: üçüncü bir
 * ayrıştırıcı kopyası (Next kendi okuyor, Prisma kendi okuyor) sessizce
 * ayrışabilen bir şey olurdu ve yedek yolunda sessiz sapma en pahalı sınıf.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN YENİ BAĞIMLILIK YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * R2'ye yazmak için `@aws-sdk/client-s3` eklemek en kolay yoldu ve
 * GEREKMEDİ: `src/server/storage/r2.ts` (T-037, Backend) SigV4 imzasını
 * `node:crypto` ile zaten kuruyor ve imzalı PUT adresi üretiyor. Yedek yolu
 * onu TÜKETİYOR — imza mantığının ikinci bir kopyası yazılmadı.
 *
 * O dosya yalnızca `node:crypto` içe aktardığı için bu betik hiçbir takma ad
 * çözücüsüne ihtiyaç duymuyor; Node 22 tipleri yerel olarak sıyırıyor. Yani
 * yedekleme yolu, çalışması için derleme adımı ya da yükleyici GEREKTİRMEYEN
 * tek parça — panik anında önemli olan tam bu.
 *
 * ⚠️ KOVA AYRI: `readR2Config` `R2_BUCKET` istiyor, yedek ise
 * `BACKUP_R2_BUCKET`e yazıyor. Yapılandırma okuyucusu yeniden yazılmadı,
 * yalnızca kova DEĞİŞTİRİLDİ — doğrulama ve hata mesajları paylaşılıyor.
 */

const execFileAsync = promisify(execFile);

/** `pg_dump` çıktı biçimi: `-Fc` sıkıştırılmış ve `pg_restore` ile seçmeli. */
const DUMP_ARGS = ['-Fc', '--no-owner', '--no-privileges'];

function veritabaniUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL tanımsız. `set -a; . ./.env; set +a` ile yükle.');
  }
  return url;
}

function yedekKovasi(): ReturnType<typeof readR2Config> {
  const kova = process.env.BACKUP_R2_BUCKET;
  if (!kova) {
    throw new Error('BACKUP_R2_BUCKET tanımsız. .env dosyasını kontrol edin.');
  }
  // Doğrulama ve hata biçimi `readR2Config`ten geliyor; yalnızca kova farklı.
  return readR2Config({ ...process.env, R2_BUCKET: kova });
}

/** `pg_dump` çalıştırır ve çıktıyı bayt olarak döner. */
export async function dumpAl(url: string, hedefDosya: string): Promise<Buffer> {
  await execFileAsync('pg_dump', [...DUMP_ARGS, '-f', hedefDosya, libpqUrl(url)], {
    // Büyük veritabanında stdout tamponu sorun olmasın diye dosyaya yazılıyor.
    maxBuffer: 1024 * 1024,
  });
  return readFile(hedefDosya);
}

/** İmzalı PUT ile R2'ye yazar. */
export async function r2yeYaz(key: string, govde: Buffer): Promise<void> {
  const config = yedekKovasi();
  const url = presignUrl({ key, method: 'PUT', expiresIn: 600 }, config);

  const yanit = await fetch(url, {
    method: 'PUT',
    body: new Uint8Array(govde),
    headers: { 'content-type': 'application/octet-stream' },
  });

  if (!yanit.ok) {
    throw new Error(`R2 yazma başarısız: HTTP ${yanit.status} ${yanit.statusText}`);
  }
}

async function main(): Promise<void> {
  const bugun = new Date();
  const gun = gunDizesi(bugun);
  const key = yedekKeyi(gun);

  const anahtar = yedekAnahtari();
  const url = veritabaniUrl();

  const gecici = await mkdtemp(join(tmpdir(), 'sahinsamet-yedek-'));
  const dumpYolu = join(gecici, 'dump.bin');

  try {
    const duz = await dumpAl(url, dumpYolu);
    const sifreli = yedekSifrele(duz, anahtar);

    await r2yeYaz(key, sifreli);

    /*
     * Saklama: yaşı dolan PENCEREYİ sil. Listeleme yok — gerekçe
     * `yedek-ortak.ts` → `silinecekKeyler`.
     */
    /*
     * ⚠️ KOVA AÇIKÇA GEÇİLİYOR. İlk kurulumda `deleteObjectQuietly(eski, {})`
     * yazmıştım ve bu bir KUSURDU: boş bağımlılık nesnesi `readR2Config()`
     * varsayılanını kullanır, yani YÜKLEME kovasına (`R2_BUCKET`) DELETE
     * atardı. Budama, yedekleri değil kapak görsellerini silmeye çalışırdı —
     * ve `deleteObjectQuietly` bilerek fırlatmadığı için SESSİZCE.
     */
    const config = yedekKovasi();
    const budanacak = silinecekKeyler(bugun);
    let kabulEdilen = 0;
    for (const eski of budanacak) {
      const oldu = await deleteObjectQuietly(eski, { config }).catch(() => false);
      if (oldu) kabulEdilen++;
    }

    /*
     * ⚠️ ÇIKTI ÖLÇÜM BİLDİRİR, "başarılı" DEMEZ. Boyutlar raporlanıyor çünkü
     * bir yedeğin ANLAMLI olup olmadığına dair en ucuz işaret boyutudur:
     * birkaç yüz baytlık bir "yedek", boş bir veritabanının dump'ıdır ve
     * EXIT 0 ile yazılır. İzleme (§13.7) bu sayıya bakabilir.
     */
    /*
     * ⚠️ "SİLİNEN" DEMİYOR, "SİLME GÖNDERİLDİ" DİYOR — ve bu bir düzeltme.
     *
     * İlk kurulum `silinen: ${n}` yazıyordu ve İLK KOŞUMDA, kova bomboşken,
     * "7 eski nesne silindi" dedi. Sebep: R2/S3'te var OLMAYAN bir anahtara
     * DELETE başarı döner (idempotent silme), yani `deleteObjectQuietly`nin
     * `true`su "nesne vardı ve gitti" DEMİYOR — "istek kabul edildi" diyor.
     *
     * Bu, T-107b'de teardown'da bulduğum kusurun AYNISI: eylemi sayıp durumu
     * ölçtüğünü sanmak. Orada "silinen" ile "kalan"ı ayırmıştım; burada da
     * çıktı artık ölçtüğü şeyi söylüyor.
     *
     * Gerçekten silinip silinmediğini saymak 7 ek HEAD isteği gerektirir ve
     * o sayının bir karşılığı yok: budamanın amacı saymak değil, birikimi
     * önlemek. Sayı yerine NİYET raporlanıyor.
     */
    process.stdout.write(
      `[yedek] ${key}\n` +
        `  dump: ${duz.length} bayt · şifreli: ${sifreli.length} bayt ` +
        `(+${sifreli.length - duz.length} başlık)\n` +
        `  saklama: ${SAKLAMA_GUNU} gün · budama: ${budanacak.length} anahtara ` +
        `silme gönderildi, ${kabulEdilen} kabul edildi ` +
        `(R2 olmayan anahtarı da kabul eder — sayı "silindi" demez)\n`,
    );
  } finally {
    // Geçici dizin HER DURUMDA siliniyor: çözülmüş bir dump diskte kalmamalı.
    await rm(gecici, { recursive: true, force: true });
  }
}

// Doğrudan koşturulduğunda çalış; içe aktarıldığında (test) çalışmasın.
if (process.argv[1]?.endsWith('yedek-al.ts')) {
  main().catch((hata: unknown) => {
    // §8.20 — mesajda değer yok; `yedek-ortak.ts` hataları zaten ada göre yazıyor.
    process.stderr.write(`[yedek] BAŞARISIZ: ${hata instanceof Error ? hata.message : hata}\n`);
    process.exitCode = 1;
  });
}

export { main };
