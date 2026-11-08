import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/lib/schemas';
import {
  SNIFF_BYTES,
  readImageDimensions,
  sniffMime,
  type SniffedMime,
} from '@/server/services/_shared/file-type';
import { buildAttachmentKey } from '@/server/services/attachment';
import {
  SIGNED_GET_TTL_SECONDS,
  SIGNED_PUT_TTL_SECONDS,
  deleteObjectQuietly,
  getObjectBytes,
  presignUrl,
  readR2Config,
  type R2Config,
} from '@/server/storage/r2';

/**
 * R2 EKLENTİ ALTYAPISI — §8.11, ADR-018, T-037.
 *
 * ⚠️ HİÇBİR TEST GERÇEK R2'YE DOKUNMAZ. CI'da anahtar yok ve olmayacak (kart
 * bağlayıcı), bu yüzden `fetch` ve yapılandırma enjekte ediliyor. Üretim kodu
 * GERÇEK R2'ye karşı bir kez ÖLÇÜLDÜ (T-037 sondası) ve sonuçları rapora
 * yazıldı; burada ölçülen şey kodun KENDİ mantığı.
 */

const KOK = resolve(__dirname, '../../..');

/** Sabit yapılandırma — imza deterministik olsun. */
const CONFIG: R2Config = {
  accountId: 'hesap123',
  accessKeyId: 'ANAHTAR',
  secretAccessKey: 'gizli',
  bucket: 'kova',
};

const SABIT_AN = new Date('2026-10-14T12:00:00.000Z');

/* ===========================================================================
 * ⚠️ İÇERİK TESPİTİ — uzantı değil, `Content-Type` değil
 * ======================================================================== */

/** Gerçek bir PNG — depoda bulunan tek görsel. */
const GERCEK_PNG = readFileSync(
  join(
    KOK,
    'node_modules/.pnpm/next-mdx-remote@6.0.0_@types+react@19.2.18_react@19.2.8/node_modules/next-mdx-remote/header.png',
  ),
);

