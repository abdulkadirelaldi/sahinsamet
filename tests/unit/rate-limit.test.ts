import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LOGIN_RATE_LIMIT,
  applyLockoutPolicy,
  isLocked,
  lockExpiresAt,
  rateLimitWindowStart,
  type LockoutClient,
} from '@/lib/security/rate-limit';
import { AuditAction } from '@/types';

/**
 * §8.4 politikası + ADR-022 denetim kaydı.
 *
 * Tüm bağımlılıklar enjekte edilir; test veritabanı ve `.env` olmadan koşar.
 */

const SIMDI = new Date('2026-08-05T12:00:00.000Z');
const KULLANICI_ID = 'clx0000000000000000000001';
const EPOSTA_OZETI = 'a'.repeat(64);
const IP = '203.0.113.9';

function sahteClient() {
  const userUpdate = vi.fn().mockResolvedValue(undefined);
  const auditCreate = vi.fn().mockResolvedValue(undefined);

  const client: LockoutClient = {
    user: { update: userUpdate },
    auditLog: { create: auditCreate },
  };

  return { client, userUpdate, auditCreate };
}

function girdi(userId: string | null = KULLANICI_ID) {
  return { ip: IP, emailHash: EPOSTA_OZETI, userId };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('§8.4 — eşikler tek sabitte', () => {
  it('PROGRAM.md §8.4 ile birebir: 15 dakikada 5 deneme, 15 dk kilit', () => {
    expect(LOGIN_RATE_LIMIT.maxFailures).toBe(5);
    expect(LOGIN_RATE_LIMIT.windowMinutes).toBe(15);
    expect(LOGIN_RATE_LIMIT.lockMinutes).toBe(15);
  });

  it('pencere başlangıcı 15 dakika geriye bakar', () => {
    expect(rateLimitWindowStart(SIMDI).toISOString()).toBe('2026-08-05T11:45:00.000Z');
  });

  it('kilit 15 dakika ileri gider', () => {
    expect(lockExpiresAt(SIMDI).toISOString()).toBe('2026-08-05T12:15:00.000Z');
  });
});

describe('isLocked', () => {
  it('gelecekteki kilit yürürlüktedir', () => {
    expect(isLocked(new Date(SIMDI.getTime() + 1000), SIMDI)).toBe(true);
  });

  it('geçmiş kilit yürürlükte DEĞİLDİR', () => {
    expect(isLocked(new Date(SIMDI.getTime() - 1000), SIMDI)).toBe(false);
  });

  /** Tam sınır: `lockedUntil === now` artık kilitli sayılmaz (`>` karşılaştırması). */
  it('tam sınırda kilit AÇILMIŞ sayılır', () => {
    expect(isLocked(new Date(SIMDI.getTime()), SIMDI)).toBe(false);
  });

  it('null/undefined kilitli değildir', () => {
    expect(isLocked(null, SIMDI)).toBe(false);
    expect(isLocked(undefined, SIMDI)).toBe(false);
  });
});

describe('applyLockoutPolicy — eşiğin altı', () => {
  it('19 başarısızlıkta kilitlemez ve hiçbir şey yazmaz', async () => {
    const { client, userUpdate, auditCreate } = sahteClient();

    const karar = await applyLockoutPolicy(
      girdi(),
      { countRecentFailures: vi.fn().mockResolvedValue(19), client },
      SIMDI,
    );

    expect(karar).toEqual({ locked: false, failures: 19 });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('sayım hesap başına ve 15 dakikalık pencerede yapılır', async () => {
    const { client } = sahteClient();
    const say = vi.fn().mockResolvedValue(0);

    await applyLockoutPolicy(girdi(), { countRecentFailures: say, client }, SIMDI);

    expect(say).toHaveBeenCalledWith(
      { emailHash: EPOSTA_OZETI },
      new Date('2026-08-05T11:45:00.000Z'),
    );
  });
});

describe('applyLockoutPolicy — eşiğe ulaşınca kilitler', () => {
  it('hesap eşiğinde (20) kilit uygulanır', async () => {
    const { client, userUpdate } = sahteClient();

    const karar = await applyLockoutPolicy(
      girdi(),
      { countRecentFailures: vi.fn().mockResolvedValue(20), client },
      SIMDI,
    );

    expect(karar.locked).toBe(true);
    expect(karar).toMatchObject({ failures: 20, applied: true });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: KULLANICI_ID },
      data: { lockedUntil: new Date('2026-08-05T12:15:00.000Z') },
    });
  });

  it('eşiğin üstünde de kilitler', async () => {
    const { client, userUpdate } = sahteClient();

    const karar = await applyLockoutPolicy(
      girdi(),
      { countRecentFailures: vi.fn().mockResolvedValue(25), client },
      SIMDI,
    );

    expect(karar.locked).toBe(true);
    expect(userUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('ADR-022 — kilit AuditLog kaydı', () => {
  it('kilit uygulanınca AuditLog kaydı düşer', async () => {
    const { client, auditCreate } = sahteClient();

    await applyLockoutPolicy(
      girdi(),
      { countRecentFailures: vi.fn().mockResolvedValue(20), client },
      SIMDI,
    );

    expect(auditCreate).toHaveBeenCalledTimes(1);
    const yazilan = auditCreate.mock.calls[0]?.[0]?.data;

    expect(yazilan).toMatchObject({
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: KULLANICI_ID,
      actorEmailHash: EPOSTA_OZETI,
      ip: IP,
    });
  });

  /**
   * Kilitlenen kullanıcı olayın FAİLİ değil, MAĞDURU. `actorId` doluysa denetim
   * kaydı okunduğunda "kullanıcı kendini kilitledi" gibi görünür.
   */
  it('actorId null — kilidi uygulayan kimliği doğrulanmamış bir istektir', async () => {
    const { client, auditCreate } = sahteClient();

    await applyLockoutPolicy(
      girdi(),
      { countRecentFailures: vi.fn().mockResolvedValue(20), client },
      SIMDI,
    );

    expect(auditCreate.mock.calls[0]?.[0]?.data.actorId).toBeNull();
  });

  it('diff kararı ve eşikleri taşır', async () => {
    const { client, auditCreate } = sahteClient();

    await applyLockoutPolicy(
      girdi(),
      { countRecentFailures: vi.fn().mockResolvedValue(22), client },
      SIMDI,
    );

    expect(auditCreate.mock.calls[0]?.[0]?.data.diff).toEqual({
      lockedUntil: '2026-08-05T12:15:00.000Z',
      reason: 'LOGIN_RATE_LIMIT',
      failedAttempts: 22,
      windowMinutes: 15,
      lockMinutes: 15,
    });
  });

  /**
   * §8.20 — denetim kaydı loglara ve panele akar. Ham e-posta, şifre veya
   * jeton taşırsa en çok tekrarlanan saldırı yolunda sır sızdırmış oluruz.
   */
  it('§8.20 — kayıtta ham e-posta, şifre veya jeton YOK', async () => {
    const { client, auditCreate } = sahteClient();

    await applyLockoutPolicy(
      { ip: IP, emailHash: EPOSTA_OZETI, userId: KULLANICI_ID },
      { countRecentFailures: vi.fn().mockResolvedValue(20), client },
      SIMDI,
    );

    const serilestirilmis = JSON.stringify(auditCreate.mock.calls[0]?.[0]?.data);

    for (const yasak of ['@', 'password', 'passwordHash', 'totpSecret', 'token', 'secret']) {
      expect(serilestirilmis, `kayıt "${yasak}" içermemeli`).not.toContain(yasak);
    }
  });
});

describe('applyLockoutPolicy — dayanıklılık (asla fırlatmaz)', () => {
  it('sayım okunamazsa akışı bozmaz', async () => {
    const { client, userUpdate } = sahteClient();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const karar = await applyLockoutPolicy(
      girdi(),
      { countRecentFailures: vi.fn().mockRejectedValue(new Error('db yok')), client },
      SIMDI,
    );

    expect(karar).toEqual({ locked: false, failures: 0 });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  /**
   * Kilit yazılamadıysa bunu SESSİZCE yutmak, "kilit uygulandı" sanılmasına
   * yol açardı. `applied: false` çağırana gerçeği söyler.
   */
  it('kilit yazılamazsa applied:false döner, fırlatmaz', async () => {
    const { client, auditCreate } = sahteClient();
    client.user.update = vi.fn().mockRejectedValue(new Error('yazılamadı'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const karar = await applyLockoutPolicy(
      girdi(),
      { countRecentFailures: vi.fn().mockResolvedValue(20), client },
      SIMDI,
    );

    expect(karar).toMatchObject({ locked: true, applied: false });
    // Kilit yazılamadıysa denetim kaydı da yazılmaz — olmayan bir olayı kaydetme.
    expect(auditCreate).not.toHaveBeenCalled();
  });

  /**
   * Kilit YAZILDI ama denetim kaydı yazılamadı: kilidi geri almıyoruz.
   * Güvenlik kararı, kaydının tutulmasından daha önemli.
   */
  it('denetim kaydı yazılamazsa kilit yine de geçerli sayılır', async () => {
    const { client } = sahteClient();
    client.auditLog.create = vi.fn().mockRejectedValue(new Error('audit yazılamadı'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const karar = await applyLockoutPolicy(
      girdi(),
      { countRecentFailures: vi.fn().mockResolvedValue(20), client },
      SIMDI,
    );

    expect(karar).toMatchObject({ locked: true, applied: true });
  });

  /**
   * Var olmayan bir e-posta denendiğinde kilitlenecek `User` kaydı yoktur.
   * Karar raporlanır ama uygulanamaz — ve ÖNEMLİSİ: olmayan bir kullanıcı için
   * `user.update` çağrılmaz (Prisma `P2025` fırlatırdı).
   */
  it('kullanıcı yoksa yazmaya çalışmaz', async () => {
    const { client, userUpdate, auditCreate } = sahteClient();

    const karar = await applyLockoutPolicy(
      girdi(null),
      { countRecentFailures: vi.fn().mockResolvedValue(20), client },
      SIMDI,
    );

    expect(karar).toMatchObject({ locked: true, applied: false });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
