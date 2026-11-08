import { afterEach, describe, expect, it } from 'vitest';

import { SHOWN_DIFF_VALUE_KEYS, toDiffSummary } from '@/server/services/audit-log';

/**
 * BEYAZ LİSTEYE BİR AD EKLENİRSE NE OLUR — polarite ölçümü (T-054g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU DOSYA VAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `tests/unit/services/denetim-kaydi.test.ts` beyaz listeyi KİLİTLİYOR: üç adın
 * dışına çıkan her değişiklik o testi kırıyor, yani ekleyen kişi gerekçe yazmak
 * zorunda. Bu doğru kapı ama bir soruyu cevapsız bırakıyor: **ad eklendiğinde
 * maruziyet NE KADAR büyür?** Kilit, kararı görünür kılıyor; bedelini
 * ölçmüyor. Gerekçe yazacak kişinin elinde ölçüm olmazsa karar sezgiyle
 * verilir — bu projenin "bazen çalışan" dediği sınıf tam olarak budur.
 *
 * Buradaki iddialar o bedeli ÇALIŞTIRILABİLİR hâlde yazıyor. Üçü iyi haber,
 * biri kötü; dördü birlikte kuralı veriyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ BU DOSYA BEYAZ LİSTEYİ KOŞUM SIRASINDA GEÇİCİ OLARAK DEĞİŞTİRİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ölçülen şey bir VARSAYIM ("yarın biri ad eklerse") ve onu kaynağı düzenleyip
 * geri almadan ölçmenin yolu, dışa açılan kümeye koşum sırasında ad ekleyip
 * `afterEach`te geri almak. Küme tipte `ReadonlySet` ama çalışma zamanında
 * sıradan bir `Set`; `readonly` bir derleyici sözüdür, kilit değil — ve bu
 * dosyanın ölçtüğü şeyin ta kendisi o farkın bedelidir.
 *
 * Kaynak dosyaya DOKUNULMUYOR (`src/server/services/audit-log.ts` Backend'in,
 * §10.1). Değişiklik süreç içinde ve geri alınıyor; ilk iddia kümenin
 * değiştirilmemiş hâlini de doğruluyor, yani sızma olursa görünür.
 */

const EKLENEBILIR = SHOWN_DIFF_VALUE_KEYS as Set<string>;

/** Koşum sırasında eklenen adları geri al — sızarsa sonraki dosyaları kirletir. */
const EKLENENLER: string[] = [];

/**
 * Adı ekler ve EKLENDİĞİNİ doğrular.
 *
 * Doğrulama şart: küme bir gün `Object.freeze`lenir ya da kopya döndürmeye
 * başlarsa `add` sessizce etkisiz kalır — ve "değer basılmıyor" diyen iddialar
 * YANLIŞ SEBEPLE yeşile döner (hiç ad eklenmediği için). Vakum tam burada
 * oluşurdu; tek satırla kapanıyor.
 */
function geciciEkle(ad: string): void {
  EKLENENLER.push(ad);
  EKLENEBILIR.add(ad);
  expect(
    SHOWN_DIFF_VALUE_KEYS.has(ad),
    `'${ad}' beyaz listeye EKLENEMEDİ — bu dosyadaki iddialar varsayımı ölçemez`,
  ).toBe(true);
}

afterEach(() => {
  for (const ad of EKLENENLER.splice(0)) EKLENEBILIR.delete(ad);
  expect(
    [...SHOWN_DIFF_VALUE_KEYS].sort(),
    'beyaz liste koşum sonrası ÖZGÜN hâline dönmedi — sonraki testler kirli kümeyle koşar',
  ).toEqual(['changed', 'context', 'socialsChanged']);
});

