import { cn } from '@/lib/utils/cn';

import { simgeMetni } from './hayat-bicim';

/** Alışkanlığın kendi rengi yoksa adından kararlı bir ton — liste her gün aynı görünsün. */
const PALET = [
  '#8b5cf6',
  '#0ea5e9',
  '#10b981',
  '#f97316',
  '#f43f5e',
  '#6366f1',
  '#14b8a6',
  '#eab308',
];

export function aliskanlikRengi(ad: string, renk: string | null): string {
  if (renk) return renk;
  let toplam = 0;
  for (const harf of ad) toplam += harf.codePointAt(0) ?? 0;
  return PALET[toplam % PALET.length] ?? '#8b5cf6';
}

/**
 * ALIŞKANLIK ROZETİ (2026-10-31) — renkli zemin üstünde emoji; emoji yoksa adın
 * ilk harfi (`•` yerine). Hook yok: sunucu ve istemci bileşenlerinde kullanılır.
 */
export function AliskanlikRozeti({
  ad,
  simge,
  renk,
  boyut = 'buyuk',
}: {
  ad: string;
  simge: string | null;
  renk: string | null;
  boyut?: 'buyuk' | 'kucuk';
}) {
  const ton = aliskanlikRengi(ad, renk);
  const emoji = simgeMetni(simge).trim();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center font-semibold',
        boyut === 'buyuk' ? 'size-11 rounded-[0.9rem] text-xl' : 'size-8 rounded-[0.65rem] text-sm',
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${ton} 16%, transparent)`, color: ton }}
    >
      {emoji || ad.trim().charAt(0).toLocaleUpperCase('tr-TR')}
    </span>
  );
}
