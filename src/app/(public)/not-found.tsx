import type { Metadata } from 'next';

import { Bulunamadi } from '@/components/profil/bulunamadi';

export const metadata: Metadata = { title: 'Sayfa bulunamadı', robots: { index: false } };

/** Public sayfaların içinden çağrılan `notFound()`. */
export default function PublicBulunamadi() {
  return <Bulunamadi />;
}
