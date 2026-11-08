import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createHealthLogSchema, healthLogFilterSchema, updateHealthLogSchema } from '@/lib/schemas';
import {
  TREND_MAX_DAYS,
  buildHealthLogWhere,
  createHealthLog,
  deleteHealthLog,
  fetchHealthLogById,
  fetchHealthLogs,
  fetchHealthTrend,
  findHealthLogIdByDay,
  updateHealthLog,
  type HealthLogClient,
} from '@/server/services/health-log';

import { decimal, decimalKalanlar, dedektorCalisiyor } from '../_helpers/decimal-kacak';

/**
 * `HealthLog` SERVİSİ — §4.2, ADR-016, T-110.
 *
 * ⚠️ EN ÖNEMLİ İKİ BLOK:
 *   1. "ÖLÇEK ALAN BAŞINA" — üç ondalık alanın üçü farklı `Decimal(p,s)`
 *      taşıyor; tek bir ölçek varsaymak sahte kesinlik üretirdi.
 *   2. "TARİH YARDIMCISI" — `date` bir `@db.Date`, yani `appDayToDate`.
 *      `appDayStartInstant` günü bir geri kaydırırdı (T-102 ölçümü).
 */

const KOK = resolve(__dirname, '../../..');

const gun = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

function satir(ek: Record<string, unknown> = {}) {
  return {
    id: 'hl_1',
    date: gun('2026-10-14'),
    weightKg: decimal('82.5'),
    bodyFatPct: decimal('18.5'),
    sleepHours: decimal('7.25'),
    waterMl: 2500,
    restingHr: 58,
    steps: 9000,
    mood: 4,
    note: 'İyi uyudum',
    createdAt: new Date('2026-10-14T06:00:00.000Z'),
    updatedAt: new Date('2026-10-14T06:30:00.000Z'),
    ...ek,
  };
}

function istemci(satirlar: unknown[] = [satir()]) {
  const findMany = vi.fn().mockResolvedValue(satirlar);
  const count = vi.fn().mockResolvedValue(satirlar.length);
  const findUnique = vi.fn().mockResolvedValue(satir());
  const findFirst = vi.fn().mockResolvedValue(null);
  const create = vi.fn().mockResolvedValue(satir());
  const update = vi.fn().mockResolvedValue(satir());
  const del = vi.fn().mockResolvedValue(satir());

  const client = {
    healthLog: { findMany, count, findUnique, findFirst, create, update, delete: del },
  } as unknown as HealthLogClient;

  return { client, findMany, count, findUnique, findFirst, create, update, del };
}

/* ===========================================================================
 * ⚠️⚠️ ADR-014/D — ÖLÇEK ALAN BAŞINA
 * ======================================================================== */

