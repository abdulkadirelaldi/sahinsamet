import { describe, expect, it, vi } from 'vitest';

import {
  recalculatePersonalRecords,
  selectPersonalRecords,
  type PersonalRecordClient,
  type SetSnapshot,
} from '@/server/services/_shared';

const set = (
  id: string,
  reps: number,
  weightKg: string | null,
  day = '2026-08-01',
): SetSnapshot => ({ id, reps, weightKg, day });

describe('selectPersonalRecords — ADR-021 tekrar bazında', () => {
  it('her tekrar sayısı için AYRI rekor tutar', () => {
    const records = selectPersonalRecords([
      set('s1', 5, '90.00'),
      set('s2', 8, '80.00'),
      set('s3', 1, '110.00'),
    ]);
    expect(records.map((r) => r.reps)).toEqual([1, 5, 8]);
  });

  it('aynı tekrarda en AĞIR seti seçer', () => {
    const records = selectPersonalRecords([
      set('s1', 5, '80.00'),
      set('s2', 5, '90.00'),
      set('s3', 5, '85.00'),
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]?.weightKg).toBe('90.00');
    expect(records[0]?.workoutSetId).toBe('s2');
  });

  it('TAHMİNİ 1RM kullanmaz — 80×10, 100×1’i geçmez', () => {
    // Epley ile 80×10 ≈ 106 kg 1RM olurdu ve 1RM rekorunu ezerdi.
    const records = selectPersonalRecords([set('s1', 1, '100.00'), set('s2', 10, '80.00')]);
    expect(records.find((r) => r.reps === 1)?.weightKg).toBe('100.00');
    expect(records.find((r) => r.reps === 10)?.weightKg).toBe('80.00');
  });

  it('eşit ağırlıkta ÖNCEKİ gün kazanır (rekor ne zaman kırıldı)', () => {
    const records = selectPersonalRecords([
      set('s1', 5, '90.00', '2026-08-05'),
      set('s2', 5, '90.00', '2026-07-01'),
    ]);
    expect(records[0]?.day).toBe('2026-07-01');
    expect(records[0]?.workoutSetId).toBe('s2');
  });

  it('ağırlıksız setler (vücut ağırlığı) rekora girmez', () => {
    expect(selectPersonalRecords([set('s1', 12, null)])).toEqual([]);
  });

  it('ondalık karşılaştırma kayan noktasız — 100.10 > 100.09', () => {
    const records = selectPersonalRecords([set('s1', 3, '100.09'), set('s2', 3, '100.10')]);
    expect(records[0]?.weightKg).toBe('100.10');
  });

  it('boş set listesi boş rekor', () => {
    expect(selectPersonalRecords([])).toEqual([]);
  });
});

/* ------------------------------------------------------------------------ */

interface Harness {
  client: PersonalRecordClient;
  findMany: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  /** Çağrı sırası — `updateMany`ın upsert'lerden ÖNCE geldiğini ölçmek için. */
  sira: string[];
}

function harness(
  sets: Array<{ id: string; reps: number; weightKg: string | null; date: string }>,
  existingReps: number[],
): Harness {
  const sira: string[] = [];
  const upsert = vi.fn().mockImplementation(() => {
    sira.push('upsert');
    return Promise.resolve({});
  });
  const deleteMany = vi.fn().mockImplementation(() => {
    sira.push('deleteMany');
    return Promise.resolve({ count: 0 });
  });
  const updateMany = vi.fn().mockImplementation(() => {
    sira.push('updateMany');
    return Promise.resolve({ count: 0 });
  });
  const findMany = vi.fn().mockResolvedValue(
    sets.map((s) => ({
      id: s.id,
      reps: s.reps,
      weightKg: s.weightKg,
      workout: { date: new Date(`${s.date}T00:00:00.000Z`) },
    })),
  );

  return {
    findMany,
    upsert,
    deleteMany,
    updateMany,
    sira,
    client: {
      workoutSet: { findMany },
      personalRecord: {
        findMany: vi
          .fn()
          .mockResolvedValue(existingReps.map((reps, i) => ({ id: `pr${i}`, reps }))),
        upsert,
        deleteMany,
        updateMany,
      },
    } as unknown as PersonalRecordClient,
  };
}

