import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { miktarBicim, SIKLIK } from '@/components/panel/cuzdan-bicim';
import { gunAyYil } from '@/components/panel/hayat-bicim';
import { Topbar } from '@/components/panel/topbar';
import { araCuzdan } from '@/server/services/cuzdan';

export const metadata: Metadata = {
  title: 'Cüzdan araması',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** `/panel/cuzdan/ara` — gelir ve giderlerde arama (2026-11-01). JavaScript'siz de çalışır. */
export default async function CuzdanAraPage({ searchParams }: SayfaProps) {
  const ham = (await searchParams).q;
  const q = (typeof ham === 'string' ? ham : '').trim().slice(0, 80);
  const sonuc = q.length >= 2 ? await araCuzdan(q) : null;

  return (
    <>
      <Topbar title="Cüzdan araması" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <form method="get" role="search" className="flex gap-2">
            <label htmlFor="cuzdan-ara" className="sr-only">
              Ara
            </label>
            <input
              id="cuzdan-ara"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={80}
              placeholder="Fatura, market, kira…"
              enterKeyHint="search"
              className="focus-ring rounded-input border-line-strong bg-elevated text-primary placeholder:text-muted h-12 min-w-0 flex-1 border px-4"
            />
            <button
              type="submit"
              aria-label="Ara"
              className="focus-ring bg-accent flex size-12 shrink-0 items-center justify-center rounded-full text-white"
            >
              <Search className="size-5" aria-hidden="true" />
            </button>
          </form>

          {q.length === 1 && <p className="text-muted text-sm">En az iki harf yazın.</p>}

          {sonuc && sonuc.kalemler.length === 0 && (
            <p className="rounded-card border-line bg-surface text-muted border p-6 text-center text-sm">
              “{q}” için kayıt bulunamadı.
            </p>
          )}

          {sonuc && sonuc.kalemler.length > 0 && (
            <section className="rounded-card border-line bg-surface flex flex-col gap-1 border p-4">
              <h2 className="text-muted text-xs">
                {sonuc.fazlasiVar ? 'İlk 100 kayıt' : `${sonuc.kalemler.length} kayıt`}
              </h2>
              <ul className="divide-line flex flex-col divide-y">
                {sonuc.kalemler.map((k) => (
                  <li key={k.id}>
                    <Link
                      href={`/panel/cuzdan/akis/${k.id}`}
                      className="focus-ring flex min-h-11 items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="text-primary truncate font-medium">{k.name}</span>
                        <span className="text-muted text-xs">
                          {[k.date ? gunAyYil(k.date) : SIKLIK[k.frequency], k.category]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <span
                        className={
                          k.kind === 'INCOME'
                            ? 'tabular text-success shrink-0 font-medium'
                            : 'tabular text-primary shrink-0 font-medium'
                        }
                      >
                        {miktarBicim(k.amount, k.unit)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
