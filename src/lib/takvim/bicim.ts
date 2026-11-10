import { addAppDays, appDayToDate, type AppDay } from '@/server/services/_shared/app-date';

import { haftaninGunu, type TekrarKurali } from './tekrar';

/**
 * TAKVİM METİNLERİ (2026-11-10) — SAF ve deterministik. `Intl` yerine sabit diziler: sunucu ve
 * tarayıcının ICU verisi farklı olabiliyor, aynı gün iki yerde farklı yazılırsa hidrasyon uyarısı
 * verirdi.
 */

export const AY_ADLARI = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

/** 1 = pazartesi → dizin 0. */
export const GUN_ADLARI = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
] as const;
export const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

const iki = (n: number): string => String(n).padStart(2, '0');

/** Dakika (0–1440) → `HH:MM`. 1440 → `24:00`. */
export function saatMetni(dk: number): string {
  return `${iki(Math.floor(dk / 60))}:${iki(dk % 60)}`;
}

/** `HH:MM` → dakika. */
export function saatDakika(saat: string): number {
  const [s = 0, d = 0] = saat.split(':').map(Number);
  return s * 60 + d;
}

const ayNo = (gun: AppDay) => Number(gun.slice(5, 7));
const gunNo = (gun: AppDay) => Number(gun.slice(8, 10));
const yilNo = (gun: AppDay) => Number(gun.slice(0, 4));

/** "Kasım 2026". */
export function ayBasligi(gun: AppDay): string {
  return `${AY_ADLARI[ayNo(gun) - 1]} ${yilNo(gun)}`;
}

/** "10 Kasım". */
export function gunAyMetni(gun: AppDay): string {
  return `${gunNo(gun)} ${AY_ADLARI[ayNo(gun) - 1]}`;
}

/** "Salı, 10 Kasım". */
export function gunBasligi(gun: AppDay): string {
  return `${GUN_ADLARI[haftaninGunu(gun) - 1]}, ${gunAyMetni(gun)}`;
}

/** "10 – 16 Kasım 2026" · "27 Ekim – 2 Kasım 2026" · "29 Aralık 2026 – 4 Ocak 2027". */
export function aralikBasligi(bas: AppDay, son: AppDay): string {
  if (yilNo(bas) !== yilNo(son)) {
    return `${gunAyMetni(bas)} ${yilNo(bas)} – ${gunAyMetni(son)} ${yilNo(son)}`;
  }
  if (ayNo(bas) !== ayNo(son)) return `${gunAyMetni(bas)} – ${gunAyMetni(son)} ${yilNo(son)}`;
  return `${gunNo(bas)} – ${gunAyMetni(son)} ${yilNo(son)}`;
}

/** Pazartesiden pazara. */
export function haftaBasligi(pazartesi: AppDay): string {
  return aralikBasligi(pazartesi, addAppDays(pazartesi, 6));
}

/*
 * TÜRKÇE EKLER. Rakamla yazılan sayının eki SÖYLENİŞİN son kelimesine uyar: "14:30'da" (otuz),
 * "14:00'te" (dört), "15'inde" (on beş → beş). Tablolar son kelimeye göre.
 */

