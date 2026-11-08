'use server';

import { changePasswordSchema } from '@/lib/schemas';
import { changePassword, type ChangePasswordFailure } from '@/server/auth/change-password';
import { CHANGE_PASSWORD_RATE_LIMIT } from '@/server/services/user';
import { db } from '@/server/db';
import {
  fail,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiFailure,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * Şifre değiştirme Server Action'ı — §7.1, §8.1, §8.6, §8.20, ADR-022.
 *
 * §7.1 SIRASI: `auth()` → Zod → servis → `AuditLog` → **revalidate YOK**.
 *
 * Son adım neden yok: şifre hiçbir public okumayı ve hiçbir önbellek girdisini
 * etkilemiyor. `ContentEntity` birleşiminde `User` yok, `cached.ts`'teki hiçbir
 * okuma `User` tablosuna bakmıyor, panel rotaları dinamik. T-038'in kuralı
 * burada da geçerli: kopyalanmayacak adımı işaretlemek kalıbın parçası.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ OTURUMLAR KAPANMIYOR — AMA YAZMA YETKİLERİ KALKIYOR (ADR-035/B)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BU BLOK T-046'DA GÜNCELLENDİ. T-042s'teki hâli "şifre değiştirmek ele
 * geçirilmiş bir oturumu kapatmaz" diyordu ve o gün DOĞRUYDU; ADR-035/B ile
 * yarısı değişti. Eski metni bırakmak, çağrı noktasında artık yanlış olan bir
 * gerekçe bırakmak olurdu.
 *
 * BUGÜNKÜ DURUM:
 *   - Başarılı değişiklik `User.writesValidFrom`u damgalıyor.
 *   - O damgadan ÖNCE verilmiş her jeton YAZMA yetkisini kaybediyor
 *     (`currentActorId` → `writesRevoked`). BU OTURUM DA DAHİL.
 *   - Jetonlar hâlâ GEÇERLİ ve panel sayfaları hâlâ AÇILIYOR: okuma tarafı
 *     ara katmanla korunuyor, o da Edge'de ve veritabanı okuyamıyor
 *     (T-014/K1). O katman F6/T-062'ye ertelendi (ADR-035/C).
 *   - Oturum ömrü ayrıca 7 günden 24 saate indi (ADR-035/A).
 *
 * ARAYÜZ İÇİN BAĞLAYICI METİN (ADR-035):
 *   ✅ "Şifreniz değiştirildi. Güvenlik için açık olan tüm oturumlar —bu cihaz
 *      dahil— artık değişiklik yapamaz; değişiklik yapmak için yeniden giriş
 *      yapmanız gerekiyor. Oturumlar kapatılmadı, yalnızca değişiklik
 *      yetkileri kaldırıldı."
 *   ✅ Kısa: "Diğer cihazlar artık değişiklik yapamaz."
 *   ❌ "Tüm cihazlardan çıkış yapıldı." / "Diğer oturumlar sonlandırıldı."
 *      — hâlâ YASAK; tutulamayacak sözdür (T-034'ün "410" dersi).
 *
 * "Bu cihaz dahil" atlanamaz: kullanıcı değişiklikten hemen sonra bir kaydetme
 * denerse `UNAUTHORIZED` görecek ve sebebini bilmeli.
 */

/** Servis sebebini §7.2 zarfına çevirir — `fields` FORM ALAN ADLARIYLA birebir. */
function toApiFailure(reason: ChangePasswordFailure): ApiFailure {
  switch (reason) {
    case 'USER_NOT_FOUND':
      // Oturum geçerli ama kullanıcı kaydı yok. UNAUTHORIZED değil: oturum
      // sahteliği değil, veri tutarsızlığı.
      return notFound('Kullanıcı kaydı bulunamadı.');

    case 'INVALID_CURRENT_PASSWORD':
      /*
       * `UNAUTHORIZED` DEĞİL, alan hatası. Oturum GEÇERLİ; yanlış olan bir form
       * alanı. `UNAUTHORIZED` dönmek Frontend'i kullanıcıyı giriş ekranına
       * atmaya iterdi — oysa kullanıcının yapması gereken tek şey alanı
       * düzeltmek.
       */
      return fail('VALIDATION_ERROR', 'Mevcut şifreniz yanlış.', {
        currentPassword: 'Mevcut şifreniz yanlış.',
      });

    case 'TOTP_REQUIRED':
      return fail('VALIDATION_ERROR', 'Doğrulama kodu gerekli.', {
        totpCode: 'Hesabınızda iki adımlı doğrulama açık; kodu girin.',
      });

    case 'INVALID_TOTP':
      return fail('VALIDATION_ERROR', 'Doğrulama kodu geçersiz.', {
        totpCode: 'Kod geçersiz veya süresi dolmuş.',
      });

    case 'SAME_PASSWORD':
      return fail('VALIDATION_ERROR', 'Yeni şifre mevcut şifreyle aynı olamaz.', {
        newPassword: 'Yeni şifre mevcut şifreyle aynı olamaz.',
      });

    case 'RATE_LIMITED':
      // §7.2 kodu. `fields` YOK — düzeltilecek bir alan değil, beklenecek bir süre.
      return fail(
        'RATE_LIMITED',
        `Çok fazla başarısız deneme yapıldı. ${CHANGE_PASSWORD_RATE_LIMIT.windowMinutes} dakika sonra tekrar deneyin.`,
      );
  }
}

/**
 * Başarısız bir şifre değiştirme denemesini kaydeder — ADR-022 okuması.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN `LoginAttempt` DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-022: "`LoginAttempt` her GİRİŞ denemesini, `AuditLog` denemenin yol
 * açtığı KALICI DURUM DEĞİŞİKLİĞİNİ kaydeder." Buradaki olay ikisine de tam
 * oturmuyor: giriş denemesi değil (oturum açılmıyor, zaten açık) ve kalıcı bir
 * durum değişikliği de değil (hiçbir şey değişmedi).
 *
 * Ama `LoginAttempt`in ÖLÇÜLEBİLİR bir yan etkisi var ve kararı o belirliyor:
 * o tablo §8.4 hız sınırının VERİ KAYNAĞI ve sayım IP başına yapılıyor. Şifre
 * değiştirirken beş kez yanlış yazmak, kullanıcıyı KENDİ GİRİŞİNDEN 15 dakika
 * kilitlerdi — yanlış yarıçapta bir ceza, ve kendi kendine DoS.
 *
 * Bu tam olarak T-015b'de kurulum hız sınırı için verilen kararın aynısı:
 * "kurulum fumbling'i hesabı kilitlememeli" denip sayaç `AuditLog`a alınmıştı.
 * `actions/totp.ts`'teki `recordTotpFailure` da aynı kalıbı izliyor. Yani
 * kod tabanının bu sınıf için zaten bir cevabı var ve tutarlı kalıyorum.
 *
 * `LOGIN_FAILED` seçildi: `AuditAction` içinde şifre değiştirmeye özel bir
 * değer yok ve eklemek migration gerektirir. Ayırt edici bilgi `diff.context`.
 *
 * ASLA FIRLATMAZ — `writeAuditLog`un sözleşmesi bu.
 */
async function recordFailedAttempt(
  userId: string,
  reason: ChangePasswordFailure,
  /** Sayaç bağlamı. Varsayılan sayılan bağlam; aşım kaydı bilerek AYRI geçer. */
  context: string = 'CHANGE_PASSWORD',
): Promise<void> {
  await writeAuditLog(
    {
      actorId: userId,
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: userId,
      /*
       * §8.20 — `diff`e YALNIZCA sebep kodu giriyor. Ne girilen şifre, ne
       * uzunluğu, ne ilk harfi, ne de bir parçası. `redactAuditDiff` alan adı
       * bazlı çalışır ve `password` anahtarını maskelerdi; ama T-038'in dersi
       * tam olarak buydu: FARKLI ADLI bir anahtara konan sır maskelenmez.
       * Tek güvenilir koruma sırrı diff'e HİÇ KOYMAMAK.
       */
      diff: { context, reason },
    },
    db,
  );
}

export async function changePasswordAction(raw: unknown): Promise<ApiResponse<null>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(changePasswordSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await changePassword(actorId, parsed.data);

    if (!sonuc.ok) {
      // Başarısız kimlik adımları kaydedilir; şema hataları (zayıf şifre,
      // tekrar uyuşmazlığı) kaydedilmez — onlar bir saldırı sinyali değil,
      // yazım hatasıdır ve denetim kaydını gürültüyle doldururlardı.
      if (sonuc.reason === 'INVALID_CURRENT_PASSWORD' || sonuc.reason === 'INVALID_TOTP') {
        await recordFailedAttempt(actorId, sonuc.reason);
      }

      /*
       * ⚠️ AŞIM KAYDI **FARKLI BİR BAĞLAMLA** YAZILIYOR — sayacı beslemesin.
       *
       * `CHANGE_PASSWORD` bağlamıyla yazılsaydı, sınıra takılan her istek
       * sayaca bir satır daha eklerdi ve pencere 5. denemeden değil SON
       * denemeden itibaren sayılmaya başlardı. Sonuç: saldırgan boş istek
       * yağdırarak hesabı SÜRESİZ kilitli tutabilirdi — hız sınırı, korumaya
       * çalıştığı kullanıcıya karşı bir silaha dönüşürdü.
       *
       * Ayrı bağlam denetlenebilirliği korurken sayacın dışında kalıyor
       * (`AUTH_FAILURE_CONTEXTS.changePassword` yalnızca `CHANGE_PASSWORD`
       * içeriyor). `tests/unit/actions/sifre-degistirme.test.ts` bunu ölçüyor.
       */
      if (sonuc.reason === 'RATE_LIMITED') {
        await recordFailedAttempt(actorId, 'RATE_LIMITED', 'CHANGE_PASSWORD_RATE_LIMITED');
      }
      return toApiFailure(sonuc.reason);
    }

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'User',
        entityId: actorId,
        /*
         * §8.20 — ŞİFRE HİÇBİR BİÇİMDE YAZILMIYOR: ne eski, ne yeni, ne hash,
         * ne parçası. `buildDiff` KULLANILMADI çünkü önce/sonra değerlerini
         * taşımak burada şifreyi taşımak demek olurdu. Denetim kaydının
         * cevaplaması gereken soru "şifre ne zaman, kim tarafından değişti" —
         * yeni şifrenin NE OLDUĞU değil.
         */
        diff: { context: 'CHANGE_PASSWORD', changed: 'passwordHash' },
      },
      db,
    );

    // `data: null` — dönecek bir şey YOK ve olmamalı. Kullanıcı nesnesi
    // döndürmek, hiçbir işe yaramadan hassas alanları yanıta taşıma riski açar.
    return ok(null);
  } catch (error) {
    return toFailure('password:change', error);
  }
}
