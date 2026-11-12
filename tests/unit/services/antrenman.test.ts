import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  createExerciseSchema,
  createWorkoutSchema,
  createWorkoutSetSchema,
  exerciseFilterSchema,
  personalRecordFilterSchema,
  updateWorkoutSchema,
  updateWorkoutSetSchema,
  workoutFilterSchema,
} from '@/lib/schemas';
import {
  archiveExercise,
  buildExerciseWhere,
  createExercise,
  fetchExerciseById,
  fetchExercises,
  updateExercise,
} from '@/server/services/exercise';
import {
  buildPersonalRecordWhere,
  fetchPersonalRecords,
  fetchRecordsForExercise,
} from '@/server/services/personal-record';
import {
  buildWorkoutWhere,
  createWorkout,
  deleteWorkout,
  fetchWorkoutById,
  fetchWorkouts,
  toWorkoutSetDto,
  updateWorkout,
  workoutAffectedExerciseIds,
} from '@/server/services/workout';
import {
  createWorkoutSet,
  deleteWorkoutSet,
  recalculateForExercises,
  updateWorkoutSet,
} from '@/server/services/workout-set';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

/**
 * F5 ANTRENMAN MODÜLÜ — `Exercise` / `Workout` / `WorkoutSet` / `PersonalRecord`
 * (T-111, ADR-021, §4.2).
 *
 * ÜÇ PR KARARININ GEREKÇESİ `_shared/personal-record.ts`in başında; hesaplayıcı
 * ÖLÇÜMLERİ `personal-record.test.ts`te (BULGU-025 ve BULGU-026 dahil). BU
 * DOSYA kararların SERVİS YOLUNDAN uygulandığını ölçüyor: hangi mutasyon hangi
 * egzersizin hesabını tetikliyor, ve neyi KAÇIRMIYOR.
 */

const KOK = join(import.meta.dirname, '..', '..', '..');

