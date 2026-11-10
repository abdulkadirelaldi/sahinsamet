import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * TAKVİM EYLEMLERİ (2026-11-10) — yetki, doğrulama, hata eşleme ve ⚠️ denetim kaydına içerik
 * (başlık, konum, açıklama) GİRMEMESİ: "Diş hekimi · Kadıköy" sağlık verisi olabilir.
 */

const { authMock, writesRevokedMock, servis } = vi.hoisted(() => ({
  authMock: vi.fn(),
  writesRevokedMock: vi.fn(),
  servis: {
    takvimEtkinligiOlustur: vi.fn(),
    takvimEtkinligiGuncelle: vi.fn(),
    takvimEtkinligiSil: vi.fn(),
  },
}));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));

const { dbMock } = vi.hoisted(() => ({
  dbMock: { auditLog: { create: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock('@/server/db', () => ({ db: dbMock }));

vi.mock('@/server/services/takvim', async (gercek) => ({
  ...(await gercek<typeof import('@/server/services/takvim')>()),
  ...servis,
}));

const { TakvimHatasi } = await import('@/server/services/takvim');
const { takvimEtkinligiGuncelleAction, takvimEtkinligiOlusturAction, takvimEtkinligiSilAction } =
  await import('@/server/actions/takvim');

const ID = 'ckabcdefghijklmnopqrstuv';
const GIRDI = {
  baslik: 'Diş hekimi',
  aciklama: 'Kanal tedavisi',
  konum: 'Kadıköy',
  kategori: 'SAGLIK',
  tumGun: false,
  baslangicGun: '2026-11-10',
  baslangicSaat: '14:30',
  bitisGun: '2026-11-10',
  bitisSaat: '15:30',
  tekrar: { tur: 'YOK', aralik: 1, gunler: [], bitisGun: null, sayi: null },
  hatirlatmalar: [30],
};
const KAPSAM = { id: ID, kapsam: 'tek', olusumGun: '2026-11-10' };

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: 'usr_1' }, tokenIssuedAt: 1_800_000_000 });
  writesRevokedMock.mockResolvedValue(false);
  servis.takvimEtkinligiOlustur.mockResolvedValue({ id: 'yeni' });
  servis.takvimEtkinligiGuncelle.mockResolvedValue({ id: 'yeni' });
  servis.takvimEtkinligiSil.mockResolvedValue({ id: ID });
});

const eylemler = [
  ['olustur', () => takvimEtkinligiOlusturAction(GIRDI)],
  ['guncelle', () => takvimEtkinligiGuncelleAction({ ...GIRDI, ...KAPSAM })],
  ['sil', () => takvimEtkinligiSilAction(KAPSAM)],
] as const;

describe('yetki kapısı', () => {
  it.each(eylemler)('%s — oturum yoksa yazma yok', async (_ad, cagir) => {
    authMock.mockResolvedValue(null);
    const sonuc = await cagir();
    expect(sonuc.ok).toBe(false);
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
    expect(servis.takvimEtkinligiOlustur).not.toHaveBeenCalled();
  });

  it.each(eylemler)('%s — yazma yetkisi iptalliyse reddedilir', async (_ad, cagir) => {
    writesRevokedMock.mockResolvedValue(true);
    expect((await cagir()).ok).toBe(false);
  });
});

describe('doğrulama', () => {
  it('bitiş başlangıçtan önceyse servis çağrılmaz, alan hatası döner', async () => {
    const sonuc = await takvimEtkinligiOlusturAction({ ...GIRDI, bitisSaat: '14:00' });
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.error.fields?.bitisSaat).toBeTruthy();
    expect(servis.takvimEtkinligiOlustur).not.toHaveBeenCalled();
  });

  it('bilinmeyen kapsam reddedilir', async () => {
    expect((await takvimEtkinligiSilAction({ ...KAPSAM, kapsam: 'hepsi' })).ok).toBe(false);
  });
});

describe('⚠️ denetim kaydına içerik GİRMİYOR', () => {
  it.each(eylemler)('%s — başlık, konum, açıklama yok; kayıt var', async (_ad, cagir) => {
    const sonuc = await cagir();
    expect(sonuc.ok).toBe(true);
    const kayit = dbMock.auditLog.create.mock.calls.at(-1)?.[0] as {
      data: { entity: string; diff: unknown };
    };
    expect(kayit.data.entity).toBe('TakvimEtkinligi');
    const metin = JSON.stringify(kayit.data.diff);
    for (const gizli of ['Diş hekimi', 'Kadıköy', 'Kanal']) expect(metin).not.toContain(gizli);
  });
});

describe('hata eşleme', () => {
  it('servis hatası kullanıcıya düzeltici mesaj olarak döner', async () => {
    servis.takvimEtkinligiGuncelle.mockRejectedValue(new TakvimHatasi('Etkinlik bulunamadı.'));
    const sonuc = await takvimEtkinligiGuncelleAction({ ...GIRDI, ...KAPSAM });
    expect(sonuc).toEqual({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Etkinlik bulunamadı.' },
    });
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('beklenmeyen hata iç hata olur, ayrıntı sızmaz', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    servis.takvimEtkinligiSil.mockRejectedValue(new Error('pg: bağlantı koptu'));
    const sonuc = await takvimEtkinligiSilAction(KAPSAM);
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) {
      expect(sonuc.error.code).toBe('INTERNAL_ERROR');
      expect(sonuc.error.message).not.toContain('pg');
    }
  });
});
