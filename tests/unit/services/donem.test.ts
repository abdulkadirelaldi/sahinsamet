import { describe, expect, it } from 'vitest';

import {
  donemAnahtari,
  donemAnahtariGecerliMi,
  donemAraligi,
  komsuDonem,
} from '@/server/services/_shared/donem';

describe('donemAnahtari — hedef dönemleri', () => {
  it('haftalık ISO hafta, aylık YYYY-AA, yıllık YYYY', () => {
    expect(donemAnahtari('WEEKLY', '2026-10-29')).toBe('2026-W44');
    expect(donemAnahtari('MONTHLY', '2026-10-29')).toBe('2026-10');
    expect(donemAnahtari('YEARLY', '2026-10-29')).toBe('2026');
  });

  it('⚠️ yıl sınırı: 29 Aralık 2025 ISO olarak 2026-W01', () => {
    expect(donemAnahtari('WEEKLY', '2025-12-29')).toBe('2026-W01');
    expect(donemAnahtari('WEEKLY', '2025-12-28')).toBe('2025-W52');
  });
});

describe('donemAraligi — iki uç dahil', () => {
  it('ISO hafta pazartesiden pazara', () => {
    expect(donemAraligi('WEEKLY', '2026-W44')).toEqual({ from: '2026-10-26', to: '2026-11-01' });
    expect(donemAraligi('WEEKLY', '2026-W01')).toEqual({ from: '2025-12-29', to: '2026-01-04' });
  });

  it('ay ve yıl', () => {
    expect(donemAraligi('MONTHLY', '2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(donemAraligi('YEARLY', '2026')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('anahtar → aralık → anahtar döngüsü tutarlı', () => {
    for (const gun of ['2026-01-01', '2026-03-31', '2026-12-31', '2027-01-03']) {
      const anahtar = donemAnahtari('WEEKLY', gun);
      const { from, to } = donemAraligi('WEEKLY', anahtar);
      expect(from <= gun && gun <= to, `${gun} kendi haftasında değil`).toBe(true);
    }
  });
});

describe('komsuDonem ve doğrulama', () => {
  it('önceki/sonraki dönem yıl sınırını aşıyor', () => {
    expect(komsuDonem('WEEKLY', '2026-W01', -1)).toBe('2025-W52');
    expect(komsuDonem('MONTHLY', '2026-12', 1)).toBe('2027-01');
    expect(komsuDonem('YEARLY', '2026', -1)).toBe('2025');
  });

  it('biçimi döneme uymayan anahtar reddediliyor', () => {
    expect(donemAnahtariGecerliMi('WEEKLY', '2026-W44')).toBe(true);
    expect(donemAnahtariGecerliMi('WEEKLY', '2026-W60')).toBe(false);
    expect(donemAnahtariGecerliMi('MONTHLY', '2026-13')).toBe(false);
    expect(donemAnahtariGecerliMi('YEARLY', '2026-10')).toBe(false);
  });
});
