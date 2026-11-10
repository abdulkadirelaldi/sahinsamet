import { describe, expect, it } from 'vitest';

import {
  adayGunler,
  adayMi,
  haftaninGunu,
  oncekiAdaySayisi,
  olusumlar,
  TEKRAR_YOK,
  tumGunSuresi,
  type TekrarKurali,
  type TekrarliEtkinlik,
} from '@/lib/takvim/tekrar';
import {
  appDayStartInstant,
  appWallClockInstant,
  appWallClockMinutes,
} from '@/server/services/_shared/app-date';

const kural = (k: Partial<TekrarKurali>): TekrarKurali => ({ ...TEKRAR_YOK, ...k });
const gunler = (bas: string, k: Partial<TekrarKurali>, son: string, ilk?: string) => [
  ...adayGunler(bas, kural(k), son, ilk),
];

/** Saatli etkinlik: `gun` `saat`te başlar, `dk` sürer. */
function saatli(
  gun: string,
  saat: string,
  dk: number,
  k: Partial<TekrarKurali> = {},
  istisnalar: string[] = [],
): TekrarliEtkinlik {
  const [s, d] = saat.split(':').map(Number) as [number, number];
  const baslangic = appWallClockInstant(gun, s * 60 + d);
  return {
    tumGun: false,
    baslangic,
    bitis: new Date(baslangic.getTime() + dk * 60_000),
    tekrar: kural(k),
    istisnalar,
  };
}

function tumGun(ilk: string, sonGunHaric: string, k: Partial<TekrarKurali> = {}): TekrarliEtkinlik {
  return {
    tumGun: true,
    baslangic: appDayStartInstant(ilk),
    bitis: appDayStartInstant(sonGunHaric),
    tekrar: kural(k),
    istisnalar: [],
  };
}

const an = (iso: string) => new Date(iso);

describe('haftaninGunu — pazartesi 1, pazar 7', () => {
  it('2026-11-09 pazartesi, 2026-11-15 pazar', () => {
    expect(haftaninGunu('2026-11-09')).toBe(1);
    expect(haftaninGunu('2026-11-15')).toBe(7);
  });
});

