import {
  addAppDays,
  addAppMonths,
  appDayStartInstant,
  appWallClockMinutes,
  startOfAppWeek,
  toAppDay,
  type AppDay,
} from '@/server/services/_shared/app-date';
import type { TakvimKategori } from '@/types';

import {
  aralikBasligi,
  ayBasligi,
  gunAraligi,
  gunAyMetni,
  gunBasligi,
  haftaBasligi,
  saatMetni,
} from './bicim';
import type { TekrarKurali } from './tekrar';

/**
 * TAKVİM GÖRÜNÜMLERİ (2026-11-10) — SAF: aralık, gezinme, ay ızgarası, saat ızgarası yerleşimi.
 * Ekran yalnızca çizer; hangi günün nereye düştüğü burada hesaplanır ve test edilir.
 */

export const GORUNUMLER = ['ay', 'hafta', 'gun', 'ajanda'] as const;
export type TakvimGorunumu = (typeof GORUNUMLER)[number];
export const GORUNUM_ADLARI: Record<TakvimGorunumu, string> = {
  ay: 'Ay',
  hafta: 'Hafta',
  gun: 'Gün',
  ajanda: 'Ajanda',
};

/** Ajanda bir sayfada kaç gün gösterir. */
export const AJANDA_GUN = 30;

export function gorunumMu(ham: unknown): ham is TakvimGorunumu {
  return typeof ham === 'string' && (GORUNUMLER as readonly string[]).includes(ham);
}

/** Ekranın ve sorgunun kapsadığı günler (dahil). Ay: pazartesiden pazara tam haftalar. */
export function gorunumAraligi(g: TakvimGorunumu, tarih: AppDay): { bas: AppDay; son: AppDay } {
  switch (g) {
    case 'ay': {
      const ilk = `${tarih.slice(0, 7)}-01`;
      const son = addAppDays(addAppMonths(ilk, 1), -1);
      return { bas: startOfAppWeek(ilk), son: addAppDays(startOfAppWeek(son), 6) };
    }
    case 'hafta': {
      const bas = startOfAppWeek(tarih);
      return { bas, son: addAppDays(bas, 6) };
    }
    case 'gun':
      return { bas: tarih, son: tarih };
    case 'ajanda':
      return { bas: tarih, son: addAppDays(tarih, AJANDA_GUN - 1) };
  }
}

/** Önceki/sonraki dönem. Ay gezinmesi ayın 1'ine oturur: 31 Ocak + 1 ay şubatta kalsın. */
export function gezinTarih(g: TakvimGorunumu, tarih: AppDay, yon: 1 | -1): AppDay {
  switch (g) {
    case 'ay':
      return addAppMonths(`${tarih.slice(0, 7)}-01`, yon);
    case 'hafta':
      return addAppDays(tarih, 7 * yon);
    case 'gun':
      return addAppDays(tarih, yon);
    case 'ajanda':
      return addAppDays(tarih, AJANDA_GUN * yon);
  }
}

export function donemBasligi(g: TakvimGorunumu, tarih: AppDay): string {
  switch (g) {
    case 'ay':
      return ayBasligi(tarih);
    case 'hafta':
      return haftaBasligi(startOfAppWeek(tarih));
    case 'gun':
      return `${gunBasligi(tarih)} ${tarih.slice(0, 4)}`;
    case 'ajanda':
      return aralikBasligi(tarih, addAppDays(tarih, AJANDA_GUN - 1));
  }
}

/** Ay ızgarası: haftalar × 7 gün. */
export function ayIzgarasi(tarih: AppDay): AppDay[][] {
  const { bas, son } = gorunumAraligi('ay', tarih);
  const gunler = gunAraligi(bas, son);
  const haftalar: AppDay[][] = [];
  for (let i = 0; i < gunler.length; i += 7) haftalar.push(gunler.slice(i, i + 7));
  return haftalar;
}

/* ===========================================================================
 * EKRANA GİDEN VERİ — sunucu bileşeninden istemciye düz JSON
 * ======================================================================== */

/** Bir oluşum. Anlar ISO metni (sunucu → istemci sınırı `Date` taşımaz). */
export interface TakvimOlusumu {
  /** `etkinlikId:başlangıçISO` — liste anahtarı. */
  anahtar: string;
  etkinlikId: string;
  baslik: string;
  konum: string | null;
  kategori: TakvimKategori;
  tumGun: boolean;
  baslangic: string;
  bitis: string;
  /** Başladığı gün. */
  gun: AppDay;
  /** Değdiği SON gün (dahil). */
  sonGun: AppDay;
  tekrarli: boolean;
}

/** Düzenleme formu için serinin tamamı. */
export interface TakvimEtkinligiVerisi {
  id: string;
  baslik: string;
  aciklama: string | null;
  konum: string | null;
  kategori: TakvimKategori;
  tumGun: boolean;
  baslangic: string;
  bitis: string;
  tekrar: TekrarKurali;
  istisnalar: AppDay[];
  hatirlatmalar: number[];
  seriId: string | null;
}

