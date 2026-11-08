import type { Metadata } from 'next';

import PublicLayout from '@/app/(public)/layout';
import { Bulunamadi } from '@/components/profil/bulunamadi';

export const metadata: Metadata = { title: 'Sayfa bulunamadı', robots: { index: false } };

/**
 * Hiçbir rotaya uymayan adres. Kök seviyede yalnızca kök layout var; public
 * layout'u burada AÇIKÇA sarıyoruz — yoksa "içeriğe geç" bağlantısı ve
 * analitik 404'te kaybolurdu.
 */
export default function KokBulunamadi() {
  return (
    <PublicLayout>
      <Bulunamadi />
    </PublicLayout>
  );
}
