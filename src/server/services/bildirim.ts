import webpush from 'web-push';

import { miktarBicim } from '@/components/panel/cuzdan-bicim';
import { ALISKANLIK_SAATI, litreBicim, SU_HEDEFI_ML, SU_SAATLERI } from '@/lib/hedefler';
import { guvenliHata } from '@/lib/security/guvenli-log';
import { db } from '@/server/db';
import type { WalletUnit } from '@/types';

import {
  addAppDays,
  appDayToDate,
  appToday,
  dateToAppDay,
  startOfAppWeek,
  toMeasureString,
  type AppDay,
} from './_shared';
import { aylikMetni, ayMetni, fetchAylikOzet } from './aylik-ozet';
import { oncekiAy } from './cuzdan-rapor';
import { fetchHabitDay } from './habit-gun';
import { fetchHaftalikOzet, ozetMetni } from './haftalik-ozet';
import { seriHesapla } from './ingilizce';
import { fetchIslenenBorclar, fetchIslenenGiderler } from './odeme-onay';

/**
 * BİLDİRİMLER (2026-10-30) — telefona push.
 *
 * ZAMANLAYICI uygulama sürecinin İÇİNDE (`src/instrumentation.ts`): 5 dakikada
 * bir `bildirimTuru()`. Sunucuda ek cron yok. Tek örnek koşuyor (docker
 * compose `uygulama`), yine de tekrar VERİTABANINDA önlenir: (tür, anahtar,
 * gün) eşsiz — yeniden başlatma ya da çakışan tur aynı bildirimi ikinci kez
 * gönderemez.
 *
 * NE ZAMAN (İstanbul saati):
 *   borç       09–21 · ödeme gününden 2 gün önce ve ödeme günü
 *   gider      09–21 · aylık: 2 gün önce ve günü · yıllık: 7 gün önce ve günü
 *   alışkanlık seçilen saatten gün sonuna · işaretlenmemiş alışkanlık kaldıysa
 *   su         seçilen saatler (2 saatlik pencere) · bugün hedefin altındaysa
 *   haftalık   pazar 20–23 · hafta boş değilse
 *   aylık      ayın 1'i 10–21 · önceki ay boş değilse
 *   ingilizce  20–22 · seri sürüyor ve bugün ders yoksa
 * Varsayılan saatler ve su hedefi `lib/hedefler.ts`te; kişisel değer `Tercih`te.
 * Rekor bildirimi zamanlayıcıdan değil set yazılırken gider (`spor-gelisim.ts`).
 * Pencere dışında gönderilmez: sunucu 19:00'da kalkarsa sabahın su
 * hatırlatması yığılıp gelmez.
 *
 * ANAHTARLAR: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Yoksa
 * özellik kapalı; ekran söyler.
 */

export interface Vapid {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function vapidAyarlari(env: Record<string, string | undefined> = process.env): Vapid | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim() || 'mailto:bildirim@sahinsamet.com';
  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
}

export interface Bildirim {
  tur: 'borc' | 'aliskanlik' | 'su' | 'haftalik' | 'aylik' | 'ingilizce' | 'test';
  /** Gün içinde tekrarı önleyen anahtar. */
  anahtar: string;
  baslik: string;
  govde: string;
  url: string;
}

export interface Tercih {
  borc: boolean;
  aliskanlik: boolean;
  su: boolean;
  haftalik?: boolean;
  aylik?: boolean;
  ingilizce?: boolean;
  suHedefMl?: number;
  suSaatleri?: readonly number[];
  aliskanlikSaati?: number;
}

export interface PlanGirdisi {
  gun: AppDay;
  /** İstanbul saati, 0–23. */
  saat: number;
  tercih: Tercih;
  borclar: { id: string; ad: string; odemeGunu: number; tutar: string | null }[];
  kalanAliskanliklar: string[];
  suMl: number | null;
  /** Ödenmiş ya da atlanmış taksitler: `borçId:YYYY-MM` — hatırlatılmaz. */
  odenen?: ReadonlySet<string>;
  /** Düzenli giderler: aylıkta ayın günü, yıllıkta `MM-GG`. */
  giderler?: {
    id: string;
    ad: string;
    tutar: string;
    ayinGunu: number | null;
    yillik: string | null;
  }[];
  /** İşlenmiş aylık giderler: `akışId:YYYY-MM`. */
  giderOdenen?: ReadonlySet<string>;
  /** Yalnızca pazar akşamı dolar; boş haftada `null`. */
  haftalikGovde?: string | null;
  /** Yalnızca ayın 1'inde dolar; önceki ay boşsa `null`. */
  aylikGovde?: string | null;
  /** İngilizce serisi; bugün ders yapıldıysa ya da seri yoksa 0. Yalnızca akşam dolar. */
  ingilizceSeri?: number;
}

