import { appDayToDate, dateToAppDay, type AppDay } from './app-date';
import { toScaledInt } from './money';

/**
 * Kişisel rekor yeniden hesaplayıcısı — ADR-021.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜÇ PR KARARI — T-111. Üçü de sessiz hata üretmeye açık, üçü de burada.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ KARAR 1 — PR HER SET MUTASYONUNDA SIFIRDAN HESAPLANIR, "kırıldığında"
 * DEĞİL.
 *
 * "Yalnızca kırıldığında güncelle" ucuz ve sezgisel: yeni set eskisinden ağırsa
 * yaz, değilse dokunma. SESSİZCE YANLIŞTIR ve sebebi ucuzluğunun kendisi —
 * yalnızca EKLEMEYİ görür. Yanlış girilen bir seti (120 yerine 1200) düzeltmek
 * veya silmek rekoru İNDİRMEK demektir, ve "kırıldı mı" sorusu asla hayır
 * demez; rekor olduğu yerde kalır. Ekranda bir daha asla ulaşılamayacak bir
 * 1200 kg durur ve kullanıcı onu kıramadığı için yanlış olduğunu da anlamaz.
 *
 * O yüzden: her mutasyondan SONRA egzersizin TÜM setleri taranır ve rekorlar
 * yeniden kurulur. Maliyeti ADR-021 zaten kabul etmiş ("tek kullanıcılı
 * sistemde ihmal edilebilir") ve mertebesi gerçekten küçük: tek egzersizin
 * set geçmişi, yıllarca sonra bile yüzler mertebesinde.
 *
 * ⚠️ KARAR 2 — EŞİTLİK PR DEĞİL; "AYNI AĞIRLIKTA BİR TEKRAR FAZLA" PR.
 *
 * İki ayrı soru ve iki ayrı cevap:
 *
 *   (i) AYNI tekrarda AYNI ağırlık → REKOR DEĞİL. Rekor "ne zaman kırdın"
 *       bilgisi taşıyor; aynı ağırlığı ikinci kez kaldırmak o tarihi
 *       İLERİ atardı ve kullanıcı rekoru bugün kırmış gibi görünürdü.
 *       Eşitlikte ÖNCE olan gün kazanır (`isEarlierWithSameWeight`).
 *       ⚠️ Bu yüzden eşitliği "büyük veya eşit" diye yazmak sessiz hata:
 *       kıyas doğru görünür, TARİH bozulur.
 *
 *  (ii) Aynı ağırlıkta BİR TEKRAR FAZLA → EVET, rekor — ama 10RM'in rekoru,
 *       9RM'inkinin kırılması değil. ADR-021'in tekrar bazındalığı bunu
 *       zaten böyle çözüyor: `@@unique([exerciseId, reps])`, yani 100×9 ve
 *       100×10 AYRI iki kayıt ve ikisi de yan yana durur.
 *       ⚠️ Burada tahmini 1RM (Epley) kullanılsaydı ikisi TEK bir sayıya
 *       çökerdi ve "bir tekrar fazla"nın rekor olup olmadığı formülün
 *       sapmasına kalırdı. ADR-021 formülü tam bu yüzden reddetti.
 *
 * Dikkat: 100×10 rekoru, 100×9 rekorunu GEÇERSİZ KILMAZ. "10 tekrar yapabilen
 * 9 da yapar" doğru bir çıkarım ama rekorun ölçtüğü şey değil — rekor neyin
 * YAPILDIĞINI kaydeder, neyin yapılabileceğini değil. Türetme gerekirse
 * okuma tarafında yapılır (saklanmaz).
 *
 * ⚠️ KARAR 3 — PR GERİYE DÖNÜK DÜZELTİLEBİLİR, VE BU SİLMEYİ DE KAPSAR.
 *
 * Karar 1'in zorunlu sonucu: kaynağı kalmayan rekor SİLİNİR (`deleteMany`).
 * Yalnızca `upsert` yapılsaydı, son 5 tekrarlık setini silen kullanıcı 5RM
 * rekorunu ekranda görmeye devam ederdi — ADR-021'in "F5'in en olası sessiz
 * hatası" dediği şey tam olarak budur.
 *
 * ⚠️ ŞEMA İLE GÖRÜNÜRDEKİ ÇELİŞKİ ÖLÇÜLDÜ VE ÇELİŞKİ DEĞİL:
 * `workoutSetId` `onDelete: SetNull` ve şema yorumu *"Set silinirse rekor
 * kaybolmaz, kaynağını kaybeder"* diyor. Burada ise rekor silinebiliyor. İkisi
 * farklı KATMAN: `SetNull` veritabanının son çaresi — `Workout` silindiğinde
 * setler CASCADE ile gider ve bu yol set servisinden GEÇMEZ. O anda `Restrict`
 * olsaydı antrenman hiç silinemezdi; `Cascade` olsaydı rekor da sessizce
 * giderdi. `SetNull` rekoru AYAKTA ama KAYNAKSIZ bırakıyor — yani tutarsızlık
 * görünür kalıyor. ⚠️ Tutarsızlığı KAPATMAK benim işim: `deleteWorkout`
 * silmeden ÖNCE etkilenen egzersizleri topluyor ve sildikten SONRA her biri
 * için burayı çağırıyor (`workout.ts`). `SetNull` o çağrı düşerse hatanın
 * GÖRÜNÜR kalmasını sağlayan ağ, korumanın kendisi değil (ADR-034'ün kalıbı).
 *
 * TEKRAR BAZINDA: her `reps` değeri için ayrı rekor (`@@unique([exerciseId, reps])`).
 * Tahmini 1RM formülü KULLANILMAZ — karşılaştırma gerçek performansa dayanır.
 */

