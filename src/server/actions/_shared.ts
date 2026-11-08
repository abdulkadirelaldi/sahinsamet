import { auth } from '@/server/auth';
import { writesRevoked } from '@/server/auth/write-gate';
import { fail, internalError, unauthorized, type ApiFailure } from '@/server/services/_shared';

/**
 * Server Action ortak parçaları — §7.1, §8.6.
 *
 * ADR-029'un etiket hesabı BURADA DEĞİL, `./tags.ts` içinde: bu dosya `auth()`
 * yüzünden `next-auth` içe aktarıyor ve o modül Vitest'in `node` ortamında
 * yüklenemiyor. Ayrımın gerekçesi `tags.ts`'in başında.
 *
 * BURAYA YALNIZCA GERÇEKTEN ORTAK OLAN ŞEY GİRER. §7.1'in sırası
 * (`auth()` → Zod → servis → `AuditLog` → `revalidateTag`) her action'ın
 * GÖVDESİNDE AÇIKÇA yazılıdır ve bir fabrikaya gömülmemiştir — F3'ün dört CRUD
 * ekranı, F4'ün muhasebesi ve F5'in tamamı bu sırayı KOPYALAYACAK. Sıra
 * gizlenirse kopyalanamaz; kopyalanamayan bir kalıp da uygulanmaz.
 */

/* ===========================================================================
 * 1. YETKİ — §8.6
 * ======================================================================== */

/**
 * Oturum sahibinin kimliği; oturum yoksa VEYA yazma yetkisi geçersizleştirilmişse
 * `null`.
 *
 * §8.6: HER action bunu KENDİ İÇİNDE çağırır. Middleware'e güvenilmez — matcher
 * yanlış yazılmış olabilir, ara katman atlanabilir, ve Server Action'lar
 * middleware'in görmediği bir POST yüzeyi açar. Yetki kontrolü mutasyonun
 * kendisinde durmalı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ADR-035/B — YAZMA KAPISI BURADA, VE YALNIZCA BURADA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `writesRevoked` bu fonksiyonun İÇİNDE çağrılıyor, `auth()`'un jwt/session geri
 * çağrısında DEĞİL. Sebep ölçülmüş bir takas:
 *
 *   - Buraya konunca sorgu YALNIZCA Server Action'larda koşar; okuma yolları
 *     (`fetchXForPanel`, public `getX`) veritabanına fazladan HİÇ gitmez ve
 *     "normal istek yolu DB'ye gitmez" mimari özelliği okuma tarafında KORUNUR.
 *   - Geri çağrıya konsaydı `auth()` çağıran her yol sorguya bağlanırdı ve
 *     karşılığında hiçbir OKUMA korunmazdı: okuma koruması ara katmanda, o da
 *     Edge'de ve veritabanı okuyamıyor (T-014/K1, T-044g).
 *
 * Maliyet: Server Action başına +1 sorgu, p50 0,49 ms (T-044g ölçümü).
 *
 * `null` DÖNÜYOR, ayrı bir hata kodu değil: on yedi action'ın hepsi zaten
 * `if (!actorId) return unauthorized()` yazıyor, yani kapı hiçbir çağıranı
 * değiştirmeden yürürlüğe giriyor. Kullanıcı için sonuç doğru: o oturum artık
 * yazma için yetkili değil ve yeniden giriş yapması gerekiyor (ADR-035'in
 * kullanıcıya söylenecek cümlesi).
 */
export async function currentActorId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  // §8.1 ara katmana bırakılmaz: 2FA kurulmamış, yalnızca şifreyle açılmış oturum yazamaz.
  if (session?.tfa === false) return null;

  if (await writesRevoked(userId, session?.tokenIssuedAt)) return null;

  return userId;
}

/** Yalnızca 2FA KURULUM eylemleri: kurulum tam da 2FA henüz yokken yapılır. */
export async function kurulumActorId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  if (await writesRevoked(userId, session?.tokenIssuedAt)) return null;
  return userId;
}

export { unauthorized };

/* ===========================================================================
 * 2. HATA EŞLEME
 * ======================================================================== */

