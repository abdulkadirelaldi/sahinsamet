import { describe, expect, it } from 'vitest';

import { updateWalletAccountSchema, updateWalletFlowSchema } from '@/lib/schemas/wallet';

const ID = 'cmhabit000000000000000001';

describe('⚠️ cüzdan güncelleme şemaları varsayılan eklemez', () => {
  it('hesap: gönderilmeyen birim TL olmaz', () => {
    const r = updateWalletAccountSchema.parse({ id: ID, name: 'Altın', balance: '10.00' });
    expect(r).toEqual({ id: ID, name: 'Altın', balance: '10.00' });
  });

  it('hesap: birim bilerek düzeltilebilir', () => {
    expect(updateWalletAccountSchema.parse({ id: ID, unit: 'GOLD_GRAM' }).unit).toBe('GOLD_GRAM');
  });

  it('akış: gönderilmeyen birim ve sıklık eklenmez', () => {
    const r = updateWalletFlowSchema.parse({ id: ID, name: 'Kira' });
    expect(r).not.toHaveProperty('unit');
    expect(r).not.toHaveProperty('frequency');
  });
});
