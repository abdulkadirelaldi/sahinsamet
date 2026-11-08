import { describe, expect, it, vi } from 'vitest';

import { changePasswordSchema } from '@/lib/schemas';
import {
  changePassword,
  type ChangePasswordClient,
  type ChangePasswordUserRecord,
} from '@/server/auth/change-password';
import { hashPassword, verifyPassword } from '@/server/auth/password';

/**
 * ŞİFRE DEĞİŞTİRME SERVİSİ — T-042s, §8.1/§8.2/§8.4.
 *
 * `hashPassword` ÜRETİM PARAMETRELERİYLE koşuyor (19 MiB, t=3) — yalnızca
 * servisin İÇİNDEKİ yazma çağrısında. Testin kurduğu hash'ler `FAST` ile
 * üretiliyor; argon2 kodlanmış hash'in içinde kendi parametrelerini taşıdığı
 * için `verifyPassword` onları okur ve ucuz hash de doğru doğrulanır.
 */

const FAST = { memoryCost: 1 << 12, timeCost: 1, parallelism: 1 };

const MEVCUT = 'mevcut-guclu-sifre-2026';
const YENI = 'yeni-daha-guclu-sifre-2027';
const KULLANICI_ID = 'clx0000000000000000000001';

async function kullanici(
  ustunde: Partial<ChangePasswordUserRecord> = {},
): Promise<ChangePasswordUserRecord> {
  return {
    id: KULLANICI_ID,
    passwordHash: await hashPassword(MEVCUT, FAST),
    totpSecret: null,
    totpConfirmedAt: null,
    totpBackupCodes: [],
    writesValidFrom: null,
    ...ustunde,
  };
}

/** `basarisizSayisi` — hız sınırı sayacının döneceği değer (T-046/3a). */
function istemci(kayit: ChangePasswordUserRecord | null, basarisizSayisi = 0) {
  const findUnique = vi.fn().mockResolvedValue(kayit);
  const update = vi.fn().mockResolvedValue({ count: 1 });
  const auditCount = vi.fn().mockResolvedValue(basarisizSayisi);
  const client: ChangePasswordClient = {
    user: { findUnique, update, updateMany: update },
    passkey: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    auditLog: { count: auditCount },
  };
  return { client, findUnique, update, auditCount };
}

/** Şemadan geçmiş girdi — action'ın servise verdiği şeklin aynısı. */
function girdi(ustunde: Record<string, unknown> = {}) {
  return changePasswordSchema.parse({
    currentPassword: MEVCUT,
    newPassword: YENI,
    newPasswordConfirm: YENI,
    ...ustunde,
  });
}

/* ===========================================================================
 * ŞEMA — passwordSchema TÜKETİLİYOR
 * ======================================================================== */

