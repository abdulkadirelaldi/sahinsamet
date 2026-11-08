import type { Equipment, MuscleGroup, WorkoutType } from '@/types';
import { db } from '@/server/db';

import { appDayToDate, appToday, dateToAppDay, toMeasureString, type AppDay } from './_shared';

/**
 * SPOR · PROGRAM VE CANLI ANTRENMAN OTURUMU (2026-10-30).
 *
 * Sahibi telefonda program gününü seçip "Başlat" diyor, hareket hareket
 * ilerliyor, her seti "tamamlandı" ile kaydediyor; hepsi bitince süre ve
 * tahmini kalori çıkıyor. Setler mevcut `createWorkoutSetAction` ile yazılıyor
 * (kişisel rekor hesabı orada) — bu dosya yalnızca program, oturum başlatma/
 * okuma ve bitirmeyi taşıyor.
 *
 * OTURUM = `startedAt` dolu, `finishedAt` boş bir `Workout`. Aynı anda tek
 * oturum: başlatmak, açık bir oturum varsa onu döndürür (yanlışlıkla ikinci
 * bir antrenman açılmasın, telefonda sayfa kapanıp açılınca kaldığı yerden).
 */

type Client = typeof db;

/* ===========================================================================
 * KALORİ — SAF
 * ======================================================================== */

/**
 * MET değerleri (Compendium of Physical Activities'e yakın ortalamalar):
 * ağırlık antrenmanı setler arası dinlenme DAHİL ortalama 5,0; yüzme/koşu
 * orta tempo 8,0. Tahmin — kalp atımı ya da ölçüm değil; ekranda "yaklaşık".
 */
export const MET = { GYM: 5.0, CARDIO: 8.0, KAYAK: 7.0, OTHER: 4.0 } as const satisfies Record<
  WorkoutType,
  number
>;

/** Kilo bilinmiyorsa kullanılan değer — ekranda "son tartı yok" diye yazılıyor. */
export const VARSAYILAN_KILO = 80;
const MAKS_OTURUM_DK = 240;
export const EK_HAREKET_SETI = 3;

/** kcal = MET × kg × saat, tam sayıya yuvarlanır. Süre 0 ya da eksi ise 0. */
export function kaloriHesapla({
  dakika,
  kiloKg,
  met,
}: {
  dakika: number;
  kiloKg: number;
  met: number;
}): number {
  if (dakika <= 0 || kiloKg <= 0) return 0;
  return Math.round(met * kiloKg * (dakika / 60));
}

/* ===========================================================================
 * PROGRAM — sahibinin 5 günlük "kol ağırlıklı" programı (PDF, 2026-10-29)
 * ======================================================================== */

interface ProgramHareketi {
  ad: string;
  kas: MuscleGroup;
  ekipman: Equipment;
  ipucu?: string;
  set: number;
  tekrar: string;
  /** Bileşik 105 sn (90–120), izolasyon 60 sn (45–60) — PDF'in dinlenme notu. */
  dinlenme: number;
}

const BILESIK = 105;
const IZOLE = 60;