/** Hesap için gereken asgari set bilgisi. Ağırlıksız setler (vücut ağırlığı) elenir. */
export interface SetSnapshot {
  id: string;
  reps: number;
  /** `Decimal(6,2)` dize karşılığı. `null` = ağırlık girilmemiş. */
  weightKg: string | null;
  /** Setin ait olduğu antrenmanın günü. */
  day: AppDay;
}

export interface RecordCandidate {
  reps: number;
  weightKg: string;
  day: AppDay;
  workoutSetId: string;
}

/** `Decimal(6,2)` — `WorkoutSet.weightKg` sütununun ondalık basamak sayısı. */
const WEIGHT_SCALE = 2;

/**
 * Ondalık dizeleri kayan noktaya çevirmeden karşılaştırır (kuruş mantığının
 * kilo hâli).
 *
 * ⚠️ ÖLÇEKLEME ARTIK YEREL DEĞİL — BULGU-024 kapandı (T-102).
 *
 * Burada `BigInt(whole + fraction.padEnd(2,'0'))` yapan yerel bir kopya vardı
 * ve Güvenlik'in biçim kapısı onu gerekçeli bir istisna olarak kaydetmişti.
 * Teşhis doğruydu ve kopya bir dikkatsizlik değildi: `money.ts` ölçekleme
 * ilkelini İHRAÇ ETMİYORDU, yani içe aktarılacak bir şey yoktu. T-102'de
 * `toScaledInt` ihraç edildi ve kopya silindi.
 *
 * KAZANÇ SADECE "TEK TANIM" DEĞİL: yerel kopya İŞARETİ ELE ALMIYORDU
 * (`-12.5` → `BigInt('-125')` yerine `BigInt('-12' + '50')` gibi bir sonuç).
 * Ağırlık negatif olmadığı için davranışsal hata doğmuyordu — ama kural
 * `money.ts`in güvencesinden ZAYIFTI ve bir gün negatif bir ölçüm alanına
 * kopyalanırsa sessizce yanlış olurdu.
 */
function compareDecimalStrings(a: string, b: string): number {
  const left = toScaledInt(a, WEIGHT_SCALE);
  const right = toScaledInt(b, WEIGHT_SCALE);
  return left === right ? 0 : left > right ? 1 : -1;
}

/**
 * Setlerden tekrar sayısı başına EN İYİ performansı seçer.
 *
 * Eşitlikte ÖNCE olan gün kazanır: rekor "ne zaman kırıldı" bilgisi taşır ve
 * aynı ağırlığı tekrar kaldırmak yeni bir rekor değildir.
 */
export function selectPersonalRecords(sets: readonly SetSnapshot[]): RecordCandidate[] {
  const best = new Map<number, RecordCandidate>();

  for (const set of sets) {
    if (set.weightKg === null) continue; // ağırlıksız set rekora girmez

    const current = best.get(set.reps);
    if (!current) {
      best.set(set.reps, {
        reps: set.reps,
        weightKg: set.weightKg,
        day: set.day,
        workoutSetId: set.id,
      });
      continue;
    }

    const comparison = compareDecimalStrings(set.weightKg, current.weightKg);
    const isHeavier = comparison > 0;
    const isEarlierWithSameWeight = comparison === 0 && set.day < current.day;

    if (isHeavier || isEarlierWithSameWeight) {
      best.set(set.reps, {
        reps: set.reps,
        weightKg: set.weightKg,
        day: set.day,
        workoutSetId: set.id,
      });
    }
  }

  return [...best.values()].sort((a, b) => a.reps - b.reps);
}