describe('⚠️ ondalık alanlar — ölçek ALAN BAŞINA', () => {
  it('dedektör ÇALIŞIYOR — vakum değil', () => {
    expect(dedektorCalisiyor()).toEqual([['a.b'], []]);
  });

  it('üç alan KENDİ ölçeğiyle dizeye çevriliyor', async () => {
    /*
     * `weightKg` `Decimal(5,2)` → 2 ondalık · `bodyFatPct` `Decimal(4,1)` → 1
     * ondalık · `sleepHours` `Decimal(4,2)` → 2 ondalık.
     *
     * Tek ölçek varsaymak sessizce YANLIŞ GÖSTERİRDİ: `bodyFatPct`i 2 ondalıkla
     * yazmak `18.5`i `18.50` yapar — zararsız görünür ama sütunun taşıdığı
     * hassasiyeti yanlış bildirir ve trend grafiğinde sahte bir kesinlik üretir.
     */
    const { client } = istemci();
    const item = (await fetchHealthLogs(healthLogFilterSchema.parse({}), client)).items[0];

    expect(item?.weightKg).toBe('82.50');
    expect(item?.bodyFatPct).toBe('18.5');
    expect(item?.sleepHours).toBe('7.25');
  });

  it('BEŞ okuma/yazma yüzeyinde de `Decimal` kaçağı YOK', async () => {
    /*
     * Güvenlik'in `decimal-yuzey-sayimi` kapısı beş yüzeyi istedi (dördüncü kez
     * ötüyor: T-102, T-106, T-109b, şimdi bu). `HealthLog` üç `Decimal` sütun
     * taşıyor, yani hepsi gerçek birer yüzey.
     */
    const { client } = istemci();
    const filtre = healthLogFilterSchema.parse({});
    const girdi = createHealthLogSchema.parse({ date: '2026-10-14', weightKg: '82.5' });

    expect(decimalKalanlar(await fetchHealthLogs(filtre, client))).toEqual([]);
    expect(decimalKalanlar(await fetchHealthLogById('hl_1', client))).toEqual([]);
    expect(
      decimalKalanlar(await fetchHealthTrend({ from: '2026-01-01', to: '2026-12-31' }, client)),
    ).toEqual([]);
    expect(decimalKalanlar(await createHealthLog(girdi, client))).toEqual([]);
    expect(
      decimalKalanlar(await updateHealthLog(updateHealthLogSchema.parse({ id: 'hl_1' }), client)),
    ).toEqual([]);
  });

  it('`null` ölçüm `null` kalıyor — `"0"` değil', async () => {
    // Girilmemiş bir ölçümü sıfır saymak trend grafiğini bozardı.
    const { client } = istemci([
      satir({ weightKg: null, bodyFatPct: null, sleepHours: null, waterMl: null }),
    ]);
    const item = (await fetchHealthLogs(healthLogFilterSchema.parse({}), client)).items[0];

    expect(item?.weightKg).toBeNull();
    expect(item?.bodyFatPct).toBeNull();
    expect(item?.sleepHours).toBeNull();
    expect(item?.waterMl).toBeNull();
  });

  it('`date` gün dizesi, `createdAt`/`updatedAt` ISO', async () => {
    const { client } = istemci();
    const item = (await fetchHealthLogs(healthLogFilterSchema.parse({}), client)).items[0];

    expect(item?.date).toBe('2026-10-14');
    expect(item?.createdAt).toBe('2026-10-14T06:00:00.000Z');
  });
});

/* ===========================================================================
 * ⚠️ TARİH YARDIMCISI — sütun tipi belirliyor
 * ======================================================================== */