/* Aynı hareket birden çok günde geçiyor — ad ve ipucu TEK yerde. */
const H = {
  bench: {
    ad: 'Barbell Bench Press',
    kas: 'CHEST',
    ekipman: 'BARBELL',
    ipucu:
      'Kürek kemikleri sıkışık, sırt sehpada. Barı göğüs ortasına indir, dirsek ~45°; patlayıcı it.',
  },
  dbPress: {
    ad: 'DB Flat Press',
    kas: 'CHEST',
    ekipman: 'DUMBBELL',
    ipucu:
      'Dumbbellları göğüs hizasında kontrollü indir, altta 1 sn bekle; yukarıda hafif yaklaştır.',
  },
  ohp: {
    ad: 'Omuz Press (OHP)',
    kas: 'SHOULDERS',
    ekipman: 'BARBELL',
    ipucu:
      'Karın sıkı, beli abartma. Barı çeneden yukarı it, başın üstünde kilitle; kalçadan destek yok.',
  },
  yanRaise: {
    ad: 'DB Yan (Lateral) Raise',
    kas: 'SHOULDERS',
    ekipman: 'DUMBBELL',
    ipucu:
      'Hafif ağırlık yeter. Dirsek hafif bükük, omuz hizasına kaldır, yavaş indir; trapeze yükleme.',
  },
  dips: {
    ad: 'Z-Bar Close-Grip Press / Sehpa Dips',
    kas: 'ARMS',
    ekipman: 'BARBELL',
    ipucu:
      'Dips: eller sehpa kenarında, dirsek 90°ye kadar in, tricepsle it; omuzlar kulaktan uzak.',
  },
  skull: {
    ad: 'Z-Bar Skull Crusher',
    kas: 'ARMS',
    ekipman: 'BARBELL',
    ipucu: 'Üst kol sabit ve dik; yalnızca dirsek açılıp kapanır. Barı alına indir, tricepsle it.',
  },
  row: {
    ad: 'Barbell Bent-Over Row',
    kas: 'BACK',
    ekipman: 'BARBELL',
    ipucu: 'Kalçadan ~30° öne eğil, sırt düz. Barı göbeğe çek, dirsek geriye; sallanma yok.',
  },
  tekRow: {
    ad: 'Tek Kol DB Row',
    kas: 'BACK',
    ekipman: 'DUMBBELL',
    ipucu: 'El ve diz sehpada, sırt yere paralel. Dumbbellı kalçaya çek, üstte 1 sn sık.',
  },
  pullover: {
    ad: 'DB Pullover',
    kas: 'BACK',
    ekipman: 'DUMBBELL',
    ipucu:
      'Sırt sehpada, tek dumbbell iki elde. Baş arkasına kontrollü aç, lat/göğüsle geri getir.',
  },
  shrug: {
    ad: 'Barbell/DB Shrug',
    kas: 'BACK',
    ekipman: 'BARBELL',
    ipucu: 'Düz kollarla omuzları kulaklara doğru kaldır, tepede 1 sn sık; boynu döndürme.',
  },
  rearDelt: {
    ad: 'DB Rear Delt Raise',
    kas: 'SHOULDERS',
    ekipman: 'DUMBBELL',
    ipucu: 'Öne eğil, sırt düz. Kolları yanlara aç, arka omzu sık; ağırlık düşük.',
  },
  zCurl: {
    ad: 'Z-Bar Curl',
    kas: 'ARMS',
    ekipman: 'BARBELL',
    ipucu: 'Dirsekler gövdeye sabit. Yukarı kıvır, tepede sık, yavaş indir; belden yardım yok.',
  },
  hammer: {
    ad: 'DB Hammer Curl',
    kas: 'ARMS',
    ekipman: 'DUMBBELL',
    ipucu: 'Avuç içleri karşılıklı, dirsek sabit. Ön kola ve kola kalınlık verir.',
  },
  inclineCurl: {
    ad: 'DB Incline / Hammer Curl',
    kas: 'ARMS',
    ekipman: 'DUMBBELL',
    ipucu: 'Dirsekler sabit, tam açılıp tam kıvır; sallama yok.',
  },
  konsantrasyon: {
    ad: 'Konsantrasyon Curl',
    kas: 'ARMS',
    ekipman: 'DUMBBELL',
    ipucu: 'Dirseği iç bacağa daya. Tam ger, tam kıvır, tepede bicepsi sık.',
  },
  overhead: {
    ad: 'Tek DB Overhead Triceps Ext.',
    kas: 'ARMS',
    ekipman: 'DUMBBELL',
    ipucu: 'Dumbbell baş üstünde iki elde; yalnızca dirsek açılır, arkaya indir, yukarı kilitle.',
  },
  squat: {
    ad: 'Barbell/Goblet Squat',
    kas: 'LEGS',
    ekipman: 'BARBELL',
    ipucu: 'Ayaklar omuz genişliği. Kalçayı geri-aşağı it, uyluk paralel, göğüs dik, topuktan it.',
  },
  rdl: {
    ad: 'Romanian Deadlift (RDL)',
    kas: 'LEGS',
    ekipman: 'BARBELL',
    ipucu: 'Diz hafif bükük SABİT. Kalçayı geri it, barı bacak boyunca indir, kalçayla doğrul.',
  },
  bulgarian: {
    ad: 'Bulgarian Split Squat',
    kas: 'LEGS',
    ekipman: 'DUMBBELL',
    ipucu: 'Arka ayak sehpada. Ön dizi 90°ye indir, gövde hafif öne; ön topuktan it.',
  },
  hipThrust: {
    ad: 'DB Hip Thrust',
    kas: 'LEGS',
    ekipman: 'DUMBBELL',
    ipucu: 'Sırt sehpa kenarında, dumbbell kalçada. Kalçayı kilitle, tepede 1 sn sık.',
  },
  calf: {
    ad: 'Ayakta Calf Raise',
    kas: 'LEGS',
    ekipman: 'BODYWEIGHT',
    ipucu: 'Ayak ucunda yüksel, tepede baldırı 1 sn sık, tam açıklıkla yavaş in.',
  },
  legRaise: {
    ad: 'Yatarak Leg Raise',
    kas: 'CORE',
    ekipman: 'BODYWEIGHT',
    ipucu: 'Sırtüstü, bel yere yapışık. Bacakları kontrollü kaldır, yere değdirmeden indir.',
  },
  frontSquat: {
    ad: 'Front Squat / Tempo Back Squat',
    kas: 'LEGS',
    ekipman: 'BARBELL',
    ipucu: 'Bar ön omuzda, dirsekler yukarı. Gövde dik; çök ve dik it — ön uyluğa biner.',
  },
  lunge: {
    ad: 'Ters Lunge',
    kas: 'LEGS',
    ekipman: 'DUMBBELL',
    ipucu: 'Geriye adım at, arka diz yere yaklaşsın. Ön uyluk paralel, öne it ve topla.',
  },
  karin: {
    ad: 'Karın Devresi (leg raise + plank + twist)',
    kas: 'CORE',
    ekipman: 'BODYWEIGHT',
    ipucu: 'Üç hareket arka arkaya bir tur; turlar arası dinlen.',
  },
  kosuYuzme: {
    ad: 'Koşu / Yüzme',
    kas: 'CARDIO',
    ekipman: 'OTHER',
    ipucu: 'Düşük-orta tempo; konuşabilecek kadar nefes.',
  },
} as const satisfies Record<
  string,
  { ad: string; kas: MuscleGroup; ekipman: Equipment; ipucu: string }
