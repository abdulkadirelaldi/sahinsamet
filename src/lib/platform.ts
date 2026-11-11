/**
 * CİHAZ TÜRÜ (2026-11-11) — bildirim ayarlarında doğru yönergeyi göstermek için. SAF: tarayıcı
 * nesnesine dokunmaz, `userAgent` (ve iPadOS için dokunma noktası sayısı) alır.
 *
 * iPadOS 13+ Safari kendini Mac diye tanıtır; Mac'te dokunmatik ekran yok, `maxTouchPoints > 1`
 * onu ayırır. Üretici (Xiaomi/POCO) AYRILMAZ: Android Chrome kimlik metninde modeli gizliyor
 * ("Android 10; K"), HyperOS yönergesi bu yüzden her Android'de ayrı başlıkla gösterilir.
 */
export type Platform = 'ios' | 'android' | 'diger';

export function platformBul(userAgent: string, maxTouchPoints = 0): Platform {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  return 'diger';
}
