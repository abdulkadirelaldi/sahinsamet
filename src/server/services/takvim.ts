import type {
  TakvimEtkinligiGirdisi,
  TakvimGuncelleGirdisi,
  TakvimSilGirdisi,
} from '@/lib/schemas/takvim';
import type { TakvimEtkinligiVerisi, TakvimOlusumu } from '@/lib/takvim/gorunum';
import { EN_UZUN_HATIRLATMA_DK, type HatirlatmaliEtkinlik } from '@/lib/takvim/hatirlatma';
import {
  adayMi,
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
  appWallClockInstant,
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

type Satir = TakvimEtkinligi;

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
        data: { ...alanlar(g, TEKRAR_YOK), ...yeni, istisnalar: [], seriId: s.id },
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