describe('⚠️ sniffMime — İÇERİK okunuyor', () => {
  it('GERÇEK PNG tanınıyor ve boyutu doğru', () => {
    expect(sniffMime(GERCEK_PNG)).toBe('image/png');
    // Dosya gerçekten 1500×500 (bağımsız olarak `file`/ölçümle doğrulandı).
    expect(readImageDimensions(GERCEK_PNG, 'image/png')).toEqual({ width: 1500, height: 500 });
  });

  it('⚠️ "image/png" YAZAN METİN reddediliyor — başlık yalanı tutmuyor', () => {
    /*
     * KARARIN KALBİ: `Content-Type` ve dosya adı ziyaretçi girdisi. Bir metin
     * dosyası kendini `image/png` diye tanıtabilir; baytlar tanıtamaz.
     */
    expect(sniffMime(Buffer.from('image/png bu bir yalan'))).toBeNull();
    expect(sniffMime(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBeNull();
    expect(sniffMime(Buffer.alloc(0))).toBeNull();
  });

  it('JPEG · WebP(üç alt biçim) · AVIF · PDF imzaları', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
    expect(sniffMime(jpeg)).toBe('image/jpeg');

    const webp = (altBicim: string) => {
      const b = Buffer.alloc(40);
      b.write('RIFF', 0, 'ascii');
      b.write('WEBP', 8, 'ascii');
      b.write(altBicim, 12, 'ascii');
      return b;
    };
    for (const alt of ['VP8 ', 'VP8L', 'VP8X']) {
      expect(sniffMime(webp(alt)), alt).toBe('image/webp');
    }

    const avif = Buffer.alloc(16);
    avif.write('ftyp', 4, 'ascii');
    avif.write('avif', 8, 'ascii');
    expect(sniffMime(avif)).toBe('image/avif');

    expect(sniffMime(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf');
  });

  it('⚠️ `ftyp` ama AVIF DEĞİL (ör. MP4) reddediliyor', () => {
    // ISOBMFF kabı videolar için de kullanılıyor; marka kontrolü şart.
    const mp4 = Buffer.alloc(16);
    mp4.write('ftyp', 4, 'ascii');
    mp4.write('isom', 8, 'ascii');
    expect(sniffMime(mp4)).toBeNull();
  });

  it('⚠️⚠️ SVG ARTIK REDDEDİLİYOR — ADR-043', () => {
    /*
     * T-037'de SVG listedeydi ve tespiti SEZGİSELDİ: sihirli baytı yok, metin
     * biçimi olduğu için yorum/bildirim/DOCTYPE ile başlayabiliyor. Ölçüm o
     * sezginin bu projenin KENDİ dosyasında kırıldığını gösterdi —
     * `src/app/icon.svg`in `<svg` etiketi 514. baytta.
     *
     * ADR-043 üç gerekçeyle listeden çıkardı: tespit tahmine dayanıyordu, SVG
     * betik çalıştırabilen tek tipti, ve ihtiyaç ölçülmedi.
     *
     * ⚠️ BU TEST ESKİ TESTİN TERSİ VE BİLEREK: eski iddia SVG'nin TANINDIĞINI
     * ölçüyordu, yenisi REDDEDİLDİĞİNİ. T-053'te öğrenilen ders — sapma
     * imkânsızlaştığında assert'i düzeltmek değil SORUYU DEĞİŞTİRMEK gerekir.
     */
    // Eski `src/app/icon.svg`in ŞEKLİ (2026-10-23'te PNG/ICO simgelerle
    // değiştirildi): XML yorumuyla başlayan, `<svg`i 514. bayta itilmiş bir SVG.
    // Dosya artık yok; ölçülen durum aynen burada kuruluyor.
    const gercekSvg = Buffer.from(
      `<!--${' '.repeat(506)}-->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"></svg>`,
    );
    expect(gercekSvg.indexOf('<svg')).toBe(514);

    // Yorumla başlayan SVG hâlâ bir SVG; değişen şey YÜKLENEBİLİR olup olmadığı.
    expect(gercekSvg.toString('utf8', 0, 4)).toBe('<!--');
    expect(sniffMime(gercekSvg)).toBeNull();

    // Hiçbir SVG biçimi tanınmıyor — bildirimli, sade, hepsi.
    expect(sniffMime(Buffer.from('<?xml version="1.0"?><svg xmlns="x"></svg>'))).toBeNull();
    expect(sniffMime(Buffer.from('<svg viewBox="0 0 1 1"/>'))).toBeNull();
    expect(sniffMime(Buffer.from('<svg onload="alert(1)"/>'))).toBeNull();
  });

  it('⚠️ METİN TARAMA MANTIĞI SİLİNDİ — kodda kalıntı yok', () => {
    /*
     * ADR-043 "daha az kod, daha az tahmin" dedi. Kalan beş tipin hepsi sabit
     * imzalı; bir metin penceresi artık hiçbir şeye hizmet etmiyor. Kalıntı
     * bırakmak, ileride birinin onu yeniden bağlamasını kolaylaştırırdı.
     */
    /*
     * ⚠️ YORUMLAR AYIKLANIYOR (T-040 dersi): dosya ADR-043'ün GEREKÇESİNİ
     * anlatan yorumlar taşıyor ve onlar kalmalı — silinen şey KOD. Ham metinde
     * arama yapan ilk iddiam bu yüzden kırıldı ve haklı olarak kırıldı.
     */
    const kaynak = readFileSync(join(KOK, 'src/server/services/_shared/file-type.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

    expect(kaynak).not.toContain('SVG_SCAN_BYTES');
    expect(kaynak).not.toContain("'image/svg+xml'");
    // Metne çeviren bir tarama kalmadı; yalnızca `ascii` imza okumaları var.
    expect(kaynak).not.toMatch(/toString\('utf8'/);
  });

  it('içinde `<svg` geçen bir PNG hâlâ PNG — sabit imza kazanıyor', () => {
    const png = Buffer.concat([GERCEK_PNG.subarray(0, 64), Buffer.from('<svg >')]);
    expect(sniffMime(png)).toBe('image/png');
  });

  it('tanınan tipler ŞEMANIN izin verdikleriyle AYNI küme', () => {
    const taninanlar: SniffedMime[] = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'application/pdf',
    ];
    expect([...taninanlar].sort()).toEqual([...ALLOWED_MIME_TYPES].sort());
  });
});

/* ===========================================================================
 * BOYUT OKUMA
 * ======================================================================== */

describe('readImageDimensions', () => {
  it('PNG — IHDR sabit ofsette', () => {
    expect(readImageDimensions(GERCEK_PNG, 'image/png')).toEqual({ width: 1500, height: 500 });
  });

  it('⚠️ JPEG — SOF ARANIYOR, sabit ofset YOK', () => {
    /*
     * JPEG değişken uzunlukta yığınlardan oluşuyor. Önce bir APP0 yığını,
     * sonra SOF0 koyuyoruz: sabit ofset varsayan bir uygulama APP0'ın
     * içinden rastgele sayı okurdu.
     */
    const buf = Buffer.concat([
      Buffer.from([0xff, 0xd8]), // SOI
      Buffer.from([0xff, 0xe0, 0x00, 0x06, 1, 2, 3, 4]), // APP0, uzunluk 6
      Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x90, 0x02, 0x80]), // SOF0 400×640
    ]);
    expect(readImageDimensions(buf, 'image/jpeg')).toEqual({ width: 640, height: 400 });
  });

  it('JPEG — Huffman tablosu (C4) SOF SANILMIYOR', () => {
    const buf = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      Buffer.from([0xff, 0xc4, 0x00, 0x06, 1, 2, 3, 4]), // DHT, SOF DEĞİL
      Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x64, 0x00, 0xc8]), // SOF0 200×100
    ]);
    expect(readImageDimensions(buf, 'image/jpeg')).toEqual({ width: 200, height: 100 });
  });

  it('JPEG — bozuk hizalama `null`, SONSUZ DÖNGÜ YOK', () => {
    expect(
      readImageDimensions(Buffer.from([0xff, 0xd8, 0x00, 0x00, 0x00]), 'image/jpeg'),
    ).toBeNull();
    // Sıfır uzunluklu yığın ofseti ilerletmezdi.
    const sifirUzunluk = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 1, 2, 3, 4, 5, 6]);
    expect(readImageDimensions(sifirUzunluk, 'image/jpeg')).toBeNull();
  });

  it('⚠️ WebP — ÜÇ alt biçim, üçü FARKLI yerde boyut taşıyor', () => {
    const vp8x = Buffer.alloc(40);
    vp8x.write('RIFF', 0, 'ascii');
    vp8x.write('WEBP', 8, 'ascii');
    vp8x.write('VP8X', 12, 'ascii');
    vp8x.writeUIntLE(1023, 24, 3); // genişlik-1
    vp8x.writeUIntLE(767, 27, 3); // yükseklik-1
    expect(readImageDimensions(vp8x, 'image/webp')).toEqual({ width: 1024, height: 768 });

    const vp8 = Buffer.alloc(40);
    vp8.write('RIFF', 0, 'ascii');
    vp8.write('WEBP', 8, 'ascii');
    vp8.write('VP8 ', 12, 'ascii');
    vp8.writeUInt16LE(320, 26);
    vp8.writeUInt16LE(240, 28);
    expect(readImageDimensions(vp8, 'image/webp')).toEqual({ width: 320, height: 240 });

    const vp8l = Buffer.alloc(40);
    vp8l.write('RIFF', 0, 'ascii');
    vp8l.write('WEBP', 8, 'ascii');
    vp8l.write('VP8L', 12, 'ascii');
    vp8l.writeUInt32LE((99 << 14) | 199, 21); // (yükseklik-1)<<14 | (genişlik-1)
    expect(readImageDimensions(vp8l, 'image/webp')).toEqual({ width: 200, height: 100 });
  });

  it('⚠️ AVIF · PDF → `null` (kullanıcı onaylı karar; SVG ADR-043 ile çıktı)', () => {
    /*
     * AVIF boyutu ISOBMFF kutu ağacında ve depoda sınanacak gerçek AVIF YOK;
     * sınanmayan ayrıştırıcı yazmak reddedildi. Şema `Int?`, `null` meşru.
     */
    const avif = Buffer.alloc(64);
    avif.write('ftyp', 4, 'ascii');
    avif.write('avif', 8, 'ascii');

    expect(readImageDimensions(avif, 'image/avif')).toBeNull();
    expect(readImageDimensions(Buffer.from('%PDF-1.7'), 'application/pdf')).toBeNull();
  });

  it('kısa/bozuk tampon `null` — çökmüyor', () => {
    expect(readImageDimensions(Buffer.alloc(4), 'image/png')).toBeNull();
    expect(readImageDimensions(Buffer.alloc(10), 'image/webp')).toBeNull();
    // PNG imzası var ama IHDR yok.
    const sahte = Buffer.concat([
      GERCEK_PNG.subarray(0, 12),
      Buffer.from('XXXX'),
      Buffer.alloc(16),
    ]);
    expect(readImageDimensions(sahte, 'image/png')).toBeNull();
  });
});

