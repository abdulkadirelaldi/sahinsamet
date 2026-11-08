import { describe, expect, it, vi } from 'vitest';

import { REDACTED_FIELD_NAMES } from '@/lib/schemas';
import {
  buildDiff,
  redactAuditDiff,
  REDACTION_PLACEHOLDER,
  writeAuditLog,
  type AuditLogClient,
} from '@/server/services/_shared';

function fakeClient(): { client: AuditLogClient; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn().mockResolvedValue({});
  return { client: { auditLog: { create } } as AuditLogClient, create };
}

describe('redactAuditDiff — HER redakte alan için ayrı assert (ADR-020)', () => {
  // T-011/K7 disiplini: kuralı doğrulamaya bağla, kod incelemesine değil.
  for (const field of REDACTED_FIELD_NAMES) {
    it(`"${field}" maskelenir`, () => {
      const result = redactAuditDiff({ [field]: 'HASSAS-DEGER' }) as Record<string, unknown>;
      expect(result[field]).toBe(REDACTION_PLACEHOLDER);
      expect(JSON.stringify(result)).not.toContain('HASSAS-DEGER');
    });
  }

  it('listenin tamamı kapsandı', () => {
    expect(REDACTED_FIELD_NAMES.length).toBeGreaterThanOrEqual(11);
  });
});

describe('redactAuditDiff — İÇ İÇE yapılar', () => {
  it('bir seviye altta maskeler', () => {
    const result = redactAuditDiff({ before: { email: 'a@b.com' }, after: { email: 'c@d.com' } });
    expect(JSON.stringify(result)).not.toContain('a@b.com');
    expect(JSON.stringify(result)).not.toContain('c@d.com');
  });

  it('derin iç içe yapıda maskeler', () => {
    const deep = { a: { b: { c: { d: { totpSecret: 'GIZLI' } } } } };
    expect(JSON.stringify(redactAuditDiff(deep))).not.toContain('GIZLI');
  });

  it('DİZİ içindeki nesnelerde maskeler', () => {
    const value = { users: [{ email: 'x@y.com' }, { password: 'p' }] };
    const json = JSON.stringify(redactAuditDiff(value));
    expect(json).not.toContain('x@y.com');
    expect(json).not.toContain('"p"');
  });

  it('büyük/küçük harf farkını yok sayar', () => {
    const result = redactAuditDiff({ Email: 'a@b.com', PassWord: 'x' }) as Record<string, unknown>;
    expect(result.Email).toBe(REDACTION_PLACEHOLDER);
    expect(result.PassWord).toBe(REDACTION_PLACEHOLDER);
  });

  it('masum alanlara DOKUNMAZ', () => {
    const result = redactAuditDiff({ title: 'Proje', amount: '1250.00', count: 3 });
    expect(result).toEqual({ title: 'Proje', amount: '1250.00', count: 3 });
  });

  it('ilkel değerleri olduğu gibi geçirir', () => {
    expect(redactAuditDiff('metin')).toBe('metin');
    expect(redactAuditDiff(42)).toBe(42);
    expect(redactAuditDiff(null)).toBeNull();
  });

  it('DÖNGÜSEL referansta sonsuz özyinelemeye girmez', () => {
    const cyclic: Record<string, unknown> = { title: 'x' };
    cyclic.self = cyclic;
    expect(() => redactAuditDiff(cyclic)).not.toThrow();
  });
});

describe('writeAuditLog', () => {
  it('kaydı redaksiyondan geçirerek yazar', async () => {
    const { client, create } = fakeClient();
    await writeAuditLog(
      {
        actorId: 'usr_1',
        action: 'UPDATE',
        entity: 'User',
        entityId: 'usr_1',
        diff: { email: { before: 'a@b.com', after: 'c@d.com' } },
      },
      client,
    );

    const payload = JSON.stringify(create.mock.calls[0]?.[0]);
    expect(payload).not.toContain('a@b.com');
    expect(payload).toContain(REDACTION_PLACEHOLDER);
  });

  it('opsiyonel alanlar null’a normalize edilir', async () => {
    const { client, create } = fakeClient();
    await writeAuditLog({ action: 'CREATE', entity: 'Project' }, client);
    const data = create.mock.calls[0]?.[0]?.data;
    expect(data.actorId).toBeNull();
    expect(data.entityId).toBeNull();
    expect(data.ip).toBeNull();
  });

  it('DB hatasında FIRLATMAZ — başarılı mutasyon geri alınmamalı', async () => {
    const create = vi.fn().mockRejectedValue(new Error('db down'));
    await expect(
      writeAuditLog({ action: 'CREATE', entity: 'Project' }, {
        auditLog: { create },
      } as AuditLogClient),
    ).resolves.toBeUndefined();
  });

  it('ADR-022: T-014 kilit kaydının şekliyle uyumlu', async () => {
    // Güvenlik ajanının bugün elle yazdığı kayıt bu yardımcıya taşınabilmeli.
    const { client, create } = fakeClient();
    await writeAuditLog(
      {
        actorId: null,
        action: 'UPDATE',
        entity: 'User',
        entityId: 'usr_1',
        diff: { reason: 'LOGIN_RATE_LIMIT', failedAttempts: 5, lockMinutes: 15 },
        ip: '203.0.113.7',
      },
      client,
    );
    const data = create.mock.calls[0]?.[0]?.data;
    expect(data.entity).toBe('User');
    expect(data.actorId).toBeNull();
    expect(data.diff).toMatchObject({ reason: 'LOGIN_RATE_LIMIT', failedAttempts: 5 });
  });
});

describe('buildDiff', () => {
  it('yalnızca DEĞİŞEN alanları taşır', () => {
    const diff = buildDiff({ title: 'Eski', order: 1 }, { title: 'Yeni', order: 1 });
    expect(Object.keys(diff)).toEqual(['title']);
    expect(diff.title).toEqual({ before: 'Eski', after: 'Yeni' });
  });

  it('oluşturmada (before yok) tüm alanları taşır', () => {
    const diff = buildDiff(null, { title: 'Yeni' });
    expect(diff.title).toEqual({ before: null, after: 'Yeni' });
  });

  it('hiçbir şey değişmediyse boş döner', () => {
    expect(buildDiff({ a: 1 }, { a: 1 })).toEqual({});
  });
});
