import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import { createProfileSchema } from '@/lib/schemas';
import {
  fail,
  internalError,
  notFound,
  ok,
  parseOrFail,
  toMeasureString,
  toMoneyString,
  toRateString,
  toValidationFailure,
  unauthorized,
} from '@/server/services/_shared';

/* ======================= Decimal → string — ADR-014 ====================== */

/** Prisma `Decimal`'in test karşılığı — tek ihtiyacımız `toFixed`. */
const decimal = (value: string) => ({ toFixed: (dp = 0) => Number(value).toFixed(dp) });

describe('Decimal dönüştürücüleri', () => {
  it('toMoneyString 2 ondalık verir', () => {
    expect(toMoneyString(decimal('1250'))).toBe('1250.00');
    expect(toMoneyString(decimal('1250.5'))).toBe('1250.50');
  });

  it('toRateString 8 ondalık verir', () => {
    expect(toRateString(decimal('34.25'))).toBe('34.25000000');
  });

  it('toMeasureString verilen ölçeği kullanır', () => {
    expect(toMeasureString(decimal('82.4'), 2)).toBe('82.40');
    expect(toMeasureString(decimal('18.5'), 1)).toBe('18.5');
  });

  it('null geçirilirse null döner (opsiyonel alanlar)', () => {
    expect(toMoneyString(null)).toBeNull();
    expect(toRateString(undefined)).toBeNull();
  });

  it('Decimal olmayan değer TİP HATASI verir — sessizce geçmez', () => {
    expect(() => toMoneyString('1250.00' as unknown as { toFixed(): string })).toThrow(TypeError);
  });

  it('ÇIKTI DAİMA string — hiçbir servis Decimal döndürmemeli', () => {
    expect(typeof toMoneyString(decimal('1'))).toBe('string');
    expect(typeof toRateString(decimal('1'))).toBe('string');
  });
});

/* ========================= §7.2 yanıt zarfı ============================== */

describe('ok / fail / kısayollar', () => {
  it('ok zarfı', () => {
    expect(ok({ id: '1' })).toEqual({ ok: true, data: { id: '1' } });
  });

  it('fail zarfı, fields opsiyonel', () => {
    expect(fail('NOT_FOUND', 'yok')).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'yok' },
    });
  });

  it('unauthorized / notFound kısayolları', () => {
    expect(unauthorized().error.code).toBe('UNAUTHORIZED');
    expect(notFound().error.code).toBe('NOT_FOUND');
  });

  it('internalError §8.20 — mesaj GENEL, ayrıntı sızmaz', () => {
    const result = internalError('test', new Error('veritabani baglantisi koptu: 10.0.0.5:5432'));
    expect(result.error.code).toBe('INTERNAL_ERROR');
    expect(result.error.message).toBe('İşlem tamamlanamadı. Lütfen tekrar deneyin.');
    expect(JSON.stringify(result)).not.toContain('10.0.0.5');
  });
});

describe('toValidationFailure — §7.2 fields eşlemesi', () => {
  it('VALIDATION_ERROR kodu ve alan sözlüğü', () => {
    const result = createProfileSchema.safeParse({
      headline: '',
      bio: '',
      socials: { instagram: 'degil-bir-adres' },
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const failure = toValidationFailure(result.error);
    expect(failure.ok).toBe(false);
    expect(failure.error.code).toBe('VALIDATION_ERROR');
    expect(failure.error.fields?.headline).toBeDefined();
    expect(failure.error.fields?.['socials.instagram']).toBeDefined();
  });

  it('alan başına YALNIZCA İLK mesaj taşınır', () => {
    // Tek alanda iki kural birden ihlal ediliyor; kullanıcıya tek satır gösterilecek.
    const schema = z.object({
      ad: z
        .string()
        .min(5, { error: 'en az 5 karakter' })
        .regex(/^\d+$/, { error: 'sadece rakam' }),
    });
    const result = schema.safeParse({ ad: 'ab' });
    if (result.success) return;
    const failure = toValidationFailure(result.error);
    expect(failure.error.fields?.ad).toBe('en az 5 karakter');
  });

  it('İÇ İÇE alanlar nokta ile düzleştirilir', () => {
    const schema = z.object({
      socials: z.object({ github: z.url({ error: 'geçersiz bağlantı' }) }),
    });
    const result = schema.safeParse({ socials: { github: 'degil' } });
    if (result.success) return;
    expect(toValidationFailure(result.error).error.fields?.['socials.github']).toBe(
      'geçersiz bağlantı',
    );
  });

  it('alan adı olmayan (form düzeyi) hata message’a düşer', () => {
    const schema = z.object({ a: z.string() }).refine(() => false, { error: 'form düzeyi hata' });
    const result = schema.safeParse({ a: 'x' });
    if (result.success) return;
    expect(toValidationFailure(result.error).error.message).toBe('form düzeyi hata');
  });
});

describe('parseOrFail — Server Action akışı (§7.1)', () => {
  it('geçerli girdide veriyi döner', () => {
    const result = parseOrFail(z.object({ a: z.string() }), { a: 'x' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ a: 'x' });
  });

  it('geçersiz girdide §7.2 zarfı döner', () => {
    const result = parseOrFail(z.object({ a: z.string() }), { a: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.error.code).toBe('VALIDATION_ERROR');
  });
});