/* ===========================================================================
 * SERVİS TARAFI
 * ======================================================================== */

/**
 * Setin günü `Workout`tan gelir — İLİŞKİ AÇIKÇA SEÇİLİR.
 *
 * ⚠️ BULGU-025 BURADA ÖLÇÜLDÜ (T-111): bu `select` yoktu, sorgu düz
 * `findMany({ where: { exerciseId } })` idi ve dönüş tipi buna rağmen
 * `workout: { date: Date }` İDDİA EDİYORDU. Prisma ilişkiyi istemeden
 * döndürmez; gerçek istemciyle `set.workout` `undefined` olur ve
 * `dateToAppDay(set.workout.date)` ÇALIŞMA ZAMANINDA PATLARDI.
 *
 * ⚠️ VE DOSYANIN KAPSAMI %100'DÜ. Testler elle kurulmuş bir sahte istemci
 * geçiyordu ve o sahte istemci `workout`u VERİYORDU — yani test, Prisma'yı
 * değil ARAYÜZÜN KENDİSİNİ taklit ediyordu. Kapsam "kod koştu" der, "sorgu
 * doğru" demez. Projenin tekrar eden sınıfı: *bir değişmezlik testi izlediği
 * şeyi okumuyorsa onu korumaz.*
 *
 * Teşhisi yapan şey UYUM KAPISI oldu (dosyanın sonunda): gerçek `db`yi dar
 * arayüze atamak `tsc`yi "Property 'workout' is missing" ile kırdı. Bu dosyada
 * kapı YOKTU — `health-log.ts`te (T-110) vardı. Şimdi burada da var.
 */
const SET_SELECT = {
  id: true,
  reps: true,
  weightKg: true,
  workout: { select: { date: true } },
} as const;

/** Hesaplayıcının Prisma'dan ihtiyaç duyduğu asgari yüzey. */
export interface PersonalRecordClient {
  workoutSet: {
    findMany(args: {
      where: { exerciseId: string };
      select: typeof SET_SELECT;
    }): Promise<Array<{ id: string; reps: number; weightKg: unknown; workout: { date: Date } }>>;
  };
  personalRecord: {
    findMany(args: { where: { exerciseId: string } }): Promise<Array<{ id: string; reps: number }>>;
    /** Kaynak bağlarını BOŞALTIR — `workoutSetId @unique` yarışı için (aşağıda). */
    updateMany(args: {
      where: { exerciseId: string };
      data: { workoutSetId: null };
    }): Promise<{ count: number }>;
    upsert(args: {
      where: { exerciseId_reps: { exerciseId: string; reps: number } };
      update: { weightKg: string; date: Date; workoutSetId: string | null };
      create: {
        exerciseId: string;
        reps: number;
        weightKg: string;
        date: Date;
        workoutSetId: string | null;
      };
    }): Promise<unknown>;
    deleteMany(args: { where: { exerciseId: string; reps: { in: number[] } } }): Promise<{
      count: number;
    }>;
  };
}

export interface RecalculateResult {
  /** Yazılan/güncellenen rekor sayısı. */
  upserted: number;
  /** Artık karşılığı olmadığı için SİLİNEN rekor sayısı. */
  removed: number;
}

/**
 * Bir egzersizin tüm rekorlarını sıfırdan hesaplar ve veritabanıyla eşitler.
 *
 * SİLME YOLU KRİTİK: kaynağı kalmayan rekorlar `deleteMany` ile temizlenir.
 * Yalnızca `upsert` yapılsaydı, son 5 tekrarlık seti silen kullanıcı 5RM
 * rekorunu ekranda görmeye devam ederdi — ADR-021'in kapatmak istediği
 * "F5'in en olası sessiz hatası" tam olarak budur.
 *
 * Çağrılma anı: `WorkoutSet` ekleme/düzeltme/silme mutasyonundan SONRA,
 * aynı işlem (transaction) içinde.
 */
