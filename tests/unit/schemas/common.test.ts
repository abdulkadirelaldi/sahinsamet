import { describe, expect, it } from 'vitest';

import {
  dateRangeSchema,
  dayDateSchema,
  fxRateSchema,
  instantSchema,
  moneySchema,
  moodSchema,
  paginationSchema,
  percentSchema,
  periodKeySchema,
  rpeSchema,
  tagsSchema,
} from '@/lib/schemas';

describe('moneySchema', () => {
  it('iki ondalıklı tutar kabul eder', () => {
    expect(moneySchema.safeParse('1250.00').success).toBe(true);
    expect(moneySchema.safeParse('0').success).toBe(true);
  });

  it('üç ondalık, negatif ve metin reddeder', () => {
    expect(moneySchema.safeParse('10.123').success).toBe(false);
    expect(moneySchema.safeParse('-5.00').success).toBe(false);
    expect(moneySchema.safeParse('bin lira').success).toBe(false);
  });

  it('hata mesajı Türkçe ve kullanıcıya gösterilebilir', () => {
    const result = moneySchema.safeParse('10.123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('ondalık');
    }
  });
});

describe('fxRateSchema', () => {
  it('sekiz ondalıklı kur kabul eder', () => {
    expect(fxRateSchema.safeParse('34.12345678').success).toBe(true);
  });

  it('sıfır kuru reddeder — baseAmount hesabını çökertirdi', () => {
    expect(fxRateSchema.safeParse('0').success).toBe(false);
  });
});

describe('dayDateSchema — ADR-016', () => {
  it('YYYY-AA-GG kabul eder', () => {
    expect(dayDateSchema.safeParse('2026-08-05').success).toBe(true);
  });

  it('SAAT BİLEŞENİ İÇEREN değeri REDDEDER', () => {
    // Bu, ADR-016'nın varlık sebebi: saat kabul edilirse UTC+3 altında
    // 00:00–03:00 girişleri bir önceki güne kayar.
    expect(dayDateSchema.safeParse('2026-08-05T10:00:00Z').success).toBe(false);
    expect(dayDateSchema.safeParse('2026-08-05 10:00').success).toBe(false);
  });

  it('geçersiz takvim günü reddeder', () => {
    expect(dayDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(dayDateSchema.safeParse('05.08.2026').success).toBe(false);
  });
});

describe('instantSchema', () => {
  it('ISO 8601 an kabul eder, saatsiz tarihi reddeder', () => {
    expect(instantSchema.safeParse('2026-08-05T10:00:00Z').success).toBe(true);
    expect(instantSchema.safeParse('2026-08-05').success).toBe(false);
  });
});

describe('periodKeySchema — ADR-015', () => {
  it('dört biçimi de kabul eder', () => {
    for (const key of ['2026', '2026-08', '2026-W32', '2026-08-05']) {
      expect(periodKeySchema.safeParse(key).success, key).toBe(true);
    }
  });

  it('geçersiz biçimleri reddeder', () => {
    for (const key of ['2026-13', '2026-W54', '26-08', '2026-8', '2026-W0', '2026-08-32']) {
      expect(periodKeySchema.safeParse(key).success, key).toBe(false);
    }
  });
});

describe('ölçek sınırları — ADR-020', () => {
  it('mood 1–5', () => {
    expect(moodSchema.safeParse(1).success).toBe(true);
    expect(moodSchema.safeParse(5).success).toBe(true);
    expect(moodSchema.safeParse(0).success).toBe(false);
    expect(moodSchema.safeParse(6).success).toBe(false);
    expect(moodSchema.safeParse(3.5).success).toBe(false);
  });

  it('rpe 1–10', () => {
    expect(rpeSchema.safeParse(10).success).toBe(true);
    expect(rpeSchema.safeParse(11).success).toBe(false);
    expect(rpeSchema.safeParse(0).success).toBe(false);
  });

  it('percent 0–100', () => {
    expect(percentSchema.safeParse(0).success).toBe(true);
    expect(percentSchema.safeParse(100).success).toBe(true);
    expect(percentSchema.safeParse(101).success).toBe(false);
    expect(percentSchema.safeParse(-1).success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('URL string parametrelerini sayıya çevirir ve varsayılan uygular', () => {
    expect(paginationSchema.parse({ page: '3', perPage: '50' })).toEqual({ page: 3, perPage: 50 });
    expect(paginationSchema.parse({})).toEqual({ page: 1, perPage: 20 });
  });

  it('üst sınırı aşan sayfa boyutunu reddeder', () => {
    expect(paginationSchema.safeParse({ perPage: '500' }).success).toBe(false);
  });
});

describe('dateRangeSchema', () => {
  it('geçerli aralık kabul eder', () => {
    expect(dateRangeSchema.safeParse({ from: '2026-01-01', to: '2026-12-31' }).success).toBe(true);
  });

  it('ters aralığı reddeder ve hatayı `to` alanına bağlar', () => {
    const result = dateRangeSchema.safeParse({ from: '2026-12-31', to: '2026-01-01' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['to']);
    }
  });
});

describe('tagsSchema', () => {
  it('varsayılan boş dizi verir', () => {
    expect(tagsSchema.parse(undefined)).toEqual([]);
  });

  it('20 etiketten fazlasını reddeder', () => {
    expect(tagsSchema.safeParse(Array.from({ length: 21 }, (_, i) => `t${i}`)).success).toBe(false);
  });
});