/** Ayın son günü — 31'inde ödenen borç şubatta 28'ine düşer. SAF. */
function sonGun(gun: AppDay): number {
  const [y, m] = gun.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Pazar 20:00–23:00. SAF. */
function haftalikZamani(gun: AppDay, saat: number): boolean {
  return gun === addAppDays(startOfAppWeek(gun), 6) && saat >= 20 && saat < 23;
}

/** Ayın 1'i 10:00–21:00. SAF. */
function aylikZamani(gun: AppDay, saat: number): boolean {
  return gun.endsWith('-01') && saat >= 10 && saat < 21;
}

/** Bu saatte gönderilmesi gerekenler. SAF — zamanlayıcının bütün kararı. */
export function planla(g: PlanGirdisi): Bildirim[] {
  const sonuc: Bildirim[] = [];

  if (g.tercih.borc && g.saat >= 9 && g.saat < 21) {
    for (const b of g.borclar) {
      for (const kala of [2, 0] as const) {
        const hedef = addAppDays(g.gun, kala);
        const gunNo = Number(hedef.slice(8, 10));
        if (gunNo !== Math.min(b.odemeGunu, sonGun(hedef))) continue;
        if (g.odenen?.has(`${b.id}:${hedef.slice(0, 7)}`)) continue;
        sonuc.push({
          tur: 'borc',
          anahtar: `${b.id}:${hedef}`,
          baslik: kala === 0 ? 'Bugün ödeme günü' : 'Ödeme yaklaşıyor',
          govde:
            kala === 0
              ? `${b.ad}${b.tutar ? ` · ${b.tutar}` : ''}`
              : `${b.ad} — 2 gün sonra${b.tutar ? ` · ${b.tutar}` : ''}`,
          url: '/panel/cuzdan',
        });
      }
    }
  }

  if (g.tercih.borc && g.saat >= 9 && g.saat < 21) {
    for (const c of g.giderler ?? []) {
      const kalalar = c.yillik ? ([7, 0] as const) : ([2, 0] as const);
      for (const kala of kalalar) {
        const hedef = addAppDays(g.gun, kala);
        const uyuyor = c.yillik
          ? hedef.slice(5) === c.yillik
          : c.ayinGunu !== null &&
            Number(hedef.slice(8, 10)) === Math.min(c.ayinGunu, sonGun(hedef));
        if (!uyuyor) continue;
        if (!c.yillik && g.giderOdenen?.has(`${c.id}:${hedef.slice(0, 7)}`)) continue;
        sonuc.push({
          tur: 'borc',
          anahtar: `gider:${c.id}:${hedef}`,
          baslik: kala === 0 ? 'Bugün ödeme günü' : 'Ödeme yaklaşıyor',
          govde: kala === 0 ? `${c.ad} · ${c.tutar}` : `${c.ad} — ${kala} gün sonra · ${c.tutar}`,
          url: '/panel/cuzdan',
        });
      }
    }
  }

  const aliskanlikSaati = g.tercih.aliskanlikSaati ?? ALISKANLIK_SAATI;
  if (g.tercih.aliskanlik && g.saat >= aliskanlikSaati && g.kalanAliskanliklar.length > 0) {
    const n = g.kalanAliskanliklar.length;
    sonuc.push({
      tur: 'aliskanlik',
      anahtar: 'aksam',
      baslik: `Bugün ${n} alışkanlık kaldı`,
      govde: g.kalanAliskanliklar.slice(0, 4).join(', ') + (n > 4 ? '…' : ''),
      url: '/panel/hayat',
    });
  }

  const suHedefi = g.tercih.suHedefMl ?? SU_HEDEFI_ML;
  const suSaati = [...(g.tercih.suSaatleri ?? SU_SAATLERI)]
    .sort((a, b) => b - a)
    .find((s) => g.saat >= s && g.saat < s + 2);
  if (g.tercih.su && suSaati !== undefined && (g.suMl ?? 0) < suHedefi) {
    sonuc.push({
      tur: 'su',
      anahtar: `s${suSaati}`,
      baslik: 'Su içmeyi unutma 💧',
      govde: `Bugün ${litreBicim(g.suMl ?? 0)} L içtin, hedef ${litreBicim(suHedefi)} L.`,
      url: '/panel',
    });
  }

  if (g.tercih.haftalik !== false && g.haftalikGovde && haftalikZamani(g.gun, g.saat)) {
    sonuc.push({
      tur: 'haftalik',
      anahtar: 'pazar',
      baslik: 'Haftan hazır 📊',
      govde: g.haftalikGovde,
      url: '/panel/haftalik',
    });
  }

  if (g.tercih.aylik !== false && g.aylikGovde && aylikZamani(g.gun, g.saat)) {
    const ay = oncekiAy(g.gun.slice(0, 7));
    sonuc.push({
      tur: 'aylik',
      anahtar: ay,
      baslik: `${ayMetni(ay)} raporun hazır 📅`,
      govde: g.aylikGovde,
      url: `/panel/aylik?ay=${ay}`,
    });
  }

  if (g.tercih.ingilizce !== false && (g.ingilizceSeri ?? 0) > 0 && g.saat >= 20 && g.saat < 22) {
    sonuc.push({
      tur: 'ingilizce',
      anahtar: 'seri',
      baslik: `🔥 ${g.ingilizceSeri} günlük serin bozulmasın`,
      govde: 'Bugün henüz İngilizce dersi yok. Kısa bir ders seriyi korur.',
      url: '/panel/ingilizce',
    });
  }

  return sonuc;
}

const SAAT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Europe/Istanbul',
});

