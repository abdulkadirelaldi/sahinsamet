import { beforeEach, describe, expect, it, vi } from 'vitest';

import { decimal } from '../_helpers/decimal-kacak';

const { dbMock, gonder, vapid } = vi.hoisted(() => ({
  dbMock: {
    workoutSet: { findMany: vi.fn() },
    bildirimTercihi: { findUnique: vi.fn() },
    bildirimKaydi: { create: vi.fn() },
  },
  gonder: vi.fn(),
  vapid: vi.fn(),
}));
vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('@/server/services/bildirim', () => ({
  kullaniciyaGonder: gonder,
  vapidAyarlari: vapid,
}));

const { rekorDenetle } = await import('@/server/services/spor-gelisim');

const SET = {
  id: 's1',
  exerciseId: 'e1',
  exerciseName: 'Bench',
  reps: 5,
  weightKg: '102.50',
};
const GECMIS = [{ reps: 5, weightKg: decimal('100.00') }];
const bekle = () => new Promise((r) => setTimeout(r, 0));

describe('rekorDenetle (2026-11-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vapid.mockReturnValue({ publicKey: 'p', privateKey: 'k', subject: 's' });
    dbMock.workoutSet.findMany.mockResolvedValue(GECMIS);
    dbMock.bildirimTercihi.findUnique.mockResolvedValue(null);
    dbMock.bildirimKaydi.create.mockResolvedValue({});
    gonder.mockResolvedValue(1);
  });

  it('rekorda telefona gider; kendisi karşılaştırmaya girmez', async () => {
    expect(await rekorDenetle('u1', SET)).toBe(true);
    await bekle();
    expect(dbMock.workoutSet.findMany.mock.calls[0]?.[0].where.id).toEqual({ not: 's1' });
    expect(gonder.mock.calls[0]?.[1]).toMatchObject({
      govde: 'Bench · 102,5 kg × 5',
      url: '/panel/spor/gelisim',
    });
  });

  it('rekor değilse göndermez', async () => {
    expect(await rekorDenetle('u1', { ...SET, weightKg: '100.00' })).toBe(false);
    await bekle();
    expect(gonder).not.toHaveBeenCalled();
  });

  it('⚠️ aynı gün aynı rekor ikinci kez gönderilmez', async () => {
    dbMock.bildirimKaydi.create.mockRejectedValue(new Error('P2002'));
    expect(await rekorDenetle('u1', SET)).toBe(true);
    await bekle();
    expect(gonder).not.toHaveBeenCalled();
  });

  it('tercih kapalıysa göndermez, ekran yine rekor der', async () => {
    dbMock.bildirimTercihi.findUnique.mockResolvedValue({ rekor: false });
    expect(await rekorDenetle('u1', SET)).toBe(true);
    await bekle();
    expect(dbMock.bildirimKaydi.create).not.toHaveBeenCalled();
    expect(gonder).not.toHaveBeenCalled();
  });

  it('⚠️ gönderim hatası set kaydını bozmaz', async () => {
    gonder.mockRejectedValue(new Error('push kapalı'));
    await expect(rekorDenetle('u1', SET)).resolves.toBe(true);
    await bekle();
  });
});