/** Prisma'nın bilinen hata kodları — `instanceof` yerine ördek tipi. */
function prismaErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * P2002'nin hangi alanlardan doğduğu (`meta.target`). Prisma sürüme göre dizi
 * ya da kısıt adı (metin) veriyor; ikisi de ad içeriyor.
 */
function benzersizlikHedefi(error: unknown): string {
  const hedef = (error as { meta?: { target?: unknown } }).meta?.target;
  return Array.isArray(hedef) ? hedef.join(',') : typeof hedef === 'string' ? hedef : '';
}

/**
 * Servis hatasını §7.2 zarfına çevirir.
 *
 * İKİ PRISMA HATASI KULLANICI HATASIDIR, sunucu hatası değil:
 *
 *   P2002 — benzersizlik ihlali. İçerikte bu neredeyse her zaman `@@unique([slug,
 *           locale])`dir: kullanıcı var olan bir slug'ı yeniden kullandı.
 *           `INTERNAL_ERROR` dönmek ona "bir şeyler ters gitti" der ve
 *           DÜZELTEBİLECEĞİ bir şeyi gizlerdi.
 *   P2025 — kayıt yok. Başka bir sekmede silinmiş bir kaydı düzenlemek.
 *
 * Diğer her şey `internalError`dan geçer: ayrıntı loga, kullanıcıya sabit mesaj
 * (§8.20 — yığın izi ve veritabanı metni yanıta GİRMEZ).
 *
 * `conflict` PARAMETRESİ (T-038): P2002'nin varsayılan metni slug'a özeldir,
 * çünkü içerik varlıklarında benzersizlik ihlali daima `@@unique([slug, locale])`
 * demekti. Mesaj→iş dönüşümünde ise `Job.contactMessageId @unique` ihlal olur ve
 * kullanıcıya "slug zaten kullanılıyor" demek ANLAMSIZDIR — ortada slug yok.
 * Varsayılanı bozmadan, çağıranın kendi metnini vermesine izin veriliyor.
 */
/** Varsayılan metnin yanlış kaldığı durumlarda çağıranın verdiği metinler. */
export interface FailureOverrides {
  /** P2002 — benzersizlik ihlali. Varsayılan metin slug'a özeldir. */
  conflict?: { message: string; fields?: Record<string, string> };
  /**
   * P2003 — yabancı anahtar ihlali. Varsayılan metin EKLENTİYE özeldir.
   *
   * ⚠️ T-100'DE GEREKLİ OLDU VE SEBEBİ AYNI SINIF. P2003 dalı T-050'de
   * eklendiğinde bu yola giren TEK şey eklenti kimlikleriydi, dolayısıyla
   * "Seçilen dosya bulunamadı" doğru bir varsayılandı. F4 ikinci bir kaynak
   * açıyor: `Job.clientId` (`onDelete: Restrict`). Var olmayan bir müşteri
   * kimliği gönderilince kullanıcıya DOSYADAN bahsetmek, düzeltebileceği şeyi
   * yanlış adlandırmak olurdu — yani varsayılan metin bir yalana dönüşürdü.
   *
   * Çözüm `conflict` için verilen kararın AYNISI (yukarıdaki yorum): varsayılanı
   * bozmadan çağıranın kendi metnini vermesine izin ver. Üçüncü bir kaynak
   * açıldığında da aynı kapı kullanılır.
   */
  foreignKey?: { message: string; fields?: Record<string, string> };
}

