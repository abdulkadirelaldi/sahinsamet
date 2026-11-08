/**
 * Servis katmanı ortak yardımcıları — T-015.
 *
 * F3–F5'teki her varlık servisi bunları tüketir. Yeni bir hesaplama yardımcısı
 * buraya eklenir; varlığa özel iş mantığı EKLENMEZ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ BU BARREL SAFTIR — ÇALIŞMA ZAMANINDAN BAĞIMSIZ (BULGU-012)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Buradan ihraç edilen hiçbir modül `next/*` İÇE AKTARMAZ, doğrudan ya da
 * dolaylı. Sebep: seed ve §13.5'in cron betikleri DÜZ NODE ile koşar; Next'e
 * bağlı bir modül zincire girerse `ERR_MODULE_NOT_FOUND: next/cache` ile
 * ölürler — betik önbellekle hiç ilgilenmiyor olsa bile. BULGU-012 tam olarak
 * buydu: `content-cache.ts` bu barrel'dan ihraç ediliyordu ve `pnpm db:seed`
 * iki gün boyunca CI'ı kırmızı tuttu.
 *
 * Next'e bağlı önbellekleme `./content-cache` içindedir ve BURADAN İHRAÇ
 * EDİLMEZ; çağıranı `@/server/services` üst barrel'ından alır.
 *
 * Kural `tests/unit/services/runtime-bagimsizligi.test.ts` ile ZORLANIYOR.
 */

export * from './api-response';
export * from './app-date';
export * from './audit';
export * from './file-type';
export * from './content-query';
export * from './decimal';
export * from './donem';
export * from './money';
export * from './panel-query';
export * from './personal-record';
export * from './site-url';
