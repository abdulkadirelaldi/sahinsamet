import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  BASLIK_BAYT,
  gunDizesi,
  libpqUrl,
  SAKLAMA_GUNU,
  silinecekKeyler,
  veritabaniAdi,
  YEDEK_ONEKI,
  YEDEK_SIHIRLI,
  YEDEK_SURUMU,
  yedekAnahtari,
  yedekCoz,
  yedekKeyi,
  yedekSifrele,
} from '../../scripts/yedek-ortak';

/**
 * YEDEĞİN OKUNABİLİRLİĞİ — SAF KATMANIN KAPISI (T-066, §8.21–23).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU KAPI, PROVA VARKEN BİLE GEREKLİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-066'da geri yükleme provası KOŞTURULDU ve geçti — zincirin tamamı ölçüldü.
 * Ama prova ELLE koşan bir betik: R2 kimlik bilgisi, ayağa kalkmış bir Postgres
 * ve `pg_restore` istiyor. CI'da her değişiklikte koşmuyor.
 *
 * Yedeğin okunabilirliğini belirleyen kararlar ise SAF: anahtar biçimi, şifre
 * biçimi, nesne adı ve bağlantı dizesi temizliği. Bu kapı onları her koşumda
 * ölçüyor, yani provanın ÖNCÜLLERİ bayatlamıyor.
 *
 * ⚠️ Kaçınılan hâl çok somut: biçimi değiştiren bir düzenleme yapılır, yedek
 * ALINIR, R2'ye YAZILIR, betik EXIT 0 döner — ve dosya geri YÜKLENEMEZ. Yeşil
 * bir çıktı ve kurtarılamayan bir veritabanı. Prova bunu bir sonraki elle
 * koşumda yakalar; bu kapı aynı gün yakalar.
 */

/** Sabit anahtar — testte rastgelelik kararı bozmasın. */
const ANAHTAR = Buffer.alloc(32, 7);