/** Kullanıcının o anki planı için veriyi toplar. */
async function planGirdisi(userId: string, simdi: Date): Promise<PlanGirdisi> {
  const gun = appToday(simdi);
  const saat = Number(SAAT.format(simdi));
  const [tercih, borclar, gunluk, saglik, giderler] = await Promise.all([
    db.bildirimTercihi.findUnique({ where: { userId } }),
    db.walletDebt.findMany({
      where: { isClosed: false, paymentDay: { not: null } },
      select: { id: true, name: true, paymentDay: true, monthlyPayment: true, unit: true },
    }),
    fetchHabitDay(gun, db, gun),
    db.healthLog.findUnique({ where: { date: appDayToDate(gun) }, select: { waterMl: true } }),
    db.walletFlow.findMany({
      where: { kind: 'EXPENSE', isActive: true, frequency: { in: ['MONTHLY', 'YEARLY'] } },
      select: {
        id: true,
        name: true,
        frequency: true,
        day: true,
        date: true,
        amount: true,
        unit: true,
      },
    }),
  ]);
  return {
    gun,
    saat,
    tercih: tercih ?? { borc: true, aliskanlik: true, su: true },
    borclar: borclar.map((b) => {
      const tutar = toMeasureString(b.monthlyPayment, 2);
      return {
        id: b.id,
        ad: b.name,
        odemeGunu: b.paymentDay ?? 1,
        tutar: tutar ? miktarBicim(tutar, b.unit as WalletUnit) : null,
      };
    }),
    kalanAliskanliklar: gunluk.items
      .filter((i) => i.gerekli && i.durum !== 'YAPILDI' && i.durum !== 'YAPILMADI')
      .map((i) => i.name),
    suMl: saglik?.waterMl ?? null,
    odenen: await fetchIslenenBorclar(),
    giderOdenen: await fetchIslenenGiderler(),
    giderler: giderler.map((c) => ({
      id: c.id,
      ad: c.name,
      tutar: miktarBicim(toMeasureString(c.amount, 2) ?? '0.00', c.unit as WalletUnit),
      ayinGunu: c.frequency === 'MONTHLY' ? c.day : null,
      yillik: c.frequency === 'YEARLY' && c.date ? dateToAppDay(c.date).slice(5) : null,
    })),
    haftalikGovde: haftalikZamani(gun, saat)
      ? ozetMetni(await fetchHaftalikOzet(gun, db, gun))
      : null,
    aylikGovde: await aylikGovdesi(userId, gun, saat),
    ingilizceSeri: saat >= 20 && saat < 22 ? await ingilizceSerisi(gun) : 0,
  };
}