describe('adayGunler', () => {
  it('YOK: yalnızca başlangıç, sınırın ötesindeyse hiç', () => {
    expect(gunler('2026-11-10', {}, '2026-12-31')).toEqual(['2026-11-10']);
    expect(gunler('2026-11-10', {}, '2026-11-09')).toEqual([]);
  });

  it('GUNLUK aralıkla', () => {
    expect(gunler('2026-11-10', { tur: 'GUNLUK', aralik: 2 }, '2026-11-16')).toEqual([
      '2026-11-10',
      '2026-11-12',
      '2026-11-14',
      '2026-11-16',
    ]);
  });

  it('bitiş günü DAHİL, sayı adaylara uygulanır', () => {
    expect(gunler('2026-11-10', { tur: 'GUNLUK', bitisGun: '2026-11-12' }, '2027-01-01')).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
    expect(gunler('2026-11-10', { tur: 'GUNLUK', sayi: 3 }, '2027-01-01')).toHaveLength(3);
  });

  it('HAFTALIK seçili günlerde, hafta pazartesi başlar, başlangıçtan önceki gün yok', () => {
    // 2026-11-11 çarşamba; pzt ve cuma seçili → ilk hafta yalnızca cuma.
    expect(gunler('2026-11-11', { tur: 'HAFTALIK', gunler: [1, 5] }, '2026-11-23')).toEqual([
      '2026-11-13',
      '2026-11-16',
      '2026-11-20',
      '2026-11-23',
    ]);
  });

  it('HAFTALIK 2 haftada bir; gün verilmezse başlangıcın günü', () => {
    expect(gunler('2026-11-10', { tur: 'HAFTALIK', aralik: 2 }, '2026-12-31')).toEqual([
      '2026-11-10',
      '2026-11-24',
      '2026-12-08',
      '2026-12-22',
    ]);
  });

  it('HAFTALIK sayı ilk haftanın eksik günlerini de sayar', () => {
    expect(
      gunler('2026-11-11', { tur: 'HAFTALIK', gunler: [1, 3, 5], sayi: 4 }, '2027-12-31'),
    ).toEqual(['2026-11-11', '2026-11-13', '2026-11-16', '2026-11-18']);
  });

  it('⚠️ AYLIK 31: otuz çeken aylar ve şubat ATLANIR (ay sonuna kırpılmaz)', () => {
    expect(gunler('2026-01-31', { tur: 'AYLIK' }, '2026-08-31')).toEqual([
      '2026-01-31',
      '2026-03-31',
      '2026-05-31',
      '2026-07-31',
      '2026-08-31',
    ]);
  });

  it('AYLIK 30: şubat atlanır; sayı yalnızca GERÇEK oluşumları sayar', () => {
    expect(gunler('2026-01-30', { tur: 'AYLIK', sayi: 3 }, '2027-12-31')).toEqual([
      '2026-01-30',
      '2026-03-30',
      '2026-04-30',
    ]);
  });

  it('AYLIK aralıkla ve yıl sınırında', () => {
    expect(gunler('2026-11-15', { tur: 'AYLIK', aralik: 2 }, '2027-05-31')).toEqual([
      '2026-11-15',
      '2027-01-15',
      '2027-03-15',
      '2027-05-15',
    ]);
  });

  it('⚠️ YILLIK 29 Şubat: yalnızca artık yıllarda', () => {
    expect(gunler('2028-02-29', { tur: 'YILLIK' }, '2037-01-01')).toEqual([
      '2028-02-29',
      '2032-02-29',
      '2036-02-29',
    ]);
    expect(gunler('2028-02-29', { tur: 'YILLIK', sayi: 2 }, '2099-01-01')).toEqual([
      '2028-02-29',
      '2032-02-29',
    ]);
  });

  it('YILLIK aralıkla', () => {
    expect(gunler('2026-11-10', { tur: 'YILLIK', aralik: 2 }, '2031-01-01')).toEqual([
      '2026-11-10',
      '2028-11-10',
      '2030-11-10',
    ]);
  });

  it('ilkGun ile ATLAMA sonucu değiştirmez (her tür)', () => {
    const turler: Partial<TekrarKurali>[] = [
      { tur: 'GUNLUK', aralik: 3 },
      { tur: 'HAFTALIK', aralik: 2, gunler: [2, 6] },
      { tur: 'AYLIK' },
      { tur: 'AYLIK', aralik: 5 },
      { tur: 'YILLIK' },
    ];
    for (const k of turler) {
      const hepsi = gunler('2020-01-31', k, '2030-12-31').filter((g) => g >= '2029-06-01');
      expect(
        gunler('2020-01-31', k, '2030-12-31', '2029-06-01').filter((g) => g >= '2029-06-01'),
      ).toEqual(hepsi);
    }
  });

  it('sayı varken atlama yapılmaz (kaçıncı aday olduğu bilinmeli)', () => {
    expect(gunler('2026-01-01', { tur: 'GUNLUK', sayi: 5 }, '2027-01-01', '2026-06-01')).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
    ]);
  });
});