>;

const h = (
  hareket: (typeof H)[keyof typeof H],
  set: number,
  tekrar: string,
  dinlenme: number,
): ProgramHareketi => ({ ...hareket, set, tekrar, dinlenme });

export const ONERILEN_PROGRAM: ReadonlyArray<{
  ad: string;
  odak: string;
  haftaGunu: number | null;
  hareketler: ProgramHareketi[];
}> = [
  {
    ad: 'İtiş (Push)',
    odak: 'Göğüs / Omuz / Triceps',
    haftaGunu: 1,
    hareketler: [
      h(H.bench, 4, '6-10', BILESIK),
      h(H.dbPress, 3, '8-12', BILESIK),
      h(H.ohp, 3, '8-12', BILESIK),
      h(H.yanRaise, 4, '12-20', IZOLE),
      h(H.dips, 3, '8-12', IZOLE),
      h(H.skull, 3, '10-15', IZOLE),
    ],
  },
  {
    ad: 'Çekiş (Pull)',
    odak: 'Sırt / Biceps',
    haftaGunu: 2,
    hareketler: [
      h(H.row, 4, '8-12', BILESIK),
      h(H.tekRow, 3, '10-12 / kol', BILESIK),
      h(H.pullover, 3, '12-15', IZOLE),
      h(H.shrug, 3, '12-15', IZOLE),
      h(H.rearDelt, 3, '15-20', IZOLE),
      h(H.zCurl, 4, '10-12', IZOLE),
      h(H.hammer, 3, '12-15', IZOLE),
    ],
  },
  {
    ad: 'Bacak A + Karın',
    odak: 'Bacak / Karın · ardından yüzme',
    haftaGunu: 3,
    hareketler: [
      h(H.squat, 4, '10-15', BILESIK),
      h(H.rdl, 4, '10-12', BILESIK),
      h(H.bulgarian, 3, '10-12 / bacak', BILESIK),
      h(H.hipThrust, 3, '12-15', IZOLE),
      h(H.calf, 4, '15-20', IZOLE),
      h(H.legRaise, 3, '15-20', IZOLE),
    ],
  },
  {
    ad: 'Üst · Kol Ağırlıklı',
    odak: 'Biceps + Triceps + Omuz',
    haftaGunu: 4,
    hareketler: [
      h(H.ohp, 3, '8-12', BILESIK),
      h(H.yanRaise, 4, '15-20', IZOLE),
      h(H.zCurl, 4, '10-12', IZOLE),
      h(H.inclineCurl, 3, '12-15', IZOLE),
      h(H.konsantrasyon, 3, '12-15', IZOLE),
      h(H.skull, 3, '10-15', IZOLE),
      h(H.overhead, 3, '12-15', IZOLE),
      h(H.dips, 3, 'yetmezliğe kadar', IZOLE),
    ],
  },
  {
    ad: 'Bacak B + Kondisyon',
    odak: 'Bacak / Karın · bitiriş koşu ya da yüzme',
    haftaGunu: 5,
    hareketler: [
      h(H.frontSquat, 3, '12-15', BILESIK),
      h(H.rdl, 3, '12-15', BILESIK),
      h(H.lunge, 3, '12 / bacak', BILESIK),
      h(H.calf, 4, '15-20', IZOLE),
      h(H.karin, 3, '1 tur', IZOLE),
      h(H.kosuYuzme, 1, '15-20 dk', 0),
    ],
  },
  {
    ad: 'Yüzme / Koşu',
    odak: 'Kardiyo · düşük tempo',
    haftaGunu: 6,
    hareketler: [h(H.kosuYuzme, 1, '30-45 dk', 0)],
  },
];

