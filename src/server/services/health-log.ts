import type {
  CreateHealthLogInput,
  HealthLogFilterInput,
  UpdateHealthLogInput,
} from '@/lib/schemas';
import { TARTI_ALANLARI } from '@/lib/schemas/health-log';
import { db } from '@/server/db';

import {
  appDayToDate,
  dateToAppDay,
  panelSkipTake,
  toMeasureString,
  toPagedResult,
  type DecimalLike,
} from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `HealthLog` servisi — §4.2 `/panel/saglik`, ADR-016, T-110.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TARİH YARDIMCISI: `date` BİR `@db.Date` → `appDayToDate`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kuralı T-102'de koydum ve burada da geçerli: HANGİ YARDIMCININ KULLANILACAĞINI
 * SÜTUNUN TİPİ BELİRLER. `HealthLog.date` `@db.Date`, yani saat saklamıyor ve
 * UTC gece yarısı sınırı TAM DOĞRU. `appDayStartInstant` kullanmak günü bir
 * geri kaydırırdı (T-102'de ölçüldü: 28 Şubat marta sayılıyor, 31 Mart düşüyor).
 *
 * `createdAt`/`updatedAt` ise `timestamp` ve gün dönüşümünden GEÇMİYOR —
 * doğrudan ISO dizesine çevriliyor. Aynı dosyada iki sütun ailesi var ve ayrımı
 * tip belirliyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ GÜNDE TEK KAYIT — `date @unique`, VE BU BİR TASARIM KARARI
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Şema `date`i `@unique` yapıyor ve yorumu sebebini söylüyor: *"`DateTime`
 * olsaydı bu unique gece 00:00–03:00 arasında beklenmedik davranırdı."* Yani
 * tekillik GÜNE bağlı, ana değil.
 *
 * Sonuç: aynı güne ikinci kayıt P2002 veriyor. `createHealthLog` bunu CONFLICT
 * olarak çeviriyor ve MEVCUT KAYDIN KİMLİĞİNİ dönüyor — arayüz "o günü
 * düzenle"ye geçebilsin (T-038'in çift dönüşüm kalıbı: hata mesajı
 * kullanıcının NE YAPACAĞINI söylemeli).
 *
 * ⚠️ `upsert` KULLANILMADI ve bu bilinçli: "yeni kayıt" ile "var olanı ez" iki
 * farklı niyet. Sessizce üzerine yazmak, dün girilen bir ölçümü bugün formu
 * yanlış tarihle gönderen birinin kaybetmesine yol açardı — geri alınamaz.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — T-110'da TARANDI
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Sağlık verisi public tarafta HİÇ görünmüyor: `ContentEntity` birleşiminde
 * yok, hiçbir `cachedRead` okumuyor, `getSiteStats` toplamıyor,
 * `src/app/(public)/**`ta geçmiyor. Yani düşürülecek etiket TANIMLI DEĞİL.
 * Önbellek gerekçesi de T-038/T-040/T-052 ile aynı.
 */

/* ===========================================================================
 * DTO — ADR-014/D: ÖLÇÜ ALANLARI DA `string`
 * ======================================================================== */

/**
 * Günlük sağlık kaydı.
 *
 * ⚠️ ÜÇ ONDALIK ALAN `string` — ADR-014/D para için yazılmıştı ama GEREKÇESİ
 * tipe değil SINIRA ait: Prisma `Decimal` bir `Decimal.js` nesnesi ve Server →
 * Client sınırında serialize EDİLEMEZ (R4). Kilo da para gibi `Decimal`.
 *
 * ÖLÇEK ALAN BAŞINA FARKLI, bu yüzden `toMeasureString` açık `scale` istiyor
 * (`toMoneyString` gibi sabit 2 değil):
 *   `weightKg`   `Decimal(5,2)` → 2 ondalık
 *   `bodyFatPct` `Decimal(4,1)` → 1 ondalık
 *   `sleepHours` `Decimal(4,2)` → 2 ondalık
 *
 * Yanlış ölçek SESSİZCE yanlış gösterirdi: `bodyFatPct`i 2 ondalıkla yazmak
 * `18.5`i `18.50` yapar — zararsız görünür ama sütunun taşıdığı hassasiyeti
 * YANLIŞ BİLDİRİR ve trend grafiğinde sahte bir kesinlik üretir.
 */
