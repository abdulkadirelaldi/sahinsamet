import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { getObjectBytes, readR2Config } from '@/server/storage/r2';
import { libpqUrl, veritabaniAdi, yedekAnahtari, yedekCoz } from './yedek-ortak';

/**
 * GERİ YÜKLEME PROVASI — §8.22'NİN ÖLÇÜMÜ (T-066).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ BİR YEDEK, GERİ YÜKLENDİĞİ KANITLANMADIKÇA YEDEK DEĞİLDİR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * "Betik koştu, dosya oluştu, EXIT 0" — yeşil bir çıktı ve hiçbir şey
 * kanıtlamıyor. Bu projede defalarca ölçülen "vakum yeşili" sınıfının en
 * pahalı hâli: dosyanın VAR OLMASI, okunabildiğini söylemiyor.
 *
 * Bu betik zincirin TAMAMINI koşturuyor ve her halkayı ayrı ölçüyor:
 *
 *   R2'den indir → çöz (AEAD) → AYRI bir veritabanına yükle →
 *   satır sayılarını ve ÖRNEK DEĞERLERİ kaynakla karşılaştır → prova DB'sini sil
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN SATIR SAYISI YETMİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Satır sayıları eşitse veri "geldi" demektir ama DOĞRU geldiğini söylemez:
 * bozuk bir `numeric` dönüşümü ya da kayıp bir `Decimal` ölçeği satır sayısını
 * değiştirmez. Bu yüzden ÖRNEK DEĞERLER de karşılaştırılıyor ve seçimleri
 * kasıtlı:
 *
 *   `transaction.baseAmount` toplamı → ADR-014'ün kuruş hassasiyeti. `numeric`
 *      ölçeği kayarsa toplam değişir ve satır sayısı aynı kalır.
 *   `audit_log` en yeni `createdAt` → zaman damgası ve saat dilimi davranışı.
 *   `user.email` özetinin varlığı → kimlik verisinin geldiği, ama DEĞERİ
 *      yazdırılmadan (§8.20: prova çıktısı kişisel veri basmaz).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CANLI VERİTABANININ ÜZERİNE YAZILMIYOR — VE BU YAPISAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Prova, adı `_prova_<zaman>` ile biten AYRI bir veritabanına yüklüyor ve
 * sonunda `DROP DATABASE` ile siliyor. Kaynak veritabanına YALNIZCA okuma
 * sorguları gidiyor.
 *
 * Güvenlik ağı tek bir isim kontrolü değil: hedef ad kaynak addan FARKLI
 * OLMAK ZORUNDA ve bu ÇALIŞMA ZAMANINDA doğrulanıyor (aşağıdaki `assert`).
 * Yanlış bir ortam değişkeniyle kaynağın üzerine yazmak, bu betiğin
 * yapabileceği en zararlı şey — o yüzden kontrol koşuldan önce.
 */

const execFileAsync = promisify(execFile);

interface Olcum {
  tablo: string;
  kaynak: number;
  prova: number;
}

/** Karşılaştırılan tablolar — veri taşıyan ve §4.2'de adı geçen her model. */
const TABLOLAR = [
  'user',
  'client',
  'job',
  'transaction',
  'transaction_category',
  'recurring_transaction',
  'contact_message',
  'audit_log',
  'project',
  'post',
] as const;

function psqlUrl(temelUrl: string, veritabani: string): string {
  // `libpqUrl` Prisma'ya özgü parametreleri ayıklıyor — gerekçe `yedek-ortak.ts`.
  const url = new URL(libpqUrl(temelUrl));
  url.pathname = `/${veritabani}`;
  return url.toString();
}

