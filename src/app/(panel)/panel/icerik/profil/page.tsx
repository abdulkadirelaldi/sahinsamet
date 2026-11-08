import type { Metadata } from 'next';

import { ProfilFormu } from '@/components/panel/profil-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchProfile } from '@/server/services/profile';

export const metadata: Metadata = {
  title: 'Profil',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel/icerik/profil` — public ana sayfanın tamamı buradan düzenlenir.
 *
 * TEK ROTA: liste yok, `[id]` yok, `yeni` yok — `Profile` tekil kayıt (ADR-017).
 * `fetchProfile` (ham, önbelleksiz) okunuyor; `getProfile` public tarafın
 * önbellekli okuması. Kayıt yoksa servis FIRLATIYOR (seed uyarısıyla) ve hata
 * `(panel)/error.tsx`e düşüyor — yokluk boş durum değil, kurulum hatası.
 */
export default async function ProfilYonetimiPage() {
  const profil = await fetchProfile();

  return (
    <>
      <Topbar title="Profil" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <ProfilFormu profil={profil} />
        </div>
      </main>
    </>
  );
}
