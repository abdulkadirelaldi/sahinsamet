import { describe, expect, it, vi } from 'vitest';

import { birKez } from '@/server/services/islem-anahtari';

/** Gerçek davranışı taklit eder: anahtar kümesi, başarısız işlemde geri alma. */
function sahte() {
  const anahtarlar = new Set<string>();
  const client = {
    islemAnahtari: {
      findUnique: async ({ where }: { where: { anahtar: string } }) =>
        anahtarlar.has(where.anahtar) ? where : null,
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const eklenen: string[] = [];
      const tx = {
        islemAnahtari: {
          create: async ({ data }: { data: { anahtar: string } }) => {
            if (anahtarlar.has(data.anahtar)) {
              throw Object.assign(new Error('benzersiz'), { code: 'P2002' });
            }
            anahtarlar.add(data.anahtar);
            eklenen.push(data.anahtar);
          },
        },
      };
      try {
        return await fn(tx);
      } catch (e) {
        eklenen.forEach((a) => anahtarlar.delete(a)); // geri alma
        throw e;
      }
    },
  } as never;
  return client;
}

describe('birKez — yanıtı kaybolan istek iki kez yazmaz (2026-10-31)', () => {
  it('⚠️ aynı anahtarla ikinci çağrı işi ÇALIŞTIRMAZ', async () => {
    const client = sahte();
    const is = vi.fn().mockResolvedValue('kayit');
    expect(await birKez('a', is, client)).toBe('kayit');
    expect(await birKez('a', is, client)).toBeNull();
    expect(is).toHaveBeenCalledTimes(1);
  });

  it('iş başarısızsa anahtar kalmaz, yeniden deneme çalışır', async () => {
    const client = sahte();
    const is = vi.fn().mockRejectedValueOnce(new Error('db')).mockResolvedValue('kayit');
    await expect(birKez('a', is, client)).rejects.toThrow('db');
    expect(await birKez('a', is, client)).toBe('kayit');
  });

  it('anahtarsız çağrı her seferinde çalışır; başka hata yutulmaz', async () => {
    const client = sahte();
    const is = vi.fn().mockResolvedValue(1);
    await birKez(undefined, is, client);
    await birKez(undefined, is, client);
    expect(is).toHaveBeenCalledTimes(2);
    const hata = Object.assign(new Error('x'), { code: 'P2025' });
    await expect(birKez('b', vi.fn().mockRejectedValue(hata), client)).rejects.toBe(hata);
  });
});

describe('birKez · başka tablodaki çakışma (2026-11-01)', () => {
  const p2002 = () => Object.assign(new Error('x'), { code: 'P2002' });
  const istemci = (anahtarVar: boolean) =>
    ({
      $transaction: (f: (t: unknown) => unknown) => f({ islemAnahtari: { create: vi.fn() } }),
      islemAnahtari: {
        findUnique: vi.fn().mockResolvedValue(anahtarVar ? { anahtar: 'a' } : null),
      },
    }) as never;

  it('⚠️ anahtar yazılmamışsa kayıt kaybolmaz, yeniden denenir', async () => {
    const is = vi.fn().mockRejectedValueOnce(p2002()).mockResolvedValueOnce('kayit');
    expect(await birKez('a', is, istemci(false))).toBe('kayit');
    expect(is).toHaveBeenCalledTimes(2);
  });

  it('anahtar varsa gerçekten işlenmiştir', async () => {
    const is = vi.fn().mockRejectedValue(p2002());
    expect(await birKez('a', is, istemci(true))).toBeNull();
    expect(is).toHaveBeenCalledTimes(1);
  });

  it('ikinci denemede de çakışırsa hata görünür, başarı yalanı yok', async () => {
    const is = vi.fn().mockRejectedValue(p2002());
    await expect(birKez('a', is, istemci(false))).rejects.toThrow('x');
  });

  it('anahtarsız çağrıda P2002 yutulmaz', async () => {
    const is = vi.fn().mockRejectedValue(p2002());
    await expect(birKez(undefined, is, istemci(false))).rejects.toThrow('x');
  });
});