describe('beyaz listeye ad eklemenin BEDELİ', () => {
  it('İYİ HABER — `buildDiff` çıktısı eklenen adla bile DEĞER BASMIYOR', () => {
    /*
     * Eylem dosyalarındaki `buildDiff` her alan için `{ before, after }`
     * üretiyor. `isBeforeAfterPair` o çifti YAPRAK sayıyor (yol `title`,
     * `title.before` değil), `toShownValue` ise nesneyi dizeye çevirmeyi
     * REDDEDİYOR. Yani beyaz listenin arkasında İKİNCİ ve BİÇİME dayalı bir
     * bariyer var: adı listeye almak, kayıt içeriğini tek başına ekrana
     * taşımaya YETMİYOR.
     *
     * Bu, kararın sağlamlığı hakkında önemli bir şey söylüyor: koruma
     * yalnızca "o üç ad değer değil ad taşır" gözlemine dayanmıyor.
     */
    geciciEkle('title');

    const ozet = toDiffSummary({ title: { before: 'ESKİ-BAŞLIK', after: 'YENİ-BAŞLIK' } });

    expect(ozet.fields).toEqual(['title']);
    expect(ozet.values).toEqual({});
    expect(JSON.stringify(ozet)).not.toContain('BAŞLIK');
  });

  it('⚠️ KÖTÜ HABER — ELLE yazılmış İLKEL değer eklenen adla EKRANA ÇIKAR', () => {
    /*
     * İkinci bariyer BİÇİME bağlı, niyete değil. `buildDiff` kullanmayan bir
     * yazma — elle kurulmuş bir `diff` nesnesi, bir seed, bir göç betiği ya da
     * gelecekte eklenecek bir eylem — anahtarın altına doğrudan bir dize
     * koyabilir. O durumda ad beyaz listedeyse DEĞER BASILIR.
     *
     * KURAL BU YÜZDEN ŞU: beyaz listeye bir ad eklemek, o adın altına ASLA
     * kayıt içeriği yazılmadığını kanıtlamayı gerektirir. "`buildDiff` zaten
     * çift üretiyor" yeterli bir gerekçe DEĞİL — `buildDiff`i kullanmayan
     * yazma yolları var ve bu test onların bedelini gösteriyor.
     */
    geciciEkle('slug');

    const ozet = toDiffSummary({ slug: 'gizli-olmayan-ama-icerik' });

    expect(ozet.fields).toEqual(['slug']);
    expect(
      ozet.values,
      'ikinci bariyer yalnızca NESNE değerleri tutuyor — ilkel değer geçiyor',
    ).toEqual({ slug: 'gizli-olmayan-ama-icerik' });
  });

  it('⚠️ eklenen ad HER DERİNLİKTE geçerli — kural son parçaya bakıyor', () => {
    /*
     * Beyaz liste yolun SON PARÇASINA bakıyor (`deleted.context` de
     * `context`tir). Bu kasıtlı ve silme satırları için gerekli; ama bedeli
     * şu: bir ad eklendiğinde yalnızca kök seviyesi değil, HER YERDEKİ o ad
     * açılır. Ekleyen kişi "kökte zararsız" diye düşünürse eksik düşünmüş
     * olur.
     */
    geciciEkle('slug');

    const ozet = toDiffSummary({ deleted: { slug: 'icerik' }, a: { b: { slug: 'daha-derin' } } });

    expect(ozet.values).toEqual({ 'deleted.slug': 'icerik', 'a.b.slug': 'daha-derin' });
  });

  it('eklenen ad DİZİ taşıyorsa üyeler basılır — `socialsChanged` ile aynı yüzey', () => {
    geciciEkle('etiketler');

    const ozet = toDiffSummary({ etiketler: ['bir', 'iki'] });

    expect(ozet.values).toEqual({ etiketler: 'bir, iki' });
  });
});

/* ===========================================================================
 * `socialsChanged` SERBEST `Json` SÜTUNUNDAN GELİYOR — BİLİNEN SINIR
 * ======================================================================== */

describe('BİLİNEN SINIR — beklenmeyen bir ad ekrana çıkabilir (değer çıkmaz)', () => {
  /**
   * Backend'in dürüstçe yazdığı sınır: `socialsChanged` anahtar ADLARINI
   * veritabanındaki serbest `Json` sütunundan (`profile.socials`) topluyor.
   * Beyaz listedeki diğer iki ad (`context`, `changed`) eylem dosyalarında ELLE
   * yazılmış literallerden geliyor; bu üçüncüsü gelmiyor.
   *
   * Sonuç: panel arayüzünden girilmeyen bir ad — seed, göç betiği ya da elle
   * yapılmış bir yazma — ekranda görünebilir. Yüzey DAR ve burada ölçülüyor:
   *
   *   ✔ görünen şey yalnızca ANAHTAR ADI; sosyal bağlantının DEĞERİ (URL,
   *     kullanıcı adı) `socialsChanged` listesine hiç girmiyor
   *   ✔ ad bir nesne/iç içe yapı olursa TAMAMI düşüyor (kısmi gösterim yok)
   *
   * Yani bu bir sızıntı değil, ÖNGÖRÜLEMEYEN BİR DİZENİN ekranda belirmesi.
   * Bulgu olarak kayıtlı (docs/security/README.md → BULGU-023); düzeltmesi
   * Backend'in ve bedeli bugün ekranda uzun/garip bir etiketten fazlası değil.
   */
  it('serbest sütundan gelen BEKLENMEYEN ad ekrana çıkıyor — ölçülmüş ve kabul edilmiş', () => {
    const ozet = toDiffSummary({ socialsChanged: ['github', 'beklenmeyen-ad-x9'] });

    expect(ozet.values).toEqual({ socialsChanged: 'github, beklenmeyen-ad-x9' });
  });

  it('ama o adın DEĞERİ hiç girmiyor — liste yalnızca anahtar adlarını taşıyor', () => {
    /*
     * `socialsChanged` üretimi anahtarları topluyor, değerleri değil. Değer
     * taşıyan bir yapı buraya düşerse (iç içe nesne) beyaz liste onu
     * REDDEDİYOR — kısmi gösterim yok, hepsi ya da hiç.
     */
    const ozet = toDiffSummary({
      socialsChanged: ['github', { url: 'https://gizli.example/kullanici' }],
    });

    expect(ozet.values).toEqual({});
    expect(JSON.stringify(ozet)).not.toContain('gizli.example');
  });
});
