import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * YEDEK ŞİFRELEME VE ADLANDIRMA — SAF KATMAN (T-066, §8.21–23).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI VE SAF BİR DOSYA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yedekleme betiği `pg_dump` çağırıyor, ağa yazıyor ve R2'den okuyor — hiçbiri
 * birim testinde koşturulamaz. Ama yedeğin OKUNABİLİRLİĞİNİ belirleyen şey o
 * yan etkiler değil, buradaki üç karar: anahtar biçimi, şifre biçimi ve nesne
 * adı. Üçü de saf, üçü de sınanabilir.
 *
 * Kritik olan şu: bu dosya yanlışsa yedek ALINIR, R2'ye YAZILIR, betik EXIT 0
 * döner ve dosya GERİ YÜKLENEMEZ. Yeşil bir paket ve kurtarılamayan bir
 * veritabanı. Bu yüzden saf kısım ayrıldı ve `tests/unit/yedek-sifreleme.test.ts`
 * onu kurcalama (tamper), yanlış anahtar ve biçim sapması dahil ölçüyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ŞİFRELEME KARARI — AES-256-GCM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kart AEAD şart koştu ve T-013a'da `totpSecret` için AES-256-GCM seçilmişti;
 * aynı ilkel seçildi. Gerekçe yalnızca tutarlılık değil:
 *
 *   GİZLİLİK yetmez, BÜTÜNLÜK de gerekiyor. Yedek dosyası R2'de duruyor ve bir
 *   gün geri yüklenecek. Şifreli ama doğrulanmamış bir biçim (ör. AES-CBC)
 *   sessizce DEĞİŞTİRİLEBİLİR: bir baytı bozulmuş dosya çözülür, `pg_restore`
 *   bozuk veriyi yükler ve kimse fark etmez. GCM'in doğrulama etiketi bunu
 *   imkânsız kılıyor — `final()` fırlatıyor, yani geri yükleme BAŞLAMIYOR.
 *
 * ⚠️ ANAHTAR KAYBOLURSA YEDEK OKUNAMAZ. Bu bir TAKAS, kusur değil: anahtarsız
 * okunabilen bir yedek, R2 kimlik bilgisi sızan herkesin okuyabildiği bir
 * yedektir. Takasın bedeli `docs/security/restore.md` → "Anahtar kaybı" başlığında
 * yazılı ve orada anahtarın NEREDE saklandığı da söyleniyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DOSYA BİÇİMİ — KENDİNİ TANITAN BAŞLIK
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   [13 bayt] "SAHINSAMET-YEDEK"  sihirli dize
 *   [ 1 bayt] sürüm            (şu an 1)
 *   [12 bayt] IV               her yedekte YENİ rastgele
 *   [16 bayt] authTag          GCM doğrulama etiketi
 *   [  ...  ] şifreli gövde    `pg_dump -Fc` çıktısı
 *
 * Başlık ÜÇ İŞ YAPIYOR ve üçü de panik anı için:
 *
 *   1. Sihirli dize — elindeki dosyanın BU sistemin yedeği olduğunu söylüyor.
 *      Yanlış dosyayı çözmeye çalışıp "anahtar bozuk" sanmak, en kötü günde
 *      verilecek en kötü teşhis.
 *   2. Sürüm — biçim bir gün değişirse eski yedek SESSİZCE yanlış okunmasın.
 *   3. Etiket GÖVDEDEN ÖNCE — GCM `setAuthTag`i `final()`den önce istiyor.
 *      Etiketi sona koysaydık tüm dosyayı belleğe almak ya da iki geçiş
 *      yapmak gerekirdi; bu sıra akışla çözmeye izin veriyor.
 */

/** Sihirli dize — dosyanın bu sistemin yedeği olduğunu söyler. */
export const YEDEK_SIHIRLI = Buffer.from('SAHINSAMET-YEDEK', 'utf8');
/** Biçim sürümü. Biçim değişirse ARTAR ve eski yedek sessizce okunmaz. */
export const YEDEK_SURUMU = 1;

const IV_BAYT = 12;
const TAG_BAYT = 16;
const ANAHTAR_BAYT = 32;
const ALGORITMA = 'aes-256-gcm';

export const BASLIK_BAYT = YEDEK_SIHIRLI.length + 1 + IV_BAYT + TAG_BAYT;

/**
 * `BACKUP_ENCRYPTION_KEY` → 32 baytlık anahtar.
 *
 * ⚠️ HATA MESAJLARINDA DEĞER YOK, yalnızca değişken ADI ve beklenen UZUNLUK
 * (§8.20). Bir anahtarın kendisi hata günlüğüne düşerse, şifrelemenin amacı
 * kalmaz — ve günlükler yedeklenen yerlerde birikir.
 */
