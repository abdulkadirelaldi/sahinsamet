import * as z from 'zod';

/**
 * Paylaşılan Zod primitifleri — PROGRAM.md §7.3, §8.8.
 *
 * Bu dosya Backend mülkiyetindedir; Frontend yalnızca tüketir. Amaç, aynı
 * doğrulama kuralının iki yerde ayrı yazılmasını YAPISAL olarak engellemektir.
 *
 * ZOD 4 (risk R7): `z.string().email()` yerine `z.email()`, `errorMap` yerine
 * `error`. Sürümün gerçek API'si doğrulanarak yazılmıştır.
 *
 * MESAJ DİLİ: Tüm hata mesajları Türkçe ve doğrudan kullanıcıya gösterilebilir
 * (§7.2 "kullanıcıya düzeltici mesaj döner").
 */

/**
 * §8.13 — ZOD JIT KAPALI (T-060).
 *
 * Zod 4, nesne şemalarını hızlandırmak için açılışta `new Function("")` ile
 * `eval` desteğini YOKLUYOR. Nonce tabanlı CSP `unsafe-eval` vermediği için
 * tarayıcı yoklamayı engelliyor; Zod yakalayıp yavaş yola düşüyor — yani form
 * ÇALIŞIYOR, ama her sayfa açılışında bir `script-src ← eval` İHLAL RAPORU
 * üretiliyordu. T-060'ın E2E paketi bunu üç form sayfasında ölçtü (`/iletisim`,
 * `/giris`, MDX editörü). Zod'un kendi kaynağı çözümü yazıyor: `jitless`
 * yoklamayı hiç yapmıyor.
 *
 * Neden burada: her şema bu modülden geçiyor, yani yapılandırma şemalardan
 * ÖNCE çalışıyor. Sunucuda da kapalı — iki tarafın aynı yoldan doğrulaması,
 * hızdan (tek kullanıcılı panelde ölçülemeyecek kadar küçük) daha değerli.
 */
z.config({ jitless: true });

/* ===========================================================================
 * KİMLİK & YEREL
 * ======================================================================== */

/** Prisma `cuid()` — 25 karakter, `c` ile başlar. Gevşek tutuldu: uzunluk kontrolü yeterli. */
export const cuidSchema = z
  .string()
  .min(1, { error: 'Kimlik boş olamaz.' })
  .max(64, { error: 'Kimlik çok uzun.' });

/* ===========================================================================
 * PARA — ADR-014
 *
 * Para alanları GİRDİ olarak `string` alır ve `string` olarak kalır.
 * Neden `number` değil: IEEE-754 çift duyarlık 0.1 + 0.2 = 0.30000000000000004
 * üretir; muhasebede bu kabul edilemez. Prisma `Decimal` alanlara string
 * atanabildiği için dönüşüm kaybı da olmaz.
 * ======================================================================== */

/** `Decimal(12,2)` — en fazla 10 tam basamak + 2 ondalık. */
const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;

/** `Decimal(18,8)` — en fazla 10 tam basamak + 8 ondalık. */
const FX_RATE_PATTERN = /^\d{1,10}(?:\.\d{1,8})?$/;

/**
 * Tutar. Negatif kabul edilmez — yön `TransactionType` (INCOME/EXPENSE) ile
 * belirlenir, eksi işaretiyle değil. İki yerde yön taşımak toplamları bozar.
 */
export const moneySchema = z
  .string()
  .trim()
  .min(1, { error: 'Tutar zorunludur.' })
  .regex(MONEY_PATTERN, {
    error: 'Tutar geçersiz. En fazla 2 ondalık basamak kullanın (örn. 1250.00).',
  });

