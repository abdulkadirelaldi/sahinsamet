import { beforeEach, describe, expect, it } from 'vitest';

import { NABIZ_ESIK_MS, nabizDurumu, nabizVur } from '@/lib/zamanlayici-nabiz';

const SIMDI = 1_000_000_000_000;

beforeEach(() => {
  delete (globalThis as Record<string, unknown>).__aeZamanlayiciNabiz;
});

describe('zamanlayıcı nabzı', () => {
  it('anahtar yoksa kapalı: izleme alarm vermez', () => {
    expect(nabizDurumu(false, 99_999, SIMDI)).toBe('kapali');
  });

  it('süreç yeni açıldıysa henüz tur olmaması normal', () => {
    expect(nabizDurumu(true, 60, SIMDI)).toBe('ok');
  });

  it('⚠️ süreç uzun süredir açık ve hiç tur yoksa gecikmiş', () => {
    expect(nabizDurumu(true, 3600, SIMDI)).toBe('gecikmis');
  });

  it('taze damga ok, eski damga gecikmiş', () => {
    nabizVur(SIMDI);
    expect(nabizDurumu(true, 3600, SIMDI + 60_000)).toBe('ok');
    expect(nabizDurumu(true, 3600, SIMDI + NABIZ_ESIK_MS + 1)).toBe('gecikmis');
  });
});
