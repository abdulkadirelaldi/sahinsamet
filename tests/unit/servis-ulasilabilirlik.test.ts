import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * "KOD VAR, YOL YOK" — ULAŞILABİLİRLİK BİLDİRİMİ (T-108g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KARTIN SORUSU: KAPSAM ULAŞILABİLİRLİĞİ ÖLÇMÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * F4 kabul kontrolü somut bir örnek buldu: CSV dışa aktarımı **%100 satır
 * kapsamına** sahip ve **hiçbir çağıranı yok.** Yani kapsam ölçüsü "bu kod
 * doğru çalışıyor" diyor, "bu koda ULAŞILIYOR" demiyor. Kullanıcı için
 * var olmayan bir özellik, ölçümlerde tam puanlı görünüyor.
 *
 * Kart "servis ihraçları için rota kapsamı kapısının (T-016b) benzeri mümkün
 * mü" diye sordu. **Ölçtüm ve cevap ikisi arasında.**
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖLÇÜM 1 — KÖR BİR ÖLÜ KOD DEDEKTÖRÜ KULLANILAMAZ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * İlk taramam "kendi dosyası DIŞINDA çağrılıyor mu" diye sordu ve 183
 * ihraçtan **37'sini** işaretledi. Okudum: çoğu MEŞRU ve üç ayrı sınıf
 * birbirine karışmıştı. En kalabalık sınıf şuydu:
 *
 *   `buildJobWhere`, `buildTransactionWhere`, `buildAuditLogWhere`, … —
 *   KENDİ dosyasında `fetchXForPanel` tarafından çağrılıyor, dışa açılma
 *   sebebi DOĞRUDAN BİRİM TESTİ (saf, bu yüzden ayrıca sınanabiliyor).
 *
 * 37 uyarı veren bir kapı kurulmaz: susturulur. (T-107a'da yazdığım bedel —
 * sahte pozitif, ölçülmüş bir yüzeyi "ölçülmeyen" göstererek kapının
 * susturulmasını haklı gösterir.)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖLÇÜM 2 — DOĞRU SORU: "HİÇ" ÇAĞRILMIYOR MU
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Aynı tarama "kendi dosyası DAHİL hiç çağrılmıyor mu" diye sorulunca
 * **10** ihraç kaldı — ve onlar gerçekten ilginç. İki kategoriye ayrılıyorlar
 * ve ayrım ÖLÇÜLEBİLİR DEĞİL, BİLDİRİLİR:
 *
 *   BEKLEYEN   → tüketicisinden önce yazıldı, görevi biliniyor (F5 yardımcıları)
 *   BAĞLANMAMIŞ→ tüketicisi olmalıydı, yok (CSV — kartın bulduğu sınıf)
 *
 * ⚠️ İKİSİNİ MEKANİK OLARAK AYIRMAK MÜMKÜN DEĞİL ve bunu iddia etmiyorum:
 * fark NİYETTE. T-053'te `fetchAuditLogById`yi YAZMAMA kararı tam bu sınıftı —
 * çağıranı olmayan bir işlev yazmamak, yazıp beklemekten iyidir.
 *
 * Bu yüzden kapı bir DEDEKTÖR değil, bir BİLDİRİM: ulaşılamayan her ihraç
 * listede olmak ve sebebini taşımak zorunda. Kazanç şu — "kod var, yol yok"
 * artık ÜRETİLDİĞİ ANDA görünür oluyor, faz kabul kontrolünü beklemiyor.
 */

const KOK = resolve(__dirname, '..', '..');
const SERVIS_KOKU = 'src/server/services';

const kod = (yol: string): string =>
  readFileSync(join(KOK, yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

function kaynakDosyalari(): string[] {
  const toplanan: string[] = [];
  const gez = (goreli: string): void => {
    for (const ad of readdirSync(join(KOK, goreli))) {
      const yol = `${goreli}/${ad}`;
      if (statSync(join(KOK, yol)).isDirectory()) {
        if (ad === 'generated' || ad === 'node_modules') continue;
        gez(yol);
        continue;
      }
      if (/\.tsx?$/.test(ad)) toplanan.push(yol);
    }
  };
  gez('src');
  return toplanan;
}

/* ===========================================================================
 * SAF ÇEKİRDEK — mutasyon sentetik girdiyle sınanıyor (ADR-038)
 * ======================================================================== */

export interface Ihrac {
  dosya: string;
  ad: string;
}

/** Bir dosyanın ihraç ettiği işlev adları. */
export function ihraclar(kaynak: string): string[] {
  return [...kaynak.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map((m) => m[1] ?? '');
}

/**
 * Hiçbir yerden ÇAĞRILMAYAN ihraçlar.
 *
 * Kendi dosyasındaki çağrı ULAŞILABİLİRLİK SAYILIR: oradaki çağıran zincirin
 * geri kalanından erişiliyorsa işlev de erişiliyor demektir. Tanımın kendisi
 * sayılmıyor — bu yüzden eşleşme sayısı birden büyük olmalı.
 */
export function ulasilmazlar(
  dosyalar: readonly Ihrac[],
  kaynaklar: ReadonlyMap<string, string>,
): string[] {
  const sonuc: string[] = [];

  for (const { dosya, ad } of dosyalar) {
    const kendi = kaynaklar.get(dosya) ?? '';
    const kendiCagriSayisi = (kendi.match(new RegExp(`\\b${ad}\\s*\\(`, 'g')) ?? []).length;

    // Tanım da bir eşleşme üretir; ÇAĞRI için ikinciye ihtiyaç var.
    if (kendiCagriSayisi > 1) continue;

    const baskaYerde = [...kaynaklar].some(
      ([yol, metin]) => yol !== dosya && new RegExp(`\\b${ad}\\s*\\(`).test(metin),
    );
    if (!baskaYerde) sonuc.push(`${dosya} → ${ad}`);
  }

  return sonuc;
}

/* ===========================================================================
 * BİLDİRİM
 * ======================================================================== */

type Sebep = 'bekleyen' | 'baglanmamis';

interface UlasilmazBildirim {
  anahtar: string;
  sebep: Sebep;
  not: string;
}

const BILDIRIM: UlasilmazBildirim[] = [
  /* ---- BEKLEYEN — tüketicisinden önce yazıldı, görevi biliniyor ------- */
  /*
   * ⚠️ `_shared/app-date.ts → differenceInAppDays` ve `→ appWeekRange`
   * SATIRLARI T-112'DE SİLİNDİ — kapı söyledi (üçüncü kez: T-110, T-111).
   * Bekleyen tüketiciler geldi: `goal.ts` (`daysLeft`) ve `habit.ts`
   * (haftalık pano). Notları "alışkanlık serisi ve hedef geri sayımı" idi.
   */
  /*
   * ⚠️ T-112'NİN YEDİ OKUMASI (`habit`, `goal`, `journal-entry`) T-115'TE
   * SİLİNDİ — `/panel/hayat` ekranları ve dashboard'un kişisel özeti bağladı.
   */
  /*
   * ⚠️ `_shared/decimal.ts → toMeasureString` SATIRI T-110'DA SİLİNDİ ve
   * silinmesini BU KAPI söyledi ("bildirim ÖLÜ SATIR taşımıyor" kırıldı).
   *
   * Notu şöyleydi: *"F5 · `weightKg`/`bodyFatPct` gibi ÖLÇÜ sütunları."*
   * T-110 `services/health-log.ts`i yazdı ve üç ondalık alanı (her biri KENDİ
   * ölçeğiyle) oradan geçirdi — yani bekleyen tüketici GELDİ.
   */
  /*
   * ⚠️ `health-log.ts` ÜÇ SATIRI (`fetchHealthLogs`, `fetchHealthLogById`,
   * `fetchHealthTrend`) T-113'TE SİLİNDİ — `/panel/saglik` ekranı bağladı.
   */
  /*
   * 2026-10-29 — iş/muhasebe modülü kaldırıldı; `period-key.ts` silindi ve
   * aşağıdaki yardımcıların TEK tüketicisi raporlar/işlemlerdi. Silinmediler,
   * çünkü sıradaki iki aşamanın görevi belli:
   */
  {
    anahtar: '_shared/money.ts → deriveBaseAmount',
    sebep: 'bekleyen',
    not: 'Cüzdan · döviz/altın varlık ve borçların TL karşılığı (tutar × kur) kayıpsız hesaplanacak.',
  },
  {
    anahtar: '_shared/app-date.ts → addAppYears',
    sebep: 'bekleyen',
    not: 'Cüzdan · borç bitiş tarihi (taksit sayısından) ve yıllık hedef sınırı.',
  },
  /*
   * ⚠️ `_shared/personal-record.ts → recalculatePersonalRecords` SATIRI
   * T-111'DE SİLİNDİ ve silinmesini BU KAPI söyledi ("bildirim ÖLÜ SATIR
   * taşımıyor" kırıldı). İkinci kez oluyor (T-110'da `toMeasureString`).
   *
   * Notu şöyleydi: *"F5 · spor modülü set kaydettiğinde rekorları yeniden
   * hesaplayacak."* T-111 `services/workout-set.ts`i yazdı ve üç set
   * mutasyonunun hepsi hesabı tetikliyor — yani bekleyen tüketici GELDİ.
   *
   * ⚠️ VE BAĞLAMA İKİ GERÇEK HATA ORTAYA ÇIKARDI (BULGU-025, BULGU-026):
   * hesaplayıcı %100 kapsamlıydı ama gerçek Prisma istemcisiyle hiç
   * koşmamıştı. Kapının "ulaşılabilirliği ölç, kapsamı değil" ilkesinin
   * ölçülmüş karşılığı: bağlanmamış kod, test edilmiş sayılamaz.
   */

  /*
   * ⚠️ T-111'İN ALTI OKUMASI (`exercise`, `workout`, `personal-record`)
   * T-114'TE SİLİNDİ — `/panel/spor` ekranları bağladı.
   */
  /*
   * ⚠️ `attachment.ts → fetchAttachmentsForEntity` SATIRI T-037f'TE SİLİNDİ —
   * proje düzenleme sayfasının galeri yönetimi bağladı (notu "tüketici BİR
   * SONRAKİ tur" diyordu ve tuttu).
   */
  /*
   * ⚠️ `attachment.ts → signedUrlForKey` SATIRI T-037f'TE SİLİNDİ — ihraç
   * silindi (ADR-044: HTML'de imzalı adres yok; sunum aynı kökenden).
   */

  /* ---- BAĞLANMAMIŞ — tüketicisi olmalıydı, yok -------------------------- */
  /*
   * ⚠️ BU BÖLÜM T-109b'DE BOŞALDI ve boşalmasını BU KAPI söyledi.
   *
   * Dört `export.ts` satırı duruyordu ve notu şöyleydi: "CSV %100 satır
   * kapsamına sahip ve HİÇBİR çağıranı yok — Frontend bağladığında bu satır
   * SİLİNİR." T-109b `actions/export.ts`i yazdı; kapı bunu gördü ve
   * "bu satırlar artık geçersiz, bildirimden çıkarılmalı" dedi.
   *
   * Yani mekanizma iki yönde de çalıştı: boşluk açıldığında bildirilmesini,
   * kapandığında bildirimin SİLİNMESİNİ zorladı. Ölü bir bildirim bir gün
   * gerçek bir boşluğu maskeleyecekti (BULGU-024'ün ölü istisnasıyla aynı
   * sınıf, T-102'de kapatılan).
   *
   * Dışa aktarım artık `exportCsvAction` üzerinden ulaşılabilir: eylem üç
   * üreticiyi ve `exportTruncated`ı çağırıyor.
   */
];

describe('ADR-037 — ulaşılamayan servis ihraçları BİLDİRİLİYOR', () => {
  const dosyalar = kaynakDosyalari();
  const kaynaklar = new Map(dosyalar.map((yol) => [yol, kod(yol)]));

  const servisIhraclari: Ihrac[] = dosyalar
    .filter((yol) => yol.startsWith(`${SERVIS_KOKU}/`) && !yol.endsWith('/index.ts'))
    .flatMap((yol) => ihraclar(kaynaklar.get(yol) ?? '').map((ad) => ({ dosya: yol, ad })));

  const bulunan = ulasilmazlar(servisIhraclari, kaynaklar).map((k) =>
    k.replace(`${SERVIS_KOKU}/`, ''),
  );

  it('önkoşul — tarama servis ihraçlarını buldu', () => {
    /*
     * Çapa. Tarama boşalırsa "ulaşılmaz yok" der ve bildirim ölü satırlarla
     * dolu kalır; ikisi de sessizdir.
     */
    expect(servisIhraclari.length, 'servis ihracı bulunamadı').toBeGreaterThan(100);
    expect(
      servisIhraclari.some((i) => i.ad === 'fetchHealthLogs'),
      'bilinen bir ihraç taramada yok — desen bozuk',
    ).toBe(true);
  });

  it('ÇAPA — ulaşılabilir bir ihraç ulaşılmaz SAYILMIYOR', () => {
    /*
     * Ters yön. Bu iddia olmadan "her şeyi ulaşılmaz sayan" bir çekirdek de
     * bildirimle eşleşmediği için kırmızı verirdi — ama sebebi anlaşılmazdı.
     */
    expect(bulunan, '`fetchMonthlyReport` ulaşılabilir, listede olmamalı').not.toContain(
      'report.ts → fetchMonthlyReport',
    );
    expect(bulunan, '`buildJobWhere` kendi dosyasında çağrılıyor, ulaşılabilir').not.toContain(
      'job.ts → buildJobWhere',
    );
  });

  it('⚠️ BİLDİRİLMEYEN ulaşılamaz ihraç YOK', () => {
    const bildirilen = new Set(BILDIRIM.map((b) => b.anahtar));
    const bildirilmeyen = bulunan.filter((k) => !bildirilen.has(k));

    expect(
      bildirilmeyen,
      'Bu ihraçlara HİÇBİR YERDEN ulaşılmıyor ama bildirimde yok:\n' +
        `${bildirilmeyen.join('\n')}\n\n` +
        'İki seçenek: (a) tüketicisini bağla, (b) `BILDIRIM` listesine sebebiyle ' +
        'ekle — `bekleyen` (tüketicisi geliyor, görevi yaz) ya da `baglanmamis` ' +
        '(tüketicisi olmalıydı, bu bir BOŞLUK). Kapsam ölçüsü bu boşluğu görmez: ' +
        '%100 satır kapsamı olan bir kodun hiç çağıranı olmayabilir.',
    ).toEqual([]);
  });

  it('⚠️ bildirim ÖLÜ SATIR taşımıyor — bağlanan satır silinmeli', () => {
    /*
     * İkinci yön, ve bu turda gerçekten ateşlenmesi BEKLENİYOR: Frontend
     * T-108f`te CSV`yi bağlıyor. Bağlandığı an bu iddia kırılır ve mesajı
     * "satırı sil" der — ADVISORY-001`in ölü override dersi, kod tarafında.
     */
    const bulunanKume = new Set(bulunan);
    const olu = BILDIRIM.filter((b) => !bulunanKume.has(b.anahtar)).map((b) => b.anahtar);

    expect(
      olu,
      'Bu satırlar artık geçersiz — ihraca ULAŞILIYOR ya da ihraç silinmiş:\n' +
        `${olu.join('\n')}\n` +
        'Bildirimden çıkarılmalı. Ölü bir bildirim, bir gün gerçek bir boşluğu maskeler.',
    ).toEqual([]);
  });

  it('her bildirim SEBEP taşıyor — ve `baglanmamis` olanlar sayılı', () => {
    for (const b of BILDIRIM) {
      expect(b.not.length, `${b.anahtar}: gerekçesiz bildirim yazılmaz`).toBeGreaterThan(40);
    }

    /*
     * Sayı kilitli ve bilerek: `baglanmamis` kümesinin BÜYÜMESİ bir
     * gerileme işaretidir ("yine kod yazdık, yine bağlamadık"). Küçülmesi de
     * yukarıdaki ölü-satır iddiasıyla zaten görünür.
     */
    const baglanmamis = BILDIRIM.filter((b) => b.sebep === 'baglanmamis');
    expect(
      baglanmamis.map((b) => b.anahtar).sort(),
      '`baglanmamis` kümesi değişti. Büyüdüyse: yazılan ama bağlanmayan yeni bir ' +
        'yüzey var. Küçüldüyse satırlar silinmeli.',
      /*
       * ⚠️ T-109b'DE BOŞALDI. Dört `export.ts` satırı F4 kabul kontrolünün
       * bulduğu "kod var, yol yok" sınıfıydı; `actions/export.ts` yolu açtı.
       *
       * BOŞ KALMASI BİR KAZANIM DEĞİL, BİR DURUM: küme yeniden büyürse o bir
       * gerileme işaretidir ("yine kod yazdık, yine bağlamadık") ve bu iddia
       * onu görünür kılıyor.
       */
    ).toEqual([]);
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi (ADR-038)
 * ======================================================================== */

describe('MUTASYON · çekirdek gerçekten ısırıyor', () => {
  it('hiç çağrılmayan ihraç yakalanıyor', () => {
    const kaynaklar = new Map([
      ['src/server/services/a.ts', 'export function kullanilmayan(): void {}'],
      ['src/app/sayfa.tsx', 'const x = 1;'],
    ]);

    expect(
      ulasilmazlar([{ dosya: 'src/server/services/a.ts', ad: 'kullanilmayan' }], kaynaklar),
    ).toEqual(['src/server/services/a.ts → kullanilmayan']);
  });

  it('KENDİ dosyasında çağrılan ihraç ulaşılabilir sayılıyor', () => {
    /*
     * `build*Where` sınıfı. Bu ayrım olmadan tarama 37 uyarı veriyordu ve
     * kapı kurulamazdı.
     */
    const kaynaklar = new Map([
      [
        'src/server/services/a.ts',
        'export function nerede(): void {}\nfunction getir(): void { nerede(); }',
      ],
    ]);

    expect(ulasilmazlar([{ dosya: 'src/server/services/a.ts', ad: 'nerede' }], kaynaklar)).toEqual(
      [],
    );
  });

  it('BAŞKA dosyadan çağrılan ihraç ulaşılabilir sayılıyor', () => {
    const kaynaklar = new Map([
      ['src/server/services/a.ts', 'export function nerede(): void {}'],
      ['src/app/sayfa.tsx', 'nerede();'],
    ]);

    expect(ulasilmazlar([{ dosya: 'src/server/services/a.ts', ad: 'nerede' }], kaynaklar)).toEqual(
      [],
    );
  });

  it('ADI GEÇMEK çağrı sayılmıyor — içe aktarma ve dize', () => {
    const kaynaklar = new Map([
      ['src/server/services/a.ts', 'export function nerede(): void {}'],
      ['src/app/sayfa.tsx', "import { nerede } from '@/x';\nconst s = 'nerede';"],
    ]);

    expect(ulasilmazlar([{ dosya: 'src/server/services/a.ts', ad: 'nerede' }], kaynaklar)).toEqual([
      'src/server/services/a.ts → nerede',
    ]);
  });
});
