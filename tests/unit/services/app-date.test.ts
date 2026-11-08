import { describe, expect, it } from 'vitest';

import {
  addAppDays,
  appDayToDate,
  appIsoWeek,
  appMonthRange,
  appToday,
  appWeekRange,
  appYearRange,
  dateToAppDay,
  differenceInAppDays,
  startOfAppWeek,
  toAppDay,
} from '@/server/services/_shared';

/**
 * ADR-016 — bu testlerin varlık sebebi: UTC'de koşan bir sunucuda
 * 00:00–03:00 arası girilen kayıtların bir önceki güne kaymasını yakalamak.
 * Vitest zaten `TZ=UTC` ile koşuyor (vitest.config.ts), yani üretim
 * koşullarının aynısı.
 */

describe('toAppDay — 00:00–03:00 ARALIĞI (ADR-016’nın çekirdeği)', () => {
  it('UTC 21:30 → İstanbul’da ERTESİ gün', () => {
    // Bu kayıt UTC gününe göre 4 Ağustos'a yazılırdı; kullanıcı 5 Ağustos yaşıyor.
    expect(toAppDay(new Date('2026-08-04T21:30:00Z'))).toBe('2026-08-05');
  });

  it('UTC 00:30 → İstanbul’da AYNI gün (03:30)', () => {
    expect(toAppDay(new Date('2026-08-05T00:30:00Z'))).toBe('2026-08-05');
  });

  it('UTC 20:59 → hâlâ önceki gün', () => {
    expect(toAppDay(new Date('2026-08-04T20:59:00Z'))).toBe('2026-08-04');
  });

  it('gece yarısını geçen dört anın tamamı doğru güne düşer', () => {
    const cases: Array<[string, string]> = [
      ['2026-03-14T21:00:00Z', '2026-03-15'], // 00:00 İstanbul
      ['2026-03-14T22:00:00Z', '2026-03-15'], // 01:00
      ['2026-03-14T23:59:00Z', '2026-03-15'], // 02:59
      ['2026-03-15T00:00:00Z', '2026-03-15'], // 03:00
    ];
    for (const [instant, expected] of cases) {
      expect(toAppDay(new Date(instant)), instant).toBe(expected);
    }
  });
});

describe('toAppDay — AY SINIRI', () => {
  it('ayın son günü 21:00 UTC → ERTESİ AYIN ilk günü', () => {
    // Aylık toplam bu kaydı yanlış aya sayardı.
    expect(toAppDay(new Date('2026-07-31T21:00:00Z'))).toBe('2026-08-01');
  });

  it('ayın ilk günü 00:30 UTC → aynı ay', () => {
    expect(toAppDay(new Date('2026-08-01T00:30:00Z'))).toBe('2026-08-01');
  });

  it('şubat sonu — artık yıl', () => {
    expect(toAppDay(new Date('2028-02-28T21:00:00Z'))).toBe('2028-02-29');
  });
});

describe('toAppDay — YIL SINIRI', () => {
  it('31 Aralık 21:00 UTC → 1 OCAK, yıl artar', () => {
    expect(toAppDay(new Date('2026-12-31T21:00:00Z'))).toBe('2027-01-01');
  });

  it('1 Ocak 00:30 UTC → aynı yıl', () => {
    expect(toAppDay(new Date('2027-01-01T00:30:00Z'))).toBe('2027-01-01');
  });
});

describe('appDayToDate / dateToAppDay', () => {
  it('gidiş-dönüş kayıpsız', () => {
    expect(dateToAppDay(appDayToDate('2026-08-05'))).toBe('2026-08-05');
  });

  it('UTC gece yarısı üretir — saat bileşeni yok', () => {
    expect(appDayToDate('2026-08-05').toISOString()).toBe('2026-08-05T00:00:00.000Z');
  });

  it('geçersiz biçim fırlatır', () => {
    expect(() => appDayToDate('05.08.2026')).toThrow(/Geçersiz gün biçimi/);
    expect(() => appDayToDate('2026-8-5')).toThrow(/Geçersiz gün biçimi/);
  });

  it('TAKVİMDE OLMAYAN gün fırlatır — sessizce kaymaz', () => {
    // `new Date('2026-02-30T00:00:00Z')` fırlatmaz, 2026-03-02 üretir.
    // Yakalanmasaydı kayıt sessizce yanlış güne yazılırdı.
    expect(() => appDayToDate('2026-02-30')).toThrow(/Takvimde olmayan/);
    expect(() => appDayToDate('2026-04-31')).toThrow(/Takvimde olmayan/);
    expect(() => appDayToDate('2027-02-29')).toThrow(/Takvimde olmayan/);
  });

  it('artık yılın 29 Şubat’ı GEÇERLİDİR', () => {
    expect(dateToAppDay(appDayToDate('2028-02-29'))).toBe('2028-02-29');
  });
});