describe('⚠️ tarih sınırı — `@db.Date` → `appDayToDate`', () => {
  it('gün aralığı UTC gece yarısı — İstanbul kaydırması YOK', () => {
    const where = buildHealthLogWhere(
      healthLogFilterSchema.parse({ from: '2026-10-01', to: '2026-10-31' }),
    );
    const date = where.date as { gte: Date; lte: Date };

    expect(date.gte.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(date.lte.toISOString()).toBe('2026-10-31T00:00:00.000Z');
    // `appDayStartInstant` bunları üretirdi ve günü bir geri kaydırırdı.
    expect(date.gte.toISOString()).not.toBe('2026-09-30T21:00:00.000Z');
  });

  it('tarih verilmezse `date` anahtarı HİÇ YOK', () => {
    expect('date' in buildHealthLogWhere(healthLogFilterSchema.parse({}))).toBe(false);
  });

  it('tek uç verilebiliyor', () => {
    const where = buildHealthLogWhere(healthLogFilterSchema.parse({ from: '2026-10-01' }));
    expect((where.date as { lte?: Date }).lte).toBeUndefined();
  });

  it('yazma yolunda da `appDayToDate` — gün UTC gece yarısı', async () => {
    const { client, create } = istemci();
    await createHealthLog(createHealthLogSchema.parse({ date: '2026-10-14' }), client);

    expect((create.mock.calls[0]?.[0].data.date as Date).toISOString()).toBe(
      '2026-10-14T00:00:00.000Z',
    );
  });
});

/* ===========================================================================
 * GÜNDE TEK KAYIT · LİSTE · TREND
 * ======================================================================== */

describe('okuma yüzeyleri', () => {
  it('liste EN YENİ GÜN ÖNCE — ikincil anahtar GEREKMİYOR', async () => {
    /*
     * `date @unique`, yani aynı güne iki kayıt düşemiyor ve sıra belirsiz
     * kalamıyor. (`Transaction`da ikincil anahtar gerekmişti çünkü orada aynı
     * güne birden çok hareket düşebiliyor.)
     */
    const { client, findMany } = istemci();
    await fetchHealthLogs(healthLogFilterSchema.parse({}), client);

    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ date: 'desc' }]);
  });

  it('⚠️ TREND listeden AYRI: ARTAN sıra, sayfalama YOK, üst sınır VAR', async () => {
    /*
     * İki yüzeyin sorusu farklı: liste "en son ne girdim" (desc, sayfalı),
     * grafik "zaman içinde nasıl değişti" (asc, aralığın tamamı). Sayfalanmış
     * bir grafik yanlış çizer.
     */
    const { client, findMany } = istemci();
    await fetchHealthTrend({ from: '2026-01-01', to: '2026-12-31' }, client);

    const cagri = findMany.mock.calls[0]?.[0];
    expect(cagri.orderBy).toEqual([{ date: 'asc' }]);
    expect(cagri.skip).toBeUndefined();
    expect(cagri.take).toBe(TREND_MAX_DAYS);
  });

  it('`count` listeyle AYNI `where`i kullanıyor', async () => {
    const { client, findMany, count } = istemci();
    await fetchHealthLogs(healthLogFilterSchema.parse({ from: '2026-10-01' }), client);

    expect(count.mock.calls[0]?.[0].where).toEqual(findMany.mock.calls[0]?.[0].where);
  });

  it('kayıt yoksa `null`', async () => {
    const { client, findUnique } = istemci();
    findUnique.mockResolvedValue(null);
    expect(await fetchHealthLogById('yok', client)).toBeNull();
  });

  it('`findHealthLogIdByDay` güne göre arıyor', async () => {
    const { client, findFirst } = istemci();
    findFirst.mockResolvedValue({ id: 'hl_var' });

    expect(await findHealthLogIdByDay('2026-10-14', client)).toBe('hl_var');
    expect((findFirst.mock.calls[0]?.[0].where.date as Date).toISOString()).toBe(
      '2026-10-14T00:00:00.000Z',
    );

    findFirst.mockResolvedValue(null);
    expect(await findHealthLogIdByDay('2026-10-15', client)).toBeNull();
  });
});

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

describe('yazma yolu', () => {
  it('kısmi güncelleme GÖNDERİLMEYEN alana dokunmuyor', async () => {
    const { client, update } = istemci();
    await updateHealthLog(updateHealthLogSchema.parse({ id: 'hl_1', weightKg: '80.0' }), client);

    expect(update.mock.calls[0]?.[0].data).toEqual({ weightKg: '80.0' });
  });

  it('boş not `null` oluyor', async () => {
    const { client, create } = istemci();
    await createHealthLog(createHealthLogSchema.parse({ date: '2026-10-14', note: '   ' }), client);
    expect(create.mock.calls[0]?.[0].data.note).toBeNull();
  });

  it('verilmeyen ölçümler `null` yazılıyor', async () => {
    const { client, create } = istemci();
    await createHealthLog(createHealthLogSchema.parse({ date: '2026-10-14' }), client);

    const data = create.mock.calls[0]?.[0].data;
    expect(data.weightKg).toBeNull();
    expect(data.mood).toBeNull();
    expect(data.steps).toBeNull();
  });

  it('ŞEMA sınırları yürürlükte — ölçek ve aralık', () => {
    const temel = { date: '2026-10-14' };
    // `decimalSchema(3, 2)` — üç ondalık reddediliyor.
    expect(createHealthLogSchema.safeParse({ ...temel, weightKg: '82.555' }).success).toBe(false);
    // 1–5 ölçeği (ADR-020).
    expect(createHealthLogSchema.safeParse({ ...temel, mood: 6 }).success).toBe(false);
    expect(createHealthLogSchema.safeParse({ ...temel, mood: 5 }).success).toBe(true);
    // Nabız aralığı.
    expect(createHealthLogSchema.safeParse({ ...temel, restingHr: 10 }).success).toBe(false);
    // Saat bileşeni taşıyan tarih reddediliyor (ADR-016).
    expect(createHealthLogSchema.safeParse({ date: '2026-10-14T10:00:00Z' }).success).toBe(false);
  });

  it('SİLME gerçek silme — arşiv alanı YOK', async () => {
    /*
     * `HealthLog` referans veri DEĞİL, bir ÖLÇÜM: yanlış girilen bir kilo
     * arşivlenmez, silinir. Şema da destekliyor — bağlı FK yok (T-038 ölçütü).
     */
    const { client, del } = istemci();
    const dto = await deleteHealthLog('hl_1', client);

    expect(del).toHaveBeenCalledWith({ where: { id: 'hl_1' } });
    expect(dto.id).toBe('hl_1');
  });
});

