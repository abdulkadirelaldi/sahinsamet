import { describe, expect, it, vi } from 'vitest';

import {
  createExercise,
  EgzersizCakismasi,
  egzersizAdAnahtari,
  hizliEgzersizEkle,
  updateExercise,
} from '@/server/services/exercise';

/**
 * EGZERSİZ AD ÇAKIŞMASI (2026-11-12) — sahibi "sporda yeni hareket ekleyemiyorum" dedi.
 *
 * Kök neden 1: ARŞİVDEKİ bir hareketle aynı adı girmek P2002 → "zaten var" diyordu; hareket
 * listede görünmüyordu, sahibi ne bulabiliyor ne ekleyebiliyordu. Artık çakışan kayıt
 * (arşivde olduğu bilgisiyle) çağırana veriliyor.
 * Kök neden 2: `name @unique` harfe duyarlı — "bench press" yeni bir hareket açıp rekorları
 * bölüyordu; Türkçe "İ/ı" Postgres `insensitive` ile de eşleşmiyor.
 */

const tarih = new Date('2026-08-01T10:00:00.000Z');
const satir = (e: Partial<Record<string, unknown>> = {}) => ({
  id: 'ex_1',
  name: 'İncline Dumbbell Press',
  muscleGroup: 'CHEST',
  equipment: 'DUMBBELL',
  isArchived: false,
  createdAt: tarih,
  updatedAt: tarih,
  _count: { personalRecords: 0 },
  ...e,
});

function istemci(kutuphane: ReturnType<typeof satir>[] = []) {
  const exercise = {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue(kutuphane),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn().mockResolvedValue(satir({ id: 'ex_yeni', name: 'Yeni' })),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      ...satir(),
      ...data,
    })),
  };
  return { exercise, client: { exercise } as never };
}

describe('egzersizAdAnahtari — Türkçe büyük/küçük harf ve boşluk', () => {
  it.each([
    ['İncline Press', 'incline press'],
    ['INCLINE  PRESS ', 'incline press'],
    ['ıncline press', 'incline press'],
    ['Şınav', 'şinav'],
    // JS'in Türkçe olmayan küçültmesi "İ"yi "i̇" (i + birleşen nokta) yapar.
    ['i̇ncline press', 'incline press'],
  ])('%s → %s', (girdi, beklenen) => {
    expect(egzersizAdAnahtari(girdi)).toBe(beklenen);
  });

  it('farklı hareketler ayrı kalır', () => {
    expect(egzersizAdAnahtari('Squat')).not.toBe(egzersizAdAnahtari('Front Squat'));
  });
});

describe('createExercise — aynı adlı hareket', () => {
  it('⚠️ ARŞİVDEKİ hareketle aynı ad: çakışma arşiv bilgisiyle döner, yeni satır açılmaz', async () => {
    const h = istemci([satir({ isArchived: true })]);
    const hata = await createExercise(
      { name: 'incline dumbbell press', muscleGroup: 'CHEST', equipment: 'OTHER' },
      h.client,
    ).catch((e: unknown) => e);
    expect(hata).toBeInstanceOf(EgzersizCakismasi);
    expect((hata as EgzersizCakismasi).mevcut).toMatchObject({ id: 'ex_1', isArchived: true });
    expect(h.exercise.create).not.toHaveBeenCalled();
  });

  it('harf duyarsız birebir eşleşme hızlı yoldan (veritabanı) bulunur', async () => {
    const h = istemci();
    h.exercise.findFirst.mockResolvedValue(satir());
    await expect(
      createExercise({ name: 'Bench', muscleGroup: 'CHEST', equipment: 'OTHER' }, h.client),
    ).rejects.toBeInstanceOf(EgzersizCakismasi);
    expect(h.exercise.findFirst.mock.calls[0]?.[0].where).toEqual({
      name: { equals: 'Bench', mode: 'insensitive' },
    });
    expect(h.exercise.findMany).not.toHaveBeenCalled();
  });

  it('çakışma yoksa oluşturur', async () => {
    const h = istemci([satir()]);
    const dto = await createExercise(
      { name: 'Cable Fly', muscleGroup: 'CHEST', equipment: 'CABLE' },
      h.client,
    );
    expect(dto.id).toBe('ex_yeni');
  });
});

describe('updateExercise — yeniden adlandırma', () => {
  it('BAŞKA bir hareketin adına çekilemez', async () => {
    const h = istemci([satir({ id: 'ex_2', name: 'Squat' })]);
    await expect(updateExercise({ id: 'ex_1', name: 'SQUAT' }, h.client)).rejects.toBeInstanceOf(
      EgzersizCakismasi,
    );
    expect(h.exercise.update).not.toHaveBeenCalled();
  });

  it('kendi adının harfini değiştirmek serbest', async () => {
    const h = istemci([satir()]);
    await updateExercise({ id: 'ex_1', name: 'INCLINE DUMBBELL PRESS' }, h.client);
    expect(h.exercise.update).toHaveBeenCalled();
  });
});

describe('hizliEgzersizEkle — seçicilerden yeni hareket', () => {
  const girdi = {
    name: 'incline dumbbell press',
    muscleGroup: 'CHEST',
    equipment: 'OTHER',
  } as const;

  it('aktif aynı adlı hareket SEÇİLİR, yenisi açılmaz', async () => {
    const h = istemci([satir()]);
    const sonuc = await hizliEgzersizEkle(girdi, h.client);
    expect(sonuc.durum).toBe('mevcut');
    expect(sonuc.egzersiz.id).toBe('ex_1');
    expect(h.exercise.create).not.toHaveBeenCalled();
    expect(h.exercise.update).not.toHaveBeenCalled();
  });

  it('arşivdeki aynı adlı hareket ARŞİVDEN ÇIKARILIR ve seçilir', async () => {
    const h = istemci([satir({ isArchived: true })]);
    const sonuc = await hizliEgzersizEkle(girdi, h.client);
    expect(sonuc.durum).toBe('arsivden');
    expect(h.exercise.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'ex_1' },
      data: { isArchived: false },
    });
    expect(sonuc.egzersiz.isArchived).toBe(false);
  });

  it('yoksa oluşturur', async () => {
    const h = istemci();
    const sonuc = await hizliEgzersizEkle({ ...girdi, name: 'Cable Fly' }, h.client);
    expect(sonuc.durum).toBe('yeni');
    expect(h.exercise.create).toHaveBeenCalled();
  });
});
