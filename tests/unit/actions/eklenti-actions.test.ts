import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * EKLENTİ SİLME EYLEMİ — §8.11, ADR-018.
 *
 * Yükleme ADR-044 ile route handler'a taşındı; testleri
 * `tests/unit/api/eklenti-yukleme.test.ts`te (içerik doğrulaması, yetim
 * nesne, §8.16 ve sunum kuralları dahil).
 */

const { authMock, writesRevokedMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  writesRevokedMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));

const { r2Mock } = vi.hoisted(() => ({
  r2Mock: {
    getObjectBytes: vi.fn(),
    deleteObjectQuietly: vi.fn().mockResolvedValue(true),
    SIGNED_PUT_TTL_SECONDS: 300,
    SIGNED_GET_TTL_SECONDS: 900,
  },
}));

vi.mock('@/server/storage/r2', () => r2Mock);

const { dbMock } = vi.hoisted(() => {
  const satir = {
    id: 'att_1',
    key: 'profile/singleton/rnd.png',
    mime: 'image/png',
    size: 95,
    width: 1,
    height: 1,
    entity: 'PROFILE',
    entityId: 'singleton',
    order: 0,
    createdAt: new Date('2026-10-14T12:00:00.000Z'),
  };

  return {
    dbMock: {
      attachment: {
        create: vi.fn().mockResolvedValue(satir),
        findUnique: vi.fn().mockResolvedValue(satir),
        delete: vi.fn().mockResolvedValue(satir),
        findMany: vi.fn().mockResolvedValue([satir]),
      },
      profile: {
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn().mockResolvedValue({ id: 'singleton' }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockResolvedValue(0),
      },
    },
  };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

const { revalidateTagMock } = vi.hoisted(() => ({ revalidateTagMock: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag: revalidateTagMock }));

const { deleteAttachmentAction } = await import('@/server/actions/attachment');

/** Geçerli, minik bir PNG (imza + IHDR 1×1). */
function gercekPng(): Buffer {
  const buf = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(1, 16);
  buf.writeUInt32BE(1, 20);
  return buf;
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: 'usr_1' }, tokenIssuedAt: 1_800_000_000 });
  writesRevokedMock.mockResolvedValue(false);
  r2Mock.getObjectBytes.mockResolvedValue(gercekPng());
  r2Mock.deleteObjectQuietly.mockResolvedValue(true);
  dbMock.auditLog.count.mockResolvedValue(0);
});

function yazilanDiff(): unknown {
  const cagri = dbMock.auditLog.create.mock.calls.at(-1);
  return (cagri?.[0] as { data: { diff: unknown } }).data.diff;
}

describe('yetki kapısı', () => {
  it('oturum YOKSA UNAUTHORIZED, silme denenmiyor', async () => {
    authMock.mockResolvedValue(null);
    const sonuc = await deleteAttachmentAction({ id: 'att_1' });
    expect(sonuc.ok === false && sonuc.error.code).toBe('UNAUTHORIZED');
    expect(dbMock.attachment.delete).not.toHaveBeenCalled();
  });

  it('YAZMA YETKİSİ İPTALLİYSE UNAUTHORIZED (ADR-035/B)', async () => {
    writesRevokedMock.mockResolvedValue(true);
    expect((await deleteAttachmentAction({ id: 'att_1' })).ok).toBe(false);
  });
});

describe('deleteAttachmentAction', () => {
  it('⚠️ SIRA: ÖNCE DB SATIRI, SONRA R2 NESNESİ', async () => {
    /*
     * Yüklemenin TERSİ, ve sebebi aynı mantık: başarısızlık penceresinde
     * kalan şey yine yetim nesne olsun, kırık referans olmasın.
     */
    const sonuc = await deleteAttachmentAction({ id: 'att_1' });

    expect(sonuc.ok).toBe(true);
    expect(dbMock.attachment.delete).toHaveBeenCalledOnce();
    expect(r2Mock.deleteObjectQuietly).toHaveBeenCalledWith('profile/singleton/rnd.png');

    const dbSira = dbMock.attachment.delete.mock.invocationCallOrder[0] ?? 0;
    const r2Sira = r2Mock.deleteObjectQuietly.mock.invocationCallOrder[0] ?? 0;
    expect(dbSira).toBeLessThan(r2Sira);
  });

  it('⚠️ KULLANIMDAysa (P2003) NESNEYE DOKUNULMUYOR', async () => {
    /*
     * `onDelete: Restrict` gerçek bir kapı: eklenti kapak/CV olarak bağlıysa
     * DB silmesi düşüyor. Silme sırası DB'yi öne aldığı için nesne SAĞLAM
     * kalıyor — ters sırada nesne silinmiş, satır kalmış olurdu.
     */
    dbMock.attachment.delete.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    );

    const sonuc = await deleteAttachmentAction({ id: 'att_1' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.message).toContain('kapak');
    expect(r2Mock.deleteObjectQuietly).not.toHaveBeenCalled();
  });

  it('⚠️ P2003 metni EKLENTİYE ÖZEL — "Seçilen dosya bulunamadı" DEĞİL', async () => {
    /*
     * T-050'de yazdığım varsayılan P2003 metni ("Seçilen dosya bulunamadı")
     * YANLIŞ YÖNÜ anlatıyor: orada eksik bir dosya seçilmişti, burada dosya
     * VAR ve KULLANILIYOR. `foreignKey` geçersiz kılması bu yüzden gerekli.
     */
    dbMock.attachment.delete.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    );
    const sonuc = await deleteAttachmentAction({ id: 'att_1' });

    expect(sonuc.ok === false && sonuc.error.message).not.toContain('bulunamadı');
  });

  it('kayıt yoksa NOT_FOUND, silme denenmiyor', async () => {
    dbMock.attachment.findUnique.mockResolvedValueOnce(null);
    const sonuc = await deleteAttachmentAction({ id: 'yok' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
    expect(dbMock.attachment.delete).not.toHaveBeenCalled();
    expect(r2Mock.deleteObjectQuietly).not.toHaveBeenCalled();
  });

  it('denetim kaydı silineni ANAHTARIYLA kaydediyor', async () => {
    await deleteAttachmentAction({ id: 'att_1' });
    const satir = dbMock.auditLog.create.mock.calls.at(-1)?.[0].data as { action: string };

    expect(satir.action).toBe('DELETE');
    expect(JSON.stringify(yazilanDiff())).toContain('profile/singleton/rnd.png');
  });
});

describe('⚠️ silme — sahibin public önbelleği düşürülüyor (ADR-029)', () => {
  it('profil fotoğrafı silinince `content:profile` düşüyor — ana sayfada kırık kare kalmasın', async () => {
    await deleteAttachmentAction({ id: 'att_1' });
    const etiketler = revalidateTagMock.mock.calls.map((c) => c[0] as string);
    expect(etiketler).toContain('content:profile');
  });
});
