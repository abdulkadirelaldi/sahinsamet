import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REDACTED_FIELD_NAMES } from '@/lib/schemas';
import { redactAuditDiff } from '@/server/services/_shared/audit';

/**
 * ŞİFRE DEĞİŞTİRME SERVER ACTION'I — T-042s, §7.1/§8.6/§8.20, ADR-022.
 *
 * `writeAuditLog` TAKLİT EDİLMİYOR — §8.20'nin "şifre `AuditLog`'a yazılmıyor"
 * kuralı onun GERÇEK davranışıyla, redaksiyon dahil, ölçülmeli. Onun yerine
 * `db.auditLog.create` taklit ediliyor: yazılan SATIR gözleniyor.
 *
 * Servis taklit ediliyor çünkü argon2 üretim parametreleriyle koşuyor ve
 * servisin kendi davranışı `tests/unit/auth/change-password.test.ts`'te
 * gerçek kriptoyla zaten ölçülüyor.
 */

const auth = vi.hoisted(() => vi.fn());
const auditCreate = vi.hoisted(() => vi.fn());
const changePassword = vi.hoisted(() => vi.fn());
const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock('@/server/auth', () => ({ auth }));
vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: vi.fn() }));
const userFindUnique = vi.hoisted(() => vi.fn());
vi.mock('@/server/db', () => ({
  db: { auditLog: { create: auditCreate }, user: { findUnique: userFindUnique } },
}));
/*
 * ADR-035/B — YAZMA KAPISI (T-046).
 *
 * `currentActorId()` artık `writesRevoked()` çağırıyor, yani her Server Action
 * `user.findUnique` ile `writesValidFrom` okuyor. İki şey taklide eklendi:
 *
 *   - `db.user.findUnique` → `{ writesValidFrom: null }` ("hiç geçersizleştirilmedi")
 *   - oturuma `tokenIssuedAt` → kapı FAIL-CLOSED; `iat` taşımayan bir oturum
 *     yazma yetkisiz sayılıyor. Bu kasıtlı ve `yazma-kapisi.test.ts` ölçüyor.
 */
vi.mock('@/server/auth/change-password', () => ({ changePassword }));

const AKTOR = 'clx0000000000000000000001';
const MEVCUT = 'mevcut-guclu-sifre-2026';
const YENI = 'yeni-daha-guclu-sifre-2027';

const GOVDE = {
  currentPassword: MEVCUT,
  newPassword: YENI,
  newPasswordConfirm: YENI,
};

function denetimKayitlari(): Record<string, unknown>[] {
  return auditCreate.mock.calls.map((c) => (c[0] as { data: Record<string, unknown> }).data);
}

async function eylem() {
  const { changePasswordAction } = await import('@/server/actions/password');
  return changePasswordAction;
}

/** Jetonun verildiği an — yazma kapısının eşiği (ADR-035/B). */
const OTURUM_IAT = Math.floor(Date.parse('2026-09-20T12:00:00.000Z') / 1000);

