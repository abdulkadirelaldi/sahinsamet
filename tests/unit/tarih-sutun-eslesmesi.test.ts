import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  appDayStartInstant,
  appDayToDate,
  appMonthRange,
} from '@/server/services/_shared/app-date';

/**
 * TARİH YARDIMCISI ↔ SÜTUN TİPİ EŞLEŞMESİ — ÖNCÜL KAPISI (T-107b).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE DENETLENDİ, NE BULUNDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-107b kartı bana *"Backend'e `appDayStartInstant` kullanmasını yazdım —
 * KULLANDIĞINI ölç"* dedi. Ölçtüm ve **kart yanlıştı**: Backend talimata
 * ölçümle itiraz etmiş ve itirazı DOĞRU. `report.ts` bilerek `appDayToDate`
 * kullanıyor.
 *
 * Kendi hesabımla doğruladım (2026 Mart, İstanbul):
 *
 *     appDayToDate       → 2026-03-01T00:00Z … 2026-03-31T00:00Z   ✅ DOĞRU
 *     appDayStartInstant → 2026-02-28T21:00Z … 2026-03-30T21:00Z   ❌ YANLIŞ
 *
 * İkincisi pencereyi ÜÇ SAAT geriye kaydırıyor: **28 Şubat'ı içine alıyor ve
 * 31 Mart'ı TAMAMEN DÜŞÜRÜYOR.** Kartın korktuğu kusurun (bir aylık raporun
 * ilk üç saatini düşürmek) tam tersi yönde, ama aynı büyüklükte.
 *
 * Sebep tek ve ölçülebilir: **`Transaction.date` bir `@db.Date` sütunu** —
 * takvim günü, zaman damgası değil. Postgres `date` değerleri UTC gece
 * yarısına hizalanır; anlık (instant) tabanlı bir filtre o hizayı bozar.
 * `appDayStartInstant` DOĞRU araçtır ama `AuditLog.createdAt` gibi GERÇEK bir
 * zaman damgası sütunu için (T-052'de orada kullanıldı ve orada doğru).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ O HÂLDE KAPI NEYİ ÖLÇÜYOR: KARARI DEĞİL, KARARIN ÖNCÜLÜNÜ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend `tests/unit/services/rapor.test.ts`te ay sınırını zaten çok iyi
 * ölçüyor (1 Mart/31 Mart, `lte` dahil, artık yıl, `appDayStartInstant`
 * kullanılmadığının kaynak taraması). Denetledim — **doğru ve yeterli.**
 * Paralel bir kapı yazmak, iki turdur kapattığım çiftlenmenin kendisi olurdu.
 *
 * Ölçülmeyen şey KARARIN DAYANAĞI: o testler **taklit istemci** kullanıyor,
 * yani şema hiç devreye girmiyor. `Transaction.date` bir gün düz `DateTime`a
 * (zaman damgasına) çevrilirse:
 *
 *   - `appDayToDate` ANINDA YANLIŞ araç olur (pencere 3 saat kayar)
 *   - Backend'in elli iddiasının HİÇBİRİ kırılmaz — hiçbiri şemaya bakmıyor
 *   - ve kayma ilk üç saatlik işlemleri sessizce başka aya yazar
 *
 * ADR-037'nin tarif ettiği sınıf: **kapı çalışıyor, öncülü bayatlıyor.**
 * Bu dosya o öncülü izliyor.
 */

const KOK = resolve(__dirname, '..', '..');
const SEMA = readFileSync(join(KOK, 'prisma/schema.prisma'), 'utf8');