export interface HealthLogDto {
  id: string;
  /** Gün (`YYYY-MM-DD`) — `@db.Date`. */
  date: string;
  weightKg: string | null;
  bodyFatPct: string | null;
  sleepHours: string | null;
  waterMl: number | null;
  restingHr: number | null;
  steps: number | null;
  /** 1–5 ölçek (ADR-020: kategori değil, enum yapılmadı). */
  mood: number | null;
  note: string | null;
  bmi: string | null;
  waterPct: string | null;
  muscleKg: string | null;
  boneKg: string | null;
  proteinPct: string | null;
  visceralFat: string | null;
  subcutaneousFatPct: string | null;
  skeletalMusclePct: string | null;
  bmrKcal: number | null;
  metabolicAge: number | null;
  createdAt: string;
  updatedAt: string;
}

const HEALTH_SELECT = {
  id: true,
  date: true,
  weightKg: true,
  bodyFatPct: true,
  sleepHours: true,
  waterMl: true,
  restingHr: true,
  steps: true,
  mood: true,
  note: true,
  bmi: true,
  waterPct: true,
  muscleKg: true,
  boneKg: true,
  proteinPct: true,
  visceralFat: true,
  subcutaneousFatPct: true,
  skeletalMusclePct: true,
  bmrKcal: true,
  metabolicAge: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface HealthLogRow {
  id: string;
  date: Date;
  weightKg: DecimalLike | null;
  bodyFatPct: DecimalLike | null;
  sleepHours: DecimalLike | null;
  waterMl: number | null;
  restingHr: number | null;
  steps: number | null;
  mood: number | null;
  note: string | null;
  bmi: DecimalLike | null;
  waterPct: DecimalLike | null;
  muscleKg: DecimalLike | null;
  boneKg: DecimalLike | null;
  proteinPct: DecimalLike | null;
  visceralFat: DecimalLike | null;
  subcutaneousFatPct: DecimalLike | null;
  skeletalMusclePct: DecimalLike | null;
  bmrKcal: number | null;
  metabolicAge: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthLogClient {
  healthLog: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof HEALTH_SELECT;
      orderBy: { date: 'desc' | 'asc' }[];
      skip?: number;
      take?: number;
    }): Promise<HealthLogRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: typeof HEALTH_SELECT;
    }): Promise<HealthLogRow | null>;
    findFirst(args: {
      where: { date: Date };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        date: Date;
        weightKg: string | null;
        bodyFatPct: string | null;
        sleepHours: string | null;
        waterMl: number | null;
        restingHr: number | null;
        steps: number | null;
        mood: number | null;
        note: string | null;
        bmi: string | null;
        waterPct: string | null;
        muscleKg: string | null;
        boneKg: string | null;
        proteinPct: string | null;
        visceralFat: string | null;
        subcutaneousFatPct: string | null;
        skeletalMusclePct: string | null;
        bmrKcal: number | null;
        metabolicAge: number | null;
      };
      select: typeof HEALTH_SELECT;
    }): Promise<HealthLogRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof HEALTH_SELECT;
    }): Promise<HealthLogRow>;
    delete(args: { where: { id: string } }): Promise<HealthLogRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. Çalışma zamanı etkisi yok. */
const _uyumKontrolu: HealthLogClient = db;
void _uyumKontrolu;

