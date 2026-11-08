/**
 * Gün semantiği yardımcısı — ADR-016.
 *
 * PROJEDEKİ TEK "BUGÜN" KAYNAĞI. Servislerde `new Date().getMonth()` gibi
 * yerel-saat hesapları YAPILMAZ; hepsi buradan geçer.
 *
 * NEDEN: `@db.Date` alanları kullanıcının yaşadığı TAKVİM GÜNÜNÜ tutar, bir anı
 * değil. Sunucu UTC'de çalışıyorsa (Docker varsayılanı) `new Date().getDate()`
 * Europe/Istanbul'da 00:00–03:00 arasında BİR ÖNCEKİ GÜNÜ verir. Sonuç: gece
 * girilen alışkanlık kaydı dünkü güne yazılır, streak sessizce kırılır ve ay
 * sınırındaki toplam yanlış çıkar. Bu hatalar gündüz test edildiğinde HİÇ
 * GÖRÜNMEZ — en pahalı hata sınıfı.
 *
 * Uygulama `Intl` ile yapılır; yaz saati geçişlerini işletim sisteminin IANA
 * veritabanı çözer. Elle UTC+3 eklemek 2016 öncesi tarihlerde yanlış olurdu.
 */

/** §1.2 — tek kullanıcı, sabit tek zaman dilimi. */
export const APP_TIME_ZONE = 'Europe/Istanbul' as const;

/** `YYYY-MM-DD` — `@db.Date` alanlarının dize karşılığı. */
export type AppDay = string;

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertAppDay(day: string): void {
  if (!DAY_PATTERN.test(day)) {
    throw new Error(`Geçersiz gün biçimi: "${day}". Beklenen: YYYY-AA-GG.`);
  }
}

/**
 * Bir anı, Europe/Istanbul'daki takvim gününe çevirir.
 *
 * `en-CA` yerel ayarı ISO sırasını (`YYYY-MM-DD`) verdiği için seçildi; dil
 * tercihiyle ilgisi yok, yalnızca biçim garantisi.
 */
export function toAppDay(instant: Date): AppDay {
  return DAY_FORMATTER.format(instant);
}

/** Europe/Istanbul'a göre bugün. */
export function appToday(now: Date = new Date()): AppDay {
  return toAppDay(now);
}

/**
 * `YYYY-MM-DD` → Prisma'ya verilecek `Date`.
 *
 * UTC gece yarısı kullanılır. Sütun `date` tipinde olduğu için saat zaten
 * saklanmaz; UTC seçmek, sunucunun yerel saatinden bağımsız ve deterministik
 * olmasını sağlar.
 */
export function appDayToDate(day: AppDay): Date {
  assertAppDay(day);
  const parsed = new Date(`${day}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Geçersiz gün: "${day}".`);
  }

  /**
   * TAKVİM DOĞRULAMASI — biçim kontrolü YETMEZ.
   *
   * `new Date('2026-02-30T00:00:00.000Z')` fırlatmaz, SESSİZCE `2026-03-02`
   * üretir (ölçüldü; `2026-04-31` de `2026-05-01` oluyor). Yani var olmayan bir
   * gün, geçerli ama YANLIŞ bir tarihe dönüşür ve kayıt sessizce başka güne
   * yazılır. Gidiş-dönüş karşılaştırması bu sınıf hatayı kapatır.
   */
  if (parsed.toISOString().slice(0, 10) !== day) {
    throw new Error(`Takvimde olmayan gün: "${day}".`);
  }

  return parsed;
}

/** Prisma'dan okunan `@db.Date` değerini gün dizesine çevirir. */
export function dateToAppDay(value: Date): AppDay {
  return value.toISOString().slice(0, 10);
}

/** Güne gün ekler/çıkarır (takvim aritmetiği, saat kayması yok). */
export function addAppDays(day: AppDay, amount: number): AppDay {
  const base = appDayToDate(day);
  base.setUTCDate(base.getUTCDate() + amount);
  return dateToAppDay(base);
}