/* ===========================================================================
 * ⚠️ ANAHTAR ÜRETİMİ — istemcinin dosya adı GİRMİYOR
 * ======================================================================== */

describe('⚠️ buildAttachmentKey', () => {
  it('varlık/kimlik/rastgele.uzantı — dosya adı YOK', () => {
    expect(buildAttachmentKey('PROFILE', 'prj_1', 'image/png', 'rnd')).toBe(
      'profile/prj_1/rnd.png',
    );
  });

  it('⚠️ UZANTI DOĞRULANMIŞ MIME`DAN, istemciden DEĞİL', () => {
    // İstemci `.html` isterse diye bir yol yok: uzantı eşlemeden geliyor.
    expect(buildAttachmentKey('PROFILE', 'p1', 'image/webp', 'r')).toBe('profile/p1/r.webp');
  });

  it('⚠️ YOL KAÇIŞI İMKÂNSIZ — anahtarın her parçası bizim', () => {
    /*
     * Dosya adı anahtara hiç girmediği için `../../gizli/x.png` gibi bir ad
     * anahtarı etkileyemiyor. Kaçış yüzeyi kaldırılmış, filtrelenmiş değil.
     */
    const key = buildAttachmentKey('PROFILE', 'prj_1', 'image/png', 'rnd');
    expect(key).not.toContain('..');
    expect(key.split('/')).toHaveLength(3);
  });

  it('rastgele kimlik VARSAYILAN olarak üretiliyor — çakışma pratikte yok', () => {
    const a = buildAttachmentKey('PROFILE', 'prj_1', 'image/png');
    const b = buildAttachmentKey('PROFILE', 'prj_1', 'image/png');
    expect(a).not.toBe(b);
  });
});

