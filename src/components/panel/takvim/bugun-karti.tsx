import { CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import Link from 'next/link';

import { olusumZamanMetni, type TakvimOlusumu } from '@/lib/takvim/gorunum';
import { TAKVIM_KATEGORILERI } from '@/lib/takvim/kategoriler';
import { cn } from '@/lib/utils/cn';
import type { AppDay } from '@/server/services/_shared/app-date';

const EN_COK = 4;

/**
 * BUGÜN PANOSUNDA TAKVİM (2026-11-10) — bugünün henüz bitmemiş etkinlikleri. Sunucu bileşeni;
 * dokununca takvim o günün Gün görünümünde açılır.
 */
export function BugunTakvimKarti({
  bugun,
  olusumlar,
}: {
  bugun: AppDay;
  olusumlar: readonly TakvimOlusumu[];
}) {
  const adres = `/panel/takvim?gorunum=gun&tarih=${bugun}`;
  return (
    <section aria-labelledby="takvim-baslik" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="takvim-baslik" className="text-primary text-base font-semibold">
          Bugünün takvimi
        </h3>
        <Link
          href="/panel/takvim"
          className="focus-ring text-accent flex inline-flex min-h-10 shrink-0 items-center gap-0.5 rounded text-xs font-medium"
        >
          Takvim
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {olusumlar.length === 0 ? (
        <Link
          href={adres}
          className="focus-ring rounded-card border-line-hover text-muted flex items-center justify-center gap-2 border border-dashed p-4 text-center text-sm"
        >
          <CalendarDays className="size-4" aria-hidden="true" />
          Bugün kalan etkinlik yok
        </Link>
      ) : (
        <Link
          href={adres}
          className="focus-ring rounded-card border-line bg-surface flex flex-col border"
        >
          <ul className="divide-line divide-y">
            {olusumlar.slice(0, EN_COK).map((o) => (
              <li key={o.anahtar} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-8 w-1 shrink-0 rounded-full',
                    TAKVIM_KATEGORILERI[o.kategori].nokta,
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-primary truncate text-sm font-medium">{o.baslik}</span>
                  <span className="text-muted tabular flex items-center gap-1 truncate text-xs">
                    {olusumZamanMetni(o)}
                    {o.konum && (
                      <>
                        <MapPin className="ml-1 size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{o.konum}</span>
                      </>
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {olusumlar.length > EN_COK && (
            <span className="text-muted border-line border-t px-4 py-2 text-xs">
              +{olusumlar.length - EN_COK} etkinlik daha
            </span>
          )}
        </Link>
      )}
    </section>
  );
}