/** ADR-014/D'nin UYGULANDIĞI TEK YER — üç ondalık alan da kendi ölçeğiyle. */
function toDto(row: HealthLogRow): HealthLogDto {
  return {
    id: row.id,
    date: dateToAppDay(row.date),
    weightKg: toMeasureString(row.weightKg, 2),
    bodyFatPct: toMeasureString(row.bodyFatPct, 1),
    sleepHours: toMeasureString(row.sleepHours, 2),
    waterMl: row.waterMl,
    restingHr: row.restingHr,
    steps: row.steps,
    mood: row.mood,
    note: row.note,
    bmi: toMeasureString(row.bmi, 1),
    waterPct: toMeasureString(row.waterPct, 1),
    muscleKg: toMeasureString(row.muscleKg, 2),
    boneKg: toMeasureString(row.boneKg, 2),
    proteinPct: toMeasureString(row.proteinPct, 1),
    visceralFat: toMeasureString(row.visceralFat, 1),
    subcutaneousFatPct: toMeasureString(row.subcutaneousFatPct, 1),
    skeletalMusclePct: toMeasureString(row.skeletalMusclePct, 1),
    bmrKcal: row.bmrKcal,
    metabolicAge: row.metabolicAge,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

/**
 * Filtreyi `where`e çevirir — SAF.
 *
 * `date` bir `@db.Date` olduğu için gün aralığı `appDayToDate` ile kuruluyor.
 * `appDayRangeToInstantFilter` BURADA KULLANILMAZ — o `timestamp` sütunlar için
 * (T-052'nin `AuditLog.createdAt`i) ve burada günü bir geri kaydırırdı.
 */
export function buildHealthLogWhere(filter: HealthLogFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.from || filter.to) {
    where.date = {
      ...(filter.from ? { gte: appDayToDate(filter.from) } : {}),
      ...(filter.to ? { lte: appDayToDate(filter.to) } : {}),
    };
  }

  return where;
}

/**
 * Kayıt listesi — EN YENİ GÜN ÖNCE, sayfalı.
 *
 * İkincil sıralama anahtarı GEREKMİYOR: `date @unique`, yani aynı güne iki
 * kayıt düşemiyor ve sıra belirsiz kalamıyor. (`Transaction`da gerekmişti
 * çünkü orada aynı güne birden çok hareket düşebiliyor.)
 */
export async function fetchHealthLogs(
  filter: HealthLogFilterInput,
  client: HealthLogClient = db,
): Promise<PagedResult<HealthLogDto>> {
  const where = buildHealthLogWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.healthLog.findMany({
      where,
      select: HEALTH_SELECT,
      orderBy: [{ date: 'desc' }],
      skip,
      take,
    }),
    client.healthLog.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toDto);
}

export async function fetchHealthLogById(
  id: string,
  client: HealthLogClient = db,
): Promise<HealthLogDto | null> {
  const row = await client.healthLog.findUnique({ where: { id }, select: HEALTH_SELECT });
  return row ? toDto(row) : null;
}

/**
 * TREND SERİSİ — §4.2'nin "trend grafikleri" için, KRONOLOJİK ve sayfalama YOK.
 *
 * ⚠️ LİSTEDEN AYRI BİR OKUMA ve sebebi `fetchJobBoard`ın sebebiyle aynı sınıf:
 * iki yüzeyin sorusu farklı. Liste "en son ne girdim" diye soruyor (`desc`,
 * sayfalı); grafik "zaman içinde nasıl değişti" diye soruyor ve bunun için
 * ARTAN sıra ve aralığın TAMAMI gerekiyor — sayfalanmış bir grafik yanlış
 * çizer.
 *
 * ÜST SINIR VAR: `TREND_MAX_DAYS`. Grafik için sınırsız veri çekmek, beş yıllık
 * bir kaydı tek istekte taşımak demekti (T-100'ün kanban kararının aynı kalıbı:
 * üst sınır + çağıranın bildiği bir aralık).
 */
export const TREND_MAX_DAYS = 400;

