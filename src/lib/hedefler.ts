/**
 * KİŞİSEL GÜNLÜK HEDEFLER (2026-10-30) — varsayılanlar tek yerde. Kişisel değerler
 * `bildirim_tercihi` satırında; satır yoksa bunlar geçerli (2026-11-01).
 */

/** Günlük su hedefi — sahibinin "su iç 3.5L" alışkanlığı. */
export const SU_HEDEFI_ML = 3500;

/** Su hatırlatmasının saatleri (İstanbul). */
export const SU_SAATLERI: readonly number[] = [11, 15, 18];

/** Kalan alışkanlık hatırlatmasının başladığı saat (İstanbul). */
export const ALISKANLIK_SAATI = 21;

/** 3500 → "3,5" */
export function litreBicim(ml: number): string {
  return (ml / 1000).toLocaleString('tr-TR');
}
