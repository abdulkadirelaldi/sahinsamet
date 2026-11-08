import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * AĞIR YIĞINLAR İLK YÜKTE DEĞİL — SINIFI KAPATAN KAPI (T-108g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN TEK KAPI, İKİ AYRI KAPI DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Frontend iki turda iki ağır yığını tembelleştirdi ve ikisi de AYNI kalıbı
 * kullanıyor:
 *
 *   T-035 · MDX yığını  (~109 kB)  → `dynamic(() => import('./mdx-onizleme'))`
 *   T-108 · Recharts    (~109,5 kB) → (2026-10-29: tüketicisi silindi, liste dışı)
 *
 * İkisinin de ölçümü yapıldı, ikisi de doğru kuruldu ve **ikisi de korumasızdı**:
 * `dynamic`i statik `import`a çevirmek tek satırlık bir düzenleme ve sonucu
 * YALNIZCA Lighthouse'ta görünür — yani gerilemenin farkına, bir sonraki
 * ölçüm işine kadar kimse varmaz.
 *
 * Kart "genelleştirilebilir mi" diye sordu. Evet, ve bu dosya o: yığınlar
 * BİLDİRİLİYOR, kural hepsine AYNI uygulanıyor, üçüncü bir ağır yığın
 * eklendiğinde bildirilmesi gerekiyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KURAL — İKİ HALKA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1. Ağır npm paketini YALNIZCA bildirilen bileşen içe aktarıyor.
 *      (İkinci bir içe aktaran, yığını başka bir yoldan ilk yüke sokar —
 *      tembel sarmalayıcı bozulmamış olsa bile.)
 *
 *   2. O bileşen HİÇBİR YERDE statik içe aktarılmıyor; yalnızca
 *      `dynamic(() => import(...))` içinden geçiyor.
 *
 * İkisi birlikte gerekli: yalnızca (2) ölçülse, `recharts`ı doğrudan içe
 * aktaran yeni bir bileşen yığını ilk yüke sokar ve kapı yeşil kalır.
 * Yalnızca (1) ölçülse, `dynamic` statiğe çevrilir ve kapı yine yeşil kalır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SINIR, DÜRÜSTÇE — BU KAPI PAKET ÇIKTISINI ÖLÇMÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kapı KAYNAK düzeyinde: "tembellik sınırı duruyor" diyor, "yığın ilk yükte
 * yok" DEMİYOR. Gerçek kanıt derleme çıktısında — Frontend chunk listesiyle
 * ölçtü (`/panel/muhasebe` → 6311 inmiyor · `/raporlar` → iniyor) ve o ölçüm
 * raporda kayıtlı.
 *
 * Chunk KİMLİĞİNİ (`6311`) bir iddiaya yazmayı DENEDİM ve reddettim: kimlik
 * her derlemede değişebilir, yani kapı bir gün yapı değişikliğinde yanlış
 * sebeple kırmızıya döner — ve "kapıyı güncelle" alışkanlığı, kapının
 * söylediği şeyi önemsizleştirir. Paket boyutunun kendisi §9'un Lighthouse
 * bütçesine bağlı; bu kapı onun ÖNCÜLÜNÜ (tembellik sınırı) koruyor.
 */

const KOK = resolve(__dirname, '..', '..');

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

interface AgirYigin {
  /** Ağır npm paketi. */
  paket: string;
  /** Statik içe aktarılMAMASI gereken bileşen. */
  bilesen: string;
  /** `dynamic(() => import(...))` çağrısını barındıran dosya. */
  tembelSinir: string;
  /**
   * Paketin TEK içe aktaranı `bilesen` mi?
   *
   * `false` ise sebebi `not`ta yazılı olmak ZORUNDA: paketin ikinci bir meşru
   * içe aktaranı varsa "tek içe aktaran" kuralı uygulanamaz ve bunu
   * ölçmeden varsaymak, kuralı yanlış yere uygulamak olurdu.
   */
  tekIceAktaran: boolean;
  /** Ölçülen ağırlık ve ölçümün görevi — liste denetlenebilir kalsın. */
  olcum: string;
  not?: string;
}

const AGIR_YIGINLAR: AgirYigin[] = [
  /*
   * `ogl` (Aurora, WebGL) BU LİSTEDEYDİ — ADR-045 ile bileşen ve bağımlılık
   * birlikte silindi (2026-10-21). Projenin en pahalı yığınıydı (BULGU-018:
   * TBT 80 ms → 9 990 ms); geri gelirse buraya ölçümüyle dönmeli.
   */
  /*
   * `recharts` (~109,5 kB · T-108) BU LİSTEDEYDİ — tek tüketicisi muhasebe
   * raporlarının yıllık grafiğiydi ve 2026-10-29'da modülle silindi. Sağlık
   * grafikleri geldiğinde buraya ÖLÇÜMÜYLE ve tembel sınırıyla dönmeli.
   */
  /*
   * `next-mdx-remote` (~109 kB · T-035) BU LİSTEDEYDİ — panelin MDX editörü ve
   * blog ile birlikte silindi (tek sayfalık site). Liste bugün boş; ağır bir
   * yığın geri gelirse buraya ÖLÇÜMÜYLE ve tembel sınırıyla eklenir.
   */
];

describe('§5.2 — ağır yığınlar yalnızca tembel sınırdan geçiyor', () => {
  const dosyalar = kaynakDosyalari();

  it('önkoşul — kaynak taraması dosya buldu', () => {
    expect(dosyalar.length, 'src altında kaynak bulunamadı').toBeGreaterThan(100);
    for (const yigin of AGIR_YIGINLAR) {
      expect(dosyalar, `bildirilen bileşen yok: ${yigin.bilesen}`).toContain(yigin.bilesen);
      expect(dosyalar, `bildirilen tembel sınır yok: ${yigin.tembelSinir}`).toContain(
        yigin.tembelSinir,
      );
      expect(yigin.olcum.length, 'ölçüm notu yazılmamış').toBeGreaterThan(10);
    }
  });

  for (const yigin of AGIR_YIGINLAR) {
    it(`${yigin.paket} · ÖNKOŞUL: bildirilen bileşen paketi gerçekten içe aktarıyor`, () => {
      /*
       * Vakum koruması. Bileşen paketi hiç içe aktarmıyorsa aşağıdaki iki
       * iddia "yığın yok" diye boş kümede yeşil kalır — ve gerçek içe aktaran
       * başka bir dosya olabilir.
       */
      /*
       * Zincir BİR ADIM dolaylı olabilir (MDX böyle): bileşen paketi doğrudan
       * içe aktarmıyorsa, içe aktardığı YEREL bir modül aktarıyor olmalı.
       * İkinci adımdan sonrası ölçülmüyor ve bu sınır yazılı.
       */
      const bilesenKodu = kod(yigin.bilesen);
      const dogrudan = bilesenKodu.includes(yigin.paket);

      const yerelKomsular = [...bilesenKodu.matchAll(/from\s+['"](@\/[^'"]+|\.[^'"]+)['"]/g)]
        .map((m) => m[1] ?? '')
        .map((yol) =>
          yol.replace(/^@\//, 'src/').replace(/^\.\//, `${yigin.bilesen.replace(/\/[^/]+$/, '')}/`),
        );

      const dolayli = yerelKomsular.some((yol) =>
        dosyalar.some((d) => d.startsWith(yol) && kod(d).includes(yigin.paket)),
      );

      expect(
        dogrudan || dolayli,
        `${yigin.bilesen} zinciri artık ${yigin.paket}e ulaşmıyor — bildirim bayat`,
      ).toBe(true);
    });

    it(`${yigin.paket} · 1/2 — paketi YALNIZCA bildirilen bileşen içe aktarıyor`, () => {
      if (!yigin.tekIceAktaran) {
        // Kural uygulanamıyor ve SEBEBİ YAZILI olmak zorunda — gerekçesiz bir
        // muafiyet, kuralı sessizce kaldırmakla aynı şey.
        expect(
          yigin.not?.length ?? 0,
          `${yigin.paket}: tekIceAktaran=false ama gerekçe yok`,
        ).toBeGreaterThan(80);
        return;
      }

      const desen = new RegExp(`from\\s+['"]${yigin.paket}(?:/[^'"]*)?['"]`);

      const digerIceAktaranlar = dosyalar.filter(
        (yol) => yol !== yigin.bilesen && desen.test(kod(yol)),
      );

      expect(
        digerIceAktaranlar,
        `${yigin.paket} (${yigin.olcum}) şu dosyalardan da içe aktarılıyor:\n` +
          `${digerIceAktaranlar.join('\n')}\n` +
          'Tembel sınır bozulmamış olsa bile yığın BU yoldan ilk yüke girer.',
      ).toEqual([]);
    });

    it(`${yigin.paket} · 2/2 — bileşen STATİK içe aktarılmıyor, yalnızca dynamic()`, () => {
      /*
       * Asıl gerileme burada: `dynamic(() => import('./x'))` → `import X from
       * './x'` tek satır ve sonucu yalnızca Lighthouse'ta görünür.
       */
      const modulAdi = yigin.bilesen.replace(/^src\//, '').replace(/\.tsx?$/, '');
      const dosyaAdi = modulAdi.split('/').pop() ?? '';

      // Statik içe aktarma: `from '...<dosyaAdi>'` — `import(...)` DEĞİL.
      const statikDesen = new RegExp(`from\\s+['"][^'"]*${dosyaAdi}['"]`);
      const dinamikDesen = new RegExp(`import\\(\\s*['"][^'"]*${dosyaAdi}['"]\\s*\\)`);

      const statikler = dosyalar.filter(
        (yol) => yol !== yigin.bilesen && statikDesen.test(kod(yol)),
      );

      expect(
        statikler,
        `${yigin.bilesen} STATİK içe aktarılıyor: ${statikler.join(', ')}\n` +
          `Yığın (${yigin.olcum}) o sayfanın İLK YÜKÜNE girer ve bu YALNIZCA ` +
          'Lighthouse ölçümünde görünür — yani gerileme sessizdir.',
      ).toEqual([]);

      // Ve tembellik GERÇEKTEN kurulu: pozitif çapa olmadan yukarıdaki
      // negatif, bileşen hiç kullanılmasa da yeşil kalırdı.
      expect(
        dinamikDesen.test(kod(yigin.tembelSinir)),
        `${yigin.tembelSinir} içinde dynamic import bulunamadı — tembellik kalkmış olabilir`,
      ).toBe(true);
    });
  }

  it('⚠️ BİLDİRİLMEYEN bir tembel HEDEF yok — ağır olan kaçmasın', () => {
    /*
     * Sayım kapısı, HEDEF tanecikli.
     *
     * İlk kurulumda DOSYA tanecikliydi ve bir kör noktası vardı: `reactbits/
     * lazy.tsx` ALTI hedef taşıyor, yani o dosyaya eklenen yedinci bir hedef
     * sayımı hiç değiştirmezdi. Hedefleri saymak o boşluğu kapatıyor.
     *
     * Hedeflerin çoğu ağır DEĞİL (React Bits animasyonları) ve onlar için
     * ağırlık iddiası YAZILMIYOR — liste bir ENVANTER, bir ölçüm değil.
     * Yeni bir hedef eklendiğinde kapı, yazarını "bu ağır mı" sorusuna
     * zorluyor; cevap "hayır"sa tek satır, "evet"se `AGIR_YIGINLAR`a ölçümüyle
     * birlikte bir giriş.
     */
    const hedefler = [
      ...new Set(
        dosyalar.flatMap((yol) =>
          [...kod(yol).matchAll(/dynamic\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]/g)].map(
            (m) => m[1] ?? '',
          ),
        ),
      ),
    ].sort();

    /** Ağır OLMAYAN tembel hedefler — envanter, ağırlık iddiası değil. */
    /*
     * React Bits'in on tembel hedefi BURADAYDI; ADR-045 ile klasörün tamamı
     * silindi. Liste boş ama duruyor: yeni ağır OLMAYAN bir hedef eklenirse
     * yeri burası.
     */
    const AGIR_OLMAYAN: string[] = [];

    /**
     * KOŞULLU TEMBEL — ağır, ama `AGIR_YIGINLAR`ın "her yerde yalnızca dynamic()"
     * kuralı BİLEREK uygulanmıyor: bir sayfada ekranın altında (tembel), başka
     * bir sayfada sayfanın asıl içeriği (statik, ilk boyamada olmalı).
     */
    /* Public iletişim formu buradaydı (tembel sınır) — form kaldırıldı, liste boş. */
    const KOSULLU_TEMBEL: { hedef: string; olcum: string }[] = [];

    const beklenen = [
      ...AGIR_OLMAYAN,
      ...KOSULLU_TEMBEL.map((k) => k.hedef),
      // Ağır yığınların hedefleri bildirimden türetiliyor — elle tekrarlanmıyor.
      ...AGIR_YIGINLAR.map((y) => `./${(y.bilesen.split('/').pop() ?? '').replace(/\.tsx?$/, '')}`),
    ].sort();

    expect(
      hedefler,
      'Tembel hedef listesi değişti. Yeni hedef AĞIR bir yığın saklıyorsa ' +
        '`AGIR_YIGINLAR`a ölçümüyle eklenmeli; saklamıyorsa `AGIR_OLMAYAN` ' +
        'envanterine. Ağırlığı BİLİNMİYORSA ölçülmeden hiçbir kovaya yazılmaz.',
    ).toEqual(beklenen);
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi (ADR-038: kimsenin dosyasına dokunulmuyor)
 * ======================================================================== */

describe('MUTASYON · desenler gerçekten ısırıyor', () => {
  const statik = (k: string): boolean => /from\s+['"][^'"]*yillik-grafik['"]/.test(k);
  const dinamik = (k: string): boolean => /import\(\s*['"][^'"]*yillik-grafik['"]\s*\)/.test(k);
  const paketIceAktarma = (k: string): boolean => /from\s+['"]recharts(?:\/[^'"]*)?['"]/.test(k);

  it('statik içe aktarma yakalanıyor, dinamik olan SAYILMIYOR', () => {
    expect(statik("import { YillikGrafik } from './yillik-grafik';")).toBe(true);
    expect(statik("import { YillikGrafik } from '@/components/panel/yillik-grafik';")).toBe(true);

    // Gerileme ÖNCESİ hâl: yalnızca dynamic içinden geçiyor.
    expect(statik("const X = dynamic(() => import('./yillik-grafik'), { ssr: false });")).toBe(
      false,
    );
    expect(dinamik("const X = dynamic(() => import('./yillik-grafik'), { ssr: false });")).toBe(
      true,
    );
  });

  it('ikinci bir paket içe aktaranı yakalanıyor — alt yollar dahil', () => {
    expect(paketIceAktarma("import { BarChart } from 'recharts';")).toBe(true);
    expect(paketIceAktarma("import { Bar } from 'recharts/lib/cartesian/Bar';")).toBe(true);
    // Adı geçmesi içe aktarma değildir.
    expect(paketIceAktarma('// recharts yığını ölçüldü: 109,5 kB')).toBe(false);
    expect(paketIceAktarma("import { Skeleton } from '@/components/ui/skeleton';")).toBe(false);
  });
});
