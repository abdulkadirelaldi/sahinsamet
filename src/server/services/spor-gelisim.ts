import { guvenliHata } from '@/lib/security/guvenli-log';
import { db } from '@/server/db';

import {
  addAppDays,
  appDayToDate,
  appToday,
  dateToAppDay,
  startOfAppWeek,
  toMeasureString,
  type AppDay,
} from './_shared';
import { kullaniciyaGonder, vapidAyarlari } from './bildirim';

/**
 * SPOR GELİŞİMİ (2026-11-01) — haftalık hacim, hareket başına ağırlık, rekor.
 *
 * Hacim = tekrar × ağırlık; ağırlıksız setler (vücut ağırlığı) girmez.
 *
 * REKOR BİLDİRİMİ `PersonalRecord` tablosundan AYRI bir karardır: orada her yeni
 * tekrar sayısı kendiliğinden rekordur, her biri için bildirim gürültü olurdu.
 * Burada set ya hareketin en ağırını ya da aynı tekrardaki en iyiyi GEÇMELİ.
 */

const HACIM_HAFTA = 8;

export interface GelisimSeti {
  exerciseId: string;
  ad: string;
  reps: number;
  kg: number;
  gun: AppDay;
}

export interface SporGelisim {
  hacim: { hafta: AppDay; kg: number }[];
  hareketler: { id: string; ad: string; setSayisi: number }[];
  secili: string | null;
  /** Antrenman başına en ağır set, eskiden yeniye. */
  seri: { gun: AppDay; deger: string }[];
}

/** Bütün hesap. `istenen` listede yoksa en çok çalışılan hareket. SAF. */
export function gelisimHesapla(
  setler: readonly GelisimSeti[],
  istenen: string | undefined,
  bugun: AppDay,
): SporGelisim {
  const buHafta = startOfAppWeek(bugun);
  const hacim = Array.from({ length: HACIM_HAFTA }, (_, i) => ({
    hafta: addAppDays(buHafta, (i - HACIM_HAFTA + 1) * 7),
    kg: 0,
  }));
  const hareket = new Map<string, { id: string; ad: string; setSayisi: number }>();

  for (const s of setler) {
    const satir = hacim.find((h) => h.hafta === startOfAppWeek(s.gun));
    if (satir) satir.kg += s.reps * s.kg;
    const h = hareket.get(s.exerciseId);
    if (h) h.setSayisi += 1;
    else hareket.set(s.exerciseId, { id: s.exerciseId, ad: s.ad, setSayisi: 1 });
  }

  const hareketler = [...hareket.values()].sort(
    (a, b) => b.setSayisi - a.setSayisi || a.ad.localeCompare(b.ad, 'tr'),
  );
  const secili = istenen && hareket.has(istenen) ? istenen : (hareketler[0]?.id ?? null);

  const enAgir = new Map<AppDay, number>();
  for (const s of setler) {
    if (s.exerciseId === secili) enAgir.set(s.gun, Math.max(enAgir.get(s.gun) ?? 0, s.kg));
  }

  return {
    hacim: hacim.map((h) => ({ ...h, kg: Math.round(h.kg) })),
    hareketler,
    secili,
    seri: [...enAgir.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([gun, kg]) => ({ gun, deger: String(kg) })),
  };
}

/** Son 1 yılın ağırlıklı setleri üzerinden gelişim. */
export async function fetchSporGelisim(
  istenen?: string,
  client: Pick<typeof db, 'workoutSet'> = db,
  bugun: AppDay = appToday(),
): Promise<SporGelisim> {
  const satirlar = await client.workoutSet.findMany({
    where: {
      weightKg: { gt: 0 },
      workout: { date: { gte: appDayToDate(addAppDays(bugun, -365)) } },
    },
    select: {
      exerciseId: true,
      reps: true,
      weightKg: true,
      exercise: { select: { name: true } },
      workout: { select: { date: true } },
    },
  });
  return gelisimHesapla(
    satirlar.map((s) => ({
      exerciseId: s.exerciseId,
      ad: s.exercise.name,
      reps: s.reps,
      kg: Number(toMeasureString(s.weightKg, 2)),
      gun: dateToAppDay(s.workout.date),
    })),
    istenen,
    bugun,
  );
}

/* ── REKOR ─────────────────────────────────────────────────────────────── */

interface SetOzu {
  reps: number;
  kg: number;
}

/** Bu set bildirilecek bir rekor mu? Hareketin ilk kaydı rekor DEĞİL. SAF. */
export function rekorMu(yeni: SetOzu, oncekiler: readonly SetOzu[]): boolean {
  if (yeni.kg <= 0 || oncekiler.length === 0) return false;
  if (yeni.kg > Math.max(...oncekiler.map((o) => o.kg))) return true;
  const ayniTekrar = oncekiler.filter((o) => o.reps === yeni.reps).map((o) => o.kg);
  return ayniTekrar.length > 0 && yeni.kg > Math.max(...ayniTekrar);
}

export interface EklenenSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  reps: number;
  weightKg: string | null;
}

/** Tercih ve tekrar denetimiyle telefona gönderir. */
async function rekorGonder(userId: string, set: EklenenSet, kg: number): Promise<void> {
  const vapid = vapidAyarlari();
  if (!vapid) return;
  const tercih = await db.bildirimTercihi.findUnique({ where: { userId } });
  if (tercih && !tercih.rekor) return;

  const anahtar = `${userId}:${set.exerciseId}:${set.reps}:${kg}`;
  const kayit = await db.bildirimKaydi
    .create({ data: { tur: 'rekor', anahtar, gun: appDayToDate(appToday()) } })
    .catch((error: unknown) => {
      // Yalnızca eşsizlik "zaten gönderildi" demek; başka hata çağırana çıkar.
      if ((error as { code?: string }).code === 'P2002') return null;
      throw error;
    });
  if (!kayit) return;

  await kullaniciyaGonder(
    userId,
    {
      baslik: 'Yeni rekor 🏆',
      govde: `${set.exerciseName} · ${String(kg).replace('.', ',')} kg × ${set.reps}`,
      url: '/panel/spor/gelisim',
      tur: 'rekor',
      anahtar: `${set.exerciseId}:${set.reps}:${kg}`,
    },
    vapid,
  );
}

/**
 * Yazılan set rekor mu; öyleyse telefona da gönderir. Gönderim BEKLENMEZ: push
 * servisinin yavaşlığı salondaki set kaydını geciktirmemeli.
 */
export async function rekorDenetle(userId: string, set: EklenenSet): Promise<boolean> {
  const kg = Number(set.weightKg ?? 0);
  const oncekiler = await db.workoutSet.findMany({
    where: { exerciseId: set.exerciseId, id: { not: set.id }, weightKg: { gt: 0 } },
    select: { reps: true, weightKg: true },
  });
  const rekor = rekorMu(
    { reps: set.reps, kg },
    oncekiler.map((o) => ({ reps: o.reps, kg: Number(toMeasureString(o.weightKg, 2)) })),
  );
  if (rekor) {
    void rekorGonder(userId, set, kg).catch((error: unknown) =>
      guvenliHata('[rekor] gönderilemedi:', error instanceof Error ? error.message : error),
    );
  }
  return rekor;
}
