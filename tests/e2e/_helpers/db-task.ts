import process from 'node:process';

/**
 * Zaman koşullu temizlik için bir saatlik pay (2026-11-07): `createdAt` veritabanının saatiyle
 * yazılıyor, yerel veritabanı Mac uyuyup uyanınca saati geride kalan bir sanal makinede.
 * Kayıt testin başlangıç anından "önce" görünüp silinmeden kalıyordu.
 */
const payli = (sonra: string): Date => new Date(new Date(sonra).getTime() - 60 * 60_000);

import { hashBackupCodes } from '@/server/auth/backup-codes';
import { hashEmail } from '@/server/auth/login-attempt';
import { encryptSecret } from '@/server/auth/totp';
import { db } from '@/server/db';
import type { Prisma } from '@/server/generated/prisma/client';

/**
 * E2E veritabanı görevleri — AYRI BİR NODE SÜRECİNDE koşar.
 *
 * Çağrılma biçimi (bkz. `db.ts`):
 *   node --import ./tests/e2e/_helpers/db-register.mjs \
 *        tests/e2e/_helpers/db-task.ts <komut> [json-argüman]
 *
 * Sonuç stdout'a TEK SATIR JSON olarak yazılır. Neden ayrı süreç: gerekçe
 * `db-resolver.mjs` başında.
 *
 * §8.20: Bu betik şifre, TOTP secret'ı veya kurtarma kodunu ASLA yazdırmaz —
 * yalnızca sayılar ve boolean'lar döner. Sabit test secret'ı çağıran tarafta
 * zaten bilinir; buradan geri gönderilmesine gerek yok.
 */

/** Sabit test secret'ı — RFC 6238 tohumunun Base32 hâli. */
export const TEST_TOTP_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

/** Sabit kurtarma kodları — biçim `XXXXX-XXXXX` (ADR-013). */
export const TEST_BACKUP_CODES = ['AAAAA-BBBBB', 'CCCCC-DDDDD', 'EEEEE-FFFFF'] as const;

function adminEmail(): string {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error('ADMIN_EMAIL tanımlı değil (§12). .env dosyasını kontrol edin.');
  }
  return email;
}

async function requireAdmin() {
  const email = adminEmail();
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`Yönetici hesabı bulunamadı (${email}). Önce "pnpm db:seed" çalıştırın.`);
  }

  return user;
}

/**
 * TÜM giriş denemelerini siler — e-posta özetine göre DEĞİL.
 *
 * §8.4 sayımı **IP başınadır** (`countRecentFailures({ ip }, …)`). Bir zamanlar
 * burası `emailHash`'e göre siliyordu ve şu sessiz hataya yol açtı: var olmayan
 * bir e-postayla yapılan deneme FARKLI bir özet üretiyor, silinmiyor, ama AYNI
 * IP'den geldiği için sayaçta kalmaya devam ediyordu. Sonuç: dört yanlış şifre
 * girip beklediğinden bir erken kilitlenen, sıraya bağlı ve açıklaması zor bir
 * kırılma. "Dört deneme kilitlemez" sınır testi bunu yakaladı.
 *
 * Seed durumunda hiç deneme kaydı yok; tabloyu boşaltmak seed durumuna dönmenin
 * ta kendisidir.
 */
async function clearAllLoginAttempts(): Promise<number> {
  const { count } = await db.loginAttempt.deleteMany({});
  return count;
}

/** Kullanıcıyı seed durumuna döndürür ve testin bıraktığı izleri siler. */
async function resetAuthState(since?: string): Promise<void> {
  const user = await requireAdmin();

  await db.user.update({
    where: { id: user.id },
    data: {
      // `prisma/seed.ts` bu üçünü boş bırakıyor — 2FA kapalı.
      totpSecret: null,
      totpConfirmedAt: null,
      totpBackupCodes: [],
      lockedUntil: null,
    },
  });

  await clearAllLoginAttempts();

  await db.auditLog.deleteMany({
    where: {
      entity: 'User',
      actorEmailHash: hashEmail(user.email),
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
    },
  });
}

