/** Gösterilebilen para birimleri (Cüzdan'ın döviz kalemleri de bunlardan). */
export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';

/**
 * PARA BİÇİMLENDİRME — ADR-014/D, KAYIPSIZ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN `Number()` YOK VE `Intl.NumberFormat` YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-014/D: `Decimal` sınırda `string`'e çevriliyor ve formatlama arayüzün işi.
 * Yasak olan şey `Number()`'a çevirip HESAP YAPMAK, ama burada hesap bile yok —
 * yine de sayıya hiç çevrilmiyor ve sebebi somut:
 *
 *   `Number('1234567890123.45')` → 1234567890123.45  ✓
 *   `Number('12345678901234567.89')` → 12345678901234568  ✗ sessizce bozulur
 *
 * Panelin bugünkü tutarları o aralığa girmiyor; mesele bu fonksiyonun bir gün
 * başka bir alana (toplam, bakiye) uygulanması. `Intl.NumberFormat` da `number`
 * istiyor, yani aynı dönüşümü gizlice yapar. Dize üzerinde gruplamak ise hiçbir
 * girdide hassasiyet kaybetmiyor.
 *
 * DİKKAT: bu fonksiyon TOPLAMA YAPMAZ ve yapmamalı. Toplamlar sunucuda
 * `Decimal` ile hesaplanıp `baseAmount` olarak geliyor (ADR-014).
 */

/** Para birimi simgesi — tutarın SONUNDA, Türkçe yazım. */
const SIMGE: Record<Currency, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * `"1250.5"` → `"1.250,50 ₺"`.
 *
 * Tam kısım binlik ayracıyla gruplanıyor (nokta), ondalık virgülle yazılıyor —
 * tr-TR yazımı. Ondalık her zaman İKİ BASAMAK: `moneySchema` en fazla iki
 * basamak kabul ediyor ve sütun hizalanması için sabit genişlik şart (§3.2
 * `tabular-nums` yalnızca rakam genişliğini eşitler, basamak sayısını değil).
 */
export function paraBicim(tutar: string, birim: Currency): string {
  const eksi = tutar.startsWith('-');
  const mutlak = eksi ? tutar.slice(1) : tutar;
  const [tam = '0', kesir = ''] = mutlak.split('.');

  /* Sağdan üçerli gruplama — dize üzerinde, sayıya çevirmeden. */
  const gruplu = tam.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const ikiBasamak = (kesir + '00').slice(0, 2);

  return `${eksi ? '-' : ''}${gruplu},${ikiBasamak} ${SIMGE[birim]}`;
}

/**
 * Kur gösterimi — `"34.12345678"` → `"34,12345678"`.
 *
 * Basamak SAYISI KORUNUYOR, yuvarlanmıyor: kur kaydın kendi gerçeği ve
 * `fxRateSchema` sekiz basamağa kadar kabul ediyor. İki basamağa kısaltmak,
 * kaydedilenden farklı bir kur göstermek olurdu.
 */
export function kurBicim(kur: string): string {
  return kur.replace('.', ',');
}

/**
 * Tutar YOKSA ne yazılacağı — tek yerde.
 *
 * Opsiyonel tutar alanlarında boş hücre "tutar yok" ile "okunamadı"yı ayırmaz.
 */
export const TUTAR_YOK = '—';

export function paraBicimVeyaYok(tutar: string | null, birim: Currency): string {
  return tutar === null ? TUTAR_YOK : paraBicim(tutar, birim);
}

/**
 * Dar kartta tutarın yazı boyutu (2026-11-01). Kırpılan tutar yanlış okunur
 * (`1.234.56…`), bu yüzden uzadıkça kırpılmak yerine küçülür. SAF.
 */
export function tutarYaziBoyu(metin: string, normal: string): string {
  if (metin.length >= 14) return 'text-sm';
  if (metin.length >= 12) return 'text-base';
  return normal;
}