/** İşlem anındaki kur, TRY bazlı (ADR-014). Sıfır olamaz. */
export const fxRateSchema = z
  .string()
  .trim()
  .min(1, { error: 'Kur zorunludur.' })
  .regex(FX_RATE_PATTERN, {
    error: 'Kur geçersiz. En fazla 8 ondalık basamak kullanın (örn. 34.12345678).',
  })
  .refine((value) => Number(value) > 0, { error: 'Kur sıfırdan büyük olmalıdır.' });

/** Ondalık ölçüm alanları (kilo, uyku saati vb.) — para değil ama aynı hassasiyet kaygısı. */
export function decimalSchema(maxIntegerDigits: number, maxFractionDigits: number) {
  const pattern = new RegExp(`^\\d{1,${maxIntegerDigits}}(?:\\.\\d{1,${maxFractionDigits}})?$`);
  return z
    .string()
    .trim()
    .regex(pattern, {
      error: `Değer geçersiz. En fazla ${maxFractionDigits} ondalık basamak kullanın.`,
    });
}

/* ===========================================================================
 * TARİH — ADR-016
 * ======================================================================== */

/**
 * Gün semantiği taşıyan alanlar (`@db.Date`).
 *
 * `z.iso.date()` SAAT BİLEŞENİ KABUL ETMEZ — `2026-08-05T10:00:00Z` reddedilir.
 * Bu bilinçlidir: saat kabul edilirse Europe/Istanbul (UTC+3) altında 00:00–03:00
 * arasındaki girişler bir önceki güne kayar ve ay sınırındaki toplamlar sessizce
 * bozulur. Doğrulama katmanı bu hata sınıfını en baştan kapatır.
 *
 * String olarak kalır; `Date`'e çevirme T-015'teki zaman dilimi yardımcısının işidir.
 */
export const dayDateSchema = z.iso.date({
  error: 'Tarih YYYY-AA-GG biçiminde olmalıdır (saat bilgisi içeremez).',
});

/** Gerçek bir anı bildiren alanlar (`createdAt`, `paidAt`, `publishedAt` …). */
export const instantSchema = z.iso.datetime({
  error: 'Tarih/saat ISO 8601 biçiminde olmalıdır.',
});

/* ===========================================================================
 * periodKey — ADR-015
 * ======================================================================== */

/**
 * Tekrarlayan işlem üretim dönemi. `@@unique([sourceRecurringId, periodKey])`
 * ile birlikte cron'un çift üretimini veritabanı düzeyinde engeller.
 *
 * Kabul edilen dört biçim:
 *   aylık   YYYY-MM        2026-08
 *   yıllık  YYYY           2026
 *   haftalık YYYY-Www      2026-W32   (ISO hafta, 01–53)
 *   günlük  YYYY-MM-DD     2026-08-05
 */
const PERIOD_KEY_PATTERN =
  /^(?:\d{4}|\d{4}-(?:0[1-9]|1[0-2])|\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])|\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))$/;

export const periodKeySchema = z.string().regex(PERIOD_KEY_PATTERN, {
  error: 'Dönem anahtarı geçersiz. Beklenen biçimler: 2026, 2026-08, 2026-W32, 2026-08-05.',
});

/* ===========================================================================
 * ÖLÇEKLER — ADR-020 (enum değil, sayısal ölçek)
 * ======================================================================== */

/** 1–5 ruh hâli / his ölçeği (`HealthLog.mood`, `Workout.feeling`, `JournalEntry.mood`). */
export const moodSchema = z
  .number()
  .int({ error: 'Değer tam sayı olmalıdır.' })
  .min(1, { error: 'Değer 1 ile 5 arasında olmalıdır.' })
  .max(5, { error: 'Değer 1 ile 5 arasında olmalıdır.' });

/** 1–10 algılanan zorluk (`WorkoutSet.rpe`). */
export const rpeSchema = z
  .number()
  .int({ error: 'RPE tam sayı olmalıdır.' })
  .min(1, { error: 'RPE 1 ile 10 arasında olmalıdır.' })
  .max(10, { error: 'RPE 1 ile 10 arasında olmalıdır.' });