const komutlar: Record<string, (arg?: string) => Promise<unknown>> = {
  /** Yönetici kaydının test için gereken alanları. */
  async admin() {
    const user = await requireAdmin();
    return {
      id: user.id,
      email: user.email,
      twoFactorEnabled: user.totpConfirmedAt != null,
      remainingBackupCodes: user.totpBackupCodes.length,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
    };
  },

  /** 2FA'yı açar — seed kapalı bıraktığı için §9/3'ün ikinci yarısı buna bağlı. */
  async enableTwoFactor() {
    const user = await requireAdmin();

    await db.user.update({
      where: { id: user.id },
      data: {
        totpSecret: encryptSecret(TEST_TOTP_SECRET),
        totpConfirmedAt: new Date(),
        totpBackupCodes: await hashBackupCodes([...TEST_BACKUP_CODES]),
        totpSonKod: null,
        totpSonZaman: null,
      },
    });

    return { secret: TEST_TOTP_SECRET, backupCodes: TEST_BACKUP_CODES };
  },

  async resetAuthState(since) {
    await resetAuthState(since);
    return { ok: true };
  },

  /** §8.4 sayacını sıfırlar — testler arası sızmayı önler. */
  async clearLoginAttempts() {
    return { deleted: await clearAllLoginAttempts() };
  },

  async clearLock() {
    const user = await requireAdmin();
    await db.user.update({ where: { id: user.id }, data: { lockedUntil: null } });
    return { ok: true };
  },

  /**
   * Profil anlık görüntüsü — `ana-sayfa.spec.ts` tekil kaydı değiştiriyor ve
   * koşum sonunda ESKİ hâline döndürüyor. İçerik yalnızca geri yüklemek için
   * taşınıyor; test çıktısına basılmıyor.
   */
  async profilAnlik() {
    const p = await db.profile.findUnique({
      where: { id: 'singleton' },
      select: {
        headline: true,
        bio: true,
        location: true,
        socials: true,
        avatarAttachmentId: true,
      },
    });
    return p ?? null;
  },

  async profilGeriYukle(arg) {
    const p = JSON.parse(arg ?? 'null') as {
      headline: string;
      bio: string;
      location: string | null;
      socials: Record<string, string> | null;
      avatarAttachmentId: string | null;
    } | null;
    if (!p) return { ok: false };
    await db.profile.update({
      where: { id: 'singleton' },
      data: { ...p, socials: p.socials ?? {} },
    });
    return { ok: true };
  },

  /**
   * ⚠️ TEST KALINTISI — SİLİNEN DEĞİL, KALAN (T-107b).
   *
   * `global-teardown.ts` koşum sonunda şunu basıyordu:
   *
   *     [e2e] ... (artık proje: 0, mesaj: 1)
   *
   * Sayılar `projeleriTemizle`/`iletisimMesajlariniTemizle`'den geliyordu, yani
   * **SİLİNEN** satır sayısı — ama etiket "artık" (KALAN) diyordu. "mesaj: 1"
   * aslında "süpürme 1 mesaj sildi" demekti ve tablo gerçekten boştu.
   *
   * Kusur etiketten daha derin, ve tehlikeli yönü şu: silinen sayısı **hem her
   * şey temizken hem de SÜPÜRME YANLIŞ ÖNEKİ ARARKEN 0 çıkar.** Yani gerçek
   * bir kalıntı "0" olarak raporlanır — T-016'da kurulan izolasyon güvencesi
   * tam o sayıya dayanıyordu. Ölçülmesi gereken EYLEM ("sildim") değil, İDDİA
   * ("kalıntı yok").
   *
   * ⚠️ ÖNEK `e2e-t039` DEĞİL: süpürme tek bir göreve ait öneki arıyor, oysa
   * paketler başka işaretler de yazıyor (ör. T-054g denetim sondası
   * `E2EDenetimSondasi`). Kalıntı sayımı `e2e`/`E2E` ile başlayan HER izi
   * sayıyor — böylece kendi `afterAll`'u çöken bir paketin bıraktığı satır da
   * görünür.
   *
   * SINIR, dürüstçe: `e2e` ile başlamayan bir işaret bu sayıma da görünmez.
   * Mitigasyon bir SÖZLEŞME (test verisi `e2e`/`E2E` ile başlar), kanıt değil.
   */
  async e2eKalintisi() {
    const denetim = await db.auditLog.count({
      where: { entity: { startsWith: 'e2e', mode: 'insensitive' } },
    });

    /*
     * ⚠️ F5 İZLERİ T-116'DA EKLENDİ — aynı kural: sayıma girmeyen bir iz,
     * çöken bir `afterAll`dan sonra "kalıntı yok" diye raporlanırdı.
     * Egzersiz ve alışkanlık arayüzden SİLİNEMİYOR (yalnızca arşiv), yani
     * test izi ancak `kisiselSondaSil` ile gider.
     */
    const [egzersiz, aliskanlik, takvim] = await Promise.all([
      db.exercise.count({ where: { name: { startsWith: 'e2e', mode: 'insensitive' } } }),
      db.habit.count({ where: { name: { startsWith: 'e2e', mode: 'insensitive' } } }),
      // Takvim (2026-11-10): `takvimSondaSil` başlık önekiyle siler; çökerse burada görünür.
      db.takvimEtkinligi.count({ where: { baslik: { startsWith: 'e2e', mode: 'insensitive' } } }),
    ]);
    const kisisel = egzersiz + aliskanlik + takvim;

    return {
      denetim,
      kisisel,
      toplam: denetim + kisisel,
    };
  },

  /** Takvim e2e'sinin etkinliklerini siler — BAŞLIK önekine göre; ayrık oluşumlar seriyle gider. */
  async takvimSondaSil(arg) {
    const { onek } = JSON.parse(arg ?? '{}') as { onek: string };
    if (!onek || !onek.startsWith('e2e-'))
      throw new Error('takvimSondaSil: `e2e-` ile başlayan önek zorunlu.');
    const silinen = await db.takvimEtkinligi.deleteMany({
      where: { baslik: { startsWith: onek } },
    });
    return { silinen: silinen.count };
  },

  /**
   * Spor + takvim e2e'sinin izlerini siler (2026-11-12) — program günü ve egzersiz AD önekine
   * göre: günün takvim planları, oturumları (setleriyle), günün kendisi ve hareketler.
   */
  async sporSondaSil(arg) {
    const { onek } = JSON.parse(arg ?? '{}') as { onek: string };
    if (!onek || !onek.startsWith('e2e-'))
      throw new Error('sporSondaSil: `e2e-` ile başlayan önek zorunlu.');
    const gunler = await db.programDay.findMany({
      where: { name: { startsWith: onek } },
      select: { id: true },
    });
    const gunIdler = gunler.map((g) => g.id);
    const egzersizler = await db.exercise.findMany({
      where: { name: { startsWith: onek } },
      select: { id: true },
    });
    const exIdler = egzersizler.map((e) => e.id);
    const takvim = await db.takvimEtkinligi.deleteMany({
      where: { OR: [{ programDayId: { in: gunIdler } }, { baslik: { startsWith: onek } }] },
    });
    // Elle açılan antrenmanın programı yok: bu hareketlerin setlerinin antrenmanları da izdir.
    const elle = await db.workoutSet.findMany({
      where: { exerciseId: { in: exIdler } },
      select: { workoutId: true },
    });
    const set = await db.workoutSet.deleteMany({
      where: {
        OR: [{ exerciseId: { in: exIdler } }, { workout: { programDayId: { in: gunIdler } } }],
      },
    });
    const bosElle = await db.workout.deleteMany({
      where: { id: { in: elle.map((w) => w.workoutId) }, sets: { none: {} } },
    });
    const rekor = await db.personalRecord.deleteMany({ where: { exerciseId: { in: exIdler } } });
    const antrenman = await db.workout.deleteMany({ where: { programDayId: { in: gunIdler } } });
    const gun = await db.programDay.deleteMany({ where: { id: { in: gunIdler } } });
    const egzersiz = await db.exercise.deleteMany({ where: { id: { in: exIdler } } });
    return {
      silinen:
        takvim.count +
        set.count +
        rekor.count +
        antrenman.count +
        bosElle.count +
        gun.count +
        egzersiz.count,
    };
  },

  /** Hızlı ekleme e2e'sinin harcamalarını siler — AD önekine göre (2026-10-30). */
  async hizliSondaSil(arg) {
    const { onek } = JSON.parse(arg ?? '{}') as { onek: string };
    if (!onek || onek.length < 4)
      throw new Error('hizliSondaSil: en az 4 karakterlik önek zorunlu.');
    const akis = await db.walletFlow.deleteMany({ where: { name: { startsWith: onek } } });
    return { silinen: akis.count };
  },

  /** İngilizce e2e'sinin içerik hatası bildirimlerini siler: o dersin soruları, `sonra`dan beri. */
  async icerikHatasiSil(arg) {
    const { dersId, sonra } = JSON.parse(arg ?? '{}') as { dersId: string; sonra: string };
    if (!dersId || !sonra) throw new Error('icerikHatasiSil: dersId ve sonra zorunlu.');
    const silinen = await db.hataKaydi.deleteMany({
      where: {
        kaynak: 'icerik',
        ayrinti: { startsWith: `${dersId}-` },
        ilk: { gte: payli(sonra) },
      },
    });
    return { silinen: silinen.count };
  },

  /** İngilizce e2e'sinin ders kayıtlarını siler: o dersin, testin başladığı andan sonraki satırları (2026-11-06). */
  async ingilizceSondaSil(arg) {
    const { dersId, sonra } = JSON.parse(arg ?? '{}') as {
      dersId: string | string[];
      sonra: string;
    };
    if (!dersId || !sonra) throw new Error('ingilizceSondaSil: dersId ve sonra zorunlu.');
    const silinen = await db.ingilizceDers.deleteMany({
      where: {
        dersId: Array.isArray(dersId) ? { in: dersId } : dersId,
        createdAt: { gte: payli(sonra) },
      },
    });
    return { silinen: silinen.count };
  },

  /** Bütün rotalar e2e'si: her detay sayfası için bir kayıt. Önekli olanlar sonra silinir. */
  async rotaSondaKur(arg) {
    const { onek } = JSON.parse(arg ?? '{}') as { onek: string };
    const bugun = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const ilk = async <T extends { id: string }>(
      bul: () => Promise<T | null>,
      ac: () => Promise<T>,
    ): Promise<string> => ((await bul()) ?? (await ac())).id;
    const metin = (d: Record<string, unknown>) => ({ ...d });

    const oturum = await db.workout.create({
      data: { date: bugun, note: onek, startedAt: new Date() },
      select: { id: true },
    });
    const antrenman = await db.workout.create({
      data: { date: bugun, note: onek, startedAt: new Date(), finishedAt: new Date() },
      select: { id: true },
    });
    return {
      oturum: oturum.id,
      antrenman: antrenman.id,
      hesap: await ilk(
        () => db.walletAccount.findFirst({ where: { isArchived: false }, select: { id: true } }),
        () =>
          db.walletAccount.create({
            data: { name: `${onek}hesap`, kind: 'BANK', unit: 'TRY', balance: '0.00' },
            select: { id: true },
          }),
      ),
      akis: await ilk(
        () => db.walletFlow.findFirst({ select: { id: true } }),
        () =>
          db.walletFlow.create({
            data: metin({
              name: `${onek}akis`,
              kind: 'EXPENSE',
              unit: 'TRY',
              amount: '1.00',
              frequency: 'MONTHLY',
              day: 1,
            }) as never,
            select: { id: true },
          }),
      ),
      programGunu: await ilk(
        () => db.programDay.findFirst({ where: { isArchived: false }, select: { id: true } }),
        () =>
          db.programDay.create({
            data: { name: `${onek}gun`, isArchived: false },
            select: { id: true },
          }),
      ),
      /*
       * Seed yalnızca yönetici ve profil açıyor; kişisel kayıt yoksa önekli bir
       * sonda açılır ve `rotaSondaSil` onu siler. Sağlık kaydı günde tek ve
       * gerçek günlerle çakışmasın diye 2000-01-01'e yazılıyor.
       */
      saglik: await ilk(
        () => db.healthLog.findFirst({ select: { id: true } }),
        () =>
          db.healthLog.create({
            data: { date: new Date('2000-01-01T00:00:00Z'), note: onek },
            select: { id: true },
          }),
      ),
      egzersiz: await ilk(
        () => db.exercise.findFirst({ select: { id: true } }),
        () =>
          db.exercise.create({
            data: { name: `${onek}egzersiz`, muscleGroup: 'OTHER' },
            select: { id: true },
          }),
      ),
      aliskanlik: await ilk(
        () => db.habit.findFirst({ select: { id: true } }),
        () => db.habit.create({ data: { name: `${onek}aliskanlik` }, select: { id: true } }),
      ),
      hedef: await ilk(
        () => db.goal.findFirst({ select: { id: true } }),
        () => db.goal.create({ data: { title: `${onek}hedef` }, select: { id: true } }),
      ),
      gunluk: await ilk(
        () => db.journalEntry.findFirst({ select: { id: true } }),
        () =>
          db.journalEntry.create({
            data: { date: bugun, content: onek, title: `${onek}gunluk` },
            select: { id: true },
          }),
      ),
    };
  },

  async rotaSondaSil(arg) {
    const { onek } = JSON.parse(arg ?? '{}') as { onek: string };
    if (!onek || onek.length < 4)
      throw new Error('rotaSondaSil: en az 4 karakterlik önek zorunlu.');
    const w = await db.workout.deleteMany({ where: { note: onek } });
    await db.walletFlow.deleteMany({ where: { name: { startsWith: onek } } });
    await db.walletAccount.deleteMany({ where: { name: { startsWith: onek } } });
    await db.programDay.deleteMany({ where: { name: { startsWith: onek } } });
    await db.healthLog.deleteMany({ where: { note: onek } });
    await db.exercise.deleteMany({ where: { name: { startsWith: onek } } });
    await db.habit.deleteMany({ where: { name: { startsWith: onek } } });
    await db.goal.deleteMany({ where: { title: { startsWith: onek } } });
    await db.journalEntry.deleteMany({ where: { content: onek } });
    return { silinen: w.count };
  },

  /** Para akışı e2e'si için iki hesap ve bir borç açar (2026-11-02). */
  async cuzdanSondaKur(arg) {
    const { onek } = JSON.parse(arg ?? '{}') as { onek: string };
    const hesap = (ad: string, balance: string) =>
      db.walletAccount.create({
        data: { name: `${onek}${ad}`, kind: 'BANK', unit: 'TRY', balance },
        select: { id: true },
      });
    const [a, b] = await Promise.all([hesap('A', '3000.00'), hesap('B', '500.00')]);
    const borc = await db.walletDebt.create({
      data: {
        name: `${onek}borc`,
        unit: 'TRY',
        totalAmount: '5000.00',
        remainingAmount: '5000.00',
        monthlyPayment: '1000.00',
      },
      select: { id: true },
    });
    return { hesapA: a.id, hesapB: b.id, borcId: borc.id };
  },

  /** Para akışı e2e izlerini siler: AD önekine göre. */
  async cuzdanSondaSil(arg) {
    const { onek } = JSON.parse(arg ?? '{}') as { onek: string };
    if (!onek || onek.length < 4)
      throw new Error('cuzdanSondaSil: en az 4 karakterlik önek zorunlu.');
    const hesaplar = await db.walletAccount.findMany({
      where: { name: { startsWith: onek } },
      select: { id: true },
    });
    const idler = hesaplar.map((h) => h.id);
    await db.walletTransfer.deleteMany({
      where: { OR: [{ kaynakId: { in: idler } }, { hedefId: { in: idler } }] },
    });
    await db.walletDebt.deleteMany({ where: { name: { startsWith: onek } } });
    const silinen = await db.walletAccount.deleteMany({ where: { id: { in: idler } } });
    return { silinen: silinen.count };
  },

  /**
   * Face ID e2e'sinin eklediği passkey'i siler (2026-10-30). Ölçüt testin
   * SANAL CİHAZININ kimlik bilgisi kimliği: masaüstü ve mobil projeleri aynı
   * yönetici hesabına paralel ekliyor; zaman ya da ada göre silmek ötekinin
   * passkey'ini götürürdü.
   */
  async passkeySondaSil(arg) {
    const { kimlikler } = JSON.parse(arg ?? '{}') as { kimlikler: string[] };
    if (!Array.isArray(kimlikler)) throw new Error('passkeySondaSil: `kimlikler` dizisi zorunlu.');
    const passkey = await db.passkey.deleteMany({ where: { credentialId: { in: kimlikler } } });
    return { silinen: passkey.count };
  },

  /**
   * F5 kişisel modül izlerini siler (T-116).
   *
   * Arayüzde SİLME YOLU YOK ve bilinçli: egzersiz `Restrict` FK'lı referans
   * veri, alışkanlık silinince `HabitLog` CASCADE geçmişi götürür. Test ise
   * kendi izini bırakmamak ZORUNDA (ADR-030). Sıra FK'lara göre: setler ve
   * rekorlar önce, egzersiz sonra. Sabit test gününün (`gun`) sağlık kaydı ve
   * antrenmanları da gider — gün 2001'de, gerçek veriyle çakışmaz.
   */
  async kisiselSondaSil(arg) {
    const { onek, gun } = JSON.parse(arg ?? '{}') as { onek: string; gun: string };
    if (!onek || onek.length < 4 || !/^\d{4}-\d{2}-\d{2}$/.test(gun ?? '')) {
      throw new Error('kisiselSondaSil: en az 4 karakterlik önek ve YYYY-AA-GG gün zorunlu.');
    }
    const tarih = new Date(`${gun}T00:00:00.000Z`);

    const egzersizler = await db.exercise.findMany({
      where: { name: { startsWith: onek } },
      select: { id: true },
    });
    const ids = egzersizler.map((e) => e.id);

    const antrenman = await db.workout.deleteMany({ where: { date: tarih } });
    const set = await db.workoutSet.deleteMany({ where: { exerciseId: { in: ids } } });
    const rekor = await db.personalRecord.deleteMany({ where: { exerciseId: { in: ids } } });
    const egzersiz = await db.exercise.deleteMany({ where: { id: { in: ids } } });
    const aliskanlik = await db.habit.deleteMany({ where: { name: { startsWith: onek } } });
    const saglik = await db.healthLog.deleteMany({ where: { date: tarih } });

    return {
      silinen:
        antrenman.count +
        set.count +
        rekor.count +
        egzersiz.count +
        aliskanlik.count +
        saglik.count,
    };
  },

  /**
   * §9/5 senaryosunun yazdığı işlemleri siler — AÇIKLAMA ÖNEKİNE göre.  /**
   * Denetim ekranına BİLİNEN bir `diff` yazar — T-054g sızıntı ölçümü için.  /**
   * Denetim ekranına BİLİNEN bir `diff` yazar — T-054g sızıntı ölçümü için.
   *
   * ⚠️ `writeAuditLog` KULLANILMIYOR, SATIR DOĞRUDAN YAZILIYOR. Sebep: amaç
   * redaksiyonu ölçmek DEĞİL (onu `tests/unit/services/denetim-kaydi.test.ts`
   * gerçek `redactAuditDiff` ile ölçüyor), OKUMA YOLUNU ölçmek. ADR-034
   * redaksiyonun bilmediği adı koruyamadığını kanıtladı; yani üretimde `diff`
   * sütununda SIZMIŞ bir değer BULUNABİLİR. Bu sonda tam o satırı taklit ediyor:
   * redaksiyondan geçirsem `yeniSifre` yine geçerdi ama `password` maskelenir ve
   * ölçtüğüm şey bulanıklaşırdı.
   *
   * İşaretler çağıran tarafta üretiliyor ve geri DÖNDÜRÜLMÜYOR (§8.20 alışkanlığı):
   * buradan yalnızca satır kimliği çıkıyor.
   */
  async denetimSondasiYaz(arg) {
    const { entity, entityId, diff } = JSON.parse(arg ?? '{}') as {
      entity: string;
      entityId: string;
      /* `Json` sütununun girdi tipi: `Record<string, unknown>` kabul edilmiyor
         çünkü `unknown` serileşemeyen bir değer de olabilir. Argüman zaten
         `JSON.parse`tan geldiği için serileşebilir olduğu kanıtlı. */
      diff: Prisma.InputJsonObject;
    };
    if (!entity || !entityId) {
      throw new Error('denetimSondasiYaz: `entity` ve `entityId` zorunlu.');
    }

    const user = await requireAdmin();
    const satir = await db.auditLog.create({
      data: {
        actorId: user.id,
        actorEmailHash: hashEmail(user.email),
        action: 'UPDATE',
        entity,
        entityId,
        diff,
        ip: '203.0.113.77',
      },
      select: { id: true },
    });

    return { id: satir.id };
  },

  /** Sondayı siler — KİMLİĞE göre, çünkü iki Playwright projesi aynı anda koşuyor. */
  async denetimSondasiSil(arg) {
    const { id } = JSON.parse(arg ?? '{}') as { id: string };
    if (!id) throw new Error('denetimSondasiSil: `id` zorunlu.');

    const { count } = await db.auditLog.deleteMany({ where: { id } });
    return { silinen: count };
  },

  /** Kilit denetim kaydı sayısı — ADR-022'nin uçtan uca doğrulanması için. */
  async lockAuditCount() {
    const user = await requireAdmin();
    const count = await db.auditLog.count({
      where: { entity: 'User', actorEmailHash: hashEmail(user.email), action: 'UPDATE' },
    });
    return { count };
  },
};

