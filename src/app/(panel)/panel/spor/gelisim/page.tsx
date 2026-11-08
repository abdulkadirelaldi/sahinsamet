import { Dumbbell } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { gunAy } from '@/components/panel/hayat-bicim';
import { SporSekmeleri } from '@/components/panel/spor-sekmeleri';
import { Topbar } from '@/components/panel/topbar';
import { TrendGrafigi } from '@/components/panel/trend-grafigi';
import { cn } from '@/lib/utils/cn';
import { fetchSporGelisim } from '@/server/services/spor-gelisim';

export const metadata: Metadata = {
  title: 'Gelişim',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const kg = (n: number) => `${n.toLocaleString('tr-TR')} kg`;

/** `/panel/spor/gelisim` — haftalık hacim ve hareket başına ağırlık (2026-11-01). */
export default async function SporGelisimPage({ searchParams }: SayfaProps) {
  const ham = (await searchParams).hareket;
  const { hacim, hareketler, secili, seri } = await fetchSporGelisim(
    typeof ham === 'string' ? ham : undefined,
  );
  const enYuksek = Math.max(1, ...hacim.map((h) => h.kg));
  const buHafta = hacim.at(-1)?.kg ?? 0;
  const gecenHafta = hacim.at(-2)?.kg ?? 0;
  const seciliAd = hareketler.find((h) => h.id === secili)?.ad ?? '';

  return (
    <>
      <Topbar title="Gelişim" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <SporSekmeleri secili="gelisim" />

          {hareketler.length === 0 ? (
            <section className="rounded-card border-line bg-surface flex flex-col items-center gap-2 border p-8 text-center">
              <Dumbbell className="text-muted size-8" aria-hidden="true" />
              <h2 className="text-primary text-base font-semibold">Henüz veri yok</h2>
              <p className="text-muted text-sm">
                Ağırlıklı set girdikçe hacim ve ağırlık grafiklerin burada oluşur.
              </p>
            </section>
          ) : (
            <>
              <section className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="text-muted text-sm">Bu hafta toplam hacim</h2>
                    <span className="tabular text-primary text-2xl font-semibold tracking-tight">
                      {kg(buHafta)}
                    </span>
                  </div>
                  <span className="tabular text-muted shrink-0 text-xs">
                    Geçen hafta {kg(gecenHafta)}
                  </span>
                </div>
                <ol className="grid h-32 grid-cols-8 gap-1.5">
                  {hacim.map((h, i) => (
                    <li
                      key={h.hafta}
                      aria-label={`${gunAy(h.hafta)} haftası: ${kg(h.kg)}`}
                      className="flex min-w-0 flex-col items-center gap-1.5"
                    >
                      <span className="bg-elevated flex w-full flex-1 items-end overflow-hidden rounded-lg">
                        {h.kg > 0 && (
                          <span
                            className={cn(
                              'w-full rounded-lg',
                              i === hacim.length - 1 ? 'bg-gradient-accent' : 'bg-accent/45',
                            )}
                            style={{ height: `${Math.max(6, (h.kg / enYuksek) * 100)}%` }}
                          />
                        )}
                      </span>
                      <span className="text-muted truncate text-[10px]">
                        {gunAy(h.hafta).slice(0, gunAy(h.hafta).indexOf(' ') + 4)}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-muted text-xs">
                  Hacim: tekrar × ağırlık. Sütunlar haftanın pazartesisiyle etiketli; ağırlıksız
                  setler girmez.
                </p>
              </section>

              <nav aria-label="Hareket seçimi" className="-mx-1 overflow-x-auto px-1 pb-1">
                <ul className="flex min-w-max gap-1.5">
                  {hareketler.map((h) => (
                    <li key={h.id}>
                      <Link
                        href={`/panel/spor/gelisim?hareket=${h.id}`}
                        aria-current={h.id === secili ? 'true' : undefined}
                        className={cn(
                          'focus-ring rounded-full border px-3 py-1.5 text-sm whitespace-nowrap',
                          h.id === secili
                            ? 'border-accent/40 bg-accent/12 text-accent-soft'
                            : 'border-line bg-surface text-body',
                        )}
                      >
                        {h.ad}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <TrendGrafigi baslik={seciliAd} birim="kg" renk="#6d4aff" noktalar={seri} />
            </>
          )}
        </div>
      </main>
    </>
  );
}
