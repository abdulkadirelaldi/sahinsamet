import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HedefFormu } from '@/components/panel/hedef-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchGoalById } from '@/server/services/goal';

export const metadata: Metadata = {
  title: 'Hedef',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/hayat/hedefler/[id]` — düzenleme + kalıcı silme. Tek kayıt
 * okumasından besleniyor; `daysLeft` okuma anında sunucunun "bugün"üne göre.
 */
export default async function HedefDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const kayit = await fetchGoalById(id);
  if (!kayit) notFound();

  return (
    <>
      <Topbar title="Hedef" />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <HedefFormu kayit={kayit} />
        </div>
      </main>
    </>
  );
}