/* ===========================================================================
 * ⚠️ İMZALAMA — ölçülen davranışın mantığı
 * ======================================================================== */

describe('presignUrl', () => {
  const imza = (url: string) => new URL(url).searchParams.get('X-Amz-Signature');

  it('adres HESAP KİMLİĞİNDEN türüyor — `R2_ENDPOINT` yok', () => {
    const url = presignUrl(
      { key: 'a/b.png', method: 'GET', expiresIn: 900, now: SABIT_AN },
      CONFIG,
    );
    expect(url.startsWith('https://hesap123.r2.cloudflarestorage.com/kova/a/b.png?')).toBe(true);
  });

  it('DETERMİNİSTİK — aynı girdi aynı imza', () => {
    const bir = presignUrl({ key: 'a.png', method: 'GET', expiresIn: 900, now: SABIT_AN }, CONFIG);
    const iki = presignUrl({ key: 'a.png', method: 'GET', expiresIn: 900, now: SABIT_AN }, CONFIG);
    expect(imza(bir)).toBe(imza(iki));
  });

  it('⚠️ İMZA ANAHTARA BAĞLI — başka anahtar başka imza', () => {
    // Gerçek R2'de ölçüldü: anahtar değiştirilip imza korunursa 403.
    const a = presignUrl({ key: 'a.png', method: 'GET', expiresIn: 900, now: SABIT_AN }, CONFIG);
    const b = presignUrl({ key: 'b.png', method: 'GET', expiresIn: 900, now: SABIT_AN }, CONFIG);
    expect(imza(a)).not.toBe(imza(b));
  });

  it('⚠️ İMZA METODA BAĞLI — GET imzası PUT için kullanılamaz', () => {
    const get = presignUrl({ key: 'a.png', method: 'GET', expiresIn: 900, now: SABIT_AN }, CONFIG);
    const put = presignUrl({ key: 'a.png', method: 'PUT', expiresIn: 900, now: SABIT_AN }, CONFIG);
    expect(imza(get)).not.toBe(imza(put));
  });

  it('imza SÜREYE ve GİZLİ ANAHTARA bağlı', () => {
    const base = { key: 'a.png', method: 'GET' as const, now: SABIT_AN };
    expect(imza(presignUrl({ ...base, expiresIn: 900 }, CONFIG))).not.toBe(
      imza(presignUrl({ ...base, expiresIn: 300 }, CONFIG)),
    );
    expect(imza(presignUrl({ ...base, expiresIn: 900 }, CONFIG))).not.toBe(
      imza(presignUrl({ ...base, expiresIn: 900 }, { ...CONFIG, secretAccessKey: 'baska' })),
    );
  });

  it('⚠️ ANAHTARIN EĞİK ÇİZGİSİ KORUNUYOR — `%2F` olmuyor', () => {
    /*
     * `encodeURIComponent` eğik çizgiyi de kodlar; o zaman R2 anahtarı tek bir
     * isim sanar ve kanonik yol uyuşmazlığı 403 verir. Parça parça kodlama şart.
     */
    const url = presignUrl(
      { key: 'project/prj_1/ö ç.png', method: 'GET', expiresIn: 900, now: SABIT_AN },
      CONFIG,
    );
    const yol = new URL(url).pathname;
    expect(yol.startsWith('/kova/project/prj_1/')).toBe(true);
    /*
     * ⚠️ İDDİA YOL ÜZERİNDE, TÜM ADRES ÜZERİNDE DEĞİL — ilk yazdığımda
     * `url` içinde `%2F` aramıştım ve iddia YANLIŞTI: `X-Amz-Credential`
     * sorgu parametresi kapsam dizesini (`.../auto/s3/aws4_request`) taşıyor
     * ve `URLSearchParams` oradaki eğik çizgileri `%2F` olarak kodluyor.
     * Yani `%2F` sorguda MEŞRU; yasak olan şey YOLDA olması.
     */
    expect(yol).not.toContain('%2F');
    // Boşluk ve Türkçe karakter kodlanıyor (gerçek R2'de 200 ölçüldü).
    expect(url).toContain('%20');
  });

  it('sorgu parametreleri SIRALI — kanonik istek şart koşuyor', () => {
    const url = presignUrl({ key: 'a.png', method: 'GET', expiresIn: 900, now: SABIT_AN }, CONFIG);
    const adlar = [...new URL(url).searchParams.keys()].filter((k) => k !== 'X-Amz-Signature');
    expect(adlar).toEqual([...adlar].sort());
  });

  it('bölge `auto` — gerçek bölge adı 403 verirdi', () => {
    const url = presignUrl({ key: 'a.png', method: 'GET', expiresIn: 900, now: SABIT_AN }, CONFIG);
    expect(new URL(url).searchParams.get('X-Amz-Credential')).toContain('/auto/s3/aws4_request');
  });

  it('⚠️ TTL: okuma 15 dk (§8.11), YAZMA DAHA KISA', () => {
    /*
     * Asimetri kasıtlı: çalınmış bir GET adresi OKUTUR, çalınmış bir PUT adresi
     * bizim bucket'a YAZDIRIR.
     */
    expect(SIGNED_GET_TTL_SECONDS).toBe(900);
    expect(SIGNED_PUT_TTL_SECONDS).toBe(300);
    expect(SIGNED_PUT_TTL_SECONDS).toBeLessThan(SIGNED_GET_TTL_SECONDS);
  });
});

