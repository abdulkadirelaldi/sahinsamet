import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SESSION_COOKIE_NAME_DEV,
  SESSION_COOKIE_NAME_PROD,
  readSession,
  sessionCookieName,
} from '@/lib/security/session';

const getTokenMock = vi.hoisted(() => vi.fn());
vi.mock('next-auth/jwt', () => ({ getToken: getTokenMock }));

afterEach(() => {
  vi.restoreAllMocks();
  getTokenMock.mockReset();
});

function istek(): Request {
  return new Request('http://localhost:3000/panel');
}

/**
 * T-013a'nın DERSİ: bir kütüphane yapılandırmayı sessizce yok sayabilir ve kod
 * uyguluyormuş gibi durabilir. Aynı sınıf hata burada çerez ADI üzerinden
 * gelir — `session.ts` ile `auth.ts` ayrışırsa hiçbir hata çıkmaz, yalnızca
 * koruma yanlış çalışır.
 *
 * Bu yüzden `auth.ts` KAYNAĞI okunup adların birebir eşleştiği doğrulanıyor.
 * `auth.ts` içe aktarılmıyor: `next-auth` Vitest'in node ortamında yüklenemiyor
 * (T-013b notu) — metin üzerinden doğrulama bu kısıtın etrafından dolaşıyor.
 */
describe('çerez adı — auth.ts ile sapma kontrolü', () => {
  const authSource = readFileSync(path.resolve(process.cwd(), 'src/server/auth.ts'), 'utf8');

  it('üretim çerez adı auth.ts ile aynı', () => {
    expect(authSource).toContain(SESSION_COOKIE_NAME_PROD);
  });

  it('geliştirme çerez adı auth.ts ile aynı', () => {
    expect(authSource).toContain(SESSION_COOKIE_NAME_DEV);
  });

  /**
   * `auth.ts` adı `NODE_ENV === 'production'` ile seçiyor. Bizim seçimimiz de
   * aynı koşula bağlı olmalı; biri `AUTH_URL`'e, diğeri `NODE_ENV`'e bakarsa
   * ortamlardan birinde ad tutmaz.
   */
  it('auth.ts adı NODE_ENV üzerinden seçiyor — bizim mantığımızla aynı', () => {
    expect(authSource).toMatch(/useSecureCookies\s*=\s*process\.env\.NODE_ENV === 'production'/);
    expect(sessionCookieName(true)).toBe(SESSION_COOKIE_NAME_PROD);
    expect(sessionCookieName(false)).toBe(SESSION_COOKIE_NAME_DEV);
  });

  it('üretim adı __Secure- önekini taşır', () => {
    // Önek olmadan tarayıcı çerezin secure olduğunu zorlamaz (§8.3).
    expect(SESSION_COOKIE_NAME_PROD.startsWith('__Secure-')).toBe(true);
  });
});

describe('readSession — kapalı yönde başarısız olur', () => {
  it('AUTH_SECRET yoksa null döner ve getToken hiç çağrılmaz', async () => {
    const hata = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const sonuc = await readSession(istek(), { isProduction: true, secret: undefined });

    expect(sonuc).toBeNull();
    expect(getTokenMock).not.toHaveBeenCalled();
    expect(hata).toHaveBeenCalled();
  });

  it('getToken fırlatırsa null döner — hata içeri almaya dönüşmez', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getTokenMock.mockRejectedValue(new Error('çözülemedi'));

    expect(await readSession(istek(), { isProduction: false, secret: 's' })).toBeNull();
  });

  it('jeton yoksa null döner', async () => {
    getTokenMock.mockResolvedValue(null);

    expect(await readSession(istek(), { isProduction: false, secret: 's' })).toBeNull();
  });

  /** `sub` olmayan bir jeton kimliksizdir; oturum sayılmaz. */
  it('sub taşımayan jeton oturum sayılmaz', async () => {
    getTokenMock.mockResolvedValue({ email: 'x' });

    expect(await readSession(istek(), { isProduction: false, secret: 's' })).toBeNull();
  });
});

describe('readSession — geçerli oturum', () => {
  it('sub değerini userId olarak döner', async () => {
    getTokenMock.mockResolvedValue({ sub: 'kullanici-1' });

    expect(await readSession(istek(), { isProduction: false, secret: 's' })).toEqual({
      userId: 'kullanici-1',
      // Alan jetonda yok → `null` (T-019, geçiş penceresi).
      twoFactorEnabled: null,
    });
  });

  it('⚠️ süresi geçmiş giriş anı reddedilir: `exp` yenilense de oturum biter', async () => {
    const simdi = Math.floor(Date.now() / 1000);
    getTokenMock.mockResolvedValue({ sub: 'k', authTime: simdi - 25 * 60 * 60 });
    expect(await readSession(istek(), { isProduction: false, secret: 's' })).toBeNull();
    getTokenMock.mockResolvedValue({ sub: 'k', authTime: simdi - 60 });
    expect(await readSession(istek(), { isProduction: false, secret: 's' })).not.toBeNull();
  });

  /** §8.1 — 2FA durumu jetondan okunur; ara katman DB'ye bakmaz (T-014/K1). */
  it('tfa alanını jetondan okur', async () => {
    getTokenMock.mockResolvedValue({ sub: 'k', tfa: true });
    expect(await readSession(istek(), { isProduction: false, secret: 's' })).toEqual({
      userId: 'k',
      twoFactorEnabled: true,
    });

    getTokenMock.mockResolvedValue({ sub: 'k', tfa: false });
    expect(await readSession(istek(), { isProduction: false, secret: 's' })).toEqual({
      userId: 'k',
      twoFactorEnabled: false,
    });
  });

  it('getToken doğru çerez adı ve secret ile çağrılır', async () => {
    getTokenMock.mockResolvedValue({ sub: 'k' });

    await readSession(istek(), { isProduction: true, secret: 'gizli' });

    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: 'gizli',
        cookieName: SESSION_COOKIE_NAME_PROD,
        secureCookie: true,
      }),
    );
  });

  /**
   * Bu bir "çerez var mı" kontrolü DEĞİL — `getToken` jetonu `AUTH_SECRET` ile
   * çözer. Uydurma bir çerez değeri geçerli oturum sayılmamalı.
   */
  it('çerezin varlığı yetmez — çözülemeyen değer reddedilir', async () => {
    getTokenMock.mockResolvedValue(null);

    const sahteCerezli = new Request('http://localhost:3000/panel', {
      headers: { cookie: `${SESSION_COOKIE_NAME_DEV}=uydurma-deger` },
    });

    expect(await readSession(sahteCerezli, { isProduction: false, secret: 's' })).toBeNull();
  });
});
