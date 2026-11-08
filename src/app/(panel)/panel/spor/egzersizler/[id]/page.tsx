import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EgzersizFormu } from '@/components/panel/egzersiz-formu';
import { RekorTablosu } from '@/components/panel/rekor-tablosu';
import { Topbar } from '@/components/panel/topbar';
import { fetchExerciseById } from '@/server/services/exercise';
import { fetchRecordsForExercise } from '@/server/services/personal-record';

export const metadata: Metadata = {
  title: 'Egzersiz',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/spor/egzersizler/[id]` — düzenleme + o hareketin rekor eğrisi.
 *
 * Rekorlar `fetchRecordsForExercise` ile — sayfalı listeden DEĞİL. Soru farklı:
 * liste "hangi rekorlarım var", burası "bu hareketteki 1RM…10RM eğrim ne".
 * Sayfalama gerekmiyor, rekor sayısı `@@unique([exerciseId, reps])` ile
 * tavanlı (gerekçe servis dosyasında).
 */
export default async function EgzersizDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;

  const [egzersiz, rekorlar] = await Promise.all([
    fetchExerciseById(id),
    fetchRecordsForExercise(id),
  ]);
  if (!egzersiz) notFound();

  return (
    <>
      <Topbar title={`Egzersiz · ${egzersiz.name}`} />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <EgzersizFormu egzersiz={egzersiz} />

          <section aria-labelledby="rekor-baslik" className="flex flex-col gap-3">
            <h2 id="rekor-baslik" className="text-primary text-base font-semibold">
              Rekorlar
            </h2>
            <RekorTablosu
              rekorlar={rekorlar}
              hareketSutunu={false}
              bosBaslik="Bu hareketin rekoru yok"
              bosAciklama="Bu harekete ağırlıklı bir set girildiğinde rekorlar tekrar sayısına göre (1RM, 5RM…) burada oluşur."
            />
          </section>
        </div>
      </main>
    </>
  );
}
