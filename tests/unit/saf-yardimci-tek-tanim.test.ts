import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * SAF `_shared` YARDIMCILARININ YEREL KOPYASI — SINIFI KAPATAN KAPI (T-107a).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR KAPI — BACKEND'İNKİ NEYİ KAPSAMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `tests/unit/services/para-tek-tanim.test.ts` (T-101, Backend) çiftlenmeyi
 * ölçüyor ve iyi kurulmuş: vakum koruması var, deseni SİLİNEN kopyanın gerçek
 * metnine karşı sınanmış. Denetledim, iddiaları doğru.
 *
 * Kapsamadığı şey LİSTESİNİN SABİT OLMASI: dört ad elle yazılmış
 * (`computeBaseAmount`, `deriveBaseAmount`, `sumMoney`, `subtractMoney`).
 * `money.ts` beşinci bir işlev ihraç ettiğinde kapı onu GÖRMEZ, ve `_shared`
 * altındaki diğer saf modüller (`app-date`, `decimal`, `site-url`) hiç
 * kapsanmıyordu.
 *
 * Bu, projede üçüncü kez rastladığım "SAYILI OLANLAR" kalıbı: rota kapsamı
 * haritası, `Decimal` dedektörünün çağrı yerleri, ve şimdi bu. Çözüm her
 * seferinde aynı: listeyi ELLE YAZMA, KAYNAKTAN TÜRET.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * "SAF" ÖLÇÜLEBİLİR BİR ÖLÇÜT — VE SINIFIN KÖKÜ TAM ORADA
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Üç örneğin üçünde de kopyalama sebebi aynıydı: **içe aktarma zinciri pahalı
 * ya da imkânsız görünüyordu.** `prisma/seed.ts` düz Node ile koşuyor ve
 * `job.ts` Prisma'yı zincire soktuğu için kuralı yeniden yazmıştı. Yani risk
 * bir modülün SAF olup olmamasıyla ölçülüyor: saf bir modül her yerden
 * okunabilir, dolayısıyla kopyasının HİÇBİR teknik mazereti yok.
 *
 * Saflık burada varsayılmıyor, ÖLÇÜLÜYOR: dosyada hiç `^import` satırı yok.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ BU KAPININ ÖLÇTÜĞÜ ŞEY AD ÇİFTLENMESİ — KURAL ÇİFTLENMESİ DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-037'nin dili: olgu ile çıkarım ayrışır.
 *
 *   OLGU    — ihraç edilen adların hiçbiri başka yerde TANIMLI değil (ölçülüyor)
 *   ÇIKARIM — "o hâlde kural tek kaynakta" — **BU ÇIKARIM YANLIŞ**
 *
 * Çıkarımın yanlış olduğu varsayılmıyor, ÖLÇÜLDÜ: `_shared/personal-record.ts`
 * `compareDecimalStrings` adıyla `money.ts`in ölçekli tamsayı dönüşümünü
 * yeniden yazıyor (yorumu bile "kuruş mantığının kilo hâli" diyor). Farklı ad
 * taşıdığı için bu kapı onu GÖRMEZ. Sınıfın beşinci örneğini yakalamak için
 * aşağıdaki ikinci blok var — o ADA değil BİÇİME bakıyor.
 */

const KOK = resolve(__dirname, '..', '..');
const SAF_DIZIN = 'src/server/services/_shared';

