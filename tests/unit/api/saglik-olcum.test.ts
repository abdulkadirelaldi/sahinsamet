import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createHash } from 'node:crypto';

import { olcumSchema } from '@/server/services/saglik-baglantisi';

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    saglikBaglantisi: { findUnique: vi.fn(), update: vi.fn() },
    healthLog: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('@/server/auth/credentials', () => ({ extractClientIp: () => '1.2.3.4' }));

const { POST } = await import('@/app/api/v1/saglik/olcum/route');

const ANAHTAR = 'aesk_gecerli';
const anahtarOzeti = (a: string) => createHash('sha256').update(a, 'utf8').digest('hex');
const istek = (govde: unknown, anahtar: string | null = ANAHTAR) =>
  new Request('http://yerel/api/v1/saglik/olcum', {
    method: 'POST',
    headers: anahtar ? { authorization: `Bearer ${anahtar}` } : {},
    body: typeof govde === 'string' ? govde : JSON.stringify(govde),
  });

describe('POST /api/v1/saglik/olcum (2026-11-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.saglikBaglantisi.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(where.anahtarOzeti === anahtarOzeti(ANAHTAR) ? { userId: 'u1' } : null),
    );
    dbMock.healthLog.findUnique.mockResolvedValue(null);
    dbMock.healthLog.create.mockResolvedValue({ id: 'k', weightKg: null, waterMl: null });
  });

  it('⚠️ anahtar yok ya da yanlış: 401, hiçbir şey yazılmaz', async () => {
    expect((await POST(istek({ adim: 1 }, null))).status).toBe(401);
    expect((await POST(istek({ adim: 1 }, 'aesk_yanlis'))).status).toBe(401);
    expect(dbMock.healthLog.create).not.toHaveBeenCalled();
  });

  it('veritabanında düz anahtar değil ÖZET aranır', async () => {
    await POST(istek({ adim: 1 }));
    expect(dbMock.saglikBaglantisi.findUnique.mock.calls[0]?.[0].where.anahtarOzeti).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it('yalnızca gönderilen alanlar yazılır; virgüllü metin okunur', async () => {
    const y = await POST(istek({ adim: '8.432,6', uyku: '7,5' }));
    expect(y.status).toBe(200);
    const { data } = dbMock.healthLog.create.mock.calls[0]?.[0];
    expect(data).toMatchObject({ steps: 8433, sleepHours: '7.50' });
    expect(data).not.toHaveProperty('restingHr');
    expect(data).not.toHaveProperty('weightKg');
  });

  it('bozuk JSON, boş gövde, aralık dışı: 400; çok büyük: 413', async () => {
    expect((await POST(istek('{bozuk'))).status).toBe(400);
    expect((await POST(istek({}))).status).toBe(400);
    expect((await POST(istek({ nabiz: 999 }))).status).toBe(400);
    expect((await POST(istek({ adim: 1, x: 'a'.repeat(3000) }))).status).toBe(413);
  });
});

describe('olcumSchema', () => {
  it('Türkçe sayı biçimleri', () => {
    expect(olcumSchema.parse({ uyku: '7,5' }).uyku).toBe(7.5);
    expect(olcumSchema.parse({ adim: '8.432,5' }).adim).toBe(8432.5);
    // ⚠️ Binlik ayırıcı: 8 adım değil, 8432.
    expect(olcumSchema.parse({ adim: '8.432' }).adim).toBe(8432);
    expect(olcumSchema.parse({ uyku: '7.5' }).uyku).toBe(7.5);
    expect(olcumSchema.parse({ adim: ' 12 ' }).adim).toBe(12);
    expect(olcumSchema.parse({ nabiz: 58 }).nabiz).toBe(58);
    expect(olcumSchema.safeParse({ adim: 'abc' }).success).toBe(false);
  });

  it('en az bir ölçü şart', () => {
    expect(olcumSchema.safeParse({ gun: '2026-11-01' }).success).toBe(false);
  });
});
