import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toDiffSummary } from '@/server/services/audit-log';

/**
 * ANTRENMAN MODÜLÜ SERVER ACTION'LARI — §7.1, §8.19, ADR-021, T-111.
 *
 * ⚠️ BU DOSYANIN İKİ KRİTİK BLOĞU:
 *   1. CASCADE DELİĞİ — antrenman silinince rekor hesabı ÇAĞRILIYOR ve SIRA
 *      doğru (etkilenenler SİLMEDEN ÖNCE okunuyor).
 *   2. İŞLEM BÜTÜNLÜĞÜ — hesap patlarsa mutasyon da yazılmıyor.
 */

const { authMock, writesRevokedMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  writesRevokedMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));

const { dbMock, izle } = vi.hoisted(() => {
  const dec = (v: string) => ({ toFixed: (n = 2) => Number(v).toFixed(n) });
  const izle: string[] = [];

  const exSatir = {
    id: 'ex_1',
    name: 'Bench Press',
    muscleGroup: 'CHEST',
    equipment: 'BARBELL',
    isArchived: false,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  };

  const wSatir = {
    id: 'w_1',
    date: new Date('2026-10-14T00:00:00.000Z'),
    type: 'GYM',
    durationMin: 75,
    feeling: 4,
    note: null,
    createdAt: new Date('2026-10-14T18:00:00.000Z'),
    updatedAt: new Date('2026-10-14T18:00:00.000Z'),
  };

  const setSatir = {
    id: 'ws_1',
    workoutId: 'w_1',
    exerciseId: 'ex_1',
    setNo: 1,
    reps: 5,
    weightKg: dec('100.5'),
    rpe: 8,
    exercise: { name: 'Bench Press' },
  };

  const db = {
    exercise: {
      create: vi.fn().mockResolvedValue(exSatir),
      update: vi.fn().mockResolvedValue(exSatir),
    },
    workout: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(wSatir),
      update: vi.fn().mockResolvedValue(wSatir),
      delete: vi.fn().mockImplementation(() => {
        izle.push('workout.delete');
        return Promise.resolve(wSatir);
      }),
    },
    workoutSet: {
      create: vi.fn().mockResolvedValue(setSatir),
      update: vi.fn().mockResolvedValue(setSatir),
      delete: vi.fn().mockResolvedValue({ id: 'ws_1', exerciseId: 'ex_1', workoutId: 'w_1' }),
      findUnique: vi.fn().mockResolvedValue({ exerciseId: 'ex_1' }),
      findMany: vi.fn().mockImplementation((args: { where: Record<string, unknown> }) => {
        // İki ayrı çağrı aynı yüzeyi paylaşıyor: etkilenen egzersizler
        // (`workoutId` ile) ve hesaplayıcının set taraması (`exerciseId` ile).
        if ('workoutId' in args.where) {
          izle.push('etkilenenler');
          return Promise.resolve([{ exerciseId: 'ex_1' }, { exerciseId: 'ex_2' }]);
        }
        izle.push('hesap');
        return Promise.resolve([]);
      }),
    },
    personalRecord: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    // Etkileşimli işlem taklidi — AYNI istemciyi veriyor, yani çağrı sırası
    // gerçek kod yolunda olduğu gibi ölçülebiliyor.
    $transaction: vi.fn().mockImplementation((work: (tx: unknown) => Promise<unknown>) => {
      izle.push('tx:basladi');
      return work(db);
    }),
  };

  return { dbMock: db, izle };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

const { archiveExerciseAction, createExerciseAction, updateExerciseAction } =
  await import('@/server/actions/exercise');
const { createWorkoutAction, deleteWorkoutAction, updateWorkoutAction } =
  await import('@/server/actions/workout');
const { createWorkoutSetAction, deleteWorkoutSetAction, updateWorkoutSetAction } =
  await import('@/server/actions/workout-set');

const CUID = 'c'.repeat(25);

const GECERLI_SET = {
  workoutId: CUID,
  exerciseId: CUID,
  setNo: 1,
  reps: 5,
  weightKg: '100.50',
};

beforeEach(() => {
  vi.clearAllMocks();
  izle.length = 0;
  authMock.mockResolvedValue({ user: { id: 'usr_1' }, tokenIssuedAt: 1_800_000_000 });
  writesRevokedMock.mockResolvedValue(false);

  /*
   * ⚠️ `clearAllMocks` ÇAĞRILARI siler, UYGULAMALARI silmez. Bir testte
   * `mockResolvedValue` ile değiştirilen rekor yüzeyi sonraki testlere SIZAR
   * ve ikisini de yanlış yeşil/kırmızı yapar — bu dosyada tam olarak oldu
   * (`deleteMany` `{count: 1}` olarak kaldı). Varsayılanlar her testte geri
   * yazılıyor; tek seferlik sapmalar `mockResolvedValueOnce` ile.
   */
  dbMock.personalRecord.findMany.mockResolvedValue([]);
  dbMock.personalRecord.deleteMany.mockResolvedValue({ count: 0 });
  dbMock.personalRecord.updateMany.mockResolvedValue({ count: 0 });
  dbMock.personalRecord.upsert.mockResolvedValue({});
});

function sonDiff(): unknown {
  const cagri = dbMock.auditLog.create.mock.calls.at(-1);
  return (cagri?.[0] as { data: { diff: unknown } }).data.diff;
}

function sonKayit(): { action: string; entity: string } {
  return (
    dbMock.auditLog.create.mock.calls.at(-1)?.[0] as { data: { action: string; entity: string } }
  ).data;
}

/* ===========================================================================
 * YETKİ — dokuz eylem, dokuz kapı
 * ======================================================================== */

describe('yetki kapısı — DOKUZ eylemin HEPSİ', () => {
  const eylemler = [
    ['exercise:create', () => createExerciseAction({ name: 'X', muscleGroup: 'CHEST' })],
    ['exercise:update', () => updateExerciseAction({ id: CUID, name: 'Y' })],
    ['exercise:archive', () => archiveExerciseAction({ id: CUID, isArchived: true })],
    ['workout:create', () => createWorkoutAction({ date: '2026-10-14' })],
    ['workout:update', () => updateWorkoutAction({ id: CUID, feeling: 3 })],
    ['workout:delete', () => deleteWorkoutAction({ id: CUID })],
    ['set:create', () => createWorkoutSetAction(GECERLI_SET)],
    ['set:update', () => updateWorkoutSetAction({ id: CUID, reps: 6 })],
    ['set:delete', () => deleteWorkoutSetAction({ id: CUID })],
  ] as const;

  it.each(eylemler)('%s — oturum YOKSA yazma YOK', async (_ad, cagir) => {
    authMock.mockResolvedValue(null);

    expect((await cagir()).ok).toBe(false);
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it.each(eylemler)('%s — YAZMA YETKİSİ İPTALLİYSE yazma YOK (ADR-035/B)', async (_ad, cagir) => {
    writesRevokedMock.mockResolvedValue(true);

    expect((await cagir()).ok).toBe(false);
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * ⚠️⚠️ CASCADE DELİĞİ — bu kartın en pahalı sessiz hatası
 * ======================================================================== */

describe('⚠️⚠️ antrenman silinince rekor hesabı ÇAĞRILIYOR', () => {
  it('⚠️ SIRA DOĞRU: etkilenenler SİLMEDEN ÖNCE okunuyor', async () => {
    /*
     * `WorkoutSet.workoutId` `onDelete: Cascade`. Antrenman silindiğinde
     * setleri VERİTABANI yok ediyor ve bu yol set servisinden GEÇMİYOR — yani
     * hesap kendiliğinden tetiklenmiyor.
     *
     * ⚠️ Etkilenen egzersizleri silmeden SONRA okumak İMKÂNSIZ: setler artık
     * yok ve "hangi hareketlerin rekoru etkilendi" sorusu CEVAPSIZ kalır.
     * Rekorlar ekranda kalır ve kullanıcı bir daha asla ulaşamayacağı bir
     * rekoru kırmaya çalışır — ADR-021'in "F5'in en olası sessiz hatası".
     */
    const sonuc = await deleteWorkoutAction({ id: CUID });

    expect(sonuc.ok).toBe(true);
    expect(izle.indexOf('etkilenenler')).toBeGreaterThanOrEqual(0);
    expect(izle.indexOf('etkilenenler')).toBeLessThan(izle.indexOf('workout.delete'));
    expect(izle.lastIndexOf('hesap')).toBeGreaterThan(izle.indexOf('workout.delete'));
  });

  it('⚠️ ÜÇÜ DE AYNI İŞLEM İÇİNDE', async () => {
    await deleteWorkoutAction({ id: CUID });

    expect(dbMock.$transaction).toHaveBeenCalledOnce();
    expect(izle[0]).toBe('tx:basladi');
  });

  it('etkilenen HER egzersiz hesaplanıyor — ikisi de', async () => {
    await deleteWorkoutAction({ id: CUID });

    const hesaplanan = dbMock.workoutSet.findMany.mock.calls
      .map((c) => (c[0] as { where: { exerciseId?: string } }).where.exerciseId)
      .filter(Boolean);
    expect(hesaplanan).toEqual(['ex_1', 'ex_2']);
  });

  it('kaldırılan rekor sayısı KULLANICIYA dönüyor — sessizce yapılmıyor', async () => {
    dbMock.personalRecord.findMany.mockResolvedValue([{ id: 'pr_1', reps: 5 }]);
    dbMock.personalRecord.deleteMany.mockResolvedValue({ count: 1 });

    const sonuc = await deleteWorkoutAction({ id: CUID });
    expect(sonuc.ok === true && sonuc.data.recordsRemoved).toBe(2);
  });

  it('silme denetim kaydı GÜNÜ ve hesabın SONUCUNU taşıyor', async () => {
    await deleteWorkoutAction({ id: CUID });

    expect(sonKayit()).toMatchObject({ action: 'DELETE', entity: 'Workout' });
    /*
     * ⚠️ ALANLAR DÜZ ve bunu T-053'ün okuyucusu ölçtürdü: ilk yazdığım
     * `{ recordsRecalculated: { upserted, removed } }` iç içeydi ve
     * `toDiffSummary` iç içe nesneleri DÜZLEŞTİRİYOR — denetim ekranında
     * `recordsRecalculated.upserted` diye tuhaf iki satır görünürdü.
     */
    expect(toDiffSummary(sonDiff()).fields.sort()).toEqual([
      'day',
      'recordsRemoved',
      'recordsUpserted',
    ]);
  });
});

describe('⚠️ TARİH DEĞİŞİKLİĞİ de hesap gerektiriyor', () => {
  it('`date` güncellenince hesap ÇAĞRILIYOR', async () => {
    /*
     * `PersonalRecord.date` setin antrenmanının gününden TÜRETİLİYOR, ve
     * eşitlik kıyası günü kullandığı için (Karar 2 — "önce olan gün kazanır")
     * hangi setin rekor olduğu bile değişebilir.
     */
    await updateWorkoutAction({ id: CUID, date: '2026-10-13' });

    expect(izle).toContain('etkilenenler');
    expect(izle).toContain('hesap');
  });

  it('⚠️ `date` DIŞINDAKİ alanlar hesabı tetiklemiyor — karşılığı olmayan maliyet', async () => {
    // `type`, `durationMin`, `feeling`, `note` rekor hesabına HİÇ girmiyor.
    await updateWorkoutAction({ id: CUID, feeling: 2, durationMin: 60 });

    expect(izle).not.toContain('etkilenenler');
    expect(izle).not.toContain('hesap');
    expect(dbMock.personalRecord.upsert).not.toHaveBeenCalled();
  });

  it('hesap koşmadıysa `recordsRecalculated` diff`te YOK', async () => {
    await updateWorkoutAction({ id: CUID, feeling: 2 });
    expect(toDiffSummary(sonDiff()).fields).not.toContain('recordsUpserted');
    expect(toDiffSummary(sonDiff()).fields).not.toContain('recordsRemoved');
  });

  it('⚠️ YENİ antrenmanda hesap YOK — henüz SETİ YOK', async () => {
    await createWorkoutAction({ date: '2026-10-14' });

    expect(izle).not.toContain('hesap');
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * ⚠️ İŞLEM BÜTÜNLÜĞÜ
 * ======================================================================== */

describe('⚠️ hesap patlarsa MUTASYON DA yazılmıyor', () => {
  it('set eklemede hesap hatası işlemi geri sarıyor', async () => {
    /*
     * Ayrı olsalardı üretilecek hata, hesabı hiç yapmamaktan DAHA kötü: set
     * yazılmış, hesap patlamış, kullanıcı "kaydedildi" cevabını almış olurdu.
     * Rekorlar eski değerde kalır ve hiçbir yerde iz yoktur.
     */
    dbMock.personalRecord.upsert.mockRejectedValueOnce(new Error('hesap patladı'));
    dbMock.workoutSet.findMany.mockResolvedValueOnce([
      { id: 'ws_1', reps: 5, weightKg: '100.00', workout: { date: new Date('2026-10-14') } },
    ]);

    const sonuc = await createWorkoutSetAction(GECERLI_SET);

    expect(sonuc.ok).toBe(false);
    // Denetim kaydı da YAZILMIYOR: başarısız bir mutasyon bir SONUÇ değil (ADR-022).
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('set mutasyonları İŞLEM içinde koşuyor', async () => {
    await createWorkoutSetAction(GECERLI_SET);
    expect(dbMock.$transaction).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    await deleteWorkoutSetAction({ id: CUID });
    expect(dbMock.$transaction).toHaveBeenCalledOnce();
  });
});

/* ===========================================================================
 * DENETİM KAYDI — `HealthLog`UN TERSİ, ve sebebi ölçüt
 * ======================================================================== */

describe('denetim kaydı — SET DEĞERLERİ yazılıyor (T-110`un tersi)', () => {
  it('⚠️ `reps` ve `weightKg` diff`te VAR', async () => {
    /*
     * T-110'da sağlık değerlerini yazmadım. Aynı ölçüt, farklı cevap: bir set
     * PERFORMANS kaydıdır, vücut ölçümü değil. KVKK özel nitelikli kategorisine
     * girmiyor ("100 kg kaldırdım" ile "82,5 kg'ım" aynı sınıf değil) ve "bu
     * rekoru doğuran set neydi" MEŞRU bir soru — rekor türetilmiş olduğu için
     * kaynağın izi denetim değeri taşıyor.
     */
    await createWorkoutSetAction(GECERLI_SET);

    const diff = JSON.stringify(sonDiff());
    expect(diff).toContain('100.50');
    expect(diff).toContain('"reps"');
  });

  it('⚠️ HESABIN SONUCU da yazılıyor — eylemler SONUÇTUR (ADR-022)', async () => {
    // Bir set eklemenin sonucu yalnızca satır değil, rekorların DEĞİŞMESİ.
    await createWorkoutSetAction(GECERLI_SET);

    const diff = sonDiff() as { recordsUpserted?: number; recordsRemoved?: number };
    expect(diff.recordsUpserted).toBe(0);
    expect(diff.recordsRemoved).toBe(0);
  });

  it('rekorların KENDİSİ yazılmıyor — sayı yeterli', async () => {
    await createWorkoutSetAction(GECERLI_SET);

    const alanlar = toDiffSummary(sonDiff()).fields;
    expect(alanlar).toContain('recordsUpserted');
    expect(alanlar).toContain('recordsRemoved');

    /*
     * Hesap hakkında SAYIDAN BAŞKA alan yok: rekorların ağırlığı, tekrarı ve
     * kimliği yazılmıyor çünkü onlar `PersonalRecord` tablosunda ve ORADA
     * güncel. (Setin KENDİ `weightKg`si diff'te VAR ve olmalı — o mutasyonun
     * içeriği, hesabın sonucu değil.)
     */
    const rekorAlanlari = alanlar.filter((a) => a.startsWith('records'));
    expect(rekorAlanlari.sort()).toEqual(['recordsRemoved', 'recordsUpserted']);
  });

  it('egzersiz alanları yazılıyor — referans veri, hassas değil', async () => {
    await createExerciseAction({ name: 'Bench Press', muscleGroup: 'CHEST' });

    expect(sonKayit()).toMatchObject({ action: 'CREATE', entity: 'Exercise' });
    expect(JSON.stringify(sonDiff())).toContain('CHEST');
  });

  it('⚠️ ARŞİVLEME `UPDATE` olarak kaydediliyor, `DELETE` DEĞİL', async () => {
    // `DELETE` yazmak denetim ekranında kaydın yok olduğunu söylerdi; oysa
    // egzersiz ve TÜM rekorları yerinde.
    await archiveExerciseAction({ id: CUID, isArchived: true });

    expect(sonKayit()).toMatchObject({ action: 'UPDATE', entity: 'Exercise' });
    expect(sonDiff()).toEqual({ isArchived: true });
  });

  it('güncelleme diff`i `id` TAŞIMIYOR — kimlik `entityId`de', async () => {
    await updateExerciseAction({ id: CUID, name: 'Barbell Bench Press' });
    expect(toDiffSummary(sonDiff()).fields).not.toContain('id');
  });

  it('dokuz eylemin varlık adları doğru', async () => {
    await createWorkoutAction({ date: '2026-10-14' });
    expect(sonKayit().entity).toBe('Workout');

    await createWorkoutSetAction(GECERLI_SET);
    expect(sonKayit().entity).toBe('WorkoutSet');

    await deleteWorkoutSetAction({ id: CUID });
    expect(sonKayit()).toMatchObject({ action: 'DELETE', entity: 'WorkoutSet' });
  });
});

/* ===========================================================================
 * DOĞRULAMA VE HATA YOLLARI
 * ======================================================================== */

describe('doğrulama ve hatalar', () => {
  it('geçersiz girdi şemada reddediliyor — servis çağrılmıyor', async () => {
    const sonuc = await createWorkoutSetAction({ ...GECERLI_SET, reps: 0 });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.fields?.reps).toBeTruthy();
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it('saat taşıyan tarih reddediliyor (ADR-016)', async () => {
    const sonuc = await createWorkoutAction({ date: '2026-10-14T10:00:00Z' });
    expect(sonuc.ok === false && sonuc.error.fields?.date).toBeTruthy();
  });

  it('`weightKg` 2 ondalıktan fazlasını kabul etmiyor — sütun `Decimal(6,2)`', async () => {
    const sonuc = await createWorkoutSetAction({ ...GECERLI_SET, weightKg: '100.555' });
    expect(sonuc.ok === false && sonuc.error.fields?.weightKg).toBeTruthy();
  });

  it('⚠️ egzersiz adı ÇİFTLENİRSE CONFLICT — rekorları bölerdi', async () => {
    // "Bench Press" iki kez varsa rekorlar ikiye bölünür ve ikisi de yanlış
    // olur (`@@unique([exerciseId, reps])` egzersiz BAŞINA).
    dbMock.exercise.create.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    const sonuc = await createExerciseAction({ name: 'Bench Press', muscleGroup: 'CHEST' });
    expect(sonuc.ok === false && sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.ok === false && sonuc.error.message).toContain('rekorları böler');
    // Varsayılan P2002 metni slug'a özeldi; burada anlamsız kalırdı.
    expect(sonuc.ok === false && sonuc.error.message).not.toContain('slug');
  });

  it('⚠️ aynı set numarası CONFLICT — hacim hesabını bozardı', async () => {
    dbMock.workoutSet.create.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    const sonuc = await createWorkoutSetAction(GECERLI_SET);
    expect(sonuc.ok === false && sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.ok === false && sonuc.error.fields?.setNo).toBeTruthy();
  });

  it('⚠️ var olmayan egzersiz P2003 → anlaşılır metin', async () => {
    /*
     * `cuidSchema` yalnızca BİÇİMİ doğruluyor, varlığı doğrulamıyor (T-051/B'nin
     * ölçtüğü sınıf). Varsayılan P2003 metni eklentiye özeldi ("Seçilen dosya
     * bulunamadı") ve burada anlamsız kalırdı.
     */
    dbMock.workoutSet.create.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    );

    const sonuc = await createWorkoutSetAction(GECERLI_SET);
    expect(sonuc.ok === false && sonuc.error.message).toContain('egzersiz');
    expect(sonuc.ok === false && sonuc.error.message).not.toContain('dosya');
  });

  it('kayıt yoksa P2025 → NOT_FOUND', async () => {
    dbMock.workout.delete.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'P2025' }),
    );

    const sonuc = await deleteWorkoutAction({ id: CUID });
    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
  });

  it('bilinmeyen hata INTERNAL_ERROR — sessizce başarı dönmüyor', async () => {
    dbMock.exercise.update.mockRejectedValueOnce(new Error('beklenmedik'));

    const sonuc = await updateExerciseAction({ id: CUID, name: 'X' });
    expect(sonuc.ok === false && sonuc.error.code).toBe('INTERNAL_ERROR');
  });

  /*
   * ⚠️ HER MUTASYONUN HATA YOLU AYRI AYRI — çünkü her biri KENDİ
   * `toFailure` geçersiz kılmasını taşıyor. Yalnızca `create`i sınamak,
   * `update`in varsayılan P2002 metnine (slug'a özel, burada anlamsız)
   * düşmesini ÖLÇÜLMEMİŞ bırakırdı.
   */
  it('set GÜNCELLEMEDE set numarası çakışması CONFLICT', async () => {
    dbMock.workoutSet.update.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    const sonuc = await updateWorkoutSetAction({ id: CUID, setNo: 2 });
    expect(sonuc.ok === false && sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.ok === false && sonuc.error.fields?.setNo).toBeTruthy();
    expect(sonuc.ok === false && sonuc.error.message).not.toContain('slug');
  });

  it('set GÜNCELLEMEDE var olmayan egzersiz P2003 → anlaşılır metin', async () => {
    dbMock.workoutSet.update.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    );

    const sonuc = await updateWorkoutSetAction({ id: CUID, exerciseId: CUID });
    expect(sonuc.ok === false && sonuc.error.message).toContain('egzersiz');
    expect(sonuc.ok === false && sonuc.error.message).not.toContain('dosya');
  });

  it('set SİLMEDE kayıt yoksa NOT_FOUND', async () => {
    dbMock.workoutSet.delete.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'P2025' }),
    );

    const sonuc = await deleteWorkoutSetAction({ id: CUID });
    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('antrenman eklemede hata INTERNAL_ERROR', async () => {
    dbMock.workout.create.mockRejectedValueOnce(new Error('beklenmedik'));
    expect((await createWorkoutAction({ date: '2026-10-14' })).ok).toBe(false);
  });

  it('antrenman güncellemede hata INTERNAL_ERROR — hesap da yazılmıyor', async () => {
    dbMock.workout.update.mockRejectedValueOnce(new Error('beklenmedik'));

    const sonuc = await updateWorkoutAction({ id: CUID, date: '2026-10-13' });
    expect(sonuc.ok).toBe(false);
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('arşivlemede hata INTERNAL_ERROR', async () => {
    dbMock.exercise.update.mockRejectedValueOnce(new Error('beklenmedik'));
    expect((await archiveExerciseAction({ id: CUID, isArchived: true })).ok).toBe(false);
  });

  it('BOŞ kimlik şemada reddediliyor — üç yolda da', async () => {
    /*
     * ⚠️ "cuid biçimi" DEĞİL, BOŞLUK ölçülüyor — ve farkı ölçtüm:
     * `cuidSchema` bilinçli olarak GEVŞEK (`common.ts`: *"Gevşek tutuldu:
     * uzunluk kontrolü yeterli"*), yani `'cuid-degil'` şemayı GEÇİYOR.
     * Önce onu reddettiğini varsayan bir test yazdım ve kırıldı.
     *
     * Varsayım yanlıştı ama kapı YOK değil, SONRAKİ katmanda: var olmayan
     * kimlik veritabanına gider ve P2025 → NOT_FOUND olur (yukarıda ölçülü).
     * Biçim doğrulaması kimliğin VARLIĞINI hiçbir zaman garanti edemezdi;
     * T-051/B'nin dersi tam olarak bu.
     */
    for (const cagir of [
      () => deleteWorkoutAction({ id: '' }),
      () => deleteWorkoutSetAction({ id: '' }),
      () => archiveExerciseAction({ id: '', isArchived: true }),
    ]) {
      const sonuc = await cagir();
      expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    }
    expect(dbMock.$transaction).not.toHaveBeenCalled();
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('egzersiz güncellemede ad çakışması CONFLICT — ekleme ile AYNI metin', async () => {
    dbMock.exercise.update.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    const sonuc = await updateExerciseAction({ id: CUID, name: 'Bench Press' });
    expect(sonuc.ok === false && sonuc.error.message).toContain('rekorları böler');
  });
});
