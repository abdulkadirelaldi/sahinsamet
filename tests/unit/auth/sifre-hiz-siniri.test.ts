import { describe, expect, it, vi } from 'vitest';

import { LOGIN_RATE_LIMIT } from '@/lib/security/rate-limit';
import { changePasswordSchema } from '@/lib/schemas';
import { changePassword, type ChangePasswordClient } from '@/server/auth/change-password';
import { hashPassword } from '@/server/auth/password';
import {
  AUTH_FAILURE_CONTEXTS,
  CHANGE_PASSWORD_RATE_LIMIT,
  countRecentChangePasswordFailures,
  isChangePasswordRateLimited,
  TOTP_SETUP_RATE_LIMIT,
  type TotpAuditReader,
} from '@/server/services/user';

/**
 * ŞİFRE DEĞİŞTİRME HIZ SINIRI — T-046/3a, Güvenlik'in kararı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GEREKÇE BRUTE-FORCE DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  1. KAYNAK TÜKETİMİ: yanlış şifre doğrulaması p50 31 ms ve 19 MiB; 50
 *     eşzamanlı istek ≈ 1 GB. Tek oturum üretim kutusunu doyurabilir.
 *  2. YETKİ YÜKSELTME: çalınmış oturumla şifre tahmin edilirse saldırgan asıl
 *     sahibi kilitler.
 *
 * "EŞİĞİN KENDİSİ SINIR TESTİYLE ÖLÇÜLSÜN — yoksa eşik bir temenni olur."
 * (Güvenlik). §8.4'ün "dört deneme kilitlemez" testinin kardeşi aşağıda.
 */

const FAST = { memoryCost: 1 << 12, timeCost: 1, parallelism: 1 };
const KULLANICI = 'clx0000000000000000000001';
const MEVCUT = 'mevcut-guclu-sifre-2026';
const YENI = 'yeni-daha-guclu-sifre-2027';
const AN = new Date('2026-09-20T12:00:00.000Z');

function sayac(deger: number) {
  const count = vi.fn().mockResolvedValue(deger);
  const client: TotpAuditReader = { auditLog: { count } };
  return { client, count };
}

/* ===========================================================================
 * EŞİK — ÜÇÜNCÜ BİR SİHİRLİ SAYI YOK
 * ======================================================================== */

describe('eşik tek kaynaktan geliyor', () => {
  it('CHANGE_PASSWORD_RATE_LIMIT === TOTP_SETUP_RATE_LIMIT === LOGIN_RATE_LIMIT', () => {
    // §8.4 tek yerden denetlenebilir kalsın; üçüncü bir eşik icat EDİLMEDİ.
    expect(CHANGE_PASSWORD_RATE_LIMIT).toBe(TOTP_SETUP_RATE_LIMIT);
    expect(CHANGE_PASSWORD_RATE_LIMIT.maxFailures).toBe(LOGIN_RATE_LIMIT.maxFailures);
    expect(CHANGE_PASSWORD_RATE_LIMIT.windowMinutes).toBe(LOGIN_RATE_LIMIT.windowMinutes);
  });

  it('yürürlükteki değerler 5 / 15 dk', () => {
    // Sayılar KASITLI olarak tekrar yazılıyor: hız sınırı bir kabul şartı ve
    // yürürlükteki değer koda bakmadan okunabilmeli.
    expect(CHANGE_PASSWORD_RATE_LIMIT.maxFailures).toBe(5);
    expect(CHANGE_PASSWORD_RATE_LIMIT.windowMinutes).toBe(15);
  });
});

/* ===========================================================================
 * ⚠️ SINIR TESTİ — "dört deneme kilitlemez"in kardeşi
 * ======================================================================== */

describe('SINIR: eşik gerçekten eşik', () => {
  it.each([0, 1, 3, 4])('%i başarısız deneme SINIRLAMIYOR', async (n) => {
    const { client } = sayac(n);
    expect(await isChangePasswordRateLimited(KULLANICI, AN, null, client)).toBe(false);
  });

  it('BEŞİNCİ deneme sınırlıyor', async () => {
    const { client } = sayac(5);
    expect(await isChangePasswordRateLimited(KULLANICI, AN, null, client)).toBe(true);
  });

  it('eşiğin üstü de sınırlı kalıyor', async () => {
    const { client } = sayac(99);
    expect(await isChangePasswordRateLimited(KULLANICI, AN, null, client)).toBe(true);
  });
});

