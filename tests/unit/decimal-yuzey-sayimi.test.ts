import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `Decimal` KAÇAĞI — HANGİ YÜZEYLER ÖLÇÜLÜYOR (T-107a).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KARTIN SORUSU VE ÖLÇÜLEN CEVAP
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kart şunu sordu: *"dedektör TÜM DTO yüzeylerini geziyor mu, yoksa sayılı
 * üçünü mü?"*
 *
 * Ölçtüm; cevap ikisi de değil ve ayrım önemli:
 *
 *   `tests/unit/_helpers/decimal-kacak.ts` kendisine VERİLEN nesneyi tam
 *   geziyor — iç içe, dizi içinde, her derinlikte. Dedektör kusurlu değil.
 *   Kusur ÇAĞRI YERLERİNDE: ona yalnızca OKUMA yolları veriliyordu.
 *
 * T-107a ölçümü: `Decimal` sütunu olan modellere dokunan servislerde **12 DTO
 * yüzeyi** var, **6'sı** bir `decimalKalanlar` iddiasına bağlı değildi — ve
 * altısı da YAZMA yolu (`createJob`, `updateJob`, `changeJobStatus`,
 * `convertMessageToJob`, `createTransaction`, `updateTransaction`).
 *
 * Bugün sızıntı YOK çünkü yazma yolları okuma yollarının eşleyicisini
 * (`toJobDetailDto` / `toDetailDto`) paylaşıyor. Ama **paylaşımı hiçbir şey
 * ölçmüyordu**: satır içi eşleyen bir gelecek yazma yolu, bütün okuma
 * iddiaları yeşilken sızdırırdı. Bu kapı o paylaşımı ÖLÇÜYOR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN ŞEMADAN TÜRETİLİYOR — "SAYILI OLANLAR" KALIBINDAN ÇIKIŞ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yüzey listesini elle yazmak, çözdüğü sorunun aynısını üretirdi. İlk denemem
 * "hangi DTO para taşıyor"u DTO tiplerinin kaynağından çıkarmaktı ve
 * ÖLÇTÜM: sessizce eksik saydı (iç içe alan taşıyan `JobPanelDto` hiç
 * görünmedi). Çıkarımı kaynaktan tahmin etmek yerine YETKİLİ KAYNAĞA gitmek
 * gerekiyordu:
 *
 *   ⚠️ `Decimal` kaçağı ancak `Decimal` SÜTUNU olan bir modelden doğabilir.
 *
 * Yani `prisma/schema.prisma` bu sorunun tek yetkili cevabı. Liste oradan
 * türetiliyor ve sonucu şu: kapı **F5'i kendiliğinden kapsıyor.**
 * `Decimal` yalnızca para değil — `HealthLog.weightKg`, `sleepHours`,
 * `bodyFatPct`, `WorkoutSet.weightKg`, `PersonalRecord.weightKg` de `Decimal`
 * ve ADR-014'ün 3. kuralı hepsini kapsıyor. Sağlık/spor servisleri yazıldığı
 * gün bu kapı onların DTO yüzeylerini de sayacak ve iddia eklenene kadar
 * kırmızı kalacak. Elle güncellenmesi gereken hiçbir liste yok.
 */

const KOK = resolve(__dirname, '..', '..');
const SERVIS_DIZIN = 'src/server/services';