/** Programı yükler — program günü yoksa. Hareketler ADA göre bulunur ya da açılır. */
export async function createSuggestedProgram(client: Client = db): Promise<number> {
  const mevcut = await client.programDay.count({ where: { isArchived: false } });
  if (mevcut > 0) return 0;

  return client.$transaction(async (tx) => {
    const kimlik = new Map<string, string>();
    for (const gun of ONERILEN_PROGRAM) {
      for (const hr of gun.hareketler) {
        if (kimlik.has(hr.ad)) continue;
        const ex = await tx.exercise.upsert({
          where: { name: hr.ad },
          create: {
            name: hr.ad,
            muscleGroup: hr.kas,
            equipment: hr.ekipman,
            tip: hr.ipucu ?? null,
          },
          update: { tip: hr.ipucu ?? null, isArchived: false },
          select: { id: true },
        });
        kimlik.set(hr.ad, ex.id);
      }
    }
    for (const [i, gun] of ONERILEN_PROGRAM.entries()) {
      await tx.programDay.create({
        data: {
          name: gun.ad,
          focus: gun.odak,
          weekday: gun.haftaGunu,
          order: (i + 1) * 10,
          exercises: {
            create: gun.hareketler.map((hr, k) => ({
              exerciseId: kimlik.get(hr.ad)!,
              order: (k + 1) * 10,
              sets: hr.set,
              reps: hr.tekrar,
              restSec: hr.dinlenme,
            })),
          },
        },
      });
    }
    return ONERILEN_PROGRAM.length;
  });
}

