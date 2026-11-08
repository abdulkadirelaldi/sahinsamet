import { db } from '@/server/db';

/**
 * YAZMA KAPISI — ADR-035/B (T-046).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE YAPIYOR, NE YAPMIYOR — AD BUNU SÖYLÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `User.writesValidFrom`'dan ÖNCE verilmiş bir jeton YAZMA yetkisini kaybeder.
 * Oturum KAPANMAZ: jeton hâlâ geçerlidir, panel sayfaları hâlâ açılır. Kapatılan
 * tek şey mutasyonlardır.
 *
 * Okumaları da kapatmak ara katmanda bir veritabanı okuması gerektirirdi; ara
 * katman Edge'de koşuyor ve Prisma orada yüklenemiyor — T-014/K1'de bulunmuş,
 * T-044g'de yeniden ölçülmüştü (`UnhandledSchemeError`, build EXIT 1). O katman
 * F6/T-062'ye ertelendi (ADR-035/C).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MALİYET: YAZMA BAŞINA BİR SORGU, OKUMADA SIFIR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu modülün TEK çağıranı `actions/_shared.ts`'teki `currentActorId()` — yani
 * her Server Action'ın geçtiği tek kapı. Okuma yolları (Server Component'lerin
 * çağırdığı `fetchXForPanel` ve public `getX`) bu dosyayı HİÇ içe aktarmaz.
 *
 * Ölçülen sorgu maliyeti p50 0,49 ms / p95 0,92 ms (T-044g, 200 koşu).
 * `tests/unit/actions/yazma-kapisi.test.ts` çağıran kümesini kaynaktan
 * doğruluyor — kapı bir gün okuma yoluna sızarsa test kırılır.
 */

/** Kapının Prisma'dan ihtiyaç duyduğu asgari yüzey. */
export interface WriteGateClient {
  user: {
    findUnique(args: {
      where: { id: string };
      select: { writesValidFrom: true };
    }): Promise<{ writesValidFrom: Date | null } | null>;
  };
}

/**
 * Bu jetonun yazma yetkisi geçersizleştirilmiş mi?
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KARŞILAŞTIRMA SANİYE HASSASİYETİNDE — SINIR ÖNEMLİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * JWT `iat` SANİYE cinsindendir ve aşağı yuvarlanır; `writesValidFrom` ise
 * milisaniye taşıyan bir `Date`. Doğrudan `iat * 1000 < validFrom` yazılsaydı,
 * damgadan HEMEN SONRA (aynı saniye içinde) açılan YEPYENİ bir oturum da
 * geçersiz sayılırdı: `validFrom = 1000.500 sn` iken `iat = 1000` olur ve
 * `1.000.000 < 1.000.500` doğrudur. Kullanıcı şifresini değiştirip yeniden
 * giriş yapar, ve yine yazamaz — kilitlenme.
 *
 * Bu yüzden iki taraf da SANİYEYE indiriliyor. Kaybedilen bir şey yok: eski
 * jetonların `iat`i damgadan saniyeler değil saatler öncedir.
 *
 * FAIL-CLOSED: `iat` yoksa ya da kullanıcı kaydı yoksa YAZMA YETKİSİ YOKTUR.
 * Varsayılanı "izin ver" yapmak, alanı taşımayan bozuk bir jetonu
 * geçersizleştirmeden muaf tutardı.
 */
export async function writesRevoked(
  userId: string,
  /** JWT `iat` — saniye cinsinden Unix zamanı. Jeton taşımıyorsa `undefined`. */
  tokenIssuedAt: number | undefined,
  client: WriteGateClient = db,
): Promise<boolean> {
  if (typeof tokenIssuedAt !== 'number' || !Number.isFinite(tokenIssuedAt)) return true;

  const user = await client.user.findUnique({
    where: { id: userId },
    select: { writesValidFrom: true },
  });

  if (!user) return true;

  // Hiç geçersizleştirme yapılmamış — kolonun varsayılanı `NULL` ve bu
  // "yürürlükte bir damga yok" demek. Migration'ın `now()` vermemesinin sebebi:
  // dağıtımın kendisi tüm oturumları yazamaz hâle getirmesin.
  if (!user.writesValidFrom) return false;

  return tokenIssuedAt < Math.floor(user.writesValidFrom.getTime() / 1000);
}