/** Yılın ayındaki gün sayısı. Bir sonraki ayın "0. günü" = bu ayın son günü. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Güne AY ekler — AYIN SONUNA KIRPARAK (ADR-040 / T-109b).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `setUTCMonth` KULLANILAMAZ — SESSİZCE TAŞAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `new Date('2026-01-31').setUTCMonth(1)` → **2026-03-03**. JavaScript olmayan
 * günü bir sonraki aya taşıyor, hata vermiyor. Tekrarlayan bir ödeme için bu
 * şu demek: ayın 31'inde başlayan bir abonelik şubatta MART'A kayar ve bir ay
 * atlanmış görünür.
 *
 * Burada gün AYIN SON GÜNÜNE KIRPILIYOR: 31 Ocak + 1 ay = 28 Şubat (artık yılda
 * 29). Bu, abonelik ve kira gibi yükümlülüklerin gerçek davranışı.
 *
 * ⚠️ ÇAPA KAYMASINI ÖNLEMEK ÇAĞIRANIN İŞİ: 31 Ocak'tan adım adım ilerlemek
 * (31 Ocak → 28 Şubat → 28 Mart) günü kalıcı olarak kaydırır. `recurrenceOccurrences`
 * bu yüzden HER ZAMAN `startDate`ten `n` ay ekliyor, bir önceki oluşumdan değil.
 */
export function addAppMonths(day: AppDay, amount: number): AppDay {
  assertAppDay(day);
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const dayOfMonth = Number(day.slice(8, 10));

  const toplamAy = year * 12 + (month - 1) + amount;
  const hedefYil = Math.floor(toplamAy / 12);
  const hedefAy = (toplamAy % 12) + 1;

  const kirpilmis = Math.min(dayOfMonth, daysInMonth(hedefYil, hedefAy));
  const pad = (n: number): string => String(n).padStart(2, '0');

  return `${String(hedefYil).padStart(4, '0')}-${pad(hedefAy)}-${pad(kirpilmis)}`;
}

/** Güne YIL ekler. 29 Şubat + 1 yıl = 28 Şubat (aynı kırpma kuralı). */
export function addAppYears(day: AppDay, amount: number): AppDay {
  return addAppMonths(day, amount * 12);
}

