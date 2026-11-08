import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * T-116 — HASSAS VERİ ERİŞİM DENETİMİ (F5: sağlık, spor, hayat).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR KAPI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `denetim-kaydi.test.ts` aynı soruyu YALNIZCA `audit-log` için soruyor:
 * "bir `'use server'` dosyası bu okumayı ağa açıyor mu". F5 yedi model getirdi
 * ve ikisi sistemdeki en hassas veri — vücut ölçümleri (KVKK özel nitelikli)
 * ve günlük (en kişisel serbest metin). Onlar için kimse sormuyordu.
 *
 * Üç ayrı sızıntı yolu var ve üçü de SESSİZ:
 *
 *   1. YETKİSİZ EYLEM — `'use server'` dosyasındaki her ihraç bir POST ucu.
 *      `currentActorId()` kontrolünü unutan TEK bir eylem, kimlik doğrulamasız
 *      yazma (ya da dönüş değeriyle okuma) demek. Birim testleri eylemleri
 *      tek tek sınıyor ama YENİ bir eylemi kimse sınamıyor.
 *   2. OKUMANIN AĞA AÇILMASI — `export { fetchJournalEntries } from …` gibi
 *      tek bir satır günlüğün tamamını POST ucuna çevirir.
 *   3. PANEL DIŞI İÇE AKTARMA — public sayfa, API ucu ya da ÖNBELLEK katmanı
 *      (`cached.ts`) bu servisleri okursa veri ya ziyaretçiye ya da
 *      kullanıcılar arası paylaşılan bir önbellek girdisine düşer.
 *
 * Kapı KAYNAKTAN tarıyor ve çekirdeği saf — mutasyon sentetik girdiyle
 * sınanıyor (ADR-038), yani "boş kümede yeşil" kalamıyor.
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

/** F5 modüllerinin servis/eylem dosya adları (uzantısız). */
export const KISISEL_MODULLER = [
  'health-log',
  'exercise',
  'workout',
  'workout-set',
  'personal-record',
  'habit',
  'habit-log',
  'goal',
  'journal-entry',
] as const;

/** Bu modüllerin İÇE AKTARILABİLDİĞİ yerler — başka her yer ihlal. */
const IZINLI_ONEKLER = [
  'src/app/(panel)/',
  'src/components/panel/',
  'src/server/actions/',
  'src/server/services/',
] as const;

/**
 * Sunucu katmanında bile YASAK dosyalar — önbellek ve public okuma yolu.
 * `src/server/services/` izinli önekin İSTİSNASI: orada olmak yetmiyor.
 */
const YASAK_SUNUCU_DOSYALARI = [
  'src/server/services/cached.ts',
  'src/server/services/_shared/content-cache.ts',
  'src/server/services/_shared/content-query.ts',
  'src/server/services/stats.ts',
] as const;

/* ===========================================================================
 * SAF ÇEKİRDEK
 * ======================================================================== */

const modulDeseni = (modul: string): RegExp =>
  new RegExp(`from\\s+['"][^'"]*/(?:services|actions)/${modul}['"]`);

/** (3) Panel dışı içe aktaranlar. */
export function panelDisiIceAktaranlar(kaynaklar: ReadonlyMap<string, string>): string[] {
  const sonuc: string[] = [];
  for (const [yol, metin] of kaynaklar) {
    const izinli =
      IZINLI_ONEKLER.some((onek) => yol.startsWith(onek)) &&
      !(YASAK_SUNUCU_DOSYALARI as readonly string[]).includes(yol);
    if (izinli) continue;
    for (const modul of KISISEL_MODULLER) {
      if (modulDeseni(modul).test(metin)) sonuc.push(`${yol} → ${modul}`);
    }
  }
  return sonuc;
}

/**
 * (1) `'use server'` dosyasında kimlik kontrolüyle BAŞLAMAYAN ihraçlar.
 *
 * Ölçüt: gövdenin İLK ifadesi `currentActorId()` çağrısı ve hemen ardından
 * `if (!actorId) return unauthorized();`. "Gövdede bir yerde geçiyor" yetmez —
 * kontrolden ÖNCE bir okuma yapılırsa (ör. kayıt aranıp dönülürse) yetki
 * kapısı anlamsızlaşır.
 */
