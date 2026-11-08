import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * PROGRAM.md §8.18 — "`NEXT_PUBLIC_` ile başlayan hiçbir değişkende sır
 * bulunmaz (CI'da taranır)".
 *
 * NEDEN BU BİR TEST, AYRI BİR CI BETİĞİ DEĞİL:
 * Tarama `pnpm test` içinde koştuğu için hem yerelde hem CI'da otomatik
 * çalışır — ayrı bir betik yazılsaydı yalnızca CI'da koşar ve geliştirici
 * sızıntıyı ancak PR açtıktan sonra görürdü. Ayrıca dedektörün kendisi de
 * test edilebilir hâle gelir: aşağıdaki "kendini kanıtlama" bloğu, tarayıcının
 * ekilmiş sahte sırları GERÇEKTEN yakaladığını gösterir. Yalnızca "hiçbir şey
 * bulamadım" diyen bir tarayıcı, bozuk bir tarayıcıdan ayırt edilemez.
 *
 * ÜÇ KATMAN:
 *   1. Dedektör kendini kanıtlar (ekili sahte sırlar yakalanmalı)
 *   2. `.env.example` taranır — anahtar ADI sır ima ediyor mu?
 *   3. `.next/` derleme çıktısı taranır — sır tarayıcıya gömülmüş mü?
 *      (Yalnızca derleme varsa; CI'da `build` adımından SONRA tekrar koşulur.)
 */

const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Sır ima eden anahtar adı parçaları.
 *
 * `NEXT_PUBLIC_` öneki, değerin tarayıcı paketine GÖMÜLECEĞİ anlamına gelir —
 * geri alınamaz. Bu yüzden ad bazlı kontrol bilinçli olarak agresiftir:
 * yanlış pozitif ucuz (bir satır allowlist), yanlış negatif kalıcı.
 */
const SECRET_NAME_PATTERNS = [
  'SECRET',
  'TOKEN',
  'PASSWORD',
  'PASSWD',
  'PRIVATE',
  'CREDENTIAL',
  'HASH',
  'SALT',
  'API_KEY',
  'APIKEY',
  'ACCESS_KEY',
  'DSN',
] as const;

/**
 * Değer bazlı imzalar — sağlayıcı önekleri ve yüksek entropili biçimler.
 * Ad masum olsa bile değerin kendisi ele verir.
 */
const SECRET_VALUE_PATTERNS: ReadonlyArray<{ label: string; test: RegExp }> = [
  {
    label: 'OpenAI/Stripe gizli anahtarı',
    test: /\bsk[-_](?:live|test|proj)?[-_]?[A-Za-z0-9]{16,}/,
  },
  { label: 'GitHub jetonu', test: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/ },
  { label: 'GitHub ince ayar jetonu', test: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { label: 'AWS erişim anahtarı', test: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { label: 'Slack jetonu', test: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { label: 'Google API anahtarı', test: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { label: 'Resend API anahtarı', test: /\bre_[A-Za-z0-9_]{16,}/ },
  { label: 'JWT', test: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { label: 'PEM özel anahtar', test: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { label: 'argon2/bcrypt hash', test: /\$(?:argon2[id]{1,2}|2[aby])\$/ },
  {
    label: 'kimlik bilgisi içeren bağlantı dizesi',
    /*
     * ⚠️ KARAKTER SINIFLARI `"`, `{`, `}` ve `,` İÇERMEZ — T-049g'de daraltıldı.
     *
     * Eski hâl (`[^/\s:@]+:[^/\s@]+@`) bu karakterleri KABUL ediyordu ve
     * küçültülmüş derleme çıktısında İKİ AYRI YER TUTUCUYU köprüleyerek sahte
     * pozitif üretiyordu (Frontend'in bulgusu, `profil-formu.tsx`):
     *
     *   ipucu:"https://ornek.com"},{anahtar:"email",…,ipucu:"ad@
     *   └─ şema ─┘└──── "kullanıcı" ────┘└ : ┘└─ "parola" ─┘└ @ ┘
     *
     * Yani desen, bir URL yer tutucusunun sonundan başka bir nesnenin
     * `anahtar:` iki noktasına atlayıp sonraki yer tutucunun `@`sine
     * bağlanıyordu. Gerçek bir kimlik bilgisi değil — JSON/JS sözdizimi.
     *
     * Bu dört karakter gerçek bir `userinfo` bileşeninde GEÇEMEZ: RFC 3986
     * `userinfo`da izinli küme `unreserved / pct-encoded / sub-delims / ":"`
     * ve `"` ile `{`/`}` o kümede yok; `,` bir sub-delim ama parola/kullanıcı
     * adında geçtiğinde zaten yüzde kodlanmış olur. Yani daraltma, yakalanan
     * GERÇEK biçimlerden hiçbirini kaybetmiyor — aşağıdaki blok bunu
     * mutasyonla doğruluyor.
     */
    test: /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@"{},]+:[^/\s@"{},]+@/i,
  },
];

export interface Sizinti {
  readonly kaynak: string;
  readonly anahtar: string;
  readonly gerekce: string;
}

/** Anahtar ADI sır ima ediyor mu? */
function adSirImaEdiyorMu(anahtar: string): string | null {
  const buyuk = anahtar.toUpperCase();
  const eslesen = SECRET_NAME_PATTERNS.find((desen) => buyuk.includes(desen));
  return eslesen ? `anahtar adı "${eslesen}" içeriyor` : null;
}

/** DEĞER bilinen bir sır imzasına uyuyor mu? */
function degerSirImzasiTasiyorMu(deger: string): string | null {
  const eslesen = SECRET_VALUE_PATTERNS.find((desen) => desen.test.test(deger));
  return eslesen ? `değer "${eslesen.label}" imzasına uyuyor` : null;
}

/**
 * `NEXT_PUBLIC_` anahtar/değer çiftlerini tarar.
 * Dışa aktarılıyor ki hem `.env.example` hem çalışma ortamı aynı mantıktan geçsin.
 */
export function publicEnvTara(
  girdiler: ReadonlyArray<readonly [string, string]>,
  kaynak: string,
): Sizinti[] {
  const sizintilar: Sizinti[] = [];

  for (const [anahtar, deger] of girdiler) {
    if (!anahtar.startsWith('NEXT_PUBLIC_')) continue;

    const adGerekce = adSirImaEdiyorMu(anahtar);
    if (adGerekce) sizintilar.push({ kaynak, anahtar, gerekce: adGerekce });

    const degerGerekce = degerSirImzasiTasiyorMu(deger);
    if (degerGerekce) sizintilar.push({ kaynak, anahtar, gerekce: degerGerekce });
  }

  return sizintilar;
}

/** `.env` biçimli metni anahtar/değer çiftlerine ayırır (yorum ve boş satır atlanır). */
function envAyristir(icerik: string): Array<readonly [string, string]> {
  const ciftler: Array<readonly [string, string]> = [];

  for (const satir of icerik.split('\n')) {
    const kirpilmis = satir.trim();
    if (!kirpilmis || kirpilmis.startsWith('#')) continue;

    const ayirac = kirpilmis.indexOf('=');
    if (ayirac === -1) continue;

    const anahtar = kirpilmis.slice(0, ayirac).trim();
    const deger = kirpilmis
      .slice(ayirac + 1)
      .trim()
      .replace(/^["']|["']$/g, '');

    ciftler.push([anahtar, deger] as const);
  }

  return ciftler;
}

// ---------------------------------------------------------------------------
// 1. Dedektör kendini kanıtlar
// ---------------------------------------------------------------------------

describe('§8.18 dedektörü — ekili sırları yakalıyor mu', () => {
  /**
   * Bu blok olmasaydı tarama "hiçbir şey bulamadım" derdi ve bu, bozuk bir
   * tarayıcıyla temiz bir depo arasında ayrım yapmamıza izin vermezdi.
   * Kabul kriteri "adımın var olması yetmez" tam olarak bunu istiyor.
   */
  const EKILI_SIRLAR: ReadonlyArray<readonly [string, string]> = [
    ['NEXT_PUBLIC_API_TOKEN', 'zararsiz-gorunen-deger'],
    ['NEXT_PUBLIC_AUTH_SECRET', ''],
    ['NEXT_PUBLIC_ADMIN_PASSWORD_HASH', '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$hash'],
    ['NEXT_PUBLIC_SITE', 'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'],
    ['NEXT_PUBLIC_ANALYTICS', 'ghp_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'],
    ['NEXT_PUBLIC_BUCKET', 'AKIAIOSFODNN7EXAMPLE'],
    ['NEXT_PUBLIC_MAIL', 're_AbCdEfGhIjKlMnOpQrSt'],
    [
      'NEXT_PUBLIC_SESSION',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27u',
    ],
    ['NEXT_PUBLIC_DB', 'postgresql://sahinsamet:sup3rgizli@db.ornek.com:5432/sahinsamet'],
    ['NEXT_PUBLIC_CERT', '-----BEGIN PRIVATE KEY-----\nMIIEv...'],
  ];

  for (const [anahtar, deger] of EKILI_SIRLAR) {
    it(`yakalar: ${anahtar}`, () => {
      const sizintilar = publicEnvTara([[anahtar, deger]], 'ekili-test');

      expect(sizintilar.length).toBeGreaterThan(0);
    });
  }

  it('meşru public değerleri YANLIŞ POZİTİF vermez', () => {
    const mesru: ReadonlyArray<readonly [string, string]> = [
      ['NEXT_PUBLIC_SITE_URL', 'https://sahinsamet.com'],
      ['NEXT_PUBLIC_UMAMI_URL', 'https://analiz.ornek.com'],
      ['NEXT_PUBLIC_SITE_URL', ''],
    ];

    expect(publicEnvTara(mesru, 'mesru-test')).toEqual([]);
  });

  it('NEXT_PUBLIC_ ÖNEKİ OLMAYAN anahtarları görmezden gelir', () => {
    // `AUTH_SECRET` sunucuda kalır; tarayıcıya gömülmez, bu taramanın konusu değil.
    const sunucuTarafi: ReadonlyArray<readonly [string, string]> = [
      ['AUTH_SECRET', 'ghp_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'],
      ['ADMIN_PASSWORD_HASH', '$argon2id$v=19$m=19456$abc$def'],
    ];

    expect(publicEnvTara(sunucuTarafi, 'sunucu-test')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. `.env.example` taraması
// ---------------------------------------------------------------------------

/* ===========================================================================
 * 1b. BAĞLANTI DİZESİ DESENİ — daraltma hem KORUYOR hem SAHTE POZİTİF ÜRETMİYOR
 *
 * T-049g. Desen küçültülmüş derleme çıktısında iki ayrı yer tutucuyu
 * köprüleyip §8.18 kapısını haksız yere kırmızıya çeviriyordu (Frontend'in
 * bulgusu). Daraltma `"`, `{`, `}` ve `,` karakterlerini `userinfo`
 * bileşeninden çıkarıyor.
 *
 * Bu blok daraltmanın İKİ YÖNÜNÜ birden sınıyor ve ikisi de gerekli:
 *   - GERÇEK kimlik bilgisi biçimleri hâlâ yakalanıyor mu (daraltma fazla mı
 *     kesti?)
 *   - Köprü şekli artık eşleşmiyor mu (daraltma yetti mi?)
 *
 * Yalnızca ikincisini yazmak, deseni tamamen SİLEN bir değişikliği de yeşil
 * bırakırdı — negatif iddialar tek başına hiçbir şey korumaz.
 * ======================================================================== */

describe('§8.18 — bağlantı dizesi deseni (T-049g daraltması)', () => {
  /** Gerçek sızıntı biçimleri — hepsi YAKALANMALI. */
  const GERCEK_SIZINTILAR: ReadonlyArray<readonly [string, string]> = [
    [
      'postgres (DATABASE_URL biçimi)',
      'postgresql://sahinsamet:sup3rgizli@db.ornek.com:5432/sahinsamet',
    ],
    ['postgres kısa şema', 'postgres://kullanici:p4rola@127.0.0.1:5432/db'],
    ['https userinfo', 'https://kullanici:parola@ornek.com/panel'],
    ['mysql', 'mysql://root:toor@localhost:3306/app'],
    ['redis', 'redis://default:gizlianahtar@redis.ornek.com:6379'],
    ['mongodb+srv', 'mongodb+srv://admin:sifre123@kume.mongodb.net/veri'],
    ['amqp', 'amqp://tavsan:parola@rabbit.ornek.com:5672'],
  ];

  for (const [ad, deger] of GERCEK_SIZINTILAR) {
    it(`YAKALAR: ${ad}`, () => {
      const gerekce = degerSirImzasiTasiyorMu(deger);

      expect(gerekce, `${ad} yakalanmadı — daraltma fazla kesmiş`).not.toBeNull();
      // Doğru DESENİN yakaladığı da doğrulanıyor: başka bir imza (ör. JWT)
      // tesadüfen tutarsa daraltmanın kendisi sınanmamış olurdu.
      expect(gerekce).toContain('bağlantı dizesi');
    });
  }

  /**
   * KÜÇÜLTÜLMÜŞ ÇIKTI ŞEKLİ — eşleşMEMELİ.
   *
   * `profil-formu.tsx`teki `SOSYAL_ALANLAR` dizisi küçültüldüğünde bir URL yer
   * tutucusunun ardından başka bir nesnenin `anahtar:`ı ve sonraki yer
   * tutucunun `@`si yan yana geliyor. Aşağıdaki iki dize o çıktının birebir
   * şekli — biri Frontend'in GEÇİCİ kaçınmasıyla (email başta), biri
   * kaçınma OLMADAN (website sonda, yani sorunu üreten sıra).
   */
  const KOPRU_SEKILLERI: ReadonlyArray<readonly [string, string]> = [
    [
      'website SONDA (kaçınma olmadan — sorunu üreten sıra)',
      '[{anahtar:"github",tur:"url",ipucu:"https://github.com/kullanici"},{anahtar:"website",tur:"url",ipucu:"https://ornek.com"},{anahtar:"email",etiket:"E-posta",tur:"email",ipucu:"ad@ornek.com"}]',
    ],
    [
      "email BAŞTA (Frontend'in geçici kaçınması)",
      '[{anahtar:"email",tur:"email",ipucu:"ad@ornek.com"},{anahtar:"website",tur:"url",ipucu:"https://ornek.com"}]',
    ],
  ];

  for (const [ad, deger] of KOPRU_SEKILLERI) {
    it(`SAHTE POZİTİF ÜRETMEZ: ${ad}`, () => {
      expect(
        degerSirImzasiTasiyorMu(deger),
        'küçültülmüş yer tutucu dizisi kimlik bilgisi sanıldı',
      ).toBeNull();
    });
  }

  /**
   * ALAN SIRASI KAÇINMASI ARTIK GEREKSİZ — bu testin asıl söylediği şey.
   *
   * Yukarıdaki iki şeklin İKİSİ de temiz. Yani `profil-formu.tsx`teki
   * "`email` bilerek en başta" kaçınması kaldırılabilir: kapı artık sıraya
   * bakmaksızın sessiz. Gereksiz bir kaçınmayı bırakmak, yarın "bu sıra neden
   * böyle" sorusuna ve yanlış bir cevaba dönüşürdü.
   */
  it('iki alan sırası da temiz — kaçınmaya gerek kalmadı', () => {
    const sonuclar = KOPRU_SEKILLERI.map(([, deger]) => degerSirImzasiTasiyorMu(deger));

    expect(sonuclar).toEqual([null, null]);
  });
});

describe('§8.18 — .env.example', () => {
  const ornekYolu = path.join(PROJECT_ROOT, '.env.example');

  it('.env.example depoda mevcut (§8.17)', () => {
    expect(existsSync(ornekYolu)).toBe(true);
  });

  it('hiçbir NEXT_PUBLIC_ anahtarı sır taşımıyor', () => {
    const ciftler = envAyristir(readFileSync(ornekYolu, 'utf8'));
    const sizintilar = publicEnvTara(ciftler, '.env.example');

    expect(sizintilar, sizintilar.map((s) => `${s.anahtar}: ${s.gerekce}`).join('\n')).toEqual([]);
  });

  it('çalışma ortamındaki NEXT_PUBLIC_ değişkenleri de temiz', () => {
    const ciftler = Object.entries(process.env)
      .filter((giris): giris is [string, string] => typeof giris[1] === 'string')
      .map(([anahtar, deger]) => [anahtar, deger] as const);

    const sizintilar = publicEnvTara(ciftler, 'process.env');

    expect(sizintilar, sizintilar.map((s) => `${s.anahtar}: ${s.gerekce}`).join('\n')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. Derleme çıktısı taraması
// ---------------------------------------------------------------------------

/** `.next/static` altındaki tüm JS dosyalarını toplar. */
function derlemeDosyalari(kok: string): string[] {
  const bulunanlar: string[] = [];

  const gez = (dizin: string): void => {
    for (const giris of readdirSync(dizin)) {
      const tamYol = path.join(dizin, giris);
      if (statSync(tamYol).isDirectory()) {
        gez(tamYol);
      } else if (tamYol.endsWith('.js')) {
        bulunanlar.push(tamYol);
      }
    }
  };

  gez(kok);
  return bulunanlar;
}

describe('§8.18 — derleme çıktısı', () => {
  const staticDizin = path.join(PROJECT_ROOT, '.next', 'static');
  const derlemeVar = existsSync(staticDizin);

  /**
   * CI'da bu blok İKİ KEZ değerlendirilir: `test` adımında derleme henüz
   * yokken atlanır, `build` adımından SONRA tekrar koşulduğunda gerçekten
   * tarar. Ayrıntı: `.github/workflows/ci.yml` → "§8.18 derleme çıktısı".
   */
  it.skipIf(!derlemeVar)('tarayıcı paketinde sır imzası yok', () => {
    const dosyalar = derlemeDosyalari(staticDizin);
    expect(dosyalar.length).toBeGreaterThan(0);

    const bulgular: string[] = [];

    for (const dosya of dosyalar) {
      const icerik = readFileSync(dosya, 'utf8');
      for (const desen of SECRET_VALUE_PATTERNS) {
        if (desen.test.test(icerik)) {
          bulgular.push(`${path.relative(PROJECT_ROOT, dosya)}: ${desen.label}`);
        }
      }
    }

    expect(bulgular, bulgular.join('\n')).toEqual([]);
  });

  /**
   * Asıl değerli kontrol: sunucu tarafı sırların DEĞERLERİ pakete sızmış mı?
   *
   * CI'da `.env` yoktur, dolayısıyla orada bu kontrol boşta çalışır — bunu
   * saklamıyoruz. Gerçek değeri YERELDE ve ileride (T-070 Docker derlemesi)
   * ortaya çıkar: geliştirici `.env` doluyken `pnpm build` yapıp bu testi
   * koştuğunda, bir sırrın istemci bileşenine sızdığı anda yakalanır.
   */
  it.skipIf(!derlemeVar)('sunucu tarafı sır değerleri pakete sızmamış', () => {
    const sunucuSirlari = Object.entries(process.env).filter(
      (giris): giris is [string, string] =>
        typeof giris[1] === 'string' &&
        giris[1].length >= 12 &&
        !giris[0].startsWith('NEXT_PUBLIC_') &&
        adSirImaEdiyorMu(giris[0]) !== null,
    );

    if (sunucuSirlari.length === 0) {
      // CI'da beklenen durum. Testin yeşil olması "tarandı ve temiz" değil,
      // "taranacak sır yoktu" anlamına gelir — rapor bunu böyle söylüyor.
      expect(sunucuSirlari).toEqual([]);
      return;
    }

    const dosyalar = derlemeDosyalari(staticDizin);
    const bulgular: string[] = [];

    for (const dosya of dosyalar) {
      const icerik = readFileSync(dosya, 'utf8');
      for (const [anahtar, deger] of sunucuSirlari) {
        // §8.20 — bulgu mesajında DEĞERİN KENDİSİ yazılmaz, yalnızca adı.
        if (icerik.includes(deger)) {
          bulgular.push(`${path.relative(PROJECT_ROOT, dosya)}: ${anahtar} değeri gömülü`);
        }
      }
    }

    expect(bulgular, bulgular.join('\n')).toEqual([]);
  });
});
