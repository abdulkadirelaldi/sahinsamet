import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { TWO_FACTOR_SETUP_PATH } from '@/lib/security/two-factor';

/**
 * ROTA ENVANTERİ × KAPI KAPSAMI — T-016b.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BİR TEST, NEDEN BİR KEZLİK RAPOR DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-029d'nin kapanış sorusu şuydu: "ölçülmeyen başka yüzey var mı?" O soruyu
 * bir kez cevaplayıp rapora yazmak, cevabın YAZILDIĞI GÜN doğru olması demekti.
 * F3 panel rotalarını çoğaltacak; her yeni rota, kimsenin fark etmediği yeni
 * bir kör nokta açar. Bu, deponun defalarca gördüğü kalıbın ta kendisi:
 *
 *   - `NavItem.hazir` (T-018) — elle tutulan liste, unutulan yeni rota
 *   - BULGU-015 — `/og`, `robots.txt`, `rss.xml` hiçbir kapının uğramadığı
 *     yüzeydeydi; `/og` çalışma zamanında ÇÖKÜYORDU ve bütün kapılar yeşildi
 *   - BULGU-016 — sitemap var olmayan üç adresi bildiriyordu
 *
 * Bu yüzden kapsam kararı KODA bağlanıyor: envanter dosya sisteminden
 * TÜRETİLİYOR (elle liste yok), her rota için bir kapsam beyanı ARANIYOR ve
 * beyanların KANITI doğrulanıyor. Yeni bir rota eklendiğinde bu test kırmızı
 * olur ve ekleyen kişiden tek bir şey ister: "bu rotaya hangi kapı dokunuyor?"
 * Cevap "hiçbiri" olabilir — ama YAZILI ve GEREKÇELİ olmak zorunda.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ÖLÇMÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu kapı, kapsamın YETERLİ olduğunu söylemez; kapsamın BEYAN EDİLDİĞİNİ ve
 * beyanın kanıtının hâlâ durduğunu söyler. "200 dönüyor mu" ile "doğru içeriği
 * veriyor mu" farkını her satırın `not` alanı açıkça yazar — çünkü asıl tehlike
 * kapsamsız rota değil, KAPSANDIĞI SANILAN rotadır.
 */

// ---------------------------------------------------------------------------
// 1. Envanter — dosya sisteminden türetilir
// ---------------------------------------------------------------------------

const PROJE_KOKU = path.resolve(__dirname, '../..');
const APP_KOKU = path.join(PROJE_KOKU, 'src/app');

/**
 * Rota üreten dosya adları.
 *
 * `layout`, `error`, `loading`, `not-found`, `template` BİLEREK DIŞARIDA:
 * bunlar rota değil, rotanın içinde çalışan bileşenler — kendi adresleri yok.
 * `icon.svg` / `opengraph-image.*` gibi STATİK metadata dosyaları da dışarıda:
 * onlar kod değil, derlemenin kopyaladığı varlıklar; kapı sorusu ("bu adres
 * doğru davranıyor mu") onlarda "dosya var mı"ya iner ve derleme adımı bunu
 * zaten söyler. `robots.ts` ve `sitemap.ts` ise KOD üretir, o yüzden içeride.
 */
const KOK_METADATA: Record<string, string> = {
  'robots.ts': '/robots.txt',
  'sitemap.ts': '/sitemap.xml',
};

export interface TuretilmisRota {
  readonly yol: string;
  readonly tip: 'page' | 'route' | 'metadata';
  readonly dosya: string;
}

/**
 * `src/app` ağacını gezip rota adreslerini üretir.
 *
 * Next kuralları: `(grup)` dizinleri adrese GİRMEZ, `[slug]` / `[...hepsi]` /
 * `[[...istege-bagli]]` desen olarak KORUNUR (her slug'ı ayrı rota saymak
 * anlamsız olurdu — temsilci yeterli, bkz. KAPSAM notları).
 */
export function rotalariTuret(kok: string): TuretilmisRota[] {
  const gez = (dizin: string, parcalar: string[], derinlik: number): TuretilmisRota[] => {
    const bulunan: TuretilmisRota[] = [];

    for (const ad of readdirSync(dizin).sort()) {
      const tam = path.join(dizin, ad);

      if (statSync(tam).isDirectory()) {
        const grup = ad.startsWith('(') && ad.endsWith(')');
        bulunan.push(...gez(tam, grup ? parcalar : [...parcalar, ad], derinlik + 1));
        continue;
      }

      const uzanti = path.extname(ad);
      const taban = path.basename(ad, uzanti);

      if ((taban === 'page' || taban === 'route') && (uzanti === '.ts' || uzanti === '.tsx')) {
        const yol = `/${parcalar.join('/')}`.replace(/\/+$/, '');
        bulunan.push({
          yol: yol === '' ? '/' : yol,
          tip: taban,
          dosya: path.relative(PROJE_KOKU, tam),
        });
      } else if (parcalar.length === 0 && KOK_METADATA[ad] !== undefined) {
        bulunan.push({
          yol: KOK_METADATA[ad],
          tip: 'metadata',
          dosya: path.relative(PROJE_KOKU, tam),
        });
      }
    }

    return bulunan;
  };

  return gez(kok, [], 0);
}

// ---------------------------------------------------------------------------
// 2. Kapsam beyanı — her rota için bir satır
// ---------------------------------------------------------------------------

type KapiTuru = 'e2e' | 'sitemap-taramasi' | 'lighthouse' | 'kapsanmiyor';

interface KapsamBeyani {
  /** Bu rotaya dokunan kapılar. `kapsanmiyor` tek başına kullanılır. */
  readonly kapilar: readonly KapiTuru[];
  /**
   * Beyanın KANITI — kaynak dosyalarda birebir aranacak dizeler.
   * `e2e` için `tests/e2e/**` içinde, `sitemap-taramasi` için `sitemap.ts`
   * içinde geçmeli. Kanıt olmadan beyan, iyi niyetli bir yorumdan ibarettir.
   */
  readonly kanit: readonly string[];
  /** NE ölçülüyor, ne ölçülmüyor. Kapsanmayan rotalarda gerekçe zorunlu. */
  readonly not: string;
}