/* ===========================================================================
 * ⚠️ KAPILAR
 * ======================================================================== */

describe('KAPILAR', () => {
  const kod = (yol: string) =>
    readFileSync(join(KOK, yol), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

  const SERVIS = kod('src/server/services/health-log.ts');
  const EYLEM = kod('src/server/actions/health-log.ts');

  it('tarama vakum değil', () => {
    expect(SERVIS).toContain('fetchHealthLogs');
    expect(EYLEM).toContain('createHealthLogAction');
  });

  it('ÖNBELLEKLENMİYOR', () => {
    expect(SERVIS).not.toContain('next/cache');
    expect(SERVIS).not.toContain('cachedRead');
  });

  it('`fetchX` adlandırması — `getX` YOK', () => {
    expect(SERVIS).not.toMatch(/export\s+async\s+function\s+get[A-Z]/);
  });

  it('⚠️ `revalidateTag` YOK — sağlık verisi public`te görünmüyor', () => {
    expect(EYLEM).not.toContain('revalidateTag');
    expect(EYLEM).not.toContain('revalidatePath');
  });

  it('⚠️ public önbellek katmanı SAĞLIK verisi okumuyor', () => {
    expect(kod('src/server/services/cached.ts')).not.toMatch(/healthLog|HealthLog|health-log/);
  });

  it('`ContentEntity` birleşiminde sağlık YOK', () => {
    const birlesim =
      kod('src/server/services/_shared/content-cache.ts').match(
        /export type ContentEntity =[^;]+;/,
      )?.[0] ?? '';
    expect(birlesim).toContain('profile');
    expect(birlesim).not.toMatch(/health/i);
  });

  it('⚠️ `appDayStartInstant` KULLANILMIYOR — `@db.Date` için yanlış', () => {
    expect(SERVIS).not.toContain('appDayStartInstant');
    expect(SERVIS).not.toContain('appDayRangeToInstantFilter');
    expect(SERVIS).toContain('appDayToDate');
  });

  it('⚠️ ÖLÇEKLİ ARİTMETİK YOK — `BigInt` yalnızca `money.ts`te', () => {
    expect(SERVIS).not.toMatch(/\bBigInt\s*\(/);
    // Dönüşüm paylaşılan eşleyiciden.
    expect(SERVIS).toContain('toMeasureString');
  });

  it('her eylem `currentActorId` kapısından geçiyor (ADR-035/B)', () => {
    const eylemler = (EYLEM.match(/export async function \w+Action/g) ?? []).length;
    const kapilar = (EYLEM.match(/currentActorId\(\)/g) ?? []).length;
    expect(kapilar).toBe(eylemler);
    expect(eylemler).toBe(3);
  });
});
