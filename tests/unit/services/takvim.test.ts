import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => {
  const takvimEtkinligi = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const dbMock = {
    takvimEtkinligi,
    $transaction: vi.fn(async (is: (tx: unknown) => unknown) => is(dbMock)),
  };
  return { dbMock };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

import type { TakvimGuncelleGirdisi } from '@/lib/schemas/takvim';
import { appDayToDate, appWallClockInstant } from '@/server/services/_shared/app-date';
import {
  fetchBugunTakvim,
  fetchHatirlatmaliEtkinlikler,
  fetchTakvim,
  takvimEtkinligiGuncelle,
  takvimEtkinligiOlustur,
  takvimEtkinligiSil,
  TakvimHatasi,
} from '@/server/services/takvim';

/** Veritabanı satırı: 2026-11-10 salı 09:00–10:00, her gün. */
function satir(e: Record<string, unknown> = {}) {
  return {
    id: 'seri1',
    baslik: 'Koşu',
    aciklama: null,
    konum: null,
    kategori: 'SPOR',
    tumGun: false,
    baslangic: appWallClockInstant('2026-11-10', 540),
    bitis: appWallClockInstant('2026-11-10', 600),
    tekrar: 'GUNLUK',
    tekrarAralik: 1,
    tekrarGunleri: [],
    tekrarBitis: null,
    tekrarSayisi: null,
    istisnalar: [] as Date[],
    hatirlatmalar: [30],
    seriId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...e,
  };
}

const TEKRAR_YOK = { tur: 'YOK' as const, aralik: 1, gunler: [], bitisGun: null, sayi: null };
const GUNLUK = { ...TEKRAR_YOK, tur: 'GUNLUK' as const };

function girdi(g: Partial<TakvimGuncelleGirdisi> = {}): TakvimGuncelleGirdisi {
  return {
    id: 'seri1',
    kapsam: 'tum',
    olusumGun: '2026-11-12',
    baslik: 'Koşu',
    aciklama: null,
    konum: null,
    kategori: 'SPOR',
    tumGun: false,
    baslangicGun: '2026-11-12',
    baslangicSaat: '09:00',
    bitisGun: '2026-11-12',
    bitisSaat: '10:00',
    tekrar: GUNLUK,
    hatirlatmalar: [30],
    ...g,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.takvimEtkinligi.create.mockResolvedValue({ id: 'yeni1' });
  dbMock.takvimEtkinligi.update.mockResolvedValue({ id: 'seri1' });
  dbMock.takvimEtkinligi.delete.mockResolvedValue({ id: 'seri1' });
  dbMock.takvimEtkinligi.findUnique.mockResolvedValue(satir());
  dbMock.takvimEtkinligi.findMany.mockResolvedValue([satir()]);
});

describe('fetchTakvim', () => {
  it('seriyi aralıkta açar; düz JSON ve sıralı', async () => {
    const { etkinlikler, olusumlar } = await fetchTakvim('2026-11-09', '2026-11-15');
    expect(etkinlikler.map((e) => e.id)).toEqual(['seri1']);
    expect(olusumlar.map((o) => o.gun)).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(olusumlar[0]).toMatchObject({
      anahtar: 'seri1:2026-11-10T06:00:00.000Z',
      baslangic: '2026-11-10T06:00:00.000Z',
      bitis: '2026-11-10T07:00:00.000Z',
      sonGun: '2026-11-10',
      tekrarli: true,
    });
  });

  it('sorgu anlık sınırla: aralık İstanbul gününün ilk anından', async () => {
    await fetchTakvim('2026-11-09', '2026-11-15');
    const where = dbMock.takvimEtkinligi.findMany.mock.calls[0]![0].where;
    expect(where.baslangic.lt.toISOString()).toBe('2026-11-15T21:00:00.000Z');
    expect(where.OR[1].bitis.gte.toISOString()).toBe('2026-11-08T21:00:00.000Z');
  });

  it('oluşumu olmayan etkinlik listeye girmez; tüm günün son günü dahil', async () => {
    dbMock.takvimEtkinligi.findMany.mockResolvedValue([
      satir({
        id: 'eski',
        tekrar: 'YOK',
        baslangic: new Date('2020-01-01T00:00:00Z'),
        bitis: new Date('2020-01-01T01:00:00Z'),
      }),
      satir({
        id: 'tg',
        tekrar: 'YOK',
        tumGun: true,
        baslangic: new Date('2026-11-09T21:00:00Z'),
        bitis: new Date('2026-11-11T21:00:00Z'),
      }),
    ]);
    const { etkinlikler, olusumlar } = await fetchTakvim('2026-11-09', '2026-11-15');
    expect(etkinlikler.map((e) => e.id)).toEqual(['tg']);
    expect(olusumlar[0]).toMatchObject({ gun: '2026-11-10', sonGun: '2026-11-11' });
  });

  it('bugün panosu bitmiş oluşumu göstermez, tüm günü gösterir', async () => {
    dbMock.takvimEtkinligi.findMany.mockResolvedValue([
      satir({ tekrar: 'YOK' }),
      satir({
        id: 'tg',
        tekrar: 'YOK',
        tumGun: true,
        baslangic: new Date('2026-11-09T21:00:00Z'),
        bitis: new Date('2026-11-10T21:00:00Z'),
      }),
    ]);
    const sonra = await fetchBugunTakvim('2026-11-10', new Date('2026-11-10T08:00:00Z'));
    expect(sonra.map((o) => o.etkinlikId)).toEqual(['tg']);
    const once = await fetchBugunTakvim('2026-11-10', new Date('2026-11-10T06:30:00Z'));
    expect(once).toHaveLength(2);
  });

  it('zamanlayıcı yalnızca hatırlatması olanları ister', async () => {
    const liste = await fetchHatirlatmaliEtkinlikler(new Date('2026-11-10T06:00:00Z'));
    expect(dbMock.takvimEtkinligi.findMany.mock.calls[0]![0].where.hatirlatmalar).toEqual({
      isEmpty: false,
    });
    expect(liste[0]!.tekrar.tur).toBe('GUNLUK');
  });
});

describe('takvimEtkinligiOlustur', () => {
  it('saatli: duvar saati anlara; tekrarsızda kural alanları boş', async () => {
    await takvimEtkinligiOlustur({ ...girdi({ tekrar: TEKRAR_YOK }) });
    const data = dbMock.takvimEtkinligi.create.mock.calls[0]![0].data;
    expect(data.baslangic.toISOString()).toBe('2026-11-12T06:00:00.000Z');
    expect(data.bitis.toISOString()).toBe('2026-11-12T07:00:00.000Z');
    expect(data).toMatchObject({
      tekrar: 'YOK',
      tekrarGunleri: [],
      tekrarBitis: null,
      istisnalar: [],
    });
  });

  it('tüm gün: ilk günün 00:00ı → son günün ertesi; tekrar bitişi @db.Date', async () => {
    await takvimEtkinligiOlustur({
      ...girdi({
        tumGun: true,
        bitisGun: '2026-11-13',
        tekrar: { ...GUNLUK, tur: 'HAFTALIK', gunler: [4], bitisGun: '2026-12-31' },
      }),
    });
    const data = dbMock.takvimEtkinligi.create.mock.calls[0]![0].data;
    expect(data.baslangic.toISOString()).toBe('2026-11-11T21:00:00.000Z');
    expect(data.bitis.toISOString()).toBe('2026-11-13T21:00:00.000Z');
    expect(data.tekrarGunleri).toEqual([4]);
    expect(data.tekrarBitis).toEqual(appDayToDate('2026-12-31'));
  });
});

describe('takvimEtkinligiGuncelle — kapsam', () => {
  it('⚠️ yalnızca bu: oluşum istisna olur, AYRI etkinlik serinin parçası açılır', async () => {
    await takvimEtkinligiGuncelle(
      girdi({ kapsam: 'tek', baslangicSaat: '18:00', bitisSaat: '19:00' }),
    );
    expect(dbMock.takvimEtkinligi.update).toHaveBeenCalledWith({
      where: { id: 'seri1' },
      data: { istisnalar: { push: appDayToDate('2026-11-12') } },
    });
    const data = dbMock.takvimEtkinligi.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({ tekrar: 'YOK', seriId: 'seri1', istisnalar: [] });
    expect(data.baslangic.toISOString()).toBe('2026-11-12T15:00:00.000Z');
  });

  it('tümü: tıklanan oluşumdaki saat farkı serinin BAŞINA uygulanır', async () => {
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue(
      satir({ istisnalar: [appDayToDate('2026-11-11')] }),
    );
    await takvimEtkinligiGuncelle(
      girdi({
        baslangicGun: '2026-11-13',
        bitisGun: '2026-11-13',
        baslangicSaat: '10:00',
        bitisSaat: '11:30',
      }),
    );
    const data = dbMock.takvimEtkinligi.update.mock.calls[0]![0].data;
    // Oluşum 12'den 13'üne (+1 gün) ve 10:00'a: seri 10 Kasım'dan 11 Kasım 10:00'a.
    expect(data.baslangic.toISOString()).toBe('2026-11-11T07:00:00.000Z');
    expect(data.bitis.toISOString()).toBe('2026-11-11T08:30:00.000Z');
    expect(data.istisnalar).toEqual([appDayToDate('2026-11-12')]);
  });

  it('bu ve sonrakiler: eski seri bir gün önce biter, yeni seri o günden', async () => {
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue(
      satir({
        tekrarSayisi: 10,
        istisnalar: [appDayToDate('2026-11-11'), appDayToDate('2026-11-14')],
      }),
    );
    await takvimEtkinligiGuncelle(
      girdi({
        kapsam: 'sonraki',
        tekrar: { ...GUNLUK, sayi: 10 },
        baslangicSaat: '07:00',
        bitisSaat: '08:00',
      }),
    );
    expect(dbMock.takvimEtkinligi.update.mock.calls[0]![0].data).toEqual({
      tekrarBitis: appDayToDate('2026-11-11'),
      tekrarSayisi: null,
      istisnalar: [appDayToDate('2026-11-11')],
    });
    const data = dbMock.takvimEtkinligi.create.mock.calls[0]![0].data;
    // 10 kezin 2'si eski seride kaldı.
    expect(data.tekrarSayisi).toBe(8);
    expect(data.istisnalar).toEqual([appDayToDate('2026-11-14')]);
    expect(data.baslangic.toISOString()).toBe('2026-11-12T04:00:00.000Z');
  });

  it('serinin ilk oluşumunda "bu ve sonrakiler" = tümü', async () => {
    await takvimEtkinligiGuncelle(
      girdi({
        kapsam: 'sonraki',
        olusumGun: '2026-11-10',
        baslangicGun: '2026-11-10',
        bitisGun: '2026-11-10',
      }),
    );
    expect(dbMock.takvimEtkinligi.create).not.toHaveBeenCalled();
    expect(dbMock.takvimEtkinligi.update).toHaveBeenCalledTimes(1);
  });

  it('tekrarlamayan etkinlikte kapsam yok sayılır, form tarihine oturur', async () => {
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue(satir({ tekrar: 'YOK' }));
    await takvimEtkinligiGuncelle(girdi({ kapsam: 'tek', tekrar: TEKRAR_YOK }));
    expect(dbMock.takvimEtkinligi.create).not.toHaveBeenCalled();
    const data = dbMock.takvimEtkinligi.update.mock.calls[0]![0].data;
    expect(data.baslangic.toISOString()).toBe('2026-11-12T06:00:00.000Z');
    expect(data.istisnalar).toEqual([]);
  });

  it('⚠️ serinin oluşumu olmayan gün reddedilir', async () => {
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue(
      satir({ tekrar: 'HAFTALIK', tekrarGunleri: [2] }),
    );
    await expect(
      takvimEtkinligiGuncelle(girdi({ kapsam: 'tek', olusumGun: '2026-11-12' })),
    ).rejects.toThrow(TakvimHatasi);
  });

  it('silinmiş etkinlik', async () => {
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue(null);
    await expect(takvimEtkinligiGuncelle(girdi())).rejects.toThrow(/bulunamadı/);
  });
});

describe('takvimEtkinligiSil — kapsam', () => {
  it('yalnızca bu: istisna eklenir, satır kalır', async () => {
    await takvimEtkinligiSil({ id: 'seri1', kapsam: 'tek', olusumGun: '2026-11-12' });
    expect(dbMock.takvimEtkinligi.update.mock.calls[0]![0].data).toEqual({
      istisnalar: { push: appDayToDate('2026-11-12') },
    });
    expect(dbMock.takvimEtkinligi.delete).not.toHaveBeenCalled();
  });

  it('bu ve sonrakiler: seri kesilir', async () => {
    await takvimEtkinligiSil({ id: 'seri1', kapsam: 'sonraki', olusumGun: '2026-11-12' });
    expect(dbMock.takvimEtkinligi.update.mock.calls[0]![0].data.tekrarBitis).toEqual(
      appDayToDate('2026-11-11'),
    );
  });

  it('tümü ve tekrarlamayan: satır silinir', async () => {
    await takvimEtkinligiSil({ id: 'seri1', kapsam: 'tum', olusumGun: '2026-11-12' });
    dbMock.takvimEtkinligi.findUnique.mockResolvedValue(satir({ tekrar: 'YOK' }));
    await takvimEtkinligiSil({ id: 'seri1', kapsam: 'tek', olusumGun: '2026-11-10' });
    expect(dbMock.takvimEtkinligi.delete).toHaveBeenCalledTimes(2);
  });

  it('ilk oluşumdan "bu ve sonrakiler" tümünü siler', async () => {
    await takvimEtkinligiSil({ id: 'seri1', kapsam: 'sonraki', olusumGun: '2026-11-10' });
    expect(dbMock.takvimEtkinligi.delete).toHaveBeenCalledWith({ where: { id: 'seri1' } });
  });
});
