import type { Metadata } from 'next';

import { ProfilSayfasi } from '@/components/profil/profil-sayfasi';
import { SITE_NAME } from '@/lib/constants';
import { getProfile } from '@/server/services';

/** Açıklama: tanıtım satırı, yoksa ad. Arama sonucu ve paylaşım kartı bunu gösterir. */
function aciklama(headline: string, bio: string): string {
  const metin = [headline.trim(), bio.trim()].filter(Boolean).join(' — ');
  return (metin || SITE_NAME).slice(0, 160);
}

export async function generateMetadata(): Promise<Metadata> {
  const profil = await getProfile();
  const description = aciklama(profil.headline, profil.bio);
  return {
    title: { absolute: profil.headline.trim() ? `${SITE_NAME} — ${profil.headline}` : SITE_NAME },
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'profile',
      url: '/',
      siteName: SITE_NAME,
      title: SITE_NAME,
      description,
      locale: 'tr_TR',
      images: [{ url: '/og', width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: { card: 'summary_large_image', title: SITE_NAME, description, images: ['/og'] },
  };
}

/** `/` — public sitenin TEK sayfası. İçerik `Profile` kaydından (panel → Profil). */
export default async function Page() {
  return <ProfilSayfasi profil={await getProfile()} />;
}