/* ===========================================================================
 * OKUMALAR
 * ======================================================================== */

export interface ProgramHareketDto {
  id: string;
  exerciseId: string;
  ad: string;
  ipucu: string | null;
  kas: MuscleGroup;
  sets: number;
  reps: string;
  restSec: number;
}

export interface ProgramGunuDto {
  id: string;
  ad: string;
  odak: string | null;
  haftaGunu: number | null;
  hareketler: ProgramHareketDto[];
}

const HAREKET_SELECT = {
  id: true,
  exerciseId: true,
  sets: true,
  reps: true,
  restSec: true,
  exercise: { select: { name: true, tip: true, muscleGroup: true } },
} as const;

type HareketSatiri = {
  id: string;
  exerciseId: string;
  sets: number;
  reps: string;
  restSec: number;
  exercise: { name: string; tip: string | null; muscleGroup: string };
};

function hareketDto(r: HareketSatiri): ProgramHareketDto {
  return {
    id: r.id,
    exerciseId: r.exerciseId,
    ad: r.exercise.name,
    ipucu: r.exercise.tip,
    kas: r.exercise.muscleGroup as MuscleGroup,
    sets: r.sets,
    reps: r.reps,
    restSec: r.restSec,
  };
}

export async function fetchProgram(client: Client = db): Promise<ProgramGunuDto[]> {
  const gunler = await client.programDay.findMany({
    where: { isArchived: false },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      focus: true,
      weekday: true,
      exercises: { orderBy: [{ order: 'asc' }, { id: 'asc' }], select: HAREKET_SELECT },
    },
  });
  return gunler.map((g) => ({
    id: g.id,
    ad: g.name,
    odak: g.focus,
    haftaGunu: g.weekday,
    hareketler: g.exercises.map(hareketDto),
  }));
}

/** Açık (bitmemiş) oturum varsa kimliği ve günün adı. */
export async function fetchActiveSession(
  client: Client = db,
): Promise<{ id: string; gunAdi: string | null; startedAt: string; gun: AppDay | null } | null> {
  const w = await client.workout.findFirst({
    where: { startedAt: { not: null }, finishedAt: null },
    orderBy: { startedAt: 'desc' },
    select: { id: true, date: true, startedAt: true, programDay: { select: { name: true } } },
  });
  return w && w.startedAt
    ? {
        id: w.id,
        gunAdi: w.programDay?.name ?? null,
        startedAt: w.startedAt.toISOString(),
        gun: w.date ? dateToAppDay(w.date) : null,
      }
    : null;
}

export interface SonAntrenmanDto {
  id: string;
  date: AppDay;
  gunAdi: string | null;
  durationMin: number | null;
  kcal: number | null;
  setSayisi: number;
  /** Programdan başlatılmış oturum mu (ayrıntı oturum ekranında). */
  oturum: boolean;
  suruyor: boolean;
}

/** Son antrenmanlar — Spor ekranının altı. */
export async function fetchRecentSessions(
  adet: number,
  client: Client = db,
): Promise<SonAntrenmanDto[]> {
  const satirlar = await client.workout.findMany({
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: adet,
    select: {
      id: true,
      date: true,
      durationMin: true,
      kcal: true,
      startedAt: true,
      finishedAt: true,
      programDay: { select: { name: true } },
      _count: { select: { sets: true } },
    },
  });
  return satirlar.map((w) => ({
    id: w.id,
    date: dateToAppDay(w.date),
    gunAdi: w.programDay?.name ?? null,
    durationMin: w.durationMin,
    kcal: w.kcal,
    setSayisi: w._count.sets,
    oturum: w.startedAt !== null,
    suruyor: w.startedAt !== null && w.finishedAt === null,
  }));
}

export interface OturumSetiDto {
  id: string;
  setNo: number;
  reps: number;
  weightKg: string | null;
}

export interface IlerlemeOnerisi {
  weightKg: string | null;
  reps: number;
  /** Ekranda gösterilen gerekçe. */
  neden: string;
}

