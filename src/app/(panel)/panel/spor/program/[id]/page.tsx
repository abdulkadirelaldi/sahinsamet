import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProgramGunFormu, ProgramHareketleri } from '@/components/panel/program-editoru';
import { SporTakvimi } from '@/components/panel/spor-takvim';
import { Topbar } from '@/components/panel/topbar';
import { cuidSchema } from '@/lib/schemas/common';
import { appToday } from '@/server/services/_shared';
import { fetchProgramGunDuzen } from '@/server/services/antrenman-program';
import { fetchExercises } from '@/server/services/exercise';
import { fetchSporTakvimPlanlari } from '@/server/services/takvim';

export const metadata: Metadata = {
  title: 'Program günü',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/spor/program/[id]` — günün bilgileri ve hareketleri (2026-11-01). */
export default async function ProgramGunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!cuidSchema.safeParse(id).success) notFound();
  const bugun = appToday();
  const [gun, egzersizler, planlar] = await Promise.all([
    fetchProgramGunDuzen(id),
    fetchExercises({ page: 1, perPage: 100, isArchived: false }),
    fetchSporTakvimPlanlari([id], bugun),
  ]);
  if (!gun) notFound();

  return (
    <>
      <Topbar title={gun.name} />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          <ProgramHareketleri
            gun={gun}
            egzersizler={egzersizler.items.map((e) => ({ id: e.id, name: e.name }))}
          />
          <SporTakvimi
            dayId={gun.id}
            gunAdi={gun.name}
            haftaGunu={gun.weekday}
            planlar={planlar[gun.id] ?? []}
            bugun={bugun}
          />
          <ProgramGunFormu gun={gun} />
        </div>
      </main>
    </>
  );
}
