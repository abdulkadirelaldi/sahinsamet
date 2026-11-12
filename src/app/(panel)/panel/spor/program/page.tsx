import type { Metadata } from 'next';
import Link from 'next/link';

import { HAFTA_GUNLERI_KISA } from '@/components/panel/hayat-bicim';
import { ProgramGunFormu } from '@/components/panel/program-editoru';
import { Topbar } from '@/components/panel/topbar';
import { sporPlanOzeti } from '@/lib/takvim/spor';
import { fetchProgram } from '@/server/services/antrenman-oturumu';
import { fetchSporTakvimPlanlari } from '@/server/services/takvim';

export const metadata: Metadata = {
  title: 'Programı düzenle',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/spor/program` — program günleri ve yeni gün (2026-11-01). */
export default async function ProgramPage() {
  const gunler = await fetchProgram();
  const planlar = await fetchSporTakvimPlanlari(gunler.map((g) => g.id));

  return (
    <>
      <Topbar title="Programı düzenle" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          {gunler.length > 0 && (
            <ul className="flex flex-col gap-2">
              {gunler.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/panel/spor/program/${g.id}`}
                    className="focus-ring rounded-card border-line bg-surface flex min-h-14 items-center justify-between gap-3 border p-4"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="text-primary truncate font-medium">{g.ad}</span>
                      <span className="text-muted text-xs">
                        {g.haftaGunu ? HAFTA_GUNLERI_KISA[g.haftaGunu - 1] : 'Serbest'} ·{' '}
                        {g.hareketler.length} hareket
                      </span>
                      {(planlar[g.id] ?? []).map((p) => (
                        <span key={p.id} className="text-muted text-xs">
                          📅 {sporPlanOzeti(p)}
                        </span>
                      ))}
                    </span>
                    <span className="text-accent shrink-0 text-sm font-medium">Düzenle →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h2 className="text-primary text-base font-semibold">Yeni gün</h2>
          <ProgramGunFormu />
        </div>
      </main>
    </>
  );
}