/** Seri sürüyor ve bugün ders yoksa seri uzunluğu; yoksa 0. */
async function ingilizceSerisi(gun: AppDay): Promise<number> {
  const gunler = await db.ingilizceDers.findMany({
    where: { gun: { gte: appDayToDate(addAppDays(gun, -400)) } },
    select: { gun: true },
    distinct: ['gun'],
  });
  const { seri, bugunYapildi } = seriHesapla(
    gunler.map((g) => dateToAppDay(g.gun)),
    gun,
  );
  return bugunYapildi ? 0 : seri;
}

/**
 * Ayın 1'inde önceki ayın özeti. Gönderildiyse yeniden hesaplanmaz: tur gün boyu 5 dakikada
 * bir dönüyor, rapor da haftaları ve Cüzdan'ı okuyor.
 */
async function aylikGovdesi(userId: string, gun: AppDay, saat: number): Promise<string | null> {
  if (!aylikZamani(gun, saat)) return null;
  const ay = oncekiAy(gun.slice(0, 7));
  const gonderildi = await db.bildirimKaydi.findFirst({
    where: { tur: 'aylik', anahtar: `${userId}:${ay}` },
    select: { id: true },
  });
  return gonderildi ? null : aylikMetni(await fetchAylikOzet(ay, db, gun));
}

/** Kullanıcının tüm cihazlarına gönderir; ölü abonelikleri temizler. Gönderilen cihaz sayısı. */
export async function kullaniciyaGonder(
  userId: string,
  b: Pick<Bildirim, 'baslik' | 'govde' | 'url'>,
  vapid: Vapid,
): Promise<number> {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const abonelikler = await db.pushAbonelik.findMany({ where: { userId } });
  let ulasan = 0;
  await Promise.all(
    abonelikler.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          JSON.stringify({ baslik: b.baslik, govde: b.govde, url: b.url }),
          // Yanıt vermeyen uç nokta bütün turu bekletmesin.
          { TTL: 60 * 60, timeout: 10_000 },
        );
        ulasan += 1;
      } catch (error) {
        const kod = (error as { statusCode?: number }).statusCode;
        // Abonelik sona ermiş (uygulama silindi, izin geri alındı) — kaydı sil.
        if (kod === 404 || kod === 410) {
          await db.pushAbonelik.delete({ where: { id: a.id } }).catch(() => undefined);
        } else {
          guvenliHata('[bildirim] gönderilemedi:', kod ?? (error as Error).message);
        }
      }
    }),
  );
  return ulasan;
}

/** Zamanlayıcı turu — `instrumentation.ts` 5 dakikada bir çağırır. */
export async function bildirimTuru(simdi: Date = new Date()): Promise<number> {
  const vapid = vapidAyarlari();
  if (!vapid) return 0;

  const kullanicilar = await db.pushAbonelik.findMany({
    distinct: ['userId'],
    select: { userId: true },
  });
  let gonderilen = 0;
  for (const { userId } of kullanicilar) {
    const girdi = await planGirdisi(userId, simdi);
    for (const b of planla(girdi)) {
      // Önce KAYIT: eşsizlik ihlali (P2002) = bugün zaten gönderildi → atla. Başka veritabanı
      // hatası "gönderildi" sayılmaz, yukarı çıkar ve kayda geçer.
      const kayit = await db.bildirimKaydi
        .create({
          data: { tur: b.tur, anahtar: `${userId}:${b.anahtar}`, gun: appDayToDate(girdi.gun) },
        })
        .catch((error: unknown) => {
          if ((error as { code?: string }).code === 'P2002') return null;
          throw error;
        });
      if (!kayit) continue;
      const ulasan = await kullaniciyaGonder(userId, b, vapid);
      gonderilen += ulasan;
      // Hiçbir cihaza ulaşmadıysa kayıt silinir: 5 dakika sonraki tur pencere içinde yeniden dener.
      if (ulasan === 0) await db.bildirimKaydi.delete({ where: { id: kayit.id } });
    }
  }
  // Eski kayıtları temizle (30 gün) — tablo büyümesin.
  await db.bildirimKaydi.deleteMany({
    where: { gun: { lt: appDayToDate(addAppDays(appToday(simdi), -30)) } },
  });
  return gonderilen;
}
