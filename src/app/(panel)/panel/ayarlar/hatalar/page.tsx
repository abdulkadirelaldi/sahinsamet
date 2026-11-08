import type { Metadata } from 'next';

import { HataListesi } from '@/components/panel/hata-listesi';
import { Topbar } from '@/components/panel/topbar';
import { fetchHatalar } from '@/server/services/hata-kaydi';

export const metadata: Metadata = {
  title: 'Hatalar',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/ayarlar/hatalar` — sunucu ve ekran hataları (2026-10-31). */
export default async function HatalarPage() {
  const hatalar = await fetchHatalar();
  return (
    <>
      <Topbar title="Hatalar" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <p className="text-muted text-sm">
            Panelde oluşan son 50 hata. Kişisel veri saklanmaz: mesajın ilk satırı kısaltılır,
            e-posta ve uzun sayılar maskelenir.
          </p>
          <HataListesi hatalar={hatalar} />
        </div>
      </main>
    </>
  );
}
