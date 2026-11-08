import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * E2E TEMİZLİK RAPORU — EYLEMİ DEĞİL İDDİAYI ÖLÇÜYOR (T-107b).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÖLÇÜLEN KUSUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `global-teardown.ts` koşum sonunda şunu basıyordu:
 *
 *     [e2e] veritabanı seed durumuna döndürüldü (artık proje: 0, mesaj: 1).
 *
 * Sayılar süpürme işlevlerinin dönüşüydü — yani **SİLİNEN** satır sayısı — ama
 * etiket "artık" (KALAN) diyordu. Orkestra Şefi `contact_message` tablosunu
 * kontrol edip **0 satır** bulunca sayı yanlış göründü; gerçekte sayı doğruydu,
 * **etiket** yanlıştı: süpürme 1 mesaj silmişti ve tablo gerçekten boştu.
 * Ölçümü bağımsız olarak doğruladım: `e2eKalintisi` → `toplam: 0`.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN KOZMETİK DEĞİL
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Yanlış etiket tek başına okuma hatası olurdu. Tehlikeli olan, sayının
 * HANGİ İKİ DURUMDA SIFIR ÇIKTIĞI:
 *
 *   1. Ortam gerçekten temiz                      → 0
 *   2. Süpürme YANLIŞ ÖNEĞİ arıyor                → 0
 *
 * İkincisinde gerçek bir kalıntı vardır ve rapor "0" der. T-016'da kurulan
 * izolasyon güvencesi tam o sayıya dayanıyordu — yani güvence, kendisini
 * çürütemeyen bir ölçüme bağlıydı. Bu, bu deponun defalarca adını koyduğu
 * sınıf: **ölçtüğünü sanan ama yanlış şeye bakan kapı.**
 *
 * Süpürme `E2E_ICERIK_ONEKI` (`e2e-t039`) arıyor, oysa paketler başka işaretler
 * de yazıyor — T-054g denetim sondası `E2EDenetimSondasi` kullanıyor ve süpürme
 * onu HİÇ görmüyor (kendi `afterAll`'u siliyor; o çökerse kalıntı görünmez).
 *
 * ÇÖZÜM: süpürmenin EYLEMİ ile ortamın DURUMU ayrı ölçülüyor. Asıl iddia
 * ("kalıntı yok") `e2eKalintisi` ile ayrı bir sorgudan geliyor ve `e2e`/`E2E`
 * ile başlayan HER izi sayıyor; kalıntı varsa teardown FIRLATIYOR.
 *
 * SINIR, dürüstçe: `e2e` ile başlamayan bir işaret bu sayıma da görünmez.
 * Mitigasyon bir sözleşme, kanıt değil — ve bu kapı sözleşmenin teardown'a
 * BAĞLI KALDIĞINI ölçüyor, sözleşmeye uyulduğunu değil.
 */

const KOK = resolve(__dirname, '..', '..');

const kod = (yol: string): string =>
  readFileSync(join(KOK, yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

const TEARDOWN = kod('tests/e2e/_helpers/global-teardown.ts');
const DB_TASK = kod('tests/e2e/_helpers/db-task.ts');

describe('E2E temizlik raporu — silinen ile kalan AYRI', () => {
  it('önkoşul — iki dosya da okundu', () => {
    // Yol bozulursa aşağıdaki iddialar "desen yok" diye kırılır/geçer;
    // çapa hangi sebeple kırıldığını ayırt ediyor.
    expect(TEARDOWN).toContain('globalTeardown');
    expect(DB_TASK).toContain('const komutlar');
  });

  it('kalıntı sorgusu VAR ve test izi bırakan tabloları sayıyor', () => {
    expect(DB_TASK, '`e2eKalintisi` görevi yok').toMatch(/async\s+e2eKalintisi\s*\(/);

    for (const tablo of ['auditLog', 'exercise', 'habit']) {
      expect(DB_TASK, `kalıntı sayımı ${tablo} tablosuna bakmıyor`).toMatch(
        new RegExp(`db\\.${tablo}\\.count`),
      );
    }
  });

  it('⚠️ kalıntı sayımı `e2e-t039` DEĞİL, `e2e` öneki arıyor', () => {
    /*
     * Asıl düzeltme bu. Süpürmenin öneki tek bir göreve ait; kalıntı sayımı
     * daha geniş olmak ZORUNDA, yoksa süpürmenin kör noktasını aynen
     * devralır ve "kalıntı yok" iddiası yine yalnızca o görevi kapsar.
     */
    const govde = /async\s+e2eKalintisi\s*\(\)\s*\{([\s\S]*?)\n  \},/.exec(DB_TASK)?.[1] ?? '';

    expect(govde.length, 'kalıntı görevinin gövdesi ayıklanamadı').toBeGreaterThan(80);
    expect(govde, 'kalıntı sayımı görev önekine daralmış').not.toContain('E2E_ICERIK_ONEKI');
    expect(govde, 'büyük/küçük harf duyarsız arama yok — `E2E...` işaretleri kaçar').toContain(
      'insensitive',
    );
  });

  it('teardown kalıntıyı ÖLÇÜYOR — süpürmenin dönüşünü kalan sanmıyor', () => {
    expect(TEARDOWN, 'teardown kalıntı sorgusunu çağırmıyor').toMatch(/await\s+e2eKalintisi\(\)/);

    // Rapor KALAN izi söylüyor; silinen sayısı "kalan" diye etiketlenmiyor.
    expect(TEARDOWN).toMatch(/KALAN test izi/);
  });

  it('⚠️ ESKİ YANLIŞ ETİKET geri gelmemiş', () => {
    /*
     * Negatif iddia tek başına yetmez (§8.18 dersi) — bu yüzden yukarıdaki
     * pozitif iddialarla birlikte çalışıyor. Buradaki tek iş, tam o yanlış
     * cümlenin geri sızmasını engellemek: "artık proje: ${silinen}".
     */
    expect(TEARDOWN, 'süpürme sayısı yine "artık" diye etiketlenmiş').not.toMatch(/artık proje/i);
  });

  it('kalıntı varsa teardown FIRLATIYOR — sessiz geçmiyor', () => {
    /*
     * Raporlamak yetmez. Bir sonraki koşum kalıntıyı seed verisi sanar
     * (ADR-030: seed bir ölçüm sözleşmesidir) ve liste sayıları ya da
     * Lighthouse girdisi sessizce kayar.
     */
    expect(TEARDOWN).toMatch(/kalinti\.toplam\s*>\s*0/);
    expect(TEARDOWN).toMatch(/throw new Error\(/);
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi (ADR-038)
 * ======================================================================== */

describe('MUTASYON · desenler gerçekten ısırıyor', () => {
  /** Kapının kullandığı iki ayırt edici desen, saf hâlde. */
  const kalanOlcumuVar = (kaynak: string): boolean => /await\s+e2eKalintisi\(\)/.test(kaynak);
  const eskiEtiket = (kaynak: string): boolean => /artık proje/i.test(kaynak);

  it('kalıntı ölçümünün YOKLUĞU yakalanıyor', () => {
    expect(kalanOlcumuVar('const kalinti = await e2eKalintisi();')).toBe(true);
    // Eski hâl: yalnızca süpürme dönüşleri okunuyor, kalan hiç sorulmuyor.
    expect(kalanOlcumuVar('const proje = await projeleriTemizle(ONEK);')).toBe(false);
  });

  it('eski yanlış etiket yakalanıyor', () => {
    expect(eskiEtiket('`[e2e] ... (artık proje: ${proje}, mesaj: ${mesaj}).`')).toBe(true);
    expect(eskiEtiket('`[e2e] temizlik: ${silinenProje} proje SİLİNDİ · KALAN: 0`')).toBe(false);
  });
});