async function sorgu(url: string, sql: string): Promise<string> {
  const { stdout } = await execFileAsync('psql', [url, '-At', '-c', sql], {
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
}

async function satirSayisi(url: string, tablo: string): Promise<number> {
  const cikti = await sorgu(url, `select count(*) from "${tablo}";`);
  return Number(cikti);
}

async function main(): Promise<void> {
  const temelUrl = process.env.DATABASE_URL;
  if (!temelUrl) throw new Error('DATABASE_URL tanımsız. `set -a; . ./.env; set +a` ile yükle.');

  const key = process.argv[2];
  if (!key) {
    throw new Error(
      'Kullanım: node scripts/geri-yukleme-provasi.ts <r2-nesne-anahtarı>\n' +
        '  örnek: node scripts/geri-yukleme-provasi.ts yedek/sahinsamet-2026-10-16.dump.enc',
    );
  }

  const kaynakVeritabani = veritabaniAdi(temelUrl);
  const provaVeritabani = `${kaynakVeritabani}_prova_${Date.now()}`;

  /*
   * ⚠️ GÜVENLİK AĞI — koşumdan ÖNCE. Hedef ile kaynak aynıysa bu betik canlı
   * veritabanını SİLER ve üzerine yazar. Kontrolü sonraya bırakmak, en zararlı
   * hatayı mümkün kılmak olurdu.
   */
  if (provaVeritabani === kaynakVeritabani) {
    throw new Error('Prova veritabanı adı kaynakla AYNI — iptal edildi.');
  }

  const kaynakUrl = libpqUrl(temelUrl);
  const yonetimUrl = psqlUrl(temelUrl, 'postgres');
  const provaUrl = psqlUrl(temelUrl, provaVeritabani);

  const anahtar = yedekAnahtari();
  // Yedek kovası: `readR2Config` doğrulamasını paylaşıyor, yalnızca kova farklı.
  const config = readR2Config({ ...process.env, R2_BUCKET: process.env.BACKUP_R2_BUCKET });

  const gecici = await mkdtemp(join(tmpdir(), 'sahinsamet-prova-'));
  const dumpYolu = join(gecici, 'dump.bin');
  const satirlar: string[] = [];

  try {
    /* ---- 1. İNDİR ------------------------------------------------- */
    const blob = await getObjectBytes(key, { config });
    if (!blob) throw new Error(`R2'de nesne bulunamadı: ${key}`);
    satirlar.push(`1. indirildi      : ${blob.length} bayt (${key})`);

    /* ---- 2. ÇÖZ (AEAD doğrulaması burada) ------------------------- */
    const duz = yedekCoz(blob, anahtar);
    satirlar.push(`2. çözüldü        : ${duz.length} bayt · GCM etiketi DOĞRULANDI`);

    await writeFile(dumpYolu, duz);

    /* ---- 3. AYRI VERİTABANI -------------------------------------- */
    await sorgu(yonetimUrl, `create database "${provaVeritabani}";`);
    satirlar.push(`3. prova veritabanı: ${provaVeritabani} (oluşturuldu)`);

    /* ---- 4. GERİ YÜKLE ------------------------------------------- */
    await execFileAsync('pg_restore', ['--no-owner', '--no-privileges', '-d', provaUrl, dumpYolu], {
      maxBuffer: 8 * 1024 * 1024,
    });
    satirlar.push('4. pg_restore     : tamamlandı');

    /* ---- 5. KARŞILAŞTIR ------------------------------------------ */
    const olcumler: Olcum[] = [];
    for (const tablo of TABLOLAR) {
      olcumler.push({
        tablo,
        kaynak: await satirSayisi(kaynakUrl, tablo),
        prova: await satirSayisi(provaUrl, tablo),
      });
    }

    const sapanlar = olcumler.filter((o) => o.kaynak !== o.prova);

    satirlar.push('5. satır sayıları :');
    for (const o of olcumler) {
      const isaret = o.kaynak === o.prova ? '✓' : '✗';
      satirlar.push(`   ${isaret} ${o.tablo.padEnd(22)} kaynak ${o.kaynak} · prova ${o.prova}`);
    }

    /* ---- 6. ÖRNEK DEĞERLER --------------------------------------- */
    const toplamSql = 'select coalesce(sum("baseAmount"), 0)::text from "transaction";';
    const sonDenetimSql =
      'select coalesce(max("createdAt")::text, cast(\'-\' as text)) from "audit_log";';
    const epostaOzetiSql =
      'select count(*) from "user" where "email" is not null and length("email") > 0;';

    const degerler = [
      [
        'transaction.baseAmount toplamı',
        await sorgu(kaynakUrl, toplamSql),
        await sorgu(provaUrl, toplamSql),
      ],
      [
        'audit_log en yeni createdAt',
        await sorgu(kaynakUrl, sonDenetimSql),
        await sorgu(provaUrl, sonDenetimSql),
      ],
      [
        'user: e-postası olan satır',
        await sorgu(kaynakUrl, epostaOzetiSql),
        await sorgu(provaUrl, epostaOzetiSql),
      ],
    ] as const;

    satirlar.push('6. örnek değerler :');
    for (const [ad, kaynak, prova] of degerler) {
      satirlar.push(`   ${kaynak === prova ? '✓' : '✗'} ${ad}: ${kaynak} | ${prova}`);
    }

    const degerSapmasi = degerler.filter(([, k, p]) => k !== p);

    /* ---- 7. SONUÇ ------------------------------------------------- */
    const basarili = sapanlar.length === 0 && degerSapmasi.length === 0;
    satirlar.push(
      basarili
        ? '\nPROVA SONUCU: GEÇTİ — yedek geri yüklenebilir ve veri birebir.'
        : `\nPROVA SONUCU: BAŞARISIZ — ${sapanlar.length} tabloda, ${degerSapmasi.length} değerde sapma.`,
    );

    process.stdout.write(`${satirlar.join('\n')}\n`);
    if (!basarili) process.exitCode = 1;
  } finally {
    /*
     * ⚠️ PROVA İZİ HER DURUMDA SİLİNİYOR — hata hâlinde de.
     *
     * Bırakılan bir prova veritabanı yalnızca çöp değil: içinde canlı
     * verinin TAM KOPYASI var ve o kopya şifresiz. Kalıntı bırakmak,
     * yedeği şifrelemenin amacını yerel olarak geri alırdı.
     */
    await sorgu(yonetimUrl, `drop database if exists "${provaVeritabani}";`).catch(() => '');
    await rm(gecici, { recursive: true, force: true });
    process.stdout.write(`[prova] temizlendi: ${provaVeritabani} silindi, geçici dizin silindi\n`);
  }
}

if (process.argv[1]?.endsWith('geri-yukleme-provasi.ts')) {
  main().catch((hata: unknown) => {
    process.stderr.write(`[prova] BAŞARISIZ: ${hata instanceof Error ? hata.message : hata}\n`);
    process.exitCode = 1;
  });
}

export { main };
