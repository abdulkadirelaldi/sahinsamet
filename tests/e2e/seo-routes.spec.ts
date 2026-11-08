import { expect, test, type Page } from '@playwright/test';

/**
 * SEO ve OG rotaları — BULGU-015'in kapattığı boşluk.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU DOSYA VAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BULGU-014 (`/og` çalışma zamanında `TypeError` ile çöküyordu) hiçbir kapıya
 * takılmadı: `pnpm build` geçti, 827 birim testi geçti, CI kapısı geçerdi.
 * Sebep basit ve rahatsız edici — HİÇBİR KAPI O ROTAYA İSTEK ATMIYORDU.
 * E2E `/` ve `/panel`'e vuruyor, Lighthouse `/`'a. `robots.txt`, `sitemap.xml`,
 * `rss.xml` ve `/og` ölçüm yüzeyinin tamamen dışındaydı.
 *
 * Bu rotaların ortak özelliği: ÇIKTILARINI GELİŞTİRİCİ GÖRMEZ. OG görselini
 * sosyal medya botu çeker, sitemap'i arama motoru okur, RSS'i besleme okuyucu.
 * Bozuldukları gün kimse fark etmez; sessizce yanlış çalışırlar.
 *
 * T-019b/K3'ün kardeşi: orada testler doğru koşuyordu ama gevşek desenler
 * yüzünden yanlış şeyi doğruluyorlardı. Burada testler doğru çalışıyor ama bir
 * yüzeyi HİÇ ölçmüyorlardı. İkisi de "yeşil paket = doğru şey ölçüldü" sanısı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ KATMAN — NEDEN İKİSİ BİRDEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. SÖZLEŞME TESTLERİ (aşağıdaki ilk dört blok) — her rotanın BİÇİMİNİ
 *    doğrular: PNG imzası, XML geçerliliği, `Disallow: /panel`. Bunlar
 *    otomatikleştirilemez; "200 döndü" demek `robots.txt`in doğru kuralı
 *    taşıdığını göstermez.
 *
 * 2. SITEMAP TARAMASI (son blok) — sitemap'teki HER URL'in 200 döndüğünü
 *    doğrular. Yeni bir sayfa yayına girdiğinde kapsama KENDİLİĞİNDEN girer.
 *
 * Neden ikisi de gerekli: (1) tek başına, T-018'deki `NavItem.hazir`
 * bayrağının sorununu tekrarlardı — elle tutulan bir liste ve unutulan her
 * yeni rota. (2) tek başına ise yalnızca "sayfa var mı" der; `/og`in PNG
 * ürettiğini ya da `robots.txt`in paneli kapattığını söylemez. Zaten `/og` ve
 * `robots.txt` sitemap'te YER ALMAZ (almamalı da) — yani genel tarama o
 * rotaları hiç görmez.
 */

/** PNG dosya imzası — RFC 2083 §3.1. İlk sekiz bayt her PNG'de aynıdır. */
const PNG_IMZASI = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** §4.1 — OG görseli 1200×630 (Open Graph önerisi). */
const OG_GENISLIK = 1200;
const OG_YUKSEKLIK = 630;

/**
 * PNG'yi İMZA BAYTLARINDAN doğrular, `Content-Type` başlığına GÜVENMEZ.
 *
 * Başlığı sunucu yazar: `ImageResponse` çöküp yerine bir hata gövdesi dönse
 * bile `image/png` başlığı doğru görünebilir. Yani başlığa bakan bir test,
 * BULGU-014'ün tam olarak kaçırdığı şeyi kaçırmaya devam ederdi.
 *
 * IHDR bölütü de okunuyor: imza sekiz bayt sabittir ve tek başına gövdenin
 * geri kalanının anlamlı olduğunu göstermez. Genişlik/yükseklik doğru
 * çıkıyorsa görsel gerçekten kodlanmıştır.
 */
function pngDogrula(govde: Buffer): { genislik: number; yukseklik: number } {
  expect(govde.length, 'PNG gövdesi boş').toBeGreaterThan(PNG_IMZASI.length + 24);
  expect(govde.subarray(0, 8), 'PNG imzası tutmuyor (89 50 4E 47 0D 0A 1A 0A)').toEqual(PNG_IMZASI);

  // 8-11 uzunluk, 12-15 "IHDR", 16-19 genişlik, 20-23 yükseklik (big-endian).
  expect(govde.subarray(12, 16).toString('ascii'), 'İlk bölüt IHDR değil').toBe('IHDR');

  return { genislik: govde.readUInt32BE(16), yukseklik: govde.readUInt32BE(20) };
}

