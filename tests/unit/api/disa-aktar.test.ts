import { beforeEach, describe, expect, it, vi } from 'vitest';

import { csv, ondalik } from '@/server/services/disa-aktar';

/** Tek hücrenin CSV karşılığı — `csv()` üzerinden (başlık satırı + BOM atılır). */
const hucre = (d: string | number | boolean | null) => csv(['x'], [[d]]).split('\r\n')[1];

const { authMock, writesRevokedMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  writesRevokedMock: vi.fn(),
  dbMock: {
    healthLog: { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));
vi.mock('@/server/db', () => ({ db: dbMock }));

const { GET } = await import('@/app/api/v1/panel/disa-aktar/route');
const istek = (tur: string) => new Request(`http://yerel/api/v1/panel/disa-aktar?tur=${tur}`);

describe('CSV — Excel Türkçe (2026-10-31)', () => {
  it('ayırıcı, tırnak ve satır sonu kaçışlanır', () => {
    expect(hucre('Market; Migros')).toBe('"Market; Migros"');
    expect(hucre('5 "büyük" kutu')).toBe('"5 ""büyük"" kutu"');
    expect(hucre(null)).toBe('');
    expect(hucre(true)).toBe('evet');
  });

  it('⚠️ formül enjeksiyonu etkisizleşir, eksi sayı dokunulmaz', () => {
    expect(hucre('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(hucre('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(hucre('-1250,50')).toBe('-1250,50');
  });

  it('BOM + ; + CRLF, virgüllü ondalık', () => {
    expect(ondalik('1250.50')).toBe('1250,50');
    expect(csv(['Ad', 'Tutar'], [['Kira', '8000,00']])).toBe('﻿Ad;Tutar\r\nKira;8000,00\r\n');
  });
});

describe('GET /api/v1/panel/disa-aktar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writesRevokedMock.mockResolvedValue(false);
  });

  it('oturum yoksa 401, veri okunmaz', async () => {
    authMock.mockResolvedValue(null);
    const yanit = await GET(istek('saglik'));
    expect(yanit.status).toBe(401);
    expect(dbMock.healthLog.findMany).not.toHaveBeenCalled();
  });

  it('bilinmeyen tür 400', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' }, tokenIssuedAt: 2_000_000_000 });
    expect((await GET(istek('sifreler'))).status).toBe(400);
  });

  it('indirme: CSV başlıkları, önbellek yok, EXPORT denetimi', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' }, tokenIssuedAt: 2_000_000_000 });
    dbMock.healthLog.findMany.mockResolvedValue([]);
    const yanit = await GET(istek('saglik'));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(yanit.headers.get('cache-control')).toBe('no-store');
    expect(yanit.headers.get('content-disposition')).toMatch(
      /^attachment; filename="saglik-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    // `text()` BOM'u atar — ham baytlara bakılır: EF BB BF = UTF-8 BOM.
    const bayt = new Uint8Array(await yanit.arrayBuffer());
    expect([...bayt.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bayt).startsWith('Gün;Kilo')).toBe(true);
    expect(dbMock.auditLog.create.mock.calls[0]?.[0].data).toMatchObject({
      action: 'EXPORT',
      entity: 'DisaAktar',
      entityId: 'saglik',
    });
  });
});
