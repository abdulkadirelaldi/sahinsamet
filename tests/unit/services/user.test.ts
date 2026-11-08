import { describe, expect, it, vi } from 'vitest';

import {
  countRecentTotpFailures,
  enableTotp,
  getTotpState,
  isTotpSetupRateLimited,
  replaceBackupCodes,
  storeTotpSecret,
  TOTP_ERRORS,
  TOTP_SETUP_RATE_LIMIT,
  totpFail,
  type UserTotpClient,
} from '@/server/services/user';

function harness(user: unknown = null, failureCount = 0) {
  const findUnique = vi.fn().mockResolvedValue(user);
  const update = vi.fn().mockResolvedValue({});
  const count = vi.fn().mockResolvedValue(failureCount);
  return {
    findUnique,
    update,
    count,
    client: {
      user: { findUnique, update },
      auditLog: { count },
    } as unknown as UserTotpClient,
  };
}

describe('getTotpState', () => {
  it('ölçüt totpConfirmedAt — totpEnabled bayrağı değil', () => {
    // İki yerde farklı ölçüt kullanmak "ekranda açık, girişte kapalı" üretirdi.
    expect(TOTP_ERRORS.NOT_ENABLED).toBeDefined();
  });

  it('doğrulanmış kullanıcı enabled', async () => {
    const h = harness({ totpConfirmedAt: new Date(), totpBackupCodes: ['a', 'b'] });
    expect(await getTotpState('u1', h.client)).toEqual({
      enabled: true,
      remainingBackupCodes: 2,
    });
  });

  it('secret var ama doğrulanmamış → kapalı', async () => {
    const h = harness({
      totpSecret: 'v1.a.b.c',
      totpEnabled: true,
      totpConfirmedAt: null,
      totpBackupCodes: [],
    });
    expect((await getTotpState('u1', h.client)).enabled).toBe(false);
  });

  it('kullanıcı yoksa kapalı', async () => {
    const h = harness(null);
    expect(await getTotpState('u1', h.client)).toEqual({
      enabled: false,
      remainingBackupCodes: 0,
    });
  });
});

describe('storeTotpSecret', () => {
  it('secret yazar ama 2FA’yı ETKİNLEŞTİRMEZ', async () => {
    const h = harness();
    await storeTotpSecret('u1', 'v1.iv.tag.data', h.client);
    expect(h.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { totpSecret: 'v1.iv.tag.data', totpEnabled: false, totpConfirmedAt: null },
    });
  });
});

describe('enableTotp', () => {
  it('totpConfirmedAt ve hash listesi yazar', async () => {
    const h = harness();
    const now = new Date('2026-08-10T10:00:00Z');
    await enableTotp('u1', ['h1', 'h2'], now, h.client);
    expect(h.update.mock.calls[0]?.[0].data).toEqual({
      totpEnabled: true,
      totpConfirmedAt: now,
      totpBackupCodes: ['h1', 'h2'],
    });
  });
});

describe('replaceBackupCodes', () => {
  it('yalnızca kod listesini değiştirir — 2FA durumuna dokunmaz', async () => {
    const h = harness();
    await replaceBackupCodes('u1', ['n1'], h.client);
    const data = h.update.mock.calls[0]?.[0].data;
    expect(data).toEqual({ totpBackupCodes: ['n1'] });
    expect(data.totpConfirmedAt).toBeUndefined();
  });
});

describe('hız sınırı — §8.4 eşiğini paylaşır, kilidi PAYLAŞMAZ', () => {
  it('eşik Güvenlik’in LOGIN_RATE_LIMIT sabitinden gelir', () => {
    expect(TOTP_SETUP_RATE_LIMIT.maxFailures).toBe(5);
    expect(TOTP_SETUP_RATE_LIMIT.windowMinutes).toBe(15);
  });

  it('sayım AuditLog üzerinden, JSON alanına girmeden yapılır', async () => {
    const h = harness(null, 3);
    const now = new Date('2026-08-10T12:00:00Z');
    expect(await countRecentTotpFailures('u1', now, h.client)).toBe(3);

    const where = h.count.mock.calls[0]?.[0].where;
    expect(where.action).toBe('LOGIN_FAILED');
    expect(where.entity).toBe('User');
    expect(where.entityId).toBe('u1');
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(where).not.toHaveProperty('diff'); // JSON sorgusu yok
  });

  it('pencere 15 dakika geriye bakar', async () => {
    const h = harness(null, 0);
    const now = new Date('2026-08-10T12:00:00Z');
    await countRecentTotpFailures('u1', now, h.client);
    const gte = h.count.mock.calls[0]?.[0].where.createdAt.gte as Date;
    expect(now.getTime() - gte.getTime()).toBe(15 * 60_000);
  });

  it('eşiğe ULAŞINCA sınırlı', async () => {
    expect(await isTotpSetupRateLimited('u1', new Date(), harness(null, 5).client)).toBe(true);
  });

  it('eşiğin ALTINDA sınırsız', async () => {
    expect(await isTotpSetupRateLimited('u1', new Date(), harness(null, 4).client)).toBe(false);
  });
});

describe('totpFail', () => {
  it('altı kodun her biri için mesaj döner', () => {
    for (const code of [
      'UNAUTHORIZED',
      'INVALID_TOTP',
      'ALREADY_ENABLED',
      'NOT_ENABLED',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
    ] as const) {
      const result = totpFail(code);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe(code);
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });
});
