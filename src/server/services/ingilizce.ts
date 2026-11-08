import { alistirmaBul, dersBul, PARKURLAR, type DersKonumu } from '@/lib/ingilizce/mufredat';
import type { Alistirma, ParkurKimligi } from '@/lib/ingilizce/tipler';
import { db } from '@/server/db';

import { addAppDays, appDayToDate, appToday, dateToAppDay, type AppDay } from './_shared';

/**
 * İNGİLİZCE İLERLEMESİ (2026-11-06).
 *
 * XP sunucuda hesaplanır, istemci yalnızca hangi soruyu bildiğini söyler. Seri: art arda
 * en az bir ders bitirilen günler; bugün henüz ders yoksa dünden geriye sayılır (seri
 * gün sonuna kadar yaşar). Zayıf soru: SON olayı yanlış olan alıştırma — tekrar dersinde
 * ilk denemede bilinince listeden düşer (`tekrarDurumu`).
 */

export const DERS_XP = 10;
export const KUSURSUZ_BONUS = 5;
export const TEKRAR_XP = 5;
export const TEKRAR_SORU = 10;
export const HEDEF_SECENEKLERI = [10, 20, 30, 50] as const;
export const VARSAYILAN_HEDEF = 20;

/** Kazanılan XP: ilk tamamlama 10 (+5 hatasız), tekrar oynama ve tekrar dersi 5. SAF. */
export function xpHesapla(ilkKez: boolean, hataSayisi: number): number {
  if (!ilkKez) return TEKRAR_XP;
  return DERS_XP + (hataSayisi === 0 ? KUSURSUZ_BONUS : 0);
}

/** Seri ve bugünün durumu. `gunler` sırasız ve tekrarlı olabilir. SAF. */
export function seriHesapla(
  gunler: readonly AppDay[],
  bugun: AppDay,
): { seri: number; bugunYapildi: boolean } {
  const kume = new Set(gunler);
  const bugunYapildi = kume.has(bugun);
  let gun = bugunYapildi ? bugun : addAppDays(bugun, -1);
  let seri = 0;
  while (kume.has(gun)) {
    seri += 1;
    gun = addAppDays(gun, -1);
  }
  return { seri, bugunYapildi };
}

/** Parkurun ilk dersi ve bir öncekisi bitmiş ders açıktır. SAF. */
export function acikMi(konum: DersKonumu, tamamlanan: ReadonlySet<string>): boolean {
  return konum.onceki === null || tamamlanan.has(konum.onceki.id) || tamamlanan.has(konum.ders.id);
}

/** Alıştırmanın parkuru kimliğinin önekinden. SAF. */
export function parkuru(id: string): ParkurKimligi | null {
  const onek = id.split('-')[0];
  return PARKURLAR.some((p) => p.id === onek) ? (onek as ParkurKimligi) : null;
}

export const tekrarKimligi = (parkur: ParkurKimligi) => `tekrar-${parkur}`;
export const atlaKimligi = (uniteId: string) => `atla-${uniteId}`;

/** Aralıklı tekrar: üst üste N. doğrudan sonra kaç gün beklenir (2026-11-07). */
export const ARALIKLAR = [1, 3, 7, 21, 60] as const;
/** Atlama sınavı: soru sayısı ve geçmek için en fazla hata. */
export const ATLA_SORU = 12;
export const ATLA_HATA = 2;
export const ATLA_XP = 10;

/**
 * Her alıştırmanın tekrar durumu, olaylar eskiden yeniye. Zayıf: son olayı yanlış. Vadesi
 * gelen: son olayı doğru ve üst üste doğru sayısına göre bekleme süresi doldu (1, 3, 7, 21,
 * 60 gün). Vadesi gelenler en eski vadeden başlar. SAF.
 */
export function tekrarDurumu(
  olaylar: readonly { gun: AppDay; hatalar: readonly string[]; dogrular: readonly string[] }[],
  bugun: AppDay,
): { zayif: string[]; vadesi: string[] } {
  const durum = new Map<string, { seri: number; son: AppDay }>();
  for (const o of olaylar) {
    for (const id of o.dogrular)
      durum.set(id, { seri: (durum.get(id)?.seri ?? 0) + 1, son: o.gun });
    for (const id of o.hatalar) durum.set(id, { seri: 0, son: o.gun });
  }
  const zayif: string[] = [];
  const vadeli: { id: string; vade: AppDay }[] = [];
  for (const [id, d] of durum) {
    if (d.seri === 0) {
      zayif.push(id);
      continue;
    }
    const vade = addAppDays(d.son, ARALIKLAR[Math.min(d.seri, ARALIKLAR.length) - 1]!);
    if (vade <= bugun) vadeli.push({ id, vade });
  }
  return {
    zayif,
    vadesi: vadeli.sort((a, b) => a.vade.localeCompare(b.vade)).map((v) => v.id),
  };
}