export function toFailure(
  context: string,
  error: unknown,
  overrides?: FailureOverrides,
): ApiFailure {
  const { conflict, foreignKey } = overrides ?? {};

  switch (prismaErrorCode(error)) {
    case 'P2002':
      if (conflict) return fail('CONFLICT', conflict.message, conflict.fields);
      // ADR-046: içerikte ikinci benzersizlik `@@unique([translationKey, locale])`.
      // Slug metnini göstermek kullanıcıyı yanlış alana yönlendirirdi.
      if (benzersizlikHedefi(error).includes('translationKey')) {
        return fail(
          'CONFLICT',
          'Bu çeviri anahtarı aynı dilde başka bir kayıtta kullanılıyor. Her dilde bir kayıt olabilir.',
          { translationKey: 'Bu dilde bu anahtarla bir kayıt zaten var.' },
        );
      }
      return fail(
        'CONFLICT',
        'Bu adres (slug) aynı dilde zaten kullanılıyor. Farklı bir slug girin.',
        { slug: 'Bu slug zaten kullanılıyor.' },
      );
    case 'P2025':
      return fail('NOT_FOUND', 'Kayıt bulunamadı. Başka bir yerden silinmiş olabilir.');

    /*
     * P2003 — YABANCI ANAHTAR İHLALİ. T-050/3'te ölçüldü ve eklendi.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * NEDEN EKLENDİ: "tekrar deneyin" YANLIŞ TAVSİYEYDİ
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Bu dal yokken P2003 `internalError`a düşüyordu ve kullanıcı şunu
     * görüyordu: "İşlem tamamlanamadı. Lütfen tekrar deneyin." İki yönden
     * yanlış: tekrar denemek ASLA çalışmaz (kimlik hâlâ yok), ve hatanın
     * seçilen dosyayla ilgili olduğuna dair hiçbir ipucu yok. Kullanıcı
     * düzeltebileceği bir şeyi düzeltemez hâle geliyordu.
     *
     * Bugün bu yola nasıl giriliyor: `avatarAttachmentId`/`cvAttachmentId`
     * (profil) ve `coverAttachmentId` (proje + blog) GİZLİ FORM ALANLARINDAN
     * geliyor ve şema yalnızca BİÇİMİ doğruluyor (`cuidSchema`) — varlığı
     * DOĞRULAMIYOR. Var olmayan bir kimlik gönderilirse kapı veritabanındaki
     * FK kısıtı oluyor (`onDelete: Restrict`).
     *
     * Hata kodu Prisma'nın kendi çalışma zamanı eşlemesinden doğrulandı:
     * `ForeignKeyConstraintViolation → "P2003"`.
     *
     * ═══════════════════════════════════════════════════════════════════════
     * ARTIK BİRİNCİ KAPI DEĞİL — YARIŞ KORUMASI (T-051/B)
     * ═══════════════════════════════════════════════════════════════════════
     *
     * T-050'de bu dal TEK kapıydı ve `fields` boş bırakılmıştı. Gerekçem
     * şuydu: "Prisma'nın `meta.field_name`i kısıt adını taşıyor, sezgiselle
     * yanlış alanı işaretlemek hiç işaretlememekten kötü olurdu."
     *
     * ⚠️ O GEREKÇE ÇÜRÜTÜLDÜ. Orkestra Şefi gerçek bir FK ihlali üretip kabuğu
     * ölçtü: `meta.field_name` HİÇ YOK; kısıt adı
     * `meta.driverAdapterError.cause.constraint.index` altında, iç içe —
     * ve alan adını İÇERİYOR (`profile_avatarAttachmentId_fkey`). Ayrıştırması
     * mekanik, yani "sezgisel" demek yanlıştı.
     *
     * BİRİNCİ KAPI ARTIK BAŞKA YERDE: `attachment-refs.ts` eklenti kimliklerinin
     * varlığını YAZMADAN ÖNCE kontrol ediyor ve `fields`i KENDİ sorgusundan
     * kuruyor — belgelenmemiş bir kabuğa bağlanmadan, kesin alan adıyla.
     * Gerekçenin tamamı o dosyada.
     *
     * Bu dal ne işe yarıyor: YARIŞ. Dosya kontrol ile yazma arasında silinirse
     * FK yine tetiklenir. O durumda `fields` boş olmak DOĞRU — kullanıcının
     * düzeltebileceği bir alan yok, dosya gerçekten kaybolmuştur ve mesaj zaten
     * bunu söylüyor. Ayrıca doğrudan veritabanı yazmaları (seed, migration,
     * elle müdahale) için son savunma olarak duruyor.
     */
    case 'P2003':
      return foreignKey
        ? fail('VALIDATION_ERROR', foreignKey.message, foreignKey.fields)
        : fail(
            'VALIDATION_ERROR',
            'Seçilen dosya bulunamadı — yüklenmemiş ya da silinmiş olabilir. ' +
              'Dosyayı yeniden seçip kaydedin.',
          );
    default:
      return internalError(context, error);
  }
}