/** 0–100 yüzde (`Skill.level`, `Goal.progress`). */
export const percentSchema = z
  // Tip hatası da Türkçe: boş bırakılan alan `undefined` geliyor ve Zod'un
  // varsayılan İngilizce "expected number" iletisi forma düşüyordu.
  .number({ error: '0 ile 100 arasında bir sayı girin.' })
  .int({ error: 'Değer tam sayı olmalıdır.' })
  .min(0, { error: 'Değer 0 ile 100 arasında olmalıdır.' })
  .max(100, { error: 'Değer 0 ile 100 arasında olmalıdır.' });

/* ===========================================================================
 * ORTAK YARDIMCILAR
 * ======================================================================== */

export const optionalUrlSchema = z
  .url({ error: 'Geçerli bir bağlantı adresi girin (https:// ile başlamalı).' })
  .max(2048, { error: 'Bağlantı adresi çok uzun.' })
  // `javascript:` da geçerli URL'dir; bağlantı olarak basılan alana giremez.
  .refine((v) => /^https?:\/\//i.test(v), {
    error: 'Bağlantı adresi http:// ya da https:// ile başlamalı.',
  });

/**
 * E-posta.
 *
 * SIRA ÖNEMLİ: `trim()` doğrulamadan ÖNCE gelir. `z.email()` ile başlanıp
 * sonra `.transform(trim)` yazılsaydı, kopyala-yapıştırla gelen baştaki/sondaki
 * boşluk doğrulamada reddedilirdi — dönüşüm sıra olarak çok geç çalışıyor.
 * Ölçüldü: `'  a@b.com '` bu sırayla geçiyor, ters sırayla `invalid_format` veriyordu.
 *
 * Küçük harfe indirme de burada yapılır: `Client.email` benzersizdir (ADR-017),
 * `A@b.com` ile `a@b.com` iki ayrı müşteri açmamalıdır.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Geçerli bir e-posta adresi girin.' }))
  .pipe(z.string().max(254, { error: 'E-posta adresi çok uzun.' }));

/** Serbest metin alanları için ortak sınır — sınırsız metin DoS yüzeyidir (§8). */
export const shortTextSchema = z.string().trim().max(255, { error: 'En fazla 255 karakter.' });
export const mediumTextSchema = z.string().trim().max(2000, { error: 'En fazla 2000 karakter.' });
export const longTextSchema = z.string().trim().max(100_000, { error: 'Metin çok uzun.' });

/** Etiket listesi — ADR-019 gereği v1'de scalar. */
export const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, { error: 'Etiket boş olamaz.' })
      .max(32, { error: 'Etiket en fazla 32 karakter olabilir.' }),
  )
  .max(20, { error: 'En fazla 20 etiket ekleyebilirsiniz.' })
  .default([]);

export const orderSchema = z
  .number()
  .int({ error: 'Sıra tam sayı olmalıdır.' })
  .min(0, { error: 'Sıra negatif olamaz.' })
  .default(0);

/* ===========================================================================
 * GÜNCELLEME ŞEMASI YARDIMCISI
 * ======================================================================== */

/**
 * Kısmi güncelleme şeması üretir: tüm alanlar opsiyonel VE varsayılanlar kaldırılmış.
 *
 * NEDEN GEREKLİ — bu bir tuzak:
 * Zod'da `.partial()` alanı yalnızca GİRDİDE opsiyonel yapar; `.default()` ÇIKTIDA
 * çalışmaya devam eder. Yani `base.partial()` ile üretilen bir güncelleme şeması,
 * gönderilmeyen alanlara varsayılan değerleri ENJEKTE eder.
 *
 * Ölçülen somut sonuç (düzeltmeden önce):
 *   updateProjectSchema.parse({ id, title: 'Yeni' })
 *     → { id, title, status: 'DRAFT', featured: false, order: 0, tags: [], stack: [], locale: 'tr' }
 *
 * Bu nesne Prisma `update`'ine verilseydi, YALNIZCA BAŞLIK düzenlemek yayındaki
 * projeyi taslağa düşürür, etiketlerini siler, öne çıkarmasını ve sırasını
 * sıfırlardı. Sessiz veri kaybı — en kötü hata sınıfı.
 *
 * Bu yüzden her `updateXSchema` bu yardımcıdan geçer: `ZodDefault` sarmalayıcısı
 * açılır, yalnızca gerçekten gönderilen alanlar çıktıya girer.
 */
