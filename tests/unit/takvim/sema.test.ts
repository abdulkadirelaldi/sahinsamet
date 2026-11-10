import { describe, expect, it } from 'vitest';

import {
  takvimEtkinligiSchema,
  takvimGuncelleSchema,
  takvimSilSchema,
  takvimTekrarSchema,
} from '@/lib/schemas';

const TEKRAR = { tur: 'YOK', aralik: 1, gunler: [], bitisGun: null, sayi: null };
const GECERLI = {
  baslik: '  Diş hekimi ',
  aciklama: '',
  konum: 'Kadıköy',
  kategori: 'SAGLIK',
  tumGun: false,
  baslangicGun: '2026-11-10',
  baslangicSaat: '14:30',
  bitisGun: '2026-11-10',
  bitisSaat: '15:30',
  tekrar: TEKRAR,
  hatirlatmalar: [30, 10, 30],
};
const ID = 'clx0000000000000000000001';

const alanlar = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  (r.error?.issues ?? []).map((i) => i.path.join('.'));

describe('takvimEtkinligiSchema', () => {
  it('geçerli etkinlik: başlık kırpılır, boş açıklama null, hatırlatmalar tekil ve sıralı', () => {
    const v = takvimEtkinligiSchema.parse(GECERLI);
    expect(v.baslik).toBe('Diş hekimi');
    expect(v.aciklama).toBeNull();
    expect(v.hatirlatmalar).toEqual([10, 30]);
  });

  it('başlık zorunlu, 120 karakter sınırı', () => {
    expect(alanlar(takvimEtkinligiSchema.safeParse({ ...GECERLI, baslik: '  ' }))).toContain(
      'baslik',
    );
    expect(takvimEtkinligiSchema.safeParse({ ...GECERLI, baslik: 'x'.repeat(121) }).success).toBe(
      false,
    );
  });

  it('⚠️ bitiş başlangıçtan önce olamaz — saat ve gün', () => {
    expect(alanlar(takvimEtkinligiSchema.safeParse({ ...GECERLI, bitisSaat: '14:00' }))).toEqual([
      'bitisSaat',
    ]);
    expect(
      alanlar(takvimEtkinligiSchema.safeParse({ ...GECERLI, bitisGun: '2026-11-09' })),
    ).toEqual(['bitisGun']);
    // Aynı an geçerli (süresiz hatırlatıcı).
    expect(takvimEtkinligiSchema.safeParse({ ...GECERLI, bitisSaat: '14:30' }).success).toBe(true);
  });

  it('tüm günde saat yok sayılır: aynı gün geçerli', () => {
    expect(
      takvimEtkinligiSchema.safeParse({ ...GECERLI, tumGun: true, bitisSaat: '00:00' }).success,
    ).toBe(true);
  });

  it('saat ve gün biçimi', () => {
    expect(takvimEtkinligiSchema.safeParse({ ...GECERLI, baslangicSaat: '24:00' }).success).toBe(
      false,
    );
    expect(
      takvimEtkinligiSchema.safeParse({ ...GECERLI, baslangicGun: '2026-02-30' }).success,
    ).toBe(false);
  });

  it('en çok 5 hatırlatma, en uzun 4 hafta', () => {
    expect(
      takvimEtkinligiSchema.safeParse({ ...GECERLI, hatirlatmalar: [0, 5, 10, 15, 30, 60] })
        .success,
    ).toBe(false);
    expect(
      takvimEtkinligiSchema.safeParse({ ...GECERLI, hatirlatmalar: [0, 5, 10, 15, 30, 30] })
        .success,
    ).toBe(true);
    expect(takvimEtkinligiSchema.safeParse({ ...GECERLI, hatirlatmalar: [40321] }).success).toBe(
      false,
    );
    expect(takvimEtkinligiSchema.safeParse({ ...GECERLI, hatirlatmalar: [-5] }).success).toBe(
      false,
    );
  });

  it('süre tavanı: tekrarlamayan bir yıl, tekrarlayan 31 gün', () => {
    expect(takvimEtkinligiSchema.safeParse({ ...GECERLI, bitisGun: '2027-11-12' }).success).toBe(
      false,
    );
    expect(
      takvimEtkinligiSchema.safeParse({
        ...GECERLI,
        bitisGun: '2026-12-20',
        tekrar: { ...TEKRAR, tur: 'AYLIK' },
      }).success,
    ).toBe(false);
  });

  it('bilinmeyen kategori reddedilir', () => {
    expect(takvimEtkinligiSchema.safeParse({ ...GECERLI, kategori: 'TATIL' }).success).toBe(false);
  });

  it('haftalık ve gün seçilmediyse başlangıcın günü (salı = 2)', () => {
    const v = takvimEtkinligiSchema.parse({
      ...GECERLI,
      tekrar: { ...TEKRAR, tur: 'HAFTALIK' },
    });
    expect(v.tekrar.gunler).toEqual([2]);
  });

  it('tekrarın bitişi başlangıçtan önce olamaz', () => {
    expect(
      alanlar(
        takvimEtkinligiSchema.safeParse({
          ...GECERLI,
          tekrar: { ...TEKRAR, tur: 'GUNLUK', bitisGun: '2026-11-01' },
        }),
      ),
    ).toEqual(['tekrar.bitisGun']);
  });
});

describe('takvimTekrarSchema', () => {
  it('aralık 1–99, sayı 1–730, günler 1–7 tekil sıralı', () => {
    expect(takvimTekrarSchema.safeParse({ ...TEKRAR, aralik: 0 }).success).toBe(false);
    expect(takvimTekrarSchema.safeParse({ ...TEKRAR, aralik: 100 }).success).toBe(false);
    expect(takvimTekrarSchema.safeParse({ ...TEKRAR, sayi: 731 }).success).toBe(false);
    expect(takvimTekrarSchema.safeParse({ ...TEKRAR, gunler: [8] }).success).toBe(false);
    expect(takvimTekrarSchema.parse({ ...TEKRAR, gunler: [5, 1, 5] }).gunler).toEqual([1, 5]);
  });

  it('bitiş tarihi VE sayı birlikte olamaz', () => {
    expect(
      takvimTekrarSchema.safeParse({ ...TEKRAR, bitisGun: '2027-01-01', sayi: 3 }).success,
    ).toBe(false);
  });
});

describe('güncelleme ve silme', () => {
  it('güncelleme kimlik, kapsam ve oluşum günü ister', () => {
    expect(
      takvimGuncelleSchema.safeParse({ ...GECERLI, id: ID, kapsam: 'tek', olusumGun: '2026-11-10' })
        .success,
    ).toBe(true);
    expect(
      takvimGuncelleSchema.safeParse({
        ...GECERLI,
        id: ID,
        kapsam: 'hepsi',
        olusumGun: '2026-11-10',
      }).success,
    ).toBe(false);
    // Çapraz kurallar güncellemede de geçerli.
    expect(
      takvimGuncelleSchema.safeParse({
        ...GECERLI,
        bitisSaat: '13:00',
        id: ID,
        kapsam: 'tum',
        olusumGun: '2026-11-10',
      }).success,
    ).toBe(false);
  });

  it('silme', () => {
    expect(
      takvimSilSchema.safeParse({ id: ID, kapsam: 'sonraki', olusumGun: '2026-11-10' }).success,
    ).toBe(true);
    expect(takvimSilSchema.safeParse({ id: ID, kapsam: 'tum' }).success).toBe(false);
  });
});
