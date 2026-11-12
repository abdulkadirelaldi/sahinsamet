import type {
  SporTakvimGirdisi,
  TakvimEtkinligiGirdisi,
  TakvimGuncelleGirdisi,
  TakvimSilGirdisi,
} from '@/lib/schemas/takvim';
import type { TakvimEtkinligiVerisi, TakvimOlusumu } from '@/lib/takvim/gorunum';
import { EN_UZUN_HATIRLATMA_DK, type HatirlatmaliEtkinlik } from '@/lib/takvim/hatirlatma';
import {
  adayMi,
  haftaninGunu,
  oncekiAdaySayisi,
  olusumlar,
  TEKRAR_YOK,
  type TekrarKurali,
} from '@/lib/takvim/tekrar';
import { saatDakika } from '@/lib/takvim/bicim';
import { db } from '@/server/db';
import type { TakvimEtkinligi } from '@/server/generated/prisma/client';

import {
  addAppDays,
  appDayStartInstant,
  appDayToDate,
  appToday,
  appWallClockInstant,
  appWallClockMinutes,
  dateToAppDay,
  differenceInAppDays,
  toAppDay,
  type AppDay,
} from './_shared';

/**
 * TAKVİM (2026-11-10) — etkinlik yazma ve aralık okuması. Tekrar açılımı ve hatırlatma kararı
 * `src/lib/takvim`te ve SAF; burası yalnızca satırları okuyup yazar.
 *
 * Sütun aileleri: `baslangic`/`bitis` GERÇEK ANLAR (`appDayStartInstant`, `appWallClockInstant`);
 * `tekrarBitis` ve `istisnalar` takvim GÜNÜ (`@db.Date` → `appDayToDate`/`dateToAppDay`).
 *
 * KAPSAM (tekrarlayan etkinlikte düzenleme/silme):
 *   tek      bu oluşum istisna olur; düzenlemede yerine serinin parçası olan AYRI bir etkinlik açılır.
 *   sonraki  seri bir önceki günde biter; düzenlemede bu günden başlayan YENİ bir seri açılır.
 *   tum      serinin kendisi. Düzenlemede tıklanan oluşumda yapılan tarih/saat değişikliği
 *            serinin başına AYNI FARKLA uygulanır (Google gibi): 20 Kasım'ı 10:00'dan 11:00'e almak
 *            seriyi bir saat kaydırır, başlangıcını 20 Kasım'a taşımaz.
 */

export class TakvimHatasi extends Error {}

/** `programDay` yalnızca okumada (`include`) geliyor; yazma yolları onsuz satır görüyor. */
type Satir = TakvimEtkinligi & {
  programDay?: { id: string; name: string; isArchived: boolean } | null;
};

/** Okumalarda bağlı program gününün adı ve durumu — "Antrenmana başla" için. */
const PROGRAM_GUNU = {
  programDay: { select: { id: true, name: true, isArchived: true } },
} as const;

function kurali(s: Satir): TekrarKurali {
  return {
    tur: s.tekrar,
    aralik: s.tekrarAralik,
    gunler: s.tekrarGunleri,
    bitisGun: s.tekrarBitis ? dateToAppDay(s.tekrarBitis) : null,
    sayi: s.tekrarSayisi,
  };
}

function etkinlik(s: Satir): HatirlatmaliEtkinlik {
  return {
    id: s.id,
    baslik: s.baslik,
    konum: s.konum,
    kategori: s.kategori,
    tumGun: s.tumGun,
    baslangic: s.baslangic,
    bitis: s.bitis,
    tekrar: kurali(s),
    istisnalar: s.istisnalar.map(dateToAppDay),
    hatirlatmalar: s.hatirlatmalar,
  };
}

function veri(s: Satir): TakvimEtkinligiVerisi {
  return {
    id: s.id,
    baslik: s.baslik,
    aciklama: s.aciklama,
    konum: s.konum,
    kategori: s.kategori,
    tumGun: s.tumGun,
    baslangic: s.baslangic.toISOString(),
    bitis: s.bitis.toISOString(),
    tekrar: kurali(s),
    istisnalar: s.istisnalar.map(dateToAppDay),
    hatirlatmalar: s.hatirlatmalar,
    seriId: s.seriId,
    // Arşivlenmiş güne oturum açılmaz: bağ duruyor ama düğme gösterilmiyor.
    programGunu:
      s.programDay && !s.programDay.isArchived
        ? { id: s.programDay.id, ad: s.programDay.name }
        : null,
  };
}

