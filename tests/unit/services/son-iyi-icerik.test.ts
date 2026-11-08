import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Son iyi içerik — veritabanı kesintisinde public okumalar FIRLATMAK yerine
 * bu süreçte en son başarıyla okunan değeri döndürür (content-cache.ts).
 *
 * `unstable_cache` doğrudan çağırana geçiyor: burada sınanan Next'in önbelleği
 * değil, onun ETRAFINDAKİ geri düşme davranışı.
 */

vi.mock('next/cache', () => ({
  unstable_cache:
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
    (...a: A) =>
      fn(...a),
}));

const uyari = vi.hoisted(() => vi.fn());
vi.mock('@/lib/security/guvenli-log', () => ({ guvenliUyari: uyari }));

const { cachedRead } = await import('@/server/services/_shared/content-cache');

/*
 * Her test KENDİ anahtarını kullanıyor: son iyi içerik süreç belleğinde ve
 * yalnızca test için bir "temizle" ihracı yazılmadı (ADR-037 ulaşılabilirlik
 * kapısı test dışında çağıranı olmayan ihracı reddediyor).
 */
let testNo = 0;
let tanim = (dil: string) => ({ keyParts: ['test', 'okuma'], tags: [`content:test:${dil}`] });

describe('cachedRead — son iyi içerik', () => {
  beforeEach(() => {
    const no = ++testNo;
    tanim = (dil: string) => ({ keyParts: ['test', `okuma-${no}`], tags: [`content:test:${dil}`] });
    uyari.mockClear();
  });

  it('okuma başarılıyken değeri olduğu gibi döndürür', async () => {
    const oku = cachedRead(async (dil: string) => `içerik-${dil}`, tanim);
    expect(await oku('tr')).toBe('içerik-tr');
  });

  it('kesintide son başarılı değeri döndürür ve UYARIR (sessiz değil)', async () => {
    let kapali = false;
    const oku = cachedRead(async (dil: string) => {
      if (kapali) throw new Error("Can't reach database server");
      return `içerik-${dil}`;
    }, tanim);

    await oku('tr');
    kapali = true;

    expect(await oku('tr')).toBe('içerik-tr');
    expect(uyari).toHaveBeenCalledTimes(1);
  });

  it('daha önce hiç okunmamış anahtarda hatayı YUTMAZ', async () => {
    const oku = cachedRead(async (_dil: string) => {
      throw new Error("Can't reach database server");
    }, tanim);
    await expect(oku('tr')).rejects.toThrow("Can't reach database server");
  });

  it('anahtar argümanları içeriyor — başka dilin içeriği sunulmaz', async () => {
    let kapali = false;
    const oku = cachedRead(async (dil: string) => {
      if (kapali) throw new Error('kesinti');
      return `içerik-${dil}`;
    }, tanim);

    await oku('tr');
    kapali = true;

    await expect(oku('en')).rejects.toThrow('kesinti');
  });

  it('kesinti bitince taze değer yeniden okunur', async () => {
    let surum = 1;
    let kapali = false;
    const oku = cachedRead(async (_dil: string) => {
      if (kapali) throw new Error('kesinti');
      return surum;
    }, tanim);

    await oku('tr');
    kapali = true;
    expect(await oku('tr')).toBe(1);

    kapali = false;
    surum = 2;
    expect(await oku('tr')).toBe(2);
  });
});
