import {
  addAppDays,
  appWallClockInstant,
  appWallClockMinutes,
  toAppDay,
  type AppDay,
} from '@/server/services/_shared/app-date';
import type { TakvimKategori } from '@/types';

import { gunAyMetni, GUN_ADLARI, saatMetni, saatteMetni } from './bicim';
import { TAKVIM_KATEGORILERI } from './kategoriler';
import { haftaninGunu, olusumlar, type Olusum, type TekrarliEtkinlik } from './tekrar';

/**
 * TAKVİM HATIRLATMALARI (2026-11-10) — SAF. Zamanlayıcı (`services/takvim-bildirim.ts`) her
 * dakika `vadesiGelenler`i sorar; karar tamamen burada.
 *
 * Hatırlatma = dakika cinsinden ÖNCELİK. Saatli etkinlikte başlangıçtan önce; tüm gün etkinlikte o
 * günün 09:00'ından önce ("1 gün önce" = önceki gün 09:00).
 *
 * GEÇ KALMA: ancak vakti geldikten sonraki `HATIRLATMA_TOLERANSI_MS` içinde ve etkinlik bitmeden
 * gönderilir. Sunucu bir saat kapalı kalıp kalkınca o saatin bütün hatırlatmaları yığılıp gelmez.
 */

/** Tüm gün etkinliğin hatırlatma çapası: 09:00. */
export const TUM_GUN_SAATI_DK = 9 * 60;
export const EN_COK_HATIRLATMA = 5;
/** 4 hafta. */
export const EN_UZUN_HATIRLATMA_DK = 4 * 7 * 1440;
export const HATIRLATMA_TOLERANSI_MS = 15 * 60_000;

export const SAATLI_SECENEKLER = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080] as const;
export const TUM_GUN_SECENEKLERI = [0, 1440, 2880, 10080] as const;

export function varsayilanHatirlatmalar(tumGun: boolean): number[] {
  return tumGun ? [0] : [30];
}

/** "30 dk" · "1 saat" · "1 saat 30 dk" · "2 gün" · "1 hafta". */
export function sureMetni(dk: number): string {
  if (dk > 0 && dk % 10080 === 0) return `${dk / 10080} hafta`;
  if (dk > 0 && dk % 1440 === 0) return `${dk / 1440} gün`;
  if (dk >= 60) {
    const saat = Math.floor(dk / 60);
    const kalan = dk % 60;
    return kalan === 0 ? `${saat} saat` : `${saat} saat ${kalan} dk`;
  }
  return `${dk} dk`;
}

/** Formda ve detayda görünen ad. Tüm gün: "Gününde 09:00", "1 gün önce 09:00", "Gününde 08:00". */
export function hatirlatmaEtiketi(dk: number, tumGun: boolean): string {
  if (!tumGun) return dk === 0 ? 'Başlangıçta' : `${sureMetni(dk)} önce`;
  const capa = TUM_GUN_SAATI_DK - dk;
  const gunOnce = capa >= 0 ? 0 : Math.ceil(-capa / 1440);
  const saat = saatMetni(capa + gunOnce * 1440);
  if (gunOnce === 0) return `Gününde ${saat}`;
  if (gunOnce % 7 === 0) return `${gunOnce / 7} hafta önce ${saat}`;
  return `${gunOnce} gün önce ${saat}`;
}

/** Hatırlatmanın ANI. */
export function hatirlatmaAni(
  olusum: Pick<Olusum, 'baslangic' | 'gun'>,
  tumGun: boolean,
  dk: number,
): Date {
  const capa = tumGun
    ? appWallClockInstant(olusum.gun, TUM_GUN_SAATI_DK).getTime()
    : olusum.baslangic.getTime();
  return new Date(capa - dk * 60_000);
}

/**
 * Tekrar önleme anahtarı: etkinlik + OLUŞUMUN başlangıcı + öncelik. Tekrarlayan etkinliğin her
 * oluşumu ve her hatırlatması ayrı; etkinliğin saati değişirse yeni oluşumun hatırlatması yine gider.
 */
export function hatirlatmaAnahtari(etkinlikId: string, olusumBaslangic: Date, dk: number): string {
  return `${etkinlikId}:${olusumBaslangic.toISOString()}:${dk}`;
}

