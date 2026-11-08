import { describe, expect, it } from 'vitest';

import {
  auditLogFilterSchema,
  changePasswordSchema,
  createAttachmentSchema,
  createAuditLogSchema,
  createLoginAttemptSchema,
  createUserSchema,
  loginSchema,
  REDACTED_FIELD_NAMES,
} from '@/lib/schemas';

const ID = 'clx0000000000000000000001';
const HASH = 'a'.repeat(64);

describe('createUserSchema', () => {
  it('geçerli kullanıcı, e-posta küçük harfe indirilir', () => {
    const parsed = createUserSchema.parse({
      email: '  Samet@Example.COM ',
      name: 'Samet',
      password: 'cok-guclu-sifre-2026',
    });
    expect(parsed.email).toBe('samet@example.com');
  });

  it('12 karakterden kısa şifre reddeder (§8.2)', () => {
    expect(
      createUserSchema.safeParse({ email: 'a@b.com', name: 'A', password: 'kisa' }).success,
    ).toBe(false);
  });

  it('passwordHash gibi bir sır KABUL ETMEZ — hash T-013 katmanında üretilir', () => {
    const parsed = createUserSchema.parse({
      email: 'a@b.com',
      name: 'A',
      password: 'cok-guclu-sifre-2026',
      passwordHash: '$argon2id$sizinti',
    });
    expect(parsed).not.toHaveProperty('passwordHash');
  });
});

describe('changePasswordSchema', () => {
  const base = { currentPassword: 'eski-sifre-2025', newPassword: 'yeni-guclu-sifre-2026' };

  it('eşleşen şifreler geçerli', () => {
    expect(
      changePasswordSchema.safeParse({ ...base, newPasswordConfirm: base.newPassword }).success,
    ).toBe(true);
  });

  it('eşleşmeyen tekrar reddedilir', () => {
    const r = changePasswordSchema.safeParse({ ...base, newPasswordConfirm: 'baska' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['newPasswordConfirm']);
  });

  it('yeni şifre eskisiyle aynı olamaz', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'ayni-sifre-degeri-2026',
        newPassword: 'ayni-sifre-degeri-2026',
        newPasswordConfirm: 'ayni-sifre-degeri-2026',
      }).success,
    ).toBe(false);
  });
});

describe('loginSchema', () => {
  it('e-posta + şifre yeterli, TOTP opsiyonel', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });
  it('6 haneli olmayan TOTP reddedilir', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: '12345' }).success,
    ).toBe(false);
  });
});

describe('createLoginAttemptSchema — §8.20', () => {
  it('IP + emailHash ile geçerli', () => {
    expect(
      createLoginAttemptSchema.safeParse({ ip: '192.168.1.1', emailHash: HASH, success: false })
        .success,
    ).toBe(true);
  });

  it('HAM E-POSTA yazılmışsa REDDEDER', () => {
    const r = createLoginAttemptSchema.safeParse({
      ip: '192.168.1.1',
      emailHash: 'samet@example.com',
      success: false,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain('ham e-posta');
  });

  it('geçersiz IP reddeder', () => {
    expect(
      createLoginAttemptSchema.safeParse({ ip: '999.1.1.1', emailHash: HASH, success: true })
        .success,
    ).toBe(false);
  });
});

describe('createAuditLogSchema — ADR-020', () => {
  it('geçerli denetim kaydı', () => {
    expect(
      createAuditLogSchema.safeParse({ action: 'CREATE', entity: 'Transaction', entityId: ID })
        .success,
    ).toBe(true);
  });

  it('geçersiz eylem reddeder', () => {
    expect(createAuditLogSchema.safeParse({ action: 'SILDI', entity: 'X' }).success).toBe(false);
  });

  it('redaksiyon listesi §8.20 alanlarını kapsar', () => {
    for (const field of [
      'password',
      'passwordHash',
      'totpSecret',
      'totpBackupCodes',
      'token',
      'email',
    ]) {
      expect(REDACTED_FIELD_NAMES).toContain(field);
    }
  });

  it('filtre eylem enum doğrular', () => {
    expect(auditLogFilterSchema.safeParse({ action: 'LOGIN' }).success).toBe(true);
    expect(auditLogFilterSchema.safeParse({ action: 'GIRIS' }).success).toBe(false);
  });
});

describe('createAttachmentSchema — ADR-018', () => {
  const valid = {
    key: 'projects/abc.webp',
    mime: 'image/webp',
    size: 12345,
    checksum: HASH,
    entity: 'PROFILE',
    entityId: ID,
  };

  it('geçerli ek kabul eder', () => {
    expect(createAttachmentSchema.safeParse(valid).success).toBe(true);
  });

  it('url alanı KABUL EDİLMEZ — §8.11 imzalı URL istek anında üretilir', () => {
    const parsed = createAttachmentSchema.parse({ ...valid, url: 'https://public.example/x.webp' });
    expect(parsed).not.toHaveProperty('url');
  });

  it('izinsiz MIME reddeder', () => {
    expect(createAttachmentSchema.safeParse({ ...valid, mime: 'application/zip' }).success).toBe(
      false,
    );
  });

  it('10 MB üstü reddeder (§8.11)', () => {
    expect(createAttachmentSchema.safeParse({ ...valid, size: 11 * 1024 * 1024 }).success).toBe(
      false,
    );
  });
});

describe('loginSchema — T-013c / ENGEL-2 regresyonu', () => {
  it('6 haneli TOTP kodunu kabul eder', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: '123456' });
    expect(r.success).toBe(true);
  });

  it('KURTARMA KODU biçimini kabul eder (ADR-013 yolu açık)', () => {
    // Bu şema yalnızca `totpCodeSchema` kullanıyorken `ABCDE-FGHIJ` reddediliyordu
    // ve kurtarma yolu authenticateUser'a hiç ulaşmadan ölü kod hâline geliyordu.
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: 'ABCDE-FGHIJ' });
    expect(r.success).toBe(true);
  });

  it('küçük harf ve tiresiz kurtarma kodunu da kabul eder', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: 'abcdefghij' }).success,
    ).toBe(true);
  });

  it('BOŞ DİZE "gönderilmedi" sayılır — iki adımlı akışın koşulu', () => {
    // HTML formu ilk adımda daima `totpCode=""` gönderir. Boş dize şema hatası
    // olsaydı ilk adım TOTP_REQUIRED yerine INVALID_CREDENTIALS dönerdi.
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.totpCode).toBeUndefined();
  });

  it('alan hiç gönderilmezse de geçerli', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.totpCode).toBeUndefined();
  });

  it('anlamsız kısa kod hâlâ REDDEDİLİR', () => {
    // Birleşim her şeyi kabul etmemeli: 3 karakter ne TOTP ne kurtarma kodu.
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: 'abc' }).success,
    ).toBe(false);
  });

  it('5 haneli sayı reddedilir (TOTP 6 hane)', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: '12345' }).success,
    ).toBe(false);
  });
});
