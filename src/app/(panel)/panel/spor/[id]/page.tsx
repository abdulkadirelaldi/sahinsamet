import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { gunAyYil } from '@/components/panel/hayat-bicim';
import { AntrenmanFormu } from '@/components/panel/antrenman-formu';
import { SetBolumu, type SetEgzersizi } from '@/components/panel/set-bolumu';
import { Topbar } from '@/components/panel/topbar';
import { fetchExerciseById, fetchExercises } from '@/server/services/exercise';
import { fetchWorkoutById } from '@/server/services/workout';

export const metadata: Metadata = {
  title: 'Antrenman',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * Seçicinin tavanı — `paginationSchema.perPage` en fazla 100. Tek kullanıcılı
 * bir kütüphane için geniş bir sınır; aşılırsa fazlası seçicide görünmez
 * (rapordaki bilinen sınır).
 */
const SECICI_TAVANI = 100;

/**
 * `/panel/spor/[id]` — antrenman düzenleme + setler.
 *
 * Setler `fetchWorkoutById` ile BİRLİKTE geliyor (ayrı set okuması yok —
 * gerekçe servis dosyasında).
 *
 * ⚠️ İKİ EGZERSİZ OKUMASI, ZIT İHTİYAÇLAR:
 *   1. `fetchExercises({ isArchived: false })` — YENİ set seçicisi. Arşivli
 *      hareket yeni set alamaz.
 *   2. Setlerin işaret ettiği ama (1)'de OLMAYAN egzersizler tek tek
 *      `fetchExerciseById` ile okunuyor — arşivli bir harekete ait eski set
 *      düzenlenirken bağ kopmasın diye (`islem-formu.tsx`in dersi, gerekçe
 *      `set-bolumu.tsx`te). Pratikte sıfır ya da bir okuma; tüm arşivi çekmek
 *      kullanılmayan satırları taşımak olurdu.
 */
export default async function AntrenmanPage({ params }: SayfaProps) {
  const { id } = await params;

  const [antrenman, aktifler] = await Promise.all([
    fetchWorkoutById(id),
    fetchExercises({ isArchived: false, page: 1, perPage: SECICI_TAVANI }),
  ]);
  if (!antrenman) notFound();

  const aktifIdler = new Set(aktifler.items.map((e) => e.id));
  const eksikIdler = [...new Set(antrenman.sets.map((s) => s.exerciseId))].filter(
    (exerciseId) => !aktifIdler.has(exerciseId),
  );
  const ekler = await Promise.all(eksikIdler.map((exerciseId) => fetchExerciseById(exerciseId)));

  const secenek = (e: SetEgzersizi): SetEgzersizi => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    isArchived: e.isArchived,
  });

  return (
    <>
      <Topbar title={`Antrenman · ${gunAyYil(antrenman.date)}`} />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-4xl flex-col gap-6">
          <AntrenmanFormu
            antrenman={antrenman}
            gun={antrenman.date}
            setSayisi={antrenman.sets.length}
          />

          <SetBolumu
            antrenmanId={antrenman.id}
            setler={antrenman.sets}
            egzersizler={aktifler.items.map(secenek)}
            ekEgzersizler={ekler.flatMap((e) => (e ? [secenek(e)] : []))}
          />
        </div>
      </main>
    </>
  );
}
