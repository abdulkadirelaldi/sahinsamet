import { unstable_cache } from 'next/cache';

import { guvenliUyari } from '@/lib/security/guvenli-log';

/**
 * Public içerik önbellekleme — ADR-011'in karşılığı.
 *
 * Public site tek sayfa ve yalnızca profili okur; okuma servislerin İÇİNDE
 * önbelleklenir ki sayfanın hatırlamasına kalmasın.
 *
 * ETİKET: `content:<entity>` (bugün yalnızca `content:profile`). Eşleşme tam
 * dizedir (ADR-029, next `tagsManifest.get(tag)`) — önek eşleşmesi yoktur; bu
 * yüzden okuma ve geçersizleştirme AYNI `entityTag` çağrısından türer.
 */

/** Önbellek etiketi öneki — tek yerde, elle dize yazılmaz. */
const TAG_PREFIX = 'content';

export type ContentEntity = 'profile';

/** `content:project` — varlığın tamamı. */
export function entityTag(entity: ContentEntity): string {
  return `${TAG_PREFIX}:${entity}`;
}

/**
 * Yeniden doğrulama aralığı (saniye).
 *
 * Etiket tabanlı geçersizleştirme ASIL mekanizmadır; bu süre yalnızca emniyet
 * ağıdır — bir mutasyon etiketi düşürmeyi unutursa içerik en fazla bu kadar
 * bayat kalır. Sonsuz bırakmak, unutulmuş bir etiketi kalıcı hataya çevirirdi.
 */
export const CONTENT_REVALIDATE_SECONDS = 3600;

/** Bir okumanın önbellek kimliği: anahtar parçaları + geçersizleştirme etiketleri. */
export interface CacheDescriptor {
  /**
   * Önbellek anahtarının parçaları.
   *
   * `unstable_cache` argümanları anahtara KENDİ EKLER — ölçüldü (next 15.5.22,
   * `spec-extension/unstable-cache.js:82`):
   *
   *   invocationKey = `${cb.toString()}-${keyParts.join(',')}` + JSON.stringify(args)
   *
   * Yani argümanları buraya tekrar koymak ŞART DEĞİL; yine de koyuyoruz çünkü
   * anahtar böylece günlüklerde okunabilir oluyor ve `cb.toString()`e bağımlılık
   * azalıyor (iki farklı okumanın gövdesi birebir aynı yazılırsa `keyParts`
   * onları ayıran tek şeydir).
   */
  keyParts: string[];
  /**
   * Bu girdiyi düşürebilecek TÜM etiketler — dar olandan geniş olana.
   * Eşleşme tam dizedir (yukarıya bakınız), bu yüzden eksik bırakılan bir
   * etiket sessizce geçersizleştirilemez bir girdi bırakır.
   */
  tags: string[];
}

/**
 * Bir public okuma fonksiyonunu önbelleğe alır.
 *
 * ETİKETLER NEDEN FONKSİYONDAN GELİYOR: `unstable_cache`'in `tags` seçeneği
 * SARMALAMA ANINDA bir kez okunur, argümanlara göre değişmez. Sabit bir dizi
 * verilseydi — örneğin `tags: [localeTag('skill', 'tr')]` — `getSkills('en')`
 * çağrısı ayrı bir önbellek girdisine düşer (anahtar argümanı içeriyor) ama
 * `content:skill:tr` etiketiyle işaretlenirdi. Sonuç: `content:skill:en`
 * geçersizleştirmesi o girdiyi ASLA düşüremez; İngilizce içerik yalnızca
 * `CONTENT_REVALIDATE_SECONDS` dolunca tazelenirdi. SESSİZ BAYATLAMA.
 *
 * `describe` zorunlu tutularak bu hata yapısal olarak imkânsız kılındı:
 * etiketler her çağrıda o çağrının argümanlarından hesaplanır.
 *
 * NOT: `unstable_cache` Next'in deneysel API'sidir (ADR-011 "veya güncel
 * eşdeğeri" diyerek bunu öngördü). Tek yerde sarmalandığı için ileride
 * `use cache` direktifine geçiş tek dosyada yapılır.
 */
export function cachedRead<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>,
  describe: (...args: Args) => CacheDescriptor,
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    const { keyParts, tags } = describe(...args);
    const anahtar = sonIyiAnahtari(keyParts, args);
    try {
      const sonuc = await unstable_cache(read, keyParts, {
        tags,
        revalidate: CONTENT_REVALIDATE_SECONDS,
      })(...args);
      sonIyiYaz(anahtar, sonuc);
      return sonuc;
    } catch (error) {
      if (!SON_IYI.has(anahtar)) throw error;
      guvenliUyari(
        '[icerik] okuma başarısız, son iyi içerik sunuluyor:',
        keyParts.join(':'),
        error instanceof Error ? error.message : 'bilinmeyen hata',
      );
      return SON_IYI.get(anahtar) as Result;
    }
  };
}

/* ===========================================================================
 * SON İYİ İÇERİK — veritabanı kesintisinde site DÜŞMESİN
 * ===========================================================================
 *
 * ÖLÇÜLDÜ (2026-10-22, yerel): veritabanı kapanınca önbelleği dolmamış ya da
 * etiketi düşmüş her okuma fırlatıyor ve ziyaretçi "Sayfa yüklenemedi" görüyor
 * — portfolyo sitesinde içeriğin TAMAMI. Okunan içerik nadiren değişiyor;
 * birkaç dakikalık kesintide son başarılı okumayı sunmak, hata sayfasından
 * her durumda daha doğru bir cevap.
 *
 * SINIRLAR (bilerek):
 *   - Yalnızca BU SÜREÇTE daha önce başarıyla okunmuş anahtarlar. Soğuk
 *     başlangıçta veritabanı yoksa yine hata — üretimde compose sırası
 *     (`depends_on: service_healthy`) bunu önlüyor.
 *   - Bellek sınırlı: en çok `SON_IYI_SINIRI` girdi; en eskisi düşer. Anahtarlar
 *     yalnızca BAŞARILI okumalardan doluyor, yani uydurma slug'larla şişirilemez
 *     (bulunamayan kayıt da başarılı okumadır ama küçük bir `NOT_FOUND` değeri).
 *   - Kesinti sırasında yayından kaldırılan içerik, kesinti bitene kadar son
 *     hâliyle görünebilir. Bilinçli takas: kesinti dakikalar, yanlışlık küçük.
 *   - Hata loglanıyor (`guvenliUyari`) — sessiz değil; sağlık ucu (`/api/v1/
 *     health`) zaten 503 dönüyor ve izleme oradan uyarıyor.
 */
const SON_IYI_SINIRI = 500;
const SON_IYI = new Map<string, unknown>();

function sonIyiAnahtari(keyParts: string[], args: unknown[]): string {
  return `${keyParts.join('\u0000')}\u0001${JSON.stringify(args)}`;
}

function sonIyiYaz(anahtar: string, deger: unknown): void {
  // Map ekleme sırasını korur: silip yeniden eklemek "en yeni" yapar.
  SON_IYI.delete(anahtar);
  SON_IYI.set(anahtar, deger);
  if (SON_IYI.size > SON_IYI_SINIRI) {
    const enEski = SON_IYI.keys().next().value;
    if (enEski !== undefined) SON_IYI.delete(enEski);
  }
}
