import { describe, expect, it } from 'vitest';

import { tutarYaziBoyu } from '@/components/panel/para-bicim';

describe('tutarYaziBoyu', () => {
  it('kısa tutar normal boyda kalır', () => {
    expect(tutarYaziBoyu('12.345,67 ₺', 'text-xl')).toBe('text-xl');
  });

  it('uzadıkça küçülür', () => {
    expect(tutarYaziBoyu('123.456,78 ₺', 'text-xl')).toBe('text-base');
    expect(tutarYaziBoyu('1.234.567,89 ₺', 'text-xl')).toBe('text-sm');
  });
});
