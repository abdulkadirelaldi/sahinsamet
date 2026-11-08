/**
 * `Decimal` → `string` dönüşümü — ADR-014.
 *
 * SERVİS SINIRI KURALI: hiçbir servis dışarıya Prisma `Decimal` DÖNDÜRMEZ.
 *
 * Neden: Prisma `Decimal`, JS tarafında bir `Decimal.js` NESNESİDİR ve Server
 * Component → Client Component sınırında serialize EDİLEMEZ. Frontend'e sızarsa
 * çalışma zamanı hatası verir (R4). Dönüşüm tek noktada, DTO kurulurken yapılır.
 *
 * `Prisma.Decimal` tipi BURAYA İTHAL EDİLMEZ: yapısal bir arayüz yeterli ve
 * böylece bu modül üretilen istemciden bağımsız kalır, testte sahte değer
 * verilebilir.
 */

/** `Decimal.js` benzeri her nesne — tek ihtiyacımız `toFixed`. */
export interface DecimalLike {
  toFixed(decimalPlaces?: number): string;
}

export function isDecimalLike(value: unknown): value is DecimalLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as DecimalLike).toFixed === 'function'
  );
}

/** Ondalık basamak sayısı verilen genel dönüştürücü. */
export function toDecimalString(value: DecimalLike, scale: number): string;
export function toDecimalString(value: null | undefined, scale: number): null;
export function toDecimalString(
  value: DecimalLike | null | undefined,
  scale: number,
): string | null;
export function toDecimalString(
  value: DecimalLike | null | undefined,
  scale: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (!isDecimalLike(value)) {
    throw new TypeError('Decimal bekleniyordu.');
  }
  return value.toFixed(scale);
}

/** Para alanları — `Decimal(12,2)`. `amount`, `baseAmount`, `agreedAmount`. */
export function toMoneyString(value: DecimalLike): string;
export function toMoneyString(value: null | undefined): null;
export function toMoneyString(value: DecimalLike | null | undefined): string | null;
export function toMoneyString(value: DecimalLike | null | undefined): string | null {
  return toDecimalString(value, 2);
}

/** Kur alanı — `Decimal(18,8)`. */
export function toRateString(value: DecimalLike): string;
export function toRateString(value: null | undefined): null;
export function toRateString(value: DecimalLike | null | undefined): string | null;
export function toRateString(value: DecimalLike | null | undefined): string | null {
  return toDecimalString(value, 8);
}

/**
 * Ölçüm alanları (kilo, uyku saati, vücut yağı) — şema ondalığı alan başına
 * değişir, bu yüzden `scale` açıkça verilir.
 */
export function toMeasureString(
  value: DecimalLike | null | undefined,
  scale: number,
): string | null {
  return toDecimalString(value, scale);
}
