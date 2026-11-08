import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `@/server/auth` NextAuth'u yükler ve Vitest'in node ortamında import
 * edilemez (T-013b/T3). `vi.mock` modülü HİÇ YÜKLETMEDEN değiştirdiği için
 * eylemler burada doğrudan test edilebiliyor.
 */
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  auditCreate: vi.fn(),
  auditCount: vi.fn(),
  writesRevoked: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: mocks.writesRevoked }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

/** Prisma istemcisi — eylemler varsayılan `db`'yi kullanıyor, onu taklit ediyoruz. */
vi.mock('@/server/db', () => ({
  db: {
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    auditLog: { create: mocks.auditCreate, count: mocks.auditCount },
  },
}));

const authMock = mocks.auth;
const revalidatePathMock = mocks.revalidatePath;
const userFindUnique = mocks.userFindUnique;
const userUpdate = mocks.userUpdate;
const auditCreate = mocks.auditCreate;
const auditCount = mocks.auditCount;

import { generateBackupCodes, hashBackupCodes } from '@/server/auth/backup-codes';
import { encryptSecret, generateTotpSecret } from '@/server/auth/totp';
import {
  confirmTotpSetup,
  getTotpStatus,
  regenerateBackupCodes,
  startTotpSetup,
} from '@/server/actions/totp';

const USER_ID = 'usr_1';
const EMAIL = 'admin@example.com';
const FAST = { memoryCost: 1024, timeCost: 1, parallelism: 1 } as const;
const TEST_KEY = Buffer.alloc(32, 11).toString('base64');
const ORIGINAL_KEY = process.env.TOTP_ENCRYPTION_KEY;

/** otplib ile gerçek, geçerli bir kod üretir. */
async function currentToken(secret: string): Promise<string> {
  const { generate, NobleCryptoPlugin, ScureBase32Plugin } = await import('otplib');
  return generate({
    secret,
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
    period: 30,
  });
}

interface UserRow {
  id: string;
  email: string;
  totpSecret: string | null;
  totpEnabled: boolean;
  totpConfirmedAt: Date | null;
  totpBackupCodes: string[];
}

function givenUser(overrides: Partial<UserRow> = {}): UserRow {
  const row: UserRow = {
    id: USER_ID,
    email: EMAIL,
    totpSecret: null,
    totpEnabled: false,
    totpConfirmedAt: null,
    totpBackupCodes: [],
    ...overrides,
  };
  userFindUnique.mockResolvedValue(row);
  return row;
}

beforeEach(() => {
  process.env.TOTP_ENCRYPTION_KEY = TEST_KEY;
  authMock.mockResolvedValue({ user: { id: USER_ID } });
  userUpdate.mockResolvedValue({});
  auditCreate.mockResolvedValue({});
  auditCount.mockResolvedValue(0);
  mocks.writesRevoked.mockResolvedValue(false);
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
  else process.env.TOTP_ENCRYPTION_KEY = ORIGINAL_KEY;
  vi.clearAllMocks();
});

/* ===================== BULGU-027 — ADR-035/B yazma iptali ================= */

