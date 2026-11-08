import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HesapFormu } from '@/components/panel/cuzdan-formlari';
import { Topbar } from '@/components/panel/topbar';
import { cuidSchema } from '@/lib/schemas/common';
import { fetchWalletAccountById } from '@/server/services/cuzdan';

export const metadata: Metadata = {
  title: 'Hesap',
  robots: { index: false, follow: false, nocache: true },
};

export default async function HesapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!cuidSchema.safeParse(id).success) notFound();
  const hesap = await fetchWalletAccountById(id);
  if (!hesap) notFound();
  return (
    <>
      <Topbar title={hesap.name} />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto max-w-xl">
          <HesapFormu hesap={hesap} />
        </div>
      </main>
    </>
  );
}
