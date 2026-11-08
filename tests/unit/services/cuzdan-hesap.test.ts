import { describe, expect, it, vi } from 'vitest';

import {
  createWalletFlow,
  createWalletTransfer,
  deleteWalletFlow,
  deleteWalletTransfer,
  fetchSonTransferler,
  updateWalletFlow,
} from '@/server/services/cuzdan';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

const CID = 'ckabcdefghijklmnopqrstuv';

/** Bellekteki hesaplarla sahte işlem: bakiyeler gerçekten değişir. */
function kurulum(bakiyeler: Record<string, string>, kalem?: Record<string, unknown>) {
  const hesap = { ...bakiyeler };
  const tx = {
    $queryRaw: vi.fn(),
    walletAccount: {
      findUnique: vi.fn(({ where }: { where: { id: string } }) => {
        const b = hesap[where.id];
        return Promise.resolve(
          b === undefined ? null : { unit: 'TRY', balance: decimal(b), isArchived: false },
        );
      }),
      update: vi.fn(({ where, data }: { where: { id: string }; data: { balance: string } }) => {
        hesap[where.id] = data.balance;
        return Promise.resolve({});
      }),
    },
    walletFlow: {
      create: vi.fn().mockResolvedValue({ id: 'f' }),
      findUnique: vi.fn().mockResolvedValue(kalem ?? null),
      update: vi.fn().mockResolvedValue({ id: 'f' }),
      delete: vi.fn().mockResolvedValue({ id: 'f' }),
    },
    walletTransfer: {
      create: vi.fn().mockResolvedValue({ id: 't' }),
      findUnique: vi.fn().mockResolvedValue(kalem ?? null),
      delete: vi.fn(),
    },
  };
  return {
    hesap,
    tx,
    client: { ...tx, $transaction: (f: (t: typeof tx) => unknown) => f(tx) } as never,
  };
}

const gider = {
  kind: 'EXPENSE' as const,
  name: 'Market',
  unit: 'TRY' as const,
  amount: '100.00',
  frequency: 'ONCE' as const,
  date: '2026-11-01',
};

describe('kalemin hesaba yansıması (2026-11-01)', () => {
  it('⚠️ hesap seçilmezse bakiye değişmez', async () => {
    const k = kurulum({ h: '500.00' });
    await createWalletFlow(gider, k.client);
    expect(k.hesap.h).toBe('500.00');
    expect(k.tx.walletFlow.create.mock.calls[0]?.[0].data.hesapId).toBeNull();
  });

  it('gider düşer, gelir ekler', async () => {
    const k = kurulum({ h: '500.00' });
    await createWalletFlow({ ...gider, hesapId: 'h' }, k.client);
    expect(k.hesap.h).toBe('400.00');
    await createWalletFlow({ ...gider, kind: 'INCOME', amount: '50.00', hesapId: 'h' }, k.client);
    expect(k.hesap.h).toBe('450.00');
  });

  it('⚠️ bakiye yetmezse kalem yazılmaz', async () => {
    const k = kurulum({ h: '50.00' });
    await expect(createWalletFlow({ ...gider, hesapId: 'h' }, k.client)).rejects.toThrow(
      'yeterli bakiye',
    );
    expect(k.tx.walletFlow.create).not.toHaveBeenCalled();
  });

  it('düzenli kalem hesaba yansımaz', async () => {
    const k = kurulum({ h: '500.00' });
    await createWalletFlow({ ...gider, frequency: 'MONTHLY', hesapId: 'h' }, k.client);
    expect(k.hesap.h).toBe('500.00');
    expect(k.tx.walletFlow.create.mock.calls[0]?.[0].data.hesapId).toBeNull();
  });

  const kayitli = {
    kind: 'EXPENSE',
    frequency: 'ONCE',
    amount: decimal('100.00'),
    unit: 'TRY',
    hesapId: 'h',
  };

  it('⚠️ tutar düzeltilince fark yansır, ikiye sayılmaz', async () => {
    const k = kurulum({ h: '400.00' }, kayitli);
    await updateWalletFlow({ id: CID, amount: '150.00' }, k.client);
    expect(k.hesap.h).toBe('350.00');
  });

  it('⚠️ yalnızca ad değişince bakiyeye dokunulmaz: gelir harcanmış olsa da', async () => {
    const k = kurulum({ h: '1.00' }, { ...kayitli, kind: 'INCOME' });
    await updateWalletFlow({ id: CID, name: 'Yeni ad', amount: '100.00' }, k.client);
    expect(k.hesap.h).toBe('1.00');
    expect(k.tx.walletAccount.update).not.toHaveBeenCalled();
  });

  it('hesap değişince eskisine iade, yenisinden düşüm', async () => {
    const k = kurulum({ h: '400.00', y: '300.00' }, kayitli);
    await updateWalletFlow({ id: CID, hesapId: 'y' }, k.client);
    expect(k.hesap).toEqual({ h: '500.00', y: '200.00' });
  });

  it('hesap kaldırılınca iade edilir', async () => {
    const k = kurulum({ h: '400.00' }, kayitli);
    await updateWalletFlow({ id: CID, hesapId: null }, k.client);
    expect(k.hesap.h).toBe('500.00');
    expect(k.tx.walletFlow.update.mock.calls[0]?.[0].data.hesapId).toBeNull();
  });

  it('silinince iade edilir; hesapsız eski kayıt bakiyeye dokunmaz', async () => {
    const k = kurulum({ h: '400.00' }, kayitli);
    await deleteWalletFlow('f', k.client);
    expect(k.hesap.h).toBe('500.00');

    const e = kurulum({ h: '400.00' }, { ...kayitli, hesapId: null });
    await deleteWalletFlow('f', e.client);
    expect(e.hesap.h).toBe('400.00');
  });
});

