import type { WalletAccountKind, WalletFrequency, WalletUnit } from '@/types';

import { paraBicim } from './para-bicim';

/**
 * CÜZDAN BİÇİMLERİ (2026-10-30) — sunucu ve istemci bileşenleri ortak.
 * Tutarlar METİN; sayıya çevrilmeden biçimlenir (`paraBicim`, ADR-014/D).
 */

export const BIRIM_ADI: Record<WalletUnit, string> = {
  TRY: 'Türk lirası',
  USD: 'Dolar',
  EUR: 'Euro',
  GBP: 'Sterlin',
  GOLD_GRAM: 'Gram altın',
  GOLD_HAS: 'Has altın (gr)',
  GOLD_QUARTER: 'Çeyrek altın',
  GOLD_HALF: 'Yarım altın',
  GOLD_FULL: 'Tam altın',
  GOLD_REPUBLIC: 'Cumhuriyet altını',
  GOLD_ATA: 'Ata altın',
  GOLD_BANGLE_22: '22 ayar bilezik (gr)',
  SILVER_GRAM: 'Gümüş (gr)',
};

/** Miktarın yanındaki kısa birim — "3 çeyrek", "12,50 gr". */
const KISA: Partial<Record<WalletUnit, string>> = {
  GOLD_GRAM: 'gr altın',
  GOLD_HAS: 'gr has',
  GOLD_QUARTER: 'çeyrek',
  GOLD_HALF: 'yarım',
  GOLD_FULL: 'tam',
  GOLD_REPUBLIC: 'Cumhuriyet',
  GOLD_ATA: 'Ata',
  GOLD_BANGLE_22: 'gr bilezik',
  SILVER_GRAM: 'gr gümüş',
};

export const HESAP_TURU: Record<WalletAccountKind, string> = {
  BANK: 'Banka',
  CASH: 'Nakit',
  INVESTMENT: 'Yatırım',
  OTHER: 'Diğer',
};

export const SIKLIK: Record<WalletFrequency, string> = {
  MONTHLY: 'Aylık',
  WEEKLY: 'Haftalık',
  YEARLY: 'Yıllık',
  ONCE: 'Tek sefer',
};

/** `"3.00"` → `"3"`, `"12.50"` → `"12,5"` — adetli/gramlık birimlerde sade yazım. */
function sade(miktar: string): string {
  const [tam = '0', kesir = ''] = miktar.split('.');
  const temiz = kesir.replace(/0+$/, '');
  const gruplu = tam.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return temiz ? `${gruplu},${temiz}` : gruplu;
}

const paraBirimiMi = (birim: WalletUnit) =>
  birim === 'TRY' || birim === 'USD' || birim === 'EUR' || birim === 'GBP';

/** Geçersiz tutar mesajı: altında ondalık sınırını söyler. */
export const tutarHatasi = (birim: WalletUnit): string =>
  paraBirimiMi(birim)
    ? 'Tutar geçersiz — örn. 25000 ya da 1250,50'
    : 'Miktar geçersiz — en fazla iki ondalık, örn. 2,13';

/** Birimine göre miktar: para birimleri `paraBicim`, altın/gümüş adet ya da gram. */
export function miktarBicim(miktar: string, birim: WalletUnit): string {
  if (birim === 'TRY' || birim === 'USD' || birim === 'EUR' || birim === 'GBP') {
    return paraBicim(miktar, birim);
  }
  return `${sade(miktar)} ${KISA[birim] ?? ''}`.trim();
}

/** TL karşılığı — yoksa "kur yok". */
export function tlBicim(tl: string | null): string {
  return tl === null ? 'kur yok' : paraBicim(tl, 'TRY');
}

/**
 * Kullanıcının yazdığı tutar → sunucu biçimi (`"1250.50"`).
 * "1.250,50" · "1250,5" · "1250.50" · "42.500" · " 3 " hepsi kabul; geçersizse `null`.
 *
 * ⚠️ VİRGÜLSÜZ NOKTA: Türkçede "42.500" kırk iki BİN beş yüz demek. Noktadan
 * sonra tam üç haneli gruplar varsa ("42.500", "1.250.000") nokta binlik
 * ayırıcıdır; bir-iki hane ("12.5", "1250.50") ondalıktır.
 *
 * ⚠️ ALTINDA NOKTA ONDALIKTIR: `birim` altınsa "2.125" iki bin değil 2,125 gram
 * demektir; üç ondalık saklanmadığı için sessizce 1000 katına çıkmak yerine reddedilir.
 */
export function tutarOku(metin: string, birim?: WalletUnit): string | null {
  let t = metin.trim().replace(/\s/g, '');
  if (!t) return null;
  if (birim && !paraBirimiMi(birim)) t = t.replace(',', '.');
  else if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(t)) return null;
  return t;
}

/** Sunucu biçimi → formdaki yazım (`"1250.50"` → `"1250,50"`). */
export const tutarYaz = (t: string): string => t.replace('.', ',');

const GUN_EKI = ['', "'i", "'si", "'ü", "'ü", "'i", "'sı", "'si", "'i", "'u"];
const ONLUK_EKI = ["'u", "'si", "'u"];

/** `3` → "ayın 3'ü", `10` → "ayın 10'u". SAF. */
export function ayinGunu(gun: number): string {
  const ek = gun % 10 === 0 ? ONLUK_EKI[gun / 10 - 1] : GUN_EKI[gun % 10];
  return `ayın ${gun}${ek ?? ''}`;
}