describe('olusumlar — aralığa değen oluşumlar', () => {
  it('tekrarlamayan saatli etkinlik', () => {
    const e = saatli('2026-11-10', '14:30', 60);
    const liste = olusumlar(e, appDayStartInstant('2026-11-10'), appDayStartInstant('2026-11-11'));
    expect(liste).toHaveLength(1);
    expect(liste[0]!.baslangic.toISOString()).toBe('2026-11-10T11:30:00.000Z');
    expect(liste[0]!.gun).toBe('2026-11-10');
    expect(
      olusumlar(e, appDayStartInstant('2026-11-11'), appDayStartInstant('2026-11-12')),
    ).toEqual([]);
  });

  it('her gün 09:00 duvar saatinde kalır ve istisna günü atlanır', () => {
    const e = saatli('2026-11-01', '09:00', 30, { tur: 'GUNLUK' }, ['2026-11-11']);
    const liste = olusumlar(e, appDayStartInstant('2026-11-10'), appDayStartInstant('2026-11-13'));
    expect(liste.map((o) => o.gun)).toEqual(['2026-11-10', '2026-11-12']);
    for (const o of liste) expect(appWallClockMinutes(o.baslangic)).toBe(9 * 60);
  });

  it('gece yarısını geçen oluşum ertesi günün aralığında da görünür', () => {
    const e = saatli('2026-11-10', '23:00', 120);
    const liste = olusumlar(e, appDayStartInstant('2026-11-11'), appDayStartInstant('2026-11-12'));
    expect(liste.map((o) => o.gun)).toEqual(['2026-11-10']);
  });

  it('tam aralık başında biten oluşum dahil DEĞİL (bitiş dışlayıcı)', () => {
    const e = saatli('2026-11-10', '23:00', 60);
    expect(
      olusumlar(e, appDayStartInstant('2026-11-11'), appDayStartInstant('2026-11-12')),
    ).toEqual([]);
  });

  it('süresi sıfır etkinlik başlangıcı aralıktaysa dahil', () => {
    const e = saatli('2026-11-10', '00:00', 0);
    expect(
      olusumlar(e, appDayStartInstant('2026-11-10'), appDayStartInstant('2026-11-11')),
    ).toHaveLength(1);
  });

  it('çok günlük tüm gün etkinlik her günün aralığına değer', () => {
    const e = tumGun('2026-11-10', '2026-11-13'); // 10, 11, 12
    expect(tumGunSuresi(e)).toBe(3);
    const liste = olusumlar(e, appDayStartInstant('2026-11-12'), appDayStartInstant('2026-11-13'));
    expect(liste).toHaveLength(1);
    expect(liste[0]!.bitis.toISOString()).toBe(appDayStartInstant('2026-11-13').toISOString());
    expect(
      olusumlar(e, appDayStartInstant('2026-11-13'), appDayStartInstant('2026-11-14')),
    ).toEqual([]);
  });

  it('yıllık tüm gün etkinlik (doğum günü) ve uzak yıl hızlı', () => {
    const e = tumGun('1990-03-05', '1990-03-06', { tur: 'YILLIK' });
    const liste = olusumlar(e, appDayStartInstant('2026-01-01'), appDayStartInstant('2027-01-01'));
    expect(liste.map((o) => o.gun)).toEqual(['2026-03-05']);
  });

  it('haftalık seri: ay ızgarası aralığında doğru günler', () => {
    const e = saatli('2026-11-02', '18:00', 90, { tur: 'HAFTALIK', gunler: [1, 3] });
    const liste = olusumlar(e, appDayStartInstant('2026-11-09'), appDayStartInstant('2026-11-16'));
    expect(liste.map((o) => o.gun)).toEqual(['2026-11-09', '2026-11-11']);
    expect(liste[0]!.bitis.getTime() - liste[0]!.baslangic.getTime()).toBe(90 * 60_000);
  });

  it('başlangıç anı İstanbul gününe göre: 00:30 oluşumu önceki UTC gününde', () => {
    const e = saatli('2026-11-10', '00:30', 30, { tur: 'GUNLUK', sayi: 2 });
    const liste = olusumlar(e, an('2026-11-01T00:00:00Z'), an('2026-12-01T00:00:00Z'));
    expect(liste.map((o) => [o.gun, o.baslangic.toISOString()])).toEqual([
      ['2026-11-10', '2026-11-09T21:30:00.000Z'],
      ['2026-11-11', '2026-11-10T21:30:00.000Z'],
    ]);
  });
});

describe('seri bölme yardımcıları', () => {
  it('oncekiAdaySayisi: o günden önceki aday sayısı', () => {
    const k = kural({ tur: 'GUNLUK', sayi: 10 });
    expect(oncekiAdaySayisi('2026-11-10', k, '2026-11-10')).toBe(0);
    expect(oncekiAdaySayisi('2026-11-10', k, '2026-11-14')).toBe(4);
  });

  it('adayMi: istisnadan bağımsız, aralığa ve kurala uyar', () => {
    const k = kural({ tur: 'HAFTALIK', gunler: [2] });
    expect(adayMi('2026-11-10', k, '2026-11-17')).toBe(true);
    expect(adayMi('2026-11-10', k, '2026-11-18')).toBe(false);
    expect(adayMi('2026-11-10', TEKRAR_YOK, '2026-11-10')).toBe(true);
    expect(adayMi('2026-11-10', TEKRAR_YOK, '2026-11-11')).toBe(false);
  });
});