describe('§8.21 — şifreleme biçimi (AES-256-GCM)', () => {
  it('gidiş-dönüş: çözülen bayt dizisi girdinin AYNISI', () => {
    const duz = randomBytes(5_000);
    const cozulen = yedekCoz(yedekSifrele(duz, ANAHTAR), ANAHTAR);

    expect(cozulen.equals(duz)).toBe(true);
  });

  it('başlık boyutu sabit ve şifreli boyut = düz + başlık', () => {
    /*
     * Betiğin çıktısı bu farkı raporluyor (`+42 başlık`). Sayı burada
     * kilitleniyor: başlık büyürse betiğin raporu da, `BASLIK_BAYT` sabitine
     * dayanan `yedekCoz` kısa-dosya kontrolü de birlikte güncellenmeli.
     */
    const duz = randomBytes(100);
    const sifreli = yedekSifrele(duz, ANAHTAR);

    expect(BASLIK_BAYT).toBe(YEDEK_SIHIRLI.length + 1 + 12 + 16);
    expect(sifreli.length - duz.length).toBe(BASLIK_BAYT);
  });

  it('⚠️ AYNI girdi İKİ KEZ şifrelenince FARKLI çıktı — IV yeniden kullanılmıyor', () => {
    /*
     * GCM'de IV tekrarı KATASTROFİK: aynı anahtar+IV ile şifrelenmiş iki
     * metin, XOR'lanarak çözülebilir hâle gelir. Sabit bir IV yazmak tek
     * satırlık bir "basitleştirme" olurdu ve hiçbir gidiş-dönüş testi
     * kırılmazdı — bu yüzden ayrıca ölçülüyor.
     */
    const duz = Buffer.from('aynı içerik');
    const a = yedekSifrele(duz, ANAHTAR);
    const b = yedekSifrele(duz, ANAHTAR);

    expect(a.equals(b)).toBe(false);
    // Ama ikisi de aynı düz metne çözülüyor.
    expect(yedekCoz(a, ANAHTAR).equals(duz)).toBe(true);
    expect(yedekCoz(b, ANAHTAR).equals(duz)).toBe(true);
  });

  it('⚠️ KURCALANMIŞ dosya çözülmüyor — AEAD`in asıl sebebi', () => {
    /*
     * Şifreli ama DOĞRULANMAMIŞ bir biçimde (ör. AES-CBC) bir baytı bozulmuş
     * dosya çözülür, `pg_restore` bozuk veriyi yükler ve kimse fark etmez.
     * GCM'de etiket tutmaz ve geri yükleme BAŞLAMAZ.
     */
    const sifreli = yedekSifrele(randomBytes(500), ANAHTAR);

    // Gövdenin ortasından tek bir bayt çevriliyor.
    const bozuk = Buffer.from(sifreli);
    const hedef = BASLIK_BAYT + 100;
    bozuk[hedef] = (bozuk[hedef] ?? 0) ^ 0xff;

    expect(() => yedekCoz(bozuk, ANAHTAR)).toThrow(/doğrulama etiketi tutmadı/);
  });

  it('⚠️ ETİKET kurcalanırsa da çözülmüyor', () => {
    const sifreli = yedekSifrele(randomBytes(200), ANAHTAR);
    const bozuk = Buffer.from(sifreli);
    const tagBasi = YEDEK_SIHIRLI.length + 1 + 12;
    bozuk[tagBasi] = (bozuk[tagBasi] ?? 0) ^ 0x01;

    expect(() => yedekCoz(bozuk, ANAHTAR)).toThrow(/doğrulama etiketi tutmadı/);
  });

  it('YANLIŞ anahtar çözmüyor — ve mesaj iki sebebi AYIRT EDİLEMEZ diyor', () => {
    /*
     * GCM yanlış anahtarı kurcalanmış dosyadan ayırt etmiyor. Mesaj bunu
     * SÖYLÜYOR; birini varsaymak panik anında yanlış teşhis olurdu.
     */
    const sifreli = yedekSifrele(randomBytes(200), ANAHTAR);
    const baskaAnahtar = Buffer.alloc(32, 9);

    expect(() => yedekCoz(sifreli, baskaAnahtar)).toThrow(/BACKUP_ENCRYPTION_KEY/);
  });

  it('YABANCI dosya ayrı mesaj veriyor — "anahtarı suçlamadan önce dosyaya bak"', () => {
    const yabanci = Buffer.concat([Buffer.from('BAŞKA-BİR-ŞEY'), randomBytes(100)]);

    expect(() => yedekCoz(yabanci, ANAHTAR)).toThrow(/bu sistemin yedeği değil/);
  });

  it('KISA dosya ayrı mesaj veriyor — yarıda kesilmiş aktarım', () => {
    expect(() => yedekCoz(Buffer.alloc(10), ANAHTAR)).toThrow(/çok kısa/);
  });

  it('⚠️ SÜRÜM uyuşmazlığı sessiz kalmıyor', () => {
    /*
     * Biçim bir gün değişirse eski yedek YANLIŞ okunmamalı. Sürüm baytı
     * bozulduğunda araç "o sürümün aracı gerekiyor" diyor.
     */
    const sifreli = yedekSifrele(randomBytes(100), ANAHTAR);
    const eskiSurum = Buffer.from(sifreli);
    eskiSurum[YEDEK_SIHIRLI.length] = 0;

    expect(() => yedekCoz(eskiSurum, ANAHTAR)).toThrow(/sürüm 0/);
    expect(YEDEK_SURUMU).toBe(1);
  });
});

describe('§8.20 — anahtar okuma DEĞER sızdırmıyor', () => {
  it('eksik anahtar: mesajda ÜRETME KOMUTU var, değer yok', () => {
    /*
     * T-013a'nın kuralı: "üretmek için komut" verilsin. Panik anında
     * "tanımsız" demek yetmez, ne yazılacağı da söylenmeli.
     */
    expect(() => yedekAnahtari({})).toThrow(/randomBytes\(32\)/);
  });

  it('⚠️ YANLIŞ UZUNLUK yakalanıyor ve mesajda anahtarın KENDİSİ yok', () => {
    const kisa = Buffer.alloc(16, 1).toString('base64');

    try {
      yedekAnahtari({ BACKUP_ENCRYPTION_KEY: kisa });
      throw new Error('fırlatması gerekiyordu');
    } catch (hata) {
      const mesaj = hata instanceof Error ? hata.message : String(hata);
      expect(mesaj).toMatch(/32 bayt olmalı, 16 bayt/);
      // §8.20: anahtar hiçbir biçimde mesaja girmiyor.
      expect(mesaj).not.toContain(kisa);
    }
  });

  it('doğru uzunluktaki anahtar okunuyor', () => {
    const ham = Buffer.alloc(32, 3).toString('base64');
    expect(yedekAnahtari({ BACKUP_ENCRYPTION_KEY: ham }).length).toBe(32);
  });
});

