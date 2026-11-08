import type { Metadata } from 'next';

import { HedefFormu } from '@/components/panel/hedef-formu';
import type { GoalPeriod } from '@/types';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni hedef',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Listedeki sekmeden gelindiyse hedef o döneme yazılır; yoksa uzun vadeli. */
const DONEMLER: Record<string, GoalPeriod> = {
  haftalik: 'WEEKLY',
  aylik: 'MONTHLY',
  yillik: 'YEARLY',
};

/** `/panel/hayat/hedefler/yeni` — okuma yok; yazma `createGoalAction`. */
export default async function YeniHedefPage({ searchParams }: SayfaProps) {
  const ham = (await searchParams).donem;
  const donem = typeof ham === 'string' ? DONEMLER[ham] : undefined;
  return (
    <>
      <Topbar title="Yeni hedef" />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <HedefFormu {...(donem ? { donem } : {})} />
        </div>
      </main>
    </>
  );
}