function kod(yol: string): string {
  // Yorumlar ÇIKARILIYOR — T-040'ın dersi: bir yasağı yorumda arayan kapı,
  // yasağı ANLATAN bir yorumla sahte kırmızı/yeşil verir.
  return readFileSync(join(KOK, yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

/* ===========================================================================
 * EXERCISE — referans veri, ARŞİVLENİR
 * ======================================================================== */

function exerciseClient(rows: unknown[] = [], total = 0) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const count = vi.fn().mockResolvedValue(total);
  const findUnique = vi.fn().mockResolvedValue(rows[0] ?? null);
  const findFirst = vi.fn().mockResolvedValue(null);
  const create = vi.fn().mockResolvedValue(rows[0]);
  const update = vi.fn().mockResolvedValue(rows[0]);
  return {
    findMany,
    count,
    findUnique,
    findFirst,
    create,
    update,
    client: { exercise: { findMany, count, findUnique, findFirst, create, update } } as never,
  };
}

const EX_SATIR = {
  id: 'ex_1',
  name: 'Bench Press',
  muscleGroup: 'CHEST',
  equipment: 'BARBELL',
  isArchived: false,
  createdAt: new Date('2026-08-01T10:00:00.000Z'),
  updatedAt: new Date('2026-08-02T10:00:00.000Z'),
  _count: { personalRecords: 3 },
};

describe('Exercise — kütüphane', () => {
  it('liste rekor SAYISINI taşıyor, rekorların kendisini DEĞİL', async () => {
    const h = exerciseClient([EX_SATIR], 1);
    const sonuc = await fetchExercises(exerciseFilterSchema.parse({}), h.client);

    expect(sonuc.items[0]?.recordCount).toBe(3);
    // Setlerin tamamı SAYILMIYOR: liste ekranı o sayıyı kullanmıyor ve her
    // satır için ikinci bir sayım karşılığı olmayan maliyet olurdu.
    const select = h.findMany.mock.calls[0]?.[0].select;
    expect(Object.keys(select._count.select)).toEqual(['personalRecords']);
  });

  it('sıra KAS GRUBU sonra AD — bir seçim listesi, akış değil', async () => {
    const h = exerciseClient([EX_SATIR], 1);
    await fetchExercises(exerciseFilterSchema.parse({}), h.client);

    expect(h.findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { muscleGroup: 'asc' },
      { name: 'asc' },
    ]);
  });

  it('⚠️ `isArchived` VARSAYILANI YOK — "verilmedi" TÜMÜ demek', () => {
    // Sessiz bir `isArchived: false` varsayılanı arşiv ekranının hiç
    // çalışmaması demekti. ADR-033 üç durum taşıyor; çağıran ne istediğini
    // SÖYLÜYOR.
    expect(buildExerciseWhere(exerciseFilterSchema.parse({}))).toEqual({});
    expect(buildExerciseWhere(exerciseFilterSchema.parse({ isArchived: 'false' }))).toEqual({
      isArchived: false,
    });
    expect(buildExerciseWhere(exerciseFilterSchema.parse({ isArchived: 'true' }))).toEqual({
      isArchived: true,
    });
  });

  it('ad araması BÜYÜK/KÜÇÜK HARF duyarsız', () => {
    expect(buildExerciseWhere(exerciseFilterSchema.parse({ q: 'bench' })).name).toEqual({
      contains: 'bench',
      mode: 'insensitive',
    });
  });

  it('tek kayıt okunuyor; yoksa `null`', async () => {
    const h = exerciseClient([EX_SATIR]);
    expect((await fetchExerciseById('ex_1', h.client))?.name).toBe('Bench Press');

    h.findUnique.mockResolvedValue(null);
    expect(await fetchExerciseById('yok', h.client)).toBeNull();
  });

  it('ekleme ve güncelleme DTO döndürüyor — ham satır DEĞİL', async () => {
    const h = exerciseClient([EX_SATIR]);
    // Kütüphane boş: ad çakışması taraması bir şey bulmasın.
    h.findMany.mockResolvedValue([]);
    const olusan = await createExercise(
      createExerciseSchema.parse({ name: 'Bench Press', muscleGroup: 'CHEST' }),
      h.client,
    );
    expect(olusan.createdAt).toBe('2026-08-01T10:00:00.000Z');
    expect(olusan).not.toHaveProperty('_count');

    await updateExercise({ id: 'ex_1', name: 'Barbell Bench Press' }, h.client);
    expect(h.update.mock.calls[0]?.[0].data).toEqual({ name: 'Barbell Bench Press' });
  });

  it('güncelleme KISMİ — dokunulmayan alan `data`ya girmiyor', async () => {
    const h = exerciseClient([EX_SATIR]);
    await updateExercise({ id: 'ex_1', equipment: 'DUMBBELL' }, h.client);

    expect(h.update.mock.calls[0]?.[0].data).toEqual({ equipment: 'DUMBBELL' });
  });

  it('⚠️ ARŞİVLEME var, SİLME YOK — ve rekorlara DOKUNULMUYOR', async () => {
    /*
     * T-038'in ölçütü: `WorkoutSet.exerciseId` ve `PersonalRecord.exerciseId`
     * ikisi de `onDelete: Restrict`, yani FK bağımlısı VAR → gerçek silme yok.
     * (`HealthLog`ta tersi ölçülmüştü: bağlı FK yoktu, gerçek silme seçildi.
     * Ölçüt aynı, cevap farklı.)
     */
    const h = exerciseClient([{ ...EX_SATIR, isArchived: true }]);
    await archiveExercise({ id: 'ex_1', isArchived: true }, h.client);

    expect(h.update.mock.calls[0]?.[0].data).toEqual({ isArchived: true });

    const kaynak = kod('src/server/services/exercise.ts');
    expect(kaynak).not.toContain('exercise.delete');
    expect(kaynak).not.toContain('deleteMany');
    /*
     * ⚠️ REKORLARA YAZMA YOK. Rekorları OKUMAK meşru ve var (liste satırının
     * `recordCount`u `_count.personalRecords`tan geliyor) — ölçülen şey
     * YAZMA: arşivlemek "artık bu hareketi yapmıyorum" demek, rekorları
     * silmek "bu hareketi hiç yapmadım" demek olurdu. Arşivi geri açan
     * kullanıcı rekorlarını YERİNDE bulur.
     */
    expect(kaynak).toContain('_count');
    expect(kaynak).not.toMatch(/personalRecord\.(create|update|delete|upsert)/);
  });
});

/* ===========================================================================
 * WORKOUT — ölçüm, SİLİNİR
 * ======================================================================== */

const SET_SATIR = {
  id: 'ws_1',
  workoutId: 'w_1',
  exerciseId: 'ex_1',
  setNo: 1,
  reps: 5,
  weightKg: decimal('100.5'),
  rpe: 8,
  exercise: { name: 'Bench Press' },
};

const W_SATIR = {
  id: 'w_1',
  date: new Date('2026-10-14T00:00:00.000Z'),
  type: 'GYM',
  durationMin: 75,
  feeling: 4,
  note: null,
  createdAt: new Date('2026-10-14T18:00:00.000Z'),
  updatedAt: new Date('2026-10-14T18:30:00.000Z'),
};

function workoutClient(rows: unknown[] = [], total = 0, setler: unknown[] = []) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const count = vi.fn().mockResolvedValue(total);
  const findUnique = vi.fn().mockResolvedValue(rows[0] ?? null);
  const create = vi.fn().mockResolvedValue(rows[0]);
  const update = vi.fn().mockResolvedValue(rows[0]);
  const deleteFn = vi.fn().mockResolvedValue(rows[0]);
  const setFindMany = vi.fn().mockResolvedValue(setler);
  return {
    findMany,
    count,
    findUnique,
    create,
    update,
    deleteFn,
    setFindMany,
    client: {
      workout: { findMany, count, findUnique, create, update, delete: deleteFn },
      workoutSet: { findMany: setFindMany },
    } as never,
  };
}