/** Oluşumun değdiği son gün: tüm günde bitiş dışlayıcı, saatlide son milisaniye. */
function sonGunu(tumGun: boolean, baslangic: Date, bitis: Date, gun: AppDay): AppDay {
  if (tumGun) return addAppDays(toAppDay(bitis), -1);
  return bitis > baslangic ? toAppDay(new Date(bitis.getTime() - 1)) : gun;
}

/**
 * `[bas, son]` günlerine değen oluşumlar ve ait oldukları etkinlikler (düzenleme formu için).
 * Tek kullanıcı ve az satır: tekrarlayanlar bellekte açılır.
 */
export async function fetchTakvim(
  bas: AppDay,
  son: AppDay,
  client = db,
): Promise<{ etkinlikler: TakvimEtkinligiVerisi[]; olusumlar: TakvimOlusumu[] }> {
  const basAn = appDayStartInstant(bas);
  const sonAn = appDayStartInstant(addAppDays(son, 1));
  const satirlar = await client.takvimEtkinligi.findMany({
    where: {
      baslangic: { lt: sonAn },
      OR: [
        {
          tekrar: { not: 'YOK' },
          // Çok günlük oluşum aralığa taşabilir: 31 gün geriye kadar biten seri de okunur.
          OR: [{ tekrarBitis: null }, { tekrarBitis: { gte: appDayToDate(addAppDays(bas, -32)) } }],
        },
        { bitis: { gte: basAn } },
      ],
    },
    orderBy: { baslangic: 'asc' },
    include: PROGRAM_GUNU,
  });

  const etkinlikler: TakvimEtkinligiVerisi[] = [];
  const liste: TakvimOlusumu[] = [];
  for (const s of satirlar) {
    const acilan = olusumlar(etkinlik(s), basAn, sonAn);
    if (acilan.length === 0) continue;
    etkinlikler.push(veri(s));
    for (const o of acilan) {
      liste.push({
        anahtar: `${s.id}:${o.baslangic.toISOString()}`,
        etkinlikId: s.id,
        baslik: s.baslik,
        konum: s.konum,
        kategori: s.kategori,
        tumGun: s.tumGun,
        baslangic: o.baslangic.toISOString(),
        bitis: o.bitis.toISOString(),
        gun: o.gun,
        sonGun: sonGunu(s.tumGun, o.baslangic, o.bitis, o.gun),
        tekrarli: s.tekrar !== 'YOK',
      });
    }
  }
  liste.sort((a, b) => a.baslangic.localeCompare(b.baslangic));
  return { etkinlikler, olusumlar: liste };
}

/** Bugün panosu: bugünün henüz bitmemiş oluşumları (tüm gün olanlar gün boyu). */
export async function fetchBugunTakvim(
  bugun: AppDay,
  simdi: Date = new Date(),
  client = db,
): Promise<TakvimOlusumu[]> {
  const { olusumlar: liste } = await fetchTakvim(bugun, bugun, client);
  return liste.filter((o) => o.tumGun || Date.parse(o.bitis) > simdi.getTime());
}