describe('⚠️ BULGU-027 — yazma yetkisi İPTAL EDİLMİŞ oturum 2FA yazamaz', () => {
  it.each([
    ['startTotpSetup', () => startTotpSetup()],
    ['confirmTotpSetup', () => confirmTotpSetup('123456')],
    ['regenerateBackupCodes', () => regenerateBackupCodes('123456')],
  ] as const)('%s — UNAUTHORIZED ve veritabanına YAZMIYOR', async (_ad, cagir) => {
    /*
     * Şifre değiştirildi (ADR-035/B): bu oturumun jetonu `writesValidFrom`dan
     * eski. T-062'ye kadar üç eylem bunu görmüyordu.
     */
    mocks.writesRevoked.mockResolvedValue(true);
    givenUser({ totpSecret: 'x', totpEnabled: true, totpConfirmedAt: new Date() });

    const sonuc = await cagir();

    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.error.code).toBe('UNAUTHORIZED');
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('OKUMA (`getTotpStatus`) iptalden ETKİLENMİYOR — ADR-035 okumaları F6/C`ye bıraktı', async () => {
    mocks.writesRevoked.mockResolvedValue(true);
    givenUser({ totpEnabled: true, totpConfirmedAt: new Date() });

    expect((await getTotpStatus()).enabled).toBe(true);
    expect(mocks.writesRevoked).not.toHaveBeenCalled();
  });
});

/* ========================== getTotpStatus ================================ */

describe('getTotpStatus', () => {
  it('2FA kapalıyken enabled: false', async () => {
    givenUser();
    expect(await getTotpStatus()).toEqual({ enabled: false, remainingBackupCodes: 0 });
  });

  it('2FA açıkken enabled: true ve kalan kod sayısı', async () => {
    givenUser({ totpConfirmedAt: new Date(), totpBackupCodes: ['h1', 'h2', 'h3'] });
    expect(await getTotpStatus()).toEqual({ enabled: true, remainingBackupCodes: 3 });
  });

  it('secret var ama DOĞRULANMAMIŞSA enabled: false', async () => {
    // Ölçüt `totpConfirmedAt`; `totpEnabled` bayrağı tek başına yanıltıcı olurdu.
    givenUser({ totpSecret: 'v1.a.b.c', totpEnabled: true, totpConfirmedAt: null });
    expect((await getTotpStatus()).enabled).toBe(false);
  });

  it('oturum yoksa kapalı döner (fırlatmaz)', async () => {
    authMock.mockResolvedValue(null);
    expect(await getTotpStatus()).toEqual({ enabled: false, remainingBackupCodes: 0 });
  });

  it('DB hatasında fırlatmaz', async () => {
    userFindUnique.mockRejectedValue(new Error('db down'));
    expect(await getTotpStatus()).toEqual({ enabled: false, remainingBackupCodes: 0 });
  });
});

/* ========================== startTotpSetup =============================== */

describe('startTotpSetup', () => {
  it('secret ve otpauth URI döner', async () => {
    givenUser();
    const result = await startTotpSetup();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(result.data.otpauthUri.startsWith('otpauth://totp/')).toBe(true);
    expect(result.data.otpauthUri).toContain(result.data.secret);
  });

  it('secret ŞİFRELİ saklanır — düz metin DB’ye yazılmaz', async () => {
    givenUser();
    const result = await startTotpSetup();
    if (!result.ok) throw new Error('başarılı olmalıydı');

    const written = userUpdate.mock.calls[0]?.[0].data.totpSecret as string;
    expect(written.startsWith('v1.')).toBe(true);
    expect(written).not.toContain(result.data.secret);
  });

  it('totpConfirmedAt DOLDURULMAZ — 2FA henüz etkin değil', async () => {
    givenUser();
    await startTotpSetup();
    const data = userUpdate.mock.calls[0]?.[0].data;
    expect(data.totpConfirmedAt).toBeNull();
    expect(data.totpEnabled).toBe(false);
  });

  it('UNAUTHORIZED — oturum yok (§8.6 kendi kontrolü)', async () => {
    authMock.mockResolvedValue(null);
    const result = await startTotpSetup();
    expect(result).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('ALREADY_ENABLED — çalışan authenticator sessizce geçersizleşmez', async () => {
    givenUser({ totpConfirmedAt: new Date(), totpSecret: 'v1.a.b.c' });
    const result = await startTotpSetup();
    expect(result).toMatchObject({ ok: false, error: { code: 'ALREADY_ENABLED' } });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('INTERNAL_ERROR — DB hatası', async () => {
    givenUser();
    userUpdate.mockRejectedValue(new Error('db down'));
    expect(await startTotpSetup()).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
  });

  it('AuditLog yazılır ve SECRET İÇERMEZ (§8.20)', async () => {
    givenUser();
    const result = await startTotpSetup();
    if (!result.ok) throw new Error('başarılı olmalıydı');

    const payload = JSON.stringify(auditCreate.mock.calls[0]?.[0]);
    expect(payload).toContain('TOTP_SETUP_STARTED');
    expect(payload).not.toContain(result.data.secret);
  });

  it('revalidatePath çağrılır', async () => {
    givenUser();
    await startTotpSetup();
    expect(revalidatePathMock).toHaveBeenCalledWith('/panel/ayarlar');
  });
});

/* ========================= confirmTotpSetup ============================== */

describe('confirmTotpSetup', () => {
  async function givenPendingSetup() {
    const secret = await generateTotpSecret();
    givenUser({ totpSecret: encryptSecret(secret) });
    return secret;
  }

  it('doğru kod → 2FA etkinleşir, 10 kurtarma kodu döner', async () => {
    const secret = await givenPendingSetup();
    const result = await confirmTotpSetup(await currentToken(secret));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.backupCodes).toHaveLength(10);
    expect(result.data.remainingBackupCodes).toBe(10);
    for (const code of result.data.backupCodes) {
      expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    }
  });

  it('totpConfirmedAt YALNIZCA burada dolar', async () => {
    const secret = await givenPendingSetup();
    await confirmTotpSetup(await currentToken(secret));
    const data = userUpdate.mock.calls[0]?.[0].data;
    expect(data.totpConfirmedAt).toBeInstanceOf(Date);
    expect(data.totpEnabled).toBe(true);
  });

  it('kurtarma kodları HASH’Lİ saklanır — düz metin DB’ye yazılmaz', async () => {
    const secret = await givenPendingSetup();
    const result = await confirmTotpSetup(await currentToken(secret));
    if (!result.ok) throw new Error('başarılı olmalıydı');

    const stored = userUpdate.mock.calls[0]?.[0].data.totpBackupCodes as string[];
    expect(stored).toHaveLength(10);
    for (const hash of stored) expect(hash.startsWith('$argon2id$')).toBe(true);
    for (const code of result.data.backupCodes) {
      expect(JSON.stringify(stored)).not.toContain(code);
    }
  });

  it('INVALID_TOTP — yanlış kod', async () => {
    await givenPendingSetup();
    const result = await confirmTotpSetup('000000');
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_TOTP' } });
  });

  it('YANLIŞ KODDA 2FA ETKİNLEŞMEZ ve SECRET SİLİNMEZ', async () => {
    // Kullanıcı aynı QR ile tekrar deneyebilmeli; baştan başlatmak gereksiz sürtünme.
    await givenPendingSetup();
    await confirmTotpSetup('000000');

    const stateWrites = userUpdate.mock.calls.filter(
      (c) => c[0]?.data?.totpConfirmedAt !== undefined || c[0]?.data?.totpSecret !== undefined,
    );
    expect(stateWrites).toHaveLength(0);
  });

  it('yanlış kod AuditLog’a LOGIN_FAILED olarak yazılır (hız sınırı sayacı)', async () => {
    await givenPendingSetup();
    await confirmTotpSetup('000000');
    const data = auditCreate.mock.calls[0]?.[0]?.data;
    expect(data.action).toBe('LOGIN_FAILED');
    expect(data.entityId).toBe(USER_ID);
  });

  it('biçimsel olarak bozuk kod da INVALID_TOTP', async () => {
    await givenPendingSetup();
    for (const bad of ['', 'abcdef', '12345', '1234567']) {
      expect(await confirmTotpSetup(bad)).toMatchObject({
        ok: false,
        error: { code: 'INVALID_TOTP' },
      });
    }
  });

  it('UNAUTHORIZED — oturum yok', async () => {
    authMock.mockResolvedValue(null);
    expect(await confirmTotpSetup('123456')).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('ALREADY_ENABLED — zaten doğrulanmış', async () => {
    const secret = await generateTotpSecret();
    givenUser({ totpSecret: encryptSecret(secret), totpConfirmedAt: new Date() });
    expect(await confirmTotpSetup(await currentToken(secret))).toMatchObject({
      ok: false,
      error: { code: 'ALREADY_ENABLED' },
    });
  });

  it('NOT_ENABLED — kurulum hiç başlatılmamış', async () => {
    givenUser({ totpSecret: null });
    expect(await confirmTotpSetup('123456')).toMatchObject({
      ok: false,
      error: { code: 'NOT_ENABLED' },
    });
  });

  it('RATE_LIMITED — eşiğe ulaşılmış', async () => {
    await givenPendingSetup();
    auditCount.mockResolvedValue(5);
    const result = await confirmTotpSetup('000000');
    expect(result).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('eşiğin ALTINDA akış devam eder', async () => {
    const secret = await givenPendingSetup();
    auditCount.mockResolvedValue(4);
    expect((await confirmTotpSetup(await currentToken(secret))).ok).toBe(true);
  });

  it('INTERNAL_ERROR — secret çözülemiyor (kurcalanmış)', async () => {
    givenUser({ totpSecret: 'v1.bozuk.veri.burada' });
    expect(await confirmTotpSetup('123456')).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
  });

  it('AuditLog kurtarma kodlarını İÇERMEZ (§8.20)', async () => {
    const secret = await givenPendingSetup();
    const result = await confirmTotpSetup(await currentToken(secret));
    if (!result.ok) throw new Error('başarılı olmalıydı');

    const payload = JSON.stringify(auditCreate.mock.calls);
    expect(payload).toContain('TOTP_ENABLED');
    for (const code of result.data.backupCodes) expect(payload).not.toContain(code);
  });
});

/* ======================= regenerateBackupCodes =========================== */

describe('regenerateBackupCodes — ENGEL-5', () => {
  async function givenEnabled2fa(remaining = 2) {
    const secret = await generateTotpSecret();
    const hashes = await hashBackupCodes(generateBackupCodes(remaining), FAST);
    givenUser({
      totpSecret: encryptSecret(secret),
      totpEnabled: true,
      totpConfirmedAt: new Date(),
      totpBackupCodes: hashes,
    });
    return secret;
  }

  it('geçerli TOTP ile 10 yeni kod üretir', async () => {
    const secret = await givenEnabled2fa();
    const result = await regenerateBackupCodes(await currentToken(secret));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.backupCodes).toHaveLength(10);
    expect(result.data.remainingBackupCodes).toBe(10);
  });

  it('ESKİ kodlar geçersizleşir — liste tamamen değişir', async () => {
    const secret = await givenEnabled2fa(2);
    await regenerateBackupCodes(await currentToken(secret));

    const written = userUpdate.mock.calls[0]?.[0].data.totpBackupCodes as string[];
    expect(written).toHaveLength(10); // 2 eski değil, 10 yeni
    for (const hash of written) expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('GEÇERSİZ TOTP → reddedilir (oturum ele geçirilse bile arka kapı yok)', async () => {
    await givenEnabled2fa();
    const result = await regenerateBackupCodes('000000');
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_TOTP' } });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('UNAUTHORIZED — oturum yok', async () => {
    authMock.mockResolvedValue(null);
    expect(await regenerateBackupCodes('123456')).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('NOT_ENABLED — 2FA açık değil', async () => {
    givenUser({ totpSecret: null, totpConfirmedAt: null });
    expect(await regenerateBackupCodes('123456')).toMatchObject({
      ok: false,
      error: { code: 'NOT_ENABLED' },
    });
  });

  it('RATE_LIMITED — eşiğe ulaşılmış', async () => {
    await givenEnabled2fa();
    auditCount.mockResolvedValue(5);
    expect(await regenerateBackupCodes('000000')).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('INTERNAL_ERROR — secret çözülemiyor', async () => {
    givenUser({ totpSecret: 'v1.bozuk.veri.burada', totpConfirmedAt: new Date() });
    expect(await regenerateBackupCodes('123456')).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
  });

  it('AuditLog önceki/yeni kod SAYISINI yazar, kodları değil', async () => {
    const secret = await givenEnabled2fa(3);
    const result = await regenerateBackupCodes(await currentToken(secret));
    if (!result.ok) throw new Error('başarılı olmalıydı');

    const payload = JSON.stringify(auditCreate.mock.calls);
    expect(payload).toContain('BACKUP_CODES_REGENERATED');
    expect(payload).toContain('"previousRemaining":3');
    for (const code of result.data.backupCodes) expect(payload).not.toContain(code);
  });

  it('revalidatePath çağrılır', async () => {
    const secret = await givenEnabled2fa();
    await regenerateBackupCodes(await currentToken(secret));
    expect(revalidatePathMock).toHaveBeenCalledWith('/panel/ayarlar');
  });
});
