import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toDiffSummary } from '@/server/services/audit-log';

/**
 * `HealthLog` SERVER ACTION'LARI — §8.20, ADR-034, T-110.
 *
 * ⚠️ BU DOSYANIN EN ÖNEMLİ BLOĞU "SAĞLIK DEĞERİ DENETİM KAYDINA GİRMİYOR":
 * T-100'de PARA için verdiğim karardan FARKLI, ve fark gerekçenin kendisinde —
 * orada adli değer vardı (üçüncü taraf, yükümlülük), burada yok; hassasiyet ise
 * daha yüksek.
 */

const { authMock, writesRevokedMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  writesRevokedMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));

const { dbMock } = vi.hoisted(() => {
  const dec = (v: string) => ({ toFixed: (n = 2) => Number(v).toFixed(n) });
  const satir = {
    id: 'hl_1',
    date: new Date('2026-10-14T00:00:00.000Z'),
    weightKg: dec('82.5'),
    bodyFatPct: dec('18.5'),
    sleepHours: dec('7.25'),
    waterMl: 2500,
    restingHr: 58,
    steps: 9000,
    mood: 4,
    note: 'Gizli sağlık notu',
    createdAt: new Date('2026-10-14T06:00:00.000Z'),
    updatedAt: new Date('2026-10-14T06:30:00.000Z'),
  };

  return {
    dbMock: {
      healthLog: {
        create: vi.fn().mockResolvedValue(satir),
        update: vi.fn().mockResolvedValue(satir),
        delete: vi.fn().mockResolvedValue(satir),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(satir),
      },
      auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    },
  };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

const { createHealthLogAction, deleteHealthLogAction, updateHealthLogAction } =
  await import('@/server/actions/health-log');

const GECERLI = {
  date: '2026-10-14',
  weightKg: '82.5',
  bodyFatPct: '18.5',
  sleepHours: '7.25',
  note: 'Gizli sağlık notu',
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: 'usr_1' }, tokenIssuedAt: 1_800_000_000 });
  writesRevokedMock.mockResolvedValue(false);
  dbMock.healthLog.findFirst.mockResolvedValue(null);
});

function yazilanDiff(): unknown {
  const cagri = dbMock.auditLog.create.mock.calls.at(-1);
  return (cagri?.[0] as { data: { diff: unknown } }).data.diff;
}

/* ===========================================================================
 * YETKİ
 * ======================================================================== */

