import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, gonderMock } = vi.hoisted(() => ({
  dbMock: {
    pushAbonelik: { findMany: vi.fn(), delete: vi.fn() },
    bildirimTercihi: { findMany: vi.fn() },
    bildirimKaydi: { create: vi.fn(), delete: vi.fn() },
    takvimEtkinligi: { findMany: vi.fn() },
  },
  gonderMock: vi.fn(),
}));

vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: gonderMock },
}));

import { appDayToDate, appWallClockInstant } from '@/server/services/_shared/app-date';
import { takvimHatirlatmaTuru } from '@/server/services/takvim-bildirim';

// Diş hekimi 14:30 İstanbul (11:30Z); 30 dk önce → 11:00Z.
const BAS = appWallClockInstant('2026-11-10', 870);
const SIMDI = new Date('2026-11-10T11:00:05Z');

beforeEach(() => {
  vi.clearAllMocks();
  process.env.VAPID_PUBLIC_KEY = 'p';
  process.env.VAPID_PRIVATE_KEY = 'k';
  dbMock.pushAbonelik.findMany.mockImplementation(async (a: { distinct?: unknown }) =>
    a.distinct ? [{ userId: 'u1' }] : [{ id: 'a1', endpoint: 'https://x', p256dh: 'p', auth: 'a' }],
  );
  dbMock.bildirimTercihi.findMany.mockResolvedValue([]);
  dbMock.bildirimKaydi.create.mockResolvedValue({ id: 'k1' });
  dbMock.bildirimKaydi.delete.mockResolvedValue({});
  dbMock.takvimEtkinligi.findMany.mockResolvedValue([
    {
      id: 'e1',
      baslik: 'Diş hekimi',
      konum: 'Kadıköy',
      kategori: 'SAGLIK',
      tumGun: false,
      baslangic: BAS,
      bitis: new Date(BAS.getTime() + 3_600_000),
      tekrar: 'YOK',
      tekrarAralik: 1,
      tekrarGunleri: [],
      tekrarBitis: null,
      tekrarSayisi: null,
      istisnalar: [],
      hatirlatmalar: [30],
    },
  ]);
  gonderMock.mockResolvedValue({});
});

describe('takvimHatirlatmaTuru', () => {
  it('vakti gelen hatırlatma Türkçe metinle gider; kayıt anahtarı etkinlik+oluşum+öncelik', async () => {
    expect(await takvimHatirlatmaTuru(SIMDI)).toBe(1);
    expect(dbMock.bildirimKaydi.create).toHaveBeenCalledWith({
      data: {
        tur: 'takvim',
        anahtar: 'u1:e1:2026-11-10T11:30:00.000Z:30',
        gun: appDayToDate('2026-11-10'),
      },
    });
    const yuk = JSON.parse(gonderMock.mock.calls[0]![1] as string);
    expect(yuk).toEqual({
      baslik: '🩺 Sağlık / Doktor',
      govde: "Diş hekimi · 14:30'da (30 dk sonra) · Kadıköy",
      url: '/panel/takvim?gorunum=gun&tarih=2026-11-10',
      tur: 'takvim',
      // Öncelik (`:30`) etikette yok: aynı oluşumun öteki hatırlatması bunun yerine geçer.
      etiket: 'takvim:e1:2026-11-10T11:30:00.000Z',
    });
  });

  it('⚠️ zaten gönderildiyse (P2002) ikinci kez gitmez', async () => {
    dbMock.bildirimKaydi.create.mockRejectedValue(Object.assign(new Error('x'), { code: 'P2002' }));
    expect(await takvimHatirlatmaTuru(SIMDI)).toBe(0);
    expect(gonderMock).not.toHaveBeenCalled();
  });

  it('hiçbir cihaza ulaşmazsa kayıt silinir: sonraki dakika yeniden dener', async () => {
    gonderMock.mockRejectedValue(Object.assign(new Error('x'), { statusCode: 503 }));
    expect(await takvimHatirlatmaTuru(SIMDI)).toBe(0);
    expect(dbMock.bildirimKaydi.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });
  });

  it('veritabanı hatası yukarı çıkar', async () => {
    dbMock.bildirimKaydi.create.mockRejectedValue(new Error('baglanti yok'));
    await expect(takvimHatirlatmaTuru(SIMDI)).rejects.toThrow('baglanti yok');
  });

  it('tercih kapalıysa hiçbir şey okunmaz ve gitmez', async () => {
    dbMock.bildirimTercihi.findMany.mockResolvedValue([{ userId: 'u1' }]);
    expect(await takvimHatirlatmaTuru(SIMDI)).toBe(0);
    expect(dbMock.takvimEtkinligi.findMany).not.toHaveBeenCalled();
  });

  it('anahtar yoksa ya da abone yoksa kapalı', async () => {
    dbMock.pushAbonelik.findMany.mockResolvedValue([]);
    expect(await takvimHatirlatmaTuru(SIMDI)).toBe(0);
    delete process.env.VAPID_PRIVATE_KEY;
    expect(await takvimHatirlatmaTuru(SIMDI)).toBe(0);
  });

  it('tolerans dışında (sunucu uzun süre kapalıydı) gönderilmez', async () => {
    expect(await takvimHatirlatmaTuru(new Date('2026-11-10T11:16:00Z'))).toBe(0);
    expect(dbMock.bildirimKaydi.create).not.toHaveBeenCalled();
  });
});
