import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * EKLENTİ YÜKLEME VE SUNUM — §8.11, §8.16, ADR-018, ADR-044.
 *
 * ⚠️ EN ÖNEMLİ ÜÇ BLOK:
 *   1. "DOĞRULAMA YAZMADAN ÖNCE" — geçersiz bayt R2'ye HİÇ yazılmıyor. T-037'de
 *      doğrulama yazmadan SONRAYDI (tarayıcı önce R2'ye PUT ediyordu).
 *   2. "YETİM NESNE" — DB yazımı düşerse nesne HEMEN siliniyor; telafi de
 *      düşerse asıl hata maskelenmiyor.
 *   3. "SUNUM — VARSAYILAN REDDET" — makbuz oturumsuz 404 alıyor (var
 *      olduğunu da söylemiyor); profil fotoğrafı herkese açık ve kalıcı önbellekli.
 */

const { authMock, writesRevokedMock, r2Mock, dbMock, revalidateTagMock } = vi.hoisted(() => {
  const satir = {
    id: 'ckattachment0000000000001',
    key: 'profile/singleton/rnd.png',
    mime: 'image/png',
    size: 24,
    width: 1,
    height: 1,
    entity: 'PROFILE',
    entityId: 'singleton',
    order: 0,
    createdAt: new Date('2026-10-14T12:00:00.000Z'),
  };
  return {
    revalidateTagMock: vi.fn(),
    authMock: vi.fn(),
    writesRevokedMock: vi.fn(),
    r2Mock: {
      putObject: vi.fn(),
      getObjectBytes: vi.fn(),
      deleteObjectQuietly: vi.fn(),
    },
    dbMock: {
      attachment: {
        create: vi.fn().mockResolvedValue(satir),
        findUnique: vi.fn(),
      },
      profile: { count: vi.fn(), findUnique: vi.fn() },
      auditLog: { create: vi.fn(), count: vi.fn() },
    },
  };
});

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));
vi.mock('@/server/storage/r2', () => r2Mock);
vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('next/cache', () => ({ revalidateTag: revalidateTagMock }));

const { POST } = await import('@/app/api/v1/panel/eklenti/route');
const { GET } = await import('@/app/api/v1/dosya/[id]/route');

const PROFIL = 'singleton';
const DOSYA_ID = 'ckattachment0000000000001';

/** Geçerli, minik bir PNG (imza + IHDR 1×1). */
function png(): Uint8Array<ArrayBuffer> {
  const buf = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(1, 16);
  buf.writeUInt32BE(1, 20);
  return Uint8Array.from(buf);
}

function yukle(
  icerik: Uint8Array<ArrayBuffer> | string = png(),
  alanlar: Record<string, string> = { entity: 'PROFILE', entityId: PROFIL },
): Promise<Response> {
  const form = new FormData();
  form.set('dosya', new File([icerik], 'resim.png', { type: 'image/png' }));
  for (const [k, v] of Object.entries(alanlar)) form.set(k, v);
  return POST(new Request('http://yerel/api/v1/panel/eklenti', { method: 'POST', body: form }));
}

const sun = (headers: Record<string, string> = {}) =>
  GET(new Request(`http://yerel/api/v1/dosya/${DOSYA_ID}`, { headers }), {
    params: Promise.resolve({ id: DOSYA_ID }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: 'usr_1' }, tokenIssuedAt: 1_800_000_000 });
  writesRevokedMock.mockResolvedValue(false);
  r2Mock.putObject.mockResolvedValue(undefined);
  r2Mock.deleteObjectQuietly.mockResolvedValue(true);
  r2Mock.getObjectBytes.mockResolvedValue(Buffer.from(png()));
  dbMock.profile.count.mockResolvedValue(1);
  dbMock.profile.findUnique.mockResolvedValue({ id: PROFIL });
  dbMock.auditLog.count.mockResolvedValue(0);
  dbMock.auditLog.create.mockResolvedValue(undefined);
  dbMock.attachment.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: DOSYA_ID,
    createdAt: new Date('2026-10-14T12:00:00.000Z'),
    ...args.data,
  }));
});

function sonDenetimDiff(): Record<string, unknown> {
  const cagri = dbMock.auditLog.create.mock.calls.at(-1);
  return (cagri?.[0] as { data: { diff: Record<string, unknown> } }).data.diff;
}

/* ===========================================================================
 * YÜKLEME — yetki
 * ======================================================================== */