/* ===========================================================================
 * SORGU ŞEKLİ — bağlam ayrımı
 * ======================================================================== */

describe('sayaç YALNIZCA kendi bağlamını sayıyor', () => {
  it('sorgu `diff.context = CHANGE_PASSWORD` filtresi taşıyor', async () => {
    const { client, count } = sayac(0);
    await countRecentChangePasswordFailures(KULLANICI, AN, null, client);

    const where = count.mock.calls[0]?.[0].where as Record<string, unknown>;
    expect(where).toMatchObject({
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: KULLANICI,
    });
    expect(where.OR).toEqual([{ diff: { path: ['context'], equals: 'CHANGE_PASSWORD' } }]);
  });

  /**
   * ⚠️ ÇAPRAZ SAYIM — T-046'da ölçülüp düzeltilen kusur.
   *
   * Sayaç eskiden `diff.context`e hiç bakmıyordu. T-042s şifre akışını ekleyince
   * aynı üçlüyle satır yazmaya başladı: şifresini yanlış yazan kullanıcı, 2FA
   * KURULUM sınırını da dolduruyordu. Canlı veritabanında ölçüldü (geri alınan
   * işlem): filtresiz sayım 3, bağlam filtreli sayımlar 2 ve 1.
   */
  it('iki bağlam AYRIK — kümelerin kesişimi boş', () => {
    const kesisim = AUTH_FAILURE_CONTEXTS.totpSetup.filter((c) =>
      (AUTH_FAILURE_CONTEXTS.changePassword as readonly string[]).includes(c),
    );
    expect(kesisim).toEqual([]);
  });

  it('AŞIM bağlamı sayılan bağlamların DIŞINDA', () => {
    // `CHANGE_PASSWORD_RATE_LIMITED` denetlenebilir ama SAYILMAZ; sayılsaydı
    // sınıra takılan her istek pencereyi uzatır ve hesap süresiz kilitli kalırdı.
    expect(AUTH_FAILURE_CONTEXTS.changePassword as readonly string[]).not.toContain(
      'CHANGE_PASSWORD_RATE_LIMITED',
    );
  });
});

/* ===========================================================================
 * PENCERE SIFIRLAMA — başarılı değişiklik
 * ======================================================================== */

describe('başarılı değişiklik penceresi TEMİZLİYOR', () => {
  it('`writesValidFrom` pencere başından SONRAYSA sayım ondan başlıyor', async () => {
    const { client, count } = sayac(0);
    const sonBasarili = new Date('2026-09-20T11:58:00.000Z'); // pencere içinde
    await countRecentChangePasswordFailures(KULLANICI, AN, sonBasarili, client);

    const where = count.mock.calls[0]?.[0].where as { createdAt: { gte: Date } };
    expect(where.createdAt.gte).toEqual(sonBasarili);
  });

  it('`writesValidFrom` pencereden ESKİYSE pencere başı geçerli', async () => {
    const { client, count } = sayac(0);
    const cokEski = new Date('2026-01-01T00:00:00.000Z');
    await countRecentChangePasswordFailures(KULLANICI, AN, cokEski, client);

    const where = count.mock.calls[0]?.[0].where as { createdAt: { gte: Date } };
    // 15 dakikalık pencere; daha eskisine uzatmak sınırı gevşetirdi.
    expect(where.createdAt.gte).toEqual(new Date('2026-09-20T11:45:00.000Z'));
  });

  it('AuditLog satırları SİLİNMİYOR — sayaç onları görmezden geliyor', async () => {
    // §8.19: denetim kaydı kalıcıdır. "Pencere temizlenir" bir SORGU kararı,
    // bir silme işlemi değil.
    const { client, count } = sayac(0);
    await countRecentChangePasswordFailures(KULLANICI, AN, new Date(AN), client);
    expect(count).toHaveBeenCalledOnce();
  });
});

/* ===========================================================================
 * AKIŞ — sınır argon2'den ÖNCE
 * ======================================================================== */

