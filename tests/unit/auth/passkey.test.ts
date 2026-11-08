import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@simplewebauthn/server', async (orijinal) => ({
  ...(await orijinal<typeof import('@simplewebauthn/server')>()),
  verifyAuthenticationResponse: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
}));

import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

import { girisDogrula, girisSecenekleri, rpCoz, type PasskeyClient } from '@/server/auth/passkey';

const SIMDI = new Date('2026-10-30T12:00:00Z');
const RP = { rpID: 'sahinsamet.com', origin: 'https://sahinsamet.com' };

describe('rpCoz — köken onay listesi', () => {
  const env = { NEXT_PUBLIC_SITE_URL: 'https://sahinsamet.com', NODE_ENV: 'production' };

  it('site kökeni kabul, RP kimliği alan adı', () => {
    expect(rpCoz('https://sahinsamet.com', env)).toEqual(RP);
    expect(rpCoz(null, env)).toEqual(RP);
  });

  it('⚠️ başka köken REDDEDİLİR (oltalama sitesi)', () => {
    expect(rpCoz('https://sahinsamet.com.evil.io', env)).toBeNull();
    expect(rpCoz('http://localhost:3000', env)).toBeNull();
  });

  it('CI test kökeni yalnızca TAM eşleşmede kabul', () => {
    const ci = { ...env, PASSKEY_TEST_KOKENI: 'http://localhost:3100' };
    expect(rpCoz('http://localhost:3100', ci)?.rpID).toBe('localhost');
    expect(rpCoz('http://localhost:3101', ci)).toBeNull();
  });

  it('geliştirmede localhost kabul (IP adresi WebAuthn RP olamaz)', () => {
    const dev = { ...env, NODE_ENV: 'development' };
    expect(rpCoz('http://localhost:3100', dev)).toEqual({
      rpID: 'localhost',
      origin: 'http://localhost:3100',
    });
    expect(rpCoz('http://127.0.0.1:3100', dev)).toBeNull();
  });
});

function yanit(challenge: string, id = 'kimlik-1') {
  const clientDataJSON = isoBase64URL.fromUTF8String(
    JSON.stringify({ type: 'webauthn.get', challenge, origin: RP.origin }),
  );
  return {
    id,
    rawId: id,
    type: 'public-key',
    response: { clientDataJSON },
    clientExtensionResults: {},
  } as never;
}