const passthrough = (value: unknown): string | null => (value as string | null) ?? null;

describe('recalculatePersonalRecords — üç senaryo (ADR-021)', () => {
  it('EKLEME: yeni set rekor üretir', async () => {
    const h = harness([{ id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' }], []);
    const result = await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(result).toEqual({ upserted: 1, removed: 0 });
    expect(h.upsert).toHaveBeenCalledTimes(1);
    expect(h.upsert.mock.calls[0]?.[0].create.weightKg).toBe('90.00');
  });

  it('DÜZELTME: yanlış girilen ağırlık düzeltilince rekor DÜŞER', async () => {
    // Tek yönlü "daha ağırsa güncelle" mantığı bunu kaçırırdı: 120 kg yanlış
    // girilmiş, 90'a düzeltiliyor — rekor 120'de kalırsa veri tutarsızlaşır.
    const h = harness([{ id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' }], [5]);
    await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(h.upsert.mock.calls[0]?.[0].update.weightKg).toBe('90.00');
    expect(h.deleteMany).not.toHaveBeenCalled();
  });

  it('SİLME: son 5 tekrarlık set silinince 5RM rekoru KALDIRILIR', async () => {
    // ADR-021'in "F5'in en olası sessiz hatası" dediği durum.
    const h = harness([{ id: 's2', reps: 8, weightKg: '80.00', date: '2026-08-04' }], [5, 8]);
    h.deleteMany.mockResolvedValue({ count: 1 });

    const result = await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(h.deleteMany).toHaveBeenCalledWith({ where: { exerciseId: 'ex1', reps: { in: [5] } } });
    expect(result.removed).toBe(1);
  });

  it('TÜM setler silinince tüm rekorlar kaldırılır', async () => {
    const h = harness([], [1, 5, 8]);
    h.deleteMany.mockResolvedValue({ count: 3 });

    const result = await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(h.deleteMany).toHaveBeenCalledWith({
      where: { exerciseId: 'ex1', reps: { in: [1, 5, 8] } },
    });
    expect(result).toEqual({ upserted: 0, removed: 3 });
    expect(h.upsert).not.toHaveBeenCalled();
  });

  it('değişmeyen rekorlar silinmez', async () => {
    const h = harness(
      [
        { id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' },
        { id: 's2', reps: 8, weightKg: '80.00', date: '2026-08-04' },
      ],
      [5, 8],
    );
    await recalculatePersonalRecords('ex1', h.client, passthrough);
    expect(h.deleteMany).not.toHaveBeenCalled();
    expect(h.upsert).toHaveBeenCalledTimes(2);
  });

  it('Decimal dönüştürücüsü çağrılır — ham Decimal geçmez', async () => {
    const h = harness([{ id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' }], []);
    const converter = vi.fn().mockReturnValue('90.00');
    await recalculatePersonalRecords('ex1', h.client, converter);
    expect(converter).toHaveBeenCalled();
  });
});

/* ===========================================================================
 * ⚠️⚠️ İKİ ÖLÇÜLEN HATA — T-111
 *
 * İkisi de bu dosya %100 KAPSAMLIYKEN duruyordu. Sebep ortak: testler elle
 * kurulmuş bir sahte istemci geçiyor ve o istemci ARAYÜZÜN İDDİASINI taklit
 * ediyordu, Prisma'nın davranışını değil. Kapsam "kod koştu" der, "sorgu
 * doğru" demez.
 * ======================================================================== */

describe('⚠️ BULGU-025 — ilişki AÇIKÇA seçiliyor (yoksa çalışma zamanında patlar)', () => {
  it('`workoutSet.findMany` `workout.date`i SELECT ediyor', async () => {
    /*
     * Sorgu düz `findMany({ where })` idi ve dönüş tipi `workout: { date: Date }`
     * İDDİA EDİYORDU. Prisma ilişkiyi istemeden döndürmez: gerçek istemciyle
     * `set.workout` `undefined` olur ve `dateToAppDay(set.workout.date)` atardı.
     *
     * Teşhisi UYUM KAPISI yaptı (gerçek `db`yi dar arayüze atamak `tsc`yi
     * kırdı). O kapı bu dosyada yoktu — `workout-set.ts`te artık var.
     */
    const h = harness([{ id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' }], []);
    await recalculatePersonalRecords('ex1', h.client, passthrough);

    const args = h.findMany.mock.calls[0]?.[0] as {
      select?: { workout?: { select?: { date?: boolean } } };
    };
    expect(args.select, 'select YOK — ilişki gelmez').toBeDefined();
    expect(args.select?.workout?.select?.date).toBe(true);
  });

  it('ilişki GELMEZSE hata GÖRÜNÜR — sessizce yanlış gün yazılmıyor', async () => {
    // Davranışın kendisi de kayıt altında: eksik ilişki `undefined` okumaya
    // çalışır ve ATAR. Sessizce `1970-01-01` gibi bir güne düşmez.
    const h = harness([], []);
    h.findMany.mockResolvedValue([{ id: 's1', reps: 5, weightKg: '90.00' }]);

    await expect(recalculatePersonalRecords('ex1', h.client, passthrough)).rejects.toThrow();
  });
});

describe('⚠️ BULGU-026 — `workoutSetId @unique` upsert sırasını kırıyordu', () => {
  /**
   * ÖLÇÜLEN SENARYO: A seti `reps=5` girilmiş, (ex,5) rekoru A'yı tutuyor.
   * Kullanıcı A'yı 5 → 3 DÜZELTİYOR. Başka bir 5'lik set (B) var, yani 5RM
   * bayat değil — SAHİP DEĞİŞTİRİYOR, silinmiyor. Adaylar artan `reps`
   * sırasında: [3RM→A, 5RM→B]. İlk upsert A'yı talep ediyor ama A'yı hâlâ
   * (ex,5) tutuyor → P2002 → işlem geri sarıyor → DÜZELTME KAYBOLUYOR.
   *
   * Hata sınıfı "yanlış sonuç" değil "tamamen başarısız yazma", ve tetikleyicisi
   * tam olarak Karar 3'ün var olma sebebi: yanlış girilmiş bir seti düzeltmek.
   */
  function sahiplikIzleyen(baslangic: Array<[number, string]>) {
    // workoutSetId -> onu tutan rekorun reps'i
    const sahipler = new Map<string, number>(baslangic.map(([reps, setId]) => [setId, reps]));
    const ihlaller: string[] = [];

    return {
      sahipler,
      ihlaller,
      upsert: vi.fn().mockImplementation(async (args: Record<string, never>) => {
        const a = args as unknown as {
          where: { exerciseId_reps: { reps: number } };
          update: { workoutSetId: string | null };
        };
        const reps = a.where.exerciseId_reps.reps;
        const yeni = a.update.workoutSetId;
        if (yeni && sahipler.has(yeni) && sahipler.get(yeni) !== reps) {
          ihlaller.push(`${yeni} zaten (ex,${sahipler.get(yeni)}) rekorunda`);
        }
        for (const [setId, tutan] of sahipler) if (tutan === reps) sahipler.delete(setId);
        if (yeni) sahipler.set(yeni, reps);
        return {};
      }),
      updateMany: vi.fn().mockImplementation(async () => {
        sahipler.clear(); // tüm kaynak bağları boşaltılıyor
        return { count: 0 };
      }),
    };
  }

  it('⚠️ set `reps` 5→3 düzeltilince UNIQUE İHLALİ ÜRETMİYOR', async () => {
    const izleyen = sahiplikIzleyen([[5, 'set_A']]);

    const client = {
      workoutSet: {
        findMany: vi.fn().mockResolvedValue([
          // A düzeltildi: artık 3 tekrar. B ise 5 tekrar.
          { id: 'set_A', reps: 3, weightKg: '100.00', workout: { date: new Date('2026-10-01') } },
          { id: 'set_B', reps: 5, weightKg: '80.00', workout: { date: new Date('2026-10-02') } },
        ]),
      },
      personalRecord: {
        findMany: vi.fn().mockResolvedValue([{ id: 'pr0', reps: 5 }]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: izleyen.upsert,
        updateMany: izleyen.updateMany,
      },
    } as unknown as PersonalRecordClient;

    const result = await recalculatePersonalRecords('ex1', client, passthrough);

    expect(izleyen.ihlaller, 'workoutSetId @unique ihlal edildi').toEqual([]);
    expect(result.upserted).toBe(2);
    // 5RM bayat DEĞİL: silinmedi, B'ye taşındı.
    expect(result.removed).toBe(0);
  });

  it('⚠️ DÖNGÜSEL TAKAS da güvenli — sabit bir sıra bunu çözemezdi', async () => {
    /*
     * A 5→3, C 3→5. Hangi sırayla upsert edilirse edilsin, bağlar boşaltılmadan
     * biri diğerinin tuttuğu seti talep eder. "Sırayı düzeltmek" bu yüzden
     * çözüm değil; `updateMany` ile boşaltmak sıradan BAĞIMSIZ.
     */
    const izleyen = sahiplikIzleyen([
      [5, 'set_A'],
      [3, 'set_C'],
    ]);

    const client = {
      workoutSet: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'set_A', reps: 3, weightKg: '100.00', workout: { date: new Date('2026-10-01') } },
          { id: 'set_C', reps: 5, weightKg: '90.00', workout: { date: new Date('2026-10-02') } },
        ]),
      },
      personalRecord: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'pr0', reps: 3 },
          { id: 'pr1', reps: 5 },
        ]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: izleyen.upsert,
        updateMany: izleyen.updateMany,
      },
    } as unknown as PersonalRecordClient;

    await recalculatePersonalRecords('ex1', client, passthrough);
    expect(izleyen.ihlaller).toEqual([]);
  });

  it('bağ boşaltma UPSERTLERDEN ÖNCE koşuyor — sıra önemli', async () => {
    const h = harness([{ id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' }], []);
    await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(h.updateMany).toHaveBeenCalledWith({
      where: { exerciseId: 'ex1' },
      data: { workoutSetId: null },
    });
    expect(h.sira.indexOf('updateMany')).toBeLessThan(h.sira.indexOf('upsert'));
  });

  it('bağ boşaltma BAYAT SİLMEDEN SONRA koşuyor — gereksiz satıra dokunmuyor', async () => {
    const h = harness([{ id: 's2', reps: 8, weightKg: '80.00', date: '2026-08-04' }], [5, 8]);
    await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(h.sira.indexOf('deleteMany')).toBeLessThan(h.sira.indexOf('updateMany'));
  });
});

describe('⚠️ `appDayToDate` — ikinci bir tanım YOK', () => {
  it('yazılan `date` UTC gece yarısı (`@db.Date` sınırı)', async () => {
    /*
     * Burada iki satır elle `new Date(\`${day}T00:00:00.000Z\`)` yapıyordu:
     * aynı sonuç, ama saf yardımcının İKİNCİ TANIMI (BULGU-024'ün sınıfı).
     * `appDayToDate`e geçildi; `appDayStartInstant` DEĞİL — o `timestamp`
     * sütunlar için ve günü bir geri kaydırırdı (T-102'de ölçüldü).
     */
    const h = harness([{ id: 's1', reps: 5, weightKg: '90.00', date: '2026-03-01' }], []);
    await recalculatePersonalRecords('ex1', h.client, passthrough);

    const yazilan = (h.upsert.mock.calls[0]?.[0] as { create: { date: Date } }).create.date;
    expect(yazilan.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    // Yerel saatle kurulsaydı Europe/Istanbul altında 28 Şubat'a düşerdi.
    expect(yazilan.toISOString().slice(0, 10)).toBe('2026-03-01');
  });
});