export interface OturumHareketiDto extends ProgramHareketDto {
  yapilanSetler: OturumSetiDto[];
  /** Bu hareketin bu oturumdan ÖNCEKİ son seti — ağırlık/tekrar önerisi. */
  oncekiSet: { reps: number; weightKg: string | null } | null;
  /** Geçen antrenmanın TÜM setlerinden çift ilerleme önerisi (2026-10-30). */
  oneri: IlerlemeOnerisi | null;
}

/** "8-12" → [8, 12]; "10" → [10, 10]; sayı yoksa `null`. SAF. */
export function tekrarAraligi(metin: string): [number, number] | null {
  const sayilar = metin.match(/\d+/g)?.map(Number) ?? [];
  if (sayilar.length === 0) return null;
  const alt = sayilar[0] ?? 0;
  const ust = sayilar[1] ?? alt;
  return [Math.min(alt, ust), Math.max(alt, ust)];
}

const kgMetni = (kg: number) => String(Math.round(kg * 100) / 100);

/**
 * ÇİFT İLERLEME (double progression) — geçen antrenmanın setlerinden. SAF.
 *
 * - En ağır kullanılan ağırlıkta hedef set sayısı kadar set ÜST sınıra
 *   ulaştıysa → ağırlık artar (≥20 kg ise +2,5, altında +1 — küçük
 *   dambıllarda 2,5 kg sıçrama %10'u aşar), tekrar alt sınırdan.
 * - Ulaşmadıysa → aynı ağırlık, en iyi tekrarın bir fazlası (üst sınırı aşmaz).
 * - Ağırlıksız harekette yalnızca tekrar artar.
 */
export function ilerlemeOnerisi(
  oncekiSetler: readonly { reps: number; weightKg: string | null }[],
  hedefTekrar: string,
  hedefSet: number,
  kardiyo = false,
): IlerlemeOnerisi | null {
  const aralik = tekrarAraligi(hedefTekrar);
  if (!aralik || oncekiSetler.length === 0) return null;
  const [alt, ust] = aralik;

  const agirlik = (s: { weightKg: string | null }) => (s.weightKg ? Number(s.weightKg) : 0);
  const enAgir = Math.max(...oncekiSetler.map(agirlik));
  const ustteSetler = oncekiSetler.filter((s) => agirlik(s) === enAgir);
  const enIyi = Math.max(...ustteSetler.map((s) => s.reps));
  const hepsiUstte = ustteSetler.length >= hedefSet && ustteSetler.every((s) => s.reps >= ust);

  if (kardiyo) {
    const dakika = Math.min(ust, Math.max(alt, enIyi));
    return {
      weightKg: null,
      reps: dakika,
      neden: `Geçen sefer ${enIyi} dakika — ${dakika} dakikayı hedefle.`,
    };
  }
  if (enAgir === 0) {
    return {
      weightKg: null,
      reps: enIyi + 1,
      neden: `Geçen sefer en iyi ${enIyi} tekrar — bir fazlasını dene.`,
    };
  }
  if (hepsiUstte) {
    const artis = enAgir >= 20 ? 2.5 : 1;
    return {
      weightKg: kgMetni(enAgir + artis),
      reps: alt,
      neden: `Geçen sefer tüm setlerde ${ust} tekrar — ağırlığı ${String(artis).replace('.', ',')} kg artır.`,
    };
  }
  return {
    weightKg: kgMetni(enAgir),
    reps: Math.min(ust, Math.max(alt, enIyi + 1)),
    neden: `Aynı ağırlıkta ${Math.min(ust, Math.max(alt, enIyi + 1))} tekrarı hedefle.`,
  };
}

export interface OturumDto {
  id: string;
  gunAdi: string | null;
  odak: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMin: number | null;
  kcal: number | null;
  hareketler: OturumHareketiDto[];
}

