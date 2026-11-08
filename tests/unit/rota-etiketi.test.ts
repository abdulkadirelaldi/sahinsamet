import { describe, expect, it } from 'vitest';

import { rotaEtiketi } from '@/components/panel/panel-rotalar';

describe('rotaEtiketi (2026-11-01)', () => {
  it('⚠️ kayıt kimliği kırıntıda görünmez', () => {
    expect(rotaEtiketi('/panel/spor/program/cmvxj1z9o0000952mkjpe2sft')).toBe('Ayrıntı');
  });
  it('bilinen rota adıyla, bilinmeyen segment olduğu gibi', () => {
    expect(rotaEtiketi('/panel/spor/program')).toBe('Program');
    expect(rotaEtiketi('/panel/bilinmeyen')).toBe('bilinmeyen');
  });
});
