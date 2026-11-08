import { describe, expect, it } from 'vitest';

import * as services from '@/server/services';

/**
 * Barrel sözleşme testi.
 *
 * F3/F4/F5'teki her servis `@/server/services` üzerinden tüketecek. Bir yardımcı
 * yeniden adlandırılır veya barrel'dan düşerse hata, o yardımcıyı kullanan
 * göreve kadar görünmez kalırdı. Bu test yardımcıların dışa açık kaldığını
 * sabitler.
 */
describe('@/server/services — ortak yardımcılar dışa açık', () => {
  const expected = [
    // 1. §7.2 zarfı
    'toValidationFailure',
    'parseOrFail',
    'ok',
    'fail',
    // 2. Decimal → string
    'toMoneyString',
    'toRateString',
    'toMeasureString',
    // 3. para hesabı
    'computeBaseAmount',
    'sumMoney',
    'subtractMoney',
    // 6. denetim kaydı + redaksiyon
    'writeAuditLog',
    'redactAuditDiff',
    'buildDiff',
    // 7. kişisel rekor
    'recalculatePersonalRecords',
    'selectPersonalRecords',
    // 8. gün yardımcısı
    'toAppDay',
    'appDayToDate',
    'dateToAppDay',
    'appMonthRange',
    'appIsoWeek',
    'startOfAppWeek',
  ] as const;

  for (const name of expected) {
    it(`${name} ihraç ediliyor`, () => {
      expect(typeof services[name]).toBe('function');
    });
  }

  it('sabitler de dışa açık', () => {
    expect(services.APP_TIME_ZONE).toBe('Europe/Istanbul');
    expect(services.REDACTION_PLACEHOLDER).toBe('[REDACTED]');
  });
});
