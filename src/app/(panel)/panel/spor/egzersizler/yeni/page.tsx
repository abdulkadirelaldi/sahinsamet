import type { Metadata } from 'next';

import { EgzersizFormu } from '@/components/panel/egzersiz-formu';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni egzersiz',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/spor/egzersizler/yeni` — okuma yok; başarıda kütüphaneye döner. */
export default function YeniEgzersizPage() {
  return (
    <>
      <Topbar title="Yeni egzersiz" />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <EgzersizFormu />
        </div>
      </main>
    </>
  );
}