const KAPSAM: Record<string, KapsamBeyani> = {
  '/': {
    kapilar: ['e2e', 'lighthouse', 'sitemap-taramasi'],
    kanit: ["page.goto('/')", "absoluteUrl('/')"],
    not: "Public sitenin TEK sayfası (profil). ÖLÇÜLÜYOR: duman testi (tek h1, klavye odağı), güvenlik başlıkları, Lighthouse profilleri; `ana-sayfa.spec.ts` panelde kaydedilen profilin (tanıtım, konum, sosyal bağlantılar, `mailto:`) sayfaya yansıdığını ve boş profilde bağlantı bölümünün HİÇ çizilmediğini, 390 px'te yatay taşma olmadığını doğruluyor. Bileşen birim testleri `tests/unit/profil-sayfasi.test.tsx`te. ÖLÇÜLMEYEN: profil fotoğrafının gerçek R2 ile çizimi (CI'da R2 anahtarı yok).",
  },
  '/giris': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/giris')"],
    not: 'Auth paketinin tamamı buradan geçiyor: kilitleme, TOTP, kurtarma kodu, yönlendirme (§8.1–8.4).',
  },
  '/panel': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel')"],
    not: 'Oturumsuz erişim → /giris (§9 senaryo 4); oturumlu erişim auth paketinde. İÇERİK doğrulanmıyor — F3 panel görevlerinin işi.',
  },
  '/panel/ayarlar': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/ayarlar')"],
    not: '§8.1 kapısı: 2FA kurulmamış oturum buraya giremiyor, güvenlik sayfasına yönleniyor.',
  },
  '/panel/ayarlar/guvenlik': {
    kapilar: ['e2e'],
    kanit: ['TWO_FACTOR_SETUP_PATH'],
    not: 'Adres e2e içinde düz metin değil, `src/lib/security/two-factor` sabitinden geliyor; sabitin bu rotaya çözüldüğü aşağıda ayrıca doğrulanıyor.',
  },
  '/panel/ayarlar/bildirimler': {
    kapilar: ['e2e'],
    kanit: ["'/panel/ayarlar/bildirimler',"],
    not: "2026-10-30 push bildirimleri: abone ol/ayrıl (`bildirimAboneOlAction` — uç nokta yalnızca Apple/Google/Mozilla/Microsoft push kökenleri, SSRF yok), tür anahtarları (`bildirimTercihAction`), test. Planlayıcı `tests/unit/services/bildirim.test.ts`te (saat pencereleri, ay sonu ödeme günü, su hedefi). ÖLÇÜLMEYEN: gerçek push teslimi (Apple/Google sunucuları) ve service worker e2e'de yok.",
  },
  '/panel/ayarlar/hatalar': {
    kapilar: ['e2e'],
    kanit: ["'/panel/ayarlar/hatalar',"],
    not: "2026-10-31 hata izleme listesi (son 50, imzayla gruplu). Yazma `onRequestError` (sunucu) ve panel hata sınırı → `istemciHatasiAction`; temizleme `hatalariTemizleAction` (denetimli). Saklanan metnin maskelenmesi `tests/unit/services/hata-kaydi.test.ts`te. ÖLÇÜLMEYEN: gerçek sunucu hatasıyla uçtan uca kayıt e2e'de yok.",
  },
  '/panel/ayarlar/saglik-baglantisi': {
    kapilar: ['e2e'],
    kanit: ["'/panel/ayarlar/saglik-baglantisi',"],
    not: '2026-11-01 Kısayollar anahtarı: üret, iptal et, son kullanım. Denetimli. ÖLÇÜLMEYEN: gerçek iPhone Kısayolu çalıştırılmadı; uç `tests/unit/api/saglik-olcum.test.ts`te.',
  },
  '/panel/ayarlar/sifre': {
    kapilar: ['e2e'],
    kanit: ["'/panel/ayarlar/sifre',"],
    not: "T-054f ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. Okuma `getTotpStatus()` (2FA açık mı — doğrulama kodu alanı buna göre çiziliyor), yazma TEK Server Action `changePasswordAction`. E2E'ye alınmadı çünkü ölçülecek yeni mekanizma arayüzde DEĞİL: şifre değiştirmenin tamamı — yanlış mevcut şifre, TOTP gerekliliği, hız sınırı, ADR-035 oturum geçersizleştirme ve denetim kaydının şifre TAŞIMAMASI — `tests/unit/actions/sifre-degistirme.test.ts` ve `tests/unit/auth/change-password.test.ts` tarafından ölçülüyor; arayüz yalnızca `fields` anahtarlarını alanların altına basıyor ve o eşleme `panel-form` kabuğunda tek yerde. ÖLÇÜLMEYEN: (1) ADR-035'in BAĞLAYICI METNİ ekranda birebir duruyor mu — metin `sifre-formu.tsx`te `ADR_035_MESAJ` sabitinde ve hiçbir kapı onu dizeyle karşılaştırmıyor; 'Tüm cihazlardan çıkış yapıldı' gibi yasak bir cümleye kayması testle yakalanmaz. (2) `RATE_LIMITED` yanıtının `fields`i YOK, yani mesaj GENEL uyarı olarak çıkıyor; bu dalın ekranda gerçekten alan altına DÜŞMEDİĞİ denenmedi. (3) 2FA KAPALI hesapta `totpCode` alanı hiç çizilmiyor ve `gorunmezAlanlar` ile form düzeyine yükseltiliyor — sunucunun o alana hata basıp basmadığı (teorik olarak basamaz) ölçülmedi. (4) Başarıdan sonra formun temizlendiği (`temizle: true`, şifre alanları ekranda kalmasın) doğrulanmadı.",
  },
  '/panel/ayarlar/denetim': {
    /*
     * ⚠️ KAPI ALANLARI T-054g'DE GÜVENLİK TARAFINDAN GÜNCELLENDİ.
     *
     * ADR-036 beyanın `not` metnini rotayı ekleyene bırakıyor ve o metne
     * DOKUNULMADI. `kapilar`/`kanit` ise beyanın kapı tarafı: T-054g'de bu
     * rotaya bir E2E paketi yazıldı (`panel-denetim-diff.spec.ts`) ve satır
     * `kapsanmiyor` demeye devam ediyordu. Kendi yazdığım kapıyı bildirmemek,
     * haritayı kendi ölçtüğü şeye kör bırakmak olurdu.
     *
     * `not` içindeki "ÖLÇÜLMEYEN (1)" satırı artık GEÇERSİZ — iddia edilen
     * boşluk (ham `diff`in arayüzde/yanıt gövdesinde doğrulanmaması) ölçüldü
     * ve kapatıldı. Metnin güncellenmesi beyan sahibinin (Frontend);
     * gerekçesi docs/security/README.md → "ADR-036 ikinci beyan denetimi".
     */
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/ayarlar/denetim')"],
    not: "T-054f ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. Okuma `fetchAuditLog` SERVİSTEN doğrudan, Server Action'dan DEĞİL — yeniden ihraç edilmesi denetim kaydının tamamını kimlik doğrulamasız bir POST ucuna çevirirdi ve bu ayrı bir kapı tarafından kaynaktan taranıyor. Filtre `auditLogFilterSchema`'dan geçiyor (adres çubuğu kullanıcı girdisi, ADR-032); ters aralık reddedilince süzgeçsiz ilk sayfaya düşülüyor ve kullanıcıya SÖYLENİYOR. ⚠️ ADR-034 SINIRI ARAYÜZDE: ekran `diff.fields` (alan ADLARI) ve `diff.values` (yalnızca `SHOWN_DIFF_VALUE_KEYS`) basıyor; ham `diff` DTO'da hiç yok, yani 'arayüz süzsün' demek tipi değiştirmeyi gerektirir. `ip` listede (karşılaştırmalı değeri var), `userAgent` DTO'da HİÇ SEÇİLMİYOR — bu yüzden DETAY ROTASI YAZILMADI, çağıranı olmazdı. ÖLÇÜLÜYOR (T-054g, `panel-denetim-diff.spec.ts`): `diff` değerlerinin yanıt gövdesine girmediği ARTIK ARAYÜZDEN ölçülüyor — bu satır T-054f'te 'ölçülmeyen' diyordu ve T-055f'te düzeltildi. Paket bir sonda satırı yazıp hem belgeyi hem RSC uçuş yükünü tarıyor: ADR-034'ün iki sızıntı sınıfının (`yeniSifre` adlı alan, masum adın içindeki değer) DEĞERLERİ gövdede YOK, ALAN ADLARI ise VAR — yani bilgi kaybı olmadan değer sızıntısı kapalı. Üç çapası da var (sonda satırı yükte, kimliği yükte, beyaz listedeki değer yükte), yani negatif iddialar boşa koşamıyor. `fields`/`values` dışına çıkan bir düzenleme artık sessiz kalmaz. ÖLÇÜLMEYEN: (1) Sayfa boyutu SABİT 50, adresten verilemiyor — kaynak tüketimi denenmedi. (2) `entity`, `entityId`, `actorId` filtreleri sözleşmede VAR ama arayüzde YÜZEYLENMEDİ: tek kullanıcılı sistemde `actorId` ayırt etmiyor, diğer ikisi için kullanıcı akışı yok; yüzeylendiğinde burası güncellenmeli. (3) Tarih aralığının `to` DAHİL olduğu etiketle söyleniyor ama sınır davranışı (o günün son anı) arayüzden ölçülmedi — servis birim testlerinde.",
  },
  '/api/v1/saglik/olcum': {
    kapilar: ['e2e'],
    kanit: ["'/api/v1/saglik/olcum'"],
    not: 'ANAHTARLA yazma ucu (oturum değil): yalnızca adım, uyku, nabız, kilo; okuma yok. Birim: `tests/unit/api/saglik-olcum.test.ts` (401, 400, 413, virgüllü sayı, kısmi yazma). ÖLÇÜLMEYEN: gerçek Kısayol; IP tavanı süreç başına ve bellek içi.',
  },
  '/api/v1/panel/disa-aktar': {
    kapilar: ['e2e'],
    kanit: ["'/api/v1/panel/disa-aktar?tur=cuzdan'"],
    not: "2026-10-31 CSV indirme (Cüzdan / Sağlık / Alışkanlık). Kimlik iki katman: ara katman `/api/v1/panel/*` + uçta `currentActorId`; her indirme `EXPORT` denetimi; `no-store`. Birim: `tests/unit/api/disa-aktar.test.ts` (401, 400, başlıklar, BOM baytları, denetim; CSV kaçışı ve formül enjeksiyonu). ÖLÇÜLMEYEN: gerçek veritabanıyla tam içerik e2e'de yok; Excel'de açılış elle doğrulanmalı.",
  },
  '/api/v1/panel/eklenti': {
    kapilar: ['e2e'],
    kanit: ["'/api/v1/panel/eklenti'"],
    not: "T-037f ile eklendi (ADR-044). Kimlik İKİ KATMAN: ara katman `/api/v1/panel/*`ı oturumsuz 401'e çeviriyor (§8.5) + uçta `currentActorId` (§8.6, ADR-035/B). Sıra: kimlik → boyut (`Content-Length`, gövde OKUNMADAN) → §8.16 hız → form şeması → hedef varlığı (ADR-018) → `storeAttachment`: baytlar YAZMADAN ÖNCE doğrulanıyor (boyut, sihirli bayt, ADR-043), anahtar sunucuda. DB düşerse nesne hemen siliniyor. Birim: `tests/unit/api/eklenti-yukleme.test.ts` (route'un kendisi, gerçek `FormData` ile). ÖLÇÜLDÜ YERELDE, CI'DA DEĞİL (2026-10-20, tek seferlik paket, gerçek bucket): kapak seçici ve galeriden yükleme, public proje sayfasında görselin gerçekten çizilmesi (`naturalWidth` 64), oturumsuz 200, CSP ihlali 0, panelden silme; ayrıca ÖNBELLEK: önbellekli public sayfa ekleme sonrası 0→1, silme sonrası 1→0. CI'da R2 anahtarı yok ve 'atlanan test yok' nöbeti koşullu atlamayı kabul etmiyor. ÖLÇÜLMEYEN: (1) Yukarıdakinin CI'da tekrarı. (2) `Content-Length` yalan söyleyen 10 MB+ gövde `formData()` ile belleğe alınıyor; asıl sınır baytta — bellek tepe değeri ölçülmedi.",
  },
  '/api/v1/dosya/[id]': {
    kapilar: ['e2e'],
    kanit: ["'/api/v1/dosya/ckyokboylebirdosya000000001'"],
    not: "T-037f ile eklendi (ADR-044). Eklentiyi R2'den okuyup AYNI KÖKENDEN sunuyor — HTML'de imzalı adres yok, CSP `img-src 'self'` kalıyor, ADR-018'in önbellek çatışması doğmuyor. VARSAYILAN REDDET: yalnızca `PROJECT`/`POST`/`PROFILE` herkese açık (`public, immutable` — içerik değişmez); TEK İSTİSNA (T-117) vitrindeki bir müşterinin KENDİ logosu — `isPublicClientLogo` sahip kimliğiyle, ve `public, max-age=3600` (immutable DEĞİL: vitrin izni geri alınabilir); diğer makbuz/iş/müşteri eklentileri yalnızca oturumla (`private, no-store`, noindex) ve oturumsuz istek 404 alıyor (401 varlığı söylerdi). ETag = sağlama; eşleşirse 304 ve R2 okunmuyor. Kimlik dar karakter kümesinden geçmeyen istek veritabanına gitmiyor. Birim: `eklenti-yukleme.test.ts`. ÖLÇÜLMEYEN: (1) Taslak bir projenin kapağı kimliği bilen birine açık — kimlik tahmin edilemez (cuid) VARSAYILDI; yayın durumuna bağlamak ek sorgu ister. (2) Büyük dosyada bellek: nesne tamamen okunup veriliyor (akış değil); 10 MB üst sınırla kabul.",
  },
  '/panel/saglik': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/saglik'"],
    not: "ÖLÇÜLÜYOR (T-116, `panel-kisisel.spec.ts`): dört trend grafiğinin (Kilo/Uyku/Dinlenik nabız/Adım) çizildiği ve sayfanın 360 px'te yatay taşmadığı, iki projede. T-113 ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. İKİ AYRI OKUMA: `fetchHealthTrend` (ARTAN, aralığın tamamı, `TREND_MAX_DAYS` tavanlı) grafikler için, `fetchHealthLogs` (en yeni önce, sayfalı 20) liste için — sayfalı listeden grafik çizmek yalnızca ilk sayfayı çizerdi. Üçüncü okuma `findHealthLogIdByDay(bugün)` üst çubuktaki 'Bugünü kaydet / düzenle' düğmesini seçiyor (günde tek kayıt). `?aralik=` KAPALI KÜME (30/90/365), tanınmayan değer 90'a düşüyor — `TREND_MAX_DAYS` adresten delinemez (ADR-032). Yazma liste satırından `deleteHealthLogAction`. Grafikler RECHARTS DEĞİL: bağımlılıksız SVG (`trend-grafigi.tsx`), çünkü `agir-yigin-tembel` kapısı Recharts'ı tek bileşene bağlıyor ve tek serili çizgi 109 kB'ı haklı çıkarmıyor. ÖLÇÜLMEYEN: (1) Grafik geometrisi (eksen adımları, boş ölçünün nokta ÜRETMEMESİ) birim testinde değil, yalnızca tarayıcıda gözle doğrulandı. (2) Sayfa boyutu SABİT 20. (3) 'Bugün' sunucuda `appToday()` ile İstanbul gününe göre — gece 00:00–03:00 sınırı arayüzden denenmedi, servis birim testlerinde.",
  },
  '/panel/saglik/yeni': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/saglik/yeni'"],
    not: "ÖLÇÜLÜYOR (T-116): virgüllü ölçü (`82,5`) NOKTALI kaydedilip düzenlemede `82,50` okunuyor; aynı güne ikinci kayıt CONFLICT'i 'O günün kaydını düzenle' bağlantısına dönüşüp mevcut kayda götürüyor. T-113 ile eklendi. Okuma yok; gün varsayılanı SUNUCUDA `appToday()` — istemcide `new Date()` gece yarısından sonra üç saat boyunca DÜNÜ önerirdi. Yazma `createHealthLogAction`. Aynı güne ikinci kayıt CONFLICT dönüyor ve `fields.existingId` formda 'O günün kaydını düzenle' bağlantısına çevriliyor (kimlik formun alanı değil, kabuk basmazdı). Ölçüler DİZE gidiyor; `ONDALIK_YA_DA_YOK` yalnızca virgülü noktaya çeviriyor. ÖLÇÜLMEYEN: (1) CONFLICT bağlantısının uçtan uca davranışı; eylem dalı birim testinde (`saglik-actions.test.ts`). (2) `ONDALIK_YA_DA_YOK`un birden fazla virgül içeren girdide davranışı — şema reddediyor, mesajın alan altına düştüğü denenmedi.",
  },
  '/panel/saglik/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/saglik/${k.saglik}'],
    not: "T-113 ile eklendi. Okuma `fetchHealthLogById` TEK KAYIT; yoksa 404. Yazma `updateHealthLogAction` + `deleteHealthLogAction`. Silme onayı değerlerin HİÇBİR YERDE kalmadığını söylüyor — T-110 kararı (denetim kaydına yalnızca gün yazılıyor); `deneyim`deki 'denetim kaydında görünmeye devam eder' metni burada yalan olurdu, bu yüzden onay metni çağırandan geliyor (`kalici-sil-dugmesi.tsx`). ÖLÇÜLMEYEN: (1) BOŞALTMAK SİLİYOR (önceden silmiyordu): temizlenebilir sütunlar güncellemede `null` kabul ediyor ve form dolu iken boşaltılan alanı `null`a çeviriyor (`bosaltilanlariNullYap`) — ÖLÇÜLÜYOR, `panel-kisisel.spec.ts`: kilo boşaltılıp kaydediliyor, yenilemeden sonra boş, uyku yerinde; mutasyonla eski kusur geri üretildi. (2) Tarihi başka bir kayda ait güne çekmek CONFLICT veriyor; mesajın alan altına düştüğü arayüzden denenmedi.",
  },
  '/panel/spor/gecmis': {
    kapilar: ['e2e'],
    kanit: ['spor\\/gecmis$/'],
    not: "2026-10-30: eski antrenman listesi `/panel/spor`dan buraya taşındı (sayfa 25, `fetchWorkouts`); `/panel/spor` artık program + 'Başlat' ekranı. ÖLÇÜLÜYOR: `panel-kisisel.spec.ts` antrenman silindikten sonra buraya dönüldüğünü bekliyor. İÇERİK ölçülmüyor.",
  },
  '/panel/spor/oturum/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/spor/oturum/${k.oturum}'],
    not: "2026-10-30 canlı antrenman oturumu. `cuidSchema` dışı kimlik 404; okuma `fetchSession` (yapılan setler + hareketin önceki seti). Set yazma mevcut `createWorkoutSetAction` (rekor hesabı orada), bitiş `finishSessionAction` (süre + MET × son tartı × süre). Servis `tests/unit/services/antrenman-oturumu.test.ts`te (açık oturum yeniden kullanılır, bitmiş ikinci kez bitmez, Decimal sızmaz). ÖLÇÜLMEYEN: oturum ekranının akışı (set → dinlenme → sonraki hareket) e2e'de yok; dinlenme sayacı yalnızca istemcide.",
  },
  '/panel/cuzdan': {
    kapilar: ['e2e'],
    kanit: ["'/panel/cuzdan',"],
    not: "2026-10-30 Cüzdan (muhasebenin yerine): net varlık, bu ayın hesabı, hesaplar/borçlar/gelirler/giderler. Okuma `fetchCuzdan` (kurlar `fetchKurlar`: Truncgil → 10 dk bellek → `PriceQuote` son bilinen, 'bayat' uyarısıyla). CSP paketi geziyor — yükleniyor, ihlal yok. Hesap kuralları `tests/unit/services/cuzdan.test.ts`te (kursuz kalem toplama girmez, borç SATIŞ kuruyla, ödeme kalanı sıfırın altına indirmez). ÖLÇÜLMEYEN: içerik ve canlı kaynak e2e'de yok.",
  },
  '/panel/cuzdan/transfer': {
    kapilar: ['e2e'],
    kanit: ["'/panel/cuzdan/transfer'"],
    not: "2026-11-01 hesaplar arası transfer ve geri alma. Kurallar `tests/unit/services/cuzdan-hesap.test.ts`te. ÖLÇÜLMEYEN: e2e'de içerik yok.",
  },
  '/panel/cuzdan/ara': {
    kapilar: ['e2e'],
    kanit: ["'/panel/cuzdan/ara',"],
    not: "2026-11-01 gelir ve gider arama. `?q=` en az 2 karakter, en çok 80; Prisma parametresi olarak gider. Okuma `araCuzdan`, tavan 100. ÖLÇÜLMEYEN: e2e'de içerik yok.",
  },
  '/panel/cuzdan/arsiv': {
    kapilar: ['e2e'],
    kanit: ["'/panel/cuzdan/arsiv',"],
    not: "2026-11-01 ana ekranda görünmeyen kayıtlar: kaldırılan hesap (geri getirilir), kapanan borç, sonlanan kalem, tarihsiz eski kalem. Okuma `fetchCuzdanArsivi`. ÖLÇÜLMEYEN: e2e'de içerik yok.",
  },
  '/panel/cuzdan/rapor': {
    kapilar: ['e2e'],
    kanit: ["'/panel/cuzdan/rapor',"],
    not: "2026-11-01 aylık rapor. `?ay=YYYY-MM` (bozuk/gelecek → bu ay). Tek seferlik akış ve borç ödemeleri gerçek; düzenli kalemler bugünkü değerle tahmini. Hesap `tests/unit/services/cuzdan-rapor.test.ts`te. ÖLÇÜLMEYEN: e2e'de içerik yok.",
  },
  '/panel/cuzdan/yeni': {
    kapilar: ['e2e'],
    kanit: ["'/panel/cuzdan/yeni',"],
    not: '2026-10-30. `?tur=hesap|borc|gelir|gider` hangi formun açılacağını seçer (bilinmeyen → hesap). Yazma `createWalletAccountAction` / `createWalletDebtAction` / `createWalletFlowAction`; tutar `tutarOku` ile "1.250,50" → "1250.50". ÖLÇÜLMEYEN: formlar e2e\'de doldurulmuyor.',
  },
  '/panel/cuzdan/hesap/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/cuzdan/hesap/${k.hesap}'],
    not: '2026-10-30. `cuidSchema` dışı ya da arşivli kimlik 404. Okuma `fetchWalletAccountById`; yazma `updateWalletAccountAction`, `archiveWalletAccountAction` (iki dokunuşlu onay). ÖLÇÜLMEYEN: e2e yok.',
  },
  '/panel/cuzdan/borc/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/cuzdan/borc/${'],
    not: '2026-10-30. Okuma `fetchWalletDebtById` + `fetchDebtPayments`; ödeme `addDebtPaymentAction` (kalanı düşürür, sıfırda borcu kapatır — servis testinde), düzenleme `updateWalletDebtAction`, silme `deleteWalletDebtAction`. ÖLÇÜLMEYEN: e2e yok.',
  },
  '/panel/cuzdan/akis/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/cuzdan/akis/${k.akis}'],
    not: '2026-10-30. Gelir/gider düzenleme: `fetchWalletFlowById`, `updateWalletFlowAction`, `deleteWalletFlowAction`. ÖLÇÜLMEYEN: e2e yok.',
  },
  '/panel/spor': {
    kapilar: ['e2e'],
    kanit: ["'/panel/spor',"],
    not: "2026-10-30: program ekranı — bugünün program günü üstte, 'Başlat' (`startSessionAction`, açık oturum varsa ona gider), program yoksa `createSuggestedProgramAction`; altta son 5 antrenman (`fetchRecentSessions`). CSP paketi (`csp.spec.ts`) geziyor — yükleniyor, ihlal yok. İÇERİK e2e'de ölçülmüyor. Eski liste `/panel/spor/gecmis`te.",
  },
  '/panel/spor/yeni': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/spor/yeni'"],
    not: "ÖLÇÜLÜYOR (T-116): 'Antrenmanı aç' başarıda `/panel/spor/<id>` detayına düşüyor; detayda set eklemek rekor bildirimi üretiyor ve antrenmanı SİLMEK o rekoru rekor listesinden DÜŞÜRÜYOR (cascade + yeniden hesap, gerçek veritabanıyla). T-114 ile eklendi. Okuma yok; gün varsayılanı sunucuda `appToday()` (ADR-016). Yazma `createWorkoutAction`; başarıda `/panel/spor/<id>`e geçiyor (set girişi orada). ÖLÇÜLMEYEN: (1) Gece 00:00–03:00 gün önerisi ölçülmedi (`saglik/yeni` ile aynı mekanizma).",
  },
  '/panel/spor/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/spor/${k.antrenman}'],
    not: 'T-114 ile eklendi. Okuma `fetchWorkoutById` (setleriyle) + `fetchExercises({isArchived:false, perPage:100})` (yeni set seçicisi) + setlerin işaret ettiği ama aktif listede olmayan her egzersiz için `fetchExerciseById` (arşivli harekete ait set düzenlenirken bağ kopmasın — `islem-formu.tsx` dersi). Yazma `updateWorkoutAction`, `deleteWorkoutAction` (onay setlerin silineceğini ve rekorların yeniden hesaplanacağını söylüyor), `createWorkoutSetAction`, `updateWorkoutSetAction`, `deleteWorkoutSetAction`; set eylemlerinin rekor sonucu `role="status"` ile gösteriliyor. CONFLICT (`setNo`) `fields.setNo` ile alana basılıyor; `workoutId` `gorunmezAlanlar`da. ÖLÇÜLMEYEN: (1) Rekor yeniden hesabının doğruluğu servis testlerinde, ekrandan ölçülmedi. (2) CONFLICT dalı arayüzde denenmedi. (3) Arşivli egzersizin \'(arşivli)\' seçenek olarak görünmesi denenmedi. (4) Ağırlık/RPE/süre/not boşaltmak artık SİLİYOR (`bosaltilanlariNullYap`); bu ekranda arayüzden ölçülmedi, sağlık ekranında ölçülen aynı mekanizma. (metinde yazılı). (5) Seçici tavanı 100 egzersiz.',
  },
  '/panel/spor/egzersizler': {
    kapilar: ['e2e'],
    kanit: ['page.goto(`/panel/spor/egzersizler?'],
    not: "ÖLÇÜLÜYOR (T-116): `?q=` araması tek satıra daralıyor ve satırdan arşivleme onaylı çalışıyor. T-114 ile eklendi. Okuma `fetchExercises` (`exerciseFilterSchema`'dan geçiyor, ADR-032; `q` + `gorunum` + `sayfa`). ⚠️ VARSAYILAN GÖRÜNÜM ARŞİVİ GİZLEMİYOR (servisin `isArchived` varsayılanı yok, korundu). Yazma satırdan `archiveExerciseAction` (iki yönlü; arşivleme onaylı, geri alma onaysız — müşteriler kararı). SİLME YOK (Restrict FK; eylem yazılmadı). ÖLÇÜLMEYEN: (1) Üç görünümün süzme doğruluğu servis testlerinde. (2) `q` büyük/küçük harf duyarsızlığı Türkçe İ/ı için denenmedi. (3) Sayfa boyutu SABİT 25.",
  },
  '/panel/spor/egzersizler/yeni': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/spor/egzersizler/yeni'"],
    not: 'ÖLÇÜLÜYOR (T-116): egzersiz ekleme kütüphaneye dönüyor ve hareket set seçicisinde görünüyor. T-114 ile eklendi. Okuma yok; yazma `createExerciseAction`, başarıda kütüphaneye dönüyor. `name @unique` CONFLICT`i `fields.name` ile alana basılıyor. ÖLÇÜLMEYEN: (1) CONFLICT dalı arayüzde denenmedi. (2) Adın büyük/küçük harf farkıyla ikinci kez eklenebilmesi — veritabanı kuralı, ölçülmedi.',
  },
  '/panel/spor/egzersizler/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/spor/egzersizler/${k.egzersiz}'],
    not: 'T-114 ile eklendi. Okuma `fetchExerciseById` + `fetchRecordsForExercise` (sayfasız, `reps` artan). Yazma `updateExerciseAction`; `isArchived` formda YOK (arşivleme ayrı eylem, listeden). ÖLÇÜLMEYEN: (1) Kas grubu değişikliğinin eski setleri yeniden gruplaması (yardım metninde yazılı) ölçülmedi. (2) Geçersiz kimlikte 404 dışı davranış.',
  },
  '/panel/haftalik': {
    kapilar: ['e2e'],
    kanit: ["'/panel/haftalik',"],
    not: "2026-11-01 haftalık özet. `?hafta=` tarih doğrulanır, gelecek ve bozuk değer bu haftaya düşer. Hesap ve pazar bildirimi `tests/unit/services/haftalik-ozet.test.ts`te. ÖLÇÜLMEYEN: e2e'de içerik yok; gerçek telefona bildirim.",
  },
  '/panel/ingilizce': {
    kapilar: ['e2e'],
    kanit: ["'/panel/ingilizce',"],
    not: "2026-11-06 İngilizce: üç parkur, ünite yolu, seri ve günlük hedef. `?parkur=` bilinmeyen değerde ilk parkura düşer. İlerleme hesabı `tests/unit/ingilizce/ilerleme.test.ts`, müfredat biçimi `mufredat.test.ts`. ÖLÇÜLMEYEN: e2e'de ders oynanmıyor.",
  },
  '/panel/ingilizce/ders/[id]': {
    kapilar: ['e2e'],
    kanit: ["'/panel/ingilizce/ders/gunluk-u1-d1',"],
    not: '2026-11-06 ders oynatıcısı; kilitli ders parkura, boş tekrar parkura döner, bilinmeyen kimlik 404. Değerlendirme `tests/unit/ingilizce/degerlendir.test.ts`. ÖLÇÜLMEYEN: gerçek cihazda sesli okuma ve konuşma tanıma.',
  },
  '/panel/takvim': {
    kapilar: ['e2e'],
    kanit: ["'/panel/takvim',", "test('takvim: etkinlik oluşturulur"],
    not: "2026-11-10 takvim: ay, hafta, gün ve ajanda; `?gorunum=` bilinmiyorsa ay, `?tarih=` bozuksa bugün. Oluştur → ay/hafta → düzenle → sil ve tekrarlayan etkinlikte 'yalnızca bu' düzenlemesi `tests/e2e/takvim.spec.ts`te. Tekrar açılımı, hatırlatma kararı ve şema `tests/unit/takvim/*`. ÖLÇÜLMEYEN: gerçek telefona hatırlatma bildirimi.",
  },
  '/panel/aylik': {
    kapilar: ['e2e'],
    kanit: ["'/panel/aylik',"],
    not: "2026-11-05 aylık özet; varsayılan önceki ay. `?ay=` doğrulanır, gelecek ve bozuk değer önceki aya düşer. Hesap ve ayın 1'i bildirimi `tests/unit/services/aylik-ozet.test.ts`te. ÖLÇÜLMEYEN: e2e'de içerik yok; gerçek telefona bildirim.",
  },
  '/panel/spor/program': {
    kapilar: ['e2e'],
    kanit: ["'/panel/spor/program',"],
    not: "2026-11-01 program günleri ve yeni gün. Okuma `fetchProgram`. ÖLÇÜLMEYEN: e2e'de içerik yok; akış `antrenman-program` birim testleri ve elle tarayıcıda.",
  },
  '/panel/spor/program/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/spor/program/${k.programGunu}'],
    not: "2026-11-01 gün bilgileri ve hareketleri düzenleme. `[id]` cuid doğrulanır; arşivli gün 404. ÖLÇÜLMEYEN: e2e'de içerik yok.",
  },
  '/panel/spor/gelisim': {
    kapilar: ['e2e'],
    kanit: ["'/panel/spor/gelisim',"],
    not: "2026-11-01 haftalık hacim ve hareket başına ağırlık. `?hareket=` yalnızca listeyle karşılaştırılır, sorguya girmez. Hesap ve rekor kuralı `tests/unit/services/spor-gelisim.test.ts`te. ÖLÇÜLMEYEN: e2e'de içerik yok; gerçek telefona rekor bildirimi.",
  },
  '/panel/spor/rekorlar': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/spor/rekorlar'"],
    not: "ÖLÇÜLÜYOR (T-116): set sonrası rekor satırı `100,5` ile görünüyor; antrenman silinince satır KALKIYOR. T-114 ile eklendi. Okuma `fetchPersonalRecords` (sıra servisin: egzersiz, `reps` artan) + süzgeç seçicisi için `fetchExercises({perPage:100})` — ARŞİV DAHİL (geçmişi okuyor; set seçicisinin tersi). `?egzersiz=` `personalRecordFilterSchema.safeParse` ile doğrulanıyor (ADR-032); geçersiz değer süzgeçsiz listeye düşüyor ve ekran bunu söylüyor. SALT OKUNUR (PR türetilmiş, ADR-021). `workoutSetId === null` 'kaynaksız' rozetiyle görünür. ÖLÇÜLMEYEN: (1) Kaynak antrenmana bağlantı YOK (set→antrenman çözen servis okuması yok). (2) Süzgeç seçicisi tavanı 100.",
  },
  '/panel/hayat': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/hayat'"],
    not: "2026-10-29'da günlük listeye çevrildi (ADR-048 eki). ÖLÇÜLÜYOR (e2e, panel-kisisel): '<ad>: yaptım' `aria-pressed` false→true ve YENİLEMEDEN SONRA da true; 'yapmadım' 'yaptım'ı kaldırıyor ve kalıcı; yeniden dokunuş temizliyor; 360 px'te yatay taşma yok. Okuma `fetchHabitDay(gün)` (sahibinin sırası, eklendiği günden önceki alışkanlık yok); `?gun=` `dayDateSchema` ile doğrulanıyor, gelecek gün bugüne düşüyor. Yazma `setHabitDayStatusAction` (YAPTIM/YAPMADIM/TEMIZLE) ve sayılıda `setHabitDayCountAction`; iyimser, hatada geri dönüyor. Boş listede `createSuggestedHabitsAction`. ÖLÇÜLMEYEN: (1) sayaç (−/+) arayüzden denenmedi. (2) iyimser geri alma dalı tarayıcıda denenmedi. (3) gece 00:00–03:00 'bugün' sınırı.",
  },
  '/panel/hayat/aliskanliklar': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/hayat/aliskanliklar'"],
    not: 'ÖLÇÜLÜYOR (T-116): listeden kayda geçiş ve kayıt ekranından arşivleme. T-115 ile eklendi. Okuma `fetchHabits` (ham, önbeleksiz, sayfa boyutu SABİT 25); filtre `habitFilterSchema`dan geçiyor. Görünüm KAPALI KÜME: hepsi (arşiv DAHİL — T-038/musteriler kararı) / panoda (`isActive && !isArchived`) / ara verildi (`!isActive && !isArchived`) / arşiv. Yazma satırdan `archiveHabitAction` iki yönlü — arşivle onaylı, arşivden çıkar onaysız. SİLME YOK (`HabitLog` CASCADE geçmişi götürürdü) ve ekran bunu yazıyor. ÖLÇÜLMEYEN: (1) Dört görünümün süzme doğruluğu yalnızca `buildHabitWhere` birim testlerinde. (2) Arşivden çıkarmanın onaysız olması karar, ölçülmedi.',
  },
  '/panel/hayat/aliskanliklar/yeni': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/hayat/aliskanliklar/yeni'"],
    not: 'ÖLÇÜLÜYOR (T-116): alışkanlık ekleme listeye dönüyor ve panoda görünüyor. T-115 ile eklendi. Okuma yok; yazma `createHabitAction`. `panel-form` + Server Action zinciri `projeler/yeni`de uçtan uca ölçülüyor. ÖLÇÜLMEYEN: (1) `color` #RRGGBB hatasının alan altına düştüğü arayüzden denenmedi. (2) `icon` serbest metin/emoji — 255 karakter üst sınırı dışında doğrulama yok.',
  },
  '/panel/hayat/aliskanliklar/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/hayat/aliskanliklar/${k.aliskanlik}'],
    not: 'T-115 ile eklendi. Okuma `fetchHabitById` TEK KAYIT; yoksa 404. Arşivlenmiş alışkanlık da açılıyor (arşivden çıkarmanın ikinci yolu). Yazma `updateHabitAction` + `archiveHabitAction`. ÖLÇÜLMEYEN: (1) `targetPerDay` ve `color` boşaltılınca artık TEMİZLENİYOR (`bosaltilanlariNullYap`); bu ekranda arayüzden ölçülmedi, sağlık ekranında ölçülen aynı mekanizma. (sayaçlı alışkanlık aç/kapa türüne dönemez); ekranda yazıyor. (2) `targetPerDay` değişince geçmişin yeniden yorumlanması (servis kararı) arayüzden denenmedi.',
  },
  '/panel/hayat/hedefler': {
    kapilar: ['e2e'],
    kanit: ["'/panel/hayat/hedefler',"],
    not: "2026-10-29'da yeniden yazıldı: haftalık/aylık/yıllık sekmeler (`?donem=`, `?anahtar=`), dönem anahtarı `donemAnahtariGecerliMi` ile süzülüyor — geçersizse bugünün dönemi. Hızlı ekleme `createGoalAction` (dönem + anahtar), tamamlama `updateGoalAction` (ACHIEVED/100), silme iki dokunuşla `deleteGoalAction`. Uzun vadeli sekme eski liste (`uzunVadeli` filtresi). Dönem hesabı `tests/unit/services/donem.test.ts`te. ÖLÇÜLMEYEN: arayüz akışı e2e'de yok.",
  },
  '/panel/hayat/rapor': {
    kapilar: ['e2e'],
    kanit: ["'/panel/hayat/rapor',"],
    not: "CSP paketi (`csp.spec.ts`) geziyor — yükleniyor, ihlal yok. 2026-10-29'da eklendi. Okuma `fetchHabitReport` (son 7/30 gün, `?aralik=30`); dört durum (yapıldı/eksik/yapılmadı/işaretlenmedi) ve 'alışkanlık eklendiği günden önce sayılmaz' kuralı `tests/unit/services/habit-gun.test.ts`te. Yazma yok. ÖLÇÜLMEYEN: ekran e2e'de yok.",
  },
  '/panel/hayat/hedefler/yeni': {
    kapilar: ['e2e'],
    kanit: ["'/panel/hayat/hedefler/yeni',"],
    not: "T-115 ile eklendi. Okuma yok; yazma `createGoalAction`. Durum 'Ulaşıldı'ya çekilince ilerleme istemcide 100'e getiriliyor (servisin (a) yorumu); şemanın çapraz kuralı istemcide `progress` alanına basıyor. ÖLÇÜLMEYEN: (1) `description` denetim kaydına değeriyle girmiyor (yalnızca `changed`) — eylem birim testinde, arayüzden değil.",
  },
  '/panel/hayat/hedefler/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/hayat/hedefler/${k.hedef}'],
    not: "T-115 ile eklendi. Okuma `fetchGoalById` TEK KAYIT; yoksa 404. Yazma `updateGoalAction` + `deleteGoalAction` (onay 'Vazgeçildi' durumunu hatırlatıyor). Ulaşılmış hedefin ilerlemesini düşürmek önce istemci şemasında `progress` hatası; istemci atlatılırsa sunucunun VALIDATION_ERROR'u `fields.progress` ile AYNI alana düşüyor. ÖLÇÜLMEYEN: (1) Sunucu dalı (`GoalRuleError`) arayüzden hiç tetiklenmedi — istemci şeması önce yakalıyor; eylem birim testinde. (2) `targetDate` boşaltılınca artık TEMİZLENİYOR (`bosaltilanlariNullYap`); bu ekranda arayüzden ölçülmedi. (kısmi şema); ekranda yazıyor.",
  },
  '/panel/hayat/gunluk': {
    kapilar: ['e2e'],
    kanit: ["'/panel/hayat/gunluk',"],
    not: "T-115 ile eklendi. Okuma `fetchJournalEntries` (sayfa boyutu SABİT 20) — liste DTO'su `excerpt` + `truncated` taşıyor, TAM METİN TAŞIMIYOR. Filtre `journalEntryFilterSchema`dan geçiyor: `?q=` (başlık+içerik) düz GET formu, `?etiket=` (tam eşleşme) etiket bağlantılarından; reddedilirse süzgeçsiz liste + ekranda uyarı. Yazma YOK (silme kaydın kendi ekranında). ÖLÇÜLMEYEN: (1) İçerikte `contains` aramasının 100.000 karakterlik kayıtlarda sorgu maliyeti ölçülmedi. (2) Etiket büyük/küçük harf duyarlılığı arayüzden denenmedi.",
  },
  '/panel/hayat/gunluk/yeni': {
    kapilar: ['e2e'],
    kanit: ["'/panel/hayat/gunluk/yeni',"],
    not: 'T-115 ile eklendi. Okuma yok; gün varsayılanı SUNUCUDA `appToday()`. Yazma `createJournalEntryAction`. Etiketler ekranda virgüllü METİN, formda DİZİ (`etiketleriAyir`): boş parça atılır, tekrar teke iner, uzunluk KESİLMEZ (sınırı `tagsSchema` söyler). ÖLÇÜLMEYEN: (1) Öğe düzeyi sunucu hatası (`tags.3`) form düzeyine düşer — denenmedi. (2) Denetim kaydına yalnızca gün + alan adları girdiği eylem birim testinde, arayüzden değil.',
  },
  '/panel/hayat/gunluk/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/hayat/gunluk/${k.gunluk}'],
    not: "T-115 ile eklendi. Okuma `fetchJournalEntryById` TEK KAYIT, TAM METİN yalnızca burada; yoksa 404 — formu liste özetinden beslemek metni 240 karaktere keserdi. `metadata.title` SABİT, kaydın başlığı sekmeye/geçmişe sızmıyor. Yazma `updateJournalEntryAction` + `deleteJournalEntryAction`; silme onayı içeriğin hiçbir yerde saklanmadığını söylüyor. ÖLÇÜLMEYEN: (1) `mood` 'Girilmedi'ye çekilince artık TEMİZLENİYOR (`bosaltilanlariNullYap`); bu ekranda arayüzden ölçülmedi. (kısmi şema); ekranda yazıyor. (2) Kimlik numaralandırma (cuid tahmin edilemez VARSAYILDI).",
  },
  '/panel/desenler': {
    kapilar: ['e2e'],
    kanit: ["'/panel/desenler',"],
    not: 'T-031/T-032 ile PARALEL eklendi; kapsamı o görevlerin kararı. Bu satır bilerek "kapsanmıyor" diyor — F3 panel rotaları için ilk örnek: rota var, kapı yok, ve bu artık GÖRÜNÜR. NOT: rota o görevlerle birlikte gelmezse bu satır "ölü beyan" dalını kırmızıya çevirir; doğru tepki satırı SİLMEKTİR.',
  },
  '/panel/icerik/profil': {
    kapilar: ['e2e'],
    kanit: ["'/panel/icerik/profil',"],
    not: "TEKİL VARLIK — liste yok, `[id]` yok, `yeni` yok; `Profile` tek satır (ADR-017, sabit kimlik `singleton`) ve seed ile açılıyor. Okuma `fetchProfile` (ham, önbelleksiz); yazma TEK Server Action `saveProfileAction` (`upsert`, denetim kaydına `CREATE`/`UPDATE`; sosyal bağlantıların DEĞERLERİ değil, değişen ANAHTAR ADLARI yazılıyor). Kimlik zinciri diğer panel rotalarıyla aynı: `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. ÖLÇÜLÜYOR (`ana-sayfa.spec.ts`): bağlantı ekle → kaydet → ana sayfada görünür; kaldır → kaydet → kaybolur; platformun alan adında olmayan adres alan altında reddediliyor. `socialsSchema` kuralları (http(s), alan adı, `mailto:` öneki, `.strict()`) birim testlerinde (`tests/unit/schemas/profile.test.ts`). ÖLÇÜLMEYEN: (1) Fotoğraf yükleme gerçek R2 ile e2e'de yok (CI'da anahtar yok); uç `eklenti-yukleme.test.ts`te. (2) Var olmayan bir eklenti kimliği gönderilince `missingAttachmentFailure` alan hatası veriyor — eylem dalı birim testinde değil.",
  },
  '/api/auth/[...nextauth]': {
    kapilar: ['e2e'],
    kanit: ["'/api/auth/csrf'"],
    not: 'Uç doğrudan bir kez (csrf) çağrılıyor; asıl kapsam dolaylı — bütün giriş/çıkış akışı bu işleyiciden geçiyor.',
  },
  '/api/v1/health': {
    kapilar: ['e2e'],
    kanit: ["request.get('/api/v1/health')", "expect(govde.data.db).toBe('up')"],
    not: "§13.6 sözleşmesi (200 + zarf + dört alan) ve §8.20 sızıntı kontrolü T-016b'de eklendi; başlık/matcher sınırı zaten security-headers.spec.ts'te.",
  },
  '/og': {
    kapilar: ['e2e'],
    kanit: ["request.get('/og')"],
    not: 'Ana sayfanın paylaşım görseli: PNG imzası + IHDR boyutu (1200×630) doğrulanıyor; sorgu parametresi metne girmiyor (aynı bayt). ÖLÇÜLMEYEN: görselin içeriği (ad/tanıtım satırı) piksel düzeyinde karşılaştırılmıyor.',
  },
  '/robots.txt': {
    kapilar: ['e2e'],
    kanit: ["request.get('/robots.txt')"],
    not: 'İçerik doğrulanıyor: `Disallow: /panel` (§8.7) ve text/plain.',
  },
  '/sitemap.xml': {
    kapilar: ['e2e'],
    kanit: ["request.get('/sitemap.xml')"],
    not: 'Hem kendisi (geçerli XML) hem bildirdiği HER adres (200) doğrulanıyor — sitemap bu kapının hem konusu hem aracı.',
  },
};