describe('addAppDays / differenceInAppDays', () => {
  it('ay sınırını doğru geçer', () => {
    expect(addAppDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addAppDays('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('yıl sınırını doğru geçer', () => {
    expect(addAppDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('artık yılı doğru sayar', () => {
    expect(addAppDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(differenceInAppDays('2028-02-01', '2028-03-01')).toBe(29);
  });

  it('fark hesabı', () => {
    expect(differenceInAppDays('2026-08-01', '2026-08-05')).toBe(4);
    expect(differenceInAppDays('2026-08-05', '2026-08-01')).toBe(-4);
  });
});

describe('appMonthRange / appYearRange', () => {
  it('31 günlük ay', () => {
    expect(appMonthRange(2026, 8)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('30 günlük ay', () => {
    expect(appMonthRange(2026, 9)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('şubat — normal ve artık yıl', () => {
    expect(appMonthRange(2026, 2).to).toBe('2026-02-28');
    expect(appMonthRange(2028, 2).to).toBe('2028-02-29');
  });

  it('geçersiz ay reddedilir', () => {
    expect(() => appMonthRange(2026, 0)).toThrow(/Geçersiz ay/);
    expect(() => appMonthRange(2026, 13)).toThrow(/Geçersiz ay/);
  });

  it('yıl aralığı', () => {
    expect(appYearRange(2026)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});

describe('startOfAppWeek — PAZARTESİ', () => {
  it('çarşamba → pazartesi', () => {
    expect(startOfAppWeek('2026-08-05')).toBe('2026-08-03'); // 5 Ağu 2026 = Çarşamba
  });

  it('pazartesi kendisidir', () => {
    expect(startOfAppWeek('2026-08-03')).toBe('2026-08-03');
  });

  it('PAZAR aynı haftanın pazartesisine düşer (ISO)', () => {
    // `getUTCDay()` pazarı 0 sayar; kaydırma olmasaydı bir hafta ileri giderdi.
    expect(startOfAppWeek('2026-08-09')).toBe('2026-08-03');
  });

  it('hafta aralığı 7 gün', () => {
    expect(appWeekRange('2026-08-05')).toEqual({ from: '2026-08-03', to: '2026-08-09' });
  });
});

describe('appIsoWeek — YIL SINIRI kuralı', () => {
  it('yıl ortası hafta', () => {
    expect(appIsoWeek('2026-08-05')).toEqual({ year: 2026, week: 32 });
  });

  it('yılın ilk günü önceki yılın son haftasına ait olabilir', () => {
    // 1 Ocak 2027 Cuma → ISO haftası 2026-W53
    expect(appIsoWeek('2027-01-01')).toEqual({ year: 2026, week: 53 });
  });

  it('yılın son günleri gelecek yılın ilk haftasına ait olabilir', () => {
    // 29 Aralık 2025 Pazartesi → ISO haftası 2026-W01
    expect(appIsoWeek('2025-12-29')).toEqual({ year: 2026, week: 1 });
  });

  it('4 Ocak daima 1. haftadadır (ISO tanımı)', () => {
    for (const year of [2025, 2026, 2027, 2028]) {
      expect(appIsoWeek(`${year}-01-04`).week, String(year)).toBe(1);
    }
  });
});

describe('appToday', () => {
  it('verilen anı İstanbul gününe çevirir', () => {
    expect(appToday(new Date('2026-08-04T21:30:00Z'))).toBe('2026-08-05');
  });
});