export function yedekAnahtari(env: Record<string, string | undefined> = process.env): Buffer {
  const ham = env.BACKUP_ENCRYPTION_KEY;
  if (!ham) {
    throw new Error(
      'BACKUP_ENCRYPTION_KEY tanımsız. Üretmek için: ' +
        "node -e \"console.log(require('node:crypto').randomBytes(32).toString('base64'))\"",
    );
  }

  const anahtar = Buffer.from(ham, 'base64');
  if (anahtar.length !== ANAHTAR_BAYT) {
    throw new Error(
      `BACKUP_ENCRYPTION_KEY ${ANAHTAR_BAYT} bayt olmalı, ${anahtar.length} bayt çözüldü. ` +
        'Değer base64 kodlanmış 32 rastgele bayt olmalı.',
    );
  }

  return anahtar;
}

/** Düz baytları başlıklı şifreli bloba çevirir. */
export function yedekSifrele(duz: Buffer, anahtar: Buffer): Buffer {
  const iv = randomBytes(IV_BAYT);
  const sifre = createCipheriv(ALGORITMA, anahtar, iv);
  const govde = Buffer.concat([sifre.update(duz), sifre.final()]);
  const tag = sifre.getAuthTag();

  return Buffer.concat([YEDEK_SIHIRLI, Buffer.from([YEDEK_SURUMU]), iv, tag, govde]);
}

/**
 * Şifreli blobu düz baytlara çevirir.
 *
 * Üç ayrı başarısızlık biçimi ve ÜÇÜ DE AYRI MESAJ veriyor — panik anında
 * "çözülemedi" demek, hangi şeyin yanlış olduğunu söylemeyen bir teşhis:
 * yanlış dosya mı, yanlış anahtar mı, bozulmuş dosya mı?
 */
export function yedekCoz(blob: Buffer, anahtar: Buffer): Buffer {
  if (blob.length < BASLIK_BAYT) {
    throw new Error(
      `Dosya çok kısa (${blob.length} bayt, en az ${BASLIK_BAYT} gerekiyor) — ` +
        'yedek dosyası değil ya da aktarım yarıda kesilmiş.',
    );
  }

  const sihirli = blob.subarray(0, YEDEK_SIHIRLI.length);
  if (sihirli.length !== YEDEK_SIHIRLI.length || !timingSafeEqual(sihirli, YEDEK_SIHIRLI)) {
    throw new Error(
      'Dosya bu sistemin yedeği değil (sihirli dize eşleşmiyor). ' +
        'Anahtarı suçlamadan önce dosyayı kontrol et.',
    );
  }

  const surum = blob[YEDEK_SIHIRLI.length];
  if (surum !== YEDEK_SURUMU) {
    throw new Error(
      `Yedek biçimi sürüm ${surum}, bu araç sürüm ${YEDEK_SURUMU} okuyor. ` +
        'Eski bir yedeği geri yüklemek için o sürümün aracı gerekiyor.',
    );
  }

  let imleç = YEDEK_SIHIRLI.length + 1;
  const iv = blob.subarray(imleç, (imleç += IV_BAYT));
  const tag = blob.subarray(imleç, (imleç += TAG_BAYT));
  const govde = blob.subarray(imleç);

  const coz = createDecipheriv(ALGORITMA, anahtar, iv);
  coz.setAuthTag(tag);

  try {
    return Buffer.concat([coz.update(govde), coz.final()]);
  } catch {
    /*
     * GCM burada İKİ durumu ayırt etmiyor: yanlış anahtar ve kurcalanmış
     * dosya aynı hatayı veriyor. Ayırt edilemediğini SÖYLEMEK, birini
     * varsaymaktan iyi — yanlış teşhis panik anında saatlere mal olur.
     */
    throw new Error(
      'Yedek çözülemedi: doğrulama etiketi tutmadı. İki sebepten biri — ' +
        'BACKUP_ENCRYPTION_KEY bu yedeği şifreleyen anahtar DEĞİL, ya da dosya ' +
        'aktarımda/depoda BOZULMUŞ. Dosya boyutunu R2 ile karşılaştırarak ' +
        'ikisini ayırabilirsin.',
    );
  }
}

/* ===========================================================================
 * NESNE ADLANDIRMA VE SAKLAMA
 * ======================================================================== */

/** R2 nesne öneki — kovada başka şey varsa karışmasın. */
export const YEDEK_ONEKI = 'yedek/';

/** `2026-10-16` → `yedek/sahinsamet-2026-10-16.dump.enc` */
export function yedekKeyi(gun: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gun)) {
    throw new Error(`Geçersiz gün: "${gun}". YYYY-MM-DD bekleniyor.`);
  }
  return `${YEDEK_ONEKI}sahinsamet-${gun}.dump.enc`;
}

/** `Date` → `YYYY-MM-DD` (UTC). Yedek adı saat dilimine göre kaymasın. */
export function gunDizesi(an: Date): string {
  return an.toISOString().slice(0, 10);
}