/**
 * Kapıların bilerek çağırdığı, VAR OLMAYAN adresler.
 *
 * `/api/v1/panel/islem` hiç yazılmadı ve yazılmayacak: ara katman
 * `matcher`'ının `/api/v1/panel/*` kolunu sınamak için kullanılan bir sonda.
 * Rota olmadığı için envanterde çıkmaz; burada beyan edilmezse bir gün biri
 * "bu uç nerede?" diye arar ve bulamaz. BULGU-016'nın aynadaki görüntüsü:
 * orada sitemap var olmayan adresi BİLDİRİYORDU, burada kapı var olmayan
 * adrese İSTEK ATIYOR — ikisi de bilinçli olduğu sürece sorun değil, yazılı
 * olmadığı sürece tuzak.
 */
const SANAL_ROTALAR: Record<string, string> = {
  '/api/v1/panel/islem': 'Ara katman matcher sınırı sondası — böyle bir rota YOK, olmamalı.',
};

// ---------------------------------------------------------------------------
// 3. Kanıt kaynakları
// ---------------------------------------------------------------------------

function dosyalariTopla(kok: string, uzanti: string): string[] {
  const bulunan: string[] = [];
  const gez = (d: string): void => {
    for (const ad of readdirSync(d)) {
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (tam.endsWith(uzanti)) bulunan.push(tam);
    }
  };
  gez(kok);
  return bulunan;
}