/**
 * XML'i GERÇEK bir ayrıştırıcıyla doğrular.
 *
 * Depoya XML kütüphanesi eklemek §8.25 kapsamında yeni bir bağımlılık olurdu
 * ve Node'un yerleşiği yok. Elle yazılmış bir düzenli ifade ise "geçerli XML"
 * değil "XML'e benziyor" ölçer — kapatılmamış etiketi ya da kaçırılmamış `&`
 * karakterini yakalamaz; oysa besleme okuyucularını düşüren tam da bunlardır.
 *
 * Tarayıcının `DOMParser`ı zaten elimizde ve gerçek bir ayrıştırıcı: hata
 * durumunda belgeye `<parsererror>` düğümü koyar.
 */
async function xmlAyristir(
  page: Page,
  metin: string,
): Promise<{ kok: string; hata: string | null }> {
  return page.evaluate((kaynak) => {
    const belge = new DOMParser().parseFromString(kaynak, 'application/xml');
    const hataDugumu = belge.querySelector('parsererror');

    return {
      kok: belge.documentElement?.nodeName ?? '',
      hata: hataDugumu ? (hataDugumu.textContent?.trim().slice(0, 400) ?? 'bilinmeyen') : null,
    };
  }, metin);
}

/**
 * Bir düzenli ifadenin ilk yakalama grubunu toplar.
 *
 * `matchAll` grupları `string | undefined` tiplidir (`noUncheckedIndexedAccess`);
 * her çağrı yerinde ayrı ayrı daraltmak yerine tek yerde süzülüyor.
 */
function yakalananlar(metin: string, desen: RegExp): string[] {
  return [...metin.matchAll(desen)].map((eslesme) => eslesme[1]).filter((d) => d !== undefined);
}

/** `<loc>` adresleri — sitemap'in tek gerçek yükü. */
function locAdresleri(sitemapXml: string): string[] {
  return yakalananlar(sitemapXml, /<loc>([^<]+)<\/loc>/g);
}

/**
 * Mutlak adresi test sunucusunun kökenine taşır.
 *
 * ÖLÇÜLDÜ: `sitemap.xml` ve `rss.xml` adresleri `NEXT_PUBLIC_SITE_URL`den
 * üretiyor (`absoluteUrl`), yani içerideki adresler `http://localhost:3000/…`
 * — testin konuştuğu `127.0.0.1:3100` değil. Bu adresler doğrudan istenirse
 * ya bağlantı hatası alınır ya da geliştiricinin AÇIK `pnpm dev` sunucusuna
 * gidilir: test o zaman ölçmesi gereken derlemeyi hiç ölçmez ve makineye göre
 * değişen bir sonuç üretir.
 */
function kokeniTasi(mutlakUrl: string, temel: string): string {
  const hedef = new URL(mutlakUrl);
  const taban = new URL(temel);

  hedef.protocol = taban.protocol;
  hedef.host = taban.host;

  return hedef.toString();
}

test.describe('§4.1 · robots.txt', () => {
  test('200, text/plain ve paneli kapatıyor (§8.7)', async ({ request }) => {
    const yanit = await request.get('/robots.txt');

    expect(yanit.status()).toBe(200);
    expect(yanit.headers()['content-type']).toContain('text/plain');

    const metin = await yanit.text();

    /*
     * §8.7'nin ikinci yarısı. `X-Robots-Tag` başlığı (T-004) sayfa ÇEKİLDİĞİNDE
     * indekslemeyi engeller; `robots.txt` taramayı en baştan engeller. Başlığı
     * doğrulayan `security-headers.spec.ts` var, bu satırı doğrulayan yoktu.
     */
    expect(metin, '`/panel` taramaya kapalı olmalı (§8.7)').toContain('Disallow: /panel');
    expect(metin, '`/api` taramaya kapalı olmalı').toContain('Disallow: /api');

    // Sitemap bildirimi olmadan robots.txt'in ikinci işlevi eksik kalır.
    expect(metin).toMatch(/^Sitemap:\s*https?:\/\/\S+\/sitemap\.xml$/m);
  });
});