/* ===========================================================================
 * YAPILANDIRMA VE NESNE İŞLEMLERİ
 * ======================================================================== */

describe('readR2Config', () => {
  it('⚠️ EKSİK ANAHTARI ADIYLA söylüyor, DEĞERİNİ söylemiyor (§8.20)', () => {
    expect(() => readR2Config({ R2_ACCOUNT_ID: 'x' })).toThrow(/R2_ACCESS_KEY_ID/);
    expect(() => readR2Config({ R2_ACCOUNT_ID: 'x' })).toThrow(/R2_BUCKET/);
    // Var olan değer mesaja GİRMİYOR.
    expect(() => readR2Config({ R2_ACCOUNT_ID: 'gizli-hesap' })).not.toThrow(/gizli-hesap/);
  });

  it('`R2_PUBLIC_URL` GEREKLİ DEĞİL — bucket private, boş kalıyor', () => {
    expect(() =>
      readR2Config({
        R2_ACCOUNT_ID: 'a',
        R2_ACCESS_KEY_ID: 'b',
        R2_SECRET_ACCESS_KEY: 'c',
        R2_BUCKET: 'd',
      }),
    ).not.toThrow();
  });

  it('⚠️ `R2_ENDPOINT` OKUNMUYOR — ikinci bir kaynak olurdu', () => {
    const cfg = readR2Config({
      R2_ACCOUNT_ID: 'a',
      R2_ACCESS_KEY_ID: 'b',
      R2_SECRET_ACCESS_KEY: 'c',
      R2_BUCKET: 'd',
      R2_ENDPOINT: 'https://yanlis.example',
    });
    expect(JSON.stringify(cfg)).not.toContain('yanlis.example');
  });
});

