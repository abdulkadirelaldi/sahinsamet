import { describe, expect, it, vi } from 'vitest';

import { gununKaydinaEkle } from '@/server/services/health-log';

import { decimal } from '../_helpers/decimal-kacak';

const istemci = (mevcut: { id: string; waterMl: number | null } | null) => {
  const satir = { id: mevcut?.id ?? 'yeni', weightKg: decimal('82.50'), waterMl: 750 };
  const healthLog = {
    findUnique: vi.fn().mockResolvedValue(mevcut),
    update: vi.fn().mockResolvedValue(satir),
    create: vi.fn().mockResolvedValue(satir),
  };
  return { client: { healthLog } as never, healthLog };
};

describe('gununKaydinaEkle — hızlı kilo / su', () => {
  it('kayıt yoksa AÇAR, yalnızca verilen alanla', async () => {
    const { client, healthLog } = istemci(null);
    const s = await gununKaydinaEkle('2026-10-30', { weightKg: '82.5' }, client);
    expect(healthLog.create.mock.calls[0]?.[0].data).toEqual({
      date: new Date('2026-10-30T00:00:00.000Z'),
      weightKg: '82.5',
    });
    expect(s).toEqual({ id: 'yeni', weightKg: '82.50', waterMl: 750 });
  });

  it('su VAR OLANA eklenir, diğer alanlara dokunulmaz', async () => {
    const { client, healthLog } = istemci({ id: 'k1', waterMl: 500 });
    await gununKaydinaEkle('2026-10-30', { suMl: 250 }, client);
    expect(healthLog.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'k1' },
      data: { waterMl: 750 },
    });
    expect(healthLog.create).not.toHaveBeenCalled();
  });

  it('boş su alanı sıfırdan başlar; tavan 20 L', async () => {
    const a = istemci({ id: 'k1', waterMl: null });
    await gununKaydinaEkle('2026-10-30', { suMl: 250 }, a.client);
    expect(a.healthLog.update.mock.calls[0]?.[0].data).toEqual({ waterMl: 250 });

    const b = istemci({ id: 'k1', waterMl: 19_900 });
    await gununKaydinaEkle('2026-10-30', { suMl: 500 }, b.client);
    expect(b.healthLog.update.mock.calls[0]?.[0].data).toEqual({ waterMl: 20_000 });
  });
});