/** Oluşum `gun` gününe değiyor mu. */
export function gundeMi(o: Pick<TakvimOlusumu, 'gun' | 'sonGun'>, gun: AppDay): boolean {
  return o.gun <= gun && gun <= o.sonGun;
}

/** Bir günün oluşumları: önce tüm gün, sonra başlangıç saatine göre. */
export function gununOlusumlari<T extends TakvimOlusumu>(liste: readonly T[], gun: AppDay): T[] {
  return liste
    .filter((o) => gundeMi(o, gun))
    .sort(
      (a, b) =>
        Number(b.tumGun) - Number(a.tumGun) ||
        a.baslangic.localeCompare(b.baslangic) ||
        a.baslik.localeCompare(b.baslik, 'tr'),
    );
}

/** Saatli oluşumun `gun` içindeki parçası, dakika olarak [bas, bit]. Değmiyorsa `null`. */
export function gunParcasi(
  o: Pick<TakvimOlusumu, 'baslangic' | 'bitis'>,
  gun: AppDay,
): { bas: number; bit: number } | null {
  const gunBas = appDayStartInstant(gun).getTime();
  const gunSon = appDayStartInstant(addAppDays(gun, 1)).getTime();
  const b = Date.parse(o.baslangic);
  const s = Date.parse(o.bitis);
  if (b >= gunSon || s < gunBas || (s === gunBas && b < gunBas)) return null;
  return {
    bas: Math.max(0, Math.round((b - gunBas) / 60_000)),
    bit: Math.min(1440, Math.round((s - gunBas) / 60_000)),
  };
}

/** Izgarada en kısa kutu: 15 dakikalık toplantı da okunacak yükseklikte çizilir. */
export const EN_KISA_KUTU_DK = 30;

export interface Yerlesim {
  sutun: number;
  sutunSayisi: number;
}

/**
 * Çakışan kutuları yan yana dizer (Google'ın sütun düzeni). Birbirine değen kutular bir KÜME;
 * kümedeki her kutu ilk boş sütuna oturur, genişlik kümenin sütun sayısına bölünür.
 */
export function sutunYerlesimi(
  parcalar: readonly { anahtar: string; bas: number; bit: number }[],
): Map<string, Yerlesim> {
  const sirali = [...parcalar]
    .map((p) => ({ ...p, bit: Math.max(p.bit, p.bas + EN_KISA_KUTU_DK) }))
    .sort((a, b) => a.bas - b.bas || b.bit - a.bit);
  const sonuc = new Map<string, Yerlesim>();
  let kume: { anahtar: string; sutun: number }[] = [];
  let sutunSonlari: number[] = [];
  let kumeSonu = -1;

  const kapat = () => {
    for (const k of kume)
      sonuc.set(k.anahtar, { sutun: k.sutun, sutunSayisi: sutunSonlari.length });
    kume = [];
    sutunSonlari = [];
  };

  for (const p of sirali) {
    if (p.bas >= kumeSonu) kapat();
    let sutun = sutunSonlari.findIndex((son) => son <= p.bas);
    if (sutun === -1) {
      sutun = sutunSonlari.length;
      sutunSonlari.push(p.bit);
    } else {
      sutunSonlari[sutun] = p.bit;
    }
    kume.push({ anahtar: p.anahtar, sutun });
    kumeSonu = Math.max(kumeSonu, p.bit);
  }
  kapat();
  return sonuc;
}

/** "14:30 – 15:30" · "Tüm gün" · "10 Kasım 22:00 – 11 Kasım 02:00" · "10 – 12 Kasım · tüm gün". */
export function olusumZamanMetni(
  o: Pick<TakvimOlusumu, 'tumGun' | 'baslangic' | 'bitis' | 'gun' | 'sonGun'>,
): string {
  if (o.tumGun) {
    if (o.gun === o.sonGun) return 'Tüm gün';
    return o.gun.slice(0, 7) === o.sonGun.slice(0, 7)
      ? `${Number(o.gun.slice(8, 10))} – ${gunAyMetni(o.sonGun)} · tüm gün`
      : `${gunAyMetni(o.gun)} – ${gunAyMetni(o.sonGun)} · tüm gün`;
  }
  const bas = saatMetni(appWallClockMinutes(new Date(o.baslangic)));
  const bitAn = new Date(o.bitis);
  const bitGun = toAppDay(bitAn);
  const bit = saatMetni(appWallClockMinutes(bitAn));
  // Gece yarısında biten etkinlik ertesi güne geçmiş sayılmaz: "23:00 – 24:00".
  if (bitGun === o.gun || (bit === '00:00' && bitGun === addAppDays(o.gun, 1))) {
    return `${bas} – ${bit === '00:00' && bitGun !== o.gun ? '24:00' : bit}`;
  }
  return `${gunAyMetni(o.gun)} ${bas} – ${gunAyMetni(bitGun)} ${bit}`;
}
