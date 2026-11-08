import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { gunAyYil } from '@/components/panel/hayat-bicim';
import { SaglikFormu } from '@/components/panel/saglik-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchHealthLogById } from '@/server/services/health-log';

export const metadata: Metadata = {
  title: 'Sağlık kaydı',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/** `/panel/saglik/[id]` — düzenleme; tek kayıt okumasından beslenir. */
export default async function SaglikDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const kayit = await fetchHealthLogById(id);
  if (!kayit) notFound();

  return (
    <>
      <Topbar title={`Sağlık · ${gunAyYil(kayit.date)}`} />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <SaglikFormu kayit={kayit} gun={kayit.date} />
        </div>
      </main>
    </>
  );
}
