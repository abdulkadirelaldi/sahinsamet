/**
 * `Decimal` KAÇAK DEDEKTÖRÜ — ADR-014'ün 3. kuralının ölçüm aracı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU DOSYA VAR (T-101'de buraya TAŞINDI)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-100'de dedektör `is-musteri.test.ts` içinde yerel bir fonksiyondu — ilk
 * ihtiyaç duyulduğu yer orasıydı. T-101 `Transaction` için aynı ölçümü
 * gerektirdi ve kart açıkça *"genişlet, yeniden yazma"* dedi.
 *
 * İkinci bir kopya açmak, bu turda `prisma/seed.ts`ten SİLDİĞİM şeyin aynısı
 * olurdu (ADR-037): yazıldığı yerde doğru olan bir yardımcı, ikinci çağıran
 * geldiğinde çoğaltılır ve ikisi zamanla sapar. Dedektör burada, iki test
 * dosyası da BURADAN okuyor.
 *
 * ⚠️ `tests/unit/_helpers/` ALTINDA ve bu kasıtlı: Vitest'in `unit` projesi
 * yalnızca `*.test.ts` topluyor, dolayısıyla bu dosya bir test dosyası olarak
 * koşmaz — yardımcı olarak içe aktarılır.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * NE ÖLÇÜYOR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Prisma `Decimal`, JS tarafında bir `Decimal.js` NESNESİDİR ve Server → Client
 * sınırında serialize EDİLEMEZ (R4, F0'da kaydedilmiş risk). TİP SİSTEMİ BU
 * KAÇAĞI GÖRMEZ: nesne yapısal olarak her yere uyar, DTO'ya sızdığı yerde
 * derleme GEÇER ve hata çalışma zamanında — kullanıcının ekranında — çıkar.
 *
 * Tanıma ölçütü `isDecimalLike` ile AYNI: `toFixed` metodu taşıyan her nesne.
 * Üretim kodu da aynı ölçütle karar veriyor (`_shared/decimal.ts`), yani
 * dedektör üretimin tanıdığından farklı bir şey aramıyor.
 *
 * ⚠️ DEDEKTÖRÜN KENDİSİ DE SINANMAK ZORUNDA — `dedektorCalisiyor` bunun için
 * var. Yakalamayan bir dedektör, her DTO için SAHTE YEŞİL verir ve T-050'de
 * kendi testlerimde bulduğum sınıfın aynısı olur: izlediği şeyi okumayan bir
 * değişmezlik testi hiçbir şey korumaz.
 */

/** `Decimal` benzeri nesnelerin DTO içindeki yolları. Boş dizi = temiz. */
export function decimalKalanlar(value: unknown, yol = ''): string[] {
  if (value === null || value === undefined) return [];

  if (typeof value === 'object') {
    // `toFixed` taşıyan her nesne bir `Decimal` adayı (`isDecimalLike` ölçütü).
    if (typeof (value as { toFixed?: unknown }).toFixed === 'function') return [yol || '<kök>'];
    // `Date` meşru: DTO'lar onu `toISOString()` ile dizeye çeviriyor ve
    // serialize edilebiliyor. `toFixed` de taşımıyor, ama açıkça geçiliyor ki
    // ölçütün neyi dışladığı okunurken görünsün.
    if (value instanceof Date) return [];

    return Object.entries(value).flatMap(([anahtar, deger]) =>
      decimalKalanlar(deger, yol ? `${yol}.${anahtar}` : anahtar),
    );
  }

  return [];
}

/** Prisma `Decimal` taklidi — tek ihtiyacımız `toFixed` (`_shared/decimal.ts`). */
export function decimal(value: string): { toFixed: (n?: number) => string } {
  return { toFixed: (n = 2) => Number(value).toFixed(n) };
}

/**
 * Dedektörün KENDİ sağlaması — her çağıran test dosyası bunu koşmak zorunda.
 *
 * `[yakalanan, yakalanmayan]` döner: ilki iç içe bir `Decimal`in yolunu, ikincisi
 * dizelerden oluşan temiz bir nesnenin sonucunu verir. Beklenen:
 * `['a.b']` ve `[]`.
 */
export function dedektorCalisiyor(): [string[], string[]] {
  return [decimalKalanlar({ a: { b: decimal('1') } }), decimalKalanlar({ a: '1.00' })];
}