export interface HatirlatmaliEtkinlik extends TekrarliEtkinlik {
  id: string;
  baslik: string;
  konum: string | null;
  kategori: TakvimKategori;
  hatirlatmalar: readonly number[];
}

export interface VadesiGelen {
  etkinlik: HatirlatmaliEtkinlik;
  olusum: Olusum;
  dk: number;
  an: Date;
  anahtar: string;
}

/** Şu an gönderilmesi gereken hatırlatmalar. */
export function vadesiGelenler(
  etkinlikler: readonly HatirlatmaliEtkinlik[],
  simdi: Date,
  tolerans: number = HATIRLATMA_TOLERANSI_MS,
): VadesiGelen[] {
  // Hatırlatması şimdi olabilecek her oluşumu kapsayan pencere: en uzun öncelik + tüm gün çapası.
  const bas = new Date(simdi.getTime() - tolerans - 86_400_000);
  const son = new Date(simdi.getTime() + EN_UZUN_HATIRLATMA_DK * 60_000 + 2 * 86_400_000);
  const sonuc: VadesiGelen[] = [];

  for (const e of etkinlikler) {
    if (e.hatirlatmalar.length === 0) continue;
    for (const olusum of olusumlar(e, bas, son)) {
      const bitti =
        olusum.bitis.getTime() > olusum.baslangic.getTime()
          ? simdi >= olusum.bitis
          : simdi.getTime() - olusum.baslangic.getTime() > tolerans;
      if (bitti) continue;
      for (const dk of new Set(e.hatirlatmalar)) {
        const an = hatirlatmaAni(olusum, e.tumGun, dk);
        const gecikme = simdi.getTime() - an.getTime();
        if (gecikme < 0 || gecikme > tolerans) continue;
        sonuc.push({
          etkinlik: e,
          olusum,
          dk,
          an,
          anahtar: hatirlatmaAnahtari(e.id, olusum.baslangic, dk),
        });
      }
    }
  }
  return sonuc;
}

/** "şimdi" · "30 dk sonra" · "1 saat 15 dk sonra" · "2 gün sonra". */
export function kalanMetni(dk: number): string {
  if (dk <= 0) return 'şimdi';
  if (dk < 60) return `${dk} dk sonra`;
  if (dk < 1440) {
    const saat = Math.floor(dk / 60);
    const kalan = dk % 60;
    return kalan === 0 ? `${saat} saat sonra` : `${saat} saat ${kalan} dk sonra`;
  }
  return `${Math.round(dk / 1440)} gün sonra`;
}

function gunIfadesi(gun: AppDay, bugun: AppDay): string {
  if (gun === bugun) return 'Bugün';
  if (gun === addAppDays(bugun, 1)) return 'Yarın';
  return `${gunAyMetni(gun)} ${GUN_ADLARI[haftaninGunu(gun) - 1]}`;
}

export interface BildirimMetni {
  baslik: string;
  govde: string;
  url: string;
}

/**
 * Push metni: başlık kategori ("🩺 Sağlık / Doktor"), gövde
 * "Diş hekimi · 14:30'da (30 dk sonra) · Kadıköy". URL takvimi o günde açar.
 */
export function hatirlatmaMetni(
  e: Pick<HatirlatmaliEtkinlik, 'baslik' | 'konum' | 'kategori' | 'tumGun'>,
  olusum: Pick<Olusum, 'baslangic' | 'gun'>,
  simdi: Date,
): BildirimMetni {
  const kategori = TAKVIM_KATEGORILERI[e.kategori];
  const bugun = toAppDay(simdi);
  let zaman: string;
  if (e.tumGun) {
    zaman = `${gunIfadesi(olusum.gun, bugun)} (tüm gün)`;
  } else {
    const kalan = Math.round((olusum.baslangic.getTime() - simdi.getTime()) / 60_000);
    const saat = saatteMetni(appWallClockMinutes(olusum.baslangic));
    const gun = olusum.gun === bugun ? '' : `${gunIfadesi(olusum.gun, bugun)} `;
    zaman = `${gun}${saat} (${kalanMetni(kalan)})`;
  }
  return {
    baslik: `${kategori.emoji} ${kategori.ad}`,
    govde: [e.baslik, zaman, e.konum].filter(Boolean).join(' · '),
    url: `/panel/takvim?gorunum=gun&tarih=${olusum.gun}`,
  };
}
