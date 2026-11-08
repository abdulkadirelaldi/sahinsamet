import type { Metadata } from 'next';

import { TartiIleKayit } from '@/components/panel/tarti-yukle';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';

export const metadata: Metadata = {
  title: 'Yeni sağlık kaydı',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel/saglik/yeni` — gün varsayılanı BUGÜN, sunucuda İstanbul saatine
 * göre (`appToday`, ADR-016). İstemcide `new Date()` kullanmak gece
 * 00:00–03:00 arasında UTC gününü, yani DÜNÜ önerirdi.
 *
 * 2026-10-30: üstte tartı ekran görüntüsünden doldurma (`TartiIleKayit`).
 */
export default function YeniSaglikPage() {
  return (
    <>
      <Topbar title="Yeni sağlık kaydı" />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <TartiIleKayit gun={appToday()} />
        </div>
      </main>
    </>
  );
}