export async function fetchSession(
  workoutId: string,
  client: Client = db,
): Promise<OturumDto | null> {
  const w = await client.workout.findUnique({
    where: { id: workoutId },
    select: {
      id: true,
      startedAt: true,
      finishedAt: true,
      durationMin: true,
      kcal: true,
      programDay: {
        select: {
          name: true,
          focus: true,
          exercises: { orderBy: [{ order: 'asc' }, { id: 'asc' }], select: HAREKET_SELECT },
        },
      },
      sets: {
        orderBy: [{ setNo: 'asc' }],
        select: {
          id: true,
          exerciseId: true,
          setNo: true,
          reps: true,
          weightKg: true,
          exercise: { select: { name: true, tip: true, muscleGroup: true } },
        },
      },
    },
  });
  if (!w || !w.startedAt) return null;

  // Programdakiler + oturumda sonradan eklenen hareketler (yedek makine).
  const programda = (w.programDay?.exercises ?? []).map(hareketDto);
  const ekIdler = new Set(programda.map((h) => h.exerciseId));
  const ekler: ProgramHareketDto[] = [];
  for (const s of w.sets) {
    if (ekIdler.has(s.exerciseId) || !s.exercise) continue;
    ekIdler.add(s.exerciseId);
    ekler.push({
      id: `ek-${s.exerciseId}`,
      exerciseId: s.exerciseId,
      ad: s.exercise.name,
      ipucu: s.exercise.tip,
      kas: s.exercise.muscleGroup as MuscleGroup,
      sets: Math.max(EK_HAREKET_SETI, w.sets.filter((x) => x.exerciseId === s.exerciseId).length),
      reps: s.exercise.muscleGroup === 'CARDIO' ? '20-30' : '8-12',
      restSec: 90,
    });
  }
  const hareketler = [...programda, ...ekler];
  // Her hareketin GEÇEN antrenmandaki TÜM setleri — en yeni antrenmandan,
  // hareket başına yalnızca ilk görülen antrenmanın setleri tutulur.
  const onceki = await client.workoutSet.findMany({
    where: {
      exerciseId: { in: hareketler.map((h) => h.exerciseId) },
      workoutId: { not: w.id },
    },
    orderBy: [{ workout: { date: 'desc' } }, { createdAt: 'desc' }],
    take: hareketler.length * 40,
    select: { exerciseId: true, workoutId: true, reps: true, weightKg: true },
  });
  const sonAntrenman = new Map<string, string>();
  const oncekiSetler = new Map<string, { reps: number; weightKg: string | null }[]>();
  for (const s of onceki) {
    const wid = sonAntrenman.get(s.exerciseId) ?? s.workoutId;
    sonAntrenman.set(s.exerciseId, wid);
    if (wid !== s.workoutId) continue;
    const liste = oncekiSetler.get(s.exerciseId) ?? [];
    liste.push({ reps: s.reps, weightKg: s.weightKg ? toMeasureString(s.weightKg, 2) : null });
    oncekiSetler.set(s.exerciseId, liste);
  }

  return {
    id: w.id,
    gunAdi: w.programDay?.name ?? null,
    odak: w.programDay?.focus ?? null,
    startedAt: w.startedAt.toISOString(),
    finishedAt: w.finishedAt?.toISOString() ?? null,
    durationMin: w.durationMin,
    kcal: w.kcal,
    hareketler: hareketler.map((hr) => {
      const setler = oncekiSetler.get(hr.exerciseId) ?? [];
      // Önceki tek set (geriye uyum): en yeni antrenmanın İLK kaydı — sıralama yeniden eskiye.
      const o = setler[0];
      return {
        ...hr,
        yapilanSetler: w.sets
          .filter((s) => s.exerciseId === hr.exerciseId)
          .map((s) => ({
            id: s.id,
            setNo: s.setNo,
            reps: s.reps,
            weightKg: s.weightKg ? toMeasureString(s.weightKg, 2) : null,
          })),
        oncekiSet: o ?? null,
        oneri: ilerlemeOnerisi(setler, hr.reps, hr.sets, hr.kas === 'CARDIO'),
      };
    }),
  };
}