beforeEach(() => {
  userFindUnique.mockResolvedValue({ writesValidFrom: null });
  auth.mockResolvedValue({ user: { id: AKTOR }, tokenIssuedAt: OTURUM_IAT });
  auditCreate.mockResolvedValue({});
  changePassword.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

/* ===========================================================================
 * §8.6 — YETKİ
 * ======================================================================== */

describe('§8.6 — yetkisiz erişim', () => {
  it('oturum YOKSA UNAUTHORIZED ve servise HİÇ gidilmiyor', async () => {
    auth.mockResolvedValue(null);
    const sonuc = await (await eylem())(GOVDE);

    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.code).toBe('UNAUTHORIZED');
    expect(changePassword).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('oturum var ama `user.id` yoksa yine UNAUTHORIZED', async () => {
    auth.mockResolvedValue({ user: {}, tokenIssuedAt: OTURUM_IAT });
    expect((await (await eylem())(GOVDE)).ok).toBe(false);
  });

  it('servise OTURUMDAKİ kimlik geçiyor — gövdeden gelen değil', async () => {
    // Gövdede `userId` gönderen biri başkasının şifresini değiştirememeli.
    await (
      await eylem()
    )({ ...GOVDE, userId: 'baska-kullanici' });
    expect(changePassword.mock.calls[0]?.[0]).toBe(AKTOR);
  });
});

/* ===========================================================================
 * DOĞRU AKIŞ
 * ======================================================================== */

describe('doğru akış', () => {
  it('ok(null) dönüyor — yanıt hiçbir kullanıcı verisi taşımıyor', async () => {
    const sonuc = await (await eylem())(GOVDE);
    expect(sonuc).toEqual({ ok: true, data: null });
  });

  it('AuditLog UPDATE / User yazılıyor', async () => {
    await (
      await eylem()
    )(GOVDE);

    expect(denetimKayitlari()).toHaveLength(1);
    expect(denetimKayitlari()[0]).toMatchObject({
      actorId: AKTOR,
      action: 'UPDATE',
      entity: 'User',
      entityId: AKTOR,
    });
  });

  it('revalidateTag ÇAĞRILMIYOR — şifre hiçbir önbelleği etkilemiyor', async () => {
    await (
      await eylem()
    )(GOVDE);
    // `ContentEntity`de `User` yok, hiçbir `cachedRead` `User` okumuyor,
    // panel rotaları dinamik. Simetri uğruna çağırmak ölü kod olurdu.
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * ⚠️ §8.20 — ŞİFRE `AuditLog`'A HİÇBİR BİÇİMDE YAZILMIYOR
 * ======================================================================== */

describe('§8.20 — AuditLog’da şifre YOK', () => {
  const YOLLAR = [
    ['başarı', { ok: true }],
    ['yanlış mevcut şifre', { ok: false, reason: 'INVALID_CURRENT_PASSWORD' }],
    ['geçersiz TOTP', { ok: false, reason: 'INVALID_TOTP' }],
    ['aynı şifre', { ok: false, reason: 'SAME_PASSWORD' }],
    ['TOTP gerekli', { ok: false, reason: 'TOTP_REQUIRED' }],
  ] as const;

  it.each(YOLLAR)('%s yolunda yazılan satırda şifre GEÇMİYOR', async (_ad, servisSonucu) => {
    changePassword.mockResolvedValue(servisSonucu);
    await (
      await eylem()
    )({ ...GOVDE, totpCode: '123456' });

    const yazilan = JSON.stringify(denetimKayitlari());
    expect(yazilan).not.toContain(MEVCUT);
    expect(yazilan).not.toContain(YENI);
    // Hash veya parçası da yok — zaten diff'e hiç girmiyor.
    expect(yazilan).not.toContain('$argon2id$');
    expect(yazilan).not.toContain('123456');
  });

  it('diff YALNIZCA bağlam taşıyor — önce/sonra değeri YOK', async () => {
    await (
      await eylem()
    )(GOVDE);

    // `buildDiff` KULLANILMADI: önce/sonra taşımak burada şifreyi taşımak
    // demek olurdu. Denetim kaydının sorusu "ne zaman, kim" — "ne olduğu" değil.
    expect(denetimKayitlari()[0]?.diff).toEqual({
      context: 'CHANGE_PASSWORD',
      changed: 'passwordHash',
    });
  });

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * ÖLÇÜLDÜ: `redactAuditDiff` BİR EMNİYET AĞI, KORUMANIN KENDİSİ DEĞİL
   * ═════════════════════════════════════════════════════════════════════════
   *
   * Redaksiyon ALAN ADI bazlıdır. Ölçüm (T-042s):
   *
   *   password / newPassword / currentPassword / passwordHash → maskelendi ✓
   *   iç içe (`after.newPassword`) ve dizi içinde                → maskelendi ✓
   *   FARKLI AD (`yeniSifre`, `pass`, `secret_value`)            → SIZIYOR  ✗
   *   masum anahtarın DEĞERİNE gömülü (`note: "şifre: ..."`)     → SIZIYOR  ✗
   *
   * T-038'in dersinin aynısı: orada `redactAuditDiff` `email`i maskeliyordu
   * ama mesaj GÖVDESİNİ maskelemiyordu. Tek güvenilir koruma sırrı diff'e HİÇ
   * KOYMAMAK — yukarıdaki testlerin ölçtüğü şey bu. Aşağıdaki iki test ağın
   * SINIRINI sabitliyor ki "redaksiyon var, o hâlde güvendeyiz" varsayımı bir
   * daha kurulamasın.
   */
  it('emniyet ağı BİLİNEN adları gerçekten maskeliyor', () => {
    for (const ad of ['password', 'newPassword', 'currentPassword', 'passwordHash']) {
      expect(REDACTED_FIELD_NAMES as readonly string[]).toContain(ad);
      expect(JSON.stringify(redactAuditDiff({ [ad]: MEVCUT }))).not.toContain(MEVCUT);
    }
    // İç içe ve dizi içinde de çalışıyor.
    expect(JSON.stringify(redactAuditDiff({ after: { newPassword: MEVCUT } }))).not.toContain(
      MEVCUT,
    );
  });

  it('emniyet ağının SINIRI: farklı adlı anahtar MASKELENMİYOR', () => {
    // Bu test bir kusuru KUTLAMIYOR, sınırı KAYDEDİYOR. Ağ genelleştirilirse
    // burası kırılır ve yorum güncellenir.
    expect(JSON.stringify(redactAuditDiff({ yeniSifre: MEVCUT }))).toContain(MEVCUT);
    expect(JSON.stringify(redactAuditDiff({ not: `şifre: ${MEVCUT}` }))).toContain(MEVCUT);
  });
});

/* ===========================================================================
 * ADR-022 — BAŞARISIZ DENEME NEREYE YAZILIYOR
 * ======================================================================== */

describe('ADR-022 — başarısız deneme kaydı', () => {
  /**
   * `LoginAttempt`e YAZILMIYOR ve gerekçe ölçülebilir: o tablo §8.4 hız
   * sınırının veri kaynağı ve sayım IP başına. Şifre değiştirirken beş kez
   * yanlış yazmak kullanıcıyı KENDİ GİRİŞİNDEN 15 dakika kilitlerdi.
   *
   * T-015b'de kurulum hız sınırı için aynı karar verilmişti.
   */
  it('yanlış mevcut şifre `AuditLog`a LOGIN_FAILED + context ile yazılıyor', async () => {
    changePassword.mockResolvedValue({ ok: false, reason: 'INVALID_CURRENT_PASSWORD' });
    await (
      await eylem()
    )(GOVDE);

    expect(denetimKayitlari()).toHaveLength(1);
    expect(denetimKayitlari()[0]).toMatchObject({
      actorId: AKTOR,
      action: 'LOGIN_FAILED',
      entity: 'User',
      diff: { context: 'CHANGE_PASSWORD', reason: 'INVALID_CURRENT_PASSWORD' },
    });
  });

  it('geçersiz TOTP de kaydediliyor', async () => {
    changePassword.mockResolvedValue({ ok: false, reason: 'INVALID_TOTP' });
    await (
      await eylem()
    )({ ...GOVDE, totpCode: '000000' });

    expect(denetimKayitlari()[0]).toMatchObject({
      action: 'LOGIN_FAILED',
      diff: { reason: 'INVALID_TOTP' },
    });
  });

  it('ŞEMA hataları kaydedilmiyor — yazım hatası saldırı sinyali değil', async () => {
    const sonuc = await (
      await eylem()
    )({ ...GOVDE, newPassword: 'kisa', newPasswordConfirm: 'kisa' });

    expect(sonuc.ok).toBe(false);
    // Denetim kaydını gürültüyle doldurmazlar.
    expect(auditCreate).not.toHaveBeenCalled();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('SAME_PASSWORD ve TOTP_REQUIRED kaydedilmiyor — kimlik başarısızlığı değil', async () => {
    for (const reason of ['SAME_PASSWORD', 'TOTP_REQUIRED']) {
      auditCreate.mockClear();
      changePassword.mockResolvedValue({ ok: false, reason });
      await (
        await eylem()
      )(GOVDE);
      expect(auditCreate, `${reason} kaydedildi`).not.toHaveBeenCalled();
    }
  });
});

/* ===========================================================================
 * §7.2 HATA ZARFI — `fields` FORM ALAN ADLARIYLA BİREBİR
 * ======================================================================== */

describe('§7.2 hata zarfı', () => {
  const ESLEME = [
    ['INVALID_CURRENT_PASSWORD', 'VALIDATION_ERROR', 'currentPassword'],
    ['INVALID_TOTP', 'VALIDATION_ERROR', 'totpCode'],
    ['TOTP_REQUIRED', 'VALIDATION_ERROR', 'totpCode'],
    ['SAME_PASSWORD', 'VALIDATION_ERROR', 'newPassword'],
  ] as const;

  it.each(ESLEME)('%s → %s, fields.%s', async (reason, kod, alan) => {
    changePassword.mockResolvedValue({ ok: false, reason });
    const sonuc = await (await eylem())(GOVDE);

    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.code).toBe(kod);
    expect(sonuc.error.fields?.[alan]).toBeTruthy();
  });

  it('yanlış mevcut şifre UNAUTHORIZED DEĞİL — oturum geçerli', async () => {
    // `UNAUTHORIZED` dönmek Frontend'i kullanıcıyı giriş ekranına atmaya iterdi;
    // oysa yapması gereken tek şey alanı düzeltmek.
    changePassword.mockResolvedValue({ ok: false, reason: 'INVALID_CURRENT_PASSWORD' });
    const sonuc = await (await eylem())(GOVDE);

    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.code).not.toBe('UNAUTHORIZED');
  });

  it('kullanıcı kaydı yoksa NOT_FOUND', async () => {
    changePassword.mockResolvedValue({ ok: false, reason: 'USER_NOT_FOUND' });
    const sonuc = await (await eylem())(GOVDE);

    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.code).toBe('NOT_FOUND');
  });

  it('şema hatasının `fields` anahtarları FORM ALAN ADLARIYLA birebir', async () => {
    const sonuc = await (
      await eylem()
    )({
      currentPassword: '',
      newPassword: 'kisa',
      newPasswordConfirm: 'baska',
    });

    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(Object.keys(sonuc.error.fields ?? {})).toEqual(
      expect.arrayContaining(['currentPassword', 'newPassword']),
    );
  });

  it('beklenmeyen hata → INTERNAL_ERROR, ayrıntı SIZMIYOR', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    changePassword.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5433'));

    const sonuc = await (await eylem())(GOVDE);
    expect(JSON.stringify(sonuc)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(sonuc)).not.toContain(MEVCUT);
  });
});

/* ===========================================================================
 * ⚠️ DİĞER OTURUMLAR — TUTULAMAYACAK SÖZ VERİLMİYOR
 * ======================================================================== */

describe('diğer oturumlar kapanmıyor — sözleşme dürüstlüğü', () => {
  /**
   * ADR-013 JWT seçti: sunucuda oturum kaydı YOK, dağıtılmış jetonlar süreleri
   * dolana dek (7 gün, §8.3) geçerli kalır. Şifre değiştirmek ele geçirilmiş
   * bir oturumu KAPATMAZ.
   *
   * Bu test, yanıtın böyle bir iddia TAŞIMADIĞINI sabitliyor — T-034'ün "410"
   * dersi: tutulamayacak söz verilmez. Yanıta bir gün `sessionsRevoked: true`
   * benzeri bir alan eklenirse burası kırılır.
   */
  it('yanıt oturum sonlandırma İDDİASI taşımıyor', async () => {
    const sonuc = await (await eylem())(GOVDE);
    const ham = JSON.stringify(sonuc).toLowerCase();

    expect(sonuc).toEqual({ ok: true, data: null });
    for (const iddia of ['session', 'oturum', 'revoked', 'signedout', 'loggedout']) {
      expect(ham, `yanıt "${iddia}" iddiası taşıyor`).not.toContain(iddia);
    }
  });
});
