import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, dogrulaMock, seceneklerMock, sinirMock, denetimMock } = vi.hoisted(() => ({
  dbMock: { user: { findUniqueOrThrow: vi.fn() } },
  dogrulaMock: vi.fn(),
  sinirMock: vi.fn().mockResolvedValue(false),
  denetimMock: vi.fn(),
  seceneklerMock: vi.fn().mockResolvedValue({ challenge: 'c' }),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: 'https://sahinsamet.com' }),
}));
vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('@/server/auth/totp', () => ({
  decryptSecret: () => 'gizli',
  verifyTotpToken: dogrulaMock,
}));
vi.mock('@/server/services/user', () => ({ isTotpSetupRateLimited: sinirMock }));
vi.mock('@/server/auth/passkey', () => ({
  rpCoz: () => ({ id: 'sahinsamet.com', origin: 'https://sahinsamet.com' }),
  kayitSecenekleri: seceneklerMock,
  PasskeyHatasi: class extends Error {},
}));
vi.mock('@/server/services/_shared', async (asil) => ({
  ...(await asil<typeof import('@/server/services/_shared')>()),
  writeAuditLog: denetimMock,
}));
vi.mock('@/server/actions/_shared', () => ({
  currentActorId: async () => 'u1',
  toFailure: (_: string, e: unknown) => {
    throw e;
  },
  unauthorized: () => ({ ok: false }),
}));

import { passkeyKayitSecenekleriAction } from '@/server/actions/passkey';

const kullanici = (totpConfirmedAt: Date | null) => ({
  id: 'u1',
  email: 'a@b.c',
  name: 'A',
  totpSecret: 's',
  totpBackupCodes: [],
  totpConfirmedAt,
});

beforeEach(() => {
  dogrulaMock.mockReset();
  seceneklerMock.mockClear();
});

describe('⚠️ Face ID eklemek doğrulama kodu ister', () => {
  it('2FA kuruluyken kodsuz meydan okuma verilmez', async () => {
    dbMock.user.findUniqueOrThrow.mockResolvedValue(kullanici(new Date()));
    const r = await passkeyKayitSecenekleriAction({});
    expect(r.ok).toBe(false);
    expect(seceneklerMock).not.toHaveBeenCalled();
  });

  it('yanlış kodla meydan okuma verilmez', async () => {
    dbMock.user.findUniqueOrThrow.mockResolvedValue(kullanici(new Date()));
    dogrulaMock.mockResolvedValue(false);
    const r = await passkeyKayitSecenekleriAction({ totpKodu: '123456' });
    expect(r.ok).toBe(false);
    expect(seceneklerMock).not.toHaveBeenCalled();
  });

  it('⚠️ yanlış kod kayda geçer ve deneme sınırına sayılır', async () => {
    dbMock.user.findUniqueOrThrow.mockResolvedValue(kullanici(new Date()));
    dogrulaMock.mockResolvedValue(false);
    await passkeyKayitSecenekleriAction({ totpKodu: '123456' });
    expect(denetimMock.mock.calls[0]?.[0].diff.context).toBe('PASSKEY_KAYIT');
  });

  it('⚠️ sınır dolunca kod denenmez bile', async () => {
    dbMock.user.findUniqueOrThrow.mockResolvedValue(kullanici(new Date()));
    sinirMock.mockResolvedValueOnce(true);
    const r = await passkeyKayitSecenekleriAction({ totpKodu: '123456' });
    expect(r.ok).toBe(false);
    expect(dogrulaMock).not.toHaveBeenCalled();
  });

  it('doğru kodla verilir', async () => {
    dbMock.user.findUniqueOrThrow.mockResolvedValue(kullanici(new Date()));
    dogrulaMock.mockResolvedValue(true);
    const r = await passkeyKayitSecenekleriAction({ totpKodu: '123456' });
    expect(r.ok).toBe(true);
    expect(seceneklerMock).toHaveBeenCalledTimes(1);
  });
});
