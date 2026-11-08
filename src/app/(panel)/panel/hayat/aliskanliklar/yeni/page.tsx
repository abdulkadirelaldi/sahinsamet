import type { Metadata } from 'next';

import { AliskanlikFormu } from '@/components/panel/aliskanlik-formu';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni alışkanlık',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/hayat/aliskanliklar/yeni` — okuma yok; yazma `createHabitAction`. */
export default function YeniAliskanlikPage() {
  return (
    <>
      <Topbar title="Yeni alışkanlık" />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <AliskanlikFormu />
        </div>
      </main>
    </>
  );
}
