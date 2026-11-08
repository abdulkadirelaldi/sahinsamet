import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { DonemHedefleri } from '@/components/panel/donem-hedefleri';
import { HayatAltMenu } from '@/components/panel/hayat-alt-menu';
import { HedefListesi } from '@/components/panel/hedef-listesi';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import {
  appToday,
  donemAnahtari,
  donemAnahtariGecerliMi,
  donemAraligi,
  komsuDonem,
  type Donem,
} from '@/server/services/_shared';
import { fetchGoals } from '@/server/services/goal';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Hedefler',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

const SEKMELER = [
  { anahtar: 'haftalik', etiket: 'Haftalık', donem: 'WEEKLY' },
  { anahtar: 'aylik', etiket: 'Aylık', donem: 'MONTHLY' },
  { anahtar: 'yillik', etiket: 'Yıllık', donem: 'YEARLY' },
  { anahtar: 'uzun', etiket: 'Uzun vadeli', donem: null },
] as const;

const AY = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const GUN_AY = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const tarih = (gun: string) => new Date(`${gun}T00:00:00Z`);

/** Dönemin insan okunur adı: "26 Eki – 1 Kas" · "Ekim 2026" · "2026". */
function donemAdi(donem: Donem, anahtar: string): string {
  if (donem === 'YEARLY') return anahtar;
  const { from, to } = donemAraligi(donem, anahtar);
  if (donem === 'MONTHLY') return AY.format(tarih(from));
  return `${GUN_AY.format(tarih(from))} – ${GUN_AY.format(tarih(to))}`;
}

/**
 * HAYAT · HEDEFLER (2026-10-29) — haftalık, aylık, yıllık ve uzun vadeli.
 *
 * Dönemli sekmelerde ‹ › ile önceki/sonraki döneme geçilir; varsayılan bugünün
 * dönemi. Uzun vadeli hedefler eski liste görünümünde (ilerleme yüzdesiyle).
 */
export default async function HedeflerPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const sekme = SEKMELER.find((s) => s.anahtar === tek(parametreler.donem)) ?? SEKMELER[0];
  const bugun = appToday();

  return (
    <>
      <Topbar
        title="Hedefler"
        actions={
          <Link
            href={`/panel/hayat/hedefler/yeni?donem=${sekme.anahtar}`}
            className={buttonClasses({ size: 'sm' })}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Ayrıntılı hedef</span>
            <span className="sr-only sm:hidden">Ayrıntılı hedef</span>
          </Link>
        }
      />

      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <HayatAltMenu aktif="hedefler" />

          <div className="bg-elevated grid grid-cols-4 gap-1 rounded-full p-1">
            {SEKMELER.map((s) => (
              <Link
                key={s.anahtar}
                href={`/panel/hayat/hedefler?donem=${s.anahtar}`}
                aria-current={s.anahtar === sekme.anahtar ? 'page' : undefined}
                className={cn(
                  'focus-ring rounded-full py-2 text-center text-xs font-medium transition-colors sm:text-sm',
                  s.anahtar === sekme.anahtar ? 'bg-canvas text-primary shadow-sm' : 'text-muted',
                )}
              >
                {s.etiket}
              </Link>
            ))}
          </div>

          {sekme.donem === null ? (
            <UzunVadeli />
          ) : (
            <Donemli
              sekme={sekme.anahtar}
              donem={sekme.donem}
              istenen={tek(parametreler.anahtar)}
              bugun={bugun}
            />
          )}
        </div>
      </main>
    </>
  );
}

async function Donemli({
  sekme,
  donem,
  istenen,
  bugun,
}: {
  sekme: string;
  donem: Donem;
  istenen: string;
  bugun: string;
}) {
  const simdiki = donemAnahtari(donem, bugun);
  const anahtar = donemAnahtariGecerliMi(donem, istenen) ? istenen : simdiki;
  const liste = await fetchGoals({ period: donem, periodKey: anahtar, page: 1, perPage: 100 });
  const yol = (a: string) => `/panel/hayat/hedefler?donem=${sekme}&anahtar=${a}`;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Link
          href={yol(komsuDonem(donem, anahtar, -1))}
          aria-label="Önceki dönem"
          className="focus-ring rounded-btn text-body hover:bg-elevated flex size-11 items-center justify-center"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-primary text-lg font-semibold capitalize">
            {donemAdi(donem, anahtar)}
          </span>
          {anahtar !== simdiki && (
            <Link href={yol(simdiki)} className="text-accent text-xs font-medium">
              Bu döneme dön
            </Link>
          )}
        </div>
        <Link
          href={yol(komsuDonem(donem, anahtar, 1))}
          aria-label="Sonraki dönem"
          className="focus-ring rounded-btn text-body hover:bg-elevated flex size-11 items-center justify-center"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      </div>

      <DonemHedefleri
        hedefler={liste.items}
        period={donem}
        periodKey={anahtar}
        gecmisDonem={anahtar < simdiki}
      />
    </>
  );
}

async function UzunVadeli() {
  const liste = await fetchGoals({ uzunVadeli: true, page: 1, perPage: 100 });
  return (
    <HedefListesi
      hedefler={liste.items}
      toplam={liste.total}
      bosBaslik="Uzun vadeli hedef yok"
      bosAciklama="Tarihli, ilerlemesi yüzdeyle izlenen hedefler burada. Sağ üstten ekleyebilirsin."
    />
  );
}
