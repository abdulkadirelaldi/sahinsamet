import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, gonderMock } = vi.hoisted(() => ({
  dbMock: {
    pushAbonelik: { findMany: vi.fn(), delete: vi.fn() },
    bildirimTercihi: { findUnique: vi.fn() },
    walletDebt: { findMany: vi.fn() },
    walletFlow: { findMany: vi.fn() },
    walletOdeme: { findMany: vi.fn() },
    walletDebtPayment: { findMany: vi.fn() },
    healthLog: { findUnique: vi.fn() },
    habit: { findMany: vi.fn() },
    habitLog: { findMany: vi.fn() },
    bildirimKaydi: { create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  },
  gonderMock: vi.fn(),
}));

vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: gonderMock },
}));

import { bildirimTuru } from '@/server/services/bildirim';

// İstanbul 11:00: su penceresi açık, su kaydı yok.
const SIMDI = new Date('2026-11-02T08:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  process.env.VAPID_PUBLIC_KEY = 'p';
  process.env.VAPID_PRIVATE_KEY = 'k';
  dbMock.pushAbonelik.findMany.mockImplementation(async (a: { distinct?: unknown }) =>
    a.distinct ? [{ userId: 'u1' }] : [{ id: 'a1', endpoint: 'https://x', p256dh: 'p', auth: 'a' }],
  );
  dbMock.bildirimTercihi.findUnique.mockResolvedValue(null);
  dbMock.walletDebt.findMany.mockResolvedValue([]);
  dbMock.walletFlow.findMany.mockResolvedValue([]);
  dbMock.walletOdeme.findMany.mockResolvedValue([]);
  dbMock.walletDebtPayment.findMany.mockResolvedValue([]);
  dbMock.healthLog.findUnique.mockResolvedValue(null);
  dbMock.habit.findMany.mockResolvedValue([]);
  dbMock.habitLog.findMany.mockResolvedValue([]);
  dbMock.pushAbonelik.delete.mockResolvedValue({});
  dbMock.bildirimKaydi.create.mockResolvedValue({ id: 'k1' });
  dbMock.bildirimKaydi.delete.mockResolvedValue({});
  dbMock.bildirimKaydi.deleteMany.mockResolvedValue({ count: 0 });
  gonderMock.mockResolvedValue({});
});

describe('bildirimTuru', () => {
  it('gönderilince kayıt kalır', async () => {
    expect(await bildirimTuru(SIMDI)).toBe(1);
    expect(dbMock.bildirimKaydi.delete).not.toHaveBeenCalled();
  });

  it('⚠️ geçici hatada kayıt silinir: sonraki tur yeniden dener', async () => {
    gonderMock.mockRejectedValue(Object.assign(new Error('x'), { statusCode: 503 }));
    expect(await bildirimTuru(SIMDI)).toBe(0);
    expect(dbMock.bildirimKaydi.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });
  });

  it('bugün zaten gönderildiyse (P2002) ikinci kez gitmez', async () => {
    dbMock.bildirimKaydi.create.mockRejectedValue(Object.assign(new Error('x'), { code: 'P2002' }));
    expect(await bildirimTuru(SIMDI)).toBe(0);
    expect(gonderMock).not.toHaveBeenCalled();
  });

  it('⚠️ veritabanı hatası "gönderildi" sayılmaz, yukarı çıkar', async () => {
    dbMock.bildirimKaydi.create.mockRejectedValue(new Error('baglanti yok'));
    await expect(bildirimTuru(SIMDI)).rejects.toThrow('baglanti yok');
  });

  it('sona ermiş abonelik silinir', async () => {
    gonderMock.mockRejectedValue(Object.assign(new Error('x'), { statusCode: 410 }));
    await bildirimTuru(SIMDI);
    expect(dbMock.pushAbonelik.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });
});