describe('yükleme — yetki (§8.6, ADR-035/B)', () => {
  it('oturum YOKSA 401 ve R2`ye dokunulmuyor', async () => {
    authMock.mockResolvedValue(null);
    expect((await yukle()).status).toBe(401);
    expect(r2Mock.putObject).not.toHaveBeenCalled();
  });

  it('yazma yetkisi İPTALLİYSE 401', async () => {
    writesRevokedMock.mockResolvedValue(true);
    expect((await yukle()).status).toBe(401);
  });
});

/* ===========================================================================
 * YÜKLEME — doğrulama YAZMADAN ÖNCE
 * ======================================================================== */

describe('⚠️ yükleme — doğrulama YAZMADAN ÖNCE', () => {
  it('geçerli PNG: 201, tip/boyut/ölçü/sağlama SUNUCUDA, anahtar sunucuda', async () => {
    const yanit = await yukle();
    expect(yanit.status).toBe(201);

    const veri = dbMock.attachment.create.mock.calls[0]?.[0].data;
    expect(veri.mime).toBe('image/png');
    expect(veri.size).toBe(24);
    expect([veri.width, veri.height]).toEqual([1, 1]);
    expect(veri.checksum).toMatch(/^[a-f0-9]{64}$/);
    // İstemcinin dosya adı ANAHTARA GİRMİYOR.
    expect(veri.key).toMatch(new RegExp(`^profile/${PROFIL}/[0-9a-f-]{36}\\.png$`));
    expect(veri.key).not.toContain('resim');
    expect(r2Mock.putObject).toHaveBeenCalledWith(
      veri.key,
      expect.any(Buffer),
      'image/png',
      undefined,
    );
  });

  it('⚠️ "image/png" diyen METİN 422 — ve R2`ye HİÇ YAZILMIYOR', async () => {
    const yanit = await yukle('<script>alert(1)</script>');
    expect(yanit.status).toBe(422);
    expect(r2Mock.putObject).not.toHaveBeenCalled();
    expect(dbMock.attachment.create).not.toHaveBeenCalled();
  });

  it('⚠️ SVG reddediliyor (ADR-043)', async () => {
    expect((await yukle('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).status).toBe(422);
  });

  it('boş dosya 422', async () => {
    expect((await yukle(new Uint8Array(0))).status).toBe(422);
  });

  it('⚠️ 10 MB üstü — `Content-Length` gövdeyi OKUMADAN 413 veriyor', async () => {
    const yanit = await POST(
      new Request('http://yerel/api/v1/panel/eklenti', {
        method: 'POST',
        headers: { 'content-length': String(11 * 1024 * 1024) },
        body: 'x',
      }),
    );
    expect(yanit.status).toBe(413);
    expect(dbMock.auditLog.count).not.toHaveBeenCalled();
  });

  it('⚠️ HEDEF KAYIT YOKSA 422 — ADR-018 uygulama katmanı bütünlüğü', async () => {
    dbMock.profile.count.mockResolvedValue(0);
    expect((await yukle()).status).toBe(422);
    expect(r2Mock.putObject).not.toHaveBeenCalled();
  });

  it('geçersiz tür şemada reddediliyor (kimliğin kapısı hedef kontrolü — yukarıda)', async () => {
    expect((await yukle(png(), { entity: 'USER', entityId: PROFIL })).status).toBe(422);
  });

  it('dosya alanı yoksa 422', async () => {
    const form = new FormData();
    form.set('entity', 'PROFILE');
    form.set('entityId', PROFIL);
    const yanit = await POST(new Request('http://yerel/x', { method: 'POST', body: form }));
    expect(yanit.status).toBe(422);
  });
});

/* ===========================================================================
 * YÜKLEME — yetim nesne
 * ======================================================================== */

describe('⚠️ yükleme — yetim nesne', () => {
  it('DB yazımı düşerse nesne HEMEN siliniyor ve 500', async () => {
    dbMock.attachment.create.mockRejectedValue(new Error('db düştü'));
    expect((await yukle()).status).toBe(500);
    expect(r2Mock.deleteObjectQuietly).toHaveBeenCalledTimes(1);
  });

  it('başarılı yolda nesne SİLİNMİYOR', async () => {
    await yukle();
    expect(r2Mock.deleteObjectQuietly).not.toHaveBeenCalled();
  });

  it('⚠️ denetim kaydı ANAHTAR taşıyor, SAĞLAMA TOPLAMI taşımıyor', async () => {
    await yukle();
    const diff = sonDenetimDiff();
    expect(diff.key).toMatch(/^profile\//);
    expect(diff.targetEntity).toBe('PROFILE');
    expect(JSON.stringify(diff)).not.toMatch(/[a-f0-9]{64}/);
  });
});

/* ===========================================================================
 * YÜKLEME — sahibin public önbelleği (ADR-029, `cached.ts` uyarısı)
 * ======================================================================== */

describe('⚠️ yükleme — sahibin önbelleği düşürülüyor', () => {
  it('profil fotoğrafı → `content:profile` etiketi düşüyor (ana sayfa girdisi)', async () => {
    await yukle();
    const etiketler = revalidateTagMock.mock.calls.map((c) => c[0]);
    expect(etiketler).toContain('content:profile');
  });

  it('başarısız yüklemede etiket DÜŞÜRÜLMÜYOR', async () => {
    await yukle('düz metin');
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * YÜKLEME — §8.16 hız sınırı
 * ======================================================================== */

describe('§8.16 — dakikada 10 yükleme', () => {
  it('⚠️ 10. çağrıda 429 — R2`ye yazılmıyor, sayaca da YAZILMIYOR', async () => {
    dbMock.auditLog.count.mockResolvedValue(10);
    expect((await yukle()).status).toBe(429);
    expect(r2Mock.putObject).not.toHaveBeenCalled();
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('sınırın altında çağrı sayaca `UPLOAD` bağlamıyla yazılıyor; sayım aktöre ve 60 sn`ye bağlı', async () => {
    dbMock.auditLog.count.mockResolvedValue(9);
    const once = Date.now();
    expect((await yukle()).status).toBe(201);

    const yazilan = dbMock.auditLog.create.mock.calls.map(
      (c) => (c[0] as { data: { diff: unknown } }).data.diff,
    );
    expect(yazilan).toContainEqual({ context: 'UPLOAD' });

    const where = dbMock.auditLog.count.mock.calls[0]?.[0].where;
    expect(where.actorId).toBe('usr_1');
    expect(where.diff).toEqual({ path: ['context'], equals: 'UPLOAD' });
    const fark = once - (where.createdAt.gte as Date).getTime();
    expect(fark).toBeGreaterThan(59_000);
    expect(fark).toBeLessThan(61_000);
  });
});

/* ===========================================================================
 * SUNUM — varsayılan reddet
 * ======================================================================== */

function dosyaVar(entity: string) {
  dbMock.attachment.findUnique.mockResolvedValue({
    key: 'k/1.png',
    mime: 'image/png',
    size: 24,
    checksum: 'a'.repeat(64),
    entity,
    entityId: 'ckentity00000000000000001',
  });
}

describe('⚠️ sunum — kim görebilir', () => {
  it('PROFİL fotoğrafı OTURUMSUZ 200, kalıcı ve herkese açık önbellek', async () => {
    authMock.mockResolvedValue(null);
    dosyaVar('PROFILE');
    const yanit = await sun();

    expect(yanit.status).toBe(200);
    expect(yanit.headers.get('content-type')).toBe('image/png');
    expect(yanit.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await yanit.arrayBuffer())).toEqual(png());
  });

  /*
   * Kişisel (herkese açık listede OLMAYAN) her eklenti türü oturuma bağlı.
   * 2026-10-29'a kadar örnekler TRANSACTION/JOB idi; o türler modülleriyle
   * silindi. Mekanizma türden bağımsız — `OZEL` public listede olmayan bir tür.
   */
  it('⚠️ kişisel eklenti OTURUMSUZ 404 — 401 DEĞİL (varlığını da söylemiyor) ve R2 OKUNMUYOR', async () => {
    authMock.mockResolvedValue(null);
    dosyaVar('OZEL');
    expect((await sun()).status).toBe(404);
    expect(r2Mock.getObjectBytes).not.toHaveBeenCalled();
  });

  it('kişisel eklenti OTURUMLA 200 ama `private, no-store` ve noindex', async () => {
    dosyaVar('OZEL');
    const yanit = await sun();
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get('cache-control')).toBe('private, no-store');
    expect(yanit.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('ETag eşleşirse 304 — R2 OKUNMUYOR', async () => {
    dosyaVar('PROFILE');
    const yanit = await sun({ 'if-none-match': `"${'a'.repeat(64)}"` });
    expect(yanit.status).toBe(304);
    expect(r2Mock.getObjectBytes).not.toHaveBeenCalled();
  });

  it('bilinmeyen ya da biçimsiz kimlik 404', async () => {
    dbMock.attachment.findUnique.mockResolvedValue(null);
    expect((await sun()).status).toBe(404);

    const yanit = await GET(new Request('http://yerel/api/v1/dosya/..%2Fetc'), {
      params: Promise.resolve({ id: '../etc' }),
    });
    expect(yanit.status).toBe(404);
    expect(dbMock.attachment.findUnique).toHaveBeenCalledTimes(1);
  });
});
