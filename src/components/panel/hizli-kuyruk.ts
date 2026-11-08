/**
 * ÇEVRİMDIŞI KUYRUK (2026-10-31) — bağlantı yokken girilen hızlı kayıtlar.
 *
 * `localStorage`da yalnızca GÖNDERİLENE KADAR durur; gönderilince silinir.
 * Depo erişilemezse (gizli sekme) kayıt tutulamaz ve sessizce atlanmaz:
 * `kuyrugaEkle` `false` döner. Saf çekirdek (`kuyruguIsle`) depodan bağımsız.
 */

import { gunAy } from '@/components/panel/hayat-bicim';

export type KuyrukTuru = 'harcama' | 'kilo' | 'su' | 'uyku';

export interface KuyrukKaydi {
  id: string;
  tur: KuyrukTuru;
  girdi: Record<string, unknown>;
  /** Sunucu hatasıyla kaç kez işlenemedi. */
  deneme?: number;
}

/** `tamam` gönderildi · `red` sunucu kabul etmiyor, yeniden denemek boşuna · `bekle` sonra dene. */
export type GonderimSonucu = 'tamam' | 'red' | 'bekle' | 'atla';

const ANAHTAR = 'sahinsamet-hizli-kuyruk';
export const KUYRUK_OLAYI = 'sahinsamet-kuyruk-degisti';

const GUN = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });
/** İstanbul günü `YYYY-MM-DD` — kayıt GİRİLDİĞİ güne yazılsın (ADR-016). */
export const istanbulGunu = (simdi: Date = new Date()): string => GUN.format(simdi);

export function kuyruguOku(): KuyrukKaydi[] {
  try {
    const ham = window.localStorage.getItem(ANAHTAR);
    const veri: unknown = ham ? JSON.parse(ham) : [];
    return Array.isArray(veri) ? (veri as KuyrukKaydi[]) : [];
  } catch {
    return [];
  }
}

function yaz(kayitlar: KuyrukKaydi[]): boolean {
  try {
    if (kayitlar.length === 0) window.localStorage.removeItem(ANAHTAR);
    else window.localStorage.setItem(ANAHTAR, JSON.stringify(kayitlar));
    window.dispatchEvent(new Event(KUYRUK_OLAYI));
    return true;
  } catch {
    return false;
  }
}

export function kuyrugaEkle(tur: KuyrukTuru, girdi: Record<string, unknown>): boolean {
  return yaz([...kuyruguOku(), { id: crypto.randomUUID(), tur, girdi }]);
}

export const kuyruguYaz = yaz;

const REDDEDILEN_ANAHTAR = 'sahinsamet-reddedilen-kayitlar';

/** Eklenemeyen kayıtlar cihazda durur: uygulama kapanınca harcama izsiz kaybolmasın. */
export function reddedilenleriOku(): KuyrukKaydi[] {
  try {
    const ham = window.localStorage.getItem(REDDEDILEN_ANAHTAR);
    const veri: unknown = ham ? JSON.parse(ham) : [];
    return Array.isArray(veri) ? (veri as KuyrukKaydi[]) : [];
  } catch {
    return [];
  }
}

export function reddedilenleriYaz(kayitlar: readonly KuyrukKaydi[]): void {
  try {
    if (kayitlar.length === 0) window.localStorage.removeItem(REDDEDILEN_ANAHTAR);
    else window.localStorage.setItem(REDDEDILEN_ANAHTAR, JSON.stringify(kayitlar));
  } catch {
    // Yazılamazsa ekranda durur; uygulama kapanana kadar görünür.
  }
}

/** Sunucu bu kadar kez hata verirse kayıt sırayı kapatmaz, eklenemeyenlere geçer. */
export const EN_COK_DENEME = 5;

/** Kaydın kullanıcıya gösterilen özeti: tutar ve gün. SAF. */
export function kayitOzeti(k: KuyrukKaydi): string {
  const g = k.girdi;
  const gun = typeof g.gun === 'string' ? ` · ${gunAy(g.gun)}` : '';
  const ondalik = (v: unknown) => String(v).replace('.', ',');
  if (k.tur === 'harcama') return `${ondalik(g.tutar)} ₺ · ${String(g.ne ?? 'Harcama')}${gun}`;
  if (k.tur === 'kilo') return `${ondalik(g.kg)} kg${gun}`;
  if (k.tur === 'uyku') return `${ondalik(g.saat)} saat uyku${gun}`;
  return `${String(g.ml)} ml su${gun}`;
}

/**
 * Sırayla gönderir; ilk `bekle`de durur (ağ yine yok). `atla`: sunucu bu kaydı işleyemedi, sıra
 * kapanmasın diye arkasındakiler sürer; `EN_COK_DENEME`den sonra reddedilir. Dönen: kalanlar ve
 * kaç kaydın reddedildiği. Fırlatan gönderici `bekle` sayılır. SAF.
 */
export async function kuyruguIsle(
  kayitlar: readonly KuyrukKaydi[],
  gonder: (k: KuyrukKaydi) => Promise<GonderimSonucu>,
): Promise<{ kalan: KuyrukKaydi[]; gonderilen: number; reddedilen: KuyrukKaydi[] }> {
  let gonderilen = 0;
  const reddedilen: KuyrukKaydi[] = [];
  const atlanan: KuyrukKaydi[] = [];
  for (let i = 0; i < kayitlar.length; i += 1) {
    const kayit = kayitlar[i] as KuyrukKaydi;
    const sonuc = await gonder(kayit).catch((): GonderimSonucu => 'bekle');
    if (sonuc === 'bekle') {
      return { kalan: [...atlanan, ...kayitlar.slice(i)], gonderilen, reddedilen };
    }
    if (sonuc === 'tamam') gonderilen += 1;
    else if (sonuc === 'red') reddedilen.push(kayit);
    else {
      const deneme = (kayit.deneme ?? 0) + 1;
      if (deneme >= EN_COK_DENEME) reddedilen.push(kayit);
      else atlanan.push({ ...kayit, deneme });
    }
  }
  return { kalan: atlanan, gonderilen, reddedilen };
}
