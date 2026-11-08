import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `closeDatabase()` — BULGU-007 gerileme testi.
 *
 * NEDEN BU TEST VAR: `db.$disconnect()` `pg` havuzunu kapatmıyor; havuz
 * `idleTimeoutMillis` (30 sn) boyunca olay döngüsünü ayakta tutuyor ve kısa
 * ömürlü her betik tam 30 sn fazladan yaşıyordu (ölçüldü: 30.63 sn → 0.18 sn).
 * §13.5'in gece cron'ları kısa ömürlüdür; bu gecikme koşumların üst üste
 * binmesine yol açardı.
 *
 * Test VERİTABANI GEREKTİRMEZ: `pg` taklit ediliyor.
 */

const mocks = vi.hoisted(() => {
  const poolEnd = vi.fn().mockResolvedValue(undefined);
  const poolConnect = vi.fn().mockResolvedValue({ release: vi.fn() });
  const poolConstructor = vi.fn();
  return { poolEnd, poolConnect, poolConstructor };
});

vi.mock('pg', () => ({
  Pool: class {
    constructor(config: unknown) {
      mocks.poolConstructor(config);
    }
    connect = mocks.poolConnect;
    end = mocks.poolEnd;
  },
}));

/** Prisma istemcisi kurulmasın; `closeDatabase` yalnızca havuzu görsün. */
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: class {} }));

const ORIGINAL_URL = process.env.DATABASE_URL;

beforeEach(() => {
  vi.resetModules();
  /**
   * `globalThis` modül yeniden yüklemesinden SAĞ ÇIKAR — hot reload kalıbının
   * amacı zaten bu (T-003c). Testler arası izolasyon için elle temizleniyor;
   * aksi hâlde önceki testin havuzu bir sonrakine sızar.
   */
  const g = globalThis as unknown as { pgPool?: unknown; prisma?: unknown };
  delete g.pgPool;
  delete g.prisma;
  mocks.poolEnd.mockClear();
  mocks.poolConnect.mockClear();
  mocks.poolConstructor.mockClear();
  process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:5433/d';
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_URL;
  // `NODE_ENV` salt okunur olduğu için doğrudan atanmaz; Vitest'in stub API'si kullanılır.
  vi.unstubAllEnvs();
});

describe('closeDatabase — TEMBELLİK KORUNUYOR', () => {
  it('havuz HİÇ KURULMADIYSA hata vermez ve havuz OLUŞTURMAZ', async () => {
    // T-003c kazanımı: `.env` bulunmayan bir ortamda çağrılsa bile patlamamalı.
    const { closeDatabase } = await import('@/server/db');
    await expect(closeDatabase()).resolves.toBeUndefined();
    expect(mocks.poolConstructor).not.toHaveBeenCalled();
    expect(mocks.poolEnd).not.toHaveBeenCalled();
  });

  it('DATABASE_URL yokken bile fırlatmaz', async () => {
    delete process.env.DATABASE_URL;
    const { closeDatabase } = await import('@/server/db');
    await expect(closeDatabase()).resolves.toBeUndefined();
  });
});

describe('closeDatabase — havuz kuruluysa gerçekten kapatır', () => {
  it('pingDatabase sonrası pool.end() çağrılır', async () => {
    const { closeDatabase, pingDatabase } = await import('@/server/db');
    await pingDatabase();
    expect(mocks.poolConstructor).toHaveBeenCalledTimes(1);

    await closeDatabase();
    expect(mocks.poolEnd).toHaveBeenCalledTimes(1);
  });

  it('İKİ KEZ çağrılınca patlamaz ve end() bir kez çalışır', async () => {
    const { closeDatabase, pingDatabase } = await import('@/server/db');
    await pingDatabase();

    await closeDatabase();
    await expect(closeDatabase()).resolves.toBeUndefined();
    expect(mocks.poolEnd).toHaveBeenCalledTimes(1);
  });

  it('pool.end() hata verirse yutulur — kapanış yolu çökmemeli', async () => {
    mocks.poolEnd.mockRejectedValueOnce(new Error('already ended'));
    const { closeDatabase, pingDatabase } = await import('@/server/db');
    await pingDatabase();
    await expect(closeDatabase()).resolves.toBeUndefined();
  });

  it('kapatmadan sonra yeniden kullanılabilir — YENİ havuz kurulur', async () => {
    const { closeDatabase, pingDatabase } = await import('@/server/db');
    await pingDatabase();
    await closeDatabase();
    await pingDatabase();
    expect(mocks.poolConstructor).toHaveBeenCalledTimes(2);
  });
});

describe('havuz önbelleği — üretimde de tek havuz', () => {
  it('development: çok çağrı TEK havuz', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { pingDatabase } = await import('@/server/db');
    for (let i = 0; i < 5; i++) await pingDatabase();
    expect(mocks.poolConstructor).toHaveBeenCalledTimes(1);
  });

  it('PRODUCTION: çok çağrı TEK havuz (T-003d sızıntı düzeltmesi)', async () => {
    // Düzeltmeden önce üretim dalı hiçbir yere yazmıyordu: her `pingDatabase()`
    // yeni bir havuz kuruyordu. Ölçüldü: 5 çağrı → 6 aktif bağlantı.
    vi.stubEnv('NODE_ENV', 'production');
    const { pingDatabase } = await import('@/server/db');
    for (let i = 0; i < 5; i++) await pingDatabase();
    expect(mocks.poolConstructor).toHaveBeenCalledTimes(1);
  });

  it('havuz ADR-005 ayarlarıyla kurulur', async () => {
    const { pingDatabase } = await import('@/server/db');
    await pingDatabase();
    expect(mocks.poolConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      }),
    );
  });
});