export function partialWithoutDefaults<T extends z.ZodObject>(schema: T) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [
      key,
      field instanceof z.ZodDefault ? field.def.innerType : field,
    ]),
  ) as T['shape'];

  return z.object(shape).partial();
}

/**
 * Yalnızca kimlik taşıyan eylemler (arşivle / sil) — T-031.
 *
 * §8.8 "her girdi Zod ile doğrulanır — Server Action parametreleri dahil".
 * `id`yi doğrulamadan servise geçirmek küçük bir adım gibi görünüyor ama
 * doğrulanmamış bir parametreyi kabul eden İLK eylem, kuralın istisnası olur.
 */
export const entityIdSchema = z.object({ id: cuidSchema });

export type EntityIdInput = z.infer<typeof entityIdSchema>;

/* ===========================================================================
 * SUNUCUDA YORUMLANAN ALANLAR — T-031 konvansiyonu
 * ======================================================================== */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PUBLIC FORM YAZACAK KİŞİYE TEK CÜMLE:
 * İstemci formunun `resolver`ına `createXSchema`'yı DEĞİL, `toFormSchema(...)`
 * ile türetilmiş şemayı verin.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * NEDEN — ÖLÇÜLEN KUSUR (T-026b, Frontend buldu):
 *
 * `createContactMessageSchema.website` honeypot alanıydı ve `.max(0)` taşıyordu.
 * Aynı şema `zodResolver` ile istemcide koşunca dolu honeypot BİR DOĞRULAMA
 * HATASI oldu ve `handleSubmit` hiç tetiklenmedi. Sonuçlar zincirleme:
 *
 *   - Honeypot'lu gönderim sunucuya HİÇ ULAŞMADI → bot kazandı.
 *   - Spam sinyali kaydedilmedi → ADR-020/C11'in "spam silinmez, ayrılır"
 *     kuralı fiilen delindi.
 *   - Yanlış pozitifte (tarayıcı otomatik doldurması) GERÇEK kullanıcı
 *     "Gönder"e bastı ve hiçbir şey olmadı — hatanın kendisinde olduğunu sandı.
 *
 * Frontend bunu kendi dosyasında `createContactMessageSchema.extend({ website:
 * z.string().optional() })` ile aştı. Yama doğruydu ama BİLGİ TEK BİR FORMUN
 * İÇİNDE KALDI: bir sonraki form aynı tuzağa düşerdi ve tuzak SESSİZ.
 *
 * ÇÖZÜM — işaret + türetme + kapı:
 *
 *  1. Kuralı SUNUCU yorumlayan alan `serverInterpreted()` ile İŞARETLENİR.
 *     İşaret alanın kendisinde durur, uzaktaki bir listede değil.
 *  2. `toFormSchema()` işaretli alanları ÇIKARIR. İstemci formu bunu kullanır.
 *  3. `tests/unit/schemas/server-interpreted.test.ts` iki şeyi ZORLAR: işaretli
 *     alan form şemasında bulunmayacak, VE form şeması o alanların düşmanca
 *     değerleriyle BAŞARIYLA parse edecek. İkinci assert kusurun kendisini
 *     yeniden üretir: `.max(0)` geri gelirse test kırılır.
 *
 * Yanlış yapmak için ÇABA gerekiyor: işareti koymayı unutan bir alan zaten
 * istemcide kural koşturur (eski davranış, ama artık kasıtlı bir tercih);
 * işareti koyup `createXSchema`'yı istemciye verirse kapı testi kırılır.
 */