const E2E_KAYNAK = dosyalariTopla(path.join(PROJE_KOKU, 'tests/e2e'), '.ts')
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

const SITEMAP_KAYNAK = readFileSync(path.join(PROJE_KOKU, 'src/app/sitemap.ts'), 'utf8');

/** `lighthouserc.json` → ölçülen adreslerin yol kısmı. */
const LIGHTHOUSE_YOLLARI = (
  JSON.parse(readFileSync(path.join(PROJE_KOKU, 'lighthouserc.json'), 'utf8')) as {
    ci: { collect: { url: string[] } };
  }
).ci.collect.url.map((u) => new URL(u).pathname);

// ---------------------------------------------------------------------------
// 4. Kapı
// ---------------------------------------------------------------------------

describe('rota envanteri × kapı kapsamı', () => {
  const envanter = rotalariTuret(APP_KOKU);
  const envanterYollari = envanter.map((r) => r.yol).sort();
  const beyanYollari = Object.keys(KAPSAM).sort();

  it('envanter dosya sisteminden türetiliyor ve boş değil', () => {
    expect(envanter.length).toBeGreaterThan(10);
    // Elle liste tutulsaydı bu satır anlamsız olurdu; türetildiği için
    // envanterin kendisi de bir ölçüm.
    expect(envanterYollari).toContain('/');
    expect(envanterYollari).toContain('/sitemap.xml');
  });

  /**
   * ASIL KAPI. Yeni bir rota eklendiğinde (F3 panel rotaları) burası kırmızı
   * olur ve tek bir şey ister: kapsam beyanı. "Kapsanmıyor" da geçerli bir
   * cevaptır — gerekçesi yazıldığı sürece.
   */
  it('her rota bir kapsam beyanı taşıyor', () => {
    const beyansiz = envanterYollari.filter((yol) => KAPSAM[yol] === undefined);

    expect(
      beyansiz,
      `KAPSAM beyanı olmayan rota(lar):\n${beyansiz
        .map((y) => `  ${y}  →  ${envanter.find((r) => r.yol === y)?.dosya ?? ''}`)
        .join(
          '\n',
        )}\n\ntests/unit/rota-kapsami.test.ts → KAPSAM'a satır ekleyin: hangi kapı dokunuyor, kanıtı ne, ne ÖLÇÜLMÜYOR.`,
    ).toEqual([]);
  });

  /**
   * Ters yön: silinen rotanın beyanı da silinmeli. Ölü satır bırakmak,
   * `pnpm.overrides`'ta ölü override bırakmakla aynı sınıf hata (ADVISORY-001
   * dersi): bir gün "bu kapsanıyor" diye okunur.
   */
  it('artık var olmayan rota için beyan kalmamış', () => {
    const olu = beyanYollari.filter((yol) => !envanterYollari.includes(yol));

    expect(olu, `Rotası silinmiş KAPSAM satırı: ${olu.join(', ')}`).toEqual([]);
  });

  it('kapsanmayan rotalar GEREKÇELİ', () => {
    const gerekcesiz = Object.entries(KAPSAM)
      .filter(([, b]) => b.kapilar.includes('kapsanmiyor') && b.not.trim().length < 20)
      .map(([yol]) => yol);

    expect(gerekcesiz, `Gerekçesiz "kapsanmiyor": ${gerekcesiz.join(', ')}`).toEqual([]);
  });

  /**
   * TERS YÖN — "kapsanmiyor" diyen rota ASLINDA kapsanıyor olabilir mi?
   *
   * Yukarıdaki dallar haritanın FAZLA iddia etmesini engelliyor: "kapsanıyor"
   * diyen bir satırın kanıtı kaynakta gerçekten duruyor mu. T-054g'de aynanın
   * öteki yüzü açıktaydı ve somut olarak gerçekleşti: `/panel/ayarlar/denetim`
   * için bir E2E paketi yazıldı, beyan `kapsanmiyor` demeye devam etti ve
   * HİÇBİR KAPI kırmızıya dönmedi.
   *
   * Bunun bedeli "yanlış ama zararsız bir satır" değil. Harita, ölçülmeyen
   * yüzeyi görünür kılmak için var (T-016b); EKSİK iddia eden bir satır o
   * paketi SAHİPSİZ gösterir, ve bir gün "bu rota zaten kapsanmıyor" diye
   * okuyan biri paketi silerse hiçbir şey ses çıkarmaz. Kapsamı eksik bildirmek,
   * fazla bildirmekten daha sessiz bir yanlıştır.
   *
   * SINIR EŞLEŞMESİ ZORUNLU: düz alt dize araması `/panel/ayarlar` satırını
   * `/panel/ayarlar/denetim` gezinmesiyle eşleştirir ve her ebeveyn yolu
   * yanlışlıkla suçlardı. Yolun ardından tırnak, `?` veya `#` gelmesi şart.
   */
  it('"kapsanmiyor" diyen rotaya E2E gezinmesi YOK', () => {
    const celiskili = Object.entries(KAPSAM)
      .filter(([yol, b]) => {
        if (!b.kapilar.includes('kapsanmiyor')) return false;
        const desen = new RegExp(`${yol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=['"\`?#])`);
        return desen.test(E2E_KAYNAK);
      })
      .map(([yol]) => yol);

    expect(
      celiskili,
      `Bu rotalar "kapsanmiyor" diyor ama E2E kaynağında geziliyor: ${celiskili.join(', ')}\n` +
        'Paket yazıldıysa KAPSAM satırı da kapıyı ve kanıtı bildirmeli — yoksa harita ' +
        'kendi ölçtüğü şeyi görmüyor demektir.',
    ).toEqual([]);
  });

  it('her beyan en az bir kapı ve (kapsanıyorsa) kanıt bildiriyor', () => {
    const bozuk = Object.entries(KAPSAM)
      .filter(
        ([, b]) =>
          b.kapilar.length === 0 || (!b.kapilar.includes('kapsanmiyor') && b.kanit.length === 0),
      )
      .map(([yol]) => yol);

    expect(bozuk, `Kapısız ya da kanıtsız beyan: ${bozuk.join(', ')}`).toEqual([]);
  });
});