test.describe('§4.1 · sitemap.xml', () => {
  test('200, geçerli XML ve en az bir <url> taşıyor', async ({ request, page }) => {
    const yanit = await request.get('/sitemap.xml');

    expect(yanit.status()).toBe(200);
    expect(yanit.headers()['content-type']).toContain('xml');

    const govde = await yanit.text();
    const { kok, hata } = await xmlAyristir(page, govde);

    expect(hata, `sitemap.xml geçerli XML değil: ${hata}`).toBeNull();
    expect(kok).toBe('urlset');

    const adresler = locAdresleri(govde);

    expect(adresler.length, 'sitemap boş — hiçbir sayfa bildirilmiyor').toBeGreaterThan(0);

    // §8.7 — panel ve API sitemap'te ASLA yer almamalı. `robots.txt` onları
    // kapatırken sitemap'in aynı adresleri "beni tara" diye bildirmesi
    // çelişkili bir sinyal olurdu ve kuralı yok sayan botlara yol gösterirdi.
    for (const adres of adresler) {
      expect(new URL(adres).pathname, `sitemap gizli alanı bildiriyor: ${adres}`).not.toMatch(
        /^\/(panel|api|giris)\b/,
      );
    }
  });
});

test.describe('§4.1 · OG görseli', () => {
  test('/og → 200 ve GERÇEK 1200×630 PNG', async ({ request }) => {
    const yanit = await request.get('/og');

    expect(yanit.status()).toBe(200);

    const { genislik, yukseklik } = pngDogrula(await yanit.body());

    expect({ genislik, yukseklik }).toEqual({
      genislik: OG_GENISLIK,
      yukseklik: OG_YUKSEKLIK,
    });
  });

  test('ana sayfa kendi paylaşım görselini gösterir', async ({ page, request }) => {
    await page.goto('/');

    const adres = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(adres).toMatch(/\/og$/);

    const yanit = await request.get(new URL(adres ?? '').pathname);
    expect(yanit.status()).toBe(200);
    expect(pngDogrula(await yanit.body())).toMatchObject({
      genislik: OG_GENISLIK,
      yukseklik: OG_YUKSEKLIK,
    });
  });

  test('sorgu parametresi görsele GİRMİYOR — herkese açık metin oluşturucu değil', async ({
    request,
  }) => {
    const varsayilan = await request.get('/og');
    const denemeli = await request.get('/og?title=Saldirganin%20metni&headline=x');

    expect(denemeli.status()).toBe(200);
    const govde = await denemeli.body();
    pngDogrula(govde);
    // BAYT DÜZEYİNDE aynı: metin yalnızca profilden geliyor (ADR-032'nin görsel karşılığı).
    expect(govde.equals(await varsayilan.body()), 'sorgu parametresi görseli değiştirdi').toBe(
      true,
    );
  });
});

/**
 * GENEL KATMAN — sitemap'i okuyup içindeki her adresi çeker.
 *
 * Neden elle liste değil: bugün tek sayfa var, yarın yenisi eklenebilir.
 * Elle tutulan bir listede o sayfa unutulur ve unutulduğu ANLAŞILMAZ — T-018'deki `NavItem.hazir`
 * bayrağıyla aynı kalıp. Sitemap'i kaynak almak, kapsamı içeriğe bağlar:
 * sitemap'e giren her URL kendiliğinden kapsanır.
 *
 * SİTEMAP'İN KENDİSİ DE DENETLENMİŞ OLUYOR: bir URL 404 dönüyorsa ya sayfa
 * eksiktir ya da sitemap var olmayan bir sayfayı bildiriyordur. İkisi de
 * hatadır — arama motoruna var olmayan adres bildirmek tarama bütçesini
 * harcar ve sitede kırık bağlantı olduğu sinyali verir.
 */
test.describe('§4.1 · sitemap taraması — bildirilen her URL yaşıyor mu', () => {
  test('sitemap.xml içindeki tüm adresler 200 dönüyor', async ({ request, baseURL }) => {
    const govde = await (await request.get('/sitemap.xml')).text();
    const adresler = locAdresleri(govde);

    expect(adresler.length).toBeGreaterThan(0);

    const sonuclar = await Promise.all(
      adresler.map(async (adres) => {
        const yol = new URL(adres).pathname;
        const yanit = await request.get(kokeniTasi(adres, baseURL ?? 'http://127.0.0.1:3100'));

        return { yol, durum: yanit.status() };
      }),
    );

    // Hepsi tek seferde raporlanıyor: ilk hatada durulsaydı, üç kırık adresten
    // yalnızca biri görünür ve düzeltme üç tura yayılırdı.
    const kirik = sonuclar.filter((s) => s.durum !== 200);

    expect(
      kirik,
      `sitemap.xml var olmayan adres bildiriyor:\n${kirik
        .map((s) => `  ${s.durum}  ${s.yol}`)
        .join('\n')}`,
    ).toEqual([]);
  });
});