describe('yetki kapısı', () => {
  const eylemler = [
    ['create', () => createHealthLogAction(GECERLI)],
    ['update', () => updateHealthLogAction({ id: 'hl_1', weightKg: '80.0' })],
    ['delete', () => deleteHealthLogAction({ id: 'hl_1' })],
  ] as const;

  it.each(eylemler)('%s — oturum YOKSA UNAUTHORIZED', async (_ad, cagir) => {
    authMock.mockResolvedValue(null);
    expect((await cagir()).ok).toBe(false);
    expect(dbMock.healthLog.create).not.toHaveBeenCalled();
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it.each(eylemler)('%s — YAZMA YETKİSİ İPTALLİYSE UNAUTHORIZED', async (_ad, cagir) => {
    writesRevokedMock.mockResolvedValue(true);
    expect((await cagir()).ok).toBe(false);
  });
});

/* ===========================================================================
 * ⚠️⚠️ SAĞLIK VERİSİ ↔ DENETİM KAYDI
 * ======================================================================== */

describe('⚠️ sağlık DEĞERLERİ denetim kaydına GİRMİYOR', () => {
  it('⚠️ kilo, vücut yağı, uyku — HİÇBİRİ diff`te YOK', async () => {
    /*
     * T-100'DEN FARKLI KARAR VE FARKIN SEBEBİ:
     *
     * Orada tutarı SATIRA yazmayı haklı çıkaran şey ADLİ DEĞERDİ — "kuru kim
     * çekti" sorusu, çünkü üçüncü taraf (müşteri, muhasebeci) ve bir
     * YÜKÜMLÜLÜK vardı.
     *
     * Burada o değer YOK: sistem tek kullanıcılı, "kilomu kim değiştirdi"nin
     * tek cevabı kullanıcının kendisi, ve "ne zaman" sorusunu
     * `HealthLog.updatedAt` zaten cevaplıyor. Sorumluluk yokken hassasiyet
     * daha yüksek: denetim kaydı §8.21 yedeğine giriyor VE T-052/T-053'ten
     * beri ekrana basılıyor.
     */
    await createHealthLogAction(GECERLI);
    const diff = JSON.stringify(yazilanDiff());

    for (const deger of ['82.5', '18.5', '7.25', '2500', '58', '9000']) {
      expect(diff, `${deger} denetim kaydına girdi`).not.toContain(deger);
    }
  });

  it('⚠️ `note` DE GİRMİYOR — serbest metin', async () => {
    // ADR-034'ün "masum anahtarın değerine gömülü sır" ölçümünün tarifi
    // (`Client.notes` ve `Transaction.description` ile aynı sınıf).
    await createHealthLogAction(GECERLI);
    expect(JSON.stringify(yazilanDiff())).not.toContain('Gizli sağlık notu');
  });

  it('GÜN ve DEĞİŞEN ALAN ADLARI yazılıyor — cevaplanabilen tek soru', async () => {
    await createHealthLogAction(GECERLI);
    const ozet = toDiffSummary(yazilanDiff());

    expect(ozet.fields.sort()).toEqual(['changed', 'day']);
    // `changed` beyaz listede (değeri bir ALAN ADI listesi), yani ekranda okunabilir.
    expect(ozet.values.changed).toBe('bodyFatPct, date, note, sleepHours, weightKg');
  });

  it('güncellemede de yalnızca DOKUNULAN alan adları', async () => {
    await updateHealthLogAction({ id: 'hl_1', weightKg: '80.0', mood: 3 });
    const ozet = toDiffSummary(yazilanDiff());

    expect(ozet.values.changed).toBe('mood, weightKg');
    expect(JSON.stringify(yazilanDiff())).not.toContain('80.0');
  });

  it('⚠️ SİLMEDE DE DEĞER YAZILMIYOR — içerik varlıklarından bilinçli sapma', async () => {
    /*
     * BULGU-019'da `skill`/`service` silmelerinde alanlar tek tek
     * yazılıyordu, çünkü silinen şey SİTE İÇERİĞİ ve "ne sildim" meşru bir
     * soru. Burada silinen şey bir VÜCUT ÖLÇÜMÜ: silinmiş bir kiloyu denetim
     * kaydında (ve yedeğinde) yaşatmak, silme niyetini doğrudan baltalardı.
     */
    await deleteHealthLogAction({ id: 'hl_1' });
    const diff = JSON.stringify(yazilanDiff());

    expect(diff).toContain('2026-10-14');
    expect(diff).not.toContain('82.5');
    expect(diff).not.toContain('Gizli sağlık notu');
    expect(toDiffSummary(yazilanDiff()).fields).toEqual(['day']);
  });

  it('eylem türleri doğru — CREATE / UPDATE / DELETE', async () => {
    await createHealthLogAction(GECERLI);
    expect(dbMock.auditLog.create.mock.calls.at(-1)?.[0].data.action).toBe('CREATE');

    await updateHealthLogAction({ id: 'hl_1', weightKg: '80.0' });
    expect(dbMock.auditLog.create.mock.calls.at(-1)?.[0].data.action).toBe('UPDATE');

    await deleteHealthLogAction({ id: 'hl_1' });
    expect(dbMock.auditLog.create.mock.calls.at(-1)?.[0].data.action).toBe('DELETE');
  });

  it('`entity` HealthLog — denetim ekranı süzebilsin', async () => {
    await createHealthLogAction(GECERLI);
    expect(dbMock.auditLog.create.mock.calls.at(-1)?.[0].data.entity).toBe('HealthLog');
  });
});

/* ===========================================================================
 * ⚠️ GÜNDE TEK KAYIT — iki katmanlı savunma
 * ======================================================================== */

describe('⚠️ günde tek kayıt (`date @unique`)', () => {
  it('ÖN KONTROL mevcut kaydın KİMLİĞİNİ veriyor', async () => {
    /*
     * T-038'in çift dönüşüm kalıbı: hata mesajı kullanıcının NE YAPACAĞINI
     * söylemeli. Ham P2002 "unique ihlali" der; kimlik "o günü düzenle" der.
     */
    dbMock.healthLog.findFirst.mockResolvedValue({ id: 'hl_mevcut' });

    const sonuc = await createHealthLogAction(GECERLI);
    expect(sonuc.ok === false && sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.ok === false && sonuc.error.fields?.existingId).toBe('hl_mevcut');
    expect(dbMock.healthLog.create).not.toHaveBeenCalled();
  });

  it('YARIŞTA P2002 da AYNI metni veriyor', async () => {
    // Ön kontrol ile yazma arasındaki yarışı yalnızca `@unique` kapatıyor.
    dbMock.healthLog.create.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    const sonuc = await createHealthLogAction(GECERLI);
    expect(sonuc.ok === false && sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.ok === false && sonuc.error.message).toContain('Günde yalnızca bir kayıt');
    // Varsayılan P2002 metni slug'a özeldi; burada anlamsız kalırdı.
    expect(sonuc.ok === false && sonuc.error.message).not.toContain('slug');
  });

  it('GÜNCELLEMEDE tarih çakışması da CONFLICT', async () => {
    dbMock.healthLog.update.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    const sonuc = await updateHealthLogAction({ id: 'hl_1', date: '2026-10-15' });
    expect(sonuc.ok === false && sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.ok === false && sonuc.error.fields?.date).toBeTruthy();
  });

  it('ÖN KONTROL geçerse kayıt yazılıyor', async () => {
    const sonuc = await createHealthLogAction(GECERLI);
    expect(sonuc.ok).toBe(true);
    expect(dbMock.healthLog.create).toHaveBeenCalledOnce();
  });
});

/* ===========================================================================
 * DOĞRULAMA VE HATA YOLLARI
 * ======================================================================== */

describe('doğrulama ve hatalar', () => {
  it('geçersiz girdi şemada reddediliyor — servis çağrılmıyor', async () => {
    const sonuc = await createHealthLogAction({ date: '2026-10-14', mood: 9 });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.fields?.mood).toBeTruthy();
    expect(dbMock.healthLog.create).not.toHaveBeenCalled();
  });

  it('saat taşıyan tarih reddediliyor (ADR-016)', async () => {
    const sonuc = await createHealthLogAction({ date: '2026-10-14T10:00:00Z' });
    expect(sonuc.ok === false && sonuc.error.fields?.date).toBeTruthy();
  });

  it('kayıt yoksa P2025 → NOT_FOUND', async () => {
    dbMock.healthLog.update.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'P2025' }),
    );
    const sonuc = await updateHealthLogAction({ id: 'yok', weightKg: '80.0' });
    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
  });

  it('bilinmeyen hata INTERNAL_ERROR — sessizce başarı dönmüyor', async () => {
    dbMock.healthLog.create.mockRejectedValueOnce(new Error('beklenmedik'));
    const sonuc = await createHealthLogAction(GECERLI);
    expect(sonuc.ok === false && sonuc.error.code).toBe('INTERNAL_ERROR');
  });
});