/** Zamanlayıcı için: hatırlatması olan ve şu andan itibaren hatırlatma üretebilecek etkinlikler. */
export async function fetchHatirlatmaliEtkinlikler(
  simdi: Date,
  client = db,
): Promise<HatirlatmaliEtkinlik[]> {
  const ufuk = new Date(simdi.getTime() + EN_UZUN_HATIRLATMA_DK * 60_000 + 2 * 86_400_000);
  const satirlar = await client.takvimEtkinligi.findMany({
    where: {
      hatirlatmalar: { isEmpty: false },
      baslangic: { lt: ufuk },
      OR: [
        {
          tekrar: { not: 'YOK' },
          OR: [
            { tekrarBitis: null },
            { tekrarBitis: { gte: appDayToDate(addAppDays(toAppDay(simdi), -32)) } },
          ],
        },
        { bitis: { gte: new Date(simdi.getTime() - 86_400_000) } },
      ],
    },
  });
  return satirlar.map(etkinlik);
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

/** Formun gün + duvar saatini anlara çevirir. Tüm gün: ilk günün 00:00'ı → son günün ertesi. */
function anlar(g: TakvimEtkinligiGirdisi): { baslangic: Date; bitis: Date } {
  if (g.tumGun) {
    return {
      baslangic: appDayStartInstant(g.baslangicGun),
      bitis: appDayStartInstant(addAppDays(g.bitisGun, 1)),
    };
  }
  return {
    baslangic: appWallClockInstant(g.baslangicGun, saatDakika(g.baslangicSaat)),
    bitis: appWallClockInstant(g.bitisGun, saatDakika(g.bitisSaat)),
  };
}

function alanlar(g: TakvimEtkinligiGirdisi, kural: TekrarKurali = g.tekrar) {
  const tekrarli = kural.tur !== 'YOK';
  return {
    baslik: g.baslik,
    aciklama: g.aciklama,
    konum: g.konum,
    kategori: g.kategori,
    tumGun: g.tumGun,
    hatirlatmalar: g.hatirlatmalar,
    tekrar: kural.tur,
    tekrarAralik: tekrarli ? kural.aralik : 1,
    tekrarGunleri: tekrarli && kural.tur === 'HAFTALIK' ? [...kural.gunler] : [],
    tekrarBitis: tekrarli && kural.bitisGun ? appDayToDate(kural.bitisGun) : null,
    tekrarSayisi: tekrarli ? kural.sayi : null,
  };
}

export async function takvimEtkinligiOlustur(g: TakvimEtkinligiGirdisi): Promise<{ id: string }> {
  return db.takvimEtkinligi.create({
    data: { ...alanlar(g), ...anlar(g), istisnalar: [] },
    select: { id: true },
  });
}

const BULUNAMADI = 'Etkinlik bulunamadı. Başka bir yerden silinmiş olabilir.';
const OLUSUM_YOK = 'Bu tarih serinin bir oluşumu değil. Sayfayı yenileyip yeniden dene.';

/** Kapsam tekrarlamayan etkinlikte her zaman `tum`; tekrarlayanda oluşum gerçekten serinin mi. */
function kapsamiCoz(
  s: Satir,
  kapsam: TakvimGuncelleGirdisi['kapsam'],
  olusumGun: AppDay,
): TakvimGuncelleGirdisi['kapsam'] {
  if (s.tekrar === 'YOK') return 'tum';
  if (!adayMi(toAppDay(s.baslangic), kurali(s), olusumGun)) throw new TakvimHatasi(OLUSUM_YOK);
  // Serinin İLK oluşumundaki "bu ve sonrakiler" = tümü (öncesinde kalan oluşum yok).
  if (kapsam === 'sonraki' && oncekiAdaySayisi(toAppDay(s.baslangic), kurali(s), olusumGun) === 0)
    return 'tum';
  return kapsam;
}

/** Seriyi `gun`den önce bitirir: bitiş bir önceki gün, sayı sınırı bitişe çevrilir. */
function seriyiKes(s: Satir, gun: AppDay) {
  return {
    tekrarBitis: appDayToDate(addAppDays(gun, -1)),
    tekrarSayisi: null,
    istisnalar: s.istisnalar.filter((d) => dateToAppDay(d) < gun),
  };
}

export async function takvimEtkinligiGuncelle(g: TakvimGuncelleGirdisi): Promise<{ id: string }> {
  return db.$transaction(async (tx) => {
    const s = await tx.takvimEtkinligi.findUnique({ where: { id: g.id } });
    if (!s) throw new TakvimHatasi(BULUNAMADI);
    const kapsam = kapsamiCoz(s, g.kapsam, g.olusumGun);
    const yeni = anlar(g);

    if (kapsam === 'tek') {
      await tx.takvimEtkinligi.update({
        where: { id: s.id },
        data: { istisnalar: { push: appDayToDate(g.olusumGun) } },
      });
      return tx.takvimEtkinligi.create({
        data: {
          ...alanlar(g, TEKRAR_YOK),
          ...yeni,
          istisnalar: [],
          seriId: s.id,
          programDayId: s.programDayId,
        },
        select: { id: true },
      });
    }

    if (kapsam === 'sonraki') {
      const seriBas = toAppDay(s.baslangic);
      const once = oncekiAdaySayisi(seriBas, kurali(s), g.olusumGun);
      await tx.takvimEtkinligi.update({ where: { id: s.id }, data: seriyiKes(s, g.olusumGun) });
      // Sayı formda değişmediyse kalan oluşum kadar sürer: seri bölününce toplam artmasın.
      const kural =
        g.tekrar.sayi !== null && g.tekrar.sayi === s.tekrarSayisi
          ? { ...g.tekrar, sayi: Math.max(1, g.tekrar.sayi - once) }
          : g.tekrar;
      return tx.takvimEtkinligi.create({
        data: {
          ...alanlar(g, kural),
          ...yeni,
          istisnalar: s.istisnalar.filter((d) => dateToAppDay(d) >= g.olusumGun),
          programDayId: s.programDayId,
        },
        select: { id: true },
      });
    }

    // tum — tekrarlamayan etkinlik ya da tekrarı kaldırılan seri formdaki tarihe oturur.
    if (s.tekrar === 'YOK' || g.tekrar.tur === 'YOK') {
      return tx.takvimEtkinligi.update({
        where: { id: s.id },
        data: { ...alanlar(g), ...yeni, ...(g.tekrar.tur === 'YOK' ? { istisnalar: [] } : {}) },
        select: { id: true },
      });
    }

    // Seri: oluşumdaki gün farkı serinin başına ve istisnalarına aynen uygulanır.
    const fark = differenceInAppDays(g.olusumGun, g.baslangicGun);
    const seriGun = addAppDays(toAppDay(s.baslangic), fark);
    const sureMs = yeni.bitis.getTime() - yeni.baslangic.getTime();
    const baslangic = g.tumGun
      ? appDayStartInstant(seriGun)
      : appWallClockInstant(seriGun, saatDakika(g.baslangicSaat));
    const bitis = g.tumGun
      ? appDayStartInstant(addAppDays(seriGun, differenceInAppDays(g.baslangicGun, g.bitisGun) + 1))
      : new Date(baslangic.getTime() + sureMs);
    return tx.takvimEtkinligi.update({
      where: { id: s.id },
      data: {
        ...alanlar(g),
        baslangic,
        bitis,
        istisnalar: s.istisnalar.map((d) => appDayToDate(addAppDays(dateToAppDay(d), fark))),
      },
      select: { id: true },
    });
  });
}

export async function takvimEtkinligiSil(g: TakvimSilGirdisi): Promise<{ id: string }> {
  return db.$transaction(async (tx) => {
    const s = await tx.takvimEtkinligi.findUnique({ where: { id: g.id } });
    if (!s) throw new TakvimHatasi(BULUNAMADI);
    const kapsam = kapsamiCoz(s, g.kapsam, g.olusumGun);

    if (kapsam === 'tek') {
      await tx.takvimEtkinligi.update({
        where: { id: s.id },
        data: { istisnalar: { push: appDayToDate(g.olusumGun) } },
      });
    } else if (kapsam === 'sonraki') {
      await tx.takvimEtkinligi.update({ where: { id: s.id }, data: seriyiKes(s, g.olusumGun) });
    } else {
      // Serinin "yalnızca bu" düzenlemeleri de gider (`onDelete: Cascade`).
      await tx.takvimEtkinligi.delete({ where: { id: s.id } });
    }
    return { id: s.id };
  });
}

/* ===========================================================================
 * SPOR PROGRAMI → TAKVİM (2026-11-12)
 * ======================================================================== */

/**
 * Bir program gününün takvimdeki planı: haftalık tekrar, aynı saat. Program ekranı bunu
 * gösterir, düzenler ve kaldırır. Yalnızca serinin KENDİSİ (`seriId` yok) — "yalnızca bu"
 * düzenlemeleri ayrı bir plan değil.
 */
export interface SporTakvimPlani {
  id: string;
  gunler: number[];
  saat: string;
  sureDk: number;
  baslangicGun: AppDay;
  bitisGun: AppDay | null;
  hatirlatmalar: number[];
}

/** Seri gelecekte de sürüyor mu: bitişi yok ya da bugünden önce değil. */
function suruyor(tekrarBitis: Date | null, bugun: AppDay): boolean {
  return tekrarBitis === null || dateToAppDay(tekrarBitis) >= bugun;
}

function plan(s: Satir): SporTakvimPlani {
  const dk = appWallClockMinutes(s.baslangic);
  return {
    id: s.id,
    gunler: s.tekrar === 'HAFTALIK' ? s.tekrarGunleri : [haftaninGunu(toAppDay(s.baslangic))],
    saat: `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`,
    sureDk: Math.round((s.bitis.getTime() - s.baslangic.getTime()) / 60_000),
    baslangicGun: toAppDay(s.baslangic),
    bitisGun: s.tekrarBitis ? dateToAppDay(s.tekrarBitis) : null,
    hatirlatmalar: s.hatirlatmalar,
  };
}

/** Program günlerinin SÜREN planları, güne göre. */
export async function fetchSporTakvimPlanlari(
  dayIds: string[],
  bugun: AppDay = appToday(),
  client = db,
): Promise<Record<string, SporTakvimPlani[]>> {
  if (dayIds.length === 0) return {};
  const satirlar = await client.takvimEtkinligi.findMany({
    where: { programDayId: { in: dayIds }, seriId: null },
    orderBy: { baslangic: 'asc' },
  });
  const sonuc: Record<string, SporTakvimPlani[]> = {};
  for (const s of satirlar) {
    if (!s.programDayId || !suruyor(s.tekrarBitis, bugun)) continue;
    (sonuc[s.programDayId] ??= []).push(plan(s));
  }
  return sonuc;
}

/** Aynı gün zaten takvimdeyse — sessizce ikinci seri açılmaz; çağıran düzenlemeyi önerir. */
export class SporTakvimCakismasi extends Error {
  constructor(readonly mevcut: SporTakvimPlani) {
    super('spor takvimi: bu gün zaten takvimde');
    this.name = 'SporTakvimCakismasi';
  }
}

/** Başlangıçtan itibaren seçili hafta günlerinden İLKİ — serinin ilk oluşumu. */
export function ilkAntrenmanGunu(baslangicGun: AppDay, gunler: readonly number[]): AppDay {
  for (let i = 0; i < 7; i += 1) {
    const gun = addAppDays(baslangicGun, i);
    if (gunler.includes(haftaninGunu(gun))) return gun;
  }
  return baslangicGun;
}

/**
 * Program gününü takvime ekler ya da (`id` ile) planını günceller. Etkinlik: kategori Spor,
 * başlık günün adı, haftalık tekrar, seçili günler, aynı saat ve süre.
 */
export async function sporTakvimKaydet(
  g: SporTakvimGirdisi,
  bugun: AppDay = appToday(),
): Promise<{ id: string; durum: 'yeni' | 'guncellendi' }> {
  return db.$transaction(async (tx) => {
    const gun = await tx.programDay.findUnique({
      where: { id: g.dayId },
      select: { name: true, focus: true, isArchived: true },
    });
    if (!gun || gun.isArchived) throw new TakvimHatasi('Program günü bulunamadı.');

    const ilk = ilkAntrenmanGunu(g.baslangicGun, g.gunler);
    if (g.bitisGun !== null && g.bitisGun < ilk) {
      throw new TakvimHatasi('Bitiş tarihine kadar seçili günlerden hiçbiri gelmiyor.');
    }
    const baslangic = appWallClockInstant(ilk, saatDakika(g.saat));
    const veri = {
      baslik: gun.name,
      aciklama: gun.focus,
      kategori: 'SPOR' as const,
      tumGun: false,
      baslangic,
      bitis: new Date(baslangic.getTime() + g.sureDk * 60_000),
      tekrar: 'HAFTALIK' as const,
      tekrarAralik: 1,
      tekrarGunleri: [...g.gunler],
      tekrarBitis: g.bitisGun ? appDayToDate(g.bitisGun) : null,
      tekrarSayisi: null,
      hatirlatmalar: g.hatirlatmalar,
      programDayId: g.dayId,
    };

    if (g.id) {
      const s = await tx.takvimEtkinligi.findUnique({ where: { id: g.id } });
      if (!s || s.programDayId !== g.dayId) throw new TakvimHatasi(BULUNAMADI);
      // Eski istisnalar ("bu hafta yok") yeni plana taşınmaz: günler/saat değişmiş olabilir.
      await tx.takvimEtkinligi.update({ where: { id: s.id }, data: { ...veri, istisnalar: [] } });
      return { id: s.id, durum: 'guncellendi' };
    }

    const mevcutlar = await tx.takvimEtkinligi.findMany({
      where: { programDayId: g.dayId, seriId: null },
      orderBy: { baslangic: 'asc' },
    });
    const suren = mevcutlar.find((m) => suruyor(m.tekrarBitis, bugun));
    if (suren) throw new SporTakvimCakismasi(plan(suren));

    const { id } = await tx.takvimEtkinligi.create({
      data: { ...veri, istisnalar: [] },
      select: { id: true },
    });
    return { id, durum: 'yeni' };
  });
}

/** Planı takvimden kaldırır (seri ve "yalnızca bu" düzenlemeleri). Geçmiş antrenmanlar yerinde. */
export async function sporTakvimKaldir(id: string): Promise<{ id: string }> {
  const s = await db.takvimEtkinligi.findUnique({ where: { id }, select: { programDayId: true } });
  if (!s || !s.programDayId) throw new TakvimHatasi(BULUNAMADI);
  await db.takvimEtkinligi.delete({ where: { id } });
  return { id };
}