describe('§8.21 — nesne adı ve saklama politikası', () => {
  it('anahtar deterministik ve önekli', () => {
    expect(yedekKeyi('2026-10-16')).toBe(`${YEDEK_ONEKI}sahinsamet-2026-10-16.dump.enc`);
  });

  it('geçersiz gün biçimi reddediliyor', () => {
    expect(() => yedekKeyi('16-10-2026')).toThrow(/Geçersiz gün/);
    expect(() => yedekKeyi('2026-10')).toThrow(/Geçersiz gün/);
  });

  it('gün dizesi UTC — saat dilimi adı kaydırmıyor', () => {
    // 23:30 TR (UTC+3) → UTC'de bir ÖNCEKİ gün. Yerel saat kullanılsaydı iki
    // farklı makine aynı yedeğe iki ad verirdi.
    expect(gunDizesi(new Date('2026-10-16T20:30:00.000Z'))).toBe('2026-10-16');
    expect(gunDizesi(new Date('2026-10-16T23:30:00.000Z'))).toBe('2026-10-16');
    expect(gunDizesi(new Date('2026-10-17T00:30:00.000Z'))).toBe('2026-10-17');
  });

  it('⚠️ budama PENCERE siliyor — kesinti kendiliğinden onarılıyor', () => {
    /*
     * Tek gün silinse, yedekleme birkaç gün koşmadığında o günlerin nesneleri
     * SONSUZA KADAR kalırdı ve R2 ücretsiz katmanı bir gün dolardı — "sessizce
     * duran yedekleme" sınıfı.
     */
    const keyler = silinecekKeyler(new Date('2026-10-16T12:00:00.000Z'));

    expect(keyler).toHaveLength(7);
    // En yeni silinen: bugün − 30 gün.
    expect(keyler[0]).toBe(yedekKeyi('2026-09-16'));
    // En eski silinen: bugün − 36 gün.
    expect(keyler[6]).toBe(yedekKeyi('2026-09-10'));
    expect(SAKLAMA_GUNU).toBe(30);
  });

  it('budama AY ve YIL sınırını doğru geçiyor', () => {
    // 1 Ocak − 30 gün = 2 Aralık (önceki yıl). Elle gün aritmetiği burada
    // kayardı; `setUTCDate` takvimi kendisi çözüyor.
    const keyler = silinecekKeyler(new Date('2027-01-01T00:00:00.000Z'));
    expect(keyler[0]).toBe(yedekKeyi('2026-12-02'));
  });

  it('budama BUGÜNÜN yedeğini ASLA silmiyor', () => {
    /*
     * En pahalı olası kusur: budama penceresinin bugüne kadar uzaması, yani
     * az önce yazılan yedeği silmek. Pencere `saklama`dan BAŞLIYOR, bu yüzden
     * bugün hiçbir koşulda listede olmamalı.
     */
    const bugun = new Date('2026-10-16T12:00:00.000Z');
    expect(silinecekKeyler(bugun)).not.toContain(yedekKeyi('2026-10-16'));
    // Geniş bir pencerede bile: 30 + 60 gün geriye gidiyor, ileriye asla.
    expect(silinecekKeyler(bugun, 30, 60)).not.toContain(yedekKeyi('2026-10-16'));
  });
});

describe('bağlantı dizesi — `libpq` araçları için temizlik', () => {
  it('⚠️ Prisma`ya özgü `schema` parametresi AYIKLANIYOR', () => {
    /*
     * Bu kusur gerçek bir koşumda çıktı: `pg_dump: error: invalid URI query
     * parameter: "schema"`. Yani betik yazıldığı gibi HİÇBİR ortamda
     * çalışmayacaktı ve bunu ancak KOŞTURARAK görmek mümkündü.
     */
    expect(libpqUrl('postgresql://u:p@h:5433/db?schema=public')).toBe('postgresql://u:p@h:5433/db');
  });

  it('⚠️ `sslmode` KORUNUYOR — yedeği şifresiz bağlantıdan çekmeyelim', () => {
    /*
     * Tüm sorgu dizesini atmak kolay yoldu ve YANLIŞ olurdu: üretimde
     * `sslmode=require` düşerse yedek şifresiz bir bağlantıdan akar.
     */
    expect(libpqUrl('postgresql://u:p@h:5432/db?sslmode=require&schema=public')).toBe(
      'postgresql://u:p@h:5432/db?sslmode=require',
    );
  });

  it('diğer libpq parametreleri de korunuyor', () => {
    const temiz = libpqUrl(
      'postgresql://u:p@h:5432/db?connect_timeout=10&application_name=yedek&pgbouncer=true',
    );
    expect(temiz).toContain('connect_timeout=10');
    expect(temiz).toContain('application_name=yedek');
    // Prisma/pgbouncer'a özgü olan ayıklandı.
    expect(temiz).not.toContain('pgbouncer');
  });

  it('veritabanı adı okunuyor — prova hedefini türetmek için', () => {
    expect(veritabaniAdi('postgresql://u:p@h:5433/sahinsamet?schema=public')).toBe('sahinsamet');
  });
});