describe('changePassword akışında hız sınırı', () => {
  async function kullanici(writesValidFrom: Date | null = null) {
    return {
      id: KULLANICI,
      passwordHash: await hashPassword(MEVCUT, FAST),
      totpSecret: null,
      totpConfirmedAt: null,
      totpBackupCodes: [],
      writesValidFrom,
    };
  }

  function istemci(kayit: Awaited<ReturnType<typeof kullanici>>, basarisiz: number) {
    const findUnique = vi.fn().mockResolvedValue(kayit);
    const update = vi.fn().mockResolvedValue({ count: 1 });
    const count = vi.fn().mockResolvedValue(basarisiz);
    const client: ChangePasswordClient = {
      user: { findUnique, update, updateMany: update },
      passkey: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      auditLog: { count },
    };
    return { client, findUnique, update, count };
  }

  const girdi = () =>
    changePasswordSchema.parse({
      currentPassword: MEVCUT,
      newPassword: YENI,
      newPasswordConfirm: YENI,
    });

  it('sınır aşılınca RATE_LIMITED ve YAZMA YOK', async () => {
    const { client, update } = istemci(await kullanici(), 5);
    const sonuc = await changePassword(KULLANICI, girdi(), client, AN);

    expect(sonuc).toEqual({ ok: false, reason: 'RATE_LIMITED' });
    expect(update).not.toHaveBeenCalled();
  });

  /**
   * ⚠️ SIRA KORUMANIN YARISI: kontrol argon2'den ÖNCE.
   *
   * Sonra yapılsaydı sınır aşılmış olsa bile 31 ms CPU ve 19 MiB zaten
   * harcanmış olurdu — sınır saldırıyı SAYAR ama ENGELLEMEZDİ ve (1) numaralı
   * gerekçe (kaynak tüketimi) karşılanmazdı.
   */
  it('sınır DOĞRU ŞİFREYLE gelen isteği de durduruyor — argon2 çalışmadan', async () => {
    const { client, update } = istemci(await kullanici(), 5);
    const sonuc = await changePassword(KULLANICI, girdi(), client, AN);

    // Doğru şifre olmasına rağmen reddedildi: karar doğrulamadan ÖNCE verildi.
    expect(sonuc).toEqual({ ok: false, reason: 'RATE_LIMITED' });
    expect(update).not.toHaveBeenCalled();
  });

  it('sınır altındayken akış normal işliyor', async () => {
    const { client, update } = istemci(await kullanici(), 4);
    expect(await changePassword(KULLANICI, girdi(), client, AN)).toEqual({ ok: true });
    expect(update).toHaveBeenCalledOnce();
  });

  it('sayaç `writesValidFrom`u sıfırlama noktası olarak GEÇİRİYOR', async () => {
    const sonBasarili = new Date('2026-09-20T11:59:00.000Z');
    const { client, count } = istemci(await kullanici(sonBasarili), 0);
    await changePassword(KULLANICI, girdi(), client, AN);

    const where = count.mock.calls[0]?.[0].where as { createdAt: { gte: Date } };
    expect(where.createdAt.gte).toEqual(sonBasarili);
  });
});

/* ===========================================================================
 * ADR-035/B — damga yazılıyor
 * ======================================================================== */

describe('başarılı değişiklik `writesValidFrom` damgalıyor', () => {
  it('şifre ve damga TEK `update`te birlikte yazılıyor', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: KULLANICI,
      passwordHash: await hashPassword(MEVCUT, FAST),
      totpSecret: null,
      totpConfirmedAt: null,
      totpBackupCodes: [],
      writesValidFrom: null,
    });
    const update = vi.fn().mockResolvedValue({ count: 1 });
    const client: ChangePasswordClient = {
      user: { findUnique, update, updateMany: update },
      passkey: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      auditLog: { count: vi.fn().mockResolvedValue(0) },
    };

    await changePassword(
      KULLANICI,
      changePasswordSchema.parse({
        currentPassword: MEVCUT,
        newPassword: YENI,
        newPasswordConfirm: YENI,
      }),
      client,
      AN,
    );

    // Ayrı iki `update` olsaydı araya düşen bir hata şifreyi değiştirip damgayı
    // atlayabilirdi: kullanıcı değiştirdim sanır, çalınmış oturum yazmaya devam eder.
    const data = update.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(Object.keys(data).sort()).toEqual(['passwordHash', 'writesValidFrom']);
    expect(data.writesValidFrom).toEqual(AN);
  });
});