/** Yorumlar ayıklanmış kod — gerekçe metinleri assert'leri yanıltmasın (T-040). */
function kod(yol: string): string {
  return readFileSync(join(KOK, yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

function tsDosyalari(dizin: string, toplanan: string[] = []): string[] {
  for (const ad of readdirSync(join(KOK, dizin))) {
    const yol = join(dizin, ad);
    if (statSync(join(KOK, yol)).isDirectory()) {
      // Üretilmiş istemci ve göçler bizim yazdığımız kod değil.
      if (ad === 'generated' || ad === 'node_modules' || ad === 'migrations') continue;
      tsDosyalari(yol, toplanan);
      continue;
    }
    if (/\.tsx?$/.test(ad)) toplanan.push(yol);
  }
  return toplanan;
}

/** İçinde hiç `import` olmayan `_shared` modülleri — ihraçlarıyla birlikte. */
function safModuller(): { yol: string; adlar: string[] }[] {
  const sonuc: { yol: string; adlar: string[] }[] = [];

  for (const ad of readdirSync(join(KOK, SAF_DIZIN))) {
    // `index.ts` bir barrel: yalnızca yeniden ihraç eder, tanım taşımaz.
    if (!ad.endsWith('.ts') || ad === 'index.ts') continue;

    const yol = join(SAF_DIZIN, ad);
    const kaynak = kod(yol);
    if (/^import\s/m.test(kaynak)) continue;

    const adlar = [
      ...new Set(
        [...kaynak.matchAll(/export\s+(?:async\s+)?(?:function|const|let)\s+([A-Za-z_]\w*)/g)].map(
          (m) => m[1] ?? '',
        ),
      ),
    ].filter(Boolean);

    sonuc.push({ yol, adlar });
  }

  return sonuc;
}

/**
 * Bir adın YEREL TANIMINI arayan desen — dört biçim.
 *
 * Backend'in deseni ilk ikisini tanıyordu. Üç ve dördüncü biçim (sınıf metodu
 * ve nesne özelliği) T-107a'da eklendi: ölçtüm, bugün hiçbir yerde yok, yani
 * ekleme sahte pozitif üretmiyor — ama `{ computeBaseAmount: (a, b) => … }`
 * biçimi bir gün yazılırsa eski desen onu KAÇIRIRDI.
 */
function yerelTanimDeseni(ad: string): RegExp {
  const k = ad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    [
      `function\\s+${k}\\b`, // function x() {}
      `(?:const|let|var)\\s+${k}\\s*[:=]`, // const x = …
      `^\\s*(?:private\\s+|public\\s+|static\\s+)*${k}\\s*\\([^)]*\\)\\s*[:{]`, // sınıf metodu
      `^\\s*${k}\\s*:\\s*(?:function\\b|\\([^)]*\\)\\s*=>|async\\b)`, // nesne özelliği
    ].join('|'),
    'm',
  );
}

/** Taranacak birim: yol + yorumsuz kaynak. Saf çekirdek bunun üzerinden çalışır. */
interface Kaynak {
  yol: string;
  kaynak: string;
}

/**
 * ÇEKİRDEK SAF — ve bu kasıtlı.
 *
 * Kapının kendisini mutasyonla sınamanın tek dürüst yolu, ona İHLAL İÇEREN bir
 * girdi vermek. Dosya sisteminden okuyan bir kapıda bu, başka bir ajanın
 * dosyasını geçici olarak bozmak demek olurdu — ADR-038'in doğduğu olayın ta
 * kendisi. Çekirdek saf olduğu için ihlal SENTETİK girdiyle üretilebiliyor:
 * kimsenin dosyasına dokunulmuyor ve mutasyon kanıtı CI'da her koşumda
 * yeniden üretiliyor, bir kerelik elle yapılan deney olarak kalmıyor.
 */
function ihlalleriBul(
  dosyalar: readonly Kaynak[],
  moduller: readonly { yol: string; adlar: readonly string[] }[],
): string[] {
  const ihlaller: string[] = [];

  for (const { yol: kanonik, adlar } of moduller) {
    for (const hedef of dosyalar) {
      if (hedef.yol === kanonik) continue;
      for (const ad of adlar) {
        if (yerelTanimDeseni(ad).test(hedef.kaynak)) {
          ihlaller.push(`${hedef.yol} → ${ad} (kanonik: ${kanonik})`);
        }
      }
    }
  }

  return ihlaller;
}

describe('ADR-037 — saf `_shared` yardımcıları TEK TANIM (sınıf kapısı)', () => {
  const moduller = safModuller();
  const dosyalar = tsDosyalari('src').concat(tsDosyalari('prisma'));

  it('tarama vakum değil — saf modüller ve dosyalar gerçekten bulundu', () => {
    /*
     * Üç çapa. Biri bile tutmazsa aşağıdaki iddia "boş kümede ihlal yok" der
     * ve hiçbir şey ölçmez — T-055g'de kendi kapımda yakaladığım hâlin aynısı.
     */
    expect(moduller.length, 'saf `_shared` modülü bulunamadı').toBeGreaterThan(4);
    expect(dosyalar.length, 'taranacak kaynak dosya bulunamadı').toBeGreaterThan(100);
    expect(dosyalar).toContain('prisma/seed.ts');

    const money = moduller.find((m) => m.yol.endsWith('money.ts'));
    expect(money, '`money.ts` saf modül olarak görülmüyor').toBeDefined();
    expect(money?.adlar).toEqual(
      expect.arrayContaining([
        'computeBaseAmount',
        'deriveBaseAmount',
        'sumMoney',
        'subtractMoney',
      ]),
    );
  });

  it('LİSTE TÜRETİLİYOR — `money.ts` dışındaki saf modüller de kapsanıyor', () => {
    /*
     * Backend'in kapısı yalnızca dört para adını biliyordu. Bu iddia
     * genişlemenin GERÇEKLEŞTİĞİNİ ölçüyor: başka saf modüllerin adları da
     * korunuyor, yani kapsam elle büyütülmek zorunda değil.
     */
    const kapsanan = new Set(moduller.flatMap((m) => m.adlar));

    expect(kapsanan.has('getSiteUrl'), 'site-url kapsanmıyor').toBe(true);
    expect(kapsanan.has('toMoneyString'), 'decimal kapsanmıyor').toBe(true);
    expect(kapsanan.has('appToday'), 'app-date kapsanmıyor').toBe(true);
    expect(kapsanan.size, 'türetilen ad kümesi beklenenden küçük').toBeGreaterThan(25);
  });

  it('⚠️ HİÇBİR BAŞKA DOSYA saf bir yardımcının adını TANIMLAMIYOR', () => {
    const ihlaller = ihlalleriBul(
      dosyalar.map((yol) => ({ yol, kaynak: kod(yol) })),
      moduller,
    );

    expect(
      ihlaller,
      'Saf bir `_shared` yardımcısı yerel olarak yeniden tanımlanmış:\n' +
        `${ihlaller.join('\n')}\n` +
        'Saf modül her yerden içe aktarılabilir — `prisma/seed.ts` dahil. ' +
        'Kopyanın teknik mazereti yok (ADR-037, T-101 / T-107a).',
    ).toEqual([]);
  });

  it('desen DÖRT tanım biçimini de yakalıyor, çağrı ve içe aktarmayı YAKALAMIYOR', () => {
    /*
     * ⚠️ VAKUM OLMAMA KANITI — iki yönlü.
     *
     * Yukarıdaki iddia bugün yeşil ve hiçbir şeyi yakalamayan bir desenle de
     * yeşil kalırdı. Pozitif örnekler `prisma/seed.ts`ten SİLİNEN gerçek
     * kopyanın metni ve onun üç varyantı; negatif örnekler meşru kullanım.
     */
    const d = (metin: string): boolean => yerelTanimDeseni('computeBaseAmount').test(metin);

    // Pozitif — dört tanım biçimi
    expect(d('function computeBaseAmount(amount: string, fxRate: string): string {')).toBe(true);
    expect(d('const computeBaseAmount = (a: string, b: string) => a;')).toBe(true);
    expect(d('  computeBaseAmount(a: string, b: string): string {')).toBe(true);
    expect(d('  computeBaseAmount: (a: string, b: string) => a,')).toBe(true);

    // Negatif — meşru kullanım tanım DEĞİL
    expect(d("import { computeBaseAmount } from '@/server/services/_shared/money';")).toBe(false);
    expect(d('const x = computeBaseAmount(a, b);')).toBe(false);
    expect(d('baseAmount: computeBaseAmount(input.amount, input.fxRate),')).toBe(false);
    expect(d('export { computeBaseAmount };')).toBe(false);
  });

  /* ═══ MUTASYON — SENTETİK İHLAL, KİMSENİN DOSYASINA DOKUNMADAN ═══════ */

  it('MUTASYON · para adının yerel kopyası yakalanıyor', () => {
    const ihlaller = ihlalleriBul(
      [
        { yol: 'prisma/seed.ts', kaynak: 'function computeBaseAmount(a: string, b: string) {}' },
        { yol: 'src/temiz.ts', kaynak: "import { sumMoney } from '@/x';\nsumMoney([]);" },
      ],
      [{ yol: SAF_DIZIN + '/money.ts', adlar: ['computeBaseAmount', 'sumMoney'] }],
    );

    expect(ihlaller).toHaveLength(1);
    expect(ihlaller[0]).toContain('prisma/seed.ts → computeBaseAmount');
  });

  it('MUTASYON · PARA DIŞI saf yardımcının kopyası da yakalanıyor', () => {
    /*
     * Backend'in kapısının kapsamadığı tam yer burası: listesi dört PARA adına
     * sabitti. Bu iddia, türetilen listenin gerçekten genişlediğini ihlal
     * ÜRETEREK kanıtlıyor — "liste büyük" demek yetmez, büyüyen kısmın da
     * ısırdığı gösterilmeli.
     */
    const ihlaller = ihlalleriBul(
      [{ yol: 'src/app/blog/okuma.ts', kaynak: 'const calculateReadingMinutes = (n) => n / 200;' }],
      [{ yol: SAF_DIZIN + '/reading-time.ts', adlar: ['calculateReadingMinutes'] }],
    );

    expect(ihlaller).toHaveLength(1);
    expect(ihlaller[0]).toContain('calculateReadingMinutes');
  });

  it('MUTASYON · kanonik modülün KENDİ tanımı ihlal sayılmıyor', () => {
    // Ters yön: kanonik dosya kendi adını tanımlar ve bu DOĞRU olandır.
    // Bu iddia olmadan "her şeyi ihlal sayan" bir çekirdek de yeşil kalırdı.
    const kanonik = SAF_DIZIN + '/money.ts';
    const ihlaller = ihlalleriBul(
      [{ yol: kanonik, kaynak: 'export function computeBaseAmount(a: string) { return a; }' }],
      [{ yol: kanonik, adlar: ['computeBaseAmount'] }],
    );

    expect(ihlaller).toEqual([]);
  });
});

/* ===========================================================================
 * İKİNCİ BLOK — ADA DEĞİL BİÇİME BAKAN KAPI
 * ======================================================================== */

/**
 * ÖLÇEKLİ TAMSAYI ARİTMETİĞİ YALNIZCA `money.ts`TE (+ gerekçeli istisna).
 *
 * Yukarıdaki kapı ad çiftlenmesini ölçüyor; bu blok KURAL çiftlenmesinin
 * ölçülebilir izini arıyor: ondalık dizeyi `BigInt`e ölçekleyip tamsayı
 * aritmetiği yapmak. ADR-014'ün tekniği tam bu ve `money.ts`in dışında
 * tekrarlanması, kuralın ikinci bir kopyası demektir — adı ne olursa olsun.
 *
 * ⚠️ BUGÜN BİR İSTİSNA VAR VE SÜRESİZ DEĞİL: `_shared/personal-record.ts`
 * `compareDecimalStrings` içinde aynı dönüşümü yapıyor. Bu kapı onun için
 * gerekçeli bir satır taşıyor; ÜÇÜNCÜ bir dosya eklendiğinde kırmızıya döner.
 *
 * §8.24'ün süreli istisna mekanizmasının kod tarafındaki karşılığı: istisna
 * KAYITLI, GEREKÇELİ ve kaldırma koşulu yazılı — susturulmuş değil.
 */
/**
 * ⚠️ LİSTE BOŞ — BULGU-024 KAPANDI (T-102) VE KAPI KENDİLİĞİNDEN DARALDI.
 *
 * Burada `_shared/personal-record.ts` için gerekçeli bir istisna duruyordu.
 * Kaldırma koşulu şöyle yazılmıştı: *"`money.ts` ölçekleme ilkelini ihraç eder
 * ve bu dosya onu içe aktarır — o gün bu satır silinir."*
 *
 * T-102'de koşul karşılandı: `toScaledInt` ihraç edildi, `compareDecimalStrings`
 * onu içe aktardı, yerel kopya silindi. Ve ⚠️ İSTİSNAYI SİLMEYİ BANA BU KAPI
 * SÖYLEDİ: "istisna listesi ÖLÜ SATIR taşımıyor" iddiası kırıldı ve mesajı
 * "BULGU-024 istisnası ÖLÜ, silinmeli" dedi. Yani mekanizma iki yönde de
 * çalışıyor — kopya eklenirse de, kopya kalkıp istisna ölürse de.
 *
 * Teşhisin değeri kaydedilmeye değer: kopya bir dikkatsizlik DEĞİLDİ, kanonik
 * modülün eksiğiydi. İhraç edilmeyen bir şey içe aktarılamaz.
 *
 * Liste boş kalınca kapı artık "money.ts DIŞINDA ölçekli aritmetik YOK" diyor —
 * istisnasız. Yeni bir istisna yazan kişi gerekçeyi ve KALDIRMA KOŞULUNU
 * buraya yazmak zorunda (§8.24 kalıbı).
 */
const OLCEKLI_ARITMETIK_ISTISNALARI: { yol: string; kayit: string; gerekce: string }[] = [];

/**
 * İstisna mekanizmasının SENTETİK sınanması için sabit bir yol.
 *
 * ⚠️ NEDEN GEREKLİ: aşağıdaki iki mutasyon testi eskiden
 * `OLCEKLI_ARITMETIK_ISTISNALARI[0]?.yol ?? ''` yazıyordu. Liste boşalınca o
 * ifade `''` döner ve İKİ TEST DE SESSİZCE ANLAMINI YİTİRİRDİ — biri boş yolu
 * izinli kümeye koyup hiçbir şeyi ölçmez, diğeri boş yolu yakalayıp "mekanizma
 * çalışıyor" der. Yeşil kalırlar ve hiçbir şey korumazlar (T-050'de ölçülen
 * sınıf).
 *
 * Mekanizma artık canlı bir istisnaya BAĞLI DEĞİL: sentetik bir yolla iki
 * yönde sınanıyor, yani liste boşken de kanıtlı kalıyor.
 */
const SENTETIK_ISTISNA_YOLU = 'src/server/services/_shared/ornek-istisna.ts';

describe('ADR-014 — ölçekli tamsayı aritmetiği tek yerde (biçim kapısı)', () => {
  const KANONIK = 'src/server/services/_shared/money.ts';
  const dosyalar = tsDosyalari('src').concat(tsDosyalari('prisma'));

  /** `BigInt(` kullanımı — ölçekli aritmetiğin ölçülebilir izi. */
  const BIGINT_IZI = /\bBigInt\s*\(|\b\d+n\b/;

  it('tarama vakum değil — kanonik modülde iz GERÇEKTEN var', () => {
    // İz kanonikte bulunamıyorsa desen bozulmuş demektir ve aşağıdaki iddia
    // "hiçbir yerde yok" diye yanlış sebeple yeşile döner.
    expect(BIGINT_IZI.test(kod(KANONIK)), 'ölçekli aritmetik izi `money.ts`te bulunamadı').toBe(
      true,
    );
    expect(dosyalar).toContain(KANONIK);
  });

  it('istisna listesi ÖLÜ SATIR taşımıyor — kayıtlı dosyada iz hâlâ var', () => {
    /*
     * §8.24 kapısının "artık bildirilmeyen istisna → kırmızı" dalının aynısı.
     * Backend ölçeklemeyi bir gün kaldırırsa bu satır ölür; ölü istisna bir
     * gün yaşayan bir kopyayı maskeler.
     */
    for (const istisna of OLCEKLI_ARITMETIK_ISTISNALARI) {
      expect(dosyalar, `istisna satırındaki dosya yok: ${istisna.yol}`).toContain(istisna.yol);
      expect(
        BIGINT_IZI.test(kod(istisna.yol)),
        `${istisna.yol} artık ölçekli aritmetik yapmıyor — ${istisna.kayit} istisnası ÖLÜ, silinmeli`,
      ).toBe(true);
      expect(istisna.gerekce.length, 'gerekçesiz istisna yazılmaz').toBeGreaterThan(80);
    }
  });

  /** Saf çekirdek — mutasyon sentetik girdiyle sınanabilsin diye (ADR-038). */
  const kacaklariBul = (dosyalar: readonly Kaynak[], izinli: ReadonlySet<string>): string[] =>
    dosyalar.filter((d) => !izinli.has(d.yol) && BIGINT_IZI.test(d.kaynak)).map((d) => d.yol);

  it('MUTASYON · üçüncü bir dosya ölçekleme yaparsa yakalanıyor', () => {
    // Sentetik istisna (gerekçe `SENTETIK_ISTISNA_YOLU`nun yanında): mekanizma
    // canlı bir istisna satırına bağlı kalmadan iki yönde sınanıyor.
    const izinli = new Set([KANONIK, SENTETIK_ISTISNA_YOLU]);

    const kacaklar = kacaklariBul(
      [
        { yol: KANONIK, kaynak: 'const x = BigInt("10");' },
        { yol: SENTETIK_ISTISNA_YOLU, kaynak: 'BigInt(whole + fraction);' },
        { yol: 'src/server/services/health.ts', kaynak: 'const kilo = BigInt(tam + kesir);' },
        { yol: 'src/server/services/temiz.ts', kaynak: 'const toplam = sumMoney(values);' },
      ],
      izinli,
    );

    // Kanonik ve KAYITLI istisna geçiyor, YENİ dosya yakalanıyor, temiz dosya değil.
    expect(kacaklar).toEqual(['src/server/services/health.ts']);
  });

  it('MUTASYON · istisna satırı KALDIRILIRSA kayıtlı dosya da yakalanıyor', () => {
    /*
     * İstisnanın YÜK TAŞIDIĞININ kanıtı. Bu iddia olmadan istisna mekanizması
     * dekoratif olabilirdi: hiçbir şeyi geçirmeyen bir liste de yeşil kalırdı.
     */
    const kacaklar = kacaklariBul(
      [{ yol: SENTETIK_ISTISNA_YOLU, kaynak: 'BigInt(whole + fraction);' }],
      new Set([KANONIK]),
    );

    expect(kacaklar).toEqual([SENTETIK_ISTISNA_YOLU]);
  });

  it('⚠️ İSTİSNA LİSTESİ BUGÜN BOŞ — kapı istisnasız (BULGU-024 kapandı)', () => {
    /*
     * Durumu SABİTLİYOR: biri yeni bir istisna eklerse bu iddia kırılır ve
     * eklemenin görünür olmasını zorlar. Gerekçesiz/koşulsuz bir istisna
     * sessizce listeye giremez.
     */
    expect(OLCEKLI_ARITMETIK_ISTISNALARI).toEqual([]);
  });

  it('⚠️ `money.ts` DIŞINDA kayıtsız ölçekli aritmetik YOK', () => {
    const izinli = new Set([KANONIK, ...OLCEKLI_ARITMETIK_ISTISNALARI.map((i) => i.yol)]);

    const kacaklar = kacaklariBul(
      dosyalar.map((yol) => ({ yol, kaynak: kod(yol) })),
      izinli,
    );

    expect(
      kacaklar,
      `Ölçekli tamsayı aritmetiği money.ts DIŞINDA: ${kacaklar.join(', ')}\n` +
        'ADR-014 bu tekniği tek yerde tutuyor. İkinci bir kopya, ADI FARKLI OLSA BİLE ' +
        'kuralın ikinci kaynağıdır (T-107a: `compareDecimalStrings` tam bu yüzden bulundu).',
    ).toEqual([]);
  });
});
