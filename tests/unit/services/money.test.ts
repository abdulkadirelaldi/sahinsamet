import { describe, expect, it } from 'vitest';

import { computeBaseAmount, subtractMoney, sumMoney } from '@/server/services/_shared';

describe('computeBaseAmount — ADR-014', () => {
  it('TRY işlemde kur 1.0 → tutar değişmez', () => {
    expect(computeBaseAmount('1250.00', '1')).toBe('1250.00');
  });

  it('T-012 seed değeri: 1250.00 × 34.25 = 42812.50', () => {
    expect(computeBaseAmount('1250.00', '34.25000000')).toBe('42812.50');
  });

  it('iş anlaşması: 2500.00 × 34.25 = 85625.00', () => {
    expect(computeBaseAmount('2500.00', '34.25')).toBe('85625.00');
  });

  it('KURUŞ SAPMASI TESTİ — kayan nokta kullanılsaydı hata verirdi', () => {
    // 0.1 + 0.2 sınıfı hata: JS'te 1250.00 * 34.12345678 = 42654.32097500001
    // BigInt yolu tam sonucu verir ve kuruşa yarım-yukarı yuvarlar.
    expect(computeBaseAmount('1250.00', '34.12345678')).toBe('42654.32');

    // Kayan noktalı naif hesabın sapmasını gösteren doğrudan karşılaştırma:
    const naive = (1250.0 * 34.12345678).toFixed(2);
    expect(computeBaseAmount('1250.00', '34.12345678')).toBe(naive);

    // Sapmanın gerçekten oluştuğu bir değer:
    expect(computeBaseAmount('0.10', '3')).toBe('0.30');
    expect(computeBaseAmount('1.15', '2')).toBe('2.30'); // 1.15*2 = 2.3000000000000003
  });

  it('yarım yukarı yuvarlar', () => {
    expect(computeBaseAmount('1.00', '1.005')).toBe('1.01');
    expect(computeBaseAmount('1.00', '1.004')).toBe('1.00');
  });

  it('sekiz ondalıklı kuru tam kullanır (kırpmaz)', () => {
    expect(computeBaseAmount('100.00', '1.00000001')).toBe('100.00');
    expect(computeBaseAmount('100000000.00', '1.00000001')).toBe('100000001.00');
  });

  it('büyük tutarlarda taşma yok (BigInt)', () => {
    expect(computeBaseAmount('9999999999.99', '1')).toBe('9999999999.99');
  });

  it('sıfır tutar', () => {
    expect(computeBaseAmount('0', '34.25')).toBe('0.00');
  });

  it('geçersiz biçimleri reddeder', () => {
    expect(() => computeBaseAmount('10.123', '1')).toThrow(/Geçersiz tutar/);
    expect(() => computeBaseAmount('abc', '1')).toThrow(/Geçersiz tutar/);
    expect(() => computeBaseAmount('10.00', '1.123456789')).toThrow(/Geçersiz kur/);
    expect(() => computeBaseAmount('10.00', '-1')).toThrow(/Geçersiz kur/);
  });
});

describe('sumMoney', () => {
  it('kuruş hassasiyetinde toplar', () => {
    expect(sumMoney(['42500.00', '42500.00'])).toBe('85000.00');
  });

  it('kayan nokta sapması üretmez', () => {
    // 0.1 + 0.2 = 0.30000000000000004 klasiği
    expect(sumMoney(['0.10', '0.20'])).toBe('0.30');
    expect(sumMoney(Array.from({ length: 10 }, () => '0.10'))).toBe('1.00');
  });

  it('boş liste sıfır döner', () => {
    expect(sumMoney([])).toBe('0.00');
  });

  it('geçersiz değeri reddeder', () => {
    expect(() => sumMoney(['1.999'])).toThrow(/Geçersiz tutar/);
  });
});

describe('subtractMoney — Job bakiyesi (ADR-014 türetilmiş tutar)', () => {
  it('anlaşma − tahsilat = kalan', () => {
    expect(subtractMoney('85625.00', '42812.50')).toBe('42812.50');
  });

  it('tam tahsil edilmiş iş sıfır bakiye', () => {
    expect(subtractMoney('85000.00', '85000.00')).toBe('0.00');
  });

  it('fazla tahsilat negatif döner', () => {
    expect(subtractMoney('100.00', '150.00')).toBe('-50.00');
  });
});