/** `.meta()` anahtarı — tek yerde, elle dize yazılmaz. */
const SERVER_INTERPRETED_KEY = 'serverInterpreted';

/**
 * TİP DÜZEYİ işaret.
 *
 * İşaret İKİ KATMANDA birden duruyor: çalışma zamanında `.meta()`, tip
 * düzeyinde bu marka. İkisi de TEK çağrıdan (`serverInterpreted`) doğduğu için
 * birbirinden sapamaz — ve marka olmadan `toFormSchema`'nın dönüş tipi
 * hesaplanamaz, `z.ZodObject`'e düşerdi. O zaman da `parsed.data` `Record<
 * string, unknown>` olur ve çağıran taraf her alanı elle daraltmak zorunda
 * kalırdı; yani konvansiyon tip güvenliğini BOZARAK gelirdi.
 *
 * Özellik ZORUNLU (`?` yok) ve bu kasıtlı: opsiyonel olsaydı işaretsiz her şema
 * da yapısal olarak markaya uyar ve ayırt etme çalışmazdı. Çalışma zamanında
 * böyle bir özellik YOKTUR — yalnızca tip düzeyinde yaşar.
 */
declare const SERVER_INTERPRETED_BRAND: unique symbol;

export type ServerInterpreted<T extends z.ZodType> = T & {
  readonly [SERVER_INTERPRETED_BRAND]: true;
};

/** Şekildeki işaretli alan adları — tip düzeyinde. */
type ServerInterpretedKeys<Shape> = {
  [K in keyof Shape]-?: Shape[K] extends { readonly [SERVER_INTERPRETED_BRAND]: true } ? K : never;
}[keyof Shape];

/**
 * Alanı "kuralını SUNUCU koyar" diye işaretler.
 *
 * ŞEMANIN KENDİSİ BU ALANDA KURAL KOŞMAMALI. Honeypot'ta olduğu gibi, kural
 * genellikle "reddet" değil "işaretle ve kabul et"tir (ADR-020/C11) — ve bunu
 * Zod ifade edemez, çünkü Zod'un elindeki tek sonuç reddetmektir.
 *
 * `reason` zorunlu: işaretin NEDEN konduğu, işaretin yanında dursun.
 */
export function serverInterpreted<T extends z.ZodType>(
  schema: T,
  reason: string,
): ServerInterpreted<T> {
  return schema.meta({ [SERVER_INTERPRETED_KEY]: reason }) as ServerInterpreted<T>;
}

/** Şemadaki `serverInterpreted` işaretli alan adları — çalışma zamanı. */
export function serverInterpretedFields(schema: z.ZodObject): string[] {
  return Object.entries(schema.shape)
    .filter(([, field]) => typeof field.meta()?.[SERVER_INTERPRETED_KEY] === 'string')
    .map(([key]) => key);
}

/** İşaretin gerekçesi — kapı testi bunun boş olmadığını doğruluyor. */
export function serverInterpretedReason(schema: z.ZodObject, field: string): string | undefined {
  const meta = schema.shape[field]?.meta()?.[SERVER_INTERPRETED_KEY];
  return typeof meta === 'string' ? meta : undefined;
}

/**
 * İSTEMCİ FORMUNUN KULLANACAĞI şema — işaretli alanlar çıkarılmış.
 *
 * `omit` seçildi, "alanı serbest bırak" değil: alan form şemasında HİÇ
 * OLMAYINCA, `zodResolver` onun için ne kural koşar ne de değerini kırpar;
 * `register('website')` ile forma bağlanmaya ve gövdede sunucuya gitmeye devam
 * eder (react-hook-form alanları şemadan değil `register`dan tanır).
 *
 * SUNUCU DA BUNU KULLANIR. İki taraf aynı şemayı koşar; fark yalnızca işaretli
 * alanların AYRICA sunucuda yorumlanmasıdır. "İstemci şeması / sunucu şeması"
 * diye iki ayrı nesne olsaydı, ikisi zamanla sapardı.
 */