function kod(yol: string): string {
  return readFileSync(join(KOK, yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

/* ===========================================================================
 * SAF ÇEKİRDEK — mutasyon sentetik girdiyle sınanıyor (ADR-038)
 * ======================================================================== */

/** Şemadan `Decimal` sütunu taşıyan model adları. */
export function decimalModelleri(sema: string): string[] {
  const modeller: string[] = [];
  const blok = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;

  while ((m = blok.exec(sema)) !== null) {
    const govde = m[2] ?? '';
    const decimalVar = govde
      .split('\n')
      .some((satir) => /\bDecimal\b/.test(satir) && !/^\s*\/\//.test(satir));
    if (decimalVar && m[1]) modeller.push(m[1]);
  }

  return modeller;
}

/** `Job` → `job`: Prisma istemcisindeki özellik adı. */
const istemciAdi = (model: string): string => model.charAt(0).toLowerCase() + model.slice(1);

/** Dosyada `*Dto` döndüren ihraç edilmiş işlevler. */
export function dtoYuzeyleri(kaynak: string): string[] {
  const yuzeyler: string[] = [];
  const imza = /export\s+(?:async\s+)?function\s+(\w+)\s*\(/g;
  let m: RegExpExecArray | null;

  while ((m = imza.exec(kaynak)) !== null) {
    // Parametre listesini dengele, sonra `{`e kadar olan dönüş tipini oku.
    let i = imza.lastIndex;
    let derinlik = 1;
    while (i < kaynak.length && derinlik > 0) {
      if (kaynak[i] === '(') derinlik++;
      else if (kaynak[i] === ')') derinlik--;
      i++;
    }
    const govdeBasi = kaynak.indexOf('{', i);
    const donus = kaynak.slice(i, govdeBasi === -1 ? i : govdeBasi);

    // ⚠️ `\bDto\b` DEĞİL: `JobPanelDto` gibi adlarda "Foo|Dto" arasında sözcük
    // sınırı yok ve desen HİÇ eşleşmiyordu — tarama sıfır yüzey bulup boş kümede
    // yeşil kalıyordu. Sentetik mutasyon testi bunu yakaladı (T-107a).
    if (/Dto\b/.test(donus) && m[1]) yuzeyler.push(m[1]);
  }

  return yuzeyler;
}

/** Bir işlevin gövdesi — sonraki `export`a ya da dosya sonuna kadar. */
export function islevGovdesi(kaynak: string, ad: string): string {
  const basla = new RegExp(`export\\s+(?:async\\s+)?function\\s+${ad}\\s*\\(`).exec(kaynak);
  if (!basla) return '';

  const kalan = kaynak.slice(basla.index + basla[0].length);
  const sonraki = /\nexport\s/.exec(kalan);
  return sonraki ? kalan.slice(0, sonraki.index) : kalan;
}

/** Gövdenin çağırdığı YEREL eşleyiciler (`toXDto(` biçimi). */
export function cagirilanEsleyiciler(govde: string, esleyiciler: readonly string[]): string[] {
  return esleyiciler.filter((e) => new RegExp(`\\b${e}\\s*\\(`).test(govde));
}

/**
 * Ölçülmeyen yüzeyleri bulur.
 *
 * Bir yüzey iki yoldan KAPALI sayılır:
 *   1. DOĞRUDAN — adı bir `decimalKalanlar(...)` iddiasının içinde geçiyor
 *   2. DOLAYLI  — çağırdığı eşleyiciyi, aynı dosyada doğrudan kapalı bir yüzey
 *                 de çağırıyor; yani aynı serileştirme yolundan geçiyor
 *
 * ⚠️ İkinci yol bir ÇIKARIM DEĞİL, ÖLÇÜM. "Yazma yolları okumayla aynı
 * eşleyiciyi kullanıyor" cümlesi T-107a'ya kadar yazılı bir varsayımdı;
 * burada kaynaktan doğrulanıyor. Yazma yolu satır içi eşlemeye geçtiği an
 * paylaşım kaybolur ve yüzey ölçülmeyen listesine düşer (ADR-037).
 */
export function olculmeyenYuzeyler(girdi: {
  kaynak: string;
  yuzeyler: readonly string[];
  esleyiciler: readonly string[];
  dogrudanKapali: ReadonlySet<string>;
}): string[] {
  const { kaynak, yuzeyler, esleyiciler, dogrudanKapali } = girdi;

  // Doğrudan kapalı yüzeylerin dokunduğu eşleyiciler "ölçülmüş yol" sayılır.
  const olculmusEsleyiciler = new Set(
    yuzeyler
      .filter((y) => dogrudanKapali.has(y))
      .flatMap((y) => cagirilanEsleyiciler(islevGovdesi(kaynak, y), esleyiciler)),
  );

  return yuzeyler.filter((y) => {
    if (dogrudanKapali.has(y)) return false;
    const kendi = cagirilanEsleyiciler(islevGovdesi(kaynak, y), esleyiciler);
    return !kendi.some((e) => olculmusEsleyiciler.has(e));
  });
}

/* ===========================================================================
 * GERÇEK AĞAÇ
 * ======================================================================== */

/** Tüm test kaynağı — `decimalKalanlar` iddialarının nerede olduğunu okumak için. */
function testKaynagi(): string {
  const parcalar: string[] = [];
  const gez = (dizin: string): void => {
    for (const ad of readdirSync(join(KOK, dizin))) {
      const yol = join(dizin, ad);
      if (statSync(join(KOK, yol)).isDirectory()) gez(yol);
      else if (/\.tsx?$/.test(ad)) parcalar.push(readFileSync(join(KOK, yol), 'utf8'));
    }
  };
  gez('tests');
  return parcalar.join('\n');
}

/**
 * `decimalKalanlar(...)` iddiasına GERÇEKTEN bağlı işlev adları.
 *
 * ⚠️ İLK KURULUM YALNIZCA ÇAĞRININ İÇİNE BAKIYORDU ve iki sahte pozitif
 * üretti: testler `const sayfa = await fetchJobsForPanel(…)` yazıp sonra
 * `decimalKalanlar(sayfa)` diyor, yani ad iddianın içinde GEÇMİYOR. Gerçek
 * ağaçta koşturmadan görülemezdi.
 *
 * Sahte pozitif bu kapıda özellikle pahalı: ölçülmüş bir yüzeyi "ölçülmeyen"
 * göstermek, kapının susturulmasını haklı gösterir. Bu yüzden değişken
 * dolaylaması ÇÖZÜLÜYOR — ama yalnızca aynı `it(...)` bloğu içinde ve yalnızca
 * doğrudan atama biçiminde; blokta tesadüfen yan yana duran iki şeyi
 * eşleştirmemek için kapsam dar tutuluyor.
 */
function dogrudanKapaliOlanlar(testler: string, yuzeyAdlari: ReadonlySet<string>): Set<string> {
  const kapali = new Set<string>();
  /*
   * ⚠️ `process\w+` T-109b'DE EKLENDİ — KAPIDA ASİMETRİK BİR KÖR NOKTA VARDI.
   *
   * Kapının iki yarısı var: hangi yüzeylerin ÖLÇÜLMESİ GEREKTİĞİ (ihraç edilen
   * işlevleri `Decimal` modellerine dokunmalarından buluyor) ve hangilerinin
   * ÖLÇÜLDÜĞÜ (test kaynağında `decimalKalanlar(...)` iddialarını arıyor).
   *
   * İkinci yarı bir ÖN EK LİSTESİ kullanıyordu ve `processDueRecurringTransactions`
   * (ADR-040) o listede yoktu. Sonuç: kapı yüzeyi "ölçülmesi gerekiyor" diye
   * BULDU ama benim yazdığım `decimalKalanlar(await processDue…())` iddiasını
   * GÖREMEDİ ve iddia varken kırmızı kaldı.
   *
   * Kör nokta ÖN EK LİSTESİNİN KENDİSİNDE: liste, servis adlarının nasıl
   * başladığını MODELLİYOR — oysa "ihtiyaç" yarısı adı modellemiyor, kaynağı
   * ÖLÇÜYOR. İki yarı farklı yöntem kullandığı için ayrışabiliyorlardı
   * (T-050'nin "izlediği şeyi okumayan test" sınıfının bir varyantı).
   *
   * `process` meşru bir servis fiili ve ADR-040'ın kendi sözcüğü ("kalemleri
   * İŞLE"). Listeyi genişletmek kapıyı KÖRLEŞTİRMİYOR: bu yarı yalnızca GERÇEK
   * iddiaları tanımaya hizmet ediyor; neyin ölçülmesi gerektiğine öbür yarı
   * karar veriyor ve ona dokunulmadı.
   */
  /*
   * ⚠️ FİİL ÖN EK LİSTESİ KALDIRILDI (T-109g) — ASİMETRİ KAPANDI.
   *
   * Burada `fetch\w+|create\w+|update\w+|change\w+|convert\w+` biçiminde bir
   * liste vardı ve T-109b'de `process\w+` eklenmek zorunda kaldı: ADR-040'ın
   * `processDueRecurringTransactions`ı listede yoktu, kapı yüzeyi "ölçülmesi
   * gerekiyor" diye BULDU ama yazılmış iddiayı GÖREMEDİ ve iddia varken
   * kırmızı kaldı.
   *
   * Kusur eksik fiilde değil, TASARIMDAKİ ASİMETRİDE: kapının bir yarısı
   * (ne ölçülmeli) kaynağı ÖLÇÜYOR, öteki yarısı (ne ölçülmüş) servis
   * adlandırmasını MODELLİYORDU. İki yarı farklı yöntem kullandığı için
   * ayrışabiliyorlardı ve sonraki fiilde (`recalculate`, `sync`, `export`…)
   * aynı ayrışma tekrarlanırdı — listeyi uzatmak sınıfı kapatmaz.
   *
   * Artık iki yarı AYNI kaynağı kullanıyor: tanınan adlar, enumerasyonun
   * bulduğu yüzey adlarının ta kendisi. Yeni bir fiil icat edilse bile liste
   * güncellenmek zorunda değil.
   */
  const adDeseni = (ad: string): RegExp =>
    new RegExp(`\\b${ad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`);

  // Her `it(` bloğu ayrı değerlendiriliyor: dolaylama yalnızca blok içinde çözülür.
  for (const blok of testler.split(/\bit(?:\.\w+)?\s*\(/)) {
    const iddialar = [...blok.matchAll(/decimalKalanlar\s*\(([\s\S]{0,300}?)\)\s*\)/g)].map(
      (m) => m[1] ?? '',
    );
    if (iddialar.length === 0) continue;

    for (const arg of iddialar) {
      // (1) İddianın İÇİNDE doğrudan çağrı: `decimalKalanlar(await fetchX(…))`
      for (const ad of yuzeyAdlari) if (adDeseni(ad).test(arg)) kapali.add(ad);

      // (2) Değişken dolaylaması: `const sayfa = await fetchX(…)` → `decimalKalanlar(sayfa)`
      const tanimlayici = /^\s*([A-Za-z_]\w*)\s*$/.exec(arg);
      if (!tanimlayici?.[1]) continue;

      const atama = new RegExp(
        `(?:const|let)\\s+${tanimlayici[1]}\\s*=\\s*(?:await\\s+)?(\\w+)\\s*\\(`,
      ).exec(blok);
      // Atanan ad yalnızca ENUMERASYONDA varsa kapsama sayılıyor: rastgele bir
      // yardımcı adı iddiayı kapsıyor gibi görünmesin.
      if (atama?.[1] && yuzeyAdlari.has(atama[1])) kapali.add(atama[1]);
    }
  }

  return kapali;
}

describe('ADR-014/3 — `Decimal` taşıyan her servis yüzeyi ölçülüyor', () => {
  const sema = readFileSync(join(KOK, 'prisma/schema.prisma'), 'utf8');
  const modeller = decimalModelleri(sema);

  const servisler = readdirSync(join(KOK, SERVIS_DIZIN))
    .filter((ad) => ad.endsWith('.ts') && ad !== 'index.ts')
    .map((ad) => ({ yol: join(SERVIS_DIZIN, ad), kaynak: kod(join(SERVIS_DIZIN, ad)) }))
    .filter(({ kaynak }) =>
      modeller.some((model) => new RegExp(`\\.${istemciAdi(model)}\\.`).test(kaynak)),
    );

  const testler = testKaynagi();
  const tumYuzeyAdlari = new Set(servisler.flatMap((srv) => dtoYuzeyleri(srv.kaynak)));
  const dogrudanKapali = dogrudanKapaliOlanlar(testler, tumYuzeyAdlari);

  it('önkoşul — şemadan `Decimal` modelleri türetildi', () => {
    /*
     * 2026-10-29: para modelleri (Job, Transaction…) iş/muhasebe modülüyle
     * kaldırıldı; Cüzdan geldiğinde onun modelleri buraya eklenecek. Bugün
     * Decimal taşıyanlar sağlık/spor modelleri.
     */
    /*
     * ⚠️ BU İDDİA KAPININ F5 KAPSAMINI KİLİTLİYOR. `Decimal` yalnızca para
     * değil; sağlık/spor modelleri de taşıyor. Buradan düşerse kapı sessizce
     * para-only bir kapıya dönüşmüş olur.
     */
    expect(modeller, 'Decimal yalnızca para sanılıyor — F5 modelleri kaybolmuş').toEqual(
      expect.arrayContaining(['HealthLog', 'WorkoutSet', 'PersonalRecord']),
    );
  });

  it('önkoşul — YÜZEY SAYIMI boş değil (kendi kapımda yakalanan vakum)', () => {
    /*
     * ⚠️ BU ÇAPA SONRADAN EKLENDİ VE SEBEBİ BİR KUSUR.
     *
     * İlk kurulumda dönüş tipi deseni `\bDto\b` idi ve `JobPanelDto` gibi
     * adlarda HİÇ eşleşmiyordu ("Foo" ile "Dto" arasında sözcük sınırı yok).
     * Sonuç: tarama SIFIR yüzey buldu ve "ölçülmeyen yüzey yok" iddiası boş
     * kümede yeşil kaldı — modeller, servisler ve iddialar için çapa yazmıştım
     * ama SAYIMIN KENDİSİ için yazmamıştım. Sentetik mutasyon testi yakaladı.
     *
     * Ders, T-055g'dekinin tekrarı: çapa, zincirin HER halkasına gerekir;
     * biri ölçülmeden kalırsa kapı o halkada sessizce boşa koşar.
     */
    const saglikYuzeyleri = dtoYuzeyleri(kod(`${SERVIS_DIZIN}/health-log.ts`));

    expect(saglikYuzeyleri.length, 'health-log.ts içinde DTO yüzeyi bulunamadı').toBeGreaterThan(3);
    expect(saglikYuzeyleri).toEqual(
      expect.arrayContaining(['fetchHealthLogs', 'createHealthLog', 'updateHealthLog']),
    );
  });

  it('önkoşul — `Decimal` modellerine dokunan servisler ve iddialar bulundu', () => {
    expect(servisler.map((s) => s.yol)).toEqual(
      expect.arrayContaining([`${SERVIS_DIZIN}/health-log.ts`, `${SERVIS_DIZIN}/workout.ts`]),
    );
    // İddia kümesi boşsa her yüzey "ölçülmeyen" çıkar ve kapı yanlış sebeple
    // kırmızı olur; boş DEĞİL olduğu ayrıca ölçülüyor.
    expect(dogrudanKapali.size, '`decimalKalanlar` iddiası hiç bulunamadı').toBeGreaterThan(3);
    expect(dogrudanKapali).toContain('fetchHealthLogs');

    /*
     * ⚠️ ASİMETRİNİN ÇAPASI (T-109g): fiil ön ek listesinin kör noktası
     * `process…` adıyla açığa çıkmıştı; o servis 2026-10-29'da kaldırıldı.
     * Çapa artık `to…` ile başlayan bir yüzeyde — ön ek listesi geri gelirse
     * yine kırılır.
     */
    expect(
      dogrudanKapali,
      'fiil ön ek listesi geri gelmiş olabilir — tanıma yarısı enumerasyonu kullanmıyor',
    ).toContain('toWorkoutSetDto');
  });

  /**
   * MUAFİYETLER — ölçüt BİLEREK geniş, muafiyet GEREKÇELİ.
   *
   * Sayım "Decimal modeline dokunan servis × `Dto` döndüren ihraç" diyor ve bu
   * bir ÜST KÜME: aynı serviste para taşımayan bir DTO da sayılır. Daraltmayı
   * DENEDİM ve reddettim — "hangi DTO para taşıyor"u kaynaktan çıkarmak iç içe
   * alanlarda sessizce EKSİK sayıyordu (bu dosyanın başındaki not). Üst küme
   * GÜVENLİ YÖNDE hata yapar: fazla sayar, az saymaz.
   *
   * Bedeli sahte pozitif ve o bedel muafiyetle ödeniyor — susturmayla değil:
   * muafiyet yazan kişi DTO'yu okumak ve neden para taşımadığını yazmak
   * zorunda, ve aşağıdaki iddialar gerekçeyi mekanik olarak da sınıyor.
   */
  const MUAFIYETLER: { yuzey: string; dto: string; gerekce: string }[] = [];

  it('muafiyet ÖLÜ SATIR taşımıyor ve gerekçesi MEKANİK olarak sınanıyor', () => {
    /*
     * Üç yönlü kontrol. (1) Muaf tutulan yüzey gerçekten sayımda mı — yoksa
     * satır ölü ve bir gün yaşayan bir yüzeyi maskeler (§8.24 kapısının "artık
     * bildirilmeyen istisna" dalı). (2) Adı verilen DTO gerçekten var mı.
     * (3) ⚠️ DTO'nun KENDİ alanları arasında şemadan gelen bir `Decimal` alan
     * adı YOK — gerekçe "para taşımıyor" diyorsa bu ölçülebilir.
     *
     * SINIR, dürüstçe: (3) yalnızca ÜST SEVİYE alanlara bakıyor; iç içe
     * tipler ELLE okunup gerekçeye yazılıyor. Daha fazlasını mekanikleştirmeyi
     * denedim ve o deneme tam burada eksik saymıştı.
     */
    const tumYuzeyler = new Set(servisler.flatMap((s) => dtoYuzeyleri(s.kaynak)));
    const decimalAlanAdlari = [
      ...new Set(
        [...sema.matchAll(/^\s*(\w+)\s+Decimal/gm)].map((m) => (m[1] ?? '').toLowerCase()),
      ),
    ].filter(Boolean);

    expect(decimalAlanAdlari, 'şemadan Decimal alan adları çıkarılamadı').toEqual(
      expect.arrayContaining(['weightkg', 'bodyfatpct', 'sleephours']),
    );

    for (const muaf of MUAFIYETLER) {
      expect(tumYuzeyler, `muafiyet ÖLÜ: ${muaf.yuzey} artık bir DTO yüzeyi değil`).toContain(
        muaf.yuzey,
      );
      expect(muaf.gerekce.length, 'gerekçesiz muafiyet yazılmaz').toBeGreaterThan(120);

      const tip = new RegExp(`export interface ${muaf.dto}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(
        servisler.map((s) => s.kaynak).join('\n'),
      );
      expect(tip?.[1], `${muaf.dto} tipi bulunamadı`).toBeDefined();

      const govde = (tip?.[1] ?? '').toLowerCase();
      const parali = decimalAlanAdlari.filter((ad) => new RegExp(`\\b${ad}\\s*\\??:`).test(govde));
      expect(
        parali,
        `${muaf.dto} para alanı TAŞIYOR (${parali.join(', ')}) — muafiyetin gerekçesi geçersiz`,
      ).toEqual([]);
    }
  });

  it('⚠️ HER `Decimal` DTO YÜZEYİ ya doğrudan ya PAYLAŞILAN EŞLEYİCİ ile ölçülüyor', () => {
    const olculmeyen: string[] = [];

    for (const { yol, kaynak } of servisler) {
      const yuzeyler = dtoYuzeyleri(kaynak);
      const esleyiciler = [...kaynak.matchAll(/function\s+(to\w*(?:Dto|ListDto|DetailDto))\s*\(/g)]
        .map((m) => m[1] ?? '')
        .filter(Boolean);

      const muaf = new Set(MUAFIYETLER.map((m) => m.yuzey));
      for (const yuzey of olculmeyenYuzeyler({ kaynak, yuzeyler, esleyiciler, dogrudanKapali })) {
        if (muaf.has(yuzey)) continue;
        olculmeyen.push(`${yol} → ${yuzey}`);
      }
    }

    expect(
      olculmeyen,
      'Bu DTO yüzeyleri `Decimal` kaçağına karşı ÖLÇÜLMÜYOR:\n' +
        `${olculmeyen.join('\n')}\n\n` +
        'İki çıkış var: (a) `decimalKalanlar(await <işlev>(…))` iddiası ekle, ' +
        '(b) yüzeyi okuma yoluyla AYNI eşleyiciden geçir. Satır içi eşleme yapan ' +
        'bir yüzey, okuma iddiaları yeşilken sızdırabilir — T-107a bulgusu.',
    ).toEqual([]);
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi, kimsenin dosyasına dokunmadan
 * ======================================================================== */

describe('MUTASYON · kapı gerçekten ısırıyor', () => {
  const ESLEYICILER = ['toDetailDto'] as const;

  const KAYNAK = [
    'export async function fetchOne(id: string): Promise<FooDto | null> {',
    '  return toDetailDto(row);',
    '}',
    'export async function createOne(input: Foo): Promise<FooDto> {',
    '  return toDetailDto(row);',
    '}',
    'export async function updateOne(input: Foo): Promise<FooDto> {',
    '  return { id: row.id, amount: row.amount.toFixed(2) };',
    '}',
  ].join('\n');

  it('yüzey sayımı dönüş tipinden DTO taşıyanları buluyor', () => {
    expect(dtoYuzeyleri(KAYNAK)).toEqual(['fetchOne', 'createOne', 'updateOne']);
  });

  it('PAYLAŞILAN eşleyici dolaylı kapsama sayılıyor', () => {
    const olculmeyen = olculmeyenYuzeyler({
      kaynak: KAYNAK,
      yuzeyler: ['fetchOne', 'createOne', 'updateOne'],
      esleyiciler: ESLEYICILER,
      dogrudanKapali: new Set(['fetchOne']),
    });

    // `createOne` aynı eşleyiciden geçiyor → kapalı.
    // `updateOne` SATIR İÇİ eşliyor → ölçülmeyen. Bulgunun tam biçimi bu.
    expect(olculmeyen).toEqual(['updateOne']);
  });

  it('⚠️ okuma iddiası SİLİNİRSE her şey ölçülmeyen oluyor', () => {
    /*
     * Negatif iddia tek başına yetmez (§8.18 dersi): iddiayı silen bir
     * değişiklik de yeşil kalmamalı. Doğrudan kapalı küme boşaldığında
     * paylaşılan eşleyici de "ölçülmüş yol" olmaktan çıkıyor.
     */
    const olculmeyen = olculmeyenYuzeyler({
      kaynak: KAYNAK,
      yuzeyler: ['fetchOne', 'createOne', 'updateOne'],
      esleyiciler: ESLEYICILER,
      dogrudanKapali: new Set(),
    });

    expect(olculmeyen).toEqual(['fetchOne', 'createOne', 'updateOne']);
  });

  it('MUAFİYET KONTROLÜ · para alanı taşıyan DTO muaf tutulamaz', () => {
    /*
     * Muafiyetin mekanik sınaması da vakuma düşebilir: hiçbir alanı yakalamayan
     * bir desenle her DTO "para taşımıyor" görünürdü. Desen burada sentetik bir
     * gövdeye karşı iki yönde sınanıyor.
     */
    const alanlar = ['amount', 'fxrate', 'baseamount'];
    const parali = (govde: string): string[] =>
      alanlar.filter((ad) => new RegExp(`\\b${ad}\\s*\\??:`).test(govde.toLowerCase()));

    expect(parali('  id: string;\n  amount: string;')).toEqual(['amount']);
    expect(parali('  id: string;\n  baseAmount?: string | null;')).toEqual(['baseamount']);
    // Temiz DTO ve YALNIZCA ADI benzeyen alan yakalanmıyor.
    expect(parali('  id: string;\n  title: string;')).toEqual([]);
    expect(parali('  amountLabel: string;')).toEqual([]);
  });

  it('şema ayıklaması `Decimal`siz modeli saymıyor', () => {
    const sema = [
      'model Temiz {',
      '  id String @id',
      '  ad String',
      '}',
      'model Parali {',
      '  id String @id',
      '  tutar Decimal @db.Decimal(12, 2)',
      '}',
      'model Yorumlu {',
      '  id String @id',
      '  // tutar Decimal — henüz eklenmedi',
      '}',
    ].join('\n');

    expect(decimalModelleri(sema)).toEqual(['Parali']);
  });
});
