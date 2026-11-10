import {
  addAppDays,
  appDayStartInstant,
  appDayToDate,
  appWallClockInstant,
  appWallClockMinutes,
  differenceInAppDays,
  startOfAppWeek,
  toAppDay,
  type AppDay,
} from '@/server/services/_shared/app-date';
import type { TakvimTekrar } from '@/types';

/**
 * TAKVİM TEKRAR KURALI (2026-11-10) — SAF. Tekrarlayan etkinlik veritabanında TEK satır; oluşumlar
 * okunurken burada açılır. Kurallar Google Takvim ile aynı:
 *
 *   GUNLUK    her `aralik` günde bir
 *   HAFTALIK  her `aralik` haftada bir, seçili günlerde (1 = pazartesi … 7 = pazar). Hafta pazartesi
 *             başlar. Başlangıç günü seçili günlerden biri değilse ilk oluşum ondan sonraki seçili gün.
 *   AYLIK     her `aralik` ayda bir, başlangıcın AYIN GÜNÜNDE. ⚠️ O gün olmayan ay ATLANIR: 31'inde
 *             başlayan etkinlik şubatta ve 30 çeken aylarda yoktur (Google böyle; ay sonuna kırpmak
 *             — `addAppMonths` — burada YANLIŞ olurdu: "her ayın 31'i" 28 Şubat'ta görünürdü).
 *   YILLIK    her `aralik` yılda bir aynı gün; 29 Şubat yalnızca artık yıllarda.
 *
 * Sınırlar: `bitisGun` (dahil) ya da `sayi`. Sayı ADAYLARA uygulanır (RFC 5545 COUNT): silinen bir
 * oluşum sayıyı azaltmaz, seri yine aynı günde biter.
 *
 * Duvar saati: oluşum, başlangıcın İstanbul saatinde başlar (`appWallClockInstant`). Türkiye'de yaz
 * saati yok ama sabit 24 saat eklemek, olan bir dilimde "her gün 09:00"ı 10:00'a kaydırırdı.
 */

export interface TekrarKurali {
  tur: TakvimTekrar;
  /** ≥ 1. */
  aralik: number;
  /** HAFTALIK: 1 = pazartesi … 7 = pazar. Boşsa başlangıcın günü. */
  gunler: readonly number[];
  /** Son oluşumun günü (dahil). */
  bitisGun: AppDay | null;
  sayi: number | null;
}

export const TEKRAR_YOK: TekrarKurali = {
  tur: 'YOK',
  aralik: 1,
  gunler: [],
  bitisGun: null,
  sayi: null,
};

/** 1 = pazartesi … 7 = pazar. */
export function haftaninGunu(gun: AppDay): number {
  const d = appDayToDate(gun).getUTCDay();
  return d === 0 ? 7 : d;
}

function ayinGunSayisi(yil: number, ay: number): number {
  return new Date(Date.UTC(yil, ay, 0)).getUTCDate();
}

const iki = (n: number): string => String(n).padStart(2, '0');

/**
 * Kuralın ADAY günleri — istisnalar ÇIKARILMADAN, sırayla, `sonGun`e kadar (dahil).
 *
 * `ilkGun` verilirse ve sayı sınırı YOKSA, ondan çok önceki adaylar atlanarak başlanır: on yıllık
 * günlük bir seride her ekran açılışında 3650 gün yürümemek için. Sayı sınırı varken atlanamaz —
 * kaçıncı aday olduğunu bilmek için baştan saymak gerekir (sayı en çok 730, yani ucuz).
 */
export function* adayGunler(
  baslangicGun: AppDay,
  kural: TekrarKurali,
  sonGun: AppDay,
  ilkGun?: AppDay,
): Generator<AppDay> {
  const sinir = kural.bitisGun !== null && kural.bitisGun < sonGun ? kural.bitisGun : sonGun;
  if (baslangicGun > sinir) return;
  if (kural.tur === 'YOK') {
    yield baslangicGun;
    return;
  }

  const aralik = Math.max(1, Math.floor(kural.aralik));
  const atla = kural.sayi === null && ilkGun !== undefined && ilkGun > baslangicGun ? ilkGun : null;
  const dolu = (uretilen: number) => kural.sayi !== null && uretilen >= kural.sayi;
  let uretilen = 0;

  if (kural.tur === 'GUNLUK') {
    let n = atla
      ? Math.max(0, Math.floor(differenceInAppDays(baslangicGun, atla) / aralik) - 1)
      : 0;
    for (; ; n += 1) {
      const gun = addAppDays(baslangicGun, n * aralik);
      if (gun > sinir || dolu(uretilen)) return;
      uretilen += 1;
      yield gun;
    }
  }

  if (kural.tur === 'HAFTALIK') {
    const gunler = [
      ...new Set(kural.gunler.length > 0 ? kural.gunler : [haftaninGunu(baslangicGun)]),
    ].sort((a, b) => a - b);
    const pazartesi = startOfAppWeek(baslangicGun);
    let k = atla
      ? Math.max(0, Math.floor(differenceInAppDays(pazartesi, atla) / 7 / aralik) - 1)
      : 0;
    for (; ; k += 1) {
      const haftaBasi = addAppDays(pazartesi, k * 7 * aralik);
      if (haftaBasi > sinir) return;
      for (const hg of gunler) {
        const gun = addAppDays(haftaBasi, hg - 1);
        if (gun < baslangicGun) continue;
        if (gun > sinir || dolu(uretilen)) return;
        uretilen += 1;
        yield gun;
      }
    }
  }

  // AYLIK ve YILLIK: aynı yürüyüş, adım 1 ya da 12 ay.
  const adim = (kural.tur === 'YILLIK' ? 12 : 1) * aralik;
  const yil = Number(baslangicGun.slice(0, 4));
  const ay = Number(baslangicGun.slice(5, 7));
  const ayinGunu = Number(baslangicGun.slice(8, 10));
  const toplamBas = yil * 12 + (ay - 1);
  let n = 0;
  if (atla) {
    const hedefYil = Number(atla.slice(0, 4));
    const hedefAy = Number(atla.slice(5, 7));
    n = Math.max(0, Math.floor((hedefYil * 12 + (hedefAy - 1) - toplamBas) / adim) - 1);
  }
  for (; ; n += 1) {
    const toplam = toplamBas + n * adim;
    const y = Math.floor(toplam / 12);
    const a = (toplam % 12) + 1;
    if (`${String(y).padStart(4, '0')}-${iki(a)}-01` > sinir) return;
    // O gün bu ayda yoksa (31 → nisan, 29 şubat → artık olmayan yıl) bu ay ATLANIR.
    if (ayinGunu > ayinGunSayisi(y, a)) continue;
    const gun = `${String(y).padStart(4, '0')}-${iki(a)}-${iki(ayinGunu)}`;
    if (gun > sinir || dolu(uretilen)) return;
    uretilen += 1;
    yield gun;
  }
}

