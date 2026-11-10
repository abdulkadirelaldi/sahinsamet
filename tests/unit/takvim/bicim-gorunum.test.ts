import { describe, expect, it } from 'vitest';

import {
  ayBasligi,
  ayinGunuMetni,
  dakikaEkle,
  dakikaFarki,
  gecerliGun,
  gunAraligi,
  gunBasligi,
  haftaBasligi,
  saatDakika,
  saatEki,
  saatMetni,
  saatteMetni,
  tekrarOzeti,
} from '@/lib/takvim/bicim';
import {
  ayIzgarasi,
  donemBasligi,
  gezinTarih,
  gorunumAraligi,
  gorunumMu,
  gundeMi,
  gununOlusumlari,
  gunParcasi,
  olusumZamanMetni,
  sutunYerlesimi,
  type TakvimOlusumu,
} from '@/lib/takvim/gorunum';
import { TAKVIM_KATEGORILERI, KATEGORI_SIRASI } from '@/lib/takvim/kategoriler';
import { TEKRAR_YOK } from '@/lib/takvim/tekrar';
import {
  appDayStartInstant,
  appWallClockInstant,
  appWallClockMinutes,
} from '@/server/services/_shared/app-date';

describe('duvar saati yardımcıları (app-date)', () => {
  it('İstanbul 14:30 → 11:30Z ve geri', () => {
    const a = appWallClockInstant('2026-11-10', 14 * 60 + 30);
    expect(a.toISOString()).toBe('2026-11-10T11:30:00.000Z');
    expect(appWallClockMinutes(a)).toBe(870);
  });

  it('1440 dakika = ertesi günün 00:00ı', () => {
    expect(appWallClockInstant('2026-11-10', 1440).toISOString()).toBe(
      appDayStartInstant('2026-11-11').toISOString(),
    );
  });

  it('UTC gece yarısından önceki İstanbul saati doğru dakikayı verir', () => {
    expect(appWallClockMinutes(new Date('2026-11-10T22:15:00Z'))).toBe(75); // 01:15
  });
});

describe('metinler', () => {
  it('saat ve dakika', () => {
    expect(saatMetni(0)).toBe('00:00');
    expect(saatMetni(870)).toBe('14:30');
    expect(saatDakika('09:05')).toBe(545);
  });

  it('⚠️ bulunma eki söylenişe uyar', () => {
    const ornek: [number, string][] = [
      [14 * 60 + 30, "14:30'da"],
      [14 * 60, "14:00'te"],
      [9 * 60, "09:00'da"],
      [12 * 60, "12:00'de"],
      [13 * 60, "13:00'te"],
      [16 * 60, "16:00'da"],
      [20 * 60, "20:00'de"],
      [10 * 60, "10:00'da"],
      [0, "00:00'da"],
      [8 * 60 + 40, "08:40'ta"],
      [8 * 60 + 50, "08:50'de"],
      [8 * 60 + 15, "08:15'te"],
      [8 * 60 + 45, "08:45'te"],
      [8 * 60 + 5, "08:05'te"],
      [8 * 60 + 20, "08:20'de"],
      [8 * 60 + 9, "08:09'da"],
    ];
    for (const [dk, beklenen] of ornek) expect(saatteMetni(dk)).toBe(beklenen);
    expect(saatEki(7 * 60 + 7)).toBe('de');
  });

  it('⚠️ ayın günü eki', () => {
    const beklenen: Record<number, string> = {
      1: "1'inde",
      2: "2'sinde",
      3: "3'ünde",
      4: "4'ünde",
      5: "5'inde",
      6: "6'sında",
      7: "7'sinde",
      8: "8'inde",
      9: "9'unda",
      10: "10'unda",
      15: "15'inde",
      16: "16'sında",
      20: "20'sinde",
      23: "23'ünde",
      29: "29'unda",
      30: "30'unda",
      31: "31'inde",
    };
    for (const [g, m] of Object.entries(beklenen)) expect(ayinGunuMetni(Number(g))).toBe(m);
  });

  it('başlıklar', () => {
    expect(ayBasligi('2026-11-10')).toBe('Kasım 2026');
    expect(gunBasligi('2026-11-10')).toBe('Salı, 10 Kasım');
    expect(haftaBasligi('2026-11-09')).toBe('9 – 15 Kasım 2026');
    expect(haftaBasligi('2026-10-26')).toBe('26 Ekim – 1 Kasım 2026');
    expect(haftaBasligi('2026-12-28')).toBe('28 Aralık 2026 – 3 Ocak 2027');
  });

  it('tekrar özeti', () => {
    const k = { ...TEKRAR_YOK };
    expect(tekrarOzeti(k, '2026-11-10')).toBe('Tekrar etmez');
    expect(tekrarOzeti({ ...k, tur: 'GUNLUK' }, '2026-11-10')).toBe('Her gün');
    expect(tekrarOzeti({ ...k, tur: 'GUNLUK', aralik: 3 }, '2026-11-10')).toBe('3 günde bir');
    expect(tekrarOzeti({ ...k, tur: 'HAFTALIK', gunler: [3, 1] }, '2026-11-10')).toBe(
      'Her hafta Pazartesi, Çarşamba',
    );
    expect(tekrarOzeti({ ...k, tur: 'HAFTALIK' }, '2026-11-10')).toBe('Her hafta Salı');
    expect(tekrarOzeti({ ...k, tur: 'AYLIK', sayi: 6 }, '2026-11-15')).toBe(
      "Her ay 15'inde · 6 kez",
    );
    expect(
      tekrarOzeti({ ...k, tur: 'YILLIK', aralik: 2, bitisGun: '2030-01-01' }, '2026-11-10'),
    ).toBe('2 yılda bir 10 Kasım · 1 Ocak 2030 tarihine kadar');
  });

  it('dakika aritmetiği gün taşır', () => {
    expect(dakikaEkle('2026-11-10', '23:30', 60)).toEqual({ gun: '2026-11-11', saat: '00:30' });
    expect(dakikaEkle('2026-11-10', '09:00', 0)).toEqual({ gun: '2026-11-10', saat: '09:00' });
    expect(
      dakikaFarki({ gun: '2026-11-10', saat: '23:30' }, { gun: '2026-11-11', saat: '00:30' }),
    ).toBe(60);
  });

  it('gecerliGun takvimde olmayanı reddeder', () => {
    expect(gecerliGun('2026-11-10')).toBe('2026-11-10');
    expect(gecerliGun('2026-02-30')).toBeNull();
    expect(gecerliGun('x')).toBeNull();
    expect(gecerliGun(['2026-11-10'])).toBeNull();
    expect(gunAraligi('2026-11-29', '2026-12-01')).toEqual([
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
    ]);
  });
});

