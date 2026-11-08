import { expect, test, type Page } from '@playwright/test';

import {
  adminCredentials,
  denetimSondasiSil,
  denetimSondasiYaz,
  findAdminUser,
} from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * ADR-034 SINIRI ARAYÜZDE — ham `diff` yanıt gövdesine giriyor mu (T-054g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU PAKET VAR — BİRİM TESTLERİ NEYİ ÖLÇEMEZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `tests/unit/services/denetim-kaydi.test.ts` DTO'yu çok iyi ölçüyor: gerçek
 * `writeAuditLog` ile sızmış bir satır üretip `toDiffSummary` ve `fetchAuditLog`
 * çıktısında o değerlerin olmadığını kanıtlıyor. Ölçemediği şey tek ve tam
 * olarak şu: **DTO ile tarayıcıya giden bayt arasındaki mesafe.**
 *
 * O mesafe burada boş değil. `DenetimEkrani` bir İSTEMCİ bileşeni (`'use client'`)
 * ve sayfa ona `kayitlar={liste.items}` veriyor; yani DTO olduğu gibi RSC
 * yüküne serileşiyor. T-041f'nin dersi aynen geçerli: prop olarak geçen veri,
 * ekranda gösterilmese bile yükte DURUR. Bugün DTO'da ham `diff` yok, yani yük
 * temiz — ama bu sınırı hiçbir kapı tutmuyordu. Sayfanın bir gün
 * `fetchAuditLog` yerine ham satırı çekmesi, ya da bileşene teşhis amaçlı bir
 * prop eklenmesi, birim testlerini YEŞİL bırakıp yükü kirletir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ VAKUM TUZAĞI — T-043g'de İKİSİNE DE DÜŞÜLDÜ, BURADA KURULUYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-043g'de KVKK sızıntısını ölçtüğünü sanan iki iddia aslında GİRİŞ SAYFASINA
 * bakıyordu: `request` fixture'ı çerez taşımıyor, `page.request` ise
 * yönlendirmeyi sessizce izliyor — ikisi de 200 dönüyordu. "Aranan dize yok"
 * böyle bir gövdede her zaman doğrudur ve hiçbir şey ölçmez.
 *
 * Bu yüzden gövde YALNIZCA gezinme yanıtından okunuyor ve üç ÇAPA iddiası
 * NEGATİFLERDEN ÖNCE koşuyor:
 *
 *   1. adres gerçekten `/panel/ayarlar/denetim`     → doğru sayfadayız
 *   2. sondanın `entity`si gövdede                  → satır yüke girdi
 *   3. ⚠️ BEYAZ LİSTEDEKİ `context` DEĞERİ gövdede  → POLARİTE ÇAPASI
 *
 * Üçüncüsü bu paketin mutasyona dayanıklılığı. Negatif iddialar tek başına,
 * `diff` özeti DTO'dan TAMAMEN kaldırılsa bile yeşil kalırdı — yani korumanın
 * kaldırılmasıyla korumanın çalışmasını ayırt edemezdi. İzinli bir değerin
 * GÖRÜNMESİNİ şart koşmak, gövdenin diff değeri taşıyabilen bir gövde
 * olduğunu kanıtlıyor; ondan sonra "diğerleri yok" bir şey söylüyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ÖLÇÜLMÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * (1) Sonda satırı İLK SAYFADA olduğu varsayımıyla aranıyor: sıralama
 *     `createdAt desc`, sayfa boyutu 50 ve satır gezinmeden hemen önce
 *     yazılıyor. Paralel koşan başka bir paketin o aralıkta 50 denetim satırı
 *     üretmesi beklenmiyor; üretirse çapa iddiası KIRILIR — yani yanlış
 *     yeşil değil, gürültülü kırmızı verir.
 * (2) Sayfalamanın ileri sayfaları ölçülmüyor; sınır aynı kodu kullanıyor.
 * (3) Beyaz listeye yeni bir ad eklenmesinin polaritesi burada DEĞİL,
 *     `tests/unit/denetim-beyaz-liste-polarite.test.ts` içinde ölçülüyor —
 *     o soru kaynak şekliyle ilgili ve birim seviyesinde kesin cevaplanıyor.
 */

/** Koşuma özgü sonek: iki Playwright projesi aynı anda koşuyor. */
const KOSUM = `${process.pid}-${Date.now().toString(36)}`;

const SONDA_ENTITY = 'E2EDenetimSondasi';
const SONDA_ENTITY_ID = `sonda-${KOSUM}`;

/** Beyaz listede (`context`) — GÖRÜNMESİ gereken değer, polarite çapası. */
const IZINLI_DEGER = `E2E-IZINLI-BAGLAM-${KOSUM}`;

/**
 * GÖRÜNMEMESİ gereken değerler.
 *
 * `yeniSifre` ve `note` ADR-034'ün ölçtüğü iki sızıntı sınıfı: redaksiyonun
 * bilmediği ad, ve masum anahtarın değerine gömülü sır. `title` ise
 * `buildDiff`in normal çıktısı — kayıt İÇERİĞİ, sır değil ama ekrana da
 * çıkmaması kararlaştırılmış olan şey.
 */
const SIZMAMASI_GEREKENLER = {
  yeniSifre: `E2E-SIZAN-AD-${KOSUM}`,
  note: `sifre: E2E-SIZAN-GOMULU-${KOSUM}`,
  titleOnce: `E2E-SIZAN-ONCE-${KOSUM}`,
  titleSonra: `E2E-SIZAN-SONRA-${KOSUM}`,
} as const;

const SONDA_DIFF: Record<string, unknown> = {
  context: IZINLI_DEGER,
  yeniSifre: SIZMAMASI_GEREKENLER.yeniSifre,
  note: SIZMAMASI_GEREKENLER.note,
  title: { before: SIZMAMASI_GEREKENLER.titleOnce, after: SIZMAMASI_GEREKENLER.titleSonra },
};

async function panelOturumu(page: Page, baseURL: string | undefined): Promise<void> {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();

  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

/** Çapalar + negatifler — iki farklı gövde biçimi için tek yerde. */
function govdeyiOlc(govde: string, nerede: string): void {
  /* ---- ÇAPALAR: bu gövde gerçekten denetim listesi mi -------------- */
  expect(govde.length, `${nerede}: gövde boş`).toBeGreaterThan(0);
  expect(govde, `${nerede}: sonda satırı yükte YOK — iddia boşa koşuyor`).toContain(SONDA_ENTITY);
  expect(govde, `${nerede}: sonda kimliği yükte YOK — iddia boşa koşuyor`).toContain(
    SONDA_ENTITY_ID,
  );
  expect(
    govde,
    `${nerede}: BEYAZ LİSTEDEKİ değer (${IZINLI_DEGER}) yükte YOK. Polarite çapası kırıldı: ` +
      'bu gövde diff değeri taşıyamıyor demektir, dolayısıyla aşağıdaki negatif ' +
      "iddialar hiçbir şey ölçmüyor. Ya özet DTO'dan kaldırıldı ya beyaz liste değişti.",
  ).toContain(IZINLI_DEGER);

  /* ---- ALAN ADLARI GÖRÜNÜR: bilgi kaybı olmadığının kanıtı -------- */
  expect(govde, `${nerede}: alan adı 'yeniSifre' yükte olmalı (ad hassas değil)`).toContain(
    'yeniSifre',
  );

  /* ---- NEGATİFLER: hiçbir DEĞER yükte yok ------------------------- */
  for (const [ad, deger] of Object.entries(SIZMAMASI_GEREKENLER)) {
    expect(
      govde,
      `${nerede}: ${ad} DEĞERİ yanıt gövdesine girdi — ADR-034 sınırı arayüzde aşıldı. ` +
        'Ele geçirilmiş bir oturum geçmişteki her diff değerini topluca okuyabilir.',
    ).not.toContain(deger);
  }
}

test.describe('§8.20 · denetim ekranı ham `diff` taşımıyor', () => {
  let sondaId: string | null = null;

  test.beforeAll(async () => {
    sondaId = await denetimSondasiYaz({
      entity: SONDA_ENTITY,
      entityId: SONDA_ENTITY_ID,
      diff: SONDA_DIFF,
    });
  });

  test.afterAll(async () => {
    if (sondaId) await denetimSondasiSil(sondaId);
  });

  test('ilk gezinme (HTML + RSC parçaları) ve yumuşak gezinme (saf RSC yükü)', async ({
    page,
    baseURL,
  }) => {
    await panelOturumu(page, baseURL);

    /* ═══ 1. İLK GEZİNME ═══════════════════════════════════════════════
     *
     * Gövde GEZİNME YANITINDAN okunuyor — `page.request` DEĞİL. İkincisi
     * yönlendirmeyi izler ve oturum düşmüşse giriş sayfasının 200'ünü döner;
     * T-043g'de bu tam olarak oldu. Bu belge HTML ile birlikte RSC uçuş
     * parçalarını da (`self.__next_f.push`) taşıyor, yani tek okuma iki
     * yüzeyi birden kapsıyor.
     */
    const gezinme = await page.goto('/panel/ayarlar/denetim');
    expect(gezinme?.status(), 'denetim sayfası 200 dönmeli').toBe(200);
    expect(page.url(), 'girişe atılmış olabilir — adresi doğrula').toContain(
      '/panel/ayarlar/denetim',
    );

    const belge = (await gezinme?.text()) ?? '';
    govdeyiOlc(belge, 'ilk gezinme belgesi');

    /* Uçuş yükünün gerçekten bu belgenin içinde olduğunu da söylüyoruz:
       olmasaydı yukarıdaki okuma "yalnızca HTML" olurdu ve istemci
       bileşenine geçen propları hiç görmezdi. */
    expect(belge, 'belge RSC uçuş yükü taşımalı').toContain('__next_f');

    /* ═══ 2. YUMUŞAK GEZİNME — SAF RSC YÜKÜ ════════════════════════════
     *
     * Aynı sayfaya `/panel/ayarlar`tan bağlantıyla gidiliyor. Next bu kez
     * HTML değil `?_rsc=` ile saf uçuş yükü çekiyor — istemci bileşenine
     * geçen propların HTML kabuğu olmadan göründüğü biçim. Süzgeç sekmesine
     * tıklamak YANLIŞ ölçüm olurdu: başka bir eylem süzgecinin yükünde sonda
     * satırı hiç bulunmaz ve negatifler vakuma düşerdi.
     */
    await page.goto('/panel/ayarlar');

    /*
     * GÖVDE YOL KESMEYLE YAKALANIYOR, `waitForResponse` İLE DEĞİL.
     *
     * İlk kurulum `waitForResponse(...).text()` kullanıyordu ve şu hatayla
     * düştü: "Response body is not available for a response that was navigated
     * away from". Yumuşak gezinme tamamlandığı anda tarayıcı o kaydı atıyor,
     * yani gövdeyi SONRADAN okumak yarış koşulu. Burada gövde, sayfa onu
     * tüketmeden önce yol kesme eli içinde okunuyor ve yanıt aynen iletiliyor —
     * T-029'da iptal edilmiş gezinme için kurulan kalıbın aynısı.
     */
    let rscGovde: string | null = null;
    let rscDurum: number | null = null;

    await page.route(
      (url) => url.pathname === '/panel/ayarlar/denetim' && url.searchParams.has('_rsc'),
      async (route) => {
        /*
         * ÖN YÜKLEME (prefetch) ATLANIR — 2026-10-30. Bağlantı ilk ekranın
         * dışına düşünce (mobil, Ayarlar'a "Bildirimler" eklendi) tıklama ile
         * görünüme giriş aynı anda prefetch + gezinme ateşliyor; prefetch yükü
         * dinamik sayfanın VERİSİNİ taşımaz ve son biten o olursa ölçüm boşa
         * düşüyordu. Prefetch isteği `next-router-prefetch` başlığı taşır.
         */
        if (route.request().headers()['next-router-prefetch']) return route.continue();
        const yanit = await route.fetch();
        rscGovde = await yanit.text();
        rscDurum = yanit.status();
        await route.fulfill({ response: yanit });
      },
    );

    await page.getByRole('link', { name: 'Denetim kaydı' }).click();
    await expect(page).toHaveURL(/\/panel\/ayarlar\/denetim/);
    await expect(page.getByRole('heading', { name: 'Denetim kaydı' }).first()).toBeVisible();

    expect(rscDurum, 'saf RSC yükü hiç istenmedi — yumuşak gezinme ölçülemedi').toBe(200);
    govdeyiOlc(rscGovde ?? '', 'yumuşak gezinme RSC yükü');
  });
});
