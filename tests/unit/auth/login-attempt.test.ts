import { describe, expect, it, vi } from 'vitest';

import {
  countRecentFailures,
  hashEmail,
  purgeLoginAttemptsBefore,
  recordLoginAttempt,
  type LoginAttemptClient,
} from '@/server/auth/login-attempt';

function fakeClient(overrides?: Partial<LoginAttemptClient['loginAttempt']>): {
  client: LoginAttemptClient;
  create: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue({});
  const count = vi.fn().mockResolvedValue(0);
  const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
  return {
    client: { loginAttempt: { create, count, deleteMany, ...overrides } } as LoginAttemptClient,
    create,
    count,
    deleteMany,
  };
}

describe('hashEmail — §8.20', () => {
  it('64 karakterlik onaltılık özet üretir', () => {
    expect(hashEmail('admin@example.com')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('özet ham e-postayı İÇERMEZ', () => {
    expect(hashEmail('admin@example.com')).not.toContain('admin');
    expect(hashEmail('admin@example.com')).not.toContain('@');
  });

  it('büyük/küçük harf ve boşluk farkı AYNI özeti verir', () => {
    // Aksi hâlde hız sınırı sayacı bölünür ve §8.4 atlatılabilirdi.
    const base = hashEmail('admin@example.com');
    expect(hashEmail('ADMIN@Example.COM')).toBe(base);
    expect(hashEmail('  admin@example.com  ')).toBe(base);
  });

  it('farklı e-posta farklı özet', () => {
    expect(hashEmail('a@x.com')).not.toBe(hashEmail('b@x.com'));
  });
});

describe('recordLoginAttempt', () => {
  it('başarılı denemeyi yazar', async () => {
    const { client, create } = fakeClient();
    await recordLoginAttempt({ ip: '1.2.3.4', emailHash: 'a'.repeat(64), success: true }, client);
    expect(create).toHaveBeenCalledWith({
      data: { ip: '1.2.3.4', emailHash: 'a'.repeat(64), success: true },
    });
  });

  it('DB hatasında FIRLATMAZ — denetim kaydı girişi çökertmemeli', async () => {
    const create = vi.fn().mockRejectedValue(new Error('db down'));
    const { client } = fakeClient({ create });
    await expect(
      recordLoginAttempt({ ip: '1.2.3.4', emailHash: 'a'.repeat(64), success: false }, client),
    ).resolves.toBeUndefined();
  });
});

describe('countRecentFailures — politika T-014’te, sayım burada', () => {
  it('yalnızca başarısızları ve verilen andan sonrasını sayar', async () => {
    const { client, count } = fakeClient();
    const since = new Date('2026-08-05T10:00:00Z');
    await countRecentFailures({ ip: '1.2.3.4' }, since, client);
    expect(count).toHaveBeenCalledWith({
      where: { success: false, createdAt: { gte: since }, ip: '1.2.3.4' },
    });
  });

  it('emailHash ile de filtreleyebilir', async () => {
    const { client, count } = fakeClient();
    const since = new Date();
    await countRecentFailures({ emailHash: 'b'.repeat(64) }, since, client);
    expect(count.mock.calls[0]?.[0].where.emailHash).toBe('b'.repeat(64));
  });

  it('filtresiz çağrıda ip/emailHash koşulu EKLEMEZ', async () => {
    const { client, count } = fakeClient();
    await countRecentFailures({}, new Date(), client);
    const where = count.mock.calls[0]?.[0].where;
    expect(where).not.toHaveProperty('ip');
    expect(where).not.toHaveProperty('emailHash');
  });
});

describe('purgeLoginAttemptsBefore — KVKK 90 gün', () => {
  it('verilen tarihten eskileri siler ve sayıyı döner', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 42 });
    const { client } = fakeClient({ deleteMany });
    const cutoff = new Date('2026-05-07T00:00:00Z');
    expect(await purgeLoginAttemptsBefore(cutoff, client)).toBe(42);
    expect(deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } });
  });
});
