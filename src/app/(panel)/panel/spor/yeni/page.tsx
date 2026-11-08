import type { Metadata } from 'next';

import { AntrenmanFormu } from '@/components/panel/antrenman-formu';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';

export const metadata: Metadata = {
  title: 'Yeni antrenman',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel/spor/yeni` — gün varsayılanı BUGÜN, sunucuda İstanbul saatine göre
 * (`appToday`, ADR-016). Gerekçe `saglik/yeni` ile aynı: istemcide
 * `new Date()` gece 00:00–03:00 arasında DÜNÜ önerirdi.
 *
 * Başarıda form detaya (`/panel/spor/<id>`) geçiyor — setler orada giriliyor.
 */
export default function YeniAntrenmanPage() {
  return (
    <>
      <Topbar title="Yeni antrenman" />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <AntrenmanFormu gun={appToday()} />
        </div>
      </main>
    </>
  );
}
