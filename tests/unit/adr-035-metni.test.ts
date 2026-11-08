import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ADR-035'İN BAĞLAYICI CÜMLESİ — KULLANICIYA VERİLEN SÖZ DOĞRU MU (T-055g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU BİR GÜVENLİK KAPISI, KOZMETİK DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-035 oturum geçersizleştirmeyi üç katmana ayırdı ve (C) — okumaları
 * kapatmak — F6'ya bırakıldı. Yani şifre değiştirmek bugün çalınmış bir
 * oturumun panel İÇERİĞİNİ GÖRMESİNİ engellemiyor; yalnızca YAZMA yetkisini
 * kaldırıyor.
 *
 * Bu yüzden "Tüm cihazlardan çıkış yapıldı" demek kozmetik bir hata değil:
 * kullanıcıya **tutulmayan bir söz** vermek olur. Ve bedeli somut — o söze
 * dayanan biri çalınmış bir cihazı önemsemeyebilir. Panelde doğrulanamayan söz
 * vermeme kuralının (T-034) en keskin hâli: burada söz belirsiz değil, YANLIŞ
 * olur.
 *
 * Boşluk T-054g'de ölçüldü: metin `ADR_035_MESAJ` sabitinde duruyordu ve
 * HİÇBİR KAPI onu dizeyle karşılaştırmıyordu. Frontend ve Güvenlik aynı boşluğu
 * bağımsızca gördü (T-055g kartı).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CÜMLE ADR'DEN TÜRETİLİYOR — ÜÇÜNCÜ BİR KOPYA YAZILMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Beklenen metni bu dosyaya ELLE yazmak kolay olurdu ve YANLIŞ olurdu: o anda
 * aynı cümlenin üçüncü kopyası doğar (ADR · bileşen · test) ve ADR bir gün
 * düzeltildiğinde test ESKİ cümleyi savunmaya devam eder — yani kapı, kendi
 * koruduğu kararın gerisinde kalır. `SESSION_MAX_AGE_SECONDS` taşımasının
 * dersi (T-049g) birebir burada geçerli.
 *
 * Bu yüzden cümle `docs/DECISIONS.md` içindeki ADR-035 bloğundan AYIKLANIYOR.
 * Sapma iki yönde de kırmızı: bileşen değişirse de, ADR değişip bileşen
 * güncellenmezse de.
 */

const KOK = resolve(__dirname, '..', '..');

/** Yorumlar ayıklanmış kod — gerekçe metinleri assert'leri yanıltmasın (T-040 dersi). */
const yorumsuz = (kaynak: string): string =>
  kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

/** Boşlukları tekleştirir — satır kaydırması bir sapma DEĞİL. */
const sadelestir = (metin: string): string => metin.replace(/\s+/g, ' ').trim();

const KARARLAR = readFileSync(join(KOK, 'docs/DECISIONS.md'), 'utf8');
const SIFRE_FORMU_HAM = readFileSync(join(KOK, 'src/components/panel/sifre-formu.tsx'), 'utf8');
const SIFRE_FORMU = yorumsuz(SIFRE_FORMU_HAM);

/**
 * ADR-035'in bağlayıcı cümlesini ADR metninden ayıklar.
 *
 * Hedef, "Kullanıcıya söylenebilecek cümle — BAĞLAYICI" başlığından sonraki
 * İLK alıntı bloğu (`> **"…"**`). Blok birden çok satıra sarılı olabilir;
 * `> ` işaretleri, kalınlaştırma yıldızları ve kuşatan tırnaklar atılıyor.
 */
