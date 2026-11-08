import type { Metadata } from 'next';

import { GunlukFormu } from '@/components/panel/gunluk-formu';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';

export const metadata: Metadata = {
  title: 'Yeni günlük kaydı',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel/hayat/gunluk/yeni` — gün varsayılanı BUGÜN, SUNUCUDA İstanbul
 * gününe göre (`appToday`, ADR-016; `saglik/yeni` gerekçesi). Gece yarısından
 * sonra yazılan günlük istemcinin UTC gününe, yani DÜNE düşmesin.
 */
export default function YeniGunlukPage() {
  return (
    <>
      <Topbar title="Yeni günlük kaydı" />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <GunlukFormu gun={appToday()} />
        </div>
      </main>
    </>
  );
}