describe('changePasswordSchema', () => {
  it('geçerli girdi kabul ediliyor', () => {
    expect(changePasswordSchema.safeParse(girdi()).success).toBe(true);
  });

  it('ZAYIF yeni şifre reddediliyor — kural passwordSchema’dan geliyor (§8.2)', () => {
    const sonuc = changePasswordSchema.safeParse({
      currentPassword: MEVCUT,
      newPassword: 'kisa',
      newPasswordConfirm: 'kisa',
    });

    expect(sonuc.success).toBe(false);
    // 12 karakter kuralı T-011'in `passwordSchema`'sında; burada YENİDEN yazılmadı.
    if (!sonuc.success) {
      expect(sonuc.error.issues.some((i) => i.message.includes('12 karakter'))).toBe(true);
    }
  });

  it('TEKRAR UYUŞMUYORSA hata `newPasswordConfirm` alanına düşüyor', () => {
    const sonuc = changePasswordSchema.safeParse({
      currentPassword: MEVCUT,
      newPassword: YENI,
      newPasswordConfirm: 'baska-bir-sifre-2027',
    });

    expect(sonuc.success).toBe(false);
    if (!sonuc.success) {
      expect(sonuc.error.issues[0]?.path).toEqual(['newPasswordConfirm']);
    }
  });

  it('mevcut şifre `passwordSchema`’dan GEÇMİYOR — eski kısa şifre engellenmiyor', () => {
    // Seed'den kalma, bugünkü kurala uymayan bir şifreyle de değiştirme
    // yapılabilmeli. "Mevcut şifreniz en az 12 karakter olmalı" saçma olurdu.
    const sonuc = changePasswordSchema.safeParse({
      currentPassword: 'kisa',
      newPassword: YENI,
      newPasswordConfirm: YENI,
    });
    expect(sonuc.success).toBe(true);
  });

  it('totpCode OPSİYONEL — 2FA kurulu değilse form gönderilebilmeli', () => {
    expect(changePasswordSchema.safeParse(girdi()).success).toBe(true);
  });

  it('totpCode BOŞ DİZE `undefined`a çevriliyor (T-013c ölçümü)', () => {
    // HTML formu görünmeyen alanı bile `""` gönderir; doğrudan birleşime
    // girseydi şema hatası olurdu ve TOTP_REQUIRED yoluna hiç ulaşılmazdı.
    expect(changePasswordSchema.parse(girdi({ totpCode: '' })).totpCode).toBeUndefined();
  });

  it('totpCode BİÇİMİ doğrulanıyor — 6 hane veya kurtarma kodu', () => {
    // HAM nesne kuruluyor, `girdi()` DEĞİL: o yardımcı `parse` çağırıyor ve
    // geçersiz girdide `safeParse`a varmadan fırlatırdı.
    const ham = (totpCode: string) => ({
      currentPassword: MEVCUT,
      newPassword: YENI,
      newPasswordConfirm: YENI,
      totpCode,
    });

    expect(changePasswordSchema.safeParse(ham('123456')).success).toBe(true);
    expect(changePasswordSchema.safeParse(ham('ABCDE-FGHIJ')).success).toBe(true);
    expect(changePasswordSchema.safeParse(ham('12')).success).toBe(false);
  });
});

/* ===========================================================================
 * DOĞRU AKIŞ
 * ======================================================================== */

describe('changePassword — doğru akış', () => {
  it('yeni hash yazılıyor ve DÜZ ŞİFRE değil HASH saklanıyor', async () => {
    const { client, update } = istemci(await kullanici());
    const sonuc = await changePassword(KULLANICI_ID, girdi(), client);

    expect(sonuc).toEqual({ ok: true });

    const data = update.mock.calls[0]?.[0].data as { passwordHash: string };
    expect(data.passwordHash).not.toBe(YENI);
    expect(data.passwordHash.startsWith('$argon2id$')).toBe(true);
    // Yazılan hash gerçekten YENİ şifreyi doğruluyor mu?
    await expect(verifyPassword(data.passwordHash, YENI)).resolves.toBe(true);
    await expect(verifyPassword(data.passwordHash, MEVCUT)).resolves.toBe(false);
  });

  /**
   * DEĞİŞTİ (T-046/ADR-035/B): artık `writesValidFrom` damgası da AYNI
   * `update` içinde yazılıyor. Ayrı iki yazma olsaydı araya düşen bir hata
   * şifreyi değiştirip damgayı atlayabilirdi — kullanıcı değiştirdim sanır,
   * çalınmış oturum yazmaya devam ederdi.
   */
  it('passwordHash VE writesValidFrom yazılıyor — başka alana dokunulmuyor', async () => {
    const { client, update } = istemci(await kullanici());
    await changePassword(KULLANICI_ID, girdi(), client);

    expect(Object.keys(update.mock.calls[0]?.[0].data as object).sort()).toEqual([
      'passwordHash',
      'writesValidFrom',
    ]);
  });

  it('kullanıcı `id` ile aranıyor — oturumdaki kimlik', async () => {
    const { client, findUnique } = istemci(await kullanici());
    await changePassword(KULLANICI_ID, girdi(), client);

    expect(findUnique).toHaveBeenCalledWith({ where: { id: KULLANICI_ID } });
  });
});

/* ===========================================================================
 * KİMLİK ADIMLARI
 * ======================================================================== */

