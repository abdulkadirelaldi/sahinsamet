import type { Metadata } from 'next';

import { AkisFormu, BorcFormu, HesapFormu } from '@/components/panel/cuzdan-formlari';
import { Topbar } from '@/components/panel/topbar';
import { fetchSecilebilirHesaplar } from '@/server/services/cuzdan';

export const metadata: Metadata = {
  title: 'Cüzdan · yeni',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const BASLIK = { hesap: 'Yeni hesap', borc: 'Yeni borç', gelir: 'Yeni gelir', gider: 'Yeni gider' };

/** Cüzdana yeni kalem — `?tur=hesap|borc|gelir|gider` (bilinmeyen tür hesap sayılır). */
export default async function CuzdanYeniPage({ searchParams }: SayfaProps) {
  const ham = (await searchParams).tur;
  const tur = (typeof ham === 'string' && ham in BASLIK ? ham : 'hesap') as keyof typeof BASLIK;
  const hesaplar = tur === 'gelir' || tur === 'gider' ? await fetchSecilebilirHesaplar() : [];
  return (
    <>
      <Topbar title={BASLIK[tur]} />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto max-w-xl">
          {tur === 'hesap' && <HesapFormu />}
          {tur === 'borc' && <BorcFormu />}
          {tur === 'gelir' && <AkisFormu tur="INCOME" hesaplar={hesaplar} />}
          {tur === 'gider' && <AkisFormu tur="EXPENSE" hesaplar={hesaplar} />}
        </div>
      </main>
    </>
  );
}