/** Oluşum açmak için gereken alanlar — servis satırı ve ekran DTO'su ikisi de karşılar. */
export interface TekrarliEtkinlik {
  tumGun: boolean;
  baslangic: Date;
  bitis: Date;
  tekrar: TekrarKurali;
  istisnalar: readonly AppDay[];
}

export interface Olusum {
  baslangic: Date;
  bitis: Date;
  /** Oluşumun başladığı İstanbul günü — istisna ve hatırlatma anahtarı bununla kurulur. */
  gun: AppDay;
}

/** Tüm gün etkinliğin kaç gün sürdüğü (en az 1). */
export function tumGunSuresi(e: Pick<TekrarliEtkinlik, 'baslangic' | 'bitis'>): number {
  return Math.max(1, differenceInAppDays(toAppDay(e.baslangic), toAppDay(e.bitis)));
}

/** `gun`de başlayan oluşumun anları. */
export function olusumAnlari(e: TekrarliEtkinlik, gun: AppDay): Olusum {
  if (e.tumGun) {
    return {
      gun,
      baslangic: appDayStartInstant(gun),
      bitis: appDayStartInstant(addAppDays(gun, tumGunSuresi(e))),
    };
  }
  const baslangic = appWallClockInstant(gun, appWallClockMinutes(e.baslangic));
  return {
    gun,
    baslangic,
    bitis: new Date(baslangic.getTime() + (e.bitis.getTime() - e.baslangic.getTime())),
  };
}

/**
 * `[bas, son)` aralığına DEĞEN oluşumlar, başlangıca göre sıralı. Önceki günde başlayıp araya
 * taşan (gece yarısını geçen ya da çok günlük) oluşum da dahil. Süresi sıfır olan etkinlik,
 * başlangıcı aralıktaysa dahil.
 */
export function olusumlar(e: TekrarliEtkinlik, bas: Date, son: Date): Olusum[] {
  const ilkGun = toAppDay(e.baslangic);
  const sureMs = e.bitis.getTime() - e.baslangic.getTime();
  const tasma = e.tumGun ? tumGunSuresi(e) : Math.ceil(sureMs / 86_400_000) + 1;
  const altGun = addAppDays(toAppDay(bas), -tasma);
  const istisna = new Set(e.istisnalar);
  const sonuc: Olusum[] = [];

  for (const gun of adayGunler(ilkGun, e.tekrar, toAppDay(son), altGun)) {
    if (gun < altGun || istisna.has(gun)) continue;
    const o = olusumAnlari(e, gun);
    const sifirSure = o.bitis.getTime() === o.baslangic.getTime();
    if (o.baslangic < son && (o.bitis > bas || (sifirSure && o.baslangic >= bas))) sonuc.push(o);
  }
  return sonuc;
}

/** `gun`den ÖNCEKİ aday sayısı — "bu ve sonrakiler" bölünmesinde sayı sınırını paylaştırmak için. */
export function oncekiAdaySayisi(baslangicGun: AppDay, kural: TekrarKurali, gun: AppDay): number {
  let n = 0;
  for (const aday of adayGunler(baslangicGun, kural, addAppDays(gun, -1))) {
    if (aday >= gun) break;
    n += 1;
  }
  return n;
}

/** `gun` bu kuralın (istisnalar hariç) bir aday günü mü. */
export function adayMi(baslangicGun: AppDay, kural: TekrarKurali, gun: AppDay): boolean {
  for (const aday of adayGunler(baslangicGun, kural, gun, gun)) {
    if (aday === gun) return true;
  }
  return false;
}
