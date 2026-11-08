import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AliskanlikFormu } from '@/components/panel/aliskanlik-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchHabitById } from '@/server/services/habit';

export const metadata: Metadata = {
  title: 'Alışkanlık',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/hayat/aliskanliklar/[id]` — düzenleme + arşivle/arşivden çıkar.
 * Arşivlenmiş alışkanlık da AÇILIYOR: arşivden çıkarmanın ikinci yolu burası.
 */
export default async function AliskanlikDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const kayit = await fetchHabitById(id);
  if (!kayit) notFound();

  return (
    <>
      <Topbar title={`Alışkanlık · ${kayit.name}`} />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <AliskanlikFormu kayit={kayit} />
        </div>
      </main>
    </>
  );
}