describe('nesne işlemleri (taklit `fetch`)', () => {
  it('`getObjectBytes` içeriği döndürüyor', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new TextEncoder().encode('merhaba').buffer,
    } as unknown as Response);

    const bytes = await getObjectBytes('a.txt', { config: CONFIG, fetchImpl, now: SABIT_AN });
    expect(bytes?.toString('utf8')).toBe('merhaba');
  });

  it('404 → `null` (hata DEĞİL)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response);
    expect(await getObjectBytes('yok', { config: CONFIG, fetchImpl, now: SABIT_AN })).toBeNull();
  });

  it('diğer hatalar FIRLATIYOR — sessizce `null` dönmüyor', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    await expect(getObjectBytes('a', { config: CONFIG, fetchImpl, now: SABIT_AN })).rejects.toThrow(
      /500/,
    );
  });

  it('⚠️ `deleteObjectQuietly` FIRLATMIYOR — telafi yolunda asıl hatayı maskelemesin', async () => {
    const patlayan = vi.fn().mockRejectedValue(new Error('ağ koptu'));
    expect(
      await deleteObjectQuietly('a', { config: CONFIG, fetchImpl: patlayan, now: SABIT_AN }),
    ).toBe(false);

    const basarisiz = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    expect(
      await deleteObjectQuietly('a', { config: CONFIG, fetchImpl: basarisiz, now: SABIT_AN }),
    ).toBe(false);
  });

  it('silme 404`ü BAŞARI sayıyor — nesne zaten yok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response);
    expect(await deleteObjectQuietly('a', { config: CONFIG, fetchImpl, now: SABIT_AN })).toBe(true);
  });

  it('DELETE metodu gönderiliyor', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    await deleteObjectQuietly('a', { config: CONFIG, fetchImpl, now: SABIT_AN });
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('DELETE');
  });
});

/* ===========================================================================
 * ⚠️ KAPILAR
 * ======================================================================== */