describe('changePassword — mevcut şifre zorunlu (§8.4)', () => {
  it('YANLIŞ mevcut şifre reddediliyor ve YAZMA YAPILMIYOR', async () => {
    const { client, update } = istemci(await kullanici());
    const sonuc = await changePassword(
      KULLANICI_ID,
      girdi({ currentPassword: 'yanlis-sifre-2026' }),
      client,
    );

    // Oturumu ele geçiren biri şifreyi değiştirip KALICI erişim kuramamalı.
    expect(sonuc).toEqual({ ok: false, reason: 'INVALID_CURRENT_PASSWORD' });
    expect(update).not.toHaveBeenCalled();
  });

  it('kullanıcı yoksa USER_NOT_FOUND', async () => {
    const { client, update } = istemci(null);
    const sonuc = await changePassword(KULLANICI_ID, girdi(), client);

    expect(sonuc).toEqual({ ok: false, reason: 'USER_NOT_FOUND' });
    expect(update).not.toHaveBeenCalled();
  });

  it('BOZUK hash akışı çökertmiyor, yanlış şifreye düşüyor', async () => {
    // `verifyPassword` bozuk hash'te fırlatmaz, `false` döner (T-013a kararı).
    const { client } = istemci(await kullanici({ passwordHash: 'bozuk-hash' }));
    const sonuc = await changePassword(KULLANICI_ID, girdi(), client);

    expect(sonuc).toEqual({ ok: false, reason: 'INVALID_CURRENT_PASSWORD' });
  });
});

/* ===========================================================================
 * AYNI ŞİFRE — SAKLANAN HASH'e karşı ölçülüyor
 * ======================================================================== */

describe('changePassword — yeni şifre eskisiyle aynı olamaz', () => {
  /**
   * ⚠️ ASIL KAPI BURADA, ŞEMADA DEĞİL.
   *
   * Şemadaki `currentPassword !== newPassword` kuralı istemcide de koşan bir
   * KOLAYLIK. Bu test onu ATLAYARAK — şemayı hiç kullanmadan, doğrudan servise
   * girerek — sunucunun kendi başına da reddettiğini ölçüyor. İstemcide koşan
   * bir kurala güvenilemez.
   */
  it('şema atlansa bile sunucu SAKLANAN HASH’e karşı doğrulayıp reddediyor', async () => {
    const { client, update } = istemci(await kullanici());
    const sonuc = await changePassword(
      KULLANICI_ID,
      // Şemadan GEÇMEMİŞ girdi: iki alan da mevcut şifre.
      {
        currentPassword: MEVCUT,
        newPassword: MEVCUT,
        newPasswordConfirm: MEVCUT,
        totpCode: undefined,
      },
      client,
    );

    expect(sonuc).toEqual({ ok: false, reason: 'SAME_PASSWORD' });
    expect(update).not.toHaveBeenCalled();
  });

  it('gerçekten farklı şifre GEÇİYOR', async () => {
    const { client, update } = istemci(await kullanici());
    expect(await changePassword(KULLANICI_ID, girdi(), client)).toEqual({ ok: true });
    expect(update).toHaveBeenCalledOnce();
  });
});

/* ===========================================================================
 * İKİNCİ FAKTÖR
 * ======================================================================== */

