import { describe, expect, it } from 'vitest';

import { miktarBicim, tutarOku } from '@/components/panel/cuzdan-bicim';

describe('tutarOku — kullanıcının yazdığı tutar', () => {
  it.each([
    ['1.250,50', '1250.50'],
    ['1250,5', '1250.5'],
    ['1250.50', '1250.50'],
    [' 3 ', '3'],
    // ⚠️ Türkçede virgülsüz "42.500" kırk iki BİN beş yüz — binlik ayırıcı.
    ['42.500', '42500'],
    ['1.250.000', '1250000'],
    ['12.5', '12.5'],
  ])('%s → %s', (girdi, beklenen) => {
    expect(tutarOku(girdi)).toBe(beklenen);
  });

  it.each(['', 'abc', '1,2,3', '12.345.6', '1.2345'])('geçersiz: %j', (girdi) => {
    expect(tutarOku(girdi)).toBeNull();
  });
});

describe('miktarBicim', () => {
  it('altın adet sade, para birimli', () => {
    expect(miktarBicim('3.00', 'GOLD_QUARTER')).toBe('3 çeyrek');
    expect(miktarBicim('12.50', 'GOLD_GRAM')).toBe('12,5 gr altın');
  });
});
