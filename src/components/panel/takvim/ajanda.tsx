'use client';

import { MapPin, Repeat } from 'lucide-react';

import { gunAraligi, gunBasligi } from '@/lib/takvim/bicim';
import { gununOlusumlari, olusumZamanMetni, type TakvimOlusumu } from '@/lib/takvim/gorunum';
import { TAKVIM_KATEGORILERI } from '@/lib/takvim/kategoriler';
import { cn } from '@/lib/utils/cn';
import type { AppDay } from '@/server/services/_shared/app-date';

/** AJANDA (2026-11-10) — günlere bölünmüş liste; yalnızca etkinliği olan günler. */
export function Ajanda({
  bas,
  son,
  bugun,
  olusumlar,
  ac,
  yeni,
}: {
  bas: AppDay;
  son: AppDay;
  bugun: AppDay;
  olusumlar: readonly TakvimOlusumu[];
  ac: (o: TakvimOlusumu) => void;
  yeni: (gun: AppDay, dk: number | null) => void;
}) {
  const gunler = gunAraligi(bas, son)
    .map((gun) => ({ gun, liste: gununOlusumlari(olusumlar, gun) }))
    .filter((g) => g.liste.length > 0);

  if (gunler.length === 0) {
    return (
      <div className="rounded-card border-line-hover text-muted flex flex-col items-center gap-3 border border-dashed p-8 text-center text-sm">
        Bu 30 günde etkinlik yok.
        <button
          type="button"
          onClick={() => yeni(bas < bugun ? bugun : bas, 9 * 60)}
          className="focus-ring text-accent rounded font-medium"
        >
          Etkinlik ekle
        </button>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {gunler.map(({ gun, liste }) => (
        <li key={gun} className="flex flex-col gap-2">
          <h3 className="text-primary flex items-center gap-2 text-sm font-semibold">
            {gunBasligi(gun)}
            {gun === bugun && (
              <span className="bg-accent/12 text-accent rounded-full px-2 py-0.5 text-[0.6875rem]">
                Bugün
              </span>
            )}
          </h3>
          <ul className="rounded-card border-line bg-surface divide-line divide-y border">
            {liste.map((o) => {
              const k = TAKVIM_KATEGORILERI[o.kategori];
              return (
                <li key={o.anahtar}>
                  <button
                    type="button"
                    onClick={() => ac(o)}
                    className="focus-ring flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className={cn('h-9 w-1 shrink-0 rounded-full', k.nokta)}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-primary truncate text-sm font-medium">{o.baslik}</span>
                      <span className="text-muted tabular flex items-center gap-1.5 truncate text-xs">
                        {olusumZamanMetni(o)}
                        {o.tekrarli && <Repeat className="size-3" aria-label="Tekrarlayan" />}
                        {o.konum && (
                          <>
                            <MapPin className="size-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{o.konum}</span>
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
