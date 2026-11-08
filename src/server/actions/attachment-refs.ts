import { findMissingAttachmentIds } from '@/server/services/attachment';
import { fail, type ApiFailure } from '@/server/services/_shared';

/**
 * EKLENTİ REFERANSI KAPISI — T-051/B.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KARAR: `fields` DOLDURULUYOR — AMA HATA KABUĞUNDAN DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-050'de `P2003` için `fields` boş bırakılmıştı ve gerekçem ŞUYDU: "Prisma'nın
 * `meta.field_name`i kısıt adını taşıyor, sezgiselle yanlış alanı işaretlemek
 * hiç işaretlememekten kötü olurdu."
 *
 * ORKESTRA ŞEFİ ÖLÇTÜ VE GEREKÇEM YANLIŞTI. Gerçek kabuk:
 *
 *     code: P2003
 *     meta: { modelName: "Profile",
 *             driverAdapterError: { cause: {
 *               originalCode: "23503",
 *               kind: "ForeignKeyConstraintViolation",
 *               constraint: { index: "profile_avatarAttachmentId_fkey" } } } }
 *
 * `meta.field_name` HİÇ YOK — ama kısıt adı alan adını İÇERİYOR ve ayrıştırması
 * mekanik (`<tablo>_` ön eki + `_fkey` son eki). Yani "sezgisel" değil,
 * belirlenimci. Gerekçem çürütüldü.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * YİNE DE KABUĞU AYRIŞTIRMIYORUM — ÇÜNKÜ GEREK YOK
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Kabuk `meta.driverAdapterError.cause.constraint.index` altında, İÇ İÇE ve
 * SÜRÜCÜ BAĞDAŞTIRICISINA ÖZGÜ — Prisma'nın belgelenmiş hata sözleşmesinin
 * parçası değil. Bağdaştırıcı sürümüyle değişebilir ve değiştiği gün alan
 * ipucu sessizce kaybolur.
 *
 * Ama bu bir ikilem değil: alan adını ZATEN BİLİYORUZ. Kontrolü yazmadan önce
 * KENDİMİZ yapıyoruz (`findMissingAttachmentIds`), yani hangi form alanının
 * bozuk kimlik taşıdığı bize ait bir bilgi. Belgelenmemiş bir kabuktan
 * kurtarmaya çalıştığımız şey, kendi sorgumuzdan kesin olarak geliyor.
 *
 * Kartın şartı ("kabuk değişince sessizce boş `fields`'a düşmesin") böylece
 * YAPISAL olarak karşılanıyor: bağlı olduğumuz bir kabuk yok.
 *
 * `P2003` dalı `_shared.ts`'te YARIŞ KORUMASI olarak duruyor: dosya kontrol ile
 * yazma arasında silinirse FK yine tetiklenir. O durumda genel mesaj DOĞRU
 * olandır — kullanıcının düzeltebileceği bir alan yoktur, dosya gerçekten
 * kaybolmuştur.
 */

/**
 * Gönderilen eklenti referanslarını doğrular — bulunamayan varsa §7.2 zarfı.
 *
 * `refs` ANAHTARLARI FORM ALAN ADLARIDIR: `fields` doğrudan onlardan kuruluyor,
 * yani Frontend hatayı ilgili gizli alanın sahibi girdinin altına basabilir.
 *
 * `null` = hepsi geçerli (ya da hiç referans gönderilmemiş).
 */
export async function missingAttachmentFailure(
  refs: Record<string, string | null | undefined>,
): Promise<ApiFailure | null> {
  const eksikler = await findMissingAttachmentIds(Object.values(refs));
  if (eksikler.length === 0) return null;

  const eksikKume = new Set(eksikler);
  const fields: Record<string, string> = {};

  for (const [alan, id] of Object.entries(refs)) {
    if (typeof id === 'string' && eksikKume.has(id)) {
      fields[alan] = 'Seçilen dosya bulunamadı — yeniden seçin.';
    }
  }

  /*
   * `fields` BOŞ KALAMAZ: `eksikler` dolu olduğu hâlde hiçbir alana
   * eşleşmemesi, `refs` ile sorgulanan kümenin ayrışması demek olurdu —
   * yani bu fonksiyonun kendi içinde bir mantık hatası. Sessizce genel mesaja
   * düşmek o hatayı gizlerdi; kartın "sessizce boş fields'a düşmesin" şartı
   * burada da geçerli.
   */
  if (Object.keys(fields).length === 0) {
    return fail(
      'VALIDATION_ERROR',
      'Seçilen dosya bulunamadı — yüklenmemiş ya da silinmiş olabilir. ' +
        'Dosyayı yeniden seçip kaydedin.',
    );
  }

  return fail(
    'VALIDATION_ERROR',
    'Seçilen dosya bulunamadı — yüklenmemiş ya da silinmiş olabilir. ' +
      'Dosyayı yeniden seçip kaydedin.',
    fields,
  );
}