export function yetkisizEylemler(dosya: string, metin: string): string[] {
  if (!/['"]use server['"]/.test(metin)) return [];
  const sonuc: string[] = [];
  const baslar = [...metin.matchAll(/export\s+async\s+function\s+(\w+)/g)];

  baslar.forEach((m, sira) => {
    const ad = m[1] ?? '?';
    const bolum = metin.slice(m.index ?? 0, baslar[sira + 1]?.index ?? metin.length);
    /*
     * GÖVDE, SATIR SONUYLA BİTEN İLK `{`ten başlıyor. İlk sürüm "ilk `{`"
     * diyordu ve dönüş tipindeki nesne tipini (`Promise<{ id: string; … }>`)
     * gövde sandı — iki doğru eylemi ihlal saydı. Tip içi süslü parantezi
     * boşluk izler, gövdeninkini satır sonu.
     */
    const govde = bolum.match(/\{[ \t]*\n([\s\S]*)/)?.[1] ?? '';
    const [ilk = '', ikinci = ''] = govde.split(';');
    /*
     * Değişken adı ve dönüş biçimi SERBEST (`totp.ts` `userId` +
     * `totpFail('UNAUTHORIZED')` kullanıyor), ama yardımcı `currentActorId` —
     * ADR-035/B iptalini yapan TEK yardımcı — ve ikinci ifade AYNI
     * değişkenin yokluğunda dönüş olmak ZORUNDA.
     */
    const ad1 = ilk.match(/^\s*const\s+(\w+)\s*=\s*await\s+currentActorId\(\)\s*$/)?.[1];
    const tamam =
      ad1 !== undefined &&
      new RegExp(
        `^\\s*if\\s*\\(\\s*!${ad1}\\s*\\)\\s*return\\s+(?:unauthorized\\(\\)|totpFail\\('UNAUTHORIZED'\\))\\s*$`,
      ).test(ikinci);
    if (!tamam) sonuc.push(`${dosya} → ${ad}`);
  });

  return sonuc;
}

/** (2) `'use server'` dosyasından F5 OKUMASI yeniden ihracı. */
export function okumaIhraclari(dosya: string, metin: string): string[] {
  if (!/['"]use server['"]/.test(metin)) return [];
  const sonuc: string[] = [];
  if (/export\s*\*\s*from/.test(metin)) sonuc.push(`${dosya} → export *`);
  for (const m of metin.matchAll(/export\s*\{([^}]*)\}/g)) {
    if (/\bfetch[A-Z]/.test(m[1] ?? '')) sonuc.push(`${dosya} → ${m[1]?.trim()}`);
  }
  return sonuc;
}

/* ===========================================================================
 * GERÇEK DEPO
 * ======================================================================== */

/**
 * §8.6 — "Her Server Action kendi içinde ayrıca `auth()` kontrolü yapar" —
 * TÜM eylem dosyaları (T-062). T-116 kapısı yalnızca F5'i tarıyordu; T-062'de
 * bütüne genişletilince BULGU-027 çıktı: `totp.ts`in üç YAZMA eylemi
 * `currentActorId` yerine ADR-035/B iptalini YAPMAYAN `currentUserId`
 * kullanıyordu.
 *
 * İSTİSNA BİLDİRİLİR, gerekçesiyle; ve istisna ÖLÜRSE (eylem uyumlu hâle
 * gelir ya da silinirse) kapı onu sildirir.
 */
const YETKI_ISTISNALARI: Record<string, string> = {
  'src/server/actions/passkey.ts → passkeyGirisSecenekleriAction':
    'GİRİŞ ÖNCESİ — oturum YOKKEN çağrılmak zorunda (Face ID ile giriş). Veri okumaz ' +
    'ya da yazmaz; yalnızca tek kullanımlık, 5 dk ömürlü bir WebAuthn meydan okuması ' +
    'üretir. Açık meydan okuma tavanı serviste; köken onay listesiyle sınırlı.',
  'src/server/actions/totp.ts → startTotpSetup':
    '2FA KURULUMU — tam da 2FA henüz yokken çağrılır; `kurulumActorId` oturum ve yazma ' +
    'iptalini denetler, yalnızca 2FA alanını istemez.',
  'src/server/actions/totp.ts → confirmTotpSetup':
    '2FA KURULUMU — `startTotpSetup` ile aynı gerekçe.',
  'src/server/actions/totp.ts → getTotpStatus':
    'OKUMA — mutasyon değil, yetkisizde "kapalı" dönüyor. ADR-035 okumaların iptalini ' +
    'bilerek F6/C`ye bıraktı; yazma iptali okumaya uygulanmaz.',
};

describe('§8.6 — TÜM Server Action`lar kimlik kontrolüyle başlıyor (T-062)', () => {
  const eylemler = kaynakDosyalari().filter((y) => y.startsWith('src/server/actions/'));

  it('önkoşul — eylem dosyaları taranıyor', () => {
    expect(eylemler.length).toBeGreaterThan(20);
  });

  it('⚠️ bildirilmemiş istisna YOK', () => {
    const ihlal = eylemler
      .flatMap((y) => yetkisizEylemler(y, kod(y)))
      .filter((k) => !(k in YETKI_ISTISNALARI));
    expect(ihlal, 'Kimlik kontrolüyle başlamayan Server Action').toEqual([]);
  });

  it('istisna listesi ÖLÜ SATIR taşımıyor', () => {
    const bulunan = new Set(eylemler.flatMap((y) => yetkisizEylemler(y, kod(y))));
    const olu = Object.keys(YETKI_ISTISNALARI).filter((k) => !bulunan.has(k));
    expect(olu, 'Bu istisnalar artık geçersiz — silinmeli').toEqual([]);
  });
});

/**
 * §8.8 — "Her girdi Zod ile doğrulanır — Server Action parametreleri dahil"
 * (T-062). Parametre ALAN her ihraç gövdesinde şemadan geçirmeli
 * (`parseOrFail` / `.safeParse` / `.parse`). T-062 taramasında 62/62 uyumlu;
 * parametresiz eylemlerin girdisi yok. SAF çekirdek aşağıda mutasyonda.
 */
export function zodsuzEylemler(dosya: string, metin: string): string[] {
  if (!/['"]use server['"]/.test(metin)) return [];
  const baslar = [...metin.matchAll(/export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)/g)];
  return baslar.flatMap((m, sira) => {
    if (!(m[2] ?? '').trim()) return [];
    const bolum = metin.slice(m.index ?? 0, baslar[sira + 1]?.index ?? metin.length);
    return /parseOrFail\(|\.safeParse\(|\.parse\(/.test(bolum) ? [] : [`${dosya} → ${m[1]}`];
  });
}

describe('§8.8 — parametre alan her Server Action Zod`dan geçiriyor (T-062)', () => {
  const eylemler = kaynakDosyalari().filter((y) => y.startsWith('src/server/actions/'));

  it('⚠️ şemasız eylem YOK', () => {
    expect(eylemler.flatMap((y) => zodsuzEylemler(y, kod(y)))).toEqual([]);
  });

  it('MUTASYON — şemasız eylem yakalanıyor, parametresiz serbest', () => {
    const metin = `'use server';
export async function a(raw: unknown) { return ok(raw); }
export async function b() { return ok(1); }
export async function c(raw: unknown) { const p = parseOrFail(s, raw); return p; }`;
    expect(zodsuzEylemler('x.ts', metin)).toEqual(['x.ts → a']);
  });
});

/**
 * §8.19 — "Tüm panel mutasyonları `AuditLog`a yazılır" (T-062). Her ihraç,
 * gövdesinde ya da ÇAĞIRDIĞI yerel bir yardımcıda (geçişli) `writeAuditLog`
 * çağırmalı. İlk taramam yardımcıyı "dosyada bir yerde yazıyor mu" diye
 * çözüyordu ve HER ŞEYİ uyumlu saydı — okuma olan `getTotpStatus` dahil.
 * Gevşek bir eşleme boş küme verir ve yeşil kalır; yardımcı artık KENDİ
 * gövdesiyle çözülüyor.
 */
export function denetimsizEylemler(dosya: string, metin: string): string[] {
  if (!/['"]use server['"]/.test(metin)) return [];
  const baslar = [...metin.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm)];
  const govde = new Map(
    baslar.map((b, i) => [
      b[1] ?? '',
      metin.slice(b.index ?? 0, baslar[i + 1]?.index ?? metin.length),
    ]),
  );
  const yazar = (ad: string, gorulen: Set<string>): boolean => {
    if (gorulen.has(ad)) return false;
    gorulen.add(ad);
    const b = govde.get(ad) ?? '';
    if (/writeAuditLog\(/.test(b)) return true;
    return [...govde.keys()].some(
      (f) => f !== ad && new RegExp(`\\b${f}\\(`).test(b) && yazar(f, gorulen),
    );
  };
  return [...metin.matchAll(/export\s+async\s+function\s+(\w+)/g)]
    .map((m) => m[1] ?? '')
    .filter((ad) => !yazar(ad, new Set()))
    .map((ad) => `${dosya} → ${ad}`);
}

/** Denetim kaydı yazmayan ihraçlar — yalnızca OKUMALAR, gerekçesiyle. */
const DENETIM_ISTISNALARI: Record<string, string> = {
  'src/server/actions/hizli-ekle.ts → hizliHesaplarAction':
    'OKUMA — hızlı harcamada hesap seçimi için, hiçbir şey yazmaz.',
  'src/server/actions/hizli-ekle.ts → sonKiloAction':
    'OKUMA — kilo formunda son tartıyı gösterir, hiçbir şey yazmaz.',
  'src/server/actions/ingilizce.ts → ingilizceHataBildirAction':
    'GÜNLÜK, mutasyon değil — kullanıcı verisi değişmez; bildirim hata kaydına düşer ve ' +
    'kaydın kendisi iz (`istemciHatasiAction` ile aynı gerekçe).',
  'src/server/actions/hata-kaydi.ts → istemciHatasiAction':
    'GÜNLÜK, mutasyon değil — kullanıcı verisi değişmez; hata kaydının KENDİSİ bir iz. Her ' +
    'hata için denetim satırı yazmak, döngüdeki bir hatada denetim kaydını boğardı.',
  'src/server/actions/passkey.ts → passkeyGirisSecenekleriAction':
    'GİRİŞ ÖNCESİ meydan okuma — kullanıcı verisi değişmez. Girişin kendisi (başarılı ' +
    've başarısız) `login_attempt`e yazılıyor, kilit politikası denetim kaydı düşüyor.',
  'src/server/actions/totp.ts → getTotpStatus':
    'OKUMA — ekranın açılış durumu; mutasyon değil, denetlenecek bir değişiklik yok.',
};

describe('§8.19 — her mutasyon eylemi AuditLog`a yazıyor (T-062)', () => {
  const eylemler = kaynakDosyalari().filter((y) => y.startsWith('src/server/actions/'));
  const bulunan = eylemler.flatMap((y) => denetimsizEylemler(y, kod(y)));

  it('⚠️ bildirilmemiş denetimsiz eylem YOK', () => {
    expect(bulunan.filter((k) => !(k in DENETIM_ISTISNALARI))).toEqual([]);
  });

  it('istisna listesi ÖLÜ SATIR taşımıyor', () => {
    expect(Object.keys(DENETIM_ISTISNALARI).filter((k) => !bulunan.includes(k))).toEqual([]);
  });

  it('MUTASYON — doğrudan, geçişli ve eksik yazma ayırt ediliyor', () => {
    const metin = `'use server';
async function kaydet(x) { await writeAuditLog(x, db); }
function bicim(x) { return x; }
export async function dogrudan(r) { await writeAuditLog(r, db); }
export async function gecisli(r) { await kaydet(r); }
export async function eksik(r) { return bicim(r); }`;
    expect(denetimsizEylemler('x.ts', metin)).toEqual(['x.ts → eksik']);
  });
});

describe('T-116 — F5 hassas veri erişimi', () => {
  const dosyalar = kaynakDosyalari();
  const kaynaklar = new Map(dosyalar.map((yol) => [yol, kod(yol)]));
  const eylemDosyalari = KISISEL_MODULLER.map((m) => `src/server/actions/${m}.ts`).filter((y) =>
    kaynaklar.has(y),
  );

  it('önkoşul — tarama vakumda değil', () => {
    expect(dosyalar.length).toBeGreaterThan(100);
    // Eylem dosyası olan yedi modül: health-log, exercise, workout,
    // workout-set, habit (habit-log'u da taşıyor), goal, journal-entry.
    expect(eylemDosyalari.length, 'F5 eylem dosyaları bulunamadı').toBe(7);
    // Gerçek içe aktaranlar taranıyor mu — panel sayfası F5 servisini okuyor.
    expect(kod('src/app/(panel)/panel/saglik/page.tsx')).toMatch(modulDeseni('health-log'));
  });

  it('⚠️ (1) her F5 eylemi kimlik kontrolüyle BAŞLIYOR', () => {
    const ihlal = eylemDosyalari.flatMap((y) => yetkisizEylemler(y, kaynaklar.get(y) ?? ''));
    expect(ihlal, 'Kimlik kontrolüyle başlamayan Server Action').toEqual([]);

    // Çapa: gerçekten sayılan ihraç var (desen bozulursa yukarısı boşa yeşil kalırdı).
    const toplam = eylemDosyalari.reduce(
      (n, y) => n + ((kaynaklar.get(y) ?? '').match(/export\s+async\s+function/g) ?? []).length,
      0,
    );
    expect(toplam).toBeGreaterThanOrEqual(20);
  });

  it('⚠️ (2) hiçbir `use server` dosyası okuma ihraç etmiyor', () => {
    const ihlal = dosyalar
      .filter((y) => y.startsWith('src/server/actions/'))
      .flatMap((y) => okumaIhraclari(y, kaynaklar.get(y) ?? ''));
    expect(ihlal, 'Okumayı POST ucuna çeviren ihraç').toEqual([]);
  });

  it('⚠️ (3) F5 servis/eylemleri panel ve sunucu katmanı DIŞINDA içe aktarılmıyor', () => {
    expect(panelDisiIceAktaranlar(kaynaklar), 'Panel dışı içe aktarma').toEqual([]);
  });
});

/* ===========================================================================
 * MUTASYON — çekirdek gerçekten ısırıyor (ADR-038)
 * ======================================================================== */

describe('MUTASYON · kapı ısırıyor', () => {
  const GECERLI = `'use server';
export async function a(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  return ok(raw);
}`;

  it('kontrolü olan eylem geçiyor', () => {
    expect(yetkisizEylemler('x.ts', GECERLI)).toEqual([]);
  });

  it('kontrolü UNUTAN eylem yakalanıyor', () => {
    const bozuk = `${GECERLI}
export async function b(raw: unknown) {
  const kayit = await fetchJournalEntryById(raw);
  return ok(kayit);
}`;
    expect(yetkisizEylemler('x.ts', bozuk)).toEqual(['x.ts → b']);
  });

  it('dönüş tipindeki NESNE TİPİ gövde sanılmıyor (ilk sürümün yanlış alarmı)', () => {
    const tipli = `'use server';
export async function d(
  raw: unknown,
): Promise<ApiResponse<{ id: string; recordsRemoved: number }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  return ok(raw);
}`;
    expect(yetkisizEylemler('x.ts', tipli)).toEqual([]);
  });

  it('`totp.ts` biçimi (`userId` + `totpFail`) kabul — ama `currentUserId` DEĞİL (BULGU-027)', () => {
    const totp = `'use server';
export async function a(kod: string) {
  const userId = await currentActorId();
  if (!userId) return totpFail('UNAUTHORIZED');
  return ok(kod);
}`;
    expect(yetkisizEylemler('x.ts', totp)).toEqual([]);
    expect(yetkisizEylemler('x.ts', totp.replace('currentActorId', 'currentUserId'))).toEqual([
      'x.ts → a',
    ]);
    // Değişken adı UYUŞMALI — başka bir değişkeni kontrol etmek kontrol değil.
    expect(yetkisizEylemler('x.ts', totp.replace('if (!userId)', 'if (!baskaBirSey)'))).toEqual([
      'x.ts → a',
    ]);
  });

  it('kontrolden ÖNCE okuma yapan eylem yakalanıyor', () => {
    const bozuk = `'use server';
export async function c(raw: unknown) {
  const kayit = await fetchHealthLogById(raw);
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  return ok(kayit);
}`;
    expect(yetkisizEylemler('x.ts', bozuk)).toEqual(['x.ts → c']);
  });

  it('okuma ihracı yakalanıyor — adlı ve yıldızlı', () => {
    expect(
      okumaIhraclari(
        'x.ts',
        `'use server';\nexport { fetchJournalEntries } from '../services/journal-entry';`,
      ),
    ).toHaveLength(1);
    expect(
      okumaIhraclari('x.ts', `'use server';\nexport * from '../services/habit';`),
    ).toHaveLength(1);
    // `use server` OLMAYAN modülde ihraç serbest (servis index'i böyle).
    expect(okumaIhraclari('x.ts', `export * from './habit';`)).toEqual([]);
  });

  it('public sayfa ve ÖNBELLEK katmanı yakalanıyor, panel serbest', () => {
    const kaynaklar = new Map([
      [
        'src/app/(public)/blog/page.tsx',
        `import { fetchHealthTrend } from '@/server/services/health-log';`,
      ],
      [
        'src/server/services/cached.ts',
        `import { fetchGoals } from './goal';`.replace("'./goal'", "'@/server/services/goal'"),
      ],
      [
        'src/app/(panel)/panel/saglik/page.tsx',
        `import { fetchHealthLogs } from '@/server/services/health-log';`,
      ],
      [
        'src/app/api/v1/x/route.ts',
        `import { toggleHabitDayAction } from '@/server/actions/habit';`,
      ],
    ]);
    expect(panelDisiIceAktaranlar(kaynaklar).sort()).toEqual([
      'src/app/(public)/blog/page.tsx → health-log',
      'src/app/api/v1/x/route.ts → habit',
      'src/server/services/cached.ts → goal',
    ]);
  });
});
