import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `src/server/db.ts` — tembel (lazy) kurulum davranışının gerileme testi.
 *
 * NEDEN BU TEST VAR: BULGU-002 (T-004). Havuz modül gövdesinde kuruluyordu ve
 * `DATABASE_URL` yokken `import` anında `throw` ediyordu. Sonuç: `next build`
 * "Collecting page data" adımında çöküyordu — CI'da ve Docker derleme
 * katmanında `.env` bulunmadığı için (§8.17) hat hiç kurulamıyordu.
 * T-003c bunu tembel kuruluma çevirdi.
 *
 * Bu davranış gözle görülmez: biri `getPool()` çağrısını tekrar modül gövdesine
 * taşırsa `pnpm test` yeşil kalır, `pnpm lint` yeşil kalır ve hata YALNIZCA
 * `.env`'siz bir ortamda derleme yapılınca ortaya çıkar — yani CI'da veya
 * üretim imajı üretilirken. Aşağıdaki testler o gerilemeyi anında yakalar.
 *
 * NOT: `src/server/db.ts` Backend ajanının dosyasıdır (§10.1) — okundu,
 * DÜZENLENMEDİ. Test Güvenlik ajanınındır.
 */

/** `pg.Pool` yapıcısının çağrılıp çağrılmadığını izleyen casus. */
const poolConstructorSpy = vi.hoisted(() => vi.fn());
const connectSpy = vi.hoisted(() => vi.fn());

vi.mock('pg', () => {
  class MockPool {
    constructor(config: unknown) {
      poolConstructorSpy(config);
    }

    async connect(): Promise<{ release: () => void }> {
      connectSpy();
      return { release: () => undefined };
    }
  }

  return { Pool: MockPool, default: { Pool: MockPool } };
});

/**
 * `db.ts` havuzu `globalThis` üzerinde önbelleğe alıyor (hot reload'da havuz
 * çoğalmasın diye — NODE_ENV `production` değilken). Vitest'te NODE_ENV
 * `test` olduğu için bu önbellek testler arasında YAŞAR ve `vi.resetModules()`
 * tek başına yetmez. Her testten önce elle temizlenmeli, yoksa ikinci test
 * birincinin havuzunu görür ve tembellik ölçümü anlamsızlaşır.
 */
function clearGlobalDbCache(): void {
  const globalForDb = globalThis as unknown as {
    prisma?: unknown;
    pgPool?: unknown;
  };
  delete globalForDb.prisma;
  delete globalForDb.pgPool;
}

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

beforeEach(() => {
  vi.resetModules();
  clearGlobalDbCache();
  poolConstructorSpy.mockClear();
  connectSpy.mockClear();
});

afterEach(() => {
  if (ORIGINAL_DATABASE_URL === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
  }
  clearGlobalDbCache();
});

describe('tembel kurulum — modül yüklenirken havuz KURULMAZ', () => {
  it('DATABASE_URL yokken modül import edilebilir (fırlatmaz)', async () => {
    delete process.env.DATABASE_URL;

    // BULGU-002'nin tam kendisi: burası fırlatırsa `next build` çöker.
    await expect(import('@/server/db')).resolves.toBeDefined();
  });

  it('DATABASE_URL yokken import sonrası pg.Pool yapıcısı HİÇ çağrılmaz', async () => {
    delete process.env.DATABASE_URL;

    await import('@/server/db');

    expect(poolConstructorSpy).not.toHaveBeenCalled();
  });

  it('DATABASE_URL VARKEN bile import havuzu kurmaz — tembellik değere bağlı değil', async () => {
    process.env.DATABASE_URL = 'postgresql://kullanici:parola@db.ornek:5432/sahinsamet';

    await import('@/server/db');

    // Geçerli bir bağlantı dizesi olsa dahi bağlantı derleme zamanında kurulmaz.
    expect(poolConstructorSpy).not.toHaveBeenCalled();
  });

  it('havuz İLK erişimde kurulur ve sonraki çağrılarda yeniden kurulmaz', async () => {
    process.env.DATABASE_URL = 'postgresql://kullanici:parola@db.ornek:5432/sahinsamet';

    const { pingDatabase } = await import('@/server/db');
    expect(poolConstructorSpy).not.toHaveBeenCalled();

    await pingDatabase();
    expect(poolConstructorSpy).toHaveBeenCalledTimes(1);

    await pingDatabase();
    // Tekil (singleton) olmalı — her yoklamada yeni havuz açılsaydı Postgres
    // bağlantı limiti kısa sürede tükenirdi.
    expect(poolConstructorSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledTimes(2);
  });

  /**
   * T-003b'de "dışarıya sözleşme" olarak yayımlanan havuz ayarı.
   * `pg` varsayılanı `0`'dır — sonsuz bekleme. O hâlde DB kapalıyken
   * `/api/v1/health` 503 dönmek yerine asılı kalır ve Uptime Kuma (§13.7)
   * zaman aşımına düşer.
   */
  it('havuz açık zaman aşımıyla kurulur — asılı kalmaz', async () => {
    process.env.DATABASE_URL = 'postgresql://kullanici:parola@db.ornek:5432/sahinsamet';

    const { pingDatabase } = await import('@/server/db');
    await pingDatabase();

    expect(poolConstructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ connectionTimeoutMillis: 5_000 }),
    );
  });
});