/* ===========================================================================
 * YAZMALAR
 * ======================================================================== */

/**
 * Başka günden açık kalan oturumu kapatır: süre son sete kadar sayılır. Hiç set
 * girilmemişse boş kayıt silinir; haftalık antrenman sayısını şişirmesin.
 */
async function eskiOturumuKapat(id: string, client: Client): Promise<void> {
  const son = await client.workoutSet.findFirst({
    where: { workoutId: id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (!son) {
    await client.workout.delete({ where: { id } });
    return;
  }
  await finishSession(id, client, son.createdAt);
}

/**
 * Oturum başlatır. Bugünkü açık oturum varsa ONU döndürür (ikinci oturum açılmaz);
 * başka günden kalanı kapatıp bugünün programını başlatır.
 */
export async function startSession(
  dayId: string,
  client: Client = db,
  bugun: AppDay = appToday(),
  simdi: Date = new Date(),
): Promise<{ id: string; yeni: boolean }> {
  const acik = await fetchActiveSession(client);
  if (acik && (acik.gun === null || acik.gun === bugun)) return { id: acik.id, yeni: false };
  if (acik) await eskiOturumuKapat(acik.id, client);

  const gun = await client.programDay.findUnique({
    where: { id: dayId },
    select: { id: true, exercises: { select: { exercise: { select: { muscleGroup: true } } } } },
  });
  if (!gun) throw new OturumHatasi('GUN_YOK');

  const kardiyo =
    gun.exercises.length > 0 && gun.exercises.every((e) => e.exercise.muscleGroup === 'CARDIO');
  const w = await client.workout.create({
    data: {
      date: appDayToDate(bugun),
      type: kardiyo ? 'CARDIO' : 'GYM',
      programDayId: gun.id,
      startedAt: simdi,
    },
    select: { id: true },
  });
  return { id: w.id, yeni: true };
}

export class OturumHatasi extends Error {
  constructor(readonly sebep: 'GUN_YOK' | 'OTURUM_YOK' | 'BITMIS') {
    super(`oturum: ${sebep}`);
    this.name = 'OturumHatasi';
  }
}

/** Oturumu bitirir: süre ve son tartıya göre tahmini kalori. */
export async function finishSession(
  workoutId: string,
  client: Client = db,
  simdi: Date = new Date(),
): Promise<{
  durationMin: number;
  kcal: number;
  kiloKg: number;
  varsayilanKilo: boolean;
  gun: AppDay;
}> {
  const w = await client.workout.findUnique({
    where: { id: workoutId },
    select: { startedAt: true, finishedAt: true, type: true, date: true },
  });
  if (!w || !w.startedAt) throw new OturumHatasi('OTURUM_YOK');
  if (w.finishedAt) throw new OturumHatasi('BITMIS');

  const sonTarti = await client.healthLog.findFirst({
    where: { weightKg: { not: null } },
    orderBy: { date: 'desc' },
    select: { weightKg: true },
  });
  // Decimal → metin → sayı (ADR-014/D: Decimal doğrudan `Number()`e verilmez).
  const kiloMetni = sonTarti?.weightKg ? toMeasureString(sonTarti.weightKg, 2) : null;
  const kiloKg = kiloMetni ? Number(kiloMetni) : VARSAYILAN_KILO;
  // Bitirmeyi unutulan oturum yüzlerce dakika ve dev kalori yazmasın.
  const durationMin = Math.min(
    MAKS_OTURUM_DK,
    Math.max(1, Math.round((simdi.getTime() - w.startedAt.getTime()) / 60_000)),
  );
  const kcal = kaloriHesapla({ dakika: durationMin, kiloKg, met: MET[w.type as WorkoutType] });

  await client.workout.update({
    where: { id: workoutId },
    data: { finishedAt: simdi, durationMin, kcal },
  });
  return {
    durationMin,
    kcal,
    kiloKg,
    varsayilanKilo: kiloMetni === null,
    gun: dateToAppDay(w.date),
  };
}