/**
 * SAKLAMA POLİTİKASI — 30 gün, ve silme LİSTELEME GEREKTİRMİYOR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN LİSTELEME YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * "Kovayı listele, en yeni 30'u tut, kalanı sil" en doğal tasarım ve
 * REDDEDİLDİ: `src/server/storage/r2.ts` listeleme ihraç etmiyor (imzalı
 * adres, oku, sil — hepsi ANAHTAR üzerinden). Listeleme eklemek SigV4'ün
 * ikinci bir kullanımını yazmak demekti; aynı imza mantığının ikinci kopyası
 * tam olarak turlardır kapattığım çiftlenme sınıfı.
 *
 * Anahtarlar GÜNE GÖRE deterministik olduğu için listelemeye gerek yok: her
 * koşum, yaşı dolan günün anahtarını hesaplayıp SİLİYOR. Olmayan bir anahtarı
 * silmek sessiz bir no-op (`deleteObjectQuietly`).
 *
 * ⚠️ TEK BOŞLUK VE ONU DA KAPATAN ŞEY: yedekleme birkaç gün koşmazsa, o
 * günlere ait silmeler de yapılmaz ve eski nesneler kalır. Bu yüzden her
 * koşum TEK gün değil bir PENCERE siliyor (yaş sınırından sonraki 7 gün),
 * böylece kesintiler kendiliğinden onarılıyor. Yedi günden uzun bir kesinti
 * zaten yedeklemenin kendisinin sorunudur ve §13.7 izlemesinin konusu.
 *
 * R2 ücretsiz katmanı 10 GB; 30 günlük sıkıştırılmış dump bu veri boyutunda
 * o sınıra yaklaşmıyor (ölçüm raporda). Sonsuz birikim bir gün sınırı aşar ve
 * o gün yedekleme SESSİZCE durur — bu proje o sınıfı tanıyor.
 */
export const SAKLAMA_GUNU = 30;
export const SILME_PENCERESI = 7;

/** Bu koşumda silinmesi gereken anahtarlar. */
export function silinecekKeyler(
  bugun: Date,
  saklama = SAKLAMA_GUNU,
  pencere = SILME_PENCERESI,
): string[] {
  const keyler: string[] = [];
  for (let i = 0; i < pencere; i++) {
    const gun = new Date(bugun.getTime());
    gun.setUTCDate(gun.getUTCDate() - (saklama + i));
    keyler.push(yedekKeyi(gunDizesi(gun)));
  }
  return keyler;
}

/* ===========================================================================
 * BAĞLANTI DİZESİ — PRISMA'YA ÖZGÜ PARAMETRELER AYIKLANIYOR
 * ======================================================================== */

/**
 * `libpq` araçlarının (`pg_dump`, `psql`, `pg_restore`) kabul ettiği parametreler.
 *
 * ⚠️ BU İŞLEV BİR KUSURDAN DOĞDU VE KUSUR ÜRETİMDE DE OLACAKTI.
 *
 * İlk koşumda `pg_dump` şunu dedi:
 *
 *     pg_dump: error: invalid URI query parameter: "schema"
 *
 * `DATABASE_URL` Prisma'nın kendi parametresini taşıyor (`?schema=public`) ve
 * `libpq` onu tanımıyor. Yani yedekleme betiği, yazıldığı gibi, HİÇBİR ortamda
 * çalışmayacaktı — ve bunu ancak KOŞTURARAK görülebilirdi: tipler doğru,
 * mantık doğru, komut geçersiz.
 *
 * ⚠️ TÜM SORGU DİZESİNİ ATMAK YANLIŞ OLURDU: `sslmode` üretimde gerekli ve
 * onu düşürmek, yedeği ŞİFRESİZ bir bağlantıdan çekmek demek. Bu yüzden
 * beyaz liste: `libpq`nin bildiği parametreler KALIYOR, Prisma'ya özgü olanlar
 * ayıklanıyor. Varsayılan reddetmek değil, varsayılan KORUMAK — çünkü
 * bilinmeyen bir parametreyi atmak sessizce güvenliği düşürebilir, tutmak ise
 * gürültülü bir hata verir.
 */
const LIBPQ_PARAMETRELERI = new Set([
  'sslmode',
  'sslcert',
  'sslkey',
  'sslrootcert',
  'connect_timeout',
  'application_name',
  'options',
  'target_session_attrs',
]);

/** Prisma bağlantı dizesini `libpq` araçlarının kabul ettiği hâle getirir. */
export function libpqUrl(ham: string): string {
  const url = new URL(ham);
  const temiz = new URLSearchParams();

  for (const [ad, deger] of url.searchParams) {
    if (LIBPQ_PARAMETRELERI.has(ad)) temiz.set(ad, deger);
  }

  url.search = temiz.toString();
  return url.toString();
}

/** Bağlantı dizesindeki veritabanı adı. */
export function veritabaniAdi(ham: string): string {
  return new URL(ham).pathname.replace(/^\//, '');
}