/** Birler basamağı (1–9) ve onlar (10, 20 … 50) için bulunma eki: -da/-de/-ta/-te. */
const BULUNMA_BIRLER = ['da', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'] as const; // 0 sıfır
const BULUNMA_ONLAR = ['da', 'da', 'de', 'da', 'ta', 'de'] as const; // —, on, yirmi, otuz, kırk, elli

function bulunmaEki(n: number): string {
  if (n % 10 !== 0 || n === 0) return BULUNMA_BIRLER[n % 10]!;
  return BULUNMA_ONLAR[n / 10]!;
}

/** `HH:MM` için bulunma eki: "14:30" → "da", "14:00" → "te", "09:00" → "da". */
export function saatEki(dk: number): string {
  const dakika = dk % 60;
  return bulunmaEki(dakika !== 0 ? dakika : Math.floor(dk / 60) % 24);
}

/** "14:30'da". */
export function saatteMetni(dk: number): string {
  return `${saatMetni(dk)}'${saatEki(dk)}`;
}

/** Ayın günü için iyelik + bulunma: 1'inde, 2'sinde, 3'ünde … 6'sında, 9'unda, 10'unda. */
const AY_GUNU_BIRLER = [
  '',
  'inde',
  'sinde',
  'ünde',
  'ünde',
  'inde',
  'sında',
  'sinde',
  'inde',
  'unda',
] as const;
const AY_GUNU_ONLAR = ['', 'unda', 'sinde', 'unda'] as const; // on, yirmi, otuz

export function ayinGunuEki(gun: number): string {
  return gun % 10 !== 0 ? AY_GUNU_BIRLER[gun % 10]! : AY_GUNU_ONLAR[gun / 10]!;
}

/** "15'inde". */
export function ayinGunuMetni(gun: number): string {
  return `${gun}'${ayinGunuEki(gun)}`;
}

/** Tekrar kuralının insan dilinde özeti: "Her hafta Pazartesi, Çarşamba · 10 kez". */
export function tekrarOzeti(kural: TekrarKurali, baslangicGun: AppDay): string {
  if (kural.tur === 'YOK') return 'Tekrar etmez';
  const n = kural.aralik;
  let metin: string;
  switch (kural.tur) {
    case 'GUNLUK':
      metin = n === 1 ? 'Her gün' : `${n} günde bir`;
      break;
    case 'HAFTALIK': {
      const gunler = (kural.gunler.length > 0 ? [...kural.gunler] : [haftaninGunu(baslangicGun)])
        .sort((a, b) => a - b)
        .map((g) => GUN_ADLARI[g - 1])
        .join(', ');
      metin = `${n === 1 ? 'Her hafta' : `${n} haftada bir`} ${gunler}`;
      break;
    }
    case 'AYLIK':
      metin = `${n === 1 ? 'Her ay' : `${n} ayda bir`} ${ayinGunuMetni(gunNo(baslangicGun))}`;
      break;
    case 'YILLIK':
      metin = `${n === 1 ? 'Her yıl' : `${n} yılda bir`} ${gunAyMetni(baslangicGun)}`;
      break;
  }
  if (kural.sayi !== null) metin += ` · ${kural.sayi} kez`;
  else if (kural.bitisGun !== null) {
    metin += ` · ${gunAyMetni(kural.bitisGun)} ${yilNo(kural.bitisGun)} tarihine kadar`;
  }
  return metin;
}

/** İki gün arası gün listesi (dahil). */
export function gunAraligi(bas: AppDay, son: AppDay): AppDay[] {
  const sonuc: AppDay[] = [];
  for (let g = bas; g <= son; g = addAppDays(g, 1)) sonuc.push(g);
  return sonuc;
}

/** Tarih `<input type=date>`ten mi geldi ve takvimde var mı. */
export function gecerliGun(ham: unknown): AppDay | null {
  if (typeof ham !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ham)) return null;
  try {
    appDayToDate(ham);
    return ham;
  } catch {
    return null;
  }
}

/** Gün + duvar saatine dakika ekler (gün taşmasıyla): 23:30 + 60 dk → ertesi gün 00:30. */
export function dakikaEkle(gun: AppDay, saat: string, dk: number): { gun: AppDay; saat: string } {
  const toplam = saatDakika(saat) + dk;
  const gunFarki = Math.floor(toplam / 1440);
  return { gun: addAppDays(gun, gunFarki), saat: saatMetni(toplam - gunFarki * 1440) };
}

/** İki (gün, saat) arası dakika. */
export function dakikaFarki(
  a: { gun: AppDay; saat: string },
  b: { gun: AppDay; saat: string },
): number {
  const gun = Math.round(
    (appDayToDate(b.gun).getTime() - appDayToDate(a.gun).getTime()) / 86_400_000,
  );
  return gun * 1440 + saatDakika(b.saat) - saatDakika(a.saat);
}