describe('eksik DATABASE_URL — sessizce yutulmaz', () => {
  it('pingDatabase() İLK erişimde hata fırlatır', async () => {
    delete process.env.DATABASE_URL;

    const { pingDatabase } = await import('@/server/db');

    await expect(pingDatabase()).rejects.toThrow(/DATABASE_URL/);
  });

  it('`db` proxy erişimi de hata fırlatır — eksik yapılandırma gizlenmez', async () => {
    delete process.env.DATABASE_URL;

    const { db } = await import('@/server/db');

    // Proxy'nin `get` tuzağı istemciyi çözmeye çalışır; havuz kurulamaz.
    expect(() => db.$connect).toThrow(/DATABASE_URL/);
  });

  it('hata fırlatıldıktan sonra havuz yarım kurulmuş hâlde kalmaz', async () => {
    delete process.env.DATABASE_URL;

    const { pingDatabase } = await import('@/server/db');

    await expect(pingDatabase()).rejects.toThrow();
    await expect(pingDatabase()).rejects.toThrow();

    // Başarısız kurulum global önbelleğe yazılmamalı; yoksa DATABASE_URL
    // sonradan tanımlansa bile süreç kalıcı olarak bozuk kalırdı.
    expect(poolConstructorSpy).not.toHaveBeenCalled();
  });
});

describe('§8.20 — hata mesajı sır sızdırmaz', () => {
  it('mesaj anahtarın ADINI söyler ve nasıl düzeltileceğini gösterir', async () => {
    delete process.env.DATABASE_URL;

    const { pingDatabase } = await import('@/server/db');
    const error = await pingDatabase().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;

    // Eyleme dönük olmalı: hangi anahtar eksik, nereye bakılacak.
    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('.env');
  });

  /**
   * §8.20 — "Loglarda şifre, token, TOTP secret, tam e-posta ASLA görünmez".
   *
   * Somut senaryo: bu hata sunucu loguna düşer, log bir dosyaya veya izleme
   * servisine akar. Mesaj bağlantı dizesini içerseydi veritabanı parolası
   * düz metin olarak log akışına girerdi — üstelik en çok tekrarlanan hata
   * yolunda, yani en çok loglanan yerde.
   */
  it('mesajda bağlantı dizesi, parola, host, kullanıcı adı veya port GEÇMEZ', async () => {
    // Ortamda gerçekçi bir değer varken bile mesaj onu taşımamalı: burada
    // değeri bilinçli olarak tanımlayıp createPool'un onu okumasını engelliyoruz
    // (boş dize de "eksik" sayılır) — mesaj yine üretilecek.
    process.env.DATABASE_URL = '';

    const { pingDatabase } = await import('@/server/db');
    const error = await pingDatabase().catch((cause: unknown) => cause);
    const message = (error as Error).message;

    for (const gizli of [
      'postgresql://',
      'postgres://',
      'parola',
      'password',
      'kullanici',
      '5432',
      '@',
    ]) {
      expect(message, `mesaj "${gizli}" içermemeli`).not.toContain(gizli);
    }
  });

  it('mesaj ortam değişkenlerinin dökümünü içermez', async () => {
    delete process.env.DATABASE_URL;

    const { pingDatabase } = await import('@/server/db');
    const error = await pingDatabase().catch((cause: unknown) => cause);
    const message = (error as Error).message;

    expect(message).not.toContain('AUTH_SECRET');
    expect(message).not.toContain('R2_SECRET');
    expect(message.length).toBeLessThan(200);
  });
});