export async function fetchHealthTrend(
  range: { from: string; to: string },
  client: HealthLogClient = db,
): Promise<HealthLogDto[]> {
  const rows = await client.healthLog.findMany({
    where: {
      date: { gte: appDayToDate(range.from), lte: appDayToDate(range.to) },
    },
    select: HEALTH_SELECT,
    orderBy: [{ date: 'asc' }],
    take: TREND_MAX_DAYS,
  });

  return rows.map(toDto);
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

/** Boş dize `null` olur — "girilmedi" ile "boş girildi" aynı şey. */
function bosaNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

/** O güne ait kayıt var mı — CONFLICT mesajına kimlik koymak için. */
export async function findHealthLogIdByDay(
  day: string,
  client: HealthLogClient = db,
): Promise<string | null> {
  const row = await client.healthLog.findFirst({
    where: { date: appDayToDate(day) },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function createHealthLog(
  input: CreateHealthLogInput,
  client: HealthLogClient = db,
): Promise<HealthLogDto> {
  const row = await client.healthLog.create({
    data: {
      date: appDayToDate(input.date),
      weightKg: input.weightKg ?? null,
      bodyFatPct: input.bodyFatPct ?? null,
      sleepHours: input.sleepHours ?? null,
      waterMl: input.waterMl ?? null,
      restingHr: input.restingHr ?? null,
      steps: input.steps ?? null,
      mood: input.mood ?? null,
      note: bosaNull(input.note),
      bmi: input.bmi ?? null,
      waterPct: input.waterPct ?? null,
      muscleKg: input.muscleKg ?? null,
      boneKg: input.boneKg ?? null,
      proteinPct: input.proteinPct ?? null,
      visceralFat: input.visceralFat ?? null,
      subcutaneousFatPct: input.subcutaneousFatPct ?? null,
      skeletalMusclePct: input.skeletalMusclePct ?? null,
      bmrKcal: input.bmrKcal ?? null,
      metabolicAge: input.metabolicAge ?? null,
    },
    select: HEALTH_SELECT,
  });

  return toDto(row);
}

/**
 * Kaydı günceller — KISMİ (T-031'in `undefined` ≠ `null` kuralı).
 *
 * ⚠️ `date` DE GÜNCELLENEBİLİR ve bu bir risk taşıyor: yeni gün başka bir kayda
 * aitse `date @unique` ihlal olur. P2002 yakalanıyor ve eylem CONFLICT'e
 * çeviriyor — sessizce başarısız olmuyor.
 */
/** Tartı alanlarından yalnızca VERİLENLER (`null` = boşalt, `undefined` = dokunma). */
function tartiGuncellemesi(fields: Partial<UpdateHealthLogInput>): Record<string, unknown> {
  return Object.fromEntries(
    TARTI_ALANLARI.flatMap((k) => (fields[k] !== undefined ? [[k, fields[k]]] : [])),
  );
}

export async function updateHealthLog(
  input: UpdateHealthLogInput,
  client: HealthLogClient = db,
): Promise<HealthLogDto> {
  const { id, ...fields } = input;

  const row = await client.healthLog.update({
    where: { id },
    data: {
      ...(fields.date !== undefined ? { date: appDayToDate(fields.date) } : {}),
      ...(fields.weightKg !== undefined ? { weightKg: fields.weightKg } : {}),
      ...(fields.bodyFatPct !== undefined ? { bodyFatPct: fields.bodyFatPct } : {}),
      ...(fields.sleepHours !== undefined ? { sleepHours: fields.sleepHours } : {}),
      ...(fields.waterMl !== undefined ? { waterMl: fields.waterMl } : {}),
      ...(fields.restingHr !== undefined ? { restingHr: fields.restingHr } : {}),
      ...(fields.steps !== undefined ? { steps: fields.steps } : {}),
      ...(fields.mood !== undefined ? { mood: fields.mood } : {}),
      ...(fields.note !== undefined ? { note: bosaNull(fields.note) } : {}),
      ...tartiGuncellemesi(fields),
    },
    select: HEALTH_SELECT,
  });

  return toDto(row);
}

/**
 * Kaydı SİLER — ve bu, içerik varlıklarından bilinçli bir sapma.
 *
 * ADR-017 referans verilerde `isArchived` istiyor; `HealthLog` referans veri
 * DEĞİL, bir ÖLÇÜM. Yanlış girilen bir kilo ölçümünü arşivlemek ne demek
 * olurdu? Trend grafiği onu göstermeye devam etsin mi? Ölçüm ya doğrudur ya
 * yanlıştır; yanlış olan SİLİNİR.
 *
 * Şemada da bunu destekleyen bir şey var: `HealthLog`a bağlı FK YOK, yani
 * silmenin kırabileceği bir referans yok (T-038'in ölçütü: FK bağımlısı varsa
 * arşiv, yoksa gerçek silme).
 */
export async function deleteHealthLog(
  id: string,
  client: HealthLogClient = db,
): Promise<HealthLogDto> {
  const row = await client.healthLog.delete({ where: { id } });
  return toDto(row);
}

/* ===========================================================================
 * HEDEF KİLO (2026-10-31)
 * ======================================================================== */

export interface SaglikHedefiDto {
  hedefKg: string;
  baslangicKg: string | null;
  sonKg: string | null;
  /** Hedefe kalan (mutlak, 1 ondalık); son ölçüm yoksa `null`. */
  kalanKg: string | null;
  /** Başlangıçtan hedefe yolun yüzde kaçı yüründü (0–100); hesaplanamıyorsa `null`. */
  yuzde: number | null;
}

/** İlerleme — kilo vermek de almak da desteklenir. SAF. */
export function hedefIlerlemesi(
  baslangic: number | null,
  son: number | null,
  hedef: number,
): { kalan: number | null; yuzde: number | null } {
  if (son === null) return { kalan: null, yuzde: null };
  const kalan = Math.abs(son - hedef);
  if (baslangic === null || baslangic === hedef) return { kalan, yuzde: kalan === 0 ? 100 : null };
  const yol = (baslangic - son) / (baslangic - hedef);
  return { kalan, yuzde: Math.round(Math.min(1, Math.max(0, yol)) * 100) };
}

async function sonKilo(client: Pick<typeof db, 'healthLog'>): Promise<string | null> {
  const satir = await client.healthLog.findFirst({
    where: { weightKg: { not: null } },
    orderBy: { date: 'desc' },
    select: { weightKg: true },
  });
  return toMeasureString(satir?.weightKg ?? null, 2);
}

export async function fetchSaglikHedefi(
  userId: string,
  client: Pick<typeof db, 'healthLog' | 'saglikHedefi'> = db,
): Promise<SaglikHedefiDto | null> {
  const [hedef, son] = await Promise.all([
    client.saglikHedefi.findUnique({ where: { userId } }),
    sonKilo(client),
  ]);
  if (!hedef) return null;
  const hedefKg = toMeasureString(hedef.hedefKg, 2) ?? '0';
  const baslangicKg = toMeasureString(hedef.baslangicKg, 2);
  const { kalan, yuzde } = hedefIlerlemesi(
    baslangicKg === null ? null : Number(baslangicKg),
    son === null ? null : Number(son),
    Number(hedefKg),
  );
  return {
    hedefKg,
    baslangicKg,
    sonKg: son,
    kalanKg: kalan === null ? null : kalan.toFixed(1),
    yuzde,
  };
}

/** Hedefi koyar; başlangıç = o anki SON ölçüm (yeni hedef, yeni yol). */
export async function saglikHedefiKoy(
  userId: string,
  hedefKg: string,
  client: Pick<typeof db, 'healthLog' | 'saglikHedefi'> = db,
): Promise<void> {
  const baslangicKg = await sonKilo(client);
  await client.saglikHedefi.upsert({
    where: { userId },
    create: { userId, hedefKg, baslangicKg },
    update: { hedefKg, baslangicKg },
  });
}

/* ===========================================================================
 * HIZLI EKLEME (2026-10-30) — panelin "+" düğmesi
 * ======================================================================== */

/** Su tavanı — şemadaki `waterMl` sınırıyla aynı. */
const SU_TAVANI_ML = 20_000;

/**
 * Günün kaydına KİLO yazar ya da SU EKLER; kayıt yoksa açar. Diğer alanlara
 * dokunmaz. `date @unique` olduğu için gün başına tek satır kalır.
 */
export async function gununKaydinaEkle(
  gun: string,
  ek: {
    weightKg?: string;
    suMl?: number;
    steps?: number;
    sleepHours?: string;
    restingHr?: number;
  },
  client: Pick<typeof db, 'healthLog'> = db,
): Promise<{ id: string; weightKg: string | null; waterMl: number | null }> {
  const date = appDayToDate(gun);
  const mevcut = await client.healthLog.findUnique({
    where: { date },
    select: { id: true, waterMl: true },
  });
  const su =
    ek.suMl === undefined
      ? undefined
      : Math.max(0, Math.min(SU_TAVANI_ML, (mevcut?.waterMl ?? 0) + ek.suMl));
  const data = {
    ...(ek.weightKg !== undefined ? { weightKg: ek.weightKg } : {}),
    ...(su !== undefined ? { waterMl: su } : {}),
    ...(ek.steps !== undefined ? { steps: ek.steps } : {}),
    ...(ek.sleepHours !== undefined ? { sleepHours: ek.sleepHours } : {}),
    ...(ek.restingHr !== undefined ? { restingHr: ek.restingHr } : {}),
  };

  const satir = mevcut
    ? await client.healthLog.update({
        where: { id: mevcut.id },
        data,
        select: { id: true, weightKg: true, waterMl: true },
      })
    : await client.healthLog.create({
        data: { date, ...data },
        select: { id: true, weightKg: true, waterMl: true },
      });
  return {
    id: satir.id,
    weightKg: toMeasureString(satir.weightKg, 2),
    waterMl: satir.waterMl,
  };
}

/** En son tartı; yoksa `null`. */
export async function sonTarti(
  client: Pick<typeof db, 'healthLog'> = db,
): Promise<{ kg: string; gun: string } | null> {
  const satir = await client.healthLog.findFirst({
    where: { weightKg: { not: null } },
    orderBy: { date: 'desc' },
    select: { date: true, weightKg: true },
  });
  const kg = satir && toMeasureString(satir.weightKg, 2);
  return satir && kg ? { kg, gun: dateToAppDay(satir.date) } : null;
}