describe('görünüm aralıkları ve gezinme', () => {
  it('ay: pazartesiden pazara tam haftalar', () => {
    expect(gorunumAraligi('ay', '2026-11-10')).toEqual({ bas: '2026-10-26', son: '2026-12-06' });
    const izgara = ayIzgarasi('2026-11-10');
    expect(izgara).toHaveLength(6);
    expect(izgara.every((h) => h.length === 7)).toBe(true);
    // Şubat 2027 pazartesi başlar, 28 gün: tam dört hafta.
    expect(ayIzgarasi('2027-02-14')).toHaveLength(4);
  });

  it('hafta, gün, ajanda', () => {
    expect(gorunumAraligi('hafta', '2026-11-15')).toEqual({ bas: '2026-11-09', son: '2026-11-15' });
    expect(gorunumAraligi('gun', '2026-11-15')).toEqual({ bas: '2026-11-15', son: '2026-11-15' });
    expect(gorunumAraligi('ajanda', '2026-11-15').son).toBe('2026-12-14');
  });

  it('gezinme; ay 31 Ocaktan şubata kayar, marta değil', () => {
    expect(gezinTarih('ay', '2027-01-31', 1)).toBe('2027-02-01');
    expect(gezinTarih('ay', '2027-01-31', -1)).toBe('2026-12-01');
    expect(gezinTarih('hafta', '2026-11-10', 1)).toBe('2026-11-17');
    expect(gezinTarih('gun', '2026-11-10', -1)).toBe('2026-11-09');
    expect(gezinTarih('ajanda', '2026-11-10', 1)).toBe('2026-12-10');
  });

  it('dönem başlıkları ve görünüm doğrulaması', () => {
    expect(donemBasligi('ay', '2026-11-10')).toBe('Kasım 2026');
    expect(donemBasligi('hafta', '2026-11-10')).toBe('9 – 15 Kasım 2026');
    expect(donemBasligi('gun', '2026-11-10')).toBe('Salı, 10 Kasım 2026');
    expect(donemBasligi('ajanda', '2026-11-10')).toBe('10 Kasım – 9 Aralık 2026');
    expect(gorunumMu('hafta')).toBe(true);
    expect(gorunumMu('yil')).toBe(false);
  });
});

function olusum(o: Partial<TakvimOlusumu>): TakvimOlusumu {
  return {
    anahtar: 'a',
    etkinlikId: 'e',
    baslik: 'X',
    konum: null,
    kategori: 'KISISEL',
    tumGun: false,
    baslangic: appWallClockInstant('2026-11-10', 600).toISOString(),
    bitis: appWallClockInstant('2026-11-10', 660).toISOString(),
    gun: '2026-11-10',
    sonGun: '2026-11-10',
    tekrarli: false,
    ...o,
  };
}

