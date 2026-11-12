import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => {
  const dbMock = {
    takvimEtkinligi: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    programDay: { findUnique: vi.fn() },
    $transaction: vi.fn(async (is: (tx: unknown) => unknown) => is(dbMock)),
  };
  return { dbMock };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

import { sporTakvimSchema, type SporTakvimGirdisi } from '@/lib/schemas/takvim';
import { sporPlanOzeti } from '@/lib/takvim/spor';
import { appDayToDate, appWallClockInstant } from '@/server/services/_shared/app-date';
import {
  fetchSporTakvimPlanlari,
  fetchTakvim,
  ilkAntrenmanGunu,
  sporTakvimKaldir,
  sporTakvimKaydet,
  SporTakvimCakismasi,
  TakvimHatasi,
} from '@/server/services/takvim';

/**
 * SPOR PROGRAMI → TAKVİM (2026-11-12): program günü haftalık Spor etkinliği olur, aynı gün
 * ikinci kez eklenmez (düzenleme önerilir), takvimden "Antrenmana başla" o güne bağlanır.
 */

const DAY = 'ckprogramgunu0000000000001';
const girdi = (g: Partial<SporTakvimGirdisi> = {}): SporTakvimGirdisi =>
  sporTakvimSchema.parse({
    dayId: DAY,
    gunler: [4, 1],
    saat: '18:30',
    sureDk: 75,
    baslangicGun: '2026-11-11', // çarşamba
    bitisGun: null,
    hatirlatmalar: [30],
    ...g,
  });

function satir(e: Record<string, unknown> = {}) {
  return {
    id: 'plan1',
    baslik: 'İtiş (Push)',
    aciklama: null,
    konum: null,
    kategori: 'SPOR',
    tumGun: false,
    baslangic: appWallClockInstant('2026-11-12', 18 * 60 + 30),
    bitis: appWallClockInstant('2026-11-12', 19 * 60 + 45),
    tekrar: 'HAFTALIK',
    tekrarAralik: 1,
    tekrarGunleri: [1, 4],
    tekrarBitis: null,
    tekrarSayisi: null,
    istisnalar: [] as Date[],
    hatirlatmalar: [30],
    seriId: null,
    programDayId: DAY,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...e,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.programDay.findUnique.mockResolvedValue({
    name: 'İtiş (Push)',
    focus: 'Göğüs / Omuz',
    isArchived: false,
  });
  dbMock.takvimEtkinligi.findMany.mockResolvedValue([]);
  dbMock.takvimEtkinligi.create.mockResolvedValue({ id: 'yeni' });
});

describe('sporTakvimSchema', () => {
  it('günler tekilleşir ve sıralanır; en az bir gün şart', () => {
    expect(girdi({ gunler: [4, 1, 4] }).gunler).toEqual([1, 4]);
    expect(sporTakvimSchema.safeParse({ ...girdi(), gunler: [] }).success).toBe(false);
  });

  it('süre 15–300 dk; bitiş başlangıçtan önce olamaz', () => {
    expect(sporTakvimSchema.safeParse({ ...girdi(), sureDk: 10 }).success).toBe(false);
    expect(sporTakvimSchema.safeParse({ ...girdi(), sureDk: 301 }).success).toBe(false);
    const r = sporTakvimSchema.safeParse({ ...girdi(), bitisGun: '2026-11-01' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['bitisGun']);
  });
});

describe('ilkAntrenmanGunu', () => {
  it('başlangıçtan sonraki ilk seçili hafta günü', () => {
    expect(ilkAntrenmanGunu('2026-11-11', [1, 4])).toBe('2026-11-12'); // çar → per
    expect(ilkAntrenmanGunu('2026-11-11', [3])).toBe('2026-11-11');
    expect(ilkAntrenmanGunu('2026-11-14', [1])).toBe('2026-11-16'); // cmt → pzt
  });
});

describe('sporTakvimKaydet', () => {
  it('haftalık Spor etkinliği açar: başlık gün adı, ilk oluşum ilk seçili gün, süre ve bağ', async () => {
    expect(await sporTakvimKaydet(girdi(), '2026-11-12')).toEqual({ id: 'yeni', durum: 'yeni' });
    const data = dbMock.takvimEtkinligi.create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({
      baslik: 'İtiş (Push)',
      aciklama: 'Göğüs / Omuz',
      kategori: 'SPOR',
      tumGun: false,
      tekrar: 'HAFTALIK',
      tekrarGunleri: [1, 4],
      tekrarBitis: null,
      hatirlatmalar: [30],
      programDayId: DAY,
      istisnalar: [],
    });
    expect(data.baslangic).toEqual(appWallClockInstant('2026-11-12', 18 * 60 + 30));
    expect(data.bitis.getTime() - data.baslangic.getTime()).toBe(75 * 60_000);
  });

  it('⚠️ aynı gün zaten takvimdeyse SESSİZCE çiftlemez — mevcut planla çakışma', async () => {
    dbMock.takvimEtkinligi.findMany.mockResolvedValue([satir()]);
    const hata = await sporTakvimKaydet(girdi(), '2026-11-12').catch((e: unknown) => e);
    expect(hata).toBeInstanceOf(SporTakvimCakismasi);
    expect((hata as SporTakvimCakismasi).mevcut).toMatchObject({
      id: 'plan1',
      gunler: [1, 4],
      saat: '18:30',
      sureDk: 75,
    });
    expect(dbMock.takvimEtkinligi.create).not.toHaveBeenCalled();
  });

  it('bitmiş eski plan çakışma sayılmaz', async () => {
    dbMock.takvimEtkinligi.findMany.mockResolvedValue([
      satir({ tekrarBitis: appDayToDate('2026-10-01') }),
    ]);
    expect((await sporTakvimKaydet(girdi(), '2026-11-12')).durum).toBe('yeni');
  });

  it('`id` ile mevcut planı günceller (istisnalar sıfırlanır)', async () => {
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue(satir());
    const sonuc = await sporTakvimKaydet(girdi({ id: 'plan1', gunler: [2], saat: '07:00' }));
    expect(sonuc).toEqual({ id: 'plan1', durum: 'guncellendi' });
    expect(dbMock.takvimEtkinligi.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'plan1' },
      data: { tekrarGunleri: [2], istisnalar: [], programDayId: DAY },
    });
  });

  it('başka günün planı bu yoldan güncellenemez', async () => {
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue(satir({ programDayId: 'baska' }));
    await expect(sporTakvimKaydet(girdi({ id: 'plan1' }))).rejects.toBeInstanceOf(TakvimHatasi);
  });

  it('arşivlenmiş ya da olmayan gün reddedilir', async () => {
    dbMock.programDay.findUnique.mockResolvedValue({ name: 'x', focus: null, isArchived: true });
    await expect(sporTakvimKaydet(girdi())).rejects.toBeInstanceOf(TakvimHatasi);
  });

  it('bitişe kadar hiçbir seçili gün gelmiyorsa reddedilir', async () => {
    await expect(
      sporTakvimKaydet(girdi({ gunler: [1], bitisGun: '2026-11-13' })),
    ).rejects.toBeInstanceOf(TakvimHatasi);
  });
});

