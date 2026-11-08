import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AkisFormu } from '@/components/panel/cuzdan-formlari';
import { Topbar } from '@/components/panel/topbar';
import { cuidSchema } from '@/lib/schemas/common';
import { fetchSecilebilirHesaplar, fetchWalletFlowById } from '@/server/services/cuzdan';

export const metadata: Metadata = {
  title: 'Gelir / gider',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AkisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!cuidSchema.safeParse(id).success) notFound();
  const [akis, hesaplar] = await Promise.all([fetchWalletFlowById(id), fetchSecilebilirHesaplar()]);
  if (!akis) notFound();
  return (
    <>
      <Topbar title={akis.name} />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto max-w-xl">
          <AkisFormu tur={akis.kind} akis={akis} hesaplar={hesaplar} />
        </div>
      </main>
    </>
  );
}