describe('KAPILAR', () => {
  const kod = (yol: string) =>
    readFileSync(join(KOK, yol), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

  it('tarama vakum değil', () => {
    expect(kod('src/server/storage/r2.ts')).toContain('presignUrl');
    expect(kod('src/server/services/attachment.ts')).toContain('buildAttachmentKey');
  });

  it('⚠️ `Attachment.url` DİYE BİR ALAN YOK — şemada da DTO`da da', () => {
    /*
     * ADR-018'in kalbi. Kalıcı bir URL ya bayat olurdu ya da bucket'ın private
     * olmadığı anlamına gelirdi.
     */
    const sema = readFileSync(join(KOK, 'prisma/schema.prisma'), 'utf8');
    const blok = sema.slice(
      sema.indexOf('model Attachment {'),
      sema.indexOf('@@map("attachment")'),
    );
    expect(blok).toContain('key');
    expect(blok).not.toMatch(/^\s*url\s/m);

    expect(kod('src/server/services/content-dto.ts')).not.toMatch(
      /interface AttachmentRefDto[^}]*url/,
    );
  });

  it('⚠️⚠️ İMZALI ADRES ÖNBELLEKLİ OKUMA YOLUNDA ÇAĞRILMIYOR', () => {
    /*
     * ADR-018'İN T-037 KABUL KRİTERİ. Ölçüldü: önbellek girdisi 3600 sn,
     * imzalı adres 900 sn → girerse her saatin 45 dakikası kırık görsel.
     * Çözüm TTL büyütmek değil, ikisini hiç karşılaştırmamak.
     */
    for (const yol of [
      'src/server/services/cached.ts',
      'src/server/services/_shared/content-cache.ts',
      'src/server/services/_shared/content-query.ts',
    ]) {
      const kaynak = kod(yol);
      expect(kaynak, `${yol} imzalı adres üretiyor — önbellekte bayatlar`).not.toContain('presign');
      expect(kaynak, `${yol} signedUrl çağırıyor`).not.toContain('signedUrl');
    }
  });

  it('⚠️ ÖNBELLEK SÜRESİ > İMZA SÜRESİ — çatışma GERÇEK, bu yüzden ayrı tutuluyor', () => {
    const cache = kod('src/server/services/_shared/content-cache.ts');
    const saniye = Number(/CONTENT_REVALIDATE_SECONDS\s*=\s*(\d+)/.exec(cache)?.[1]);

    expect(saniye).toBeGreaterThan(SIGNED_GET_TTL_SECONDS);
    // İddia çatışmayı SABİTLİYOR: biri değişirse burası kırılır ve karar
    // yeniden gözden geçirilir.
    expect(saniye).toBe(3600);
  });

  it('R2 modülü `@/server/db` ÇEKMİYOR — altyapı, servis değil', () => {
    expect(kod('src/server/storage/r2.ts')).not.toContain('@/server/db');
  });

  it('`file-type.ts` SAF — `crypto`, `db`, `next` yok', () => {
    const kaynak = kod('src/server/services/_shared/file-type.ts');
    for (const yasak of ['node:crypto', '@/server/db', 'next/']) {
      expect(kaynak, `file-type.ts ${yasak} içe aktarıyor`).not.toContain(yasak);
    }
  });

  it('⚠️ GERÇEK R2`YE YAZAN TEST YOK — enjeksiyon yüzeyi VAR', () => {
    /*
     * Kart bağlayıcı: CI'da anahtar yok ve olmayacak.
     *
     * ⚠️ İLK YAZDIĞIM İDDİA DAİRESELDİ: bu dosyanın kendi kaynağını okuyup
     * `process.env.R2_` desenini arıyordu — ama desen, REGEX LİTERALİ olarak
     * dosyanın İÇİNDE geçiyor, yani iddia daima kırılıyordu. Kendi metnini
     * denetleyen bir kontrol, aradığı şeyi kendisi üretiyor.
     *
     * Ölçülebilir olan şey ENJEKSİYON YÜZEYİNİN VARLIĞI: üretim kodu `fetch`i
     * ve yapılandırmayı dışarıdan alıyor, dolayısıyla testler gerçek R2'ye
     * gitmek ZORUNDA değil. Yüzey kaldırılırsa bu iddia kırılır.
     */
    const r2 = kod('src/server/storage/r2.ts');
    expect(r2).toContain('fetchImpl');
    expect(r2).toContain('R2Deps');
    // Yapılandırma da enjekte edilebilir olmalı (varsayılanı `readR2Config`).
    expect(r2).toMatch(/config\?:\s*R2Config/);
  });

  it('boyut sınırı şemadan geliyor — iki yerde yazılmıyor', () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
    expect(SNIFF_BYTES).toBe(512);
  });
});
