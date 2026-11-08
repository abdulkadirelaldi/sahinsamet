/**
 * argon2id PHC dizesi biçimi — `$argon2id$v=19$m=…,p=…,t=…$<tuz>$<özet>`.
 *
 * ⚠️ PARAMETRE SIRASI SERBEST (T-071'de ölçüldü): ilk sürüm `m,t,p` bekliyordu
 * ve projenin KENDİ `hashPassword` çıktısını (`m=…,p=…,t=…`) reddetti. Biçim
 * kontrolünü uydurma bir örnekle değil gerçek çıktıyla sınamak bunu yakaladı
 * (`tests/unit/argon2-bicimi.test.ts`).
 *
 * Kullanım: `scripts/uretim-baslat.ts` — Compose'un tırnaksız `$`lı değeri
 * sessizce parçalamasına karşı (bozuk hash ile oluşan yönetici giriş yapamaz).
 */
export const ARGON2ID_BICIMI =
  /^\$argon2id\$v=\d+\$(?:[mtp]=\d+,){2}[mtp]=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/;

export function argon2idGibi(deger: string): boolean {
  return ARGON2ID_BICIMI.test(deger);
}