export function toFormSchema<T extends z.ZodObject>(
  schema: T,
): z.ZodObject<Omit<T['shape'], ServerInterpretedKeys<T['shape']>>> {
  const gizli = serverInterpretedFields(schema);

  // İşaretsiz şema OLDUĞU GİBİ döner — gereksiz bir kopya, `zodResolver`ın
  // referans kimliğine güvenen çağıranlarda sessiz yeniden render üretirdi.
  if (gizli.length === 0) {
    return schema as z.ZodObject<Omit<T['shape'], ServerInterpretedKeys<T['shape']>>>;
  }

  const mask = Object.fromEntries(gizli.map((key) => [key, true as const]));

  return schema.omit(mask as never) as z.ZodObject<
    Omit<T['shape'], ServerInterpretedKeys<T['shape']>>
  >;
}

/* ===========================================================================
 * FİLTRE TABANI
 *
 * Filtreler URL arama parametrelerinden gelir; değerler DAİMA string'tir.
 * Bu yüzden sayısal alanlarda `z.coerce` kullanılır.
 * ======================================================================== */

/**
 * URL parametresinden gelen boole filtresi — T-038'de ÖLÇÜLEN KUSURUN düzeltmesi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `z.coerce.boolean()` FİLTRELERDE KULLANILAMAZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `z.coerce.boolean()` JavaScript'in `Boolean(value)` çağrısıdır ve BOŞ OLMAYAN
 * HER DİZE `true`dur. Ölçüldü (zod 4.4.3):
 *
 *   "false" → true      "0" → true      "true" → true      "" → false
 *
 * Yani `?isRead=false` "okunmamışları getir" demek isterken TAM TERSİNİ yapıyor
 * ve hiçbir hata vermiyor. Bu blok başındaki not "değerler DAİMA string'tir"
 * diyor — yani kusur tam olarak bu şemaların tasarlandığı kullanım biçiminde
 * ortaya çıkıyor.
 *
 * Sessiz olduğu için en kötü sınıftan: filtre çalışıyor GÖRÜNÜR, yalnızca
 * yanlış kümeyi döndürür.
 *
 * BURADA: yalnızca tanınan dizeler kabul edilir, tanınmayan HATA verir. Sessizce
 * `true`ya düşmek yerine gürültülü başarısızlık — yazım hatası fark edilsin.
 * Gerçek `boolean` de kabul edilir (Server Action'lar JSON gönderir, URL değil).
 */
export const booleanFilterSchema = z.union([
  z.boolean(),
  z
    .enum(['true', 'false', '1', '0'], { error: 'Değer true veya false olmalıdır.' })
    .transform((value) => value === 'true' || value === '1'),
]);

export const sortDirectionSchema = z.enum(['asc', 'desc']).default('desc');

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, { error: 'Sayfa numarası 1 veya daha büyük olmalıdır.' })
    .default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1, { error: 'Sayfa boyutu en az 1 olmalıdır.' })
    .max(100, { error: 'Sayfa boyutu en fazla 100 olabilir.' })
    .default(20),
});

/** Serbest metin arama — her filtre şemasında ortak. */
export const searchSchema = z.string().trim().max(120, { error: 'Arama terimi çok uzun.' });

/** Gün aralığı filtresi. Bitiş, başlangıçtan önce olamaz. */
export const dateRangeSchema = z
  .object({
    from: dayDateSchema.optional(),
    to: dayDateSchema.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    error: 'Bitiş tarihi, başlangıç tarihinden önce olamaz.',
    path: ['to'],
  });

export type Pagination = z.infer<typeof paginationSchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