describe('ızgara yerleşimi', () => {
  it('günün oluşumları: tüm gün önce, sonra saat', () => {
    const liste = [
      olusum({ anahtar: 'b', baslangic: appWallClockInstant('2026-11-10', 700).toISOString() }),
      olusum({ anahtar: 'a' }),
      olusum({
        anahtar: 't',
        tumGun: true,
        baslangic: appDayStartInstant('2026-11-09').toISOString(),
        gun: '2026-11-09',
        sonGun: '2026-11-11',
      }),
      olusum({ anahtar: 'z', gun: '2026-11-12', sonGun: '2026-11-12' }),
    ];
    expect(gununOlusumlari(liste, '2026-11-10').map((o) => o.anahtar)).toEqual(['t', 'a', 'b']);
    expect(gundeMi(liste[2]!, '2026-11-11')).toBe(true);
  });

  it('günün parçası: gece yarısını geçen etkinlik iki güne bölünür', () => {
    const o = olusum({
      baslangic: appWallClockInstant('2026-11-10', 23 * 60).toISOString(),
      bitis: appWallClockInstant('2026-11-11', 60).toISOString(),
    });
    expect(gunParcasi(o, '2026-11-10')).toEqual({ bas: 1380, bit: 1440 });
    expect(gunParcasi(o, '2026-11-11')).toEqual({ bas: 0, bit: 60 });
    expect(gunParcasi(o, '2026-11-12')).toBeNull();
    // Gece yarısında biten etkinlik ertesi güne parça bırakmaz.
    const tam = olusum({
      baslangic: appWallClockInstant('2026-11-10', 23 * 60).toISOString(),
      bitis: appWallClockInstant('2026-11-11', 0).toISOString(),
    });
    expect(gunParcasi(tam, '2026-11-11')).toBeNull();
  });

  it('çakışanlar yan yana, ayrık olanlar tam genişlik', () => {
    const y = sutunYerlesimi([
      { anahtar: 'a', bas: 600, bit: 660 },
      { anahtar: 'b', bas: 630, bit: 700 },
      { anahtar: 'c', bas: 665, bit: 720 },
      { anahtar: 'd', bas: 800, bit: 860 },
    ]);
    expect(y.get('a')).toEqual({ sutun: 0, sutunSayisi: 2 });
    expect(y.get('b')).toEqual({ sutun: 1, sutunSayisi: 2 });
    expect(y.get('c')).toEqual({ sutun: 0, sutunSayisi: 2 });
    expect(y.get('d')).toEqual({ sutun: 0, sutunSayisi: 1 });
  });

  it('kısa etkinlikler en kısa kutu boyunca çakışır sayılır', () => {
    const y = sutunYerlesimi([
      { anahtar: 'a', bas: 600, bit: 605 },
      { anahtar: 'b', bas: 610, bit: 615 },
    ]);
    expect(y.get('b')?.sutunSayisi).toBe(2);
  });

  it('zaman metni', () => {
    expect(olusumZamanMetni(olusum({}))).toBe('10:00 – 11:00');
    expect(
      olusumZamanMetni(
        olusum({
          baslangic: appWallClockInstant('2026-11-10', 23 * 60).toISOString(),
          bitis: appWallClockInstant('2026-11-11', 0).toISOString(),
        }),
      ),
    ).toBe('23:00 – 24:00');
    expect(
      olusumZamanMetni(
        olusum({
          baslangic: appWallClockInstant('2026-11-10', 22 * 60).toISOString(),
          bitis: appWallClockInstant('2026-11-11', 120).toISOString(),
        }),
      ),
    ).toBe('10 Kasım 22:00 – 11 Kasım 02:00');
    expect(olusumZamanMetni(olusum({ tumGun: true }))).toBe('Tüm gün');
    expect(olusumZamanMetni(olusum({ tumGun: true, sonGun: '2026-11-12' }))).toBe(
      '10 – 12 Kasım · tüm gün',
    );
    expect(olusumZamanMetni(olusum({ tumGun: true, sonGun: '2026-12-02' }))).toBe(
      '10 Kasım – 2 Aralık · tüm gün',
    );
  });
});

describe('kategoriler', () => {
  it('yedi kategori, her birinin rengi ayrı', () => {
    expect(KATEGORI_SIRASI).toHaveLength(7);
    const noktalar = KATEGORI_SIRASI.map((k) => TAKVIM_KATEGORILERI[k].nokta);
    expect(new Set(noktalar).size).toBe(7);
  });
});