export async function recalculatePersonalRecords(
  exerciseId: string,
  client: PersonalRecordClient,
  toWeightString: (value: unknown) => string | null,
): Promise<RecalculateResult> {
  const sets = await client.workoutSet.findMany({ where: { exerciseId }, select: SET_SELECT });

  const snapshots: SetSnapshot[] = sets.map((set) => ({
    id: set.id,
    reps: set.reps,
    weightKg: toWeightString(set.weightKg),
    day: dateToAppDay(set.workout.date),
  }));

  const candidates = selectPersonalRecords(snapshots);
  const keepReps = new Set(candidates.map((candidate) => candidate.reps));

  const existing = await client.personalRecord.findMany({ where: { exerciseId } });
  const staleReps = existing.map((record) => record.reps).filter((reps) => !keepReps.has(reps));

  let removed = 0;
  if (staleReps.length > 0) {
    const result = await client.personalRecord.deleteMany({
      where: { exerciseId, reps: { in: staleReps } },
    });
    removed = result.count;
  }

  /*
   * ⚠️⚠️ BULGU-026 — `workoutSetId @unique` UPSERT SIRASINI KIRIYORDU (T-111).
   *
   * ÖLÇÜLEN SENARYO (sonda yazıldı, P2002 üretti):
   *   A seti `reps=5` olarak girilmiş, (ex,5) rekoru A'yı işaret ediyor.
   *   Kullanıcı A'yı DÜZELTİYOR: `reps` 5 → 3. Egzersizde başka bir 5'lik set
   *   (B) de var, yani 5RM BAYAT DEĞİL — B'ye taşınacak, silinmeyecek.
   *   Adaylar `reps` ARTAN sırada: [3RM→A, 5RM→B].
   *   İlk upsert (3RM→A) A'yı talep ediyor, ama A'yı hâlâ (ex,5) satırı tutuyor
   *   ve `workoutSetId` UNIQUE → P2002.
   *
   * ⚠️ HATANIN SINIFI "yanlış sonuç" değil "TAMAMEN BAŞARISIZ YAZMA": işlem
   * geri sarıyor, kullanıcının set düzeltmesi KAYBEDİLİYOR. Ve tetikleyicisi
   * tam olarak Karar 3'ün var olma sebebi olan hareket — YANLIŞ GİRİLMİŞ BİR
   * SETİ DÜZELTMEK. `deleteMany` bu durumda yardım etmiyor çünkü 5RM bayat
   * değil, SAHİP DEĞİŞTİRİYOR.
   *
   * ÇÖZÜM: upsert döngüsünden ÖNCE egzersizin tüm rekorlarının kaynak bağını
   * boşalt. `workoutSetId` nullable (`SetNull` zaten bunu gerektiriyor), yani
   * boş bir ara durum ŞEMAYA UYGUN; ve tüm döngü tek işlem içinde koştuğu için
   * o ara durumu kimse göremiyor.
   *
   * ⚠️ NEDEN "SIRAYI DÜZELTMEK" DEĞİL: hangi sıra güvenli olduğu adaylara
   * bağlı — bir setin sahipliği bir başkasına, onun sahipliği bir üçüncüye
   * geçebilir (döngüsel takas: A 5→3, C 3→5). Hiçbir sabit sıra bunu
   * çözmez. Bağları boşaltmak sıradan BAĞIMSIZ.
   */
  await client.personalRecord.updateMany({ where: { exerciseId }, data: { workoutSetId: null } });

  for (const candidate of candidates) {
    /*
     * ⚠️ `appDayToDate` — ELLE `new Date(\`${day}T00:00:00.000Z\`)` DEĞİL.
     * Burada iki satır tam olarak onu yapıyordu; aynı sonucu veriyordu ama
     * SAF YARDIMCININ İKİNCİ BİR TANIMIYDI (BULGU-024'ün kapatıldığı sınıf).
     * `PersonalRecord.date` bir `@db.Date`, yani UTC gece yarısı DOĞRU sınır
     * ve `appDayToDate` tam bunu üretiyor (`appDayStartInstant` DEĞİL — o
     * `timestamp` sütunlar için ve günü bir geri kaydırırdı).
     */
    const day = appDayToDate(candidate.day);

    await client.personalRecord.upsert({
      where: { exerciseId_reps: { exerciseId, reps: candidate.reps } },
      update: {
        weightKg: candidate.weightKg,
        date: day,
        workoutSetId: candidate.workoutSetId,
      },
      create: {
        exerciseId,
        reps: candidate.reps,
        weightKg: candidate.weightKg,
        date: day,
        workoutSetId: candidate.workoutSetId,
      },
    });
  }

  return { upserted: candidates.length, removed };
}
