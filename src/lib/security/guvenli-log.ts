/**
 * GÜVENLİ LOG — §8.20 "Loglarda şifre, token, TOTP secret, tam e-posta ASLA
 * görünmez" (T-062).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN TEK BİR KAPI GEREKTİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-062'de sunucu tarafında ~30 `console.error/warn` vardı ve çoğu bir
 * hatanın `message`ini OLDUĞU GİBİ basıyordu. Mesajı biz yazmıyoruz:
 *
 *   - Prisma'nın doğrulama hataları sorgu ARGÜMANLARINI mesaja koyuyor —
 *     `user.update({ data: { email, passwordHash } })` düşerse ikisi de loga.
 *   - `pg` bağlantı hataları bağlantı dizesini taşıyabiliyor
 *     (`postgresql://kullanici:PAROLA@host`).
 *   - Genel hata yolu (`internalError`) TÜM eylemlerin `catch`i — yani tek
 *     bir sızıntı yolu değil, hepsinin ortak çıkışı.
 *
 * `redactAuditDiff` (ADR-034) ada bağlı ve denetim kaydı içindi; serbest
 * METNE uygulanamaz. Burası metin üzerinde DESEN ile çalışıyor.
 *
 * ⚠️ BU DA BİR EMNİYET AĞI (ADR-034'ün dersi): bilinmeyen biçimdeki bir sırrı
 * yakalayamaz. Asıl kural değişmedi — sır bir log çağrısına HİÇ verilmez.
 * Bu modül, kontrolümüz dışındaki metnin (kütüphane hata mesajları) sızma
 * yolunu daraltıyor.
 *
 * Edge uyumlu: Node API'si yok (ara katman `session.ts` üzerinden kullanıyor).
 */

const GIZLI = '[gizli]';

/**
 * Sıra ÖNEMLİ: önce bütünlüklü biçimler (bağlantı dizesi, JWT, argon2,
 * otpauth), sonra e-posta, EN SONDA genel "uzun gizli dize". Genel desen önce
 * koşsaydı bir JWT'nin parçalarını ayrı ayrı yer ve hangi tür sırrın
 * maskelendiği kaybolurdu.
 */
const DESENLER: ReadonlyArray<[RegExp, string | ((eslesme: string) => string)]> = [
  // Bağlantı dizesi: şema kalır, kullanıcı:parola@ maskelenir.
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@:'"]+(?::[^\s/@'"]*)?@/gi, `$1${GIZLI}@`],
  // JWT / JWE (üç ya da beş nokta ayrımlı base64url parçası).
  [/\beyJ[\w-]+(?:\.[\w-]*){2,4}/g, '[jwt]'],
  // argon2 hash'i.
  [/\$argon2(?:id|i|d)\$[^\s"',]+/g, '[hash]'],
  // TOTP kurulum adresi — secret parametre olarak içinde.
  [/otpauth:\/\/[^\s"']+/gi, '[otpauth]'],
  // Authorization başlığı.
  [/\bBearer\s+[^\s"']+/gi, `Bearer ${GIZLI}`],
  // E-posta: yerel kısım maskelenir, alan adı kalır (teşhis için yeterli).
  [
    /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    (e) => e.replace(/^(.)[^@]*@/, '$1***@'),
  ],
  // 32+ karakterlik base64/hex dizisi — anahtar, secret, imza.
  [/\b[A-Za-z0-9+/_-]{32,}={0,2}/g, GIZLI],
];

/** Serbest metindeki bilinen sır biçimlerini maskeler — SAF. */
export function redactLogText(metin: string): string {
  let sonuc = metin;
  for (const [desen, yerine] of DESENLER) {
    sonuc =
      typeof yerine === 'string'
        ? sonuc.replace(desen, yerine)
        : sonuc.replace(desen, (e) => yerine(e));
  }
  return sonuc;
}

/**
 * Bir log parçasını güvenli dizeye çevirir.
 *
 * `Error` → `ad: mesaj` (yığın izi YOK — yığın izi de mesajı içeriyor ve
 * §8.20 yanıta değil ama loga da gereksiz ayrıntı taşımaz). Nesne → JSON
 * (döngüye karşı korumalı). Hepsi `redactLogText`ten geçer.
 */
export function guvenliParca(parca: unknown): string {
  if (parca instanceof Error) return redactLogText(`${parca.name}: ${parca.message}`);
  if (typeof parca === 'string') return redactLogText(parca);
  if (parca === undefined) return 'undefined';
  try {
    return redactLogText(JSON.stringify(parca));
  } catch {
    return '[yazdırılamayan değer]';
  }
}

/** `console.error`ın güvenli karşılığı — imza aynı, her parça maskeleniyor. */
export function guvenliHata(...parcalar: unknown[]): void {
  console.error(...parcalar.map(guvenliParca));
}

/** `console.warn`ın güvenli karşılığı. */
export function guvenliUyari(...parcalar: unknown[]): void {
  console.warn(...parcalar.map(guvenliParca));
}