describe('changePassword — 2FA', () => {
  const KURTARMA = 'ABCDE-FGHIJ';

  async function ikiAdimliKullanici() {
    const { hashBackupCodes } = await import('@/server/auth/backup-codes');
    return kullanici({
      totpConfirmedAt: new Date('2026-01-01T00:00:00.000Z'),
      totpBackupCodes: await hashBackupCodes([KURTARMA]),
    });
  }

  it('2FA KURULU ve kod YOKSA → TOTP_REQUIRED, yazma yok', async () => {
    const { client, update } = istemci(await ikiAdimliKullanici());
    const sonuc = await changePassword(KULLANICI_ID, girdi(), client);

    expect(sonuc).toEqual({ ok: false, reason: 'TOTP_REQUIRED' });
    expect(update).not.toHaveBeenCalled();
  });

  it('2FA KURULU ve kod YANLIŞSA → INVALID_TOTP, yazma yok', async () => {
    const { client, update } = istemci(await ikiAdimliKullanici());
    const sonuc = await changePassword(KULLANICI_ID, girdi({ totpCode: '000000' }), client);

    expect(sonuc).toEqual({ ok: false, reason: 'INVALID_TOTP' });
    expect(update).not.toHaveBeenCalled();
  });

  it('KURTARMA KODU kabul ediliyor — telefonunu kaybeden kilitlenmiyor', async () => {
    const { client, update } = istemci(await ikiAdimliKullanici());
    const sonuc = await changePassword(KULLANICI_ID, girdi({ totpCode: KURTARMA }), client);

    expect(sonuc).toEqual({ ok: true });
    // İki yazma: kurtarma kodu tüketimi + (yeni şifre hash'i & ADR-035 damgası).
    const yazilanlar = update.mock.calls.map((c) => Object.keys(c[0].data as object).sort());
    expect(yazilanlar).toContainEqual(['totpBackupCodes']);
    expect(yazilanlar).toContainEqual(['passwordHash', 'writesValidFrom']);
  });

  it('KURTARMA KODU TÜKETİLİYOR — kalıcı arka kapı olmuyor', async () => {
    const { client, update } = istemci(await ikiAdimliKullanici());
    await changePassword(KULLANICI_ID, girdi({ totpCode: KURTARMA }), client);

    const tuketim = update.mock.calls.find((c) =>
      Object.hasOwn(c[0].data as object, 'totpBackupCodes'),
    );
    expect((tuketim?.[0].data as { totpBackupCodes: string[] }).totpBackupCodes).toEqual([]);
  });

  /**
   * 2FA KURULU DEĞİLSE kod İSTENMİYOR.
   *
   * Olmayan bir faktörü şart koşmak, kurulumunu henüz bitirmemiş kullanıcıyı
   * şifresini DEĞİŞTİREMEZ hâle getirirdi — güvenlik eklemeden kilitlenme.
   */
  it('2FA KURULU DEĞİLSE kod istenmiyor', async () => {
    const { client } = istemci(await kullanici({ totpConfirmedAt: null }));
    expect(await changePassword(KULLANICI_ID, girdi(), client)).toEqual({ ok: true });
  });

  it('secret var ama `totpConfirmedAt` boşsa yine istenmiyor — kurulum bitmemiş', async () => {
    // ADR-013: kurulum tamamlanmadan 2FA zorunlu sayılmaz.
    const { client } = istemci(await kullanici({ totpSecret: 'sifreli', totpConfirmedAt: null }));
    expect(await changePassword(KULLANICI_ID, girdi(), client)).toEqual({ ok: true });
  });

  it('SIRA: mevcut şifre yanlışsa 2FA’ya HİÇ bakılmıyor', async () => {
    // Yanlış şifreyle gelen biri, kod deneyerek kurtarma kodu tüketemez.
    const { client, update } = istemci(await ikiAdimliKullanici());
    const sonuc = await changePassword(
      KULLANICI_ID,
      girdi({ currentPassword: 'yanlis-sifre-2026', totpCode: KURTARMA }),
      client,
    );

    expect(sonuc).toEqual({ ok: false, reason: 'INVALID_CURRENT_PASSWORD' });
    expect(update).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * §8.20 — SERVİS ŞİFREYİ LOGLAMIYOR
 * ======================================================================== */

describe('§8.20 — servis şifreyi loglamıyor', () => {
  it('hiçbir yolda console’a şifre yazılmıyor', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { client } = istemci(await kullanici({ passwordHash: 'bozuk' }));
    await changePassword(KULLANICI_ID, girdi(), client);
    const { client: c2 } = istemci(await kullanici());
    await changePassword(KULLANICI_ID, girdi(), c2);

    const hepsi = [...log.mock.calls, ...err.mock.calls, ...warn.mock.calls]
      .flat()
      .map(String)
      .join(' ');
    expect(hepsi).not.toContain(MEVCUT);
    expect(hepsi).not.toContain(YENI);

    vi.restoreAllMocks();
  });
});