/** İki gün arasındaki tam gün farkı (`to - from`). */
export function differenceInAppDays(from: AppDay, to: AppDay): number {
  const ms = appDayToDate(to).getTime() - appDayToDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/* ===========================================================================
 * GÜN → AN SINIRLARI — `DateTime` sütunlarını GÜNE göre süzmek için (T-052)
 *
 * ⚠️ `appDayToDate` BURADA KULLANILAMAZ ve sebebi ölçüldü.
 *
 * O fonksiyon `@db.Date` sütunları için UTC gece yarısı üretiyor ve orada
 * DOĞRU: sütun saat saklamıyor, UTC seçmek determinizm veriyor. Ama
 * `AuditLog.createdAt` bir `DateTime` — gerçek bir an. Aynı değeri sınır olarak
 * kullanmak §4.2 denetim ekranında şu kusuru verir (ölçüldü, 2026-10-10):
 *
 *   appDayToDate('2026-10-10') = 2026-10-10T00:00:00Z
 *                              = Istanbul'da 2026-10-10 **03:00**
 *
 *   Istanbul'da 10 Ekim 01:30'da yazılmış satır → 2026-10-09T21:30:00Z
 *     naif sınır (>= UTC gece yarısı) ile  → DIŞARIDA KALIYOR
 *     doğru sınır ile                      → içeride
 *
 * Yani "10 Ekim'den itibaren" filtresi o günün ilk ÜÇ SAATİNİ sessizce
 * düşürüyordu. Gece yapılan bir panel değişikliği denetim ekranında HİÇ
 * GÖRÜNMEZDİ — ve bu dosyanın başındaki uyarının tam olarak aynı sınıfı,
 * yalnızca ters yönde. Sessiz olduğu için en pahalı sınıftan: filtre çalışıyor
 * görünür, yalnızca eksik küme döndürür.
 *
 * Elle `-3 saat` yazmak reddedildi (bu dosyanın başındaki gerekçe): ofset
 * ANINDA ÖLÇÜLÜYOR, IANA veritabanından.
 * ======================================================================== */

const WALL_CLOCK_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * Verilen ANDA Europe/Istanbul ofseti, milisaniye (UTC+3 → +10_800_000).
 *
 * Duvar saati okunup UTC'ymiş gibi yeniden kuruluyor; fark ofsettir. `hour`
 * bazı çalışma zamanlarında `24` dönebiliyor (gece yarısı) — `0`a indiriliyor,
 * yoksa gün bir ileri kayardı.
 */
function zoneOffsetMs(instant: Date): number {
  const parts = Object.fromEntries(
    WALL_CLOCK_FORMATTER.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const hour = Number(parts.hour) % 24;

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );

  return asIfUtc - instant.getTime();
}

/**
 * `YYYY-MM-DD` → o günün Europe/Istanbul'daki İLK ANI (yerel 00:00:00.000).
 *
 * BİLİNEN SINIR: ofset, UTC gece yarısındaki andan ölçülüyor. Yerel gece yarısı
 * ile UTC gece yarısı FARKLI ofsetlere düşerse (yaz saati geçişi tam o aralıkta
 * olursa) sonuç bir saat kayardı. Türkiye 2016'dan beri sabit UTC+3 ve geçiş
 * yok — ölçüldü: 2026-01, 2026-07 ve 2015-07 için ofset üçünde de +3 saat.
 * §1.2 tek zaman dilimi sabitliyor; çok dilimli bir ihtiyaç doğarsa burada
 * ikinci bir ölçüm turu gerekir.
 */
export function appDayStartInstant(day: AppDay): Date {
  const utcMidnight = appDayToDate(day);
  return new Date(utcMidnight.getTime() - zoneOffsetMs(utcMidnight));
}

/**
 * Gün aralığını Prisma `{ gte, lt }` bloğuna çevirir — `to` DAHİL.
 *
 * ÜST SINIR DIŞLAYICI (`lt`) ve bu kasıtlı: `lte` ile "günün sonu" yazmak
 * `23:59:59.999` gibi bir uydurma gerektirir ve o değer milisaniyenin altındaki
 * bir damgayı dışarıda bırakır. "Ertesi günün ilk anından ÖNCE" sınırı tam
 * olarak doğru ve uydurma taşımıyor.
 *
 * İki uç da opsiyonel; ikisi de yoksa `undefined` döner ve çağıran `where`e
 * hiçbir şey eklemez — "tarih filtresi verilmedi" ile "hiçbir tarih uymuyor"
 * karışmasın.
 */
export function appDayRangeToInstantFilter(range: {
  from?: AppDay;
  to?: AppDay;
}): { gte?: Date; lt?: Date } | undefined {
  const filter: { gte?: Date; lt?: Date } = {};

  if (range.from) filter.gte = appDayStartInstant(range.from);
  if (range.to) filter.lt = appDayStartInstant(addAppDays(range.to, 1));

  return filter.gte || filter.lt ? filter : undefined;
}

/* ===========================================================================
 * ARALIKLAR — raporlama sorguları bunları kullanır
 * ======================================================================== */

export interface AppDayRange {
  /** Dahil. */
  from: AppDay;
  /** Dahil. */
  to: AppDay;
}

/** Ayın ilk ve son günü. `month` 1–12'dir (JS'in 0 tabanı DEĞİL). */
export function appMonthRange(year: number, month: number): AppDayRange {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Geçersiz ay: ${month}. 1–12 bekleniyor.`);
  }
  const pad = (n: number): string => String(n).padStart(2, '0');
  // Son gün hesabı `daysInMonth` ile paylaşılıyor — iki yerde yazılmıyor.
  const lastDay = daysInMonth(year, month);
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}

/** Yılın ilk ve son günü. */
export function appYearRange(year: number): AppDayRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/**
 * Haftanın başlangıcı — PAZARTESİ (ISO 8601).
 *
 * Türkiye'de hafta pazartesi başlar; `getUTCDay()` pazarı 0 sayar, bu yüzden
 * kaydırma gerekiyor. Alışkanlık streak'i ve haftalık hedef bunu kullanır.
 */
export function startOfAppWeek(day: AppDay): AppDay {
  const date = appDayToDate(day);
  const weekday = date.getUTCDay(); // 0 = Pazar
  const offset = weekday === 0 ? 6 : weekday - 1;
  return addAppDays(day, -offset);
}

export function appWeekRange(day: AppDay): AppDayRange {
  const from = startOfAppWeek(day);
  return { from, to: addAppDays(from, 6) };
}

/**
 * ISO 8601 hafta numarası ve o haftanın ait olduğu yıl.
 *
 * `periodKey` (ADR-015) haftalık biçimi buna dayanır. ISO kuralı: haftanın
 * perşembesi hangi yıldaysa hafta o yıla aittir — bu yüzden 29 Aralık 2025
 * "2026-W01" olabilir. `getFullYear()` kullanmak yıl sınırında yanlış olurdu.
 */
export function appIsoWeek(day: AppDay): { year: number; week: number } {
  const date = appDayToDate(day);
  const weekday = date.getUTCDay() || 7; // Pazar 7
  // Haftanın perşembesine taşı
  date.setUTCDate(date.getUTCDate() + 4 - weekday);

  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstWeekday = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstWeekday);

  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return { year: isoYear, week };
}