async function main(): Promise<void> {
  const [, , komut, arg] = process.argv;
  const calistir = komut ? komutlar[komut] : undefined;

  if (!calistir) {
    throw new Error(`Bilinmeyen komut: ${komut ?? '(yok)'}`);
  }

  const sonuc = await calistir(arg);

  // Çıktı YAZILDIKTAN SONRA süreç zorla sonlandırılır — gerekçe aşağıda.
  await new Promise<void>((resolve) => {
    process.stdout.write(JSON.stringify(sonuc ?? null), () => resolve());
  });
}

/**
 * Süreç `process.exit()` ile KAPATILIR — `$disconnect()` yetmiyor.
 *
 * ÖLÇÜLDÜ: `db.$disconnect()` çağrıldıktan sonra bile süreç tam 30 saniye
 * daha yaşıyor. Sebep, Prisma 7'nin sürücü adaptörü (ADR-005): altta yatan
 * `pg` havuzunu `src/server/db.ts` oluşturuyor ve `$disconnect()` onu
 * KAPATMIYOR; havuz `idleTimeoutMillis: 30_000` boyunca olay döngüsünü ayakta
 * tutuyor. Sonuç birebir 30 sn — tesadüf değil.
 *
 * Bu, kısa ömürlü her betiği etkiliyor (bkz. rapor / BULGU-007). Testler için
 * doğru çözüm burada beklemek değil, işi bitince çıkmak: çıktı zaten
 * yazıldı, veritabanı işlemi zaten tamamlandı.
 */
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    process.stderr.write(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