describe('fetchSporTakvimPlanlari ve kaldırma', () => {
  it('yalnızca süren seriler, güne göre', async () => {
    dbMock.takvimEtkinligi.findMany.mockResolvedValue([
      satir(),
      satir({ id: 'eski', tekrarBitis: appDayToDate('2026-01-01') }),
    ]);
    const planlar = await fetchSporTakvimPlanlari([DAY], '2026-11-12');
    expect(planlar[DAY]?.map((p) => p.id)).toEqual(['plan1']);
    expect(sporPlanOzeti(planlar[DAY]![0]!)).toBe('Pzt, Per · 18:30 · 1 saat 15 dk');
    expect(dbMock.takvimEtkinligi.findMany.mock.calls[0]?.[0].where).toEqual({
      programDayId: { in: [DAY] },
      seriId: null,
    });
  });

  it('boş listede veritabanına gidilmez', async () => {
    expect(await fetchSporTakvimPlanlari([])).toEqual({});
    expect(dbMock.takvimEtkinligi.findMany).not.toHaveBeenCalled();
  });

  it('yalnızca programa bağlı etkinlik bu yoldan kaldırılır', async () => {
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue({ programDayId: null });
    await expect(sporTakvimKaldir('x')).rejects.toBeInstanceOf(TakvimHatasi);
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue({ programDayId: DAY });
    await sporTakvimKaldir('plan1');
    expect(dbMock.takvimEtkinligi.delete).toHaveBeenCalledWith({ where: { id: 'plan1' } });
  });
});

describe('fetchTakvim — etkinlikte program günü ("Antrenmana başla")', () => {
  it('bağlı gün ad ve kimlikle gelir; arşivlenmişse düğme için `null`', async () => {
    dbMock.takvimEtkinligi.findMany.mockResolvedValue([
      satir({ programDay: { id: DAY, name: 'İtiş (Push)', isArchived: false } }),
      satir({ id: 'arsiv', programDay: { id: 'g2', name: 'Eski', isArchived: true } }),
    ]);
    const { etkinlikler } = await fetchTakvim('2026-11-16', '2026-11-22');
    expect(etkinlikler.find((e) => e.id === 'plan1')?.programGunu).toEqual({
      id: DAY,
      ad: 'İtiş (Push)',
    });
    expect(etkinlikler.find((e) => e.id === 'arsiv')?.programGunu).toBeNull();
  });
});
