import { describe, expect, it, vi } from 'vitest';

import { fetchSaglikHedefi, hedefIlerlemesi } from '@/server/services/health-log';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

describe('hedefIlerlemesi — hedef kilo (2026-10-31)', () => {
  it('kilo verme: 90 → 80 hedefinde 85 = %50, 5 kg kaldı', () => {
    expect(hedefIlerlemesi(90, 85, 80)).toEqual({ kalan: 5, yuzde: 50 });
  });

  it('kilo alma da çalışır: 60 → 70, 64 = %40', () => {
    expect(hedefIlerlemesi(60, 64, 70)).toEqual({ kalan: 6, yuzde: 40 });
  });

  it('ters yönde gidiş %0, hedef aşıldıysa %100', () => {
    expect(hedefIlerlemesi(90, 92, 80).yuzde).toBe(0);
    expect(hedefIlerlemesi(90, 79, 80).yuzde).toBe(100);
  });

  it('ölçüm yoksa hesap yok; başlangıç yoksa yalnızca kalan', () => {
    expect(hedefIlerlemesi(90, null, 80)).toEqual({ kalan: null, yuzde: null });
    expect(hedefIlerlemesi(null, 82, 80)).toEqual({ kalan: 2, yuzde: null });
  });
});

describe('fetchSaglikHedefi', () => {
  it('Decimal sızmaz; hedef yoksa null', async () => {
    const client = {
      saglikHedefi: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ hedefKg: decimal('80.00'), baslangicKg: decimal('90.00') }),
      },
      healthLog: { findFirst: vi.fn().mockResolvedValue({ weightKg: decimal('85.00') }) },
    } as never;
    const h = await fetchSaglikHedefi('u1', client);
    expect(decimalKalanlar(h)).toEqual([]);
    expect(h).toEqual({
      hedefKg: '80.00',
      baslangicKg: '90.00',
      sonKg: '85.00',
      kalanKg: '5.0',
      yuzde: 50,
    });

    const bos = {
      saglikHedefi: { findUnique: vi.fn().mockResolvedValue(null) },
      healthLog: { findFirst: vi.fn().mockResolvedValue(null) },
    } as never;
    expect(await fetchSaglikHedefi('u1', bos)).toBeNull();
  });
});
