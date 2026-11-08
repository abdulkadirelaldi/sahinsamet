/**
 * Uygulama genelinde paylaşılan sabitler.
 * T-001'de yalnızca iskelet — para/tarih formatları ve modül sabitleri
 * ilgili fazlarda buraya eklenecek (§4.3).
 */

export const SITE_NAME = 'Samet Şahin' as const;

/** Ad baş harfleri — marka işareti, ikonlar, avatar yer tutucusu. */
export const SITE_INITIALS = 'SŞ' as const;

/** §6 — para alanlarının varsayılan birimi. */
export const DEFAULT_CURRENCY = 'TRY' as const;

/** §3.2 / §6 — tüm gün-bazlı hesaplamalar bu zaman diliminde yapılır. */
export const APP_TIMEZONE = 'Europe/Istanbul' as const;

export const DEFAULT_LOCALE = 'tr-TR' as const;