function istemci(secenek: { passkey?: unknown; challengeVar?: boolean } = {}) {
  const passkey =
    'passkey' in secenek
      ? secenek.passkey
      : {
          id: 'pk1',
          userId: 'u1',
          credentialId: 'kimlik-1',
          publicKey: Buffer.from([1, 2, 3]),
          counter: 4,
          transports: ['internal'],
          user: {
            id: 'u1',
            email: 'ben@ornek.com',
            name: 'Ben',
            lockedUntil: null,
            totpConfirmedAt: SIMDI,
          },
        };
  const c = {
    passkey: { findUnique: vi.fn().mockResolvedValue(passkey), update: vi.fn() },
    webAuthnChallenge: {
      deleteMany: vi.fn().mockResolvedValue({ count: secenek.challengeVar === false ? 0 : 1 }),
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    user: { update: vi.fn() },
    loginAttempt: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    auditLog: { create: vi.fn() },
  };
  return c as typeof c & PasskeyClient;
}

describe('girisDogrula', () => {
  beforeEach(() => vi.mocked(verifyAuthenticationResponse).mockReset());

  it('doğrulanan passkey kullanıcıyı döner, sayaç ve başarı kaydı yazılır', async () => {
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 5 },
    } as never);
    const c = istemci();
    const k = await girisDogrula(yanit('cagri-1'), RP, '1.2.3.4', c, SIMDI);
    expect(k).toEqual({ id: 'u1', email: 'ben@ornek.com', name: 'Ben', twoFactorEnabled: true });
    expect(c.passkey.update).toHaveBeenCalledWith({
      where: { id: 'pk1' },
      data: { counter: 5, lastUsedAt: SIMDI },
    });
    expect(c.loginAttempt.create.mock.calls[0]?.[0].data.success).toBe(true);
    // Meydan okuma TEK adımda, süresi geçmemiş olarak tüketildi.
    expect(c.webAuthnChallenge.deleteMany).toHaveBeenCalledWith({
      where: { challenge: 'cagri-1', purpose: 'giris', expiresAt: { gt: SIMDI } },
    });
  });

  it('⚠️ TEKRAR SALDIRISI: tüketilmiş meydan okuma reddedilir ve başarısız sayılır', async () => {
    const c = istemci({ challengeVar: false });
    await expect(girisDogrula(yanit('eski'), RP, '1.2.3.4', c, SIMDI)).rejects.toMatchObject({
      kod: 'SURESI_DOLDU',
    });
    expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
    expect(c.loginAttempt.create.mock.calls[0]?.[0].data.success).toBe(false);
  });

  it('⚠️ şifre denemeleriyle konan kilit Face ID girişini kapatmaz', async () => {
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 5 },
    } as never);
    const c = istemci({
      passkey: {
        id: 'pk1',
        userId: 'u1',
        credentialId: 'kimlik-1',
        publicKey: Buffer.from([1]),
        counter: 0,
        transports: [],
        user: {
          id: 'u1',
          email: 'a@b.c',
          name: 'A',
          lockedUntil: new Date('2026-10-30T13:00:00Z'),
          totpConfirmedAt: null,
        },
      },
    });
    await expect(girisDogrula(yanit('c'), RP, '1.2.3.4', c, SIMDI)).resolves.toMatchObject({
      id: 'u1',
    });
  });

  it('kayıtlı olmayan cihaz reddedilir', async () => {
    const c = istemci({ passkey: null });
    await expect(girisDogrula(yanit('c'), RP, '1.2.3.4', c, SIMDI)).rejects.toMatchObject({
      kod: 'BILINMEYEN',
    });
  });

  it('imza doğrulanmazsa reddedilir', async () => {
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({ verified: false } as never);
    await expect(girisDogrula(yanit('c'), RP, '1.2.3.4', istemci(), SIMDI)).rejects.toMatchObject({
      kod: 'DOGRULANAMADI',
    });
  });
});

describe('girisSecenekleri', () => {
  it('meydan okuma 5 dk ömürle saklanır, hesap sorulmaz', async () => {
    const c = istemci();
    const s = await girisSecenekleri(RP, c, SIMDI);
    expect(s.allowCredentials).toEqual([]);
    expect(s.userVerification).toBe('required');
    expect(c.webAuthnChallenge.create).toHaveBeenCalledWith({
      data: {
        challenge: s.challenge,
        purpose: 'giris',
        userId: null,
        ip: null,
        expiresAt: new Date('2026-10-30T12:05:00Z'),
      },
    });
  });

  it('⚠️ sınır IP başına: tek kaynak Face ID girişini kapatamaz', async () => {
    const c = istemci();
    c.webAuthnChallenge.count.mockImplementation(async (a: { where: { ip?: string } }) =>
      a.where.ip === '198.51.100.1' ? 10 : 10,
    );
    await expect(girisSecenekleri(RP, c, SIMDI, '198.51.100.1')).rejects.toMatchObject({
      kod: 'SURESI_DOLDU',
    });
    c.webAuthnChallenge.count.mockImplementation(async (a: { where: { ip?: string } }) =>
      a.where.ip ? 0 : 10,
    );
    await expect(girisSecenekleri(RP, c, SIMDI, '198.51.100.2')).resolves.toBeDefined();
  });

  it('açık meydan okuma tavanında yeni üretilmez', async () => {
    const c = istemci();
    c.webAuthnChallenge.count.mockResolvedValue(1000);
    await expect(girisSecenekleri(RP, c, SIMDI)).rejects.toMatchObject({ kod: 'SURESI_DOLDU' });
    expect(c.webAuthnChallenge.create).not.toHaveBeenCalled();
  });
});