describe('transfer (2026-11-01)', () => {
  const girdi = { kaynakId: 'a', hedefId: 'b', amount: '100.00', gun: '2026-11-01' };

  it('toplam değişmez', async () => {
    const k = kurulum({ a: '300.00', b: '50.00' });
    await createWalletTransfer(girdi, k.client);
    expect(k.hesap).toEqual({ a: '200.00', b: '150.00' });
  });

  it('⚠️ kaynakta yetmezse hiçbir şey olmaz', async () => {
    const k = kurulum({ a: '10.00', b: '50.00' });
    await expect(createWalletTransfer(girdi, k.client)).rejects.toThrow('yeterli bakiye');
    expect(k.hesap).toEqual({ a: '10.00', b: '50.00' });
    expect(k.tx.walletTransfer.create).not.toHaveBeenCalled();
  });

  const kayit = { id: 't', kaynakId: 'a', hedefId: 'b', amount: decimal('100.00') };

  it('geri alınır', async () => {
    const k = kurulum({ a: '200.00', b: '150.00' }, kayit);
    await deleteWalletTransfer('t', k.client);
    expect(k.hesap).toEqual({ a: '300.00', b: '50.00' });
  });

  it('⚠️ hedefte para kalmadıysa geri alınmaz', async () => {
    const k = kurulum({ a: '200.00', b: '10.00' }, kayit);
    await expect(deleteWalletTransfer('t', k.client)).rejects.toThrow('yeterli bakiye');
    expect(k.tx.walletTransfer.delete).not.toHaveBeenCalled();
  });
});

describe('fetchSonTransferler', () => {
  it('Decimal sızmaz; silinmiş hesap adı uydurulmaz', async () => {
    const client = {
      walletTransfer: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 't',
            kaynakId: 'a',
            hedefId: 'yok',
            amount: decimal('10.00'),
            gun: new Date('2026-11-01T00:00:00Z'),
            note: null,
          },
        ]),
      },
      $queryRaw: vi.fn(),
      walletAccount: {
        findMany: vi.fn().mockResolvedValue([{ id: 'a', name: 'Ziraat', unit: 'TRY' }]),
      },
    } as never;
    const s = await fetchSonTransferler(client);
    expect(decimalKalanlar(s)).toEqual([]);
    expect(s[0]).toMatchObject({ kaynak: 'Ziraat', hedef: 'Silinmiş hesap', amount: '10.00' });
  });
});
