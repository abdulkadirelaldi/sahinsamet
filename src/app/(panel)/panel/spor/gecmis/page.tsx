import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { AntrenmanListesi } from '@/components/panel/antrenman-listesi';
import { Sayfalama } from '@/components/panel/sayfalama';
import { SporSekmeleri } from '@/components/panel/spor-sekmeleri';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { workoutFilterSchema } from '@/lib/schemas/workout';
import { fetchWorkouts } from '@/server/services/workout';

export const metadata: Metadata = {
  title: 'Antrenman geçmişi',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 20;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tek(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

const yol = (sayfa: number) =>
  sayfa > 1 ? `/panel/spor/gecmis?sayfa=${sayfa}` : '/panel/spor/gecmis';

/**
 * `/panel/spor` — §4.2 "antrenman kaydı".
 *
 * Sıra servisin: gün AZALAN, sonra `createdAt` AZALAN. İkincil anahtar
 * zorunlu çünkü `Workout.date` `@unique` DEĞİL (gerekçe `services/workout.ts`);
 * burada ayrıca bir sıralama kurmak o kararı ezmek olurdu.
 *
 * Filtre `workoutFilterSchema`'dan geçiyor — adres çubuğu kullanıcı girdisi
 * (ADR-032); `?sayfa=abc` varsayılana düşüyor.
 */
export default async function SporPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;

  const filtre = workoutFilterSchema.safeParse({
    page: sayfaNumarasi(parametreler.sayfa),
    perPage: SAYFA_BOYUTU,
  });

  const liste = await fetchWorkouts(
    filtre.success ? filtre.data : { page: 1, perPage: SAYFA_BOYUTU },
  );

  return (
    <>
      <Topbar
        title="Antrenman geçmişi"
        actions={
          <Link href="/panel/spor/yeni" className={buttonClasses({ size: 'sm' })}>
            <Plus className="size-4" aria-hidden="true" />
            Yeni antrenman
          </Link>
        }
      />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <SporSekmeleri secili="antrenmanlar" />

          <AntrenmanListesi antrenmanlar={liste.items} toplam={liste.total} />

          <Sayfalama sayfa={liste.page} perPage={liste.perPage} toplam={liste.total} yol={yol} />
        </div>
      </main>
    </>
  );
}