/**
 * BEYAN ÇÜRÜYEBİLİR — kanıt dizeleri kaynakta gerçekten duruyor mu?
 *
 * Bu blok olmasaydı kapsam haritası bir NİYET BEYANI olurdu: testi silen kişi
 * haritayı güncellemez, harita "kapsanıyor" demeye devam eder ve kapı sessizce
 * yalan söyler. T-019b/K3'teki "vakum hâlinde yeşil" tuzağının kapsam
 * haritasındaki karşılığı.
 */
describe('kapsam beyanlarının kanıtı hâlâ duruyor', () => {
  for (const [yol, beyan] of Object.entries(KAPSAM)) {
    if (beyan.kapilar.includes('kapsanmiyor')) continue;

    it(`${yol} — kanıt kaynakta bulunuyor`, () => {
      const eksik: string[] = [];

      for (const kanit of beyan.kanit) {
        const e2eVar = E2E_KAYNAK.includes(kanit);
        const sitemapVar = SITEMAP_KAYNAK.includes(kanit);

        if (!e2eVar && !sitemapVar) eksik.push(kanit);
      }

      expect(
        eksik,
        `${yol} için beyan edilen kanıt kaynaklarda YOK: ${eksik.join(' | ')}\n` +
          'Test silindiyse/yeniden yazıldıysa KAPSAM satırı da güncellenmeli.',
      ).toEqual([]);
    });
  }

  it('lighthouse beyanı `lighthouserc.json` ile uyuşuyor', () => {
    const beyanEdilen = Object.entries(KAPSAM)
      .filter(([, b]) => b.kapilar.includes('lighthouse'))
      .map(([yol]) => yol)
      .sort();

    expect(beyanEdilen).toEqual([...LIGHTHOUSE_YOLLARI].sort());
  });

  it('/panel/ayarlar/guvenlik sabiti hâlâ o rotaya çözülüyor', () => {
    // Kanıt dizesi bir SABİT ADI olduğu için, sabitin değeri kaymışsa kanıt
    // "duruyor" görünür ama yanlış rotayı gösterir. Bu satır o boşluğu kapatır.
    expect(TWO_FACTOR_SETUP_PATH).toBe('/panel/ayarlar/guvenlik');
  });

  it('sanal rotalar hâlâ kapılarda kullanılıyor', () => {
    const kayip = Object.keys(SANAL_ROTALAR).filter((yol) => !E2E_KAYNAK.includes(yol));

    expect(kayip, `Sanal rota beyanı var ama kapıda kullanılmıyor: ${kayip.join(', ')}`).toEqual(
      [],
    );
  });

  it('sanal rotaların gerçekten karşılığı YOK', () => {
    const envanterYollari = rotalariTuret(APP_KOKU).map((r) => r.yol);
    const gerceklesen = Object.keys(SANAL_ROTALAR).filter((yol) => envanterYollari.includes(yol));

    expect(
      gerceklesen,
      `Sanal sayılan rota artık GERÇEK: ${gerceklesen.join(', ')} — beyan KAPSAM'a taşınmalı.`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. Türeticinin kendini kanıtlaması
// ---------------------------------------------------------------------------

/**
 * "Hiçbir rota bulamadım" diyen bozuk bir türetici ile gerçekten temiz bir
 * envanter, sonuçlarına bakarak ayırt edilemez (public-env.test.ts'teki aynı
 * gerekçe). Bu blok türeticiyi, kuralları bilerek zorlayan bir kurgu ağaca
 * karşı koşturur — `src/**` dosyalarına DOKUNMADAN.
 */
describe('türetici kendini kanıtlıyor', () => {
  it('Next kurallarını uyguluyor: grup, dinamik, yakalama-tümü, metadata, bileşen', () => {
    const kok = mkdtempSync(path.join(tmpdir(), 'rota-envanteri-'));

    const yaz = (goreli: string, icerik = 'export default null;\n'): void => {
      const tam = path.join(kok, goreli);
      mkdirSync(path.dirname(tam), { recursive: true });
      writeFileSync(tam, icerik);
    };

    yaz('(pazarlama)/page.tsx'); //                     → /            (grup adrese girmez)
    yaz('(pazarlama)/blog/[slug]/page.tsx'); //         → /blog/[slug] (desen korunur)
    yaz('(pazarlama)/layout.tsx'); //                   → rota DEĞİL
    yaz('(pazarlama)/error.tsx'); //                    → rota DEĞİL
    yaz('(pazarlama)/loading.tsx'); //                  → rota DEĞİL
    yaz('panel/ayarlar/page.tsx'); //                   → /panel/ayarlar
    yaz('api/v9/deneme/route.ts'); //                   → /api/v9/deneme
    yaz('og/[[...parts]]/route.tsx'); //                → /og/[[...parts]]
    yaz('robots.ts'); //                                → /robots.txt
    yaz('sitemap.ts'); //                               → /sitemap.xml
    yaz('icon.svg', '<svg/>'); //                       → rota DEĞİL (statik varlık)
    yaz('yardimci.ts'); //                              → rota DEĞİL
    yaz('panel/parcalar/tablo.tsx'); //                 → rota DEĞİL (page/route değil)

    const bulunan = rotalariTuret(kok)
      .map((r) => r.yol)
      .sort();

    expect(bulunan).toEqual(
      [
        '/',
        '/api/v9/deneme',
        '/blog/[slug]',
        '/og/[[...parts]]',
        '/panel/ayarlar',
        '/robots.txt',
        '/sitemap.xml',
      ].sort(),
    );
  });

  it('EKİLEN rotayı yakalar — kapı gerçekten kapanıyor', () => {
    /*
     * F3'ün senaryosu: biri `src/app/(panel)/panel/medya/page.tsx` ekliyor.
     * Türetici onu görmezse kapının tamamı boşa çalışır. Ekili rota kurgu
     * ağaçta üretiliyor; asıl `KAPSAM` karşılaştırması yukarıdaki blokta
     * gerçek envanterle koşuyor.
     */
    const kok = mkdtempSync(path.join(tmpdir(), 'rota-ekili-'));
    const yaz = (goreli: string): void => {
      const tam = path.join(kok, goreli);
      mkdirSync(path.dirname(tam), { recursive: true });
      writeFileSync(tam, 'export default null;\n');
    };

    yaz('(panel)/panel/page.tsx');
    const oncesi = rotalariTuret(kok).map((r) => r.yol);

    yaz('(panel)/panel/medya/page.tsx');
    const sonrasi = rotalariTuret(kok).map((r) => r.yol);

    expect(oncesi).not.toContain('/panel/medya');
    expect(sonrasi).toContain('/panel/medya');

    // Ve beyansız kalırdı — kapının kırmızı olma sebebi tam olarak bu.
    expect(KAPSAM['/panel/medya']).toBeUndefined();
  });
});