export interface IngilizceDurum {
  tamamlanan: string[];
  toplamXp: number;
  bugunXp: number;
  hedefXp: number;
  seri: number;
  bugunYapildi: boolean;
  /** Son 7 gün, eskiden yeniye. */
  hafta: { gun: AppDay; xp: number }[];
  /** Parkur başına tekrar bekleyen soru: zayıf (yanlış) ve vadesi gelen (aralıklı tekrar). */
  tekrar: Record<ParkurKimligi, { zayif: number; vadesi: number }>;
}

type Client = Pick<typeof db, 'ingilizceDers' | 'ingilizceAyar'>;

async function olaylariOku(client: Client) {
  return client.ingilizceDers.findMany({
    select: { dersId: true, gun: true, xp: true, hatalar: true, dogrular: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function fetchIngilizceDurum(
  userId: string | null,
  client: Client = db,
  bugun: AppDay = appToday(),
): Promise<IngilizceDurum> {
  const [olaylar, ayar] = await Promise.all([
    olaylariOku(client),
    userId ? client.ingilizceAyar.findUnique({ where: { userId } }) : null,
  ]);
  const gunler = olaylar.map((o) => dateToAppDay(o.gun));
  const xpGun = new Map<AppDay, number>();
  olaylar.forEach((o, i) => xpGun.set(gunler[i]!, (xpGun.get(gunler[i]!) ?? 0) + o.xp));

  const tekrar: IngilizceDurum['tekrar'] = {
    gunluk: { zayif: 0, vadesi: 0 },
    yazilim: { zayif: 0, vadesi: 0 },
    sinav: { zayif: 0, vadesi: 0 },
  };
  const td = tekrarDurumu(
    olaylar.map((o, i) => ({ gun: gunler[i]!, hatalar: o.hatalar, dogrular: o.dogrular })),
    bugun,
  );
  for (const [tur, liste] of [
    ['zayif', td.zayif],
    ['vadesi', td.vadesi],
  ] as const) {
    for (const id of liste) {
      const a = alistirmaBul(id);
      const p = parkuru(id);
      if (p && a && a.tur !== 'konus') tekrar[p][tur] += 1;
    }
  }

  return {
    tamamlanan: [...new Set(olaylar.map((o) => o.dersId))],
    toplamXp: olaylar.reduce((t, o) => t + o.xp, 0),
    bugunXp: xpGun.get(bugun) ?? 0,
    hedefXp: ayar?.gunlukHedefXp ?? VARSAYILAN_HEDEF,
    ...seriHesapla(gunler, bugun),
    hafta: Array.from({ length: 7 }, (_, i) => {
      const gun = addAppDays(bugun, i - 6);
      return { gun, xp: xpGun.get(gun) ?? 0 };
    }),
    tekrar,
  };
}

/**
 * Tekrar dersinin soruları: önce zayıflar (son yanlışlar), kalan yere vadesi en eski olanlar;
 * en fazla 10. Konuşma hariç (mikrofonsuz da oynanabilsin).
 */
export async function fetchTekrarSorulari(
  parkur: ParkurKimligi,
  client: Client = db,
  bugun: AppDay = appToday(),
): Promise<Alistirma[]> {
  const olaylar = await olaylariOku(client);
  const { zayif, vadesi } = tekrarDurumu(
    olaylar.map((o) => ({ gun: dateToAppDay(o.gun), hatalar: o.hatalar, dogrular: o.dogrular })),
    bugun,
  );
  const sec = (ids: string[]) =>
    ids
      .filter((id) => parkuru(id) === parkur)
      .map((id) => alistirmaBul(id))
      .filter((a): a is Alistirma => a !== null && a.tur !== 'konus');
  return [...sec(zayif).slice(-TEKRAR_SORU), ...sec(vadesi)].slice(0, TEKRAR_SORU);
}

/** Ünitenin konumu: parkur, ünite ve parkurda o üniteye kadarki bütün dersler. SAF. */
export function uniteBul(uniteId: string) {
  for (const parkur of PARKURLAR) {
    const i = parkur.uniteler.findIndex((u) => u.id === uniteId);
    if (i !== -1) {
      return {
        parkur,
        unite: parkur.uniteler[i]!,
        oncekiDersler: parkur.uniteler.slice(0, i + 1).flatMap((u) => u.dersler.map((d) => d.id)),
      };
    }
  }
  return null;
}

export interface DersSonucu {
  xp: number;
  bugunXp: number;
  hedefXp: number;
  seri: number;
  /** Yalnızca atlama sınavında: geçti mi, kaç ders açıldı. */
  atla?: { gecti: boolean; acilan: number };
}

/**
 * Dersi kaydeder. Kimlikler müfredatta olmalı ve dersin (tekrar dersinde parkurun)
 * alıştırmaları olmalı; kilitli ders kaydedilmez. Hata fırlatmaz: `null` → geçersiz istek.
 */
export async function dersKaydet(
  girdi: { dersId: string; hatalar: readonly string[]; dogrular: readonly string[] },
  client: Client = db,
  bugun: AppDay = appToday(),
): Promise<DersSonucu | null> {
  const tamamlanan = new Set(
    (await client.ingilizceDers.findMany({ select: { dersId: true }, distinct: ['dersId'] })).map(
      (d) => d.dersId,
    ),
  );

  let gecerli: (id: string) => boolean;
  let ilkKez = false;
  let atla: { gecti: boolean; acilacak: string[] } | null = null;
  const tekrarParkuru = PARKURLAR.find((p) => tekrarKimligi(p.id) === girdi.dersId)?.id;
  const atlanan = girdi.dersId.startsWith('atla-') ? uniteBul(girdi.dersId.slice(5)) : null;
  if (atlanan) {
    // Atlama sınavı: sorular yalnızca o üniteden; geçerse üniteye kadarki bütün dersler açılır.
    const kimlikler = new Set(
      atlanan.unite.dersler.flatMap((d) => d.alistirmalar.map((a) => a.id)),
    );
    gecerli = (id) => kimlikler.has(id);
    // Geçmek için bütün sorular cevaplanmış olmalı: erken biten (hata hakkı dolan) sınav geçmez.
    const cevaplanan = new Set([...girdi.hatalar, ...girdi.dogrular]).size;
    const gecti =
      new Set(girdi.hatalar).size <= ATLA_HATA && cevaplanan >= Math.min(ATLA_SORU, kimlikler.size);
    atla = {
      gecti,
      acilacak: gecti ? atlanan.oncekiDersler.filter((d) => !tamamlanan.has(d)) : [],
    };
  } else if (tekrarParkuru) {
    gecerli = (id) => parkuru(id) === tekrarParkuru && alistirmaBul(id) !== null;
  } else {
    const konum = dersBul(girdi.dersId);
    if (!konum || !acikMi(konum, tamamlanan)) return null;
    const kimlikler = new Set(konum.ders.alistirmalar.map((a) => a.id));
    gecerli = (id) => kimlikler.has(id);
    ilkKez = !tamamlanan.has(girdi.dersId);
  }
  if (![...girdi.hatalar, ...girdi.dogrular].every(gecerli)) return null;
  if (atla && girdi.hatalar.length + girdi.dogrular.length === 0) return null;

  const xp = atla ? (atla.gecti ? ATLA_XP : 0) : xpHesapla(ilkKez, girdi.hatalar.length);
  const gun = appDayToDate(bugun);
  await client.ingilizceDers.create({
    data: {
      dersId: girdi.dersId,
      gun,
      xp,
      hatalar: [...new Set(girdi.hatalar)],
      dogrular: [...new Set(girdi.dogrular)],
    },
  });
  if (atla && atla.acilacak.length > 0) {
    // Atlanan dersler tamamlanmış sayılır; XP ve soru kaydı yok (sınavın kendi satırı var).
    await client.ingilizceDers.createMany({
      data: atla.acilacak.map((dersId) => ({ dersId, gun, xp: 0, hatalar: [], dogrular: [] })),
    });
  }
  const sonra = await client.ingilizceDers.findMany({ select: { gun: true, xp: true } });
  const gunler = sonra.map((s) => dateToAppDay(s.gun));
  return {
    xp,
    bugunXp: sonra.reduce((t, s, i) => t + (gunler[i] === bugun ? s.xp : 0), 0),
    hedefXp: VARSAYILAN_HEDEF,
    seri: seriHesapla(gunler, bugun).seri,
    ...(atla ? { atla: { gecti: atla.gecti, acilan: atla.acilacak.length } } : {}),
  };
}
