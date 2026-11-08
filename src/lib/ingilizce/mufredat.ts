import { GUNLUK } from './gunluk';
import { GUNLUK_EK } from './gunluk-ek';
import { SINAV } from './sinav';
import { SINAV_EK } from './sinav-ek';
import type { Alistirma, Ders, Parkur, ParkurKimligi, Seviye, Unite } from './tipler';
import { YAZILIM } from './yazilim';
import { YAZILIM_EK } from './yazilim-ek';

const SEVIYE_SIRASI: readonly Seviye[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

/**
 * Ek üniteler (2026-11-06) seviyesine göre yerine girer: aynı seviyedeki eski ünitelerden
 * sonra. Sıralama kararlı; kimlikler değişmez, yalnızca ders yolu uzar.
 */
function birlestir(parkur: Parkur, ek: readonly Unite[]): Parkur {
  const sira = (u: Unite) => SEVIYE_SIRASI.indexOf(u.seviye);
  return {
    ...parkur,
    uniteler: [...parkur.uniteler, ...ek]
      .map((u, i) => ({ u, i }))
      .sort((a, b) => sira(a.u) - sira(b.u) || a.i - b.i)
      .map(({ u }) => u),
  };
}

/** Üç parkur, menüdeki sırayla. */
export const PARKURLAR: readonly Parkur[] = [
  birlestir(GUNLUK, GUNLUK_EK),
  birlestir(YAZILIM, YAZILIM_EK),
  birlestir(SINAV, SINAV_EK),
];

export interface DersKonumu {
  parkur: Parkur;
  unite: Unite;
  ders: Ders;
  /** Parkurdaki sıra (0'dan); kilit bir öncekine bakar. */
  sira: number;
  onceki: Ders | null;
  sonraki: Ders | null;
}

const DERSLER = new Map<string, DersKonumu>();
const ALISTIRMALAR = new Map<string, Alistirma>();
for (const parkur of PARKURLAR) {
  const sirali = parkur.uniteler.flatMap((unite) => unite.dersler.map((ders) => ({ unite, ders })));
  sirali.forEach(({ unite, ders }, sira) => {
    DERSLER.set(ders.id, {
      parkur,
      unite,
      ders,
      sira,
      onceki: sirali[sira - 1]?.ders ?? null,
      sonraki: sirali[sira + 1]?.ders ?? null,
    });
    for (const a of ders.alistirmalar) ALISTIRMALAR.set(a.id, a);
  });
}

export function parkurBul(id: string): Parkur | null {
  return PARKURLAR.find((p) => p.id === id) ?? null;
}

export function dersBul(id: string): DersKonumu | null {
  return DERSLER.get(id) ?? null;
}

export function alistirmaBul(id: string): Alistirma | null {
  return ALISTIRMALAR.get(id) ?? null;
}

export function parkurDersleri(id: ParkurKimligi): Ders[] {
  return parkurBul(id)?.uniteler.flatMap((u) => [...u.dersler]) ?? [];
}