function adrCumlesi(): string {
  const baslikIndeksi = KARARLAR.indexOf('### Kullanıcıya söylenebilecek cümle — BAĞLAYICI');
  if (baslikIndeksi < 0) return '';

  const satirlar = KARARLAR.slice(baslikIndeksi).split('\n');
  const basla = satirlar.findIndex((s) => /^>\s*\*\*"/.test(s));
  if (basla < 0) return '';

  const blok: string[] = [];
  for (const satir of satirlar.slice(basla)) {
    if (!satir.startsWith('>')) break;
    blok.push(satir.replace(/^>\s?/, ''));
  }

  return sadelestir(blok.join(' ')).replace(/\*\*/g, '').replace(/^"|"$/g, '').trim();
}

/**
 * `ADR_035_MESAJ` sabitinin değeri — parça parça yazılmış olabilir, birleştirilir.
 *
 * ⚠️ "`=` ile `;` ARASINI OKU" YAKLAŞIMI YANLIŞTI ve ilk koşumda düştü:
 * ADR'nin cümlesinin İÇİNDE noktalı virgül var ("…artık değişiklik yapamaz;
 * değişiklik yapmak için…"), yani deseni dizenin ORTASINDA kesiyordu ve
 * ayıklama boş dize döndürüyordu. Boş dizede her negatif iddia doğru çıkar —
 * tam olarak bu dosyanın önkoşul bloğunun yakalamak için var olduğu hâl.
 *
 * Doğru okuma: `=`den sonra dize DEĞİŞMEZLERİNİ sırayla tüket, araya giren
 * `+` işleçlerini yut, ilk değişmez olmayan belirteçte dur. Böylece hem tek
 * satırlık hâl hem çok parçalı birleştirme doğru okunuyor ve dizenin içeriği
 * ayrıştırmayı hiç etkilemiyor.
 */
function sabitinDegeri(): string {
  const basla = /const ADR_035_MESAJ\s*=\s*/.exec(SIFRE_FORMU);
  if (!basla) return '';

  let kalan = SIFRE_FORMU.slice(basla.index + basla[0].length);
  const parcalar: string[] = [];

  for (;;) {
    const parca = /^(['"`])((?:\\.|(?!\1)[\s\S])*)\1/.exec(kalan);
    if (!parca) break;

    /* Desen eşleştiyse 2. grup HER ZAMAN var (boş olabilir ama tanımsız
       olamaz); `?? ''` yalnızca `noUncheckedIndexedAccess` içindir. */
    parcalar.push(parca[2] ?? '');
    kalan = kalan.slice(parca[0].length).replace(/^\s*\+?\s*/, '');
  }

  return sadelestir(parcalar.join(''));
}

/* ===========================================================================
 * ÖNKOŞULLAR — TARAMA GERÇEKTEN ÇALIŞIYOR MU
 * ======================================================================== */

describe('önkoşul — iki kaynak da okundu ve ayıklama tuttu', () => {
  /*
   * Bu blok olmadan her şey vakuma düşebilir: dosya taşınsa, başlık
   * yeniden adlandırılsa ya da sabit yeniden adlandırılsa ayıklama boş dize
   * döner — ve "boş dizede yasak ifade yok" her zaman doğrudur. §8.18
   * daraltmasının dersi (T-049g): negatif iddia, önce POZİTİF bir çapaya
   * bağlanmadan hiçbir şey ölçmez.
   */
  it('ADR-035 bloğundan bağlayıcı cümle ayıklanabiliyor', () => {
    const cumle = adrCumlesi();

    expect(
      cumle.length,
      'ADR-035 bağlayıcı cümlesi ayıklanamadı — başlık ya da alıntı bloğu değişmiş olabilir. ' +
        'Bu dosyanın TÜM iddiaları o cümleye dayanıyor; ayıklama bozulduysa kapı hiçbir şey ölçmez.',
    ).toBeGreaterThan(120);
    expect(cumle).toContain('Şifreniz değiştirildi');
  });

  it('`ADR_035_MESAJ` sabiti bileşende bulunuyor', () => {
    expect(
      sabitinDegeri().length,
      'Sabit okunamadı — adı değişmiş ya da silinmiş olabilir. ' +
        'SABİTİ TAMAMEN SİLEN bir değişiklik, yalnızca "yasak ifade yok" diyen ' +
        'bir kapıyı YEŞİL bırakırdı; bu iddia tam o boşluğu kapatıyor.',
    ).toBeGreaterThan(120);
  });

  it('yorum sıyırma gerçekten gerekli — yasak cümle YORUMDA alıntılanıyor', () => {
    /*
     * Bu iddia bir tasarım kararını kilitliyor. `sifre-formu.tsx`in blok
     * yorumu yasağı AÇIKÇA alıntılıyor ("Tüm cihazlardan çıkış yapıldı"
     * YASAK). Ham dosyada tarama yapan bir kapı bu yüzden HER ZAMAN kırmızı
     * olurdu ve "kapıyı sustur" baskısı doğardı. Sıyırma teorik bir önlem
     * değil, ölçülmüş bir ihtiyaç.
     */
    expect(SIFRE_FORMU_HAM.toLowerCase()).toContain('tüm cihazlardan çıkış yapıldı');
    expect(SIFRE_FORMU.toLowerCase()).not.toContain('tüm cihazlardan çıkış yapıldı');
  });
});

/* ===========================================================================
 * POZİTİF — SABİT, ADR'NİN CÜMLESİNİ BİREBİR TAŞIYOR
 * ======================================================================== */

describe('ADR-035 — bağlayıcı metin bileşende BİREBİR duruyor', () => {
  it('sabit, ADR bloğundaki cümleyle AYNI', () => {
    expect(
      sabitinDegeri(),
      'Bileşendeki metin ADR-035 bloğundaki cümleden SAPTI. İkisinden biri ' +
        'değiştiyse diğeri de güncellenmeli — sapma hangisi olursa olsun, ' +
        'kullanıcıya verilen söz artık kararın söylediği söz değil.',
    ).toBe(adrCumlesi());
  });

  /**
   * ÜÇ ATLANAMAZ ÖĞE — ADR bunları tek tek sayıyor.
   *
   * Birebir eşitlik iddiası bunları zaten kapsıyor; ayrıca yazılmalarının
   * sebebi TEŞHİS: cümle bir gün meşru bir sebeple yenilenirse (üslup,
   * yazım) yukarıdaki iddia "saptı" der ama NEYİN kaybolduğunu söylemez.
   * Bu üçü kaybolduğunda hata mesajı doğrudan onu gösteriyor — ve bu üçü
   * üslup değil, ANLAM taşıyor.
   */
  it('"bu cihaz dahil" ATLANMAMIŞ', () => {
    /*
     * ADR: "Cümlenin 'bu cihaz dahil' kısmı atlanamaz: kullanıcı şifre
     * değiştirdikten hemen sonra bir kaydetme denerse UNAUTHORIZED görecek ve
     * sebebini bilmeli." Atlanırsa kullanıcı kendi oturumunun da yetkisini
     * kaybettiğini bilmez ve hatayı bir ARIZA sanır.
     */
    expect(sabitinDegeri().toLowerCase()).toContain('bu cihaz dahil');
  });

  it('"oturumlar kapatılmadı" sınırı SÖYLENİYOR', () => {
    // ADR-035/C F6'ya bırakıldı; bu ibare sözün sınırını çiziyor.
    expect(sabitinDegeri().toLowerCase()).toContain('oturumlar kapatılmadı');
  });

  it('kullanıcıya NE YAPACAĞI söyleniyor — yeniden giriş', () => {
    expect(sabitinDegeri().toLowerCase()).toContain('yeniden giriş');
  });
});

/* ===========================================================================
 * NEGATİF — YASAK İFADELER PANEL METİNLERİNDE YOK
 * ======================================================================== */

/**
 * KADEME 1 — BAĞLAMDAN BAĞIMSIZ YANLIŞ.
 *
 * Bu ifadeler ÇOK OTURUM / ÇOK CİHAZ kapanışı iddia ediyor ve ADR-035/C
 * yapılmadığı sürece hiçbir bağlamda doğru olamazlar. Üçü ADR'nin kendi
 * yasak listesinden, kalanı aynı iddianın bu projede yazılabilecek
 * varyantları.
 */
const YASAK_HER_YERDE = [
  'tüm cihazlardan çıkış',
  'diğer oturumlar sonlandırıldı',
  'diğer cihazlar çıkış yaptı',
  'oturumlar kapatıldı',
  'oturumlar sonlandırıldı',
  'oturumlarınız kapatıldı',
  'tüm oturumlar kapatıldı',
  'cihazlardan çıkış yapıldı',
  'diğer cihazlar çıkış',
  'bütün cihazlardan çıkış',
] as const;

/**
 * KADEME 2 — YALNIZCA ŞİFRE FORMUNDA yanlış.
 *
 * "Çıkış yapıldı" tek başına yanlış DEĞİL: kullanıcı çıkış düğmesine bastıysa
 * doğrudur. Yanlış olan, onu ŞİFRE DEĞİŞTİRMENİN sonucu olarak söylemek.
 * Bu yüzden iki kademe var — tek kademeli bir liste ya gerçek bir çıkış
 * metnini haksız yere kırmızıya çevirirdi (ileride), ya da bu bağlamdaki
 * yanlışı kaçırırdı.
 *
 * ÖLÇÜLDÜ: bugün panelde meşru bir "çıkış yapıldı" metni YOK — çıkış düğmesi
 * `src/components/auth/sign-out-button.tsx`te ve mesaj basmıyor, doğrudan
 * `/giris`e yönlendiriyor. Yani kademe 2 bugün için fazladan bir kısıt
 * getirmiyor; ayrımın sebebi gelecekteki meşru metni haksız düşürmemek.
 */
const YASAK_SIFRE_FORMUNDA = ['çıkış yapıldı', 'oturumunuz kapatıldı', 'çıkış yaptınız'] as const;

function panelKaynaklari(): { yol: string; kod: string }[] {
  const dosyalar: string[] = [];
  const gez = (dizin: string): void => {
    for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
      const yol = join(dizin, girdi.name);
      if (girdi.isDirectory()) gez(yol);
      else if (/\.tsx?$/.test(girdi.name)) dosyalar.push(yol);
    }
  };
  gez(join(KOK, 'src/app/(panel)'));
  gez(join(KOK, 'src/components/panel'));

  return dosyalar.map((yol) => ({
    yol: yol.slice(KOK.length + 1),
    kod: yorumsuz(readFileSync(yol, 'utf8')).toLowerCase(),
  }));
}

describe('§8.20 · tutulamayacak söz hiçbir panel metninde YOK', () => {
  const kaynaklar = panelKaynaklari();

  it('tarama gerçekten dosya okudu', () => {
    // Dizin adı değişirse (`(panel)` grubu) liste boşalır ve her negatif
    // iddia boşa koşar — bu çapa o sessiz hâli engelliyor.
    expect(
      kaynaklar.length,
      'panel kaynağı bulunamadı — dizin yapısı değişmiş olabilir',
    ).toBeGreaterThan(20);
    expect(kaynaklar.some((k) => k.yol.endsWith('sifre-formu.tsx'))).toBe(true);
  });

  it('ADR-035 hâlâ bu ifadeleri YASAKLIYOR — kapının önermesi taze', () => {
    /*
     * Kapının dayandığı önerme ADR'de yazılı. Önerme bir gün değişirse
     * (örneğin C katmanı gelir ve "çıkış yapıldı" DOĞRU olur) bu kapı
     * gereksizleşir ve o anda kırmızıya dönmesi DOĞRU davranış: kaldırma
     * kararı ölçümle verilsin, kapı sessizce yanlış bir şeyi savunmasın.
     * T-054g'nin dersi — "kapı çalışıyor ama önermesi bayat" sınıfı.
     */
    expect(KARARLAR).toContain('"Tüm cihazlardan çıkış yapıldı"');
    expect(KARARLAR).toContain('yasak');
  });

  for (const yasak of YASAK_HER_YERDE) {
    it(`"${yasak}" hiçbir panel dosyasında geçmiyor`, () => {
      const suclular = kaynaklar.filter((k) => k.kod.includes(yasak)).map((k) => k.yol);

      expect(
        suclular,
        `"${yasak}" şu dosyalarda geçiyor: ${suclular.join(', ')}\n` +
          "ADR-035/C (okumaların kapatılması) F6'ya bırakıldı, yani bu cümle " +
          'kullanıcıya TUTULMAYAN bir söz verir. İzin verilen biçim ADR-035 → ' +
          '"Kullanıcıya söylenebilecek cümle — BAĞLAYICI" başlığında.',
      ).toEqual([]);
    });
  }

  for (const yasak of YASAK_SIFRE_FORMUNDA) {
    it(`"${yasak}" şifre formunda geçmiyor`, () => {
      expect(
        SIFRE_FORMU.toLowerCase().includes(yasak),
        `"${yasak}" şifre formunda geçiyor. Bu ifade başka bir bağlamda ` +
          '(gerçek bir çıkış işlemi) doğru olabilir ama ŞİFRE DEĞİŞTİRMENİN ' +
          'sonucu olarak yanlıştır — yazma yetkisi kalkar, oturum kapanmaz.',
      ).toBe(false);
    });
  }

  it('olumsuzlama yakalanmıyor — "kapatılmadı", "kapatıldı" sanılmıyor', () => {
    /*
     * Liste "oturumlar kapatıldı"yı yasaklıyor; sabitin kendisi ise
     * "Oturumlar kapatılmadı" diyor. Alt dize araması bu ikisini
     * karıştırmıyor ("kapatılmadı" içinde "kapatıldı" YOK) ama bu
     * sessiz bir bağımlılık: yasak ifade bir gün "kapatıl" diye
     * kısaltılsaydı kapı DOĞRU metni suçlardı. İddia o riski kilitliyor.
     */
    expect('oturumlar kapatılmadı'.includes('oturumlar kapatıldı')).toBe(false);
    expect(sabitinDegeri().toLowerCase()).not.toContain('oturumlar kapatıldı');
  });
});