describe('Workout — antrenman kaydı', () => {
  it('⚠️ İKİNCİL SIRALAMA ANAHTARI VAR — `date` `@unique` DEĞİL', async () => {
    /*
     * `HealthLog`ta ikincil anahtar GEREKMEMİŞTİ çünkü `date @unique`.
     * Burada aynı güne iki antrenman düşebilir (sabah koşu, akşam ağırlık) ve
     * tek anahtarla sıra belirsiz kalır: PostgreSQL'in `OFFSET`i aynı satırı
     * iki sayfada gösterebilir — sayfalanmış listede satır TEKRARLAR veya ATLAR.
     */
    const h = workoutClient([{ ...W_SATIR, _count: { sets: 6 } }], 1);
    await fetchWorkouts(workoutFilterSchema.parse({}), h.client);

    expect(h.findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { date: 'desc' },
      { createdAt: 'desc' },
    ]);
  });

  it('gün aralığı `appDayToDate` ile — UTC gece yarısı sınırı', () => {
    const where = buildWorkoutWhere(
      workoutFilterSchema.parse({ from: '2026-03-01', to: '2026-03-31' }),
    );

    expect((where.date as { gte: Date }).gte.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect((where.date as { lte: Date }).lte.toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });

  it('⚠️ `appDayStartInstant` KULLANILMIYOR — `date` bir `@db.Date`', () => {
    // T-102'de ölçüldü: `date` sütununda `appDayStartInstant` günü bir geri
    // kaydırır (28 Şubat marta sayılır, 31 Mart düşer). Sütunun tipi
    // hangi yardımcının doğru olduğunu BELİRLİYOR.
    const kaynak = kod('src/server/services/workout.ts');
    expect(kaynak).not.toContain('appDayStartInstant');
    expect(kaynak).not.toContain('appDayRangeToInstantFilter');
    expect(kaynak).toContain('appDayToDate');
  });

  it('tür süzgeci ve boş filtre', () => {
    expect(buildWorkoutWhere(workoutFilterSchema.parse({ type: 'CARDIO' }))).toEqual({
      type: 'CARDIO',
    });
    expect(buildWorkoutWhere(workoutFilterSchema.parse({}))).toEqual({});
  });

  it('detay SETLERİYLE geliyor — ayrı bir okuma YOK', async () => {
    const h = workoutClient([{ ...W_SATIR, sets: [SET_SATIR] }]);
    const dto = await fetchWorkoutById('w_1', h.client);

    expect(dto?.sets).toHaveLength(1);
    expect(dto?.sets[0]?.exerciseName).toBe('Bench Press');
    // Set sırası: egzersiz, sonra `setNo` — setler egzersiz bazında GRUPLANARAK
    // girilir ve ekran öyle okuyor.
    expect(h.findUnique.mock.calls[0]?.[0].select.sets.orderBy).toEqual([
      { exerciseId: 'asc' },
      { setNo: 'asc' },
    ]);
  });

  it('antrenman yoksa `null`', async () => {
    const h = workoutClient([]);
    h.findUnique.mockResolvedValue(null);
    expect(await fetchWorkoutById('yok', h.client)).toBeNull();
  });

  it('ekleme: gün çevriliyor, boş not `null` oluyor', async () => {
    const h = workoutClient([W_SATIR]);
    await createWorkout(createWorkoutSchema.parse({ date: '2026-10-14', note: '   ' }), h.client);

    const data = h.create.mock.calls[0]?.[0].data;
    expect(data.date.toISOString()).toBe('2026-10-14T00:00:00.000Z');
    // "girilmedi" ile "boşluk girildi" aynı şey.
    expect(data.note).toBeNull();
  });

  it('güncelleme KISMİ — `undefined` ≠ `null`', async () => {
    const h = workoutClient([W_SATIR]);
    await updateWorkout(updateWorkoutSchema.parse({ id: 'w_1', feeling: 2 }), h.client);

    expect(h.update.mock.calls[0]?.[0].data).toEqual({ feeling: 2 });
  });

  it('⚠️ ETKİLENEN EGZERSİZLER `distinct` — her biri BİR KEZ', async () => {
    /*
     * Bir antrenmanda aynı harekete 5 set girilir; 5 kez hesaplamak aynı
     * sonucu 5 kez yazmak olurdu.
     */
    const h = workoutClient([W_SATIR], 0, [{ exerciseId: 'ex_1' }, { exerciseId: 'ex_2' }]);
    const ids = await workoutAffectedExerciseIds('w_1', h.client);

    expect(ids).toEqual(['ex_1', 'ex_2']);
    expect(h.setFindMany.mock.calls[0]?.[0].distinct).toEqual(['exerciseId']);
  });

  it('silme GÜNÜ döndürüyor — denetim kaydı için', async () => {
    const h = workoutClient([W_SATIR]);
    expect(await deleteWorkout('w_1', h.client)).toEqual({ id: 'w_1', date: '2026-10-14' });
  });

  it('⚠️ SİLME GERÇEK — arşiv DEĞİL, ve ölçüt FK', () => {
    // `Workout`a bağlı tek FK `WorkoutSet.workoutId` ve o `Cascade`, yani
    // silmenin kıracağı referans YOK. `Exercise`te tersi ölçüldü.
    const kaynak = kod('src/server/services/workout.ts');
    expect(kaynak).toContain('workout.delete');
    expect(kaynak).not.toContain('isArchived');
  });
});

/* ===========================================================================
 * WORKOUTSET — rekor hesabının TETİKLEYİCİSİ
 * ======================================================================== */

function setClient(opts: { satir?: unknown; onceki?: { exerciseId: string } | null } = {}) {
  const satir = opts.satir ?? SET_SATIR;
  const create = vi.fn().mockResolvedValue(satir);
  const update = vi.fn().mockResolvedValue(satir);
  const deleteFn = vi.fn().mockResolvedValue({ id: 'ws_1', exerciseId: 'ex_1', workoutId: 'w_1' });
  const findUnique = vi.fn().mockResolvedValue(opts.onceki ?? { exerciseId: 'ex_1' });
  // Hesaplayıcının yüzeyi — `recalculatePersonalRecords` buradan okuyor.
  const setFindMany = vi.fn().mockResolvedValue([]);
  const prFindMany = vi.fn().mockResolvedValue([]);
  const prUpsert = vi.fn().mockResolvedValue({});
  const prDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
  const prUpdateMany = vi.fn().mockResolvedValue({ count: 0 });

  return {
    create,
    update,
    deleteFn,
    findUnique,
    setFindMany,
    prFindMany,
    prUpsert,
    prDeleteMany,
    prUpdateMany,
    client: {
      workoutSet: { create, update, delete: deleteFn, findUnique, findMany: setFindMany },
      personalRecord: {
        findMany: prFindMany,
        upsert: prUpsert,
        deleteMany: prDeleteMany,
        updateMany: prUpdateMany,
      },
    } as never,
  };
}

describe('WorkoutSet — her mutasyon rekor hesabını TETİKLİYOR (Karar 1)', () => {
  it('EKLEME hesabı tetikliyor', async () => {
    const h = setClient();
    const sonuc = await createWorkoutSet(
      createWorkoutSetSchema.parse({
        workoutId: 'w_1',
        exerciseId: 'ex_1',
        setNo: 1,
        reps: 5,
        weightKg: '100.50',
      }),
      h.client,
    );

    expect(h.setFindMany).toHaveBeenCalledWith({
      where: { exerciseId: 'ex_1' },
      select: expect.anything(),
    });
    expect(sonuc.records).toEqual({ upserted: 0, removed: 0 });
  });

  it('SİLME hesabı tetikliyor — Karar 3', async () => {
    const h = setClient();
    h.prFindMany.mockResolvedValue([{ id: 'pr_1', reps: 5 }]);
    h.prDeleteMany.mockResolvedValue({ count: 1 });

    const sonuc = await deleteWorkoutSet('ws_1', h.client);

    // Son 5 tekrarlık set gidince 5RM rekoru KALDIRILIYOR.
    expect(sonuc.records.removed).toBe(1);
    expect(sonuc.workoutId).toBe('w_1');
  });

  it('⚠️ silmede `exerciseId` SİLME SONUCUNDAN okunuyor', async () => {
    // Silinmiş satıra sonradan sorulamaz; `delete` bu yüzden `select` taşıyor.
    const h = setClient();
    await deleteWorkoutSet('ws_1', h.client);

    expect(h.deleteFn.mock.calls[0]?.[0].select).toEqual({
      id: true,
      exerciseId: true,
      workoutId: true,
    });
  });

  it('⚠️⚠️ DÜZELTMEDE `exerciseId` DEĞİŞİRSE İKİ EGZERSİZ DE HESAPLANIYOR', async () => {
    /*
     * Listedeki en sinsi sessiz hata: set yanlış harekete girilmiş ve
     * düzeltiliyor. Yalnızca YENİ egzersiz hesaplanırsa, rekor ESKİ hareketin
     * üzerinde dayanaksız olarak DURMAYA DEVAM EDER.
     *
     * Eski `exerciseId` mutasyondan ÖNCE okunuyor; sonra okumak imkânsız
     * çünkü satır artık yeni egzersizi gösteriyor.
     */
    const h = setClient({
      satir: { ...SET_SATIR, exerciseId: 'ex_YENI' },
      onceki: { exerciseId: 'ex_ESKI' },
    });

    await updateWorkoutSet(
      updateWorkoutSetSchema.parse({ id: 'ws_1', exerciseId: 'c'.repeat(25) }),
      h.client,
    );

    const hesaplanan = h.setFindMany.mock.calls.map((c) => c[0].where.exerciseId);
    expect(hesaplanan).toContain('ex_ESKI');
    expect(hesaplanan).toContain('ex_YENI');
    expect(hesaplanan).toHaveLength(2);
  });

  it('`exerciseId` DEĞİŞMEZSE tek kez hesaplanıyor — tekilleştirme', async () => {
    const h = setClient({ onceki: { exerciseId: 'ex_1' } });
    await updateWorkoutSet(updateWorkoutSetSchema.parse({ id: 'ws_1', reps: 6 }), h.client);

    expect(h.setFindMany).toHaveBeenCalledTimes(1);
  });

  it('önceki satır bulunamazsa yalnızca YENİ egzersiz hesaplanıyor', async () => {
    const h = setClient({ onceki: null });
    await updateWorkoutSet(updateWorkoutSetSchema.parse({ id: 'ws_1', reps: 6 }), h.client);

    expect(h.setFindMany).toHaveBeenCalledTimes(1);
  });

  it('⚠️ `weightKg: null` "dokunmadım" DEĞİL — rekoru DÜŞÜRÜR', async () => {
    /*
     * T-031'in `undefined` ≠ `null` kuralı burada DAVRANIŞSAL fark yaratıyor:
     * `null` "ağırlığı kaldır" (vücut ağırlığı hareketine çevir) demek ve
     * ağırlıksız set rekora GİRMEDİĞİ için rekoru düşürür.
     */
    const h = setClient();
    await updateWorkoutSet({ id: 'ws_1', weightKg: null } as never, h.client);

    expect(h.update.mock.calls[0]?.[0].data).toHaveProperty('weightKg', null);
  });

  it('`recalculateForExercises` her egzersizi BİR KEZ hesaplıyor', async () => {
    const h = setClient();
    await recalculateForExercises(['ex_1', 'ex_2', 'ex_1', 'ex_2'], h.client);

    expect(h.setFindMany).toHaveBeenCalledTimes(2);
  });

  it('hesap sonuçları TOPLANIYOR — her egzersizin katkısı sayılıyor', async () => {
    const h = setClient();
    h.prFindMany.mockResolvedValue([{ id: 'pr_1', reps: 5 }]);
    h.prDeleteMany.mockResolvedValue({ count: 1 });

    const sonuc = await recalculateForExercises(['ex_1', 'ex_2'], h.client);
    expect(sonuc.removed).toBe(2);
  });

  it('boş liste için hesap koşmuyor', async () => {
    const h = setClient();
    expect(await recalculateForExercises([], h.client)).toEqual({ upserted: 0, removed: 0 });
    expect(h.setFindMany).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * KISMİ GÜNCELLEME — HER ALAN AYRI AYRI
 *
 * ⚠️ NEDEN TEK TEK: kısmi güncelleme her alan için AYRI bir dal
 * (`fields.x !== undefined ? {...} : {}`). Tek bir alanla test etmek
 * diğerlerini ÖLÇÜLMEMİŞ bırakır, ve ölçülmemiş bir dalda yanlış alan adı
 * yazmak sessizce "dokunulmadı" davranışı üretir — kullanıcı düzeltmesini
 * kaydeder, hiçbir şey değişmez, hata mesajı da YOKTUR.
 * ======================================================================== */

describe('kısmi güncelleme — her alan kendi dalını açıyor', () => {
  const wAlanlar = [
    ['date', '2026-10-13', (d: Record<string, Date>) => d.date?.toISOString().slice(0, 10)],
    ['type', 'CARDIO', (d: Record<string, string>) => d.type],
    ['durationMin', 45, (d: Record<string, number>) => d.durationMin],
    ['feeling', 3, (d: Record<string, number>) => d.feeling],
    ['note', 'yoğun gün', (d: Record<string, string>) => d.note],
  ] as const;

  it.each(wAlanlar)('Workout.%s yalnız başına güncellenebiliyor', async (alan, deger, oku) => {
    const h = workoutClient([W_SATIR]);
    await updateWorkout(updateWorkoutSchema.parse({ id: 'w_1', [alan]: deger }), h.client);

    const data = h.update.mock.calls[0]?.[0].data;
    expect(Object.keys(data)).toEqual([alan]);
    expect(oku(data as never)).toBe(alan === 'date' ? '2026-10-13' : deger);
  });

  const sAlanlar = [
    ['setNo', 3],
    ['reps', 8],
    ['weightKg', '95.00'],
    ['rpe', 9],
  ] as const;

  it.each(sAlanlar)('WorkoutSet.%s yalnız başına güncellenebiliyor', async (alan, deger) => {
    const h = setClient();
    await updateWorkoutSet(updateWorkoutSetSchema.parse({ id: 'ws_1', [alan]: deger }), h.client);

    expect(h.update.mock.calls[0]?.[0].data).toEqual({ [alan]: deger });
  });

  it('WorkoutSet.workoutId güncellenebiliyor — set başka antrenmana taşınabilir', async () => {
    const h = setClient();
    await updateWorkoutSet(
      updateWorkoutSetSchema.parse({ id: 'ws_1', workoutId: 'd'.repeat(25) }),
      h.client,
    );

    expect(h.update.mock.calls[0]?.[0].data).toEqual({ workoutId: 'd'.repeat(25) });
  });

  it('hiçbir alan verilmezse `data` BOŞ — gereksiz yazma yok', async () => {
    const h = workoutClient([W_SATIR]);
    await updateWorkout(updateWorkoutSchema.parse({ id: 'w_1' }), h.client);

    expect(h.update.mock.calls[0]?.[0].data).toEqual({});
  });

  it('Exercise üç alanı da ayrı ayrı', async () => {
    const h = exerciseClient([EX_SATIR]);

    await updateExercise({ id: 'ex_1', muscleGroup: 'BACK' }, h.client);
    expect(h.update.mock.calls[0]?.[0].data).toEqual({ muscleGroup: 'BACK' });

    await updateExercise({ id: 'ex_1', equipment: 'CABLE' }, h.client);
    expect(h.update.mock.calls[1]?.[0].data).toEqual({ equipment: 'CABLE' });

    await updateExercise({ id: 'ex_1' }, h.client);
    expect(h.update.mock.calls[2]?.[0].data).toEqual({});
  });

  it('ekleme: verilmeyen opsiyonel alanlar `null` yazılıyor', async () => {
    const h = workoutClient([W_SATIR]);
    await createWorkout(createWorkoutSchema.parse({ date: '2026-10-14' }), h.client);

    const data = h.create.mock.calls[0]?.[0].data;
    expect(data.durationMin).toBeNull();
    expect(data.feeling).toBeNull();
    expect(data.note).toBeNull();
    // `type` ŞEMA VARSAYILANI taşıyor — `null` değil.
    expect(data.type).toBe('GYM');
  });

  it('ekleme: dolu not korunuyor, dolu alanlar geçiyor', async () => {
    const h = workoutClient([W_SATIR]);
    await createWorkout(
      createWorkoutSchema.parse({
        date: '2026-10-14',
        durationMin: 60,
        feeling: 5,
        note: 'rekor günü',
        type: 'CARDIO',
      }),
      h.client,
    );

    expect(h.create.mock.calls[0]?.[0].data).toMatchObject({
      durationMin: 60,
      feeling: 5,
      note: 'rekor günü',
      type: 'CARDIO',
    });
  });

  it('set eklemede ağırlık ve rpe verilmezse `null`', async () => {
    const h = setClient();
    await createWorkoutSet(
      createWorkoutSetSchema.parse({
        workoutId: 'w_1',
        exerciseId: 'ex_1',
        setNo: 1,
        reps: 12,
      }),
      h.client,
    );

    const data = h.create.mock.calls[0]?.[0].data;
    expect(data.weightKg).toBeNull();
    expect(data.rpe).toBeNull();
  });

  it('gün süzgecinin TEK UCU da çalışıyor', () => {
    // `from` ve `to` bağımsız iki dal.
    expect(
      Object.keys(buildWorkoutWhere(workoutFilterSchema.parse({ from: '2026-01-01' })).date!),
    ).toEqual(['gte']);
    expect(
      Object.keys(buildWorkoutWhere(workoutFilterSchema.parse({ to: '2026-12-31' })).date!),
    ).toEqual(['lte']);
  });

  it('egzersiz süzgecinin her alanı tek tek', () => {
    expect(buildExerciseWhere(exerciseFilterSchema.parse({ muscleGroup: 'LEGS' }))).toEqual({
      muscleGroup: 'LEGS',
    });
    expect(buildExerciseWhere(exerciseFilterSchema.parse({ equipment: 'MACHINE' }))).toEqual({
      equipment: 'MACHINE',
    });
  });

  it('rekor süzgecinin her alanı tek tek', () => {
    expect(
      buildPersonalRecordWhere(personalRecordFilterSchema.parse({ exerciseId: 'c'.repeat(25) })),
    ).toEqual({ exerciseId: 'c'.repeat(25) });
  });
});

/* ===========================================================================
 * PERSONALRECORD — YALNIZCA OKUMA
 * ======================================================================== */

const PR_SATIR = {
  id: 'pr_1',
  exerciseId: 'ex_1',
  reps: 5,
  weightKg: decimal('100.5'),
  date: new Date('2026-10-14T00:00:00.000Z'),
  workoutSetId: 'ws_1',
  createdAt: new Date('2026-10-14T18:00:00.000Z'),
  updatedAt: new Date('2026-10-14T18:00:00.000Z'),
  exercise: { name: 'Bench Press', muscleGroup: 'CHEST' },
};

function prClient(rows: unknown[] = [PR_SATIR], total = 1) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const count = vi.fn().mockResolvedValue(total);
  return { findMany, count, client: { personalRecord: { findMany, count } } as never };
}

describe('PersonalRecord — okuma yolu', () => {
  it('⚠️ ELLE YAZMA YOLU YOK — ve bu bir KARAR', () => {
    /*
     * Şema `createPersonalRecordSchema`/`updatePersonalRecordSchema` taşıyor
     * (T-011) ama servis onları BAĞLAMIYOR. Elle yazma yolu açmak, türetilmiş
     * bir alanı elle değiştirilebilir yapmaktı — ve sonucu ADR-014'ün
     * `baseAmount` için reddettiği şeyin aynısı: bir sonraki yeniden hesap elle
     * girilen değeri SESSİZCE EZER.
     */
    const kaynak = kod('src/server/services/personal-record.ts');
    expect(kaynak).not.toContain('personalRecord.create');
    expect(kaynak).not.toContain('personalRecord.update(');
    expect(kaynak).not.toContain('personalRecord.delete');
    // Eylem dosyası da YOK — yani hiçbir Server Action rekora elle yazamıyor.
    expect(() => readFileSync(join(KOK, 'src/server/actions/personal-record.ts'))).toThrow();
  });

  it('sıra EGZERSİZ sonra TEKRAR ARTAN', async () => {
    /*
     * Ağırlığa göre sıralamak 100×1 ile 100×10'u yan yana düşürür ve hangisi
     * hangi kategorinin rekoru olduğu kaybolur — ADR-021'in tekrar
     * bazındalığının görsel karşılığı.
     */
    const h = prClient();
    await fetchPersonalRecords(personalRecordFilterSchema.parse({}), h.client);

    expect(h.findMany.mock.calls[0]?.[0].orderBy).toEqual([{ exerciseId: 'asc' }, { reps: 'asc' }]);
  });

  it('DTO egzersiz adını ve kas grubunu taşıyor', async () => {
    const h = prClient();
    const sonuc = await fetchPersonalRecords(personalRecordFilterSchema.parse({}), h.client);

    expect(sonuc.items[0]?.exerciseName).toBe('Bench Press');
    expect(sonuc.items[0]?.muscleGroup).toBe('CHEST');
    expect(sonuc.items[0]?.date).toBe('2026-10-14');
  });

  it('süzgeç: egzersiz ve tekrar', () => {
    expect(buildPersonalRecordWhere(personalRecordFilterSchema.parse({}))).toEqual({});
    expect(buildPersonalRecordWhere(personalRecordFilterSchema.parse({ reps: '5' }))).toEqual({
      reps: 5,
    });
  });

  it('⚠️ `workoutSetId: null` HATA DEĞİL, İŞARET — DTO`da taşınıyor', async () => {
    /*
     * `onDelete: SetNull`: antrenman silindiğinde setler cascade ile gider ve
     * rekor kaynaksız kalır. Normal akışta oluşmaz (`deleteWorkoutAction`
     * hesabı tetikliyor) ama o çağrı düşerse `null` tutarsızlığı GÖRÜNÜR
     * kılıyor. DTO'dan düşürmek onu gizlemek olurdu.
     */
    const h = prClient([{ ...PR_SATIR, workoutSetId: null }]);
    const sonuc = await fetchPersonalRecords(personalRecordFilterSchema.parse({}), h.client);

    expect(sonuc.items[0]?.workoutSetId).toBeNull();
  });

  it('⚠️ egzersiz rekorları SAYFALANMIYOR ve ÜST SINIRI YOK — ölçülen fark', async () => {
    /*
     * `fetchHealthTrend`te `TREND_MAX_DAYS` gerekmişti çünkü satır sayısı GÜN
     * sayısıyla büyüyordu (beş yıl = 1825 satır). Burada rekor sayısı
     * `@@unique([exerciseId, reps])` ile tavanlı: set geçmişi ne kadar büyürse
     * büyüsün rekor sayısı BÜYÜMÜYOR. Kuralı kopyalamak gereksiz bir sınır
     * koyardı.
     */
    const h = prClient();
    await fetchRecordsForExercise('ex_1', h.client);

    const args = h.findMany.mock.calls[0]?.[0];
    expect(args.take).toBeUndefined();
    expect(args.skip).toBeUndefined();
    expect(args.orderBy).toEqual([{ reps: 'asc' }]);
  });
});

/* ===========================================================================
 * ⚠️ `Decimal` YÜZEYLERİ — ADR-014/D (`decimal-yuzey-sayimi` kapısının istediği)
 * ======================================================================== */

describe('⚠️ hiçbir DTO yüzeyi `Decimal` sızdırmıyor', () => {
  it('yedi yüzeyin hepsi ölçüldü', async () => {
    /*
     * `WorkoutSet.weightKg` ve `PersonalRecord.weightKg` ikisi de
     * `Decimal(6,2)` → ölçek 2. Prisma `Decimal` bir `Decimal.js` NESNESİ ve
     * Server → Client sınırında serialize EDİLEMEZ; tip sistemi bu kaçağı
     * GÖRMEZ (nesne yapısal olarak her yere uyar).
     */
    const w = workoutClient([{ ...W_SATIR, _count: { sets: 1 }, sets: [SET_SATIR] }], 1);
    const p = prClient();
    const s = setClient();

    expect(decimalKalanlar(toWorkoutSetDto(SET_SATIR as never))).toEqual([]);
    expect(decimalKalanlar(await fetchWorkouts(workoutFilterSchema.parse({}), w.client))).toEqual(
      [],
    );
    expect(decimalKalanlar(await fetchWorkoutById('w_1', w.client))).toEqual([]);
    expect(
      decimalKalanlar(
        await createWorkout(createWorkoutSchema.parse({ date: '2026-10-14' }), w.client),
      ),
    ).toEqual([]);
    expect(
      decimalKalanlar(await updateWorkout(updateWorkoutSchema.parse({ id: 'w_1' }), w.client)),
    ).toEqual([]);
    expect(
      decimalKalanlar(await fetchPersonalRecords(personalRecordFilterSchema.parse({}), p.client)),
    ).toEqual([]);
    expect(decimalKalanlar(await fetchRecordsForExercise('ex_1', p.client))).toEqual([]);

    // Yazma yolları da aynı eşleyiciden geçiyor (T-107a'nın ölçtüğü paylaşım).
    expect(
      decimalKalanlar(
        await createWorkoutSet(
          createWorkoutSetSchema.parse({
            workoutId: 'w_1',
            exerciseId: 'ex_1',
            setNo: 1,
            reps: 5,
            weightKg: '100.50',
          }),
          s.client,
        ),
      ),
    ).toEqual([]);
  });

  it('ölçek 2 — `Decimal(6,2)` sütununun hassasiyeti', () => {
    expect(toWorkoutSetDto(SET_SATIR as never).weightKg).toBe('100.50');
  });

  it('⚠️ ağırlıksız set `null` KALIYOR — sıfır OLMUYOR', () => {
    // `0.00` yazmak sahte bir ölçüm üretirdi ve 0 kg bir REKOR olurdu;
    // hesaplayıcı ağırlıksız setleri tam bu yüzden eliyor.
    expect(toWorkoutSetDto({ ...SET_SATIR, weightKg: null } as never).weightKg).toBeNull();
  });

  it('rekorda `weightKg` zorunlu — `!` yerine taban değer', () => {
    // Sütun `Decimal` (opsiyonel DEĞİL), yani `null` gelmesi mümkün değil.
    // `!` koymak, bir gün sütun nullable yapılırsa SESSİZCE `null` sızdırırdı.
    const kaynak = kod('src/server/services/personal-record.ts');
    expect(kaynak).toContain("?? '0.00'");
  });
});

/* ===========================================================================
 * KAPILAR — önbellek, adlandırma, kapsam
 * ======================================================================== */

describe('kapılar', () => {
  const dosyalar = [
    'src/server/services/exercise.ts',
    'src/server/services/workout.ts',
    'src/server/services/workout-set.ts',
    'src/server/services/personal-record.ts',
  ];

  it.each(dosyalar)('%s — ÖNBELLEK YOK (`unstable_cache`/`revalidateTag`)', (yol) => {
    const kaynak = kod(yol);
    expect(kaynak).not.toContain('unstable_cache');
    expect(kaynak).not.toContain('revalidateTag');
    expect(kaynak).not.toContain('next/cache');
  });

  it.each(dosyalar)('%s — okuma işlevleri `fetchX`, `getX` DEĞİL', (yol) => {
    // `getX` önbellekli public okumaya ayrılmış (ADR-011); bu dört model
    // public tarafta HİÇ görünmüyor.
    expect(kod(yol)).not.toMatch(/export (async )?function get[A-Z]/);
  });

  it('⚠️ `ContentEntity` birleşiminde antrenman YOK — public yüzey yok', () => {
    const kaynak = kod('src/server/services/_shared/content-cache.ts');
    for (const model of ['Exercise', 'Workout', 'PersonalRecord']) {
      expect(kaynak).not.toContain(model);
    }
  });

  it('`cached.ts` bu dört servisten HİÇBİRİNİ okumuyor', () => {
    const kaynak = kod('src/server/services/cached.ts');
    for (const ad of ['exercise', 'workout', 'personal-record']) {
      expect(kaynak).not.toContain(`./${ad}`);
    }
  });

  /*
   * ⚠️ BURADA T-111'İN KAPSAM KİLİDİ VARDI: "`Habit`/`Goal`/`JournalEntry`
   * YAZILMADI". Kart onları bir sonraki tura bırakmıştı ("tek turda dokuz model
   * fazla"). T-112 o tur — kilit tasarlandığı gibi ATEŞLENDİ ve silindi.
   * Kapsam ayrımı artık dosya sınırında: o dört servisin testleri
   * `services/hayat.test.ts`te.
   */

  it('`BigInt` yok — `Decimal` dizeye çevriliyor (ADR-014/D)', () => {
    for (const yol of dosyalar) expect(kod(yol)).not.toContain('BigInt');
  });
});