function kod(yol: string): string {
  return readFileSync(join(KOK, yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
}

/* ===========================================================================
 * SAF ÇEKİRDEK — mutasyon sentetik girdiyle sınanıyor (ADR-038)
 * ======================================================================== */

/** Şemadaki bir alanın bildirim satırı. */
export function alanSatiri(sema: string, model: string, alan: string): string | null {
  const blok = new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(sema);
  if (!blok?.[1]) return null;

  for (const satir of blok[1].split('\n')) {
    if (/^\s*\/\//.test(satir)) continue;
    if (new RegExp(`^\\s*${alan}\\s`).test(satir)) return satir.trim();
  }
  return null;
}

/** Alan TAKVİM GÜNÜ mü (`@db.Date`), yoksa zaman damgası mı? */
export function takvimGunuMu(satir: string): boolean {
  return /@db\.Date\b/.test(satir);
}

/** Dosya hangi tarih yardımcısı ailesini kullanıyor. */
export function yardimciAilesi(kaynak: string): { gun: boolean; anlik: boolean } {
  return {
    gun: /\bappDayToDate\s*\(/.test(kaynak),
    anlik: /\b(?:appDayStartInstant|appDayRangeToInstantFilter)\s*\(/.test(kaynak),
  };
}

/* ===========================================================================
 * BİLDİRİLEN EŞLEŞMELER — her satırın ÖNCÜLÜ şemadan doğrulanıyor
 * ======================================================================== */

interface Eslesme {
  servis: string;
  model: string;
  alan: string;
  /** `gun` = `@db.Date` bekleniyor, `anlik` = zaman damgası bekleniyor. */
  beklenen: 'gun' | 'anlik';
  not: string;
}

const ESLESMELER: Eslesme[] = [
  {
    servis: 'src/server/services/health-log.ts',
    model: 'HealthLog',
    alan: 'date',
    beklenen: 'gun',
    not:
      '§4.2 sağlık kaydı. `date` `@db.Date` VE `@unique` — şema yorumu sebebini ' +
      'söylüyor: "`DateTime` olsaydı bu unique gece 00:00–03:00 arasında ' +
      'beklenmedik davranırdı." Yani tekillik GÜNE bağlı, ana değil → ' +
      '`appDayToDate`. ⚠️ `createdAt`/`updatedAt` ise `timestamp` ve gün ' +
      'dönüşümünden GEÇMİYOR; aynı dosyada iki sütun ailesi var ve ayrımı tip ' +
      'belirliyor (T-102 kuralı).',
  },
  {
    servis: 'src/server/services/workout.ts',
    model: 'Workout',
    alan: 'date',
    beklenen: 'gun',
    not:
      '§4.2 antrenman kaydı. `date` `@db.Date` → `appDayToDate`/`dateToAppDay`. ' +
      '⚠️ `HealthLog.date`TEN FARKI: BURASI `@unique` DEĞİL — aynı güne iki ' +
      'antrenman düşebilir (sabah koşu, akşam ağırlık; şema `type` alanını tam ' +
      'bunun için taşıyor). İki sonucu var: günde tek kayıt kontrolü YOK, ve ' +
      'sıralamada İKİNCİL ANAHTAR (`createdAt`) ZORUNLU — yoksa aynı güne düşen ' +
      'iki antrenmanın sırası belirsiz kalır ve sayfalama satır TEKRARLAR. ' +
      '⚠️ `createdAt`/`updatedAt` `timestamp` ve gün dönüşümünden GEÇMİYOR.',
  },
  {
    servis: 'src/server/services/_shared/personal-record.ts',
    model: 'PersonalRecord',
    alan: 'date',
    beklenen: 'gun',
    not:
      'ADR-021 · rekorun kırıldığı gün, `@db.Date` → `appDayToDate`. ⚠️ GÜN ' +
      'YAZILMIYOR, TÜRETİLİYOR: değer setin ait olduğu `Workout.date`ten geliyor ' +
      '(`dateToAppDay(set.workout.date)`), yani iki sütun da `@db.Date` ve ' +
      'dönüşüm İKİ YÖNLÜ. ⚠️ T-111`de burada ELLE kurulmuş iki ' +
      '`new Date(`${day}T00:00:00.000Z`)` vardı — aynı sonucu veriyordu ama saf ' +
      'yardımcının İKİNCİ TANIMIYDI (BULGU-024`ün sınıfı); `appDayToDate`e ' +
      'geçildi. ⚠️ Günün kıyasa da girdiği yer: eşitlikte ÖNCE olan gün kazanıyor ' +
      '(PR Kararı 2), yani yanlış sınır yalnızca tarihi değil HANGİ SETİN REKOR ' +
      'OLDUĞUNU değiştirirdi.',
  },
  {
    servis: 'src/server/services/habit.ts',
    model: 'HabitLog',
    alan: 'date',
    beklenen: 'gun',
    not:
      '§4.2 haftalık alışkanlık panosu ve seri hesabı. `HabitLog.date` `@db.Date` ' +
      '→ `appDayToDate`/`dateToAppDay`. ⚠️ Hafta sınırı (`appWeekRange`, ' +
      'pazartesi) ve seri penceresi GÜN aritmetiğiyle (`addAppDays`) kuruluyor, ' +
      'an aritmetiğiyle değil — yani bir `AppDay` hiçbir noktada saate dönmüyor ' +
      've 3 saatlik kayma sınıfı burada doğamıyor.',
  },
  {
    servis: 'src/server/services/antrenman-oturumu.ts',
    model: 'Workout',
    alan: 'date',
    beklenen: 'gun',
    not:
      'Oturum başlatırken antrenmanın GÜNÜ İstanbul gününden (`appToday` → ' +
      '`appDayToDate`) yazılıyor; liste okuması `dateToAppDay`. Başlama/bitiş ANI ' +
      'ayrı sütunlarda (`startedAt`, `finishedAt` — zaman damgası).',
  },
  {
    servis: 'src/server/services/cuzdan.ts',
    model: 'WalletDebt',
    alan: 'endDate',
    beklenen: 'gun',
    not:
      'Cüzdan (2026-10-30). Borç bitişi, akış tarihi ve ödeme tarihi üçü de ' +
      '`@db.Date` → `appDayToDate`/`dateToAppDay`. "Kaç ay kaldı" GÜN farkından ' +
      '(`differenceInAppDays`) — anlık yardımcı gece girilen ödemeyi önceki güne yazardı.',
  },
  {
    servis: 'src/server/services/cuzdan.ts',
    model: 'WalletFlow',
    alan: 'date',
    beklenen: 'gun',
    not: 'Tek seferlik gelir/gider günü — takvim günü, saat yok.',
  },
  {
    servis: 'src/server/services/cuzdan-hareket.ts',
    model: 'WalletDebtPayment',
    alan: 'date',
    beklenen: 'gun',
    not: 'Ödeme ve transfer yazımı, `cuzdan.ts`ten ayrıldı (2026-11-02): takvim günü.',
  },
  {
    servis: 'src/server/services/cuzdan.ts',
    model: 'WalletDebtPayment',
    alan: 'date',
    beklenen: 'gun',
    not: 'Borç ödemesinin günü — takvim günü, saat yok.',
  },
  {
    servis: 'src/server/services/bildirim.ts',
    model: 'BildirimKaydi',
    alan: 'gun',
    beklenen: 'gun',
    not:
      'Bildirim tekrar önleme (2026-10-30): (tür, anahtar, GÜN) eşsiz; `gun` `@db.Date` → ' +
      '`appDayToDate(appToday())`. Anlık yardımcı gece yarısından sonra 3 saat boyunca ' +
      'dünü yazar ve sabahki su hatırlatmasını "zaten gönderildi" sanardı.',
  },
  {
    servis: 'src/server/services/odeme-onay.ts',
    model: 'WalletOdeme',
    alan: 'gun',
    beklenen: 'gun',
    not: 'Ödeme onayının günü `@db.Date` → `appDayToDate(appToday())`; dönem `YYYY-MM` metin.',
  },
  {
    servis: 'src/server/services/ingilizce.ts',
    model: 'IngilizceDers',
    alan: 'gun',
    beklenen: 'gun',
    not: 'Dersin günü `@db.Date`: yazma `appDayToDate(appToday())`, okuma `dateToAppDay`; seri İstanbul gününe göre.',
  },
  {
    servis: 'src/server/services/aylik-ozet.ts',
    model: 'Workout',
    alan: 'date',
    beklenen: 'gun',
    not: 'Antrenman ve sağlık tarihleri takvim günü; ay sınırı `appDayToDate`, okuma `dateToAppDay`.',
  },
  {
    servis: 'src/server/services/haftalik-ozet.ts',
    model: 'Workout',
    alan: 'date',
    beklenen: 'gun',
    not: 'Antrenman, gider ve tartı tarihleri takvim günü; süzgeç `appDayToDate`, okuma `dateToAppDay`.',
  },
  {
    servis: 'src/server/services/spor-gelisim.ts',
    model: 'Workout',
    alan: 'date',
    beklenen: 'gun',
    not: 'Antrenman tarihi takvim günü; `workout.date` süzgeci `appDayToDate`, okuma `dateToAppDay`.',
  },
  {
    servis: 'src/server/services/cuzdan-rapor.ts',
    model: 'NetVarlikKaydi',
    alan: 'gun',
    beklenen: 'gun',
    not: 'Günlük net varlık anahtarı `@db.Date` → `appDayToDate`; akış ve ödeme tarihleri de takvim günü.',
  },
  {
    servis: 'src/server/services/habit-gun.ts',
    model: 'HabitLog',
    alan: 'date',
    beklenen: 'gun',
    not:
      'Günlük liste ve rapor okuması (2026-10-29). Tek gün `date = appDayToDate(gün)` ' +
      'ile EŞİTLİK, rapor `gte/lte` gün aralığı — ikisi de takvim günü. Anlık ' +
      'yardımcı 3 saat kaydırıp gece yapılan işareti önceki güne gösterirdi.',
  },
  {
    servis: 'src/server/services/habit-log.ts',
    model: 'HabitLog',
    alan: 'date',
    beklenen: 'gun',
    not:
      'İşaret yazma yolu. `@@unique([habitId, date])` ve `date` `@db.Date` — ' +
      'tekillik GÜNE bağlı (`HealthLog.date @unique` ile aynı gerekçe). Yanlış ' +
      'yardımcı (anlık) aynı günü İKİ farklı değere çevirip tekilliği delerdi: ' +
      'gece 01:00`deki tık bir önceki güne yazılırdı.',
  },
  {
    servis: 'src/server/services/goal.ts',
    model: 'Goal',
    alan: 'targetDate',
    beklenen: 'gun',
    not:
      '§4.2 hedef tarihi, `DateTime? @db.Date` (OPSİYONEL) → `appDayToDate`. ' +
      '`daysLeft` `differenceInAppDays` ile GÜN farkı olarak türetiliyor; ' +
      '`createdAt`/`updatedAt` `timestamp` ve gün dönüşümünden GEÇMİYOR.',
  },
  {
    servis: 'src/server/services/journal-entry.ts',
    model: 'JournalEntry',
    alan: 'date',
    beklenen: 'gun',
    not:
      '§4.2 günlük. `date` `@db.Date` ama `@unique` DEĞİL (`HealthLog`un tersi, ' +
      '`Workout` ile aynı) — günde birden çok kayıt; sıralamada ikincil anahtar ' +
      '`createdAt` ZORUNLU ve o bir `timestamp`, gün dönüşümünden geçmiyor.',
  },
  {
    servis: 'src/server/services/audit-log.ts',
    model: 'AuditLog',
    alan: 'createdAt',
    beklenen: 'anlik',
    not:
      'Denetim kaydı GERÇEK bir zaman damgası tutuyor (olayın anı). T-052 burada ' +
      '`appDayStartInstant` kullandı ve DOĞRU olan o: gün sınırı kullanıcının saat ' +
      'diliminde başlar, UTC gece yarısında değil.',
  },
];

/**
 * Yardımcıyı kullanan ama bir SÜTUN EŞLEŞMESİ kararı vermeyen dosyalar.
 *
 * Muafiyet gerekçeli, çünkü sebepsiz bir muafiyet bir gün gerçek bir
 * eşleşme kararını maskeler. İkisi de ölçülerek belirlendi — tahminle değil:
 * sayım kapısı önce kırmızıya döndü ve her birini okumaya zorladı.
 *
 * ⚠️ BURAYA ÜÇÜNCÜ BİR SATIR YAZMIŞTIM VE KAPI SİLDİRDİ: `period-key.ts`
 * muafiyete alınmıştı ama ÖLÇMEMİŞTİM — o dosya hiçbir tarih yardımcısı
 * kullanmıyor, yani muafiyet doğduğu anda ÖLÜYDÜ. "Ölü muafiyet" iddiası
 * kırıldı ve satırı sildirdi. Varsayımla yazılmış bir muafiyet, kapının
 * kapsamını sessizce daraltır — kapının kendi mekanizması bunu yakaladı.
 */
const MUAF_DOSYALAR: { yol: string; gerekce: string }[] = [
  {
    yol: 'src/server/services/_shared/donem.ts',
    gerekce:
      'Dönem anahtarı/aralığı hesabı (2026-10-29): `appDayToDate` yalnızca ISO hafta ' +
      'için 4 Ocakın HAFTA GÜNÜNÜ okuyor. Hiçbir sütunu süzmüyor; sorgu `goal.periodKey` ' +
      'üzerinden metin eşitliğiyle yapılıyor.',
  },
  {
    yol: 'src/server/services/_shared/app-date.ts',
    gerekce:
      'Yardımcıların KENDİ evi: hem `appDayToDate` hem `appDayStartInstant` burada ' +
      'tanımlanıyor. Bir sütun süzmüyor.',
  },
];

function servisDosyalari(): string[] {
  const kokDizin = 'src/server/services';
  const toplanan: string[] = [];

  const gez = (goreli: string): void => {
    for (const ad of readdirSync(join(KOK, kokDizin, goreli))) {
      const yol = goreli ? `${goreli}/${ad}` : ad;
      if (statSync(join(KOK, kokDizin, yol)).isDirectory()) gez(yol);
      else if (ad.endsWith('.ts')) toplanan.push(`${kokDizin}/${yol}`);
    }
  };
  gez('');

  return toplanan;
}

describe('ADR-037 — tarih kararının ÖNCÜLÜ: sütun tipi', () => {
  it('önkoşul — şema okunuyor ve alan satırları bulunuyor', () => {
    // Ayıklama bozulursa `takvimGunuMu(null)` hiç çağrılmaz ve aşağıdaki
    // iddialar "satır yok" diye yanlış sebeple kırılır/geçer.
    expect(SEMA.length).toBeGreaterThan(1000);
    expect(alanSatiri(SEMA, 'HealthLog', 'date'), 'HealthLog.date bulunamadı').toBeTruthy();
    expect(alanSatiri(SEMA, 'AuditLog', 'createdAt'), 'AuditLog.createdAt bulunamadı').toBeTruthy();
  });

  for (const eslesme of ESLESMELER) {
    it(`${eslesme.model}.${eslesme.alan} → ${eslesme.beklenen === 'gun' ? '@db.Date' : 'zaman damgası'} (öncül)`, () => {
      const satir = alanSatiri(SEMA, eslesme.model, eslesme.alan);
      expect(satir, `${eslesme.model}.${eslesme.alan} şemada yok`).toBeTruthy();

      const gun = takvimGunuMu(satir ?? '');

      expect(
        gun,
        `${eslesme.model}.${eslesme.alan} sütun tipi DEĞİŞTİ.\n` +
          `  Bildirim: ${satir}\n` +
          `  Beklenen: ${eslesme.beklenen === 'gun' ? '@db.Date (takvim günü)' : 'düz DateTime (zaman damgası)'}\n` +
          `  ${eslesme.not}\n` +
          `  ⚠️ ${eslesme.servis} bu öncüle göre yardımcı seçti. Öncül düştüyse ` +
          'yardımcı seçimi de yeniden ölçülmeli — taklit istemciyle koşan birim ' +
          'testleri bu değişikliği GÖRMEZ.',
      ).toBe(eslesme.beklenen === 'gun');
    });

    it(`${eslesme.servis.split('/').pop()} doğru yardımcı ailesini kullanıyor`, () => {
      const aile = yardimciAilesi(kod(eslesme.servis));

      if (eslesme.beklenen === 'gun') {
        expect(aile.gun, `${eslesme.servis}: takvim günü sütunu için appDayToDate bekleniyor`).toBe(
          true,
        );
        expect(
          aile.anlik,
          `${eslesme.servis}: ANLIK yardımcı kullanıyor ama ${eslesme.model}.${eslesme.alan} bir ` +
            'takvim günü — pencere 3 saat kayar (28 Şubat girer, 31 Mart düşer).',
        ).toBe(false);
      } else {
        expect(aile.anlik, `${eslesme.servis}: zaman damgası için anlık yardımcı bekleniyor`).toBe(
          true,
        );
      }
    });
  }

  it('muafiyetler GEREKÇELİ ve dosyaları hâlâ yardımcıyı kullanıyor', () => {
    /*
     * Ölü muafiyet, ölü istisnanın aynısı (ADVISORY-001'in dersi): bir gün
     * gerçek bir eşleşme kararını maskeler. İki yönlü kontrol — dosya hâlâ
     * yardımcı kullanıyor mu, ve gerekçe yazılı mı.
     */
    for (const muaf of MUAF_DOSYALAR) {
      const aile = yardimciAilesi(kod(muaf.yol));
      expect(
        aile.gun || aile.anlik,
        `${muaf.yol} artık tarih yardımcısı KULLANMIYOR — muafiyet ÖLÜ, silinmeli`,
      ).toBe(true);
      expect(muaf.gerekce.length, `${muaf.yol}: gerekçesiz muafiyet yazılmaz`).toBeGreaterThan(60);
    }
  });

  it('⚠️ BİLDİRİLMEYEN hiçbir servis tarih yardımcısı kullanmıyor', () => {
    /*
     * Sayım kapısı (rota kapsamı kalıbı): yeni bir servis tarih süzmeye
     * başladığında bu kapı öter ve yazarı eşleşme tablosuna satır eklemek —
     * yani SÜTUN TİPİNİ ÖLÇMEK — zorunda kalır. F5'te on üç `@db.Date`
     * sütunu bekliyor (sağlık, spor, alışkanlık, günlük), yani bu kapının
     * ötme ihtimali yüksek ve ötmesi doğru.
     */
    const bildirilen = new Set([
      ...ESLESMELER.map((e) => e.servis),
      ...MUAF_DOSYALAR.map((m) => m.yol),
    ]);

    const bildirilmeyen = servisDosyalari().filter((yol) => {
      if (bildirilen.has(yol)) return false;
      const aile = yardimciAilesi(kod(yol));
      return aile.gun || aile.anlik;
    });

    expect(
      bildirilmeyen,
      'Bu servisler tarih yardımcısı kullanıyor ama eşleşme tablosunda YOK:\n' +
        `${bildirilmeyen.join('\n')}\n` +
        'Tabloya satır ekle: hangi model/alan, sütun tipi ne, hangi yardımcı doğru. ' +
        'Öncül yazılmazsa karar ölçülemez (ADR-037).',
    ).toEqual([]);
  });
});

describe('ÖNCÜLÜN SONUCU — iki yardımcı GERÇEKTEN farklı pencere üretiyor', () => {
  /**
   * Bu blok öncülün NEDEN önemli olduğunu ölçüyor.
   *
   * Yukarıdaki iddialar "sütun tipi şu" diyor; ama tip değiştiğinde ne
   * kaybedileceği ölçülmezse, kapı bir gün "bu kısıt neden var" diye
   * kaldırılabilir. Sayılar burada duruyor ve kendileri için konuşuyor.
   */
  const r = appMonthRange(2026, 3) as unknown;
  const [bas, son] = Array.isArray(r)
    ? (r as [string, string])
    : [(r as { from: string }).from, (r as { to: string }).to];

  it('aralık Mart ayının iki ucu', () => {
    expect([bas, son]).toEqual(['2026-03-01', '2026-03-31']);
  });

  it('`appDayToDate` UTC gece yarısına hizalıyor — `@db.Date` ile aynı hiza', () => {
    expect(appDayToDate(bas).toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(appDayToDate(son).toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });

  it('⚠️ `appDayStartInstant` pencereyi ÜÇ SAAT geriye kaydırıyor', () => {
    /*
     * Kartın talimatı buydu ve ölçüm reddetti. Alt sınır 28 Şubat'a düşüyor
     * (o güne ait kayıtlar Mart raporuna girer) ve üst sınır 30 Mart 21:00'da
     * kapanıyor (31 Mart'ın TAMAMI düşer). İki hata aynı anda.
     */
    expect(appDayStartInstant(bas).toISOString()).toBe('2026-02-28T21:00:00.000Z');
    expect(appDayStartInstant(son).toISOString()).toBe('2026-03-30T21:00:00.000Z');

    const sapmaSaat =
      (appDayToDate(bas).getTime() - appDayStartInstant(bas).getTime()) / (60 * 60 * 1000);
    expect(sapmaSaat, 'İstanbul UTC+3 — sapma tam üç saat').toBe(3);
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi (ADR-038: kimsenin dosyasına dokunulmuyor)
 * ======================================================================== */

describe('MUTASYON · çekirdek gerçekten ısırıyor', () => {
  const SEMA_ORNEK = [
    'model Ornek {',
    '  id String @id',
    '  gun DateTime @db.Date',
    '  an  DateTime @default(now())',
    '  // yorum DateTime @db.Date — sayılmamalı',
    '}',
  ].join('\n');

  it('`@db.Date` ile düz `DateTime` ayırt ediliyor', () => {
    expect(takvimGunuMu(alanSatiri(SEMA_ORNEK, 'Ornek', 'gun') ?? '')).toBe(true);
    expect(takvimGunuMu(alanSatiri(SEMA_ORNEK, 'Ornek', 'an') ?? '')).toBe(false);
  });

  it('YORUM satırı alan sayılmıyor', () => {
    expect(alanSatiri(SEMA_ORNEK, 'Ornek', 'yorum')).toBeNull();
  });

  it('SÜTUN TİPİ DEĞİŞİRSE öncül iddiası kırılır', () => {
    // `@db.Date` kaldırılmış bir bildirim: kapı bunu takvim günü SAYMAMALI.
    const bozuk = SEMA_ORNEK.replace('gun DateTime @db.Date', 'gun DateTime');
    expect(takvimGunuMu(alanSatiri(bozuk, 'Ornek', 'gun') ?? '')).toBe(false);
  });

  it('yardımcı ailesi tespiti ÇAĞRIYI sayıyor, içe aktarmayı DEĞİL', () => {
    expect(yardimciAilesi('const d = appDayToDate(gun);')).toEqual({ gun: true, anlik: false });
    expect(yardimciAilesi('const i = appDayStartInstant(gun);')).toEqual({
      gun: false,
      anlik: true,
    });
    // Yalnızca içe aktarma ya da yorumda geçmesi "kullanıyor" değildir.
    expect(yardimciAilesi("import { appDayToDate } from '@/x';")).toEqual({
      gun: false,
      anlik: false,
    });
  });
});
